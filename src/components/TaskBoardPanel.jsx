import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers, Plus, Search, RefreshCw, CheckCircle2, Clock, Send,
  User, Users, Building2, Calendar, Trash2, ArrowRight, RotateCcw,
  ShieldCheck, ClipboardCheck, AlertCircle, X, MessageSquare, Play
} from "lucide-react";
import {
  TASK_COLUMNS,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  fetchAllTasks,
  getCachedTasks,
  createTaskEntry,
  markTaskInProgress,
  submitTaskActionForReview,
  reviewTaskSubmission,
  deleteTaskEntry,
  subscribeToTaskBoardLive,
  getEffectiveTaskStatusForUser,
  getVisibleTasksForUser
} from "../lib/taskBoardStorage.js";
import { fetchEmployeesFromDatabase } from "../lib/employeeStorage.js";
import { isHeadOfficeHrAdminUser } from "../lib/aiAssistantService.js";
import { ALL_SUBSIDIARIES } from "../lib/companyEntities.js";

function getPriorityStyle(priority) {
  switch (priority) {
    case "Urgent":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "High":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "Medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function formatShortDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export default function TaskBoardPanel({
  currentUser = null,
  isHRMD = false,
  profiles = [],
  canManageTasks = null
}) {
  const isHeadOfficeAdmin =
    typeof canManageTasks === "boolean"
      ? canManageTasks
      : isHeadOfficeHrAdminUser(currentUser, isHRMD);
  const myEmail = String(currentUser?.email || "").toLowerCase().trim();

  const [tasks, setTasks] = useState(() => getCachedTasks());
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const [toast, setToast] = useState("");

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "High",
    category: "HR Operations",
    dueDate: "",
    assignmentType: "general_hr",
    assignedToEmail: "",
    assignedToName: "",
    assignedToCompany: "",
    assignedToRole: "",
    initialStatus: "backlog"
  });

  const [actionModalTask, setActionModalTask] = useState(null);
  const [actionNotesInput, setActionNotesInput] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [reviewModalTarget, setReviewModalTarget] = useState(null);
  const [reviewRemarksInput, setReviewRemarksInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllTasks();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
    const unsub = subscribeToTaskBoardLive((updatedList) => {
      if (Array.isArray(updatedList)) {
        setTasks(updatedList);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [loadTasks]);

  useEffect(() => {
    let active = true;
    const loadDirectory = async () => {
      try {
        const dbEmps = await fetchEmployeesFromDatabase();
        const combinedMap = new Map();
        [...(dbEmps || []), ...(profiles || [])].forEach((emp) => {
          const email = String(emp?.email || "").toLowerCase().trim();
          if (!email) return;
          if (!combinedMap.has(email)) {
            combinedMap.set(email, {
              id: emp.id || email,
              email,
              name: emp.name || email.split("@")[0],
              role: emp.role || "Team Member",
              company: emp.company || "Simpal Group of Companies",
              branch: emp.branch || ""
            });
          }
        });
        if (active) {
          setEmployees(
            Array.from(combinedMap.values()).sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      } catch (err) {
        console.warn("TaskBoard employee fetch notice:", err);
      }
    };
    loadDirectory();
    return () => {
      active = false;
    };
  }, [profiles]);

  const visibleTasks = useMemo(() => {
    return getVisibleTasksForUser(tasks, currentUser, isHeadOfficeAdmin);
  }, [tasks, currentUser, isHeadOfficeAdmin]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return visibleTasks.filter((t) => {
      if (assignmentFilter !== "all" && t.assignmentType !== assignmentFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (isHeadOfficeAdmin && companyFilter !== "all") {
        const matchesAssignedCompany = (t.assignedToCompany || "").toLowerCase().includes(companyFilter.toLowerCase());
        const matchesSubmissionCompany = Object.values(t.submissions || {}).some((s) =>
          (s.company || "").toLowerCase().includes(companyFilter.toLowerCase())
        );
        if (t.assignmentType !== "general_hr" && !matchesAssignedCompany) return false;
        if (t.assignmentType === "general_hr" && companyFilter !== "all" && !matchesSubmissionCompany && !matchesAssignedCompany) {
        }
      }
      if (q) {
        const hay = `${t.title} ${t.description} ${t.assignedToName} ${t.assignedToCompany} ${t.category} ${t.actionNotes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleTasks, assignmentFilter, priorityFilter, companyFilter, searchQuery, isHeadOfficeAdmin]);

  const tasksByColumn = useMemo(() => {
    const grouped = {
      backlog: [],
      in_progress: [],
      for_review: [],
      done: []
    };
    filteredTasks.forEach((task) => {
      const col = getEffectiveTaskStatusForUser(task, myEmail, isHeadOfficeAdmin);
      if (grouped[col]) {
        grouped[col].push(task);
      } else {
        grouped.backlog.push(task);
      }
    });
    return grouped;
  }, [filteredTasks, myEmail, isHeadOfficeAdmin]);

  const filteredEmployeesForPicker = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    if (newTask.assignmentType === "specific_employee" && !newTask.assignedToEmail) {
      alert("Please select an employee to assign this task to.");
      return;
    }

    setIsSubmittingTask(true);
    const res = await createTaskEntry({
      ...newTask,
      createdBy: {
        name: currentUser?.name || "HR Administrator",
        email: currentUser?.email || "",
        company: currentUser?.company || "Simpal Group of Companies"
      }
    });
    setIsSubmittingTask(false);

    if (res.success) {
      setTasks(res.tasks);
      setIsPostModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        priority: "High",
        category: "HR Operations",
        dueDate: "",
        assignmentType: "general_hr",
        assignedToEmail: "",
        assignedToName: "",
        assignedToCompany: "",
        assignedToRole: "",
        initialStatus: "backlog"
      });
      setEmployeeSearch("");
      showToast(
        res.task.assignmentType === "general_hr"
          ? "🌐 General Task posted to all HR & Subsidiary accounts!"
          : `👤 Task assigned to ${res.task.assignedToName}!`
      );
    }
  };

  const handleStartTask = async (task) => {
    const res = await markTaskInProgress(task.id, currentUser, isHeadOfficeAdmin);
    if (res.success) {
      setTasks(res.tasks);
      showToast(`▶ "${task.title}" moved to In Progress.`);
    }
  };

  const openActionModal = (task) => {
    const existingNotes =
      task.assignmentType === "general_hr"
        ? task.submissions?.[myEmail]?.actionNotes || ""
        : task.actionNotes || "";
    setActionModalTask(task);
    setActionNotesInput(existingNotes);
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!actionModalTask || !actionNotesInput.trim()) return;
    setIsSubmittingAction(true);
    const res = await submitTaskActionForReview(actionModalTask.id, currentUser, actionNotesInput);
    setIsSubmittingAction(false);
    if (res.success) {
      setTasks(res.tasks);
      setActionModalTask(null);
      setActionNotesInput("");
      showToast("📤 Action submitted! Task moved to For Review for HR Administrator approval.");
    } else {
      alert(res.error || "Unable to submit action.");
    }
  };

  const openReviewModal = (task, submissionEmail = null, submission = null) => {
    setReviewModalTarget({ task, submissionEmail, submission });
    setReviewRemarksInput(submission?.reviewRemarks || task.reviewRemarks || "");
  };

  const handleConfirmReview = async (decision) => {
    if (!reviewModalTarget) return;
    setIsSubmittingReview(true);
    const res = await reviewTaskSubmission({
      taskId: reviewModalTarget.task.id,
      submissionEmail: reviewModalTarget.submissionEmail,
      decision,
      reviewer: currentUser,
      reviewRemarks: reviewRemarksInput
    });
    setIsSubmittingReview(false);
    if (res.success) {
      setTasks(res.tasks);
      setReviewModalTarget(null);
      setReviewRemarksInput("");
      showToast(
        decision === "done"
          ? "✅ Task approved and marked as Done!"
          : "↩ Task returned to In Progress with remarks."
      );
    }
  };

  const handleQuickAdminMove = async (taskId, targetStatus) => {
    const res = await reviewTaskSubmission({
      taskId,
      submissionEmail: null,
      decision: targetStatus,
      reviewer: currentUser
    });
    if (res.success) {
      setTasks(res.tasks);
      showToast(
        targetStatus === "done"
          ? "✅ Task marked as Done!"
          : targetStatus === "in_progress"
          ? "▶ Task moved to In Progress."
          : "↩ Task moved to Backlogs."
      );
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    const res = await deleteTaskEntry(task.id);
    if (res.success) {
      setTasks(res.tasks);
      showToast("🗑️ Task removed from Task Board.");
    }
  };

  return (
    <div className="space-y-4 antialiased text-slate-800 animate-in fade-in">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                <Layers size={11} className="text-emerald-600" />
                <span>ENTERPRISE TASK BOARD</span>
              </span>
              {isHeadOfficeAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 text-[10px] font-bold">
                  <ShieldCheck size={11} />
                  <span>Head Office HR Administrator View</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                  <Building2 size={11} className="text-blue-600" />
                  <span>{currentUser?.company || "Subsidiary Account"} • My Tasks</span>
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Task Board & Action Review Workflow
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isHeadOfficeAdmin
                ? "Post General Tasks (for all HR) or assign tasks to specific employees. Track Backlogs, In Progress, review Subsidiary submissions in For Review, and mark tasks as Done."
                : "View your assigned tasks and General HR tasks. Submit your Action Taken for Head Office HR Administrator review and approval."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={loadTasks}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh live tasks"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
            </button>

            {isHeadOfficeAdmin && (
              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>Post New Task</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {TASK_COLUMNS.map((col) => (
            <div
              key={col.id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {col.title}
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {tasksByColumn[col.id]?.length || 0}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task title, employee, subsidiary, or action notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">📋 All Task Types</option>
              <option value="general_hr">🌐 General Tasks (All HR)</option>
              <option value="specific_employee">👤 Specific Employee Tasks</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">⚡ All Priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {isHeadOfficeAdmin && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[180px]"
              >
                <option value="all">🏢 All Subsidiaries</option>
                {ALL_SUBSIDIARIES.map((comp) => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
        {TASK_COLUMNS.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];
          return (
            <div
              key={col.id}
              className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 shadow-2xs flex flex-col gap-3 min-h-[340px]"
            >
              <div className={`rounded-xl border px-3 py-2 flex items-center justify-between ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <div>
                    <h2 className="text-xs font-black tracking-tight">{col.title}</h2>
                    <p className="text-[9.5px] opacity-75 leading-none mt-0.5">{col.subtitle}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black shadow-2xs">
                  {colTasks.length}
                </span>
              </div>

              {colTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-3 text-slate-400">
                  <ClipboardCheck size={24} className="text-slate-300 mb-1.5" />
                  <p className="text-[11px] font-semibold">No tasks in {col.title}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {colTasks.map((task) => {
                    const isGeneral = task.assignmentType === "general_hr";
                    const submissionsList = Object.values(task.submissions || {});
                    const mySubmission = isGeneral && myEmail ? task.submissions?.[myEmail] : null;
                    const displayActionNotes = isGeneral
                      ? mySubmission?.actionNotes
                      : task.actionNotes;
                    const displayReviewRemarks = isGeneral
                      ? mySubmission?.reviewRemarks || task.reviewRemarks
                      : task.reviewRemarks;

                    const forReviewSubs = submissionsList.filter((s) => s.status === "for_review");
                    const doneSubs = submissionsList.filter((s) => s.status === "done");

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-sm transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold">
                              {task.category}
                            </span>
                          </div>
                          {isHeadOfficeAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 leading-snug">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isGeneral ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold">
                              <Users size={11} className="text-indigo-600" />
                              <span>General Task (All HR)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold max-w-full">
                              <User size={11} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{task.assignedToName}</span>
                              {task.assignedToCompany && (
                                <span className="text-[9px] font-semibold text-emerald-700/80 truncate">
                                  • {task.assignedToCompany}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate">By {task.createdByName}</span>
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-600 shrink-0">
                              <Calendar size={10} className="text-slate-400" />
                              Due {task.dueDate}
                            </span>
                          )}
                        </div>

                        {!isGeneral && displayActionNotes && (
                          <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-2 text-[10.5px] space-y-1">
                            <div className="font-extrabold text-amber-900 flex items-center gap-1">
                              <MessageSquare size={11} className="text-amber-600" />
                              <span>Action Taken ({task.submittedByName || task.assignedToName}):</span>
                            </div>
                            <p className="text-slate-700 leading-snug">{displayActionNotes}</p>
                            {task.submittedAt && (
                              <span className="text-[9px] text-amber-700/80 block">
                                Submitted {formatShortDateTime(task.submittedAt)}
                              </span>
                            )}
                          </div>
                        )}

                        {isGeneral && !isHeadOfficeAdmin && displayActionNotes && (
                          <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-2 text-[10.5px] space-y-1">
                            <div className="font-extrabold text-amber-900 flex items-center gap-1">
                              <MessageSquare size={11} className="text-amber-600" />
                              <span>Your Submitted Action:</span>
                            </div>
                            <p className="text-slate-700 leading-snug">{displayActionNotes}</p>
                          </div>
                        )}

                        {displayReviewRemarks && (
                          <div className="rounded-lg bg-emerald-50/80 border border-emerald-200 p-2 text-[10.5px] space-y-0.5">
                            <div className="font-extrabold text-emerald-900 flex items-center gap-1">
                              <ShieldCheck size={11} className="text-emerald-600" />
                              <span>HR Admin Remarks:</span>
                            </div>
                            <p className="text-emerald-800 leading-snug">{displayReviewRemarks}</p>
                          </div>
                        )}

                        {isGeneral && isHeadOfficeAdmin && submissionsList.length > 0 && (
                          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700">
                              <span>Branch / HR Submissions ({submissionsList.length})</span>
                              <span className="text-[9px] text-amber-700">
                                {forReviewSubs.length} Review • {doneSubs.length} Done
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
                              {submissionsList.map((sub) => (
                                <div
                                  key={sub.email}
                                  className="rounded-lg bg-white border border-slate-200 p-2 text-[10px] space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold text-slate-800 truncate">
                                      {sub.name}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                                        sub.status === "done"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : sub.status === "for_review"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {sub.status === "for_review" ? "For Review" : sub.status}
                                    </span>
                                  </div>
                                  {sub.company && (
                                    <div className="text-[9px] text-slate-400 truncate">{sub.company}</div>
                                  )}
                                  {sub.actionNotes && (
                                    <p className="text-slate-600 bg-slate-50 rounded p-1.5 leading-snug">
                                      "{sub.actionNotes}"
                                    </p>
                                  )}
                                  {sub.status === "for_review" && (
                                    <div className="flex items-center gap-1 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => openReviewModal(task, sub.email, sub)}
                                        className="flex-1 py-1 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9.5px] transition cursor-pointer"
                                      >
                                        Review & Mark Done
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                          {!isHeadOfficeAdmin && (
                            <>
                              {col.id === "backlog" && (
                                <button
                                  type="button"
                                  onClick={() => handleStartTask(task)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-extrabold transition cursor-pointer"
                                >
                                  <Play size={10} />
                                  <span>Start Task</span>
                                </button>
                              )}

                              {(col.id === "backlog" || col.id === "in_progress") && (
                                <button
                                  type="button"
                                  onClick={() => openActionModal(task)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold transition cursor-pointer shadow-2xs"
                                >
                                  <Send size={10} />
                                  <span>Input Action (For Review)</span>
                                </button>
                              )}

                              {col.id === "for_review" && (
                                <div className="w-full flex items-center justify-between gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                    <Clock size={11} className="animate-pulse" />
                                    <span>Awaiting HR Admin Review</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openActionModal(task)}
                                    className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                  >
                                    Edit Action
                                  </button>
                                </div>
                              )}

                              {col.id === "done" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                  <span>Reviewed & Approved by HR Admin</span>
                                </span>
                              )}
                            </>
                          )}

                          {isHeadOfficeAdmin && (
                            <>
                              {col.id === "backlog" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdminMove(task.id, "in_progress")}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-extrabold transition cursor-pointer"
                                  >
                                    <ArrowRight size={10} />
                                    <span>In Progress</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdminMove(task.id, "done")}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold transition cursor-pointer"
                                  >
                                    <CheckCircle2 size={10} />
                                    <span>Done</span>
                                  </button>
                                </>
                              )}

                              {col.id === "in_progress" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdminMove(task.id, "backlog")}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition cursor-pointer"
                                  >
                                    ← Backlog
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openActionModal(task)}
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition cursor-pointer"
                                  >
                                    For Review
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdminMove(task.id, "done")}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold transition cursor-pointer"
                                  >
                                    <CheckCircle2 size={10} />
                                    <span>Mark Done</span>
                                  </button>
                                </>
                              )}

                              {col.id === "for_review" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(task, null, null)}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold transition cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Review & Mark as Done</span>
                                  </button>
                                </>
                              )}

                              {col.id === "done" && (
                                <div className="w-full flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 size={11} />
                                    <span>Completed</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdminMove(task.id, "in_progress")}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                                  >
                                    <RotateCcw size={10} />
                                    <span>Reopen</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Head Office Task Assignment
                </span>
                <h3 className="text-base font-black text-slate-900">Post New Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Who should perform this task? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewTask((prev) => ({
                        ...prev,
                        assignmentType: "general_hr",
                        assignedToEmail: "",
                        assignedToName: "",
                        assignedToCompany: "",
                        assignedToRole: ""
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      newTask.assignmentType === "general_hr"
                        ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900">
                      <Users size={14} className="text-indigo-600" />
                      <span>General Task (All HR)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Appears on every HR & Subsidiary account's Task Board.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTask((prev) => ({ ...prev, assignmentType: "specific_employee" }))}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      newTask.assignmentType === "specific_employee"
                        ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900">
                      <User size={14} className="text-emerald-600" />
                      <span>Specific Employee</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Assign directly to 1 employee; appears when they log in.
                    </p>
                  </button>
                </div>
              </div>

              {newTask.assignmentType === "specific_employee" && (
                <div className="space-y-1.5 bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
                  <label className="text-xs font-extrabold text-emerald-900 block">
                    Select Employee Account *
                  </label>
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Filter employee by name, email, or subsidiary..."
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={newTask.assignedToEmail}
                    onChange={(e) => {
                      const emp = employees.find((x) => x.email === e.target.value);
                      setNewTask((prev) => ({
                        ...prev,
                        assignedToEmail: emp?.email || "",
                        assignedToName: emp?.name || "",
                        assignedToCompany: emp?.company || "",
                        assignedToRole: emp?.role || ""
                      }));
                    }}
                    required
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Choose an Employee Account ({filteredEmployeesForPicker.length}) --</option>
                    {filteredEmployeesForPicker.map((emp) => (
                      <option key={emp.email} value={emp.email}>
                        {emp.name} — {emp.role} ({emp.company})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Submit Weekly 201 Compliance & Attendance Verification"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Instructions / Deliverables
                </label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the exact steps or proof required before submitting for review..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} />
                  <span>{isSubmittingTask ? "Posting..." : "Publish Task"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  Submit Action for HR Administrator Review
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">{actionModalTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActionModalTask(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="p-5 space-y-4">
              {actionModalTask.description && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block mb-0.5">Task Instructions:</span>
                  {actionModalTask.description}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Action Taken / Completion Report *
                </label>
                <textarea
                  rows={4}
                  required
                  value={actionNotesInput}
                  onChange={(e) => setActionNotesInput(e.target.value)}
                  placeholder="Describe the exact action completed (e.g. Verified all branch attendance logs, collected NBI clearances, uploaded documents)..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModalTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !actionNotesInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSubmittingAction ? "Submitting..." : "Submit For Review"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Head Office HR Administrator Review
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {reviewModalTarget.task.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                  <span>
                    Submitted By:{" "}
                    {reviewModalTarget.submission?.name ||
                      reviewModalTarget.task.submittedByName ||
                      reviewModalTarget.task.assignedToName}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700">
                    {reviewModalTarget.submission?.company || reviewModalTarget.task.assignedToCompany}
                  </span>
                </div>
                <p className="text-xs text-slate-800 bg-white/80 rounded-lg p-2.5 border border-amber-200/70 whitespace-pre-wrap">
                  {reviewModalTarget.submission?.actionNotes ||
                    reviewModalTarget.task.actionNotes ||
                    "No written action notes provided."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  HR Administrator Review Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarksInput}
                  onChange={(e) => setReviewRemarksInput(e.target.value)}
                  placeholder="Add approval note or revision feedback if returning to In Progress..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleConfirmReview("in_progress")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Return to In Progress</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleConfirmReview("done")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition cursor-pointer shadow-xs"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve & Mark as Done</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
