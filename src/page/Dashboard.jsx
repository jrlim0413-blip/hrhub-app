import { useState, useEffect, useRef } from "react";
import {
  Bell, MessageSquare, Search, Users, ShieldCheck,
  ThumbsUp, MessageCircle, Share2, Send,
  Megaphone, Award, Calendar, LogOut,
  BriefcaseBusiness, FileText, Sparkles, BarChart3,
  Database, RefreshCw, CheckCircle2, AlertCircle, Clock,
  Bot, Layers, Home, X, CheckCheck, Menu
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
import MondayStyleSidebar from "../components/MondayStyleSidebar";
import HomeWorkspaceView from "../components/HomeWorkspaceView";
import TeamChatMessengerModal from "../components/TeamChatMessengerModal";
import { mergeProfilesWithStored, deleteStoredEmployee } from "../lib/employeeStorage";
import {
  getChatThreadKey,
  getStoredChatMap,
  fetchConversationMessages,
  fetchAllUserThreads,
  sendChatMessage,
  reactChatMessage,
  deleteChatMessage,
  getStoredReadReceipts,
  markThreadAsRead,
  formatMessengerTime
} from "../lib/chatService";

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

// Helpers for Clean Team Member Directory & Chat
function formatShortCompany(companyName) {
  if (!companyName) return "Simpal Group";
  const c = companyName.toLowerCase();
  if (c.includes("simcon") || c.includes("construction")) return "SIMCON";
  if (c.includes("lucky") || c.includes("betplay") || c.includes("lbc")) return "Lucky Betplay";
  if (c.includes("5a") || c.includes("royal")) return "5A Royal Gaming";
  if (c.includes("imperial")) return "Imperial Gaming";
  if (c.includes("glowing") || c.includes("fortune")) return "Glowing Fortune";
  if (c.includes("simpal")) return "Simpal Group";
  return companyName;
}

function getProfileDisplayName(prof) {
  if (!prof) return "Team Member";
  if (prof.name && prof.name.trim()) return prof.name.trim();
  if (prof.email) {
    return prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return "Team Member";
}

function getProfileInitials(prof) {
  const name = getProfileDisplayName(prof);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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
  const [presenceMap, setPresenceMap] = useState({});
  const [typingUsersMap, setTypingUsersMap] = useState({});
  const [isUserIdle, setIsUserIdle] = useState(false);
  const channelRef = useRef(null);
  const isUserIdleRef = useRef(false);
  const idleTimerRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  const [newPostContent, setNewPostContent] = useState("");
  const [memoTitle, setMemoTitle] = useState("");
  const [memoCategory, setMemoCategory] = useState("Official Memo");
  const [isPosting, setIsPosting] = useState(false);
  const [memoNotice, setMemoNotice] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    try {
      return localStorage.getItem("hrhub_active_view") || "communication";
    } catch {
      return "communication";
    }
  });
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("sky");
  const [accountModal, setAccountModal] = useState(null);
  const [profileName, setProfileName] = useState(() => {
    const raw = currentUser?.name;
    if (!raw || raw === "Admin" || raw === "Super Administrator" || raw.toLowerCase() === "hrmd" || raw.toLowerCase() === "h r m d") {
      return "H R M D";
    }
    return raw;
  });
  const [profileRole, setProfileRole] = useState(() => {
    const raw = currentUser?.role;
    if (!raw || raw === "Super Administrator") return "HR Administrator";
    return raw;
  });
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || "admin@hrhub.com");
  const [profileCompany, setProfileCompany] = useState(currentUser?.company || "Simpal Group of Companies");
  const [profilePhone, setProfilePhone] = useState("+63 917 555 0148");
  const [profileLocation, setProfileLocation] = useState("Makati City, Philippines");
  const [profileDepartment, setProfileDepartment] = useState("People Operations");
  const [profileBio, setProfileBio] = useState("Supporting people, culture, and better work across the Simpal Group.");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) {
        const isDefaultHrmd =
          currentUser.name === "Admin" ||
          currentUser.name === "Super Administrator" ||
          currentUser.name.toLowerCase() === "hrmd" ||
          currentUser.name.toLowerCase() === "h r m d";
        setProfileName(isDefaultHrmd ? "H R M D" : currentUser.name);
      }
      if (currentUser.role) {
        setProfileRole(currentUser.role === "Super Administrator" ? "HR Administrator" : currentUser.role);
      }
      if (currentUser.email) setProfileEmail(currentUser.email);
      if (currentUser.company) setProfileCompany(currentUser.company);
    }
  }, [currentUser]);

  const userInitials = profileName
    ? (profileName.replace(/\s+/g, "").toLowerCase() === "hrmd"
        ? "HR"
        : profileName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase())
    : (profileEmail ? profileEmail.slice(0, 2).toUpperCase() : "HR");
  const displayRole = profileRole || currentUser?.role || "Team Member";
  const displayCompany = profileCompany || currentUser?.company || "Simpal Group of Companies";
  const [workspaceTab, setWorkspaceTab] = useState(() => {
    try {
      return localStorage.getItem("hrhub_workspace_tab") || "home";
    } catch {
      return "home";
    }
  }); // Default to 'home' so HR Home Dashboard displays first

  useEffect(() => {
    try {
      localStorage.setItem("hrhub_active_view", activeView);
    } catch (e) {
      console.error(e);
    }
  }, [activeView]);

  useEffect(() => {
    try {
      localStorage.setItem("hrhub_workspace_tab", workspaceTab);
    } catch (e) {
      console.error(e);
    }
  }, [workspaceTab]);
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false);
  const [grossReportOpen, setGrossReportOpen] = useState(false);
  const [memoGeneratorOpen, setMemoGeneratorOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiGeneratedMemoDraft, setAiGeneratedMemoDraft] = useState(null);
  const [communicationTab, setCommunicationTab] = useState("bulletin"); // 'bulletin' | 'directory'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Direct Team Chat State
  const [activeDirectChatUser, setActiveDirectChatUser] = useState(null);
  const activeDirectChatUserRef = useRef(null);
  useEffect(() => {
    activeDirectChatUserRef.current = activeDirectChatUser;
  }, [activeDirectChatUser]);

  const [directChatInput, setDirectChatInput] = useState("");
  const [directMessagesMap, setDirectMessagesMap] = useState(() => getStoredChatMap());
  const [readReceipts, setReadReceipts] = useState(() => getStoredReadReceipts());
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  const getChatKey = (userEmail) => {
    const cur = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase();
    const target = (userEmail || "").toLowerCase();
    return getChatThreadKey(cur, target);
  };

  const handleOpenDirectChat = async (prof) => {
    if (!prof) return;
    setActiveDirectChatUser(prof);
    setMessagesOpen(false);

    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase();
    const recipientEmail = (prof.email || "").toLowerCase();
    const threadKey = getChatThreadKey(myEmail, recipientEmail);

    // Mark thread as read
    const updatedReceipts = markThreadAsRead(myEmail, recipientEmail);
    if (updatedReceipts) setReadReceipts(updatedReceipts);

    // Fetch conversation from Supabase database (with local cache fallback)
    const msgs = await fetchConversationMessages(myEmail, recipientEmail);
    setDirectMessagesMap((prev) => ({
      ...prev,
      [threadKey]: msgs
    }));
  };

  // Periodic background synchronization for open chat modal (live zero-miss fallback)
  useEffect(() => {
    if (!activeDirectChatUser) return;
    const myEmail = (currentUser?.email || profileEmail || "").trim().toLowerCase();
    const recipientEmail = (activeDirectChatUser.email || "").trim().toLowerCase();
    if (!myEmail || !recipientEmail) return;

    const threadKey = getChatThreadKey(myEmail, recipientEmail);

    const syncActiveThread = async () => {
      try {
        const msgs = await fetchConversationMessages(myEmail, recipientEmail);
        if (msgs && Array.isArray(msgs)) {
          setDirectMessagesMap((prev) => {
            const currentMsgs = prev[threadKey] || [];
            if (
              currentMsgs.length !== msgs.length ||
              JSON.stringify(currentMsgs.map((m) => m.id)) !== JSON.stringify(msgs.map((m) => m.id))
            ) {
              return {
                ...prev,
                [threadKey]: msgs
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn("Active thread live sync notice:", err);
      }
    };

    const intervalId = setInterval(syncActiveThread, 2000);
    return () => clearInterval(intervalId);
  }, [activeDirectChatUser?.email, currentUser?.email, profileEmail]);

  const handleSendDirectMessage = async ({ text, image, replyTo }) => {
    if ((!text && !image) || !activeDirectChatUser) return;
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase().trim();
    const myName = profileName || currentUser?.name || "Team Member";
    const recipientEmail = (activeDirectChatUser.email || "").toLowerCase().trim();
    const threadKey = getChatThreadKey(myEmail, recipientEmail);

    const newMsg = await sendChatMessage({
      senderEmail: myEmail,
      senderName: myName,
      receiverEmail: recipientEmail,
      text,
      image,
      replyTo
    });

    setDirectMessagesMap((prev) => ({
      ...prev,
      [threadKey]: [...(prev[threadKey] || []).filter((m) => m.id !== newMsg.id), newMsg]
    }));

    // Broadcast instant real-time message event to receiver
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "direct_chat_message",
        payload: {
          action: "new",
          message: newMsg,
          threadKey,
          senderEmail: myEmail,
          receiverEmail: recipientEmail
        }
      }).catch((err) => console.warn("Broadcast direct message error:", err));
    }
  };

  const handleReactDirectMessage = async (messageId, emoji) => {
    if (!activeDirectChatUser || !messageId || !emoji) return;
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase().trim();
    const recipientEmail = (activeDirectChatUser.email || "").toLowerCase().trim();
    const threadKey = getChatThreadKey(myEmail, recipientEmail);

    const updatedThread = await reactChatMessage({
      messageId,
      emoji,
      userEmail: myEmail,
      threadKey,
      currentMessages: directMessagesMap[threadKey] || []
    });

    setDirectMessagesMap((prev) => ({
      ...prev,
      [threadKey]: updatedThread
    }));

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "direct_chat_message",
        payload: {
          action: "react",
          messageId,
          emoji,
          userEmail: myEmail,
          threadKey,
          senderEmail: myEmail,
          receiverEmail: recipientEmail,
          updatedThread
        }
      }).catch((err) => console.warn("Broadcast reaction error:", err));
    }
  };

  const handleDeleteDirectMessage = async (messageId) => {
    if (!activeDirectChatUser || !messageId) return;
    const recipientEmail = (activeDirectChatUser.email || "").toLowerCase().trim();
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase().trim();
    const threadKey = getChatThreadKey(myEmail, recipientEmail);

    const updatedThread = await deleteChatMessage({
      messageId,
      threadKey,
      currentMessages: directMessagesMap[threadKey] || []
    });

    setDirectMessagesMap((prev) => ({
      ...prev,
      [threadKey]: updatedThread
    }));

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "direct_chat_message",
        payload: {
          action: "delete",
          messageId,
          threadKey,
          senderEmail: myEmail,
          receiverEmail: recipientEmail,
          updatedThread
        }
      }).catch((err) => console.warn("Broadcast delete message error:", err));
    }
  };

  const handleUpdateProfile = (id, data) => {
    if (!id && data && !data.email) return;
    if (!id && data && data.email) {
      setSupabaseProfiles((prev) => [data, ...prev.filter(p => p.email?.toLowerCase() !== data.email?.toLowerCase())]);
    } else if (data) {
      setSupabaseProfiles((prev) =>
        prev.map((p) => {
          const matchId = id && String(p.id) === String(id);
          const matchEmail = data.email && p.email?.toLowerCase() === data.email.toLowerCase();
          return matchId || matchEmail ? { ...p, ...data } : p;
        })
      );
    }
  };

  const handleDeleteProfile = async (id, email) => {
    // 1. Remove from local storage
    if (email) deleteStoredEmployee(email);
    if (id) deleteStoredEmployee(id);

    // 2. Remove from Supabase
    try {
      if (id && !String(id).startsWith("prof-") && !String(id).startsWith("db-") && !String(id).startsWith("emp-")) {
        await supabase.from("profiles").delete().eq("id", id);
      } else if (email) {
        await supabase.from("profiles").delete().ilike("email", email);
      }
    } catch (err) {
      console.warn("Delete from Supabase notice:", err);
    }

    // 3. Update state immediately
    setSupabaseProfiles((prev) =>
      prev.filter((p) => {
        const matchId = id && String(p.id) === String(id);
        const matchEmail = email && (p.email || "").toLowerCase() === (email || "").toLowerCase();
        return !matchId && !matchEmail;
      })
    );
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

  // User AFK / Idle Detection (2 minutes of inactivity or tab hidden)
  useEffect(() => {
    const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

    const setIdle = (idle) => {
      if (isUserIdleRef.current !== idle) {
        isUserIdleRef.current = idle;
        setIsUserIdle(idle);

        const myEmail = (currentUser?.email || profileEmail || "").trim().toLowerCase();
        if (channelRef.current && myEmail && !myEmail.startsWith("guest-")) {
          channelRef.current.track({
            email: myEmail,
            name: profileName || currentUser?.name || "Team Member",
            status: idle ? "away" : "active",
            online_at: new Date().toISOString()
          }).catch(() => {});
        }
      }
    };

    const resetIdleTimer = () => {
      if (document.visibilityState === "hidden") {
        setIdle(true);
        return;
      }
      setIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIdle(true);
      }, IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIdle(true);
      } else {
        resetIdleTimer();
      }
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.email, profileEmail, profileName]);

  useEffect(() => {
    fetchMemos();
    fetchProfiles();

    const currentEmail = (currentUser?.email || profileEmail || "").trim().toLowerCase();
    if (currentEmail) {
      fetchAllUserThreads(currentEmail).then((threads) => {
        if (threads) setDirectMessagesMap(threads);
      });
    }

    const presenceKey = currentEmail || `guest-${Math.random().toString(36).slice(2, 8)}`;

    // Realtime channel with Presence and Typing indicator broadcast
    const channel = supabase.channel("hrhub-realtime-presence", {
      config: {
        presence: {
          key: presenceKey
        }
      }
    });

    channelRef.current = channel;

    const parsePresenceState = () => {
      const state = channel.presenceState();
      const newMap = {};
      Object.keys(state).forEach((key) => {
        const presences = state[key] || [];
        presences.forEach((p) => {
          const email = (p?.email || key || "").toLowerCase().trim();
          if (email && !email.startsWith("guest-")) {
            newMap[email] = {
              status: p?.status === "away" ? "away" : "active",
              name: p?.name,
              online_at: p?.online_at
            };
          }
        });
      });
      setPresenceMap(newMap);
    };

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "memos" }, () => {
        fetchMemos();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, async () => {
        const cEmail = (currentUser?.email || profileEmail || "").toLowerCase();
        if (cEmail) {
          const freshThreads = await fetchAllUserThreads(cEmail);
          if (freshThreads) setDirectMessagesMap(freshThreads);
        }
      })
      .on("presence", { event: "sync" }, parsePresenceState)
      .on("presence", { event: "join" }, parsePresenceState)
      .on("presence", { event: "leave" }, parsePresenceState)
      .on("broadcast", { event: "direct_chat_message" }, (eventData) => {
        const payload = eventData?.payload;
        if (!payload) return;
        const myEmail = (currentUser?.email || profileEmail || "").toLowerCase().trim();
        const { action, message, threadKey, senderEmail, receiverEmail, updatedThread } = payload;

        const isMeSender = senderEmail && senderEmail.toLowerCase().trim() === myEmail;
        const isMeReceiver = receiverEmail && receiverEmail.toLowerCase().trim() === myEmail;

        if (isMeReceiver || isMeSender) {
          if (action === "new" && message) {
            const formattedMsg = {
              ...message,
              isIncoming: message.senderEmail?.toLowerCase().trim() !== myEmail
            };

            setDirectMessagesMap((prev) => {
              const currentList = prev[threadKey] || [];
              if (currentList.some((m) => m.id === formattedMsg.id)) {
                return prev;
              }
              const nextList = [...currentList, formattedMsg];
              const localMap = getStoredChatMap();
              localMap[threadKey] = nextList;
              saveStoredChatMap(localMap);

              return {
                ...prev,
                [threadKey]: nextList
              };
            });

            // If active chat window with this sender is open, mark read immediately
            if (
              activeDirectChatUserRef.current &&
              senderEmail &&
              activeDirectChatUserRef.current.email?.toLowerCase().trim() === senderEmail.toLowerCase().trim()
            ) {
              const updatedReceipts = markThreadAsRead(myEmail, senderEmail);
              if (updatedReceipts) setReadReceipts(updatedReceipts);
            }
          } else if ((action === "react" || action === "delete") && updatedThread) {
            setDirectMessagesMap((prev) => {
              const nextMap = { ...prev, [threadKey]: updatedThread };
              const localMap = getStoredChatMap();
              localMap[threadKey] = updatedThread;
              saveStoredChatMap(localMap);
              return nextMap;
            });
          }
        }
      })
      .on("broadcast", { event: "user_typing" }, ({ payload }) => {
        if (!payload) return;
        const { senderEmail, receiverEmail, isTyping } = payload;
        const myEmail = (currentUser?.email || profileEmail || "").toLowerCase().trim();
        if (receiverEmail && receiverEmail.toLowerCase().trim() === myEmail && senderEmail) {
          const senderKey = senderEmail.toLowerCase().trim();
          setTypingUsersMap((prev) => {
            const next = { ...prev };
            if (isTyping) {
              next[senderKey] = true;
            } else {
              delete next[senderKey];
            }
            return next;
          });

          // Clear typing indicator automatically after 3.5s if no follow-up received
          if (typingTimeoutsRef.current[senderKey]) {
            clearTimeout(typingTimeoutsRef.current[senderKey]);
          }
          if (isTyping) {
            typingTimeoutsRef.current[senderKey] = setTimeout(() => {
              setTypingUsersMap((prev) => {
                const next = { ...prev };
                delete next[senderKey];
                return next;
              });
            }, 3500);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentEmail && !currentEmail.startsWith("guest-")) {
          try {
            await channel.track({
              email: currentEmail,
              name: profileName || currentUser?.name || "Team Member",
              status: isUserIdleRef.current ? "away" : "active",
              online_at: new Date().toISOString()
            });
          } catch (trackErr) {
            console.warn("Presence tracking error:", trackErr);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
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

  // Helper to determine exact presence status: 'active' | 'away' | 'offline'
  // HRMD is NOT hardcoded; reflects 100% real live session presence
  const getUserPresenceStatus = (email) => {
    if (!email) return "offline";
    const clean = email.toLowerCase().trim();
    if (currentEmail && clean === currentEmail) {
      return isUserIdle ? "away" : "active";
    }
    const presence = presenceMap[clean];
    if (!presence) return "offline";
    return presence.status === "away" ? "away" : "active";
  };

  const isUserOnline = (email) => {
    return getUserPresenceStatus(email) !== "offline";
  };

  const getStatusBadgeDot = (status) => {
    if (status === "active") return "bg-[#00c875]";
    if (status === "away") return "bg-amber-400";
    return "bg-slate-400";
  };

  const getStatusTextLabel = (status) => {
    if (status === "active") return "Active now";
    if (status === "away") return "Away (AFK)";
    return "Offline";
  };

  const handleSendTypingSignal = (recipientEmail, isTyping) => {
    if (!channelRef.current || !recipientEmail) return;
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase().trim();
    channelRef.current.send({
      type: "broadcast",
      event: "user_typing",
      payload: {
        senderEmail: myEmail,
        receiverEmail: recipientEmail.toLowerCase().trim(),
        isTyping: Boolean(isTyping)
      }
    }).catch((err) => console.warn("Typing broadcast notice:", err));
  };

  // Filter out the logged-in user so the widget only displays their colleagues / team members
  const colleaguesProfiles = supabaseProfiles.filter((p) => {
    const pEmail = (p.email || "").trim().toLowerCase();
    return currentEmail ? pEmail !== currentEmail : true;
  });

  const sortedProfiles = [...colleaguesProfiles].sort((a, b) => {
    const aEmail = a.email?.toLowerCase() || "";
    const bEmail = b.email?.toLowerCase() || "";
    if (aEmail === "admin@hrhub.com") return -1;
    if (bEmail === "admin@hrhub.com") return 1;

    const aOnline = isUserOnline(aEmail);
    const bOnline = isUserOnline(bEmail);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return aEmail.localeCompare(bEmail);
  });

  const activeOnlineCount = sortedProfiles.filter((p) => isUserOnline(p.email)).length;

  const getThreadLastMessage = (targetEmail) => {
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase();
    const threadKey = getChatThreadKey(myEmail, targetEmail);
    const msgs = directMessagesMap[threadKey] || [];
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const isThreadUnread = (targetEmail) => {
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase();
    const threadKey = getChatThreadKey(myEmail, targetEmail);
    const msgs = directMessagesMap[threadKey] || [];
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.senderEmail === myEmail || !lastMsg.isIncoming) return false;
    const lastRead = readReceipts[threadKey] || 0;
    return (lastMsg.timestamp || 0) > lastRead;
  };

  const totalUnreadChatCount = sortedProfiles.filter((prof) => isThreadUnread(prof.email)).length;

  const handleMarkAllChatsRead = () => {
    const myEmail = (currentUser?.email || profileEmail || "admin@hrhub.com").toLowerCase();
    const receipts = { ...readReceipts };
    sortedProfiles.forEach((prof) => {
      const key = getChatThreadKey(myEmail, prof.email);
      receipts[key] = Date.now();
    });
    try {
      localStorage.setItem("hrhub_chat_read_receipts_v1", JSON.stringify(receipts));
    } catch {}
    setReadReceipts(receipts);
  };

  const dropdownProfiles = [...sortedProfiles]
    .filter((prof) => {
      if (!chatSearchQuery.trim()) return true;
      const q = chatSearchQuery.toLowerCase();
      const name = getProfileDisplayName(prof).toLowerCase();
      const email = (prof.email || "").toLowerCase();
      const last = getThreadLastMessage(prof.email);
      const lastText = (last?.text || "").toLowerCase();
      return name.includes(q) || email.includes(q) || lastText.includes(q);
    })
    .sort((a, b) => {
      const aUnread = isThreadUnread(a.email);
      const bUnread = isThreadUnread(b.email);
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      const aLast = getThreadLastMessage(a.email);
      const bLast = getThreadLastMessage(b.email);
      const aTime = aLast?.timestamp || 0;
      const bTime = bLast?.timestamp || 0;
      if (aTime !== bTime) return bTime - aTime;

      const aOnline = isUserOnline(a.email);
      const bOnline = isUserOnline(b.email);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      return (a.email || "").localeCompare(b.email || "");
    });

  const renderColleaguesDirectoryWidget = () => (
    <div className="bg-[#f2f5f7] border border-slate-200/80 rounded-3xl p-4 shadow-xs space-y-3 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Registered Team Members ({sortedProfiles.length})
          </h3>
          <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
            <Users size={10} /> {activeOnlineCount} Online Now
          </p>
        </div>
        <button
          type="button"
          onClick={fetchProfiles}
          title="Refresh Team Directory"
          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
        >
          <RefreshCw size={13} className={loadingProfiles ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      <div className="space-y-1.5">
        {sortedProfiles.length > 0 ? (
          sortedProfiles.map((prof) => {
            const pEmail = prof.email?.toLowerCase() || "";
            const presenceStatus = getUserPresenceStatus(pEmail);
            const isOnline = presenceStatus !== "offline";
            const isTyping = Boolean(typingUsersMap[pEmail]);
            const initials = getProfileInitials(prof);
            const displayName = getProfileDisplayName(prof);
            const shortCompany = formatShortCompany(prof.company);
            const isChatActive = activeDirectChatUser?.email?.toLowerCase() === pEmail;

            return (
              <div
                key={prof.id || prof.email}
                onClick={() => handleOpenDirectChat(prof)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition cursor-pointer group ${
                  isChatActive
                    ? "bg-white shadow-sm border border-slate-200/90 ring-2 ring-emerald-500/20"
                    : "hover:bg-white/90 border border-transparent hover:border-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Round Dark Avatar with 2-letter uppercase initials and online/away/offline status dot */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#101e2e] text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wider shadow-2xs">
                      {initials}
                    </div>
                    {/* Status Dot */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${getStatusBadgeDot(presenceStatus)}`}
                      title={`${displayName} is ${getStatusTextLabel(presenceStatus)}`}
                    />
                  </div>

                  {/* Name and Company / Typing */}
                  <div className="min-w-0 text-left">
                    <p className="text-[13px] font-bold text-slate-900 truncate leading-tight group-hover:text-emerald-700 transition-colors">
                      {displayName}
                    </p>
                    {isTyping ? (
                      <p className="text-[11px] text-emerald-600 font-bold truncate mt-0.5 animate-pulse flex items-center gap-1">
                        <span>typing...</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                        {shortCompany}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Chat Message Outline Icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDirectChat(prof);
                  }}
                  className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-xl hover:bg-slate-100/80 transition cursor-pointer shrink-0"
                  title={`Chat with ${displayName}`}
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-slate-200/60">
            No other team members registered yet.
          </div>
        )}
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
  );

  return (
    <div className={`min-h-screen ${pageTheme} text-slate-800 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300`}>
      <header className="bg-[#0d1b2a] text-white sticky top-0 z-40 shadow-md border-b border-slate-800 px-3 sm:px-4 py-2">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[720px] min-w-0">
            {/* Mobile Sidebar Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl md:hidden transition cursor-pointer shrink-0"
              title="Toggle Navigation Menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-xs">H</div>
              <span className="text-xl font-extrabold text-white tracking-tight hidden sm:inline">HR<span className="text-emerald-400">Hub</span></span>
            </div>

            <div className="relative w-full min-w-[100px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees, memos..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-[#1f2d3d] border border-slate-700 rounded-full text-[11px] text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* DIRECT MESSAGES DROPDOWN (Messenger Style) */}
            <div className="relative">
              <button
                onClick={() => {
                  setMessagesOpen(!messagesOpen);
                  setNotificationsOpen(false);
                  setViewSwitcherOpen(false);
                }}
                className="p-2 bg-[#1b2b3d] hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-full transition relative cursor-pointer"
                title="Chats & Direct Messages"
              >
                <MessageSquare size={17} />
                {totalUnreadChatCount > 0 ? (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[17px] h-[17px] bg-rose-500 text-white font-black text-[9.5px] rounded-full flex items-center justify-center ring-2 ring-[#0d1b2a] shadow-sm animate-pulse">
                    {totalUnreadChatCount}
                  </span>
                ) : (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0d1b2a]"></span>
                )}
              </button>

              {messagesOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-92 max-w-[360px] bg-white border border-slate-200/90 rounded-3xl shadow-2xl p-4 text-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[500px]">
                  {/* Dropdown Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">Chats</h4>
                      {totalUnreadChatCount > 0 ? (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                          {totalUnreadChatCount} unread
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          All caught up
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {totalUnreadChatCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllChatsRead}
                          className="text-[10.5px] text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer transition flex items-center gap-1 hover:underline"
                        >
                          <CheckCheck size={13} />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        {activeOnlineCount} Online
                      </span>
                    </div>
                  </div>

                  {/* Messenger Search Input */}
                  <div className="relative my-2.5">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Search messages or team members..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    />
                  </div>

                  {/* Conversation List */}
                  <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-0.5">
                    {dropdownProfiles.length > 0 ? (
                      dropdownProfiles.map((prof) => {
                        const pEmail = prof.email?.toLowerCase() || "";
                        const presenceStatus = getUserPresenceStatus(pEmail);
                        const isOnline = presenceStatus !== "offline";
                        const isTyping = Boolean(typingUsersMap[pEmail]);
                        const displayName = getProfileDisplayName(prof);
                        const initials = getProfileInitials(prof);
                        const shortCompany = formatShortCompany(prof.company);
                        const lastMsg = getThreadLastMessage(prof.email);
                        const isUnread = isThreadUnread(prof.email);

                        const isSentByMe = lastMsg && (lastMsg.senderEmail === (currentUser?.email || profileEmail || "").toLowerCase() || !lastMsg.isIncoming);

                        let previewSnippet = "Click to start conversation...";
                        if (isTyping) {
                          previewSnippet = "typing...";
                        } else if (lastMsg) {
                          if (lastMsg.text) {
                            previewSnippet = isSentByMe ? `You: ${lastMsg.text}` : lastMsg.text;
                          } else if (lastMsg.image) {
                            previewSnippet = isSentByMe ? "You sent a photo 📷" : "Sent a photo 📷";
                          }
                        }

                        const timeSnippet = lastMsg ? formatMessengerTime(lastMsg.timestamp) : "";

                        return (
                          <div
                            key={prof.id || prof.email}
                            onClick={() => handleOpenDirectChat(prof)}
                            className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition group ${
                              isUnread
                                ? "bg-emerald-50/70 hover:bg-emerald-100/60 border border-emerald-200/60 shadow-2xs"
                                : "hover:bg-slate-100/80 border border-transparent"
                            }`}
                          >
                            {/* Avatar with Status */}
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-[#101e2e] text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <span
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${getStatusBadgeDot(presenceStatus)}`}
                                title={`${displayName} is ${getStatusTextLabel(presenceStatus)}`}
                              />
                            </div>

                            {/* Message Details */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex justify-between items-baseline gap-1">
                                <p className={`text-xs truncate ${isUnread ? "font-black text-slate-950" : "font-bold text-slate-800"}`}>
                                  {displayName}
                                </p>
                                {timeSnippet && (
                                  <span className={`text-[10px] shrink-0 ${isUnread ? "font-bold text-emerald-700" : "text-slate-400"}`}>
                                    {timeSnippet}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                {isTyping ? (
                                  <p className="text-[11px] font-bold text-emerald-600 animate-pulse flex items-center gap-1 truncate">
                                    <span>typing...</span>
                                    <span className="flex gap-0.5">
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                                    </span>
                                  </p>
                                ) : (
                                  <p
                                    className={`text-[11px] truncate max-w-[170px] sm:max-w-[210px] ${
                                      isUnread
                                        ? "font-bold text-slate-900"
                                        : lastMsg
                                        ? "text-slate-600 font-normal"
                                        : "text-slate-400 font-normal italic"
                                    }`}
                                  >
                                    {previewSnippet}
                                  </p>
                                )}
                                {isUnread && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#00c875] ring-2 ring-emerald-200 shrink-0 animate-pulse" title="Unread message" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No conversations match your search.
                      </div>
                    )}
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
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-slate-900 z-50 animate-fade-in">
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
                  if (view === "sop") {
                    setWorkspaceTab(tab || "home");
                    setIsSidebarCollapsed(true);
                  } else if (view === "communication") {
                    if (tab) setCommunicationTab(tab);
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
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{profileName}</h3>
                  <p className="text-[11px] text-slate-600 font-medium truncate">{displayRole}</p>
                  <p className="text-[10px] text-slate-400 truncate">{displayCompany}</p>
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
                onlineEmails={new Set(Object.keys(presenceMap).filter(e => presenceMap[e]?.status !== "offline"))}
                currentEmail={currentEmail}
                loading={loadingProfiles}
                onRefresh={fetchProfiles}
                onUpdateProfile={handleUpdateProfile}
                onDeleteProfile={handleDeleteProfile}
              />
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{profileName}</span>
                    <span className="text-[10px] text-slate-400 block">{displayRole} · {displayCompany}</span>
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
        <div className="flex items-start min-h-[calc(100vh-53px)]">
          <MondayStyleSidebar
            workspaceTab={workspaceTab}
            setWorkspaceTab={setWorkspaceTab}
            onOpenAiBuddy={() => setAiDrawerOpen(true)}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
          <div className="flex-1 min-w-0 p-4 md:p-6 transition-all duration-300 overflow-x-hidden">
          {/* WORKSPACE CENTRAL OPERATIONS HUB */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Operations & Executive Hub</p>
              <h2 className="mt-0.5 text-2xl font-extrabold text-slate-900">Workspace</h2>
            </div>

            {/* WORKSPACE INTEGRATED TABS */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-full shrink-0">
              <button
                type="button"
                onClick={() => setWorkspaceTab("home")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
                  workspaceTab === "home"
                    ? "bg-[#008559] text-white ring-2 ring-emerald-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Home size={14} className={workspaceTab === "home" ? "text-white" : "text-emerald-600"} />
                <span>Home Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab("sops")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
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
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
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
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
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
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
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

          {/* TAB 0: HOME HR DASHBOARD & MEETING SCHEDULER */}
          {workspaceTab === "home" && (
            <HomeWorkspaceView
              currentUser={currentUser}
              profileName={profileName}
              onOpenAiBuddy={() => setAiDrawerOpen(true)}
              setWorkspaceTab={setWorkspaceTab}
              profiles={supabaseProfiles}
            />
          )}

          {/* TAB 1: OFFICIAL MEMO GENERATOR */}
          {workspaceTab === "memo" && (
            <MemoGeneratorPanel
              onClose={() => setWorkspaceTab("sops")}
              profiles={supabaseProfiles}
              currentUser={currentUser}
              initialDraft={aiGeneratedMemoDraft}
              onOpenAiBuddy={() => setAiDrawerOpen(true)}
              onNavigateToDirectory={() => {
                setActiveView("communication");
                setCommunicationTab("directory");
              }}
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
      </div>
    )}

      {/* ================= ANIMATED AI ASSISTANT FLOATING ON THE SIDE ================= */}
      <AiAssistantGirlWidget
        isChatOpen={aiDrawerOpen}
        onOpenChat={() => setAiDrawerOpen(true)}
        hidden={activeView === "sop" && (workspaceTab === "home" || workspaceTab === "memo")}
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

      {/* ================= ADVANCED MESSENGER TEAM CHAT MODAL ================= */}
      {activeDirectChatUser && (
        <TeamChatMessengerModal
          activeUser={activeDirectChatUser}
          currentUser={currentUser}
          presenceStatus={getUserPresenceStatus(activeDirectChatUser.email)}
          isRecipientTyping={Boolean(typingUsersMap[activeDirectChatUser.email?.toLowerCase().trim()])}
          onTypingSignal={handleSendTypingSignal}
          messages={directMessagesMap[getChatKey(activeDirectChatUser.email)] || []}
          onClose={() => setActiveDirectChatUser(null)}
          onSendMessage={handleSendDirectMessage}
          onReactMessage={handleReactDirectMessage}
          onDeleteMessage={handleDeleteDirectMessage}
        />
      )}
    </div>
  );
}