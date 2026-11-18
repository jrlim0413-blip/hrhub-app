
import { supabase } from "./supabase.js";

const CLOUD_KEY = "hrhub_enterprise_task_board_v1";
const LOCAL_KEY = "hrhub_enterprise_task_board_v1";

export const TASK_COLUMNS = [
  {
    id: "backlog",
    title: "Backlogs",
    subtitle: "Queued & newly assigned tasks",
    headerBg: "bg-slate-100 border-slate-200 text-slate-800",
    dotColor: "bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300"
  },
  {
    id: "in_progress",
    title: "In Progress",
    subtitle: "Actively being worked on",
    headerBg: "bg-blue-50 border-blue-200 text-blue-800",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    id: "for_review",
    title: "For Review",
    subtitle: "Submitted actions awaiting HR Admin review",
    headerBg: "bg-amber-50 border-amber-200 text-amber-800",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300"
  },
  {
    id: "done",
    title: "Done",
    subtitle: "Reviewed & approved by HR Administrator",
    headerBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300"
  }
];

export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export const TASK_CATEGORIES = [
  "HR Operations",
  "STL Operations",
  "Compliance & 201",
  "Due Process & NTE",
  "Payroll & DTR",
  "Field Monitoring",
  "General"
];

const taskChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("hrhub_task_board_channel") : null;

let memoryTasksCache = null;

function broadcastTasksUpdate(tasks) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrhub_task_board_updated", { detail: tasks }));
  }
  if (taskChannel) {
    try {
      taskChannel.postMessage({ type: "tasks_updated", tasks });
    } catch {}
  }
}

function saveLocalTasks(tasks) {
  memoryTasksCache = tasks;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));
    } catch {}
  }
}

async function persistTasksToCloud(tasks) {
  saveLocalTasks(tasks);
  broadcastTasksUpdate(tasks);
  try {
    if (supabase) {
      await supabase.from("user_settings").upsert(
        {
          user_id: CLOUD_KEY,
          settings_json: tasks,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    }
    return { success: true };
  } catch (err) {
    console.warn("[taskBoardStorage] Cloud save fallback to local:", err?.message);
    return { success: true, localOnly: true };
  }
}

export async function fetchAllTasks() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_KEY)
        .maybeSingle();

      if (!error && Array.isArray(data?.settings_json)) {
        saveLocalTasks(data.settings_json);
        return data.settings_json;
      }
    }
  } catch (err) {
    console.debug("[taskBoardStorage] Cloud fetch fallback:", err?.message);
  }

  if (Array.isArray(memoryTasksCache)) return memoryTasksCache;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryTasksCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  memoryTasksCache = [];
  return [];
}

export function getCachedTasks() {
  if (Array.isArray(memoryTasksCache)) return memoryTasksCache;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
}

export function subscribeToTaskBoardLive(callback) {
  const onWindowEvent = (e) => {
    if (Array.isArray(e?.detail)) callback(e.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hrhub_task_board_updated", onWindowEvent);
  }

  let onBc = null;
  if (taskChannel) {
    onBc = (e) => {
      if (Array.isArray(e?.data?.tasks)) callback(e.data.tasks);
    };
    taskChannel.addEventListener("message", onBc);
  }

  let sbChannel = null;
  try {
    if (supabase) {
      sbChannel = supabase
        .channel("realtime_task_board_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_settings" },
          (payload) => {
            if (payload?.new?.user_id === CLOUD_KEY && Array.isArray(payload?.new?.settings_json)) {
              saveLocalTasks(payload.new.settings_json);
              callback(payload.new.settings_json);
            }
          }
        )
        .subscribe();
    }
  } catch (err) {
    console.debug("[taskBoardStorage] Realtime channel notice:", err?.message);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("hrhub_task_board_updated", onWindowEvent);
    }
    if (taskChannel && onBc) {
      taskChannel.removeEventListener("message", onBc);
    }
    if (sbChannel && supabase) {
      supabase.removeChannel(sbChannel);
    }
  };
}

export async function createTaskEntry({
  title,
  description = "",
  priority = "Medium",
  category = "HR Operations",
  dueDate = "",
  assignmentType = "general_hr",
  assignedToEmail = "",
  assignedToName = "",
  assignedToCompany = "",
  assignedToRole = "",
  initialStatus = "backlog",
  createdBy = {}
}) {
  if (!title || !title.trim()) {
    return { success: false, error: "Task title is required." };
  }

  const currentTasks = await fetchAllTasks();
  const nowIso = new Date().toISOString();
  const isGeneral = assignmentType === "general_hr";

  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    description: description.trim(),
    priority: TASK_PRIORITIES.includes(priority) ? priority : "Medium",
    category: category || "HR Operations",
    dueDate: dueDate || "",
    assignmentType: isGeneral ? "general_hr" : "specific_employee",
    assignedToEmail: isGeneral ? "" : String(assignedToEmail || "").toLowerCase().trim(),
    assignedToName: isGeneral ? "All HR & Branch Personnel (General Task)" : (assignedToName || assignedToEmail),
    assignedToCompany: isGeneral ? "All Subsidiaries & Entities" : (assignedToCompany || ""),
    assignedToRole: isGeneral ? "General HR" : (assignedToRole || ""),
    status: ["backlog", "in_progress", "for_review", "done"].includes(initialStatus) ? initialStatus : "backlog",
    actionNotes: "",
    submittedByEmail: "",
    submittedByName: "",
    submittedAt: null,
    reviewRemarks: "",
    reviewedByName: "",
    reviewedAt: null,
    submissions: {},
    createdByName: createdBy?.name || "HR Administrator",
    createdByEmail: String(createdBy?.email || "").toLowerCase().trim(),
    createdByCompany: createdBy?.company || "Simpal Group of Companies",
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const nextTasks = [newTask, ...currentTasks];
  await persistTasksToCloud(nextTasks);
  return { success: true, task: newTask, tasks: nextTasks };
}

