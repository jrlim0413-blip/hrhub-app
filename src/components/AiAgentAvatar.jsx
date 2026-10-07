import { useState } from "react";

/**
 * HRHub AI Buddy Avatar Component
 * Displays the official portrait face of HRHub AI Buddy (anime HR assistant character)
 * with animated holographic rings, thinking mode effects, and online status badge.
 */
export default function AiAgentAvatar({
  size = "md",
  isThinking = false,
  showStatus = true,
  className = "",
  alt = "HRHub Ai Buddy"
}) {
  const [imgError, setImgError] = useState(false);

  // Size styling mapping
  const sizeMap = {
    xs: {
      box: "w-6 h-6 min-w-[24px] min-h-[24px]",
      img: "w-6 h-6",
      ring: "ring-[1.5px]",
      badge: "h-2 w-2 -top-0.5 -right-0.5",
      halo: "-inset-[2px]"
    },
    sm: {
      box: "w-8 h-8 min-w-[32px] min-h-[32px]",
      img: "w-8 h-8",
      ring: "ring-2",
      badge: "h-2.5 w-2.5 -top-0.5 -right-0.5",
      halo: "-inset-[2.5px]"
    },
    md: {
      box: "w-10 h-10 min-w-[40px] min-h-[40px]",
      img: "w-10 h-10",
      ring: "ring-2",
      badge: "h-2.5 w-2.5 -top-0.5 -right-0.5",
      halo: "-inset-[3px]"
    },
    lg: {
      box: "w-12 h-12 min-w-[48px] min-h-[48px]",
      img: "w-12 h-12",
      ring: "ring-[2.5px]",
      badge: "h-3 w-3 -top-0.5 -right-0.5",
      halo: "-inset-[3px]"
    },
    xl: {
      box: "w-16 h-16 min-w-[64px] min-h-[64px]",
      img: "w-16 h-16",
      ring: "ring-[3px]",
      badge: "h-3.5 w-3.5 top-0 right-0",
      halo: "-inset-[4px]"
    }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${currentSize.box} ${className}`}
    >
      <style>{`
        @keyframes ai-avatar-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ai-avatar-pulse {
          0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 3px rgba(34, 211, 238, 0.4)); }
          50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.8)); }
        }
        .ai-avatar-thinking-halo {
          animation: ai-avatar-spin 2.2s linear infinite;
        }
        .ai-avatar-thinking-pulse {
          animation: ai-avatar-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Holographic Glowing Ring / Thinking Halo */}
      {isThinking ? (
        <div
          className={`absolute ${currentSize.halo} rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 p-[2px] ai-avatar-thinking-halo opacity-100 z-0`}
        >
          <div className="w-full h-full rounded-full bg-slate-950"></div>
        </div>
      ) : (
        <div
          className={`absolute ${currentSize.halo} rounded-full bg-gradient-to-tr from-cyan-400/40 via-blue-500/30 to-indigo-500/30 opacity-70 blur-[1px] -z-10`}
        />
      )}

      {/* Main Avatar Circular Frame */}
      <div
        className={`relative z-10 w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-[#0b1329] to-[#070b18] border border-cyan-400/40 shadow-xs flex items-center justify-center ${
          isThinking ? "ai-avatar-thinking-pulse" : ""
        }`}
      >
        {!imgError ? (
          <img
            src="/ai_buddy_avatar.png"
            alt={alt}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-300 hover:scale-105"
            loading="eager"
          />
        ) : (
          /* Graceful Fallback if image fails */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold text-xs">
            AI
          </div>
        )}
      </div>

      {/* Online Status Badge (with ping effect) */}
      {showStatus && (
        <span
          className={`absolute ${currentSize.badge} z-20 pointer-events-none flex items-center justify-center`}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
          <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500 border border-white shadow-xs" />
        </span>
      )}
    </div>
  );
}
