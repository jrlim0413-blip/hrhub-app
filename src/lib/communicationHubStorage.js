/**
 * communicationHubStorage.js
 * Unified Cloud-Synced Persistence & Real-Time Service for Communication Portal Modules:
 * - Service Desks: HR Helpdesk, IT Helpdesk, Finance Desk
 * - Knowledge Center (Guides, FAQs & SOP Playbooks)
 * - Employee Suggestion Box (Anonymous / Named + Upvotes + HR Response)
 * - Leaderboards & Staff Recognition Points
 * - Live Polls & Pulse Surveys
 */

import { supabase } from "./supabase.js";

const CLOUD_KEYS = {
  tickets: "hrhub_comm_helpdesk_tickets_v1",
  knowledge: "hrhub_comm_knowledge_articles_v1",
  suggestions: "hrhub_comm_suggestion_box_v1",
  recognitions: "hrhub_comm_leaderboard_awards_v1",
  polls: "hrhub_comm_polls_surveys_v1"
};

const commChannel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("hrhub_comm_hub_channel") : null;

const memoryStore = {};

function broadcastKeyUpdate(storeKey, payload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hrhub_comm_hub_updated", { detail: { key: storeKey, data: payload } })
    );
  }
  if (commChannel) {
    try {
      commChannel.postMessage({ key: storeKey, data: payload });
    } catch {}
  }
}