export function getEffectiveTaskStatusForUser(task, userEmail = "", isHeadOfficeAdmin = false) {
  if (!task) return "backlog";
  const normEmail = String(userEmail || "").toLowerCase().trim();

  if (task.assignmentType !== "general_hr") {
    return task.status || "backlog";
  }

  if (!isHeadOfficeAdmin && normEmail) {
    const mySub = task.submissions?.[normEmail];
    if (mySub?.status) return mySub.status;
    return task.status === "done" ? "done" : (task.status === "in_progress" ? "in_progress" : "backlog");
  }

  if (task.status === "done") return "done";
  const subs = Object.values(task.submissions || {});
  if (subs.some((s) => s.status === "for_review")) return "for_review";
  if (subs.some((s) => s.status === "in_progress")) return "in_progress";
  return task.status || "backlog";
}

export function getVisibleTasksForUser(tasks = [], user = null, isHeadOfficeAdmin = false) {
  if (!Array.isArray(tasks)) return [];
  if (isHeadOfficeAdmin) return tasks;

  const myEmail = String(user?.email || "").toLowerCase().trim();
  return tasks.filter((t) => {
    if (t.assignmentType === "general_hr") return true;
    return Boolean(myEmail && String(t.assignedToEmail || "").toLowerCase().trim() === myEmail);
  });
}

export async function markTaskInProgress(taskId, actor = {}, isHeadOfficeAdmin = false) {
  const currentTasks = await fetchAllTasks();
  const actorEmail = String(actor?.email || "").toLowerCase().trim();
  const nowIso = new Date().toISOString();

  const nextTasks = currentTasks.map((t) => {
    if (t.id !== taskId) return t;

    if (t.assignmentType === "general_hr" && !isHeadOfficeAdmin && actorEmail) {
      const prevSub = t.submissions?.[actorEmail] || {};
      return {
        ...t,
        submissions: {
          ...(t.submissions || {}),
          [actorEmail]: {
            ...prevSub,
            email: actorEmail,
            name: actor?.name || actorEmail,
            company: actor?.company || "",
            role: actor?.role || "",
            status: "in_progress",
            updatedAt: nowIso
          }
        },
        updatedAt: nowIso
      };
    }

    return {
      ...t,
      status: "in_progress",
      updatedAt: nowIso
    };
  });

  await persistTasksToCloud(nextTasks);
  return { success: true, tasks: nextTasks };
}

export async function submitTaskActionForReview(taskId, actor = {}, actionNotes = "") {
  const trimmedNotes = String(actionNotes || "").trim();
  if (!trimmedNotes) {
    return { success: false, error: "Please enter the action taken or remarks before submitting for review." };
  }

  const currentTasks = await fetchAllTasks();
  const actorEmail = String(actor?.email || "").toLowerCase().trim();
  const nowIso = new Date().toISOString();

  const nextTasks = currentTasks.map((t) => {
    if (t.id !== taskId) return t;

    if (t.assignmentType === "general_hr" && actorEmail) {
      return {
        ...t,
        submissions: {
          ...(t.submissions || {}),
          [actorEmail]: {
            email: actorEmail,
            name: actor?.name || actorEmail,
            company: actor?.company || "",
            role: actor?.role || "",
            status: "for_review",
            actionNotes: trimmedNotes,
            submittedAt: nowIso,
            reviewRemarks: "",
            reviewedByName: "",
            reviewedAt: null
          }
        },
        updatedAt: nowIso
      };
    }

    return {
      ...t,
      status: "for_review",
      actionNotes: trimmedNotes,
      submittedByEmail: actorEmail,
      submittedByName: actor?.name || actorEmail,
      submittedAt: nowIso,
      updatedAt: nowIso
    };
  });

  await persistTasksToCloud(nextTasks);
  return { success: true, tasks: nextTasks };
}

export async function reviewTaskSubmission({
  taskId,
  submissionEmail = null,
  decision = "done",
  reviewer = {},
  reviewRemarks = ""
}) {
  const currentTasks = await fetchAllTasks();
  const nowIso = new Date().toISOString();
  const normSubEmail = submissionEmail ? String(submissionEmail).toLowerCase().trim() : null;

  const nextTasks = currentTasks.map((t) => {
    if (t.id !== taskId) return t;

    if (t.assignmentType === "general_hr" && normSubEmail && t.submissions?.[normSubEmail]) {
      const updatedSubmissions = {
        ...t.submissions,
        [normSubEmail]: {
          ...t.submissions[normSubEmail],
          status: decision,
          reviewRemarks: String(reviewRemarks || "").trim(),
          reviewedByName: reviewer?.name || "HR Administrator",
          reviewedAt: nowIso
        }
      };
      return {
        ...t,
        submissions: updatedSubmissions,
        updatedAt: nowIso
      };
    }

    return {
      ...t,
      status: decision,
      reviewRemarks: String(reviewRemarks || "").trim() || t.reviewRemarks,
      reviewedByName: reviewer?.name || "HR Administrator",
      reviewedAt: nowIso,
      updatedAt: nowIso
    };
  });

  await persistTasksToCloud(nextTasks);
  return { success: true, tasks: nextTasks };
}

export async function deleteTaskEntry(taskId) {
  const currentTasks = await fetchAllTasks();
  const nextTasks = currentTasks.filter((t) => t.id !== taskId);
  await persistTasksToCloud(nextTasks);
  return { success: true, tasks: nextTasks };
}
