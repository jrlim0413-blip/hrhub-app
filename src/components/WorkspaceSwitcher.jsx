import { useEffect, useRef } from "react";
import {
  ChevronDown, Palette, UserRound, KeyRound, Megaphone,
  BriefcaseBusiness, Check
} from "lucide-react";

export const VIEW_OPTIONS = [
  {
    id: "communication",
    label: "Communication",
    sublabel: "Memos and announcements",
    icon: Megaphone
  },
  {
    id: "sop",
    label: "Workspace",
    sublabel: "Processes and task boards",
    icon: BriefcaseBusiness
  }
];

export default function WorkspaceSwitcher({
  isOpen,
  onToggle,
  onClose,
  activeView = "communication",
  setActiveView,
  onSelectWorkspace,
  activeTheme = "sky",
  setActiveTheme,
  themeOptions = [],
  onOpenProfile,
  onOpenPassword
}) {
  const containerRef = useRef(null);

  // Auto-close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (onClose) onClose();
        else if (onToggle) onToggle();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (onClose) onClose();
        else if (onToggle) onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, onToggle]);

  const handleSelect = (id) => {
    if (onSelectWorkspace) {
      onSelectWorkspace({ view: id, tab: id === "sop" ? "home" : "bulletin" });
    } else if (setActiveView) {
      setActiveView(id);
    }
    if (onClose) onClose();
    else if (onToggle) onToggle();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Switch workspace"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-full text-slate-950 hover:brightness-105 transition cursor-pointer"
      >
        <span className="w-8 h-8 rounded-full bg-emerald-500 font-bold text-xs flex items-center justify-center">
          HR
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-400" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl z-50 animate-fade-in">
          <div className="border-b border-slate-100 px-3 pb-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Switch workspace
            </p>
            <p className="mt-1 text-xs text-slate-500">Choose where you want to work</p>
          </div>

          {/* DATING DALAWANG BUTTON: COMMUNICATION AT WORKSPACE */}
          <div className="mt-2 space-y-1">
            {VIEW_OPTIONS.map(({ id, label, sublabel, icon: Icon }) => {
              const isSelected = activeView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold">{label}</span>
                    <span className="block text-[10px] text-slate-400">{sublabel}</span>
                  </span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* BACKGROUND THEME COLOR */}
          {themeOptions && themeOptions.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5">
                <Palette size={14} className="text-slate-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Background color
                </p>
              </div>
              <div className="flex gap-2 px-3 py-2">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setActiveTheme && setActiveTheme(theme.id)}
                    aria-label={`Use ${theme.label} background`}
                    className={`h-7 w-7 rounded-full ${theme.color} border-2 transition cursor-pointer ${
                      activeTheme === theme.id
                        ? "border-slate-900 ring-2 ring-slate-200"
                        : "border-white hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* USER ACCOUNT ACTIONS */}
          <div className="mt-1 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
                if (onClose) onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 transition hover:bg-slate-50 cursor-pointer"
            >
              <UserRound size={15} className="text-slate-500" />
              <span className="text-xs font-bold">Update profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenPassword) onOpenPassword();
                if (onClose) onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 transition hover:bg-slate-50 cursor-pointer"
            >
              <KeyRound size={15} className="text-slate-500" />
              <span className="text-xs font-bold">Change password</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