async function loadCollection(storeKey, defaultValue = []) {
  const cloudId = CLOUD_KEYS[storeKey];
  try {
    if (supabase && cloudId) {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", cloudId)
        .maybeSingle();

      if (!error && Array.isArray(data?.settings_json)) {
        memoryStore[storeKey] = data.settings_json;
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(cloudId, JSON.stringify(data.settings_json));
          } catch {}
        }
        return data.settings_json;
      }
    }
  } catch (err) {
    console.debug(`[commHubStorage:${storeKey}] cloud fetch fallback:`, err?.message);
  }

  if (Array.isArray(memoryStore[storeKey])) return memoryStore[storeKey];

  if (typeof window !== "undefined" && cloudId) {
    try {
      const raw = window.localStorage.getItem(cloudId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryStore[storeKey] = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  memoryStore[storeKey] = defaultValue;
  return defaultValue;
}

async function saveCollection(storeKey, list) {
  const cloudId = CLOUD_KEYS[storeKey];
  memoryStore[storeKey] = list;
  if (typeof window !== "undefined" && cloudId) {
    try {
      window.localStorage.setItem(cloudId, JSON.stringify(list));
    } catch {}
  }
  broadcastKeyUpdate(storeKey, list);

  try {
    if (supabase && cloudId) {
      await supabase.from("user_settings").upsert(
        {
          user_id: cloudId,
          settings_json: list,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    }
  } catch (err) {
    console.debug(`[commHubStorage:${storeKey}] cloud save notice:`, err?.message);
  }
  return list;
}

export function subscribeToCommHubLive(callback) {
  const onWin = (e) => {
    if (e?.detail?.key) callback(e.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hrhub_comm_hub_updated", onWin);
  }

  let onBc = null;
  if (commChannel) {
    onBc = (e) => {
      if (e?.data?.key) callback(e.data);
    };
    commChannel.addEventListener("message", onBc);
  }

  let sbChannel = null;
  try {
    if (supabase) {
      sbChannel = supabase
        .channel("realtime_comm_hub_sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_settings" },
          (payload) => {
            const uid = payload?.new?.user_id;
            const matchedKey = Object.keys(CLOUD_KEYS).find((k) => CLOUD_KEYS[k] === uid);
            if (matchedKey && Array.isArray(payload?.new?.settings_json)) {
              memoryStore[matchedKey] = payload.new.settings_json;
              callback({ key: matchedKey, data: payload.new.settings_json });
            }
          }
        )
        .subscribe();
    }
  } catch {}

  return () => {
    if (typeof window !== "undefined") window.removeEventListener("hrhub_comm_hub_updated", onWin);
    if (commChannel && onBc) commChannel.removeEventListener("message", onBc);
    if (sbChannel && supabase) supabase.removeChannel(sbChannel);
  };
}

// ============================================================================
// 1. HELPDESK TICKETS (HR Helpdesk, IT Helpdesk, Finance Desk)
// ============================================================================
export const fetchHelpdeskTickets = () => loadCollection("tickets", []);

export async function createHelpdeskTicket({
  deskType, // "hr_helpdesk" | "it_helpdesk" | "finance_desk"
  subject,
  category,
  priority = "Medium",
  description = "",
  requester = {}
}) {
  const existing = await fetchHelpdeskTickets();
  const prefix = deskType === "it_helpdesk" ? "IT" : deskType === "finance_desk" ? "FIN" : "HR";
  const nowIso = new Date().toISOString();
  const ticket = {
    id: `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ticketNo: `${prefix}-${new Date().getFullYear().toString().slice(-2)}${String(existing.length + 101).slice(-3)}`,
    deskType,
    subject: subject.trim(),
    category: category || "General Inquiry",
    priority,
    description: description.trim(),
    status: "Open", // Open | In Progress | Resolved | Closed
    requesterName: requester?.name || "Team Member",
    requesterEmail: String(requester?.email || "").toLowerCase().trim(),
    requesterCompany: requester?.company || "Simpal Group of Companies",
    requesterRole: requester?.role || "Staff",
    replies: [],
    createdAt: nowIso,
    updatedAt: nowIso
  };
  const next = [ticket, ...existing];
  await saveCollection("tickets", next);
  return { success: true, ticket, tickets: next };
}

export async function updateHelpdeskTicket(ticketId, updates = {}, replyMessage = null, actor = {}) {
  const existing = await fetchHelpdeskTickets();
  const nowIso = new Date().toISOString();
  const next = existing.map((t) => {
    if (t.id !== ticketId) return t;
    const replies = Array.isArray(t.replies) ? [...t.replies] : [];
    if (replyMessage && replyMessage.trim()) {
      replies.push({
        id: `rep_${Date.now()}`,
        authorName: actor?.name || "Desk Officer",
        authorRole: actor?.role || "",
        authorEmail: String(actor?.email || "").toLowerCase().trim(),
        message: replyMessage.trim(),
        createdAt: nowIso
      });
    }
    return {
      ...t,
      ...updates,
      replies,
      updatedAt: nowIso
    };
  });
  await saveCollection("tickets", next);
  return { success: true, tickets: next };
}

export async function deleteHelpdeskTicket(ticketId) {
  const existing = await fetchHelpdeskTickets();
  const next = existing.filter((t) => t.id !== ticketId);
  await saveCollection("tickets", next);
  return { success: true, tickets: next };
}

// ============================================================================
// 2. KNOWLEDGE CENTER (Starter Guides + Dynamic HRMD Articles)
// ============================================================================
const DEFAULT_KNOWLEDGE_ARTICLES = [
  {
    id: "kb_stl_gross_remit",
    title: "STL Daily Draw Cutoff & Cash Remittance Procedure (2PM / 5PM / 9PM)",
    category: "STL Operations",
    summary: "Standard cut-off rules (15 mins prior to draw), teller cash balancing, dual-signoff remittance slip, and central vault handover.",
    content: "1. Stop accepting bets 15 minutes before official draw (1:45 PM, 4:45 PM, 8:45 PM).\n2. Reconcile POS terminal sales summary against physical cash on hand.\n3. Hand over sealed collection pouch to Area Field Supervisor with dual-signed Remittance Slip.\n4. Deposit pooled remittance to Central Cashier within 2 hours of draw completion and verify against HRHub Gross Report.",
    authorName: "Head Office HRMD",
    updatedAt: "2026-11-01T08:00:00.000Z",
    pinned: true
  },
  {
    id: "kb_awol_due_process",
    title: "Step-by-Step Guide: Handling AWOL Agents & Employees (DOLE Art. 297)",
    category: "HR & Due Process",
    summary: "Mandatory verification of cash/POS accountability, documented contact attempts, filing Branch Incident Report, and Head Office RTWO/NTE issuance.",
    content: "1. Immediately audit POS terminal, ticket rolls, and cash float accountability.\n2. Contact the employee and emergency contact via call/SMS and keep screenshots.\n3. File an official Branch Incident Report inside HRHub (Incident Reports & NTE module).\n4. Head Office HRMD issues a formal Return-to-Work Order (RTWO) / Notice to Explain (NTE) observing the 5-day DOLE due process rule.\n5. Re-assign booth coverage so branch STL Gross is not impacted.",
    authorName: "Head Office HRMD",
    updatedAt: "2026-11-01T08:00:00.000Z",
    pinned: true
  },
  {
    id: "kb_dole_holiday_13th",
    title: "DOLE Holiday Pay & 13th Month Pay Quick Reference",
    category: "Payroll & Benefits",
    summary: "Quick formulas for Regular Holidays (200%), Special Non-Working Days (130%), Rest Day premiums, and P.D. 851 13th Month Pay.",
    content: "• Regular Holiday Worked: Daily Rate × 200% (Unworked: 100% if present/on paid leave day before).\n• Special Non-Working Day Worked: Daily Rate × 130% (Unworked: No work, no pay).\n• 13th Month Pay (P.D. 851): Total Basic Salary Earned Within the Calendar Year ÷ 12.\n• Use the built-in 13th Month Payroll Calculator inside Workspace → Finance for exact pro-rated computations.",
    authorName: "Head Office HRMD",
    updatedAt: "2026-11-01T08:00:00.000Z",
    pinned: false
  },
  {
    id: "kb_hrhub_quickstart",
    title: "HRHub Portal Quick-Start Guide for New Branch Officers",
    category: "HRHub App Guide",
    summary: "How to switch between Communication Portal and Operations Workspace, use Task Board, and ask HRHub AI Buddy for direct module links.",
    content: "• Communication Portal: Access Company Bulletin, Employee Directory, Service Desks (HR/IT/Finance), Suggestion Box, Leaderboards, and Polls.\n• Operations Workspace: Access Task Board, Gross Report, Agents Directory, Incident Reports & NTE, Memo Generator, GeoTagging Map, and Weather Radar.\n• Need help anytime? Click HRHub AI Buddy in the bottom-right corner and ask for step-by-step instructions or direct clickable module links.",
    authorName: "IT Administration",
    updatedAt: "2026-11-01T08:00:00.000Z",
    pinned: false
  }
];

export async function fetchKnowledgeArticles() {
  const list = await loadCollection("knowledge", DEFAULT_KNOWLEDGE_ARTICLES);
  return list.length > 0 ? list : DEFAULT_KNOWLEDGE_ARTICLES;
}

export async function createKnowledgeArticle({ title, category, summary, content, author = {} }) {
  const existing = await fetchKnowledgeArticles();
  const article = {
    id: `kb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    category: category || "General Guide",
    summary: summary.trim(),
    content: content.trim(),
    authorName: author?.name || "HR Administrator",
    updatedAt: new Date().toISOString(),
    pinned: false
  };
  const next = [article, ...existing];
  await saveCollection("knowledge", next);
  return { success: true, article, articles: next };
}

export async function deleteKnowledgeArticle(articleId) {
  const existing = await fetchKnowledgeArticles();
  const next = existing.filter((a) => a.id !== articleId);
  await saveCollection("knowledge", next);
  return { success: true, articles: next };
}

// ============================================================================
// 3. SUGGESTION BOX (Named or Anonymous + Upvotes + HRMD Official Response)
// ============================================================================
export const fetchSuggestions = () => loadCollection("suggestions", []);

export async function createSuggestion({ title, category, details, isAnonymous = false, author = {} }) {
  const existing = await fetchSuggestions();
  const nowIso = new Date().toISOString();
  const entry = {
    id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    category: category || "Workplace & Culture",
    details: details.trim(),
    isAnonymous: Boolean(isAnonymous),
    authorName: isAnonymous ? "Anonymous Team Member" : (author?.name || "Team Member"),
    authorEmail: isAnonymous ? "" : String(author?.email || "").toLowerCase().trim(),
    authorCompany: isAnonymous ? "Confidential" : (author?.company || ""),
    status: "Submitted", // Submitted | Under Review | Planned | Implemented
    hrResponse: "",
    upvotes: [], // array of voter emails
    createdAt: nowIso
  };
  const next = [entry, ...existing];
  await saveCollection("suggestions", next);
  return { success: true, suggestions: next };
}

export async function toggleSuggestionUpvote(suggestionId, voterEmail) {
  const normEmail = String(voterEmail || "").toLowerCase().trim();
  if (!normEmail) return { success: false };
  const existing = await fetchSuggestions();
  const next = existing.map((s) => {
    if (s.id !== suggestionId) return s;
    const votes = Array.isArray(s.upvotes) ? [...s.upvotes] : [];
    const idx = votes.indexOf(normEmail);
    if (idx >= 0) votes.splice(idx, 1);
    else votes.push(normEmail);
    return { ...s, upvotes: votes };
  });
  await saveCollection("suggestions", next);
  return { success: true, suggestions: next };
}

export async function updateSuggestionReview(suggestionId, { status, hrResponse }) {
  const existing = await fetchSuggestions();
  const next = existing.map((s) =>
    s.id === suggestionId
      ? { ...s, status: status || s.status, hrResponse: hrResponse ?? s.hrResponse }
      : s
  );
  await saveCollection("suggestions", next);
  return { success: true, suggestions: next };
}

export async function deleteSuggestion(suggestionId) {
  const existing = await fetchSuggestions();
  const next = existing.filter((s) => s.id !== suggestionId);
  await saveCollection("suggestions", next);
  return { success: true, suggestions: next };
}

// ============================================================================
// 4. LEADERBOARDS & RECOGNITION AWARDS
// ============================================================================
export const fetchRecognitionAwards = () => loadCollection("recognitions", []);

export async function createRecognitionAward({
  recipientEmail,
  recipientName,
  recipientCompany,
  recipientRole,
  points = 50,
  badge = "Top Performer",
  reason = "",
  awardedBy = {}
}) {
  const existing = await fetchRecognitionAwards();
  const award = {
    id: `awd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    recipientEmail: String(recipientEmail || "").toLowerCase().trim(),
    recipientName: recipientName || recipientEmail,
    recipientCompany: recipientCompany || "Simpal Group of Companies",
    recipientRole: recipientRole || "Team Member",
    points: Number(points) || 50,
    badge: badge || "Top Performer",
    reason: reason.trim(),
    awardedByName: awardedBy?.name || "HR Administrator",
    createdAt: new Date().toISOString()
  };
  const next = [award, ...existing];
  await saveCollection("recognitions", next);
  return { success: true, award, awards: next };
}

export async function deleteRecognitionAward(awardId) {
  const existing = await fetchRecognitionAwards();
  const next = existing.filter((a) => a.id !== awardId);
  await saveCollection("recognitions", next);
  return { success: true, awards: next };
}

// ============================================================================
// 5. POLLS & SURVEYS
// ============================================================================
export const fetchPolls = () => loadCollection("polls", []);

export async function createPoll({
  question,
  description = "",
  category = "Pulse Survey",
  options = [],
  closesAt = "",
  createdBy = {}
}) {
  const cleanOptions = options
    .map((o) => String(o || "").trim())
    .filter(Boolean)
    .map((label, idx) => ({
      id: `opt_${idx + 1}_${Math.random().toString(36).slice(2, 5)}`,
      label,
      votes: [] // array of voter emails
    }));

  if (!question.trim() || cleanOptions.length < 2) {
    return { success: false, error: "Provide a question and at least 2 options." };
  }

  const existing = await fetchPolls();
  const poll = {
    id: `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    question: question.trim(),
    description: description.trim(),
    category,
    options: cleanOptions,
    status: "Active", // Active | Closed
    closesAt: closesAt || "",
    createdByName: createdBy?.name || "HR Administrator",
    createdAt: new Date().toISOString()
  };
  const next = [poll, ...existing];
  await saveCollection("polls", next);
  return { success: true, poll, polls: next };
}

export async function voteOnPoll(pollId, optionId, voterEmail) {
  const normEmail = String(voterEmail || "").toLowerCase().trim();
  if (!normEmail) return { success: false };
  const existing = await fetchPolls();
  const next = existing.map((p) => {
    if (p.id !== pollId || p.status === "Closed") return p;
    const updatedOptions = (p.options || []).map((opt) => {
      const cleanedVotes = (opt.votes || []).filter((e) => e !== normEmail);
      if (opt.id === optionId) {
        cleanedVotes.push(normEmail);
      }
      return { ...opt, votes: cleanedVotes };
    });
    return { ...p, options: updatedOptions };
  });
  await saveCollection("polls", next);
  return { success: true, polls: next };
}

export async function togglePollStatus(pollId) {
  const existing = await fetchPolls();
  const next = existing.map((p) =>
    p.id === pollId ? { ...p, status: p.status === "Closed" ? "Active" : "Closed" } : p
  );
  await saveCollection("polls", next);
  return { success: true, polls: next };
}

export async function deletePoll(pollId) {
  const existing = await fetchPolls();
  const next = existing.filter((p) => p.id !== pollId);
  await saveCollection("polls", next);
  return { success: true, polls: next };
}
