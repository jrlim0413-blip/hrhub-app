import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Bot, Send, X, Copy, Check, FileText, Settings,
  RotateCcw, Trash2, ArrowUp, ChevronDown, CheckCircle2,
  ExternalLink, Zap, HelpCircle, ShieldCheck, User, Plus,
  Search, Gift, Mic, Paperclip, AtSign, Calendar, Wand2,
  MoreHorizontal, ChevronLeft, ChevronRight, Scale, Building2,
  DollarSign, BarChart3, Lightbulb, BookOpen, MessageSquare,
  QrCode, Volume2, VolumeX
} from "lucide-react";
import { sendAiChatMessage, extractMemoFromText } from "../lib/aiAssistantService";
import AiAgentAvatar from "./AiAgentAvatar";
import { getFemaleVoice } from "./AiAssistantGirlWidget";

// Helper: Formatted Markdown Renderer to replicate clean Google Gemini UI
function FormattedAiMessage({ content }) {
  if (!content) return null;

  const renderInline = (str) => {
    if (!str) return "";

    // Clean up math syntax like $$\text{...}$$ or \frac{...}{...} into readable format
    let cleaned = str
      .replace(/\$\$\\text\{([^}]+)\}\$\$/g, "$1")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\times/g, "×")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 ÷ $2)");

    const parts = [];
    // Match bold **text** or inline `code`
    const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cleaned.substring(lastIndex, match.index));
      }
      if (match[2]) {
        // bold
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-slate-900">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // code
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 border border-blue-200"
          >
            {match[3]}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleaned.length) {
      parts.push(cleaned.substring(lastIndex));
    }

    return parts.length > 0 ? parts : cleaned;
  };

  const lines = content.split("\n");
  const renderedElements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`ul-${key}`} className="my-2 space-y-1.5 pl-4 list-disc text-slate-700">
          {currentList.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList(index);
      renderedElements.push(
        <h3 key={`h3-${index}`} className="text-sm font-extrabold text-slate-900 mt-3 mb-1 tracking-tight flex items-center gap-1.5">
          {renderInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
    } else if (trimmed.startsWith("#### ")) {
      flushList(index);
      renderedElements.push(
        <h4 key={`h4-${index}`} className="text-xs font-bold text-slate-800 mt-2 mb-1 tracking-tight uppercase text-blue-700">
          {renderInline(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(index);
      renderedElements.push(
        <h2 key={`h2-${index}`} className="text-base font-extrabold text-slate-900 mt-4 mb-2 tracking-tight">
          {renderInline(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
    } else if (trimmed === "---" || trimmed === "***") {
      flushList(index);
      renderedElements.push(<hr key={`hr-${index}`} className="my-3 border-slate-200" />);
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      currentList.push(trimmed.replace(/^[*•-]\s+/, ""));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushList(index);
      const numMatch = trimmed.match(/^\d+\./)[0];
      const textAfter = trimmed.replace(/^\d+\.\s+/, "");
      renderedElements.push(
        <div key={`num-${index}`} className="my-1.5 flex items-start gap-2.5 text-slate-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
            {numMatch.replace(".", "")}
          </span>
          <div className="flex-1 leading-relaxed">{renderInline(textAfter)}</div>
        </div>
      );
    } else if (trimmed.startsWith("> ")) {
      flushList(index);
      renderedElements.push(
        <blockquote key={`bq-${index}`} className="my-2 border-l-4 border-blue-500 bg-blue-50/60 pl-3 py-1.5 rounded-r-lg text-xs italic text-blue-900">
          {renderInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
    } else if (trimmed.length === 0) {
      flushList(index);
      renderedElements.push(<div key={`sp-${index}`} className="h-2" />);
    } else {
      flushList(index);
      renderedElements.push(
        <p key={`p-${index}`} className="my-1 leading-relaxed text-slate-700">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  flushList("end");
  return <div className="space-y-1 text-xs sm:text-sm">{renderedElements}</div>;
}

// Capability round buttons (matching Monday.com Sidekick circular icons row)
const CAPABILITIES = [
  {
    id: "memo",
    label: "Create a memo",
    icon: FileText,
    iconColor: "text-sky-600",
    bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-200",
    prompt: "Draft an official company memorandum for the upcoming Special Non-Working Holiday for the Simpal Group of Companies."
  },
  {
    id: "doc",
    label: "Write a doc",
    icon: BookOpen,
    iconColor: "text-teal-600",
    bgColor: "bg-teal-100 hover:bg-teal-200 border-teal-200",
    prompt: "Write a Standard Operating Procedure (SOP) for daily teller cash remittance and draw cutoff."
  },
  {
    id: "dole",
    label: "Research DOLE",
    icon: Scale,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-100 hover:bg-amber-200 border-amber-200",
    prompt: "Explain DOLE labor standards regarding Holiday Pay (Regular vs Special Non-Working Day) and overtime calculations."
  },
  {
    id: "stl",
    label: "Analyze data",
    icon: BarChart3,
    iconColor: "text-pink-600",
    bgColor: "bg-pink-100 hover:bg-pink-200 border-pink-200",
    prompt: "Explain how Gross sales and Hits are calculated in Lucky Betplay STL Mandaue operations, and supervisor audit responsibilities."
  },
  {
    id: "brainstorm",
    label: "Brainstorm ideas",
    icon: Lightbulb,
    iconColor: "text-sky-600",
    bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-200",
    prompt: "Provide 5 practical strategies to improve employee attendance and reduce biometrics tardiness across branch locations."
  },
  {
    id: "companies",
    label: "Simpal Group",
    icon: Building2,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-100 hover:bg-emerald-200 border-emerald-200",
    prompt: "List all subsidiary companies under Simpal Group of Companies (SGC, SIMCON, Lucky Betplay LBC, 5ARG, GFC, IMP) and their leadership."
  },
  {
    id: "pay",
    label: "Compute Pay",
    icon: DollarSign,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-100 hover:bg-rose-200 border-rose-200",
    prompt: "What is the standard DOLE formula for 13th month pay for an employee with a ₱18,000 monthly basic salary who worked for 7 months?"
  },
  {
    id: "learn",
    label: "Learn about",
    icon: Sparkles,
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-200",
    prompt: "What are the features and workflows of HRHub for HR management, memo generation, STL gross reporting, and email routing?"
  }
];

// Suggested starters cards
const SUGGESTED_STARTERS = [
  {
    id: "starter-memo",
    title: "Create an official company memo with letterhead, auto watermark, and direct email",
    tag: "Memo",
    tagColor: "bg-sky-100 text-sky-700 border-sky-200",
    icon: FileText,
    prompt: "Draft an official memorandum advisory for all employees regarding the upcoming holiday schedule and skeleton workforce rotation."
  },
  {
    id: "starter-dole",
    title: "Compute DOLE 13th month pay & holiday premiums for field staff",
    tag: "DOLE & Pay",
    tagColor: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Scale,
    prompt: "How do you calculate DOLE 13th month pay and holiday premium for employees working on a Special Non-Working Day? Provide the formula and an example."
  },
  {
    id: "starter-insights",
    title: "Get a snapshot of yesterday's STL Gross remittance, hits, and teller priorities",
    tag: "STL Insights",
    tagColor: "bg-pink-100 text-pink-700 border-pink-200",
    icon: BarChart3,
    prompt: "Explain the standard audit procedure for yesterday's gross remittance, hits payout, and teller verification for Lucky Betplay Mandaue."
  },
  {
    id: "starter-noe",
    title: "Draft a Notice of Explanation (NOE) for attendance and biometric compliance",
    tag: "Disciplinary",
    tagColor: "bg-rose-100 text-rose-700 border-rose-200",
    icon: Wand2,
    prompt: "Draft a formal Notice of Explanation (NOE) for an employee with repeated biometrics tardiness beyond the 15-minute grace period observing due process."
  }
];

export default function AiAssistantDrawer({
  isOpen = true,
  onClose,
  currentUser,
  onInsertMemoIntoGenerator,
  isEmbedded = false
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showQrCard, setShowQrCard] = useState(true);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);

  // Chat sessions list
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem("hrhub_ai_buddy_chats_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "chat-default",
        title: "Greeting and Assistance",
        updatedAt: Date.now(),
        messages: [
          {
            id: "msg-welcome",
            role: "assistant",
            content: `### 👋 Hello! I am your **HRHub Ai Buddy**.

I am ready to assist you across the operations of the **Simpal Group of Companies**:
* 📄 **Drafting Memos & Advisories** (Holiday schedules, shifts, policies)
* ⚖️ **DOLE & Labor Standards** (Holiday pay, 13th month, overtime, due process notices)
* 📊 **Lucky Betplay STL Operations** (Draw schedules, gross remittance, hits, supervisor audits)
* 📋 **Standard Operating Procedures (SOPs)** and corporate notices

What would you like to work on today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Female voice audio player for chat replies
  const handleSpeakMessage = (msgId, content) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (playingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingMsgId(msgId);

    const cleanText = content
      .replace(/###|##|#|\*\*|\*|`|\[.*?\]\(.*?\)/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
      .replace(/HRHub/g, "H R Hub")
      .replace(/AI/g, "A I")
      .trim();

    if (!cleanText) {
      setPlayingMsgId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getFemaleVoice();
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.25;
    utterance.rate = 1.05;

    utterance.onend = () => setPlayingMsgId(null);
    utterance.onerror = () => setPlayingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Stop speech when drawer closes or unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Persist chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hrhub_ai_buddy_chats_v2", JSON.stringify(chats));
    } catch {}
  }, [chats]);

  // Find active chat object
  const currentChat = chats.find((c) => c.id === activeChatId) || null;
  const activeMessages = currentChat ? currentChat.messages : [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeChatId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, isTyping, activeChatId]);

  // User display name (e.g. "Jay")
  const userFirstName = (() => {
    if (!currentUser?.name) return "Jay";
    const parts = currentUser.name.trim().split(" ");
    return parts[0] || "Jay";
  })();

  const handleStartNewChat = () => {
    setActiveChatId(null);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setInputPrompt("");
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const text = (customText || inputPrompt).trim();
    if (!text || isTyping) return;

    let targetChatId = activeChatId;

    // Create a new chat session if currently on hero screen
    if (!targetChatId) {
      const newId = `chat-${Date.now()}`;
      const newTitle = text.length > 36 ? text.substring(0, 36) + "..." : text;
      const newChat = {
        id: newId,
        title: newTitle,
        updatedAt: Date.now(),
        messages: []
      };
      setChats((prev) => [newChat, ...prev]);
      targetChatId = newId;
      setActiveChatId(newId);
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Update messages in state
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === targetChatId) {
          return {
            ...c,
            updatedAt: Date.now(),
            messages: [...c.messages, userMessage]
          };
        }
        return c;
      })
    );

    setInputPrompt("");
    setIsTyping(true);

    try {
      const existingMessages = currentChat ? currentChat.messages : [];
      const response = await sendAiChatMessage({
        messages: [...existingMessages, userMessage],
        userPrompt: text
      });

      const assistantMessage = {
        id: `buddy-${Date.now()}`,
        role: "assistant",
        content: response.content,
        source: response.source,
        model: "HRHub Ai Buddy",
        memoData: response.memoData,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === targetChatId) {
            return {
              ...c,
              updatedAt: Date.now(),
              messages: [...c.messages, assistantMessage]
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error("AI chat error:", err);
      const errorMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Paumanhin, nagkaroon ng pansamantalang aberya sa koneksyon. Pakisubukan muli.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === targetChatId) {
            return {
              ...c,
              messages: [...c.messages, errorMessage]
            };
          }
          return c;
        })
      );
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Close on Escape key when opened as modal
  useEffect(() => {
    if (!isOpen || isEmbedded) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isEmbedded, onClose]);

  if (!isEmbedded && !isOpen) return null;

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const mainWorkspaceContent = (
    <div
      className={`relative flex w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden ${
        isEmbedded
          ? "h-[760px] rounded-3xl border border-slate-200 shadow-xl"
          : "h-full"
      }`}
    >
      {/* ================= LEFT SIDEBAR (SIDEKICK STYLE) ================= */}
      <aside
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-10 shrink-0 ${
          sidebarCollapsed ? "w-16" : "w-64 sm:w-72"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-slate-100">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <AiAgentAvatar size="sm" showStatus={false} />
              <span className="font-bold text-slate-900 tracking-tight text-base">
                HRHub Ai Buddy
              </span>
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center">
              <AiAgentAvatar size="sm" showStatus={false} />
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleStartNewChat}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-semibold text-sm transition shadow-xs cursor-pointer ${
              activeChatId === null
                ? "bg-[#e5f1ff] text-[#0073ea] ring-1 ring-blue-300"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
            }`}
            title="Start a new chat"
          >
            <Plus size={18} className="text-[#0073ea]" />
            {!sidebarCollapsed && <span>New chat</span>}
          </button>
        </div>

        {/* Navigation Links */}
        {!sidebarCollapsed && (
          <div className="px-3 py-1 space-y-0.5">
            <button
              type="button"
              onClick={() => alert("Scheduled tasks: Daily 2:00 PM, 5:00 PM, at 9:00 PM STL draw reminders and shift notifications.")}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-slate-400" />
                <span>Scheduled</span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md border border-blue-200">
                New
              </span>
            </button>

            <button
              type="button"
              onClick={() => alert("Personalization: Simpal Group of Companies Corporate Profile, Letterhead watermark, at executive signatories are active.")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition text-left"
            >
              <Wand2 size={15} className="text-slate-400" />
              <span>Personalization</span>
            </button>

            <button
              type="button"
              onClick={() => alert("Active Skills:\n• Memo Generator Letterhead\n• DOLE Legal Rules & Computations\n• Lucky Betplay STL Analytics\n• Direct Email Routing")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition text-left"
            >
              <Zap size={15} className="text-slate-400" />
              <span>Skills</span>
            </button>

            <button
              type="button"
              onClick={() => alert("More options: HRHub Corporate Directory, Employee Biometrics, and STL Remittance Audit.")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition text-left"
            >
              <MoreHorizontal size={15} className="text-slate-400" />
              <span>More</span>
            </button>
          </div>
        )}

        {/* All Chats Section */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  All chats
                </span>
                <Search size={14} className="text-slate-400" />
              </div>

              {chats.length > 3 && (
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                  <Search size={12} className="absolute left-2 top-2 text-slate-400" />
                </div>
              )}

              <div className="space-y-1">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                      activeChatId === chat.id
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate pr-1">{chat.title}</span>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded transition"
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {filteredChats.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic px-2 py-1">
                    No saved chats found.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Card: Lead your AI team on the go */}
        {!sidebarCollapsed && showQrCard && (
          <div className="p-3 border-t border-slate-100">
            <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3.5 shadow-xs">
              <button
                onClick={() => setShowQrCard(false)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
                  <QrCode size={36} className="text-slate-800" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 leading-tight">
                    Lead your AI team on the go
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Chat with your agents, check updates, and get work done.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback footer */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <button
              onClick={() => alert("Salamat sa feedback! Ipadala ang inyong mga mungkahi sa imsoroglohr@gmail.com.")}
              className="hover:text-blue-600 transition flex items-center gap-1.5"
            >
              <MessageSquare size={13} />
              <span>Give us feedback</span>
            </button>
          </div>
        )}
      </aside>

      {/* ================= MAIN WORKSPACE CANVAS ================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {activeChatId && (
              <button
                onClick={handleStartNewChat}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 transition"
              >
                <Plus size={13} />
                <span>New chat</span>
              </button>
            )}
            {activeChatId && currentChat && (
              <span className="text-xs font-bold text-slate-500 truncate max-w-xs">
                {currentChat.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWhatsNewOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
            >
              <Gift size={15} className="text-amber-500" />
              <span>What's new</span>
            </button>

            {!isEmbedded && onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* ================= VIEW 1: HERO CANVAS (WHEN NO ACTIVE CHAT) ================= */}
        {!activeChatId ? (
          <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl flex flex-col items-center text-center my-auto">
              
              {/* Greeting Heading */}
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                Hi {userFirstName},
              </h1>
              <p className="text-lg sm:text-xl text-slate-500 font-normal mt-2 mb-8">
                What would you like to work on today?
              </p>

              {/* RAINBOW GLOWING CENTRAL INPUT BOX */}
              <div className="relative w-full max-w-3xl mb-10 group">
                <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 via-pink-500 via-amber-400 to-emerald-400 opacity-40 blur-md group-hover:opacity-75 group-focus-within:opacity-100 transition duration-300"></div>

                <div className="relative rounded-[24px] bg-white border border-slate-200/90 shadow-xl p-4 flex flex-col text-left">
                  <textarea
                    ref={textareaRef}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="@ Mention memos, employees, policies..."
                    rows={2}
                    className="w-full bg-transparent resize-none border-0 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-base sm:text-lg"
                  />

                  {/* Bottom toolbar inside input box */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setInputPrompt("Draft an official memorandum for: ")}
                        className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-1 rounded-md text-xs font-semibold transition cursor-pointer"
                        title="Draft an official memorandum in AI Buddy"
                      >
                        <FileText size={13} className="text-sky-600" />
                        <span className="hidden sm:inline">Draft Memo</span>
                      </button>
                      <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
                        <BarChart3 size={13} className="text-pink-600" />
                        <span className="hidden sm:inline">STL Gross</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert("You can paste or attach reference documents and text notes.")}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                        title="Attach files or notes"
                      >
                        <Paperclip size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setInputPrompt((prev) => prev + " @SimpalGroup ")}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                        title="Mention company or department"
                      >
                        <AtSign size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setInputPrompt("Use the Memo Generator skill to draft a company memo regarding: ")}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition"
                      >
                        <Zap size={13} />
                        <span className="hidden sm:inline">Use skills</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => alert("Voice dictation is ready. Speak clearly into your microphone.")}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition"
                        title="Voice input"
                      >
                        <Mic size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputPrompt.trim() || isTyping}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition shadow-md cursor-pointer ${
                          inputPrompt.trim() && !isTyping
                            ? "bg-slate-900 hover:bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        }`}
                        title="Send prompt"
                      >
                        <ArrowUp size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW OF 8 CAPABILITY CIRCULAR ICONS */}
              <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-12">
                {CAPABILITIES.map((cap) => {
                  const IconComp = cap.icon;
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => handleSendMessage(cap.prompt)}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div
                        className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full border transition-all duration-200 group-hover:scale-110 shadow-xs ${cap.bgColor}`}
                      >
                        <IconComp size={22} className={cap.iconColor} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition">
                        {cap.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SUGGESTED STARTERS SECTION */}
              <div className="w-full text-left">
                <h3 className="text-sm font-semibold text-slate-600 mb-4 tracking-normal text-center sm:text-left">
                  Suggested starters tailored for your work
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SUGGESTED_STARTERS.map((starter) => {
                    const IconComp = starter.icon;
                    return (
                      <div
                        key={starter.id}
                        onClick={() => handleSendMessage(starter.prompt)}
                        className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md transition cursor-pointer text-left"
                      >
                        <p className="text-xs font-medium text-slate-700 leading-relaxed mb-4 group-hover:text-slate-900 transition">
                          {starter.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${starter.tagColor}`}
                          >
                            <IconComp size={11} />
                            <span>{starter.tag}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        ) : (
          
          /* ================= VIEW 2: ACTIVE CONVERSATION THREAD ================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <AiAgentAvatar size="sm" showStatus={false} className="mt-0.5" />
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                        msg.role === "user"
                          ? "bg-[#0073ea] text-white rounded-tr-xs shadow-md"
                          : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              HRHub Ai Buddy
                            </span>
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              AI Assistant
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {msg.timestamp}
                          </span>
                        </div>
                      )}

                      {/* Message Content: Clean White Text for User, Rich Markdown for AI */}
                      {msg.role === "user" ? (
                        <div className="text-sm sm:text-[15px] font-normal text-white leading-relaxed whitespace-pre-wrap selection:bg-white/30 selection:text-white">
                          {msg.content}
                        </div>
                      ) : (
                        <FormattedAiMessage content={msg.content} />
                      )}

                      {/* If a memorandum is detected, show 1-click insert action */}
                      {msg.memoData && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              <span>Official Memorandum Draft Ready</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              Subj: <strong>{msg.memoData.subject}</strong> ({msg.memoData.companyCode})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const freshMemoData = extractMemoFromText(msg.content) || msg.memoData;
                              onInsertMemoIntoGenerator?.(freshMemoData);
                              if (onClose) onClose();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                          >
                            <FileText size={14} />
                            <span>Insert into Memo Generator</span>
                          </button>
                        </div>
                      )}

                      {/* Actions: Copy & Listen (Female Voice) */}
                      {msg.role === "assistant" && (
                        <div className="mt-3 flex items-center justify-end gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSpeakMessage(msg.id, msg.content)}
                            className="flex items-center gap-1 hover:text-cyan-600 transition cursor-pointer"
                            title="Pakinggan sa boses babae"
                          >
                            {playingMsgId === msg.id ? (
                              <>
                                <VolumeX size={13} className="text-cyan-600 animate-pulse" />
                                <span className="text-cyan-600 font-semibold">Tigilan</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={13} />
                                <span>Pakinggan (Boses Babae)</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="flex items-center gap-1 hover:text-slate-700 transition cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span className="text-emerald-600 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#0073ea] font-bold text-xs mt-0.5 border border-blue-200 shadow-2xs">
                        {userFirstName.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3.5 justify-start items-center">
                    <AiAgentAvatar size="sm" isThinking={true} showStatus={false} />
                    <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-xs flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>
                      <span>HRHub Ai Buddy is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* STICKY BOTTOM INPUT IN CHAT VIEW */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 via-pink-500 via-amber-400 to-emerald-400 opacity-30 blur-sm group-focus-within:opacity-80 transition duration-300"></div>

                  <div className="relative rounded-[22px] bg-white border border-slate-200 shadow-lg p-3 flex flex-col">
                    <textarea
                      ref={textareaRef}
                      value={inputPrompt}
                      onChange={(e) => setInputPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask questions, draft policies, or instruct HRHub Ai Buddy..."
                      rows={1}
                      className="w-full bg-transparent resize-none border-0 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-sm min-h-[38px]"
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setInputPrompt("Draft an official memorandum for: ")}
                          className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md hover:bg-sky-100 transition cursor-pointer flex items-center gap-1"
                        >
                          <FileText size={12} className="text-sky-600" />
                          <span>+ Draft Memo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputPrompt("How do I properly compute DOLE policy for: ")}
                          className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md hover:bg-amber-100 transition cursor-pointer"
                        >
                          + DOLE Rule
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputPrompt.trim() || isTyping}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition shadow-xs cursor-pointer ${
                          inputPrompt.trim() && !isTyping
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        }`}
                        title="Send message"
                      >
                        <ArrowUp size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* WHAT'S NEW MODAL POPUP */}
      {whatsNewOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Gift size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-base">What's New in HRHub Ai Buddy</h4>
              </div>
              <button
                onClick={() => setWhatsNewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-900 font-semibold">High-Speed Smart AI Assistant:</strong>
                  <p className="mt-0.5 text-blue-800">
                    Fast, reliable, and intelligent corporate assistance for memos, policies, calculations, and operational inquiries.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                <FileText size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-900 font-semibold">1-Click Memo Transfer:</strong>
                  <p className="mt-0.5 text-purple-800">
                    Instantly transfer generated memorandums directly into the official Letterhead Memo Generator with watermarks and automated email dispatch.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 font-semibold">Simpal Group Corporate Context:</strong>
                  <p className="mt-0.5 text-emerald-800">
                    Comprehensive organizational context for SGC, SIMCON, Lucky Betplay STL, 5ARG, GFC, and IMP.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setWhatsNewOpen(false)}
              className="mt-5 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Got it, thank you
            </button>
          </div>
        </div>
      )}

    </div>
  );

  if (isEmbedded) {
    return mainWorkspaceContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 p-2 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="relative flex w-full max-w-7xl h-[94vh] max-h-[960px] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 bg-white ring-1 ring-black/10">
        {mainWorkspaceContent}
      </div>
    </div>
  );
}
