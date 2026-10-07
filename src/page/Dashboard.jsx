import { useState, useEffect } from "react";
import {
  Bell, MessageSquare, Search, Users, ShieldCheck,
  ThumbsUp, MessageCircle, Share2, Send,
  Megaphone, Award, Calendar, LogOut,
  BriefcaseBusiness, FileText, Sparkles, BarChart3,
  Database, RefreshCw, CheckCircle2, AlertCircle, Clock,
  Bot, Layers
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ProfileModal from "../components/ProfileModal";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher";
import AgentsPanel from "../components/AgentsPanel";
import GrossReportPanel from "../components/GrossReportPanel";
import EmployeeDirectoryPanel from "../components/EmployeeDirectoryPanel";
import WeatherWidget from "../components/WeatherWidget";
import MemoGeneratorPanel from "../components/MemoGeneratorPanel";
import AiAssistantDrawer from "../components/AiAssistantDrawer";
import AiAgentAvatar from "../components/AiAgentAvatar";
import AiAssistantGirlWidget from "../components/AiAssistantGirlWidget";
import { mergeProfilesWithStored } from "../lib/employeeStorage";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getCategoryBadgeColor(category) {
  switch (category?.toLowerCase()) {
    case "official memo":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-300";
    case "happy events":
    case "event":
      return "bg-amber-500/10 text-amber-700 border-amber-300";
    case "recognition":
    case "award":
      return "bg-purple-500/10 text-purple-700 border-purple-300";
    case "policy":
    case "compliance":
      return "bg-blue-500/10 text-blue-700 border-blue-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

// Mock Data para sa Online Users (fallback)
const ONLINE_USERS = [
  { id: 1, name: "Quennie Lim", role: "HR Manager", company: "Simpal Group", avatar: "QL", status: "online" },
  { id: 2, name: "Genievie Esterliah", role: "Software Engineer", company: "SIMCON", avatar: "GE", status: "online" },
  { id: 3, name: "Mark Anthony", role: "Site Supervisor", company: "SIMCON", avatar: "MA", status: "idle" },
  { id: 4, name: "Sarah Jane", role: "Compliance Officer", company: "Lucky Betplay", avatar: "SJ", status: "online" },
  { id: 5, name: "Dave Wilson", role: "HR Specialist", company: "5A Royal Gaming", avatar: "DW", status: "offline" }
];

const INITIAL_POSTS = [
  {
    id: "sample-1",
    author: "HR Admin",
    company: "Simpal Group of Companies",
    time: "2 hours ago",
    badge: "Official Memo",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    title: "Updated Health & Safety Policy Guidelines for Q3",
    content: "Please be advised that the updated site safety handbook for SIMCON operations is now live. All field managers are requested to review and cascade the updates to their respective teams before the end of the week.",
    likes: 12,
    comments: 4,
    pinned: true,
    isSample: true
  },
  {
    id: "sample-2",
    author: "System Bot",
    company: "HRHub Automated System",
    time: "5 hours ago",
    badge: "Welcome New Hire",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-200",
    title: "Welcome to the Team! 🎉",
    content: "Let's welcome Maria Santos as the new Compliance Officer for Lucky Betplay Corporation! Feel free to send her a message and give her a warm welcome.",
    likes: 24,
    comments: 8,
    pinned: false,
    isSample: true
  }
];

const SOP_COLUMNS = [
  {
    id: "Backlog",
    title: "Backlog",
    count: 6,
    accent: "bg-slate-100 text-slate-700 border-slate-200",
    tasks: [
      { title: "Update onboarding checklist", subtitle: "People Ops • 2 days", priority: "High" },
      { title: "Finalize SOP for monthly payroll review", subtitle: "Finance • Today", priority: "Medium" },
      { title: "Review contractor compliance tracker", subtitle: "Admin • 3 days", priority: "Low" }
    ]
  },
  {
    id: "InProgress",
    title: "In Progress",
    count: 4,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    tasks: [
      { title: "Document leave approval flow", subtitle: "HR Process • 1 day", priority: "High" },
      { title: "QA for SOP training packet", subtitle: "Compliance • 2 days", priority: "Medium" },
      { title: "Prepare branch audit checklist", subtitle: "Operations • Today", priority: "High" }
    ]
  },
  {
    id: "Review",
    title: "Review",
    count: 3,
    accent: "bg-amber-50 text-amber-700 border-amber-200",
    tasks: [
      { title: "Validate emergency response policy", subtitle: "Safety • Today", priority: "High" },
      { title: "Check policy acknowledgment status", subtitle: "Compliance • 2 days", priority: "Medium" }
    ]
  },
  {
    id: "Done",
    title: "Done",
    count: 9,
    accent: "bg-sky-50 text-sky-700 border-sky-200",
    tasks: [
      { title: "Employee handbook final approval", subtitle: "HR • Completed", priority: "Done" },
      { title: "Branch training attendance log", subtitle: "Operations • Completed", priority: "Done" }
    ]
  }
];

const VIEW_OPTIONS = [
  { id: "communication", label: "Communication", icon: Megaphone },
  { id: "sop", label: "Workspace", icon: BriefcaseBusiness }
];

const THEME_OPTIONS = [
  { id: "sky", label: "Sky", color: "bg-sky-200", page: "bg-sky-50" },
  { id: "rose", label: "Rose", color: "bg-rose-200", page: "bg-rose-50" },
  { id: "blush", label: "Blush", color: "bg-pink-200", page: "bg-pink-50" }
];

export default function Dashboard({ onLogout, currentUser, onNavigate }) {
  const [posts, setPosts] = useState(() => {
    try {
      const stored = localStorage.getItem("hrhub_local_bulletin_posts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [supabaseMemos, setSupabaseMemos] = useState([]);
  const [loadingMemos, setLoadingMemos] = useState(true);
  const [supabaseProfiles, setSupabaseProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [onlineUserEmails, setOnlineUserEmails] = useState(new Set());
  const [newPostContent, setNewPostContent] = useState("");
  const [memoTitle, setMemoTitle] = useState("");
  const [memoCategory, setMemoCategory] = useState("Official Memo");
  const [isPosting, setIsPosting] = useState(false);
  const [memoNotice, setMemoNotice] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [activeView, setActiveView] = useState("communication");
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("sky");
  const [accountModal, setAccountModal] = useState(null);
  const [profileName, setProfileName] = useState(currentUser?.name || "HR Administrator");
  const [profileRole, setProfileRole] = useState(currentUser?.role || "HR Administrator");
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || "hr.admin@hrhub.com");
  const [profilePhone, setProfilePhone] = useState("+63 917 555 0148");
  const [profileLocation, setProfileLocation] = useState("Makati City, Philippines");
  const [profileDepartment, setProfileDepartment] = useState("People Operations");
  const [profileBio, setProfileBio] = useState("Supporting people, culture, and better work across the Simpal Group.");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("sops"); // Default to 'sops' so classic workspace process boards display first
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false);
  const [grossReportOpen, setGrossReportOpen] = useState(false);
  const [memoGeneratorOpen, setMemoGeneratorOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiGeneratedMemoDraft, setAiGeneratedMemoDraft] = useState(null);
  const [communicationTab, setCommunicationTab] = useState("bulletin"); // 'bulletin' | 'directory'

  const handleUpdateProfile = (id, data) => {
    if (!id && data) {
      setSupabaseProfiles((prev) => [data, ...prev.filter(p => p.email?.toLowerCase() !== data.email?.toLowerCase())]);
    } else if (id && data) {
      setSupabaseProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
    }
  };

  const isCommunicationView = activeView === "communication";
  const pageTheme = THEME_OPTIONS.find((theme) => theme.id === activeTheme)?.page || "bg-sky-50";

  // Fetch memos from database
  const fetchMemos = async () => {
    try {
      setLoadingMemos(true);
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Memos query:", error.message);
      } else if (data) {
        setSupabaseMemos(data);
      }
    } catch (err) {
      console.error("fetchMemos error:", err);
    } finally {
      setLoadingMemos(false);
    }
  };

  // Fetch profiles from database
  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Profiles query notice:", error.message);
      }
      const unified = mergeProfilesWithStored(data || []);
      setSupabaseProfiles(unified);
    } catch (err) {
      console.error("fetchProfiles error:", err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetchMemos();
    fetchProfiles();

    const currentEmail = (currentUser?.email || profileEmail || "").trim().toLowerCase();
    const presenceKey = currentEmail || `guest-${Math.random().toString(36).slice(2, 8)}`;

    // Realtime channel with Presence tracking for reliable online status
    const channel = supabase.channel("hrhub-realtime-presence", {
      config: {
        presence: {
          key: presenceKey
        }
      }
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const activeEmails = new Set();
      Object.keys(state).forEach((key) => {
        if (key && !key.startsWith("guest-")) {
          activeEmails.add(key.toLowerCase());
        }
        const presences = state[key] || [];
        presences.forEach((p) => {
          if (p?.email) activeEmails.add(p.email.toLowerCase());
        });
      });
      if (currentEmail && !currentEmail.startsWith("guest-")) {
        activeEmails.add(currentEmail);
      }
      setOnlineUserEmails(activeEmails);
    };

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "memos" }, () => {
        fetchMemos();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles();
      })
      .on("presence", { event: "sync" }, updatePresenceState)
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        setOnlineUserEmails((prev) => {
          const next = new Set(prev);
          if (key && !key.startsWith("guest-")) next.add(key.toLowerCase());
          (newPresences || []).forEach((p) => {
            if (p?.email) next.add(p.email.toLowerCase());
          });
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        setOnlineUserEmails((prev) => {
          const next = new Set(prev);
          if (key && key.toLowerCase() !== currentEmail) {
            next.delete(key.toLowerCase());
          }
          (leftPresences || []).forEach((p) => {
            if (p?.email && p.email.toLowerCase() !== currentEmail) {
              next.delete(p.email.toLowerCase());
            }
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({
              email: currentEmail,
              name: profileName || currentUser?.name || "Team Member",
              online_at: new Date().toISOString()
            });
          } catch (trackErr) {
            console.warn("Presence tracking error:", trackErr);
          }
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMemos();
        fetchProfiles();
        if (channel) {
          channel.track({
            email: currentEmail,
            name: profileName || currentUser?.name || "Team Member",
            online_at: new Date().toISOString()
          }).catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.email, profileEmail, profileName]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const title = memoTitle.trim() || "Company Announcement";
    const authorName = profileName || currentUser?.name || "HR Admin";
    const category = memoCategory || "Official Memo";
    const content = newPostContent.trim();

    setIsPosting(true);
    setMemoNotice(null);

    try {
      const { data, error } = await supabase.from("memos").insert([
        {
          title,
          content,
          category,
          author_name: authorName
        }
      ]).select();

      if (error) {
        console.warn("Memo insert notice:", error);
        // Fallback to local post so user isn't blocked
        const localPost = {
          id: `local-${Date.now()}`,
          author: authorName,
          company: "Simpal Group of Companies",
          time: "Just now",
          badge: category,
          badgeColor: getCategoryBadgeColor(category),
          title,
          content,
          likes: 0,
          comments: 0,
          pinned: false,
          isLocal: true
        };
        setPosts((prev) => {
          const updated = [localPost, ...prev];
          try {
            localStorage.setItem("hrhub_local_bulletin_posts", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setMemoNotice({
          type: "success",
          message: "Memo successfully posted to Bulletin Board!"
        });
        setNewPostContent("");
        setMemoTitle("");
      } else {
        setMemoNotice({
          type: "success",
          message: "Memo successfully posted to company bulletin!"
        });
        setNewPostContent("");
        setMemoTitle("");
        fetchMemos();
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setMemoNotice({
        type: "error",
        message: "Failed to post memo: " + err.message
      });
    } finally {
      setIsPosting(false);
      setTimeout(() => setMemoNotice(null), 5000);
    }
  };

  // Combine database memos with local posts and fallback sample memos
  const displayMemos = [
    ...supabaseMemos.map((m) => ({
      id: m.id,
      author: m.author_name || "HR Admin",
      company: "Simpal Group of Companies",
      time: formatTimeAgo(m.created_at),
      badge: m.category || "Official Memo",
      badgeColor: getCategoryBadgeColor(m.category),
      title: m.title || "Official Memo",
      content: m.content || "",
      imageUrl: m.image_url,
      likes: 0,
      comments: 0,
      pinned: false,
      isOfficial: true
    })),
    ...posts,
    ...(supabaseMemos.length === 0 && posts.length === 0 ? INITIAL_POSTS : [])
  ];

  const currentEmail = (currentUser?.email || profileEmail || "").trim().toLowerCase();

  const sortedProfiles = [...supabaseProfiles].sort((a, b) => {
    const aEmail = a.email?.toLowerCase() || "";
    const bEmail = b.email?.toLowerCase() || "";
    const aOnline = (currentEmail && aEmail === currentEmail) || onlineUserEmails.has(aEmail);
    const bOnline = (currentEmail && bEmail === currentEmail) || onlineUserEmails.has(bEmail);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return aEmail.localeCompare(bEmail);
  });

  const activeOnlineCount = sortedProfiles.filter((p) => {
    const pEmail = p.email?.toLowerCase() || "";
    return (currentEmail && pEmail === currentEmail) || onlineUserEmails.has(pEmail);
  }).length;

  const renderColleaguesDirectoryWidget = () => (
    <div className="bg-[#f2f5f7] border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Colleagues &amp; Directory
          </h3>
          <p className="text-[9px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
            <Users size={9} /> {activeOnlineCount} Active Now
          </p>
        </div>
        <button
          type="button"
          onClick={fetchProfiles}
          title="Refresh Team Directory"
          className="p-1 text-slate-400 hover:text-emerald-600 transition"
        >
          <RefreshCw size={12} className={loadingProfiles ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      <div className="space-y-2">
        {sortedProfiles.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Registered Team Members ({sortedProfiles.length})
              </p>
              <span className="text-[8px] font-semibold text-emerald-600">
                {activeOnlineCount} online
              </span>
            </div>
            {sortedProfiles.map((prof) => {
              const pEmail = prof.email?.toLowerCase() || "";
              const isCurrentUser = Boolean(currentEmail && pEmail === currentEmail);
              const isOnline = isCurrentUser || onlineUserEmails.has(pEmail);
              const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
              const displayName = prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "User";

              return (
                <div
                  key={prof.id}
                  className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer shadow-xs border ${
                    isOnline
                      ? "bg-white border-emerald-200/90 hover:border-emerald-300 ring-1 ring-emerald-500/10"
                      : "bg-white/80 border-slate-200/70 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        isOnline ? "bg-slate-900 text-emerald-400" : "bg-slate-700 text-slate-300"
                      }`}>
                        {initials}
                      </div>
                      {isOnline ? (
                        <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white"></span>
                        </span>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-slate-300"></span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        {displayName}
                        {isCurrentUser && (
                          <span className="text-[8px] font-black text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded border border-emerald-200">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{prof.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Offline
                      </span>
                    )}
                    {prof.is_approved ? (
                      <span className="text-[8px] font-bold text-emerald-600/90 flex items-center gap-0.5">
                        <ShieldCheck size={9} /> Approved
                      </span>
                    ) : (
                      <span className="text-[8px] font-medium text-amber-600 flex items-center gap-0.5">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">
            Branch Team Directory
          </p>
          {ONLINE_USERS.slice(0, 3).map((user) => (
            <div key={user.id} className="flex items-center justify-between hover:bg-white p-1.5 rounded-xl transition cursor-pointer">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {user.avatar}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#f2f5f7] ${user.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.company}</p>
                </div>
              </div>

              <button className="text-slate-400 hover:text-emerald-600 p-1 transition">
                <MessageSquare size={13} />
              </button>
            </div>
          ))}
        </div>

        {communicationTab !== "directory" ? (
          <button
            type="button"
            onClick={() => setCommunicationTab("directory")}
            className="w-full mt-2 py-2 px-3 text-center text-xs font-bold text-emerald-800 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Users size={14} className="text-emerald-600" />
            <span>Open Full Employee Directory &rarr;</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCommunicationTab("bulletin")}
            className="w-full mt-2 py-2 px-3 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Megaphone size={14} className="text-emerald-600" />
            <span>&larr; Back to Company Bulletin</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${pageTheme} text-slate-800 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300`}>
      <header className="bg-[#0d1b2a] text-white sticky top-0 z-40 shadow-md border-b border-slate-800 px-4 py-2">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-[720px]">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg">H</div>
              <span className="text-xl font-extrabold text-white tracking-tight hidden sm:inline">HR<span className="text-emerald-400">Hub</span></span>
            </div>

            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees, memos, or departments..."
                className="w-full pl-9 pr-4 py-2 bg-[#1f2d3d] border border-slate-700 rounded-full text-[11px] text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* DIRECT MESSAGES DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => {
                  setMessagesOpen(!messagesOpen);
                  setNotificationsOpen(false);
                  setViewSwitcherOpen(false);
                }}
                className="p-2 bg-[#1b2b3d] hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-full transition relative cursor-pointer"
                title="Direct Messages"
              >
                <MessageSquare size={17} />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0d1b2a]"></span>
              </button>

              {messagesOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-slate-900 z-50 animate-fade-in">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-sm">Direct Messages</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">3 New</span>
                  </div>
                  <div className="space-y-3">
                    {ONLINE_USERS.slice(0, 3).map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {user.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                            <span className="text-[10px] text-slate-400">10m</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">Sir, updated na po ang attendance record...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setMessagesOpen(false);
                  setViewSwitcherOpen(false);
                }}
                className="p-2 bg-[#1b2b3d] hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-full transition relative cursor-pointer"
                title="Notifications"
              >
                <Bell size={17} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-[#0d1b2a]"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-slate-900 z-50 animate-fade-in">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-sm">Notifications</h4>
                    <span className="text-[10px] text-slate-500 cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs space-y-1">
                      <p className="font-semibold text-slate-800">Leave Request Approved</p>
                      <p className="text-[11px] text-slate-600">Your leave for Friday has been approved by HR.</p>
                      <span className="text-[10px] text-slate-400 block">30 mins ago</span>
                    </div>
                    <div className="p-2.5 hover:bg-slate-50 rounded-xl text-xs space-y-1 transition">
                      <p className="font-semibold text-slate-800">New Memo Published</p>
                      <p className="text-[11px] text-slate-600">Simpal Group updated the Q3 Safety Policy.</p>
                      <span className="text-[10px] text-slate-400 block">2 hours ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WORKSPACE SWITCHER DROPDOWN */}
            <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-800">
              <WorkspaceSwitcher
                isOpen={viewSwitcherOpen}
                onToggle={() => {
                  setViewSwitcherOpen(!viewSwitcherOpen);
                  setMessagesOpen(false);
                  setNotificationsOpen(false);
                }}
                onClose={() => setViewSwitcherOpen(false)}
                activeView={activeView}
                workspaceTab={workspaceTab}
                onSelectWorkspace={({ view, tab }) => {
                  setActiveView(view);
                  if (tab) {
                    if (view === "sop") setWorkspaceTab(tab);
                    else if (view === "communication") setCommunicationTab(tab);
                  }
                  setViewSwitcherOpen(false);
                }}
                activeTheme={activeTheme}
                setActiveTheme={setActiveTheme}
                themeOptions={THEME_OPTIONS}
                onOpenProfile={() => { setAccountModal("profile"); setViewSwitcherOpen(false); setProfileSaved(false); }}
                onOpenPassword={() => { setAccountModal("password"); setViewSwitcherOpen(false); setPasswordSaved(false); }}
              />

              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {accountModal && (
        <ProfileModal
          mode={accountModal}
          onClose={() => setAccountModal(null)}
          profileName={profileName}
          setProfileName={setProfileName}
          profileRole={profileRole}
          setProfileRole={setProfileRole}
          profileEmail={profileEmail}
          setProfileEmail={setProfileEmail}
          profilePhone={profilePhone}
          setProfilePhone={setProfilePhone}
          profileLocation={profileLocation}
          setProfileLocation={setProfileLocation}
          profileDepartment={profileDepartment}
          setProfileDepartment={setProfileDepartment}
          profileBio={profileBio}
          setProfileBio={setProfileBio}
          profileSaved={profileSaved}
          setProfileSaved={setProfileSaved}
          passwordSaved={passwordSaved}
          setPasswordSaved={setPasswordSaved}
        />
      )}

      {isCommunicationView ? (
        <div className="max-w-[1280px] mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <aside className="hidden md:block md:col-span-3 space-y-4 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar pr-1">
            <div className="bg-[#f2f5f7] border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-bold flex items-center justify-center text-sm">
                  HR
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">HR Administrator</h3>
                  <p className="text-[11px] text-slate-500">Simpal Group Executive</p>
                </div>
              </div>

              <nav className="space-y-1 text-xs font-semibold text-slate-600">
                {[
                  { id: "bulletin", icon: Megaphone, label: "Company Bulletin" },
                  { id: "directory", icon: Users, label: "Employee Directory", badge: supabaseProfiles.filter(p => !p.is_approved).length },
                  { id: "attendance", icon: Calendar, label: "Shift & Attendance" },
                  { id: "policies", icon: ShieldCheck, label: "Policies & Handbooks" }
                ].map(({ id, icon: Icon, label, badge }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (id === "bulletin" || id === "directory") {
                        setCommunicationTab(id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer ${
                      communicationTab === id
                        ? "bg-white text-emerald-700 font-bold shadow-sm border border-slate-200"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={communicationTab === id ? "text-emerald-600" : "text-slate-500"} />
                      <span>{label}</span>
                    </div>
                    {badge > 0 && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full animate-pulse">
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-[#101d2d] text-white rounded-2xl p-4 shadow-md space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Quick Info</span>
              <p className="text-slate-300 font-medium">Consolidated multi-entity payroll schedule set for <strong className="text-white">August 15, 2026</strong>.</p>
            </div>

            {communicationTab === "directory" && renderColleaguesDirectoryWidget()}
          </aside>

          <main className={`${communicationTab === "directory" ? "md:col-span-9" : "md:col-span-6"} space-y-6`}>
            {communicationTab === "directory" ? (
              <EmployeeDirectoryPanel
                profiles={supabaseProfiles}
                onlineEmails={onlineUserEmails}
                currentEmail={currentEmail}
                loading={loadingProfiles}
                onRefresh={fetchProfiles}
                onUpdateProfile={handleUpdateProfile}
              />
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {profileName ? profileName.slice(0, 2).toUpperCase() : "HR"}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{profileName}</span>
                    <span className="text-[10px] text-slate-400 block">{profileRole}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700">
                    <Sparkles size={10} className="text-emerald-600" /> Live Feed
                  </span>
                  <button
                    type="button"
                    onClick={fetchMemos}
                    title="Refresh Announcements"
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <RefreshCw size={12} className={loadingMemos ? "animate-spin text-emerald-600" : ""} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  placeholder="Memo Title (e.g. Q3 Health & Safety Guidelines)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
                />

                <textarea
                  rows={2}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Write the official memo or announcement content..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              {memoNotice && (
                <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                  memoNotice.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : memoNotice.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {memoNotice.type === "success" ? <CheckCircle2 size={13} className="shrink-0 text-emerald-600" /> : <AlertCircle size={13} className="shrink-0" />}
                  <span className="text-[11px] font-medium">{memoNotice.message}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-bold mr-1">Category:</span>
                  {[
                    { label: "Official Memo", icon: Megaphone },
                    { label: "Happy Events", icon: Sparkles },
                    { label: "Recognition", icon: Award }
                  ].map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setMemoCategory(label)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
                        memoCategory === label
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={isPosting || !newPostContent.trim()}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-400 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Send size={12} /> {isPosting ? "Publishing..." : "Publish Memo"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loadingMemos && displayMemos.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
                  <RefreshCw size={20} className="animate-spin text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Loading company announcements...</p>
                </div>
              ) : (
                displayMemos.map((post) => (
                  <article key={post.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative transition hover:border-slate-300">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {post.author ? post.author.slice(0, 2).toUpperCase() : "HR"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-xs">{post.author}</h4>
                            {post.isOfficial && (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[8px] font-black text-emerald-700 uppercase tracking-wider">
                                <CheckCircle2 size={8} className="text-emerald-600" /> Official Memo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">{post.company} • {post.time}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${post.badgeColor}`}>
                        {post.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <h3 className="font-extrabold text-slate-900 text-sm">{post.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      {post.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-60">
                          <img src={post.imageUrl} alt="Memo attachment" className="w-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <button className="flex items-center gap-1.5 hover:text-emerald-600 transition cursor-pointer">
                        <ThumbsUp size={14} /> <span>{post.likes} Acknowledgments</span>
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-emerald-600 transition cursor-pointer">
                        <MessageCircle size={14} /> <span>{post.comments} Comments</span>
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-emerald-600 transition cursor-pointer">
                        <Share2 size={14} /> <span>Share</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
              </>
            )}
          </main>

          {communicationTab === "bulletin" && (
            <aside className="hidden md:block md:col-span-3 space-y-4 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar pr-1">
              {renderColleaguesDirectoryWidget()}
            </aside>
          )}
        </div>
      ) : (
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          {/* WORKSPACE CENTRAL OPERATIONS HUB */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Operations & Executive Hub</p>
              <h2 className="mt-0.5 text-2xl font-extrabold text-slate-900">Workspace</h2>
            </div>

            {/* WORKSPACE INTEGRATED TABS */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWorkspaceTab("sops")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                  workspaceTab === "sops"
                    ? "bg-slate-900 text-white ring-2 ring-emerald-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Layers size={14} className={workspaceTab === "sops" ? "text-emerald-400" : "text-slate-600"} />
                <span>Operations Board</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab("memo")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                  workspaceTab === "memo"
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <FileText size={14} className={workspaceTab === "memo" ? "text-white" : "text-emerald-600"} />
                <span>Memo Generator</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab("gross")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                  workspaceTab === "gross"
                    ? "bg-slate-900 text-emerald-400 ring-2 ring-emerald-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <BarChart3 size={14} className={workspaceTab === "gross" ? "text-emerald-400" : "text-slate-600"} />
                <span>Gross Report</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab("agents")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                  workspaceTab === "agents"
                    ? "bg-slate-900 text-white ring-2 ring-slate-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Users size={14} />
                <span>Agents</span>
              </button>
            </div>
          </div>

          {/* TAB 1: OFFICIAL MEMO GENERATOR */}
          {workspaceTab === "memo" && (
            <MemoGeneratorPanel
              onClose={() => setWorkspaceTab("sops")}
              profiles={supabaseProfiles}
              currentUser={currentUser}
              initialDraft={aiGeneratedMemoDraft}
              onOpenAiBuddy={() => setAiDrawerOpen(true)}
            />
          )}

          {/* TAB 2: AGENTS DIRECTORY */}
          {workspaceTab === "agents" && (
            <AgentsPanel onClose={() => setWorkspaceTab("sops")} />
          )}

          {/* TAB 3: GROSS REPORT */}
          {workspaceTab === "gross" && <GrossReportPanel />}

          {/* TAB 4: OPERATIONS BOARD (WEATHER & SOPS) */}
          {workspaceTab === "sops" && (
            <>
              <WeatherWidget />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {SOP_COLUMNS.map((column) => (
                  <div key={column.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    <div className={`mb-3 flex items-center justify-between rounded-xl border px-2.5 py-2 text-[11px] font-bold ${column.accent}`}>
                      <span>{column.title}</span>
                      <span className="rounded-full bg-white/60 px-1.5 py-0.5">{column.count}</span>
                    </div>

                    <div className="space-y-3">
                      {column.tasks.map((task, index) => (
                        <div key={`${column.id}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              task.priority === "High"
                                ? "bg-rose-100 text-rose-700"
                                : task.priority === "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : task.priority === "Low"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-500">{task.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= ANIMATED AI ASSISTANT GIRL FLOATING ON THE SIDE ================= */}
      <AiAssistantGirlWidget
        isChatOpen={aiDrawerOpen}
        onOpenChat={() => setAiDrawerOpen(true)}
      />

      {/* Floating AI Assistant Drawer/Modal */}
      <AiAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        currentUser={currentUser}
        isEmbedded={false}
        onInsertMemoIntoGenerator={(memoData) => {
          setActiveView("sop");
          setWorkspaceTab("memo");
          setAiGeneratedMemoDraft(memoData);
          setAiDrawerOpen(false);
        }}
      />
    </div>
  );
}