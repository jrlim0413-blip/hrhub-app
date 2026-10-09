import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Sparkles, MessageSquare, Volume2, VolumeX } from "lucide-react";
import AiAssistantLiveCanvas from "./AiAssistantLiveCanvas";

/**
 * High-Definition Neural Voice Playlist (Microsoft Jenny Neural AI)
 * 100% natural, warm, human English voice with millisecond word boundaries.
 */
const DIALOG_PLAYLIST = [
  {
    audioUrl: "/audio/greeting_0.mp3",
    display: "Hello! I am your HRHub AI Buddy, ready to assist you today! ✨",
    words: ["Hello!", "I", "am", "your", "HRHub", "AI", "Buddy,", "ready", "to", "assist", "you", "today!", "✨"],
    boundaries: [
      { offsetMs: 100, durationMs: 575 },
      { offsetMs: 1538, durationMs: 163 },
      { offsetMs: 1713, durationMs: 100 },
      { offsetMs: 1825, durationMs: 188 },
      { offsetMs: 2025, durationMs: 338 },
      { offsetMs: 2375, durationMs: 188 },
      { offsetMs: 2575, durationMs: 225 },
      { offsetMs: 2813, durationMs: 375 },
      { offsetMs: 3375, durationMs: 225 },
      { offsetMs: 3613, durationMs: 125 },
      { offsetMs: 3750, durationMs: 388 },
      { offsetMs: 4150, durationMs: 100 },
      { offsetMs: 4263, durationMs: 450 }
    ],
    durationMs: 5200
  },
  {
    audioUrl: "/audio/greeting_1.mp3",
    display: "Ask me anything about company policies, memos, and HR operations! 💬",
    words: ["Ask", "me", "anything", "about", "company", "policies,", "memos,", "and", "HR", "operations!", "💬"],
    boundaries: [
      { offsetMs: 100, durationMs: 275 },
      { offsetMs: 388, durationMs: 150 },
      { offsetMs: 550, durationMs: 413 },
      { offsetMs: 975, durationMs: 263 },
      { offsetMs: 1250, durationMs: 363 },
      { offsetMs: 1625, durationMs: 738 },
      { offsetMs: 2475, durationMs: 563 },
      { offsetMs: 3163, durationMs: 163 },
      { offsetMs: 3338, durationMs: 338 },
      { offsetMs: 3688, durationMs: 888 }
    ],
    durationMs: 4800
  },
  {
    audioUrl: "/audio/greeting_2.mp3",
    display: "Need help drafting a memo or computing employee benefits? Just let me know! 📋",
    words: ["Need", "help", "drafting", "a", "memo", "or", "computing", "employee", "benefits?", "Just", "let", "me", "know!", "📋"],
    boundaries: [
      { offsetMs: 100, durationMs: 225 },
      { offsetMs: 338, durationMs: 213 },
      { offsetMs: 563, durationMs: 425 },
      { offsetMs: 1000, durationMs: 50 },
      { offsetMs: 1063, durationMs: 400 },
      { offsetMs: 1475, durationMs: 150 },
      { offsetMs: 1638, durationMs: 475 },
      { offsetMs: 2125, durationMs: 375 },
      { offsetMs: 2513, durationMs: 713 },
      { offsetMs: 4088, durationMs: 288 },
      { offsetMs: 4388, durationMs: 113 },
      { offsetMs: 4513, durationMs: 113 },
      { offsetMs: 4638, durationMs: 413 }
    ],
    durationMs: 5400
  },
  {
    audioUrl: "/audio/greeting_3.mp3",
    display: "Welcome to HRHub! Feel free to click here to chat with me anytime! 😊",
    words: ["Welcome", "to", "HRHub!", "Feel", "free", "to", "click", "here", "to", "chat", "with", "me", "anytime!", "😊"],
    boundaries: [
      { offsetMs: 100, durationMs: 363 },
      { offsetMs: 475, durationMs: 113 },
      { offsetMs: 600, durationMs: 375 },
      { offsetMs: 988, durationMs: 338 },
      { offsetMs: 2188, durationMs: 263 },
      { offsetMs: 2463, durationMs: 175 },
      { offsetMs: 2650, durationMs: 100 },
      { offsetMs: 2763, durationMs: 250 },
      { offsetMs: 3025, durationMs: 188 },
      { offsetMs: 3225, durationMs: 88 },
      { offsetMs: 3325, durationMs: 250 },
      { offsetMs: 3588, durationMs: 138 },
      { offsetMs: 3738, durationMs: 150 },
      { offsetMs: 3900, durationMs: 688 }
    ],
    durationMs: 4800
  }
];

