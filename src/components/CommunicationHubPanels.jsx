import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Headphones, Laptop, Wallet, BookOpen, Lightbulb, Trophy, BarChart2,
  Plus, Search, RefreshCw, CheckCircle2, Clock, Send, Trash2, X,
  ThumbsUp, ShieldCheck, MessageSquare, Award, Sparkles, Lock,
  EyeOff, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import {
  fetchHelpdeskTickets,
  createHelpdeskTicket,
  updateHelpdeskTicket,
  deleteHelpdeskTicket,
  fetchKnowledgeArticles,
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  fetchSuggestions,
  createSuggestion,
  toggleSuggestionUpvote,
  updateSuggestionReview,
  deleteSuggestion,
  fetchRecognitionAwards,
  createRecognitionAward,
  deleteRecognitionAward,
  fetchPolls,
  createPoll,
  voteOnPoll,
  togglePollStatus,
  deletePoll,
  subscribeToCommHubLive
} from "../lib/communicationHubStorage.js";
import { fetchAllTasks } from "../lib/taskBoardStorage.js";
import { fetchEmployeesFromDatabase } from "../lib/employeeStorage.js";
import { isHeadOfficeHrAdminUser } from "../lib/aiAssistantService.js";

const DESK_META = {
  hr_helpdesk: {
    title: "HR Helpdesk",
    badge: "HR SUPPORT DESK",
    subtitle: "Submit and track inquiries for COE, government benefits (SSS/PhilHealth/Pag-IBIG), leaves, 201 files, and HR concerns.",
    icon: Headphones,
    accentBadge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    accentIcon: "text-emerald-600",
    categories: [
      "Certificate of Employment (COE)",
      "SSS / PhilHealth / Pag-IBIG",
      "Leave & Attendance Inquiry",
      "201 File & Requirements",
      "Benefits & HMO",
      "Disciplinary / Due Process",
      "General HR Inquiry"
    ]
  },
  it_helpdesk: {
    title: "IT Helpdesk",
    badge: "IT TECHNICAL SUPPORT",
    subtitle: "Report POS/STL terminal issues, HRHub account login/password problems, biometrics, printers, or network outages.",
    icon: Laptop,
    accentBadge: "bg-sky-50 text-sky-800 border-sky-200",
    accentIcon: "text-sky-600",
    categories: [
      "POS / STL Terminal Issue",
      "HRHub Login / Password Reset",
      "Biometrics & Printer Support",
      "Internet / Network Outage",
      "Laptop / Hardware Repair",
      "Module / System Access Request"
    ]
  },
  finance_desk: {
    title: "Finance Desk",
    badge: "FINANCE & ACCOUNTING DESK",
    subtitle: "Coordinate STL gross remittance reconciliation, hits payout verification, petty cash liquidation, and payslip concerns.",
    icon: Wallet,
    accentBadge: "bg-amber-50 text-amber-800 border-amber-200",
    accentIcon: "text-amber-600",
    categories: [
      "STL Gross Remittance Query",
      "Hits Payout Verification",
      "Petty Cash & Voucher Liquidation",
      "Payslip / Salary Discrepancy",
      "Cash Float & Shortage Audit",
      "Expense Reimbursement"
    ]
  }
};

function formatDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export default function CommunicationHubPanels({
  activeTab,
  currentUser = null,
  isHRMD = false,
  profiles = [],
  canManageHelpdesk = null,
  canManageEngagement = null
}) {
  const isAdmin = isHeadOfficeHrAdminUser(currentUser, isHRMD);
  const canHandleHelpdesk = typeof canManageHelpdesk === "boolean" ? canManageHelpdesk : isAdmin;
  const canHandleEngagement = typeof canManageEngagement === "boolean" ? canManageEngagement : isAdmin;
  const myEmail = String(currentUser?.email || "").toLowerCase().trim();

  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [awards, setAwards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [polls, setPolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "Medium",
    description: ""
  });

  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: "",
    category: "STL Operations",
    summary: "",
    content: ""
  });

  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    title: "",
    category: "STL Sales Growth",
    details: "",
    isAnonymous: false
  });
  const [reviewingSuggestion, setReviewingSuggestion] = useState(null);
  const [suggestionReviewStatus, setSuggestionReviewStatus] = useState("Under Review");
  const [suggestionHrReply, setSuggestionHrReply] = useState("");

  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({
    recipientEmail: "",
    points: 50,
    badge: "Top Performer",
    reason: ""
  });

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    description: "",
    category: "Pulse Survey",
    closesAt: "",
    options: ["", ""]
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    setSearchQuery("");
    setStatusFilter("All");
    setCategoryFilter("All");
    const desk = DESK_META[activeTab];
    if (desk) {
      setTicketForm((prev) => ({ ...prev, category: desk.categories[0] || "General Inquiry" }));
    }
  }, [activeTab]);

  const loadAllHubData = useCallback(async () => {
    setLoading(true);
    const [tkt, kb, sug, awd, pll, tsk] = await Promise.all([
      fetchHelpdeskTickets(),
      fetchKnowledgeArticles(),
      fetchSuggestions(),
      fetchRecognitionAwards(),
      fetchPolls(),
      fetchAllTasks()
    ]);
    setTickets(tkt || []);
    setArticles(kb || []);
    setSuggestions(sug || []);
    setAwards(awd || []);
    setPolls(pll || []);
    setTasks(tsk || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllHubData();
    const unsub = subscribeToCommHubLive(({ key, data }) => {
      if (key === "tickets") setTickets(data);
      if (key === "knowledge") setArticles(data);
      if (key === "suggestions") setSuggestions(data);
      if (key === "recognitions") setAwards(data);
      if (key === "polls") setPolls(data);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [loadAllHubData]);

  useEffect(() => {
    let active = true;
    fetchEmployeesFromDatabase()
      .then((dbEmps) => {
        const map = new Map();
        [...(dbEmps || []), ...(profiles || [])].forEach((e) => {
          const em = String(e?.email || "").toLowerCase().trim();
          if (!em || map.has(em)) return;
          map.set(em, {
            email: em,
            name: e.name || em.split("@")[0],
            company: e.company || "Simpal Group of Companies",
            role: e.role || "Team Member"
          });
        });
        if (active) setEmployees(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [profiles]);

  const leaderboardRankings = useMemo(() => {
    const scoreMap = new Map();

    const ensureEntry = (email, name, company, role) => {
      const key = String(email || "").toLowerCase().trim();
      if (!key) return null;
      if (!scoreMap.has(key)) {
        scoreMap.set(key, {
          email: key,
          name: name || key.split("@")[0],
          company: company || "Simpal Group of Companies",
          role: role || "Team Member",
          points: 0,
          tasksDone: 0,
          awardCount: 0,
          badges: []
        });
      }
      return scoreMap.get(key);
    };

    awards.forEach((a) => {
      const entry = ensureEntry(a.recipientEmail, a.recipientName, a.recipientCompany, a.recipientRole);
      if (!entry) return;
      entry.points += Number(a.points || 0);
      entry.awardCount += 1;
      if (a.badge && !entry.badges.includes(a.badge)) {
        entry.badges.push(a.badge);
      }
    });

    tasks.forEach((t) => {
      if (t.assignmentType === "specific_employee" && t.status === "done" && t.assignedToEmail) {
        const entry = ensureEntry(t.assignedToEmail, t.assignedToName, t.assignedToCompany, t.assignedToRole);
        if (entry) {
          entry.points += 25;
          entry.tasksDone += 1;
        }
      } else if (t.assignmentType === "general_hr" && t.submissions) {
        Object.values(t.submissions).forEach((sub) => {
          if (sub.status === "done" && sub.email) {
            const entry = ensureEntry(sub.email, sub.name, sub.company, sub.role);
            if (entry) {
              entry.points += 25;
              entry.tasksDone += 1;
            }
          }
        });
      }
    });

    return Array.from(scoreMap.values()).sort((a, b) => b.points - a.points);
  }, [awards, tasks]);

  if (activeTab === "hr_helpdesk" || activeTab === "it_helpdesk" || activeTab === "finance_desk") {
    const desk = DESK_META[activeTab];
    const DeskIcon = desk.icon;

    const deskTickets = tickets.filter((t) => {
      if (t.deskType !== activeTab) return false;
      if (!canHandleHelpdesk && t.requesterEmail !== myEmail) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${t.ticketNo} ${t.subject} ${t.category} ${t.description} ${t.requesterName} ${t.requesterCompany}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const openCount = deskTickets.filter((t) => t.status === "Open").length;
    const inProgCount = deskTickets.filter((t) => t.status === "In Progress").length;
    const resolvedCount = deskTickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;

    const handleCreateTicket = async (e) => {
      e.preventDefault();
      if (!ticketForm.subject.trim()) return;
      const res = await createHelpdeskTicket({
        deskType: activeTab,
        subject: ticketForm.subject,
        category: ticketForm.category || desk.categories[0],
        priority: ticketForm.priority,
        description: ticketForm.description,
        requester: currentUser
      });
      if (res.success) {
        setTickets(res.tickets);
        setIsTicketModalOpen(false);
        setTicketForm({ subject: "", category: desk.categories[0], priority: "Medium", description: "" });
        showToast(`🎫 Ticket ${res.ticket.ticketNo} submitted to ${desk.title}!`);
      }
    };

    const handleSendTicketReply = async (ticketId) => {
      if (!replyDraft.trim()) return;
      const res = await updateHelpdeskTicket(ticketId, {}, replyDraft, currentUser);
      if (res.success) {
        setTickets(res.tickets);
        setReplyDraft("");
        showToast("💬 Reply posted to ticket.");
      }
    };

    const handleChangeTicketStatus = async (ticketId, nextStatus) => {
      const res = await updateHelpdeskTicket(ticketId, { status: nextStatus }, null, currentUser);
      if (res.success) {
        setTickets(res.tickets);
        showToast(`Ticket status updated to ${nextStatus}.`);
      }
    };

    const handleDeleteTicket = async (ticketId) => {
      if (!window.confirm("Delete this support ticket?")) return;
      const res = await deleteHelpdeskTicket(ticketId);
      if (res.success) {
        setTickets(res.tickets);
        showToast("Ticket deleted.");
      }
    };

    return (
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black mb-1 ${desk.accentBadge}`}>
                <DeskIcon size={11} className={desk.accentIcon} />
                <span>{desk.badge}</span>
              </span>
              <h1 className="text-base font-black text-slate-900">{desk.title}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">{desk.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadAllHubData}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Refresh tickets"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer shadow-xs"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>New Ticket</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 px-3 py-2">
              <span className="text-[10px] font-bold uppercase text-amber-800">Open</span>
              <div className="text-lg font-black text-slate-900 font-mono">{openCount}</div>
            </div>
            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 px-3 py-2">
              <span className="text-[10px] font-bold uppercase text-blue-800">In Progress</span>
              <div className="text-lg font-black text-slate-900 font-mono">{inProgCount}</div>
            </div>
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3 py-2">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Resolved</span>
              <div className="text-lg font-black text-slate-900 font-mono">{resolvedCount}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${desk.title.toLowerCase()} tickets...`}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5">
          {deskTickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center space-y-2">
              <DeskIcon size={28} className="mx-auto text-slate-300" />
              <h3 className="text-xs font-extrabold text-slate-800">No {desk.title} Tickets Yet</h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Click <strong>+ New Ticket</strong> to submit a request or concern directly to the {desk.title} team.
              </p>
            </div>
          ) : (
            deskTickets.map((t) => {
              const isExpanded = expandedTicketId === t.id;
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-emerald-400">
                          {t.ticketNo}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            t.status === "Resolved" || t.status === "Closed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : t.status === "In Progress"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {t.category}
                        </span>
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${
                            t.priority === "Urgent"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : t.priority === "High"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">{t.subject}</h3>
                      <p className="text-[11px] text-slate-500">
                        Submitted by <strong>{t.requesterName}</strong> ({t.requesterCompany}) • {formatDateTime(t.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canHandleHelpdesk && (
                        <select
                          value={t.status}
                          onChange={(e) => handleChangeTicketStatus(t.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                      >
                        <MessageSquare size={11} />
                        <span>{t.replies?.length || 0}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {canHandleHelpdesk && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-700 bg-slate-50/80 rounded-xl p-3 border border-slate-100 whitespace-pre-wrap">
                      {t.description}
                    </p>
                  )}

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      {(t.replies || []).length > 0 && (
                        <div className="space-y-1.5">
                          {t.replies.map((rep) => (
                            <div key={rep.id} className="rounded-xl bg-emerald-50/50 border border-emerald-200/70 p-2.5 text-xs">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                <strong className="text-emerald-900">{rep.authorName}</strong>
                                <span>{formatDateTime(rep.createdAt)}</span>
                              </div>
                              <p className="text-slate-800 whitespace-pre-wrap">{rep.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendTicketReply(t.id);
                          }}
                          placeholder="Write a reply or resolution update..."
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendTicketReply(t.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold cursor-pointer"
                        >
                          <Send size={12} />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700">{desk.badge}</span>
                  <h3 className="text-sm font-black text-slate-900">Submit New {desk.title} Ticket</h3>
                </div>
                <button type="button" onClick={() => setIsTicketModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateTicket} className="p-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject *</label>
                  <input
                    required
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="Short summary of your request or issue"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold cursor-pointer"
                    >
                      {desk.categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold cursor-pointer"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Details *</label>
                  <textarea
                    rows={4}
                    required
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    placeholder="Provide complete details, dates, terminal ID, or employee names involved..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setIsTicketModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-extrabold cursor-pointer">Submit Ticket</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "knowledge_center") {
    const categories = ["All", "STL Operations", "HR & Due Process", "Payroll & Benefits", "HRHub App Guide", "General Guide"];
    const filteredArticles = articles.filter((a) => {
      if (categoryFilter !== "All" && a.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!`${a.title} ${a.summary} ${a.content} ${a.category}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const handlePublishArticle = async (e) => {
      e.preventDefault();
      if (!articleForm.title.trim() || !articleForm.content.trim()) return;
      const res = await createKnowledgeArticle({ ...articleForm, author: currentUser });
      if (res.success) {
        setArticles(res.articles);
        setIsArticleModalOpen(false);
        setArticleForm({ title: "", category: "STL Operations", summary: "", content: "" });
        showToast("📚 Knowledge article published!");
      }
    };

    const handleDeleteArticle = async (id) => {
      if (!window.confirm("Remove this Knowledge Center article?")) return;
      const res = await deleteKnowledgeArticle(id);
      if (res.success) {
        setArticles(res.articles);
        showToast("Article removed.");
      }
    };

    return (
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-black mb-1">
                <BookOpen size={11} className="text-indigo-600" />
                <span>KNOWLEDGE CENTER</span>
              </span>
              <h1 className="text-base font-black text-slate-900">Knowledge Center & Playbooks</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official how-to guides, STL operational procedures, DOLE quick references, and HRHub tutorials.
              </p>
            </div>
            {canHandleEngagement && (
              <button
                type="button"
                onClick={() => setIsArticleModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>Publish Article</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides, STL rules, DOLE formulas, HRHub how-to..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                    categoryFilter === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredArticles.map((art) => {
            const isOpen = expandedArticleId === art.id;
            return (
              <div key={art.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between gap-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black">
                      {art.category}
                    </span>
                    {canHandleEngagement && (
                      <button type="button" onClick={() => handleDeleteArticle(art.id)} className="text-slate-300 hover:text-rose-600 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{art.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{art.summary}</p>
                  {isOpen && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {art.content}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-400">By {art.authorName}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedArticleId(isOpen ? null : art.id)}
                    className="font-extrabold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                  >
                    {isOpen ? "Hide Full Guide ▲" : "Read Full Guide ▼"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-900">Publish Knowledge Article</h3>
                <button type="button" onClick={() => setIsArticleModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handlePublishArticle} className="p-5 space-y-3">
                <input required value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Article Title *" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" />
                <select value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
                  {categories.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={articleForm.summary} onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })} placeholder="Short summary (1 sentence)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
                <textarea rows={5} required value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} placeholder="Step-by-step instructions or policy guide..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none" />
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setIsArticleModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-emerald-400 text-xs font-extrabold cursor-pointer">Publish</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "suggestion_box") {
    const handlePostSuggestion = async (e) => {
      e.preventDefault();
      if (!suggestionForm.title.trim() || !suggestionForm.details.trim()) return;
      const res = await createSuggestion({ ...suggestionForm, author: currentUser });
      if (res.success) {
        setSuggestions(res.suggestions);
        setIsSuggestionModalOpen(false);
        setSuggestionForm({ title: "", category: "STL Sales Growth", details: "", isAnonymous: false });
        showToast("💡 Suggestion submitted! Thank you for sharing your idea.");
      }
    };

    const handleUpvote = async (id) => {
      const res = await toggleSuggestionUpvote(id, myEmail);
      if (res.success) setSuggestions(res.suggestions);
    };

    const handleSaveSuggestionReview = async (e) => {
      e.preventDefault();
      if (!reviewingSuggestion) return;
      const res = await updateSuggestionReview(reviewingSuggestion.id, {
        status: suggestionReviewStatus,
        hrResponse: suggestionHrReply
      });
      if (res.success) {
        setSuggestions(res.suggestions);
        setReviewingSuggestion(null);
        showToast("✅ Official response saved.");
      }
    };

    return (
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black mb-1">
              <Lightbulb size={11} className="text-amber-600" />
              <span>EMPLOYEE SUGGESTION BOX</span>
            </span>
            <h1 className="text-base font-black text-slate-900">Suggestion Box & Ideas</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Share workplace improvements, STL gross growth ideas, or welfare feedback — openly or anonymously.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSuggestionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer shrink-0"
          >
            <Plus size={14} className="text-amber-400" />
            <span>Submit Suggestion</span>
          </button>
        </div>

        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center space-y-2">
              <Lightbulb size={28} className="mx-auto text-amber-300" />
              <h3 className="text-xs font-extrabold text-slate-800">No Suggestions Posted Yet</h3>
              <p className="text-[11px] text-slate-500">Be the first to share a bright idea for the team!</p>
            </div>
          ) : (
            suggestions.map((s) => {
              const hasVoted = (s.upvotes || []).includes(myEmail);
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                          {s.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            s.status === "Implemented"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : s.status === "Planned"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {s.status}
                        </span>
                        {s.isAnonymous && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9.5px] font-bold">
                            <EyeOff size={10} /> Anonymous
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">{s.title}</h3>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{s.details}</p>
                      <p className="text-[10px] text-slate-400">
                        By {s.authorName} {s.authorCompany ? `• ${s.authorCompany}` : ""} • {formatDateTime(s.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpvote(s.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                          hasVoted
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <ThumbsUp size={12} />
                        <span>{(s.upvotes || []).length}</span>
                      </button>
                      {canHandleEngagement && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingSuggestion(s);
                              setSuggestionReviewStatus(s.status || "Under Review");
                              setSuggestionHrReply(s.hrResponse || "");
                            }}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Respond
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm("Delete this suggestion?")) return;
                              const res = await deleteSuggestion(s.id);
                              if (res.success) setSuggestions(res.suggestions);
                            }}
                            className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {s.hrResponse && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">
                      <span className="font-extrabold text-emerald-900 flex items-center gap-1 mb-0.5">
                        <ShieldCheck size={12} className="text-emerald-600" /> Official HRMD Response:
                      </span>
                      <p className="text-emerald-800">{s.hrResponse}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {isSuggestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
                <h3 className="text-sm font-black text-slate-900">Submit a Suggestion</h3>
                <button type="button" onClick={() => setIsSuggestionModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handlePostSuggestion} className="p-5 space-y-3.5">
                <input required value={suggestionForm.title} onChange={(e) => setSuggestionForm({ ...suggestionForm, title: e.target.value })} placeholder="Suggestion Title *" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold" />
                <select value={suggestionForm.category} onChange={(e) => setSuggestionForm({ ...suggestionForm, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
                  <option value="STL Sales Growth">STL Sales Growth</option>
                  <option value="Workplace & Culture">Workplace & Culture</option>
                  <option value="Operations & Workflow">Operations & Workflow</option>
                  <option value="Employee Welfare">Employee Welfare</option>
                  <option value="IT & HRHub Features">IT & HRHub Features</option>
                </select>
                <textarea rows={4} required value={suggestionForm.details} onChange={(e) => setSuggestionForm({ ...suggestionForm, details: e.target.value })} placeholder="Explain your suggestion and how it helps the company or team..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none" />
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={suggestionForm.isAnonymous} onChange={(e) => setSuggestionForm({ ...suggestionForm, isAnonymous: e.target.checked })} className="rounded" />
                  <span>Submit Anonymously (hide my name and branch)</span>
                </label>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setIsSuggestionModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-amber-400 text-xs font-extrabold cursor-pointer">Post Suggestion</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {reviewingSuggestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
                <h3 className="text-sm font-black text-slate-900">Respond to Suggestion</h3>
                <button type="button" onClick={() => setReviewingSuggestion(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveSuggestionReview} className="p-5 space-y-3">
                <select value={suggestionReviewStatus} onChange={(e) => setSuggestionReviewStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Planned">Planned</option>
                  <option value="Implemented">Implemented</option>
                </select>
                <textarea rows={3} value={suggestionHrReply} onChange={(e) => setSuggestionHrReply(e.target.value)} placeholder="Write official HRMD feedback or action plan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReviewingSuggestion(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer">Save Response</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "leaderboards") {
    const handleGiveAward = async (e) => {
      e.preventDefault();
      const emp = employees.find((x) => x.email === awardForm.recipientEmail);
      if (!emp) return;
      const res = await createRecognitionAward({
        recipientEmail: emp.email,
        recipientName: emp.name,
        recipientCompany: emp.company,
        recipientRole: emp.role,
        points: awardForm.points,
        badge: awardForm.badge,
        reason: awardForm.reason,
        awardedBy: currentUser
      });
      if (res.success) {
        setAwards(res.awards);
        setIsAwardModalOpen(false);
        setAwardForm({ recipientEmail: "", points: 50, badge: "Top Performer", reason: "" });
        showToast(`🏆 Awarded +${awardForm.points} pts to ${emp.name}!`);
      }
    };

    const topThree = leaderboardRankings.slice(0, 3);

    return (
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
            <Trophy size={14} className="text-amber-400" />
            <span>{toast}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black mb-1">
              <Trophy size={11} className="text-amber-500" />
              <span>PERFORMANCE LEADERBOARDS</span>
            </span>
            <h1 className="text-base font-black text-slate-900">Employee & Subsidiary Leaderboards</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live rankings powered by approved Task Board completions (+25 pts) and official HRMD Recognition Awards.
            </p>
          </div>
          {canHandleEngagement && (
            <button
              type="button"
              onClick={() => setIsAwardModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-extrabold cursor-pointer shrink-0"
            >
              <Award size={14} />
              <span>Award Recognition</span>
            </button>
          )}
        </div>

        {topThree.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topThree.map((person, idx) => {
              const medals = [
                { label: "#1 GOLD", bg: "bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-300", badge: "bg-amber-500 text-white" },
                { label: "#2 SILVER", bg: "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300", badge: "bg-slate-500 text-white" },
                { label: "#3 BRONZE", bg: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200", badge: "bg-orange-500 text-white" }
              ][idx];
              return (
                <div key={person.email} className={`rounded-2xl border p-4 shadow-2xs text-center space-y-2 ${medals.bg}`}>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${medals.badge}`}>
                    {medals.label}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 truncate">{person.name}</h3>
                  <p className="text-[10px] text-slate-600 truncate">{person.role} • {person.company}</p>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {person.points} <span className="text-xs font-bold text-slate-500">pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {person.tasksDone} Tasks Done • {person.awardCount} Awards
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 font-black text-xs text-slate-800">
            Live Standings ({leaderboardRankings.length} Ranked Personnel)
          </div>
          {leaderboardRankings.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 space-y-1">
              <Trophy size={26} className="mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">No Leaderboard Points Recorded Yet</p>
              <p className="text-[11px]">Points automatically accumulate as tasks are approved on the Task Board or when HRMD awards recognition points.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaderboardRankings.map((p, idx) => (
                <div key={p.email} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{p.role} • {p.company}</div>
                      {p.badges.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {p.badges.map((b) => (
                            <span key={b} className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                              🏅 {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-700 font-mono">{p.points} pts</div>
                    <div className="text-[10px] text-slate-400">{p.tasksDone} tasks • {p.awardCount} kudos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isAwardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
                <h3 className="text-sm font-black text-slate-900">Award Recognition Points</h3>
                <button type="button" onClick={() => setIsAwardModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleGiveAward} className="p-5 space-y-3">
                <select required value={awardForm.recipientEmail} onChange={(e) => setAwardForm({ ...awardForm, recipientEmail: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.email} value={emp.email}>{emp.name} ({emp.company})</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={5} max={1000} value={awardForm.points} onChange={(e) => setAwardForm({ ...awardForm, points: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" placeholder="Points" />
                  <select value={awardForm.badge} onChange={(e) => setAwardForm({ ...awardForm, badge: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold">
                    <option value="Top Performer">Top Performer</option>
                    <option value="STL Sales Leader">STL Sales Leader</option>
                    <option value="Zero-Error Remittance">Zero-Error Remittance</option>
                    <option value="Attendance Star">Attendance Star</option>
                    <option value="Team Champion">Team Champion</option>
                  </select>
                </div>
                <textarea rows={3} value={awardForm.reason} onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })} placeholder="Reason for recognition..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAwardModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-amber-400 text-xs font-extrabold cursor-pointer">Award Points</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const res = await createPoll({ ...pollForm, createdBy: currentUser });
    if (res.success) {
      setPolls(res.polls);
      setIsPollModalOpen(false);
      setPollForm({ question: "", description: "", category: "Pulse Survey", closesAt: "", options: ["", ""] });
      showToast("📊 Live Poll published!");
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black mb-1">
            <BarChart2 size={11} className="text-purple-600" />
            <span>POLLS & PULSE SURVEYS</span>
          </span>
          <h1 className="text-base font-black text-slate-900">Polls & Survey</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Participate in real-time company polls, operational pulse checks, and team feedback surveys.
          </p>
        </div>
        {canHandleEngagement && (
          <button
            type="button"
            onClick={() => setIsPollModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer shrink-0"
          >
            <Plus size={14} className="text-purple-400" />
            <span>Create Poll</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {polls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center space-y-2">
            <BarChart2 size={28} className="mx-auto text-purple-300" />
            <h3 className="text-xs font-extrabold text-slate-800">No Active Polls or Surveys</h3>
            <p className="text-[11px] text-slate-500">
              {canHandleEngagement ? "Click + Create Poll to launch a live company-wide survey." : "Check back later for upcoming company polls."}
            </p>
          </div>
        ) : (
          polls.map((poll) => {
            const totalVotes = (poll.options || []).reduce((sum, o) => sum + (o.votes?.length || 0), 0);
            const myChoice = (poll.options || []).find((o) => (o.votes || []).includes(myEmail));
            return (
              <div key={poll.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black">
                        {poll.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${poll.status === "Closed" ? "bg-slate-200 text-slate-600" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                        {poll.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">{poll.question}</h3>
                    {poll.description && <p className="text-xs text-slate-500 mt-0.5">{poll.description}</p>}
                  </div>
                  {canHandleEngagement && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await togglePollStatus(poll.id);
                          if (res.success) setPolls(res.polls);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                      >
                        {poll.status === "Closed" ? "Reopen" : "Close Poll"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Delete this poll?")) return;
                          const res = await deletePoll(poll.id);
                          if (res.success) setPolls(res.polls);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(poll.options || []).map((opt) => {
                    const count = opt.votes?.length || 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isMyPick = myChoice?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={poll.status === "Closed"}
                        onClick={async () => {
                          const res = await voteOnPoll(poll.id, opt.id, myEmail);
                          if (res.success) {
                            setPolls(res.polls);
                            showToast("✅ Vote recorded!");
                          }
                        }}
                        className={`w-full relative overflow-hidden rounded-xl border p-2.5 text-left transition ${
                          isMyPick
                            ? "border-purple-500 bg-purple-50/40 ring-1 ring-purple-300"
                            : "border-slate-200 bg-white hover:border-purple-300"
                        } ${poll.status === "Closed" ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-purple-100/70 transition-all duration-300 pointer-events-none"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            {isMyPick && <CheckCircle2 size={13} className="text-purple-600 shrink-0" />}
                            <span>{opt.label}</span>
                          </span>
                          <span className="font-mono text-[11px] text-purple-900">
                            {pct}% ({count})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/70">
              <h3 className="text-sm font-black text-slate-900">Create New Poll / Survey</h3>
              <button type="button" onClick={() => setIsPollModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePoll} className="p-5 space-y-3">
              <input required value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} placeholder="Poll Question *" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold" />
              <input value={pollForm.description} onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })} placeholder="Optional context or instructions" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Voting Options *</label>
                {pollForm.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <input
                      required
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollForm.options];
                        next[idx] = e.target.value;
                        setPollForm({ ...pollForm, options: next });
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                    {pollForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollForm({ ...pollForm, options: pollForm.options.filter((_, i) => i !== idx) })}
                        className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {pollForm.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ""] })}
                    className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    + Add Another Option
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsPollModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-purple-300 text-xs font-extrabold cursor-pointer">Publish Poll</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