// Helper: Select natural female voice for speech synthesis fallback
export function getFemaleVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const prioritizedFemale = voices.find(
    (v) =>
      v.name.toLowerCase().includes("jenny") ||
      v.name.toLowerCase().includes("aria") ||
      v.name.toLowerCase().includes("zira") ||
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("karen") ||
      v.name.toLowerCase().includes("victoria") ||
      v.name.toLowerCase().includes("google us english") ||
      (v.name.toLowerCase().includes("natural") && v.name.toLowerCase().includes("female"))
  );

  return (
    prioritizedFemale ||
    voices.find((v) => v.name.toLowerCase().includes("female")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]
  );
}

export default function AiAssistantGirlWidget({
  onOpenChat,
  isChatOpen = false,
  hidden = false
}) {
  const [isMinimized, setIsMinimized] = useState(false); // Animated waving anime character visible by default
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthState, setMouthState] = useState("resting"); // "resting", "open", "shut"
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Natural female voice

  // Synchronized Word-by-Word Typing & Lip-Flap State
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayedWords, setDisplayedWords] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const audioPlayerRef = useRef(null);
  const activeTimersRef = useRef([]);

  const clearAllTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  };

  // Stop audio and timers when hidden or chat is open
  useEffect(() => {
    if (hidden || isChatOpen) {
      clearAllTimers();
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {}
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [hidden, isChatOpen]);

  // 1. Natural Anime Blinking Engine (Eyes are wide OPEN by default, blinks naturally)
  useEffect(() => {
    if (hidden || isChatOpen || isMinimized) return;
    let t1, t2, t3;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      t1 = setTimeout(() => {
        setIsBlinking(false);
        t2 = setTimeout(() => {
          setIsBlinking(true);
          t3 = setTimeout(() => {
            setIsBlinking(false);
          }, 110);
        }, 120);
      }, 130);
    }, 3800);

    return () => {
      clearInterval(blinkInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hidden, isChatOpen, isMinimized]);

  // 2. Play Natural Neural Voice Greeting with Exact Millisecond Word Sync
  const playGreeting = (index) => {
    if (hidden || isChatOpen || isMinimized) return;
    clearAllTimers();
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const item = DIALOG_PLAYLIST[index];
    if (!item) return;

    setDisplayedWords([]);
    setIsTyping(true);

    // Play Studio Neural Voice Audio
    if (voiceEnabled) {
      try {
        const audio = new Audio(item.audioUrl);
        audioPlayerRef.current = audio;
        audio.play().catch((err) => {
          if (err.name !== "AbortError" && !err.message.includes("pause")) {
            console.debug("Audio waiting for user gesture:", err.message);
          }
        });
      } catch (err) {
        console.warn("Audio play error:", err);
      }
    }

    // Schedule millisecond-accurate word reveals and mouth flaps
    item.boundaries.forEach((b, bIdx) => {
      const tWord = setTimeout(() => {
        setDisplayedWords(item.words.slice(0, bIdx + 1));
        setMouthState("open");
      }, b.offsetMs);
      activeTimersRef.current.push(tWord);

      const tShut = setTimeout(() => {
        setMouthState("shut");
      }, b.offsetMs + Math.min(b.durationMs - 20, 160));
      activeTimersRef.current.push(tShut);
    });

    // Complete sentence
    const tEnd = setTimeout(() => {
      setDisplayedWords(item.words);
      setIsTyping(false);
      setMouthState("resting"); // Resting closed smile

      const tNext = setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % DIALOG_PLAYLIST.length);
      }, 60000);
      activeTimersRef.current.push(tNext);
    }, item.durationMs);

    activeTimersRef.current.push(tEnd);
  };

  useEffect(() => {
    if (!hidden && !isChatOpen && !isMinimized) {
      playGreeting(msgIndex);
    }

    return () => {
      clearAllTimers();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [msgIndex, hidden, isChatOpen, isMinimized]);

  const handleCharacterInteraction = () => {
    setMsgIndex((prev) => (prev + 1) % DIALOG_PLAYLIST.length);
  };

  const handleToggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    if (!nextState) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } else {
      playGreeting(msgIndex);
    }
  };

  // If hidden (active page has its own AI button) or chat modal is open, completely hide floating widget
  if (hidden || isChatOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
        <button
          type="button"
          onClick={() => {
            if (onOpenChat) onOpenChat();
          }}
          className="group relative flex items-center gap-3.5 rounded-full bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl pl-2.5 pr-4 py-2 text-white shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5),0_0_20px_-3px_rgba(16,185,129,0.3)] hover:shadow-[0_16px_45px_-5px_rgba(0,0,0,0.6),0_0_30px_0_rgba(16,185,129,0.45)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] border border-emerald-500/30 hover:border-emerald-400/70 cursor-pointer ring-1 ring-emerald-500/20 hover:ring-emerald-400/50"
          title="Open HRHub AI Assistant"
        >
          {/* Subtle glowing ambient backdrop mesh */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Circular mini avatar */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 border-2 border-emerald-400 shadow-md ring-2 ring-emerald-500/30 overflow-hidden group-hover:ring-emerald-400/70 transition-all">
            <img
              src="/ai_buddy_avatar.png"
              alt="HRHub AI Buddy"
              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
            />
            <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950"></span>
            </span>
          </div>

          <div className="flex flex-col text-left leading-tight z-10">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                HRHub Ai Buddy
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-300 tracking-wider shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <span className="text-[10px] text-slate-300/90 font-medium flex items-center gap-1 mt-0.5 group-hover:text-white transition-colors">
              <Sparkles size={11} className="text-emerald-400 shrink-0" />
              Click to summon assistant
            </span>
          </div>

          {/* Glowing launcher trigger */}
          <div className="z-10 pl-1 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
            <Sparkles size={14} className="animate-pulse" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-2 sm:right-6 z-40 pointer-events-none select-none flex flex-col items-end">
      {/* CSS Keyframe Animations for Floating, Blink, Arm, Foot, & Neon Halo */}
      <style>{`
        @keyframes ai-character-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes ai-neon-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.45)) drop-shadow(0 0 28px rgba(59, 130, 246, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(56, 189, 248, 0.75)) drop-shadow(0 0 40px rgba(99, 102, 241, 0.45));
          }
        }
        @keyframes ai-bubble-bob {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
                /* 3. PLATFORM SPOTLIGHT GLOW */
        @keyframes ai-platform-pulse {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.9;
            transform: translateX(-50%) scale(1.1);
          }
        }

        .ai-floating-character {
          animation: ai-character-float 4.2s ease-in-out infinite;
        }
        .ai-pulsing-neon {
          animation: ai-neon-pulse 3s ease-in-out infinite;
        }
        .ai-floating-bubble {
          animation: ai-bubble-bob 3.2s ease-in-out infinite;
        }
        .ai-girl-blinking-eyes {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .ai-girl-talking-mouth {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform-origin: 384px 275px;
        }
        .ai-platform-pulse {
          animation: ai-platform-pulse 2.8s ease-in-out infinite;
        }
      `}</style>

      {/* Main Floating Wrapper */}
      <div className="relative pointer-events-auto flex flex-col items-end ai-floating-character">

        {/* Top Controls: Minimize Button */}
        <div className="mb-1 flex items-center gap-1.5 self-end z-20">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-slate-300 hover:text-white text-[10px] font-bold px-2 py-1 rounded-full border border-slate-700/80 shadow-md transition cursor-pointer"
            title="Minimize Assistant"
          >
            <span>Minimize</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* INTERACTIVE SPEECH BUBBLE (Above/Beside Head) */}
        {!bubbleDismissed && (
          <div className="absolute -top-16 sm:-top-20 right-20 sm:right-28 z-30 ai-floating-bubble">
            <div
              onClick={onOpenChat}
              className="group relative cursor-pointer rounded-2xl border border-cyan-400/40 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-cyan-300 w-[220px] sm:w-[260px]"
            >
              {/* Top row: Status indicator & Female Voice Toggle */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Online • AI Buddy
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Female Voice Mute / Unmute Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVoice();
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold transition cursor-pointer ${voiceEnabled
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30"
                        : "bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-slate-200"
                      }`}
                    title={voiceEnabled ? "Mute Voice (I-mute ang boses)" : "Enable Natural Female Voice (I-on ang boses babae)"}
                  >
                    {voiceEnabled ? (
                      <>
                        <Volume2 size={11} className="text-cyan-400 animate-pulse" />
                        <span>Voice</span>
                      </>
                    ) : (
                      <>
                        <VolumeX size={11} />
                        <span>Mute</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBubbleDismissed(true);
                      if (audioPlayerRef.current) audioPlayerRef.current.pause();
                      if (window.speechSynthesis) window.speechSynthesis.cancel();
                    }}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded-full transition cursor-pointer"
                    title="Dismiss message"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>

              {/* Message Content: Word-by-word synchronized */}
              <p className="text-xs sm:text-[13px] font-bold text-slate-100 leading-snug group-hover:text-cyan-300 transition-colors min-h-[42px]">
                {displayedWords.join(" ")}
                {isTyping && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle rounded-xs" />
                )}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[9px]">
                <span className="text-slate-400">HR Operations AI</span>
                <span className="text-cyan-400 font-semibold group-hover:underline">Click to chat →</span>
              </div>

              {/* Speech bubble pointy arrow */}
              <div className="absolute -bottom-2 right-8 w-3.5 h-3.5 rotate-45 bg-slate-950/90 border-r border-b border-cyan-400/40"></div>
            </div>
          </div>
        )}

        {/* FULL BODY ANIMATED ANIME CHARACTER (Live2D-style WebGL Mesh + SVG Blinking Eyelids + Talking Mouth) */}
        <div
          onClick={() => {
            handleCharacterInteraction();
            onOpenChat();
          }}
          className="relative cursor-pointer group transition-transform duration-300 hover:scale-102"
          title="Click to talk with HRHub Ai Buddy"
        >
          {/* Layer 1: Seamless 2.5D Animated Character Canvas (Pristine original image, realistic waving hand & breathing) */}
          <AiAssistantLiveCanvas
            className="h-[360px] sm:h-[440px] md:h-[480px] w-auto object-contain ai-pulsing-neon drop-shadow-2xl transition-all duration-300 select-none pointer-events-none"
          />

          {/* Layer 2: Animated Blinking Eyes & Talking Mouth SVG */}
          <svg
            viewBox="0 0 768 1376"
            className="absolute inset-0 h-full w-full pointer-events-none overflow-visible"
          >
            {/* Blinking Eyelids Layer (Controlled by React isBlinking state) */}
            <g
              className="ai-girl-blinking-eyes"
              style={{
                opacity: isBlinking ? 1 : 0,
                visibility: isBlinking ? "visible" : "hidden",
                transition: "opacity 0.04s ease-out",
                pointerEvents: "none",
              }}
            >
              {/* Left Eye Eyelid */}
              <g id="left-eye-blink">
                <path d="M 338,224 Q 355,221 372,225 Q 371,239 355,239 Q 339,238 338,224 Z" fill="#f9ccb7" />
                <path d="M 342,222 Q 355,220 367,223" stroke="#d59a85" strokeWidth="1.0" strokeLinecap="round" fill="none" />
                <path d="M 338,235 Q 355,239 372,234" stroke="#231c26" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M 344,237 Q 355,240 366,237" stroke="#684249" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </g>
              {/* Right Eye Eyelid */}
              <g id="right-eye-blink">
                <path d="M 395,224 Q 412,221 428,225 Q 427,239 412,239 Q 396,238 395,224 Z" fill="#f9ccb7" />
                <path d="M 398,222 Q 412,220 424,223" stroke="#d59a85" strokeWidth="1.0" strokeLinecap="round" fill="none" />
                <path d="M 395,235 Q 412,239 428,234" stroke="#231c26" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M 401,237 Q 412,240 422,237" stroke="#684249" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </g>
            </g>

            {/* Talking Mouth Lip-Flap Animation (Active only when mouthState === 'open') */}
            <g
              className="ai-girl-talking-mouth"
              style={{
                opacity: mouthState === "open" ? 1 : 0,
                visibility: mouthState === "open" ? "visible" : "hidden",
                transform: mouthState === "open" ? "scale(1)" : "scale(0.8)",
                transformOrigin: "384px 275px",
                transition: "opacity 0.05s ease-out, transform 0.05s ease-out",
                pointerEvents: "none",
              }}
            >
              {/* Skin blend under mouth */}
              <path d="M 364,269 Q 384,265 404,269 Q 402,286 384,287 Q 366,286 364,269 Z" fill="#f9ccb7" />
              {/* Open speaking mouth interior cavity */}
              <path d="M 368,271 Q 384,267 400,271 Q 398,284 384,285 Q 370,284 368,271 Z" fill="#6d1e26" />
              {/* Upper white teeth line */}
              <path d="M 371,271 Q 384,268 397,271 Q 394,275 384,275 Q 374,275 371,271 Z" fill="#ffffff" />
              {/* Tongue highlight */}
              <path d="M 374,281 Q 384,277 394,281 Q 389,284 384,284 Q 379,284 374,281 Z" fill="#ea7781" />
              {/* Lip contour line */}
              <path d="M 368,271 Q 384,267 400,271 Q 398,284 384,285 Q 370,284 368,271" stroke="#4a151b" strokeWidth="1.4" fill="none" />
              {/* Lower lip shadow */}
              <path d="M 375,287 Q 384,289 393,287" stroke="#d58983" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </g>
          </svg>

          {/* Glowing bottom ground spotlight halo */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-6 bg-cyan-400/25 blur-md rounded-full pointer-events-none ai-platform-pulse"></div>
        </div>
      </div>
    </div>
  );
}
