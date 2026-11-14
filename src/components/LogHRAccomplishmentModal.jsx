import { useState, useMemo } from "react";
import {
  X, CheckCircle2, Clock, Sparkles, Building2, Tag,
  FolderCheck, ClipboardCheck, ShieldAlert, Megaphone,
  CreditCard, Users, AlertCircle, Send
} from "lucide-react";
import {
  HR_LOG_CATEGORIES,
  COMMON_HR_TASK_PRESETS,
  addHRAccomplishmentLog,
  getTodayDateStr
} from "../lib/hrAttendanceStorage.js";

export default function LogHRAccomplishmentModal({
  isOpen,
  onClose,
  onSuccess,
  hrOfficers = [],
  currentProfile = null,
  isHRMD = true,
  selectedDate = getTodayDateStr()
}) {
  const [selectedHrEmail, setSelectedHrEmail] = useState(() => {
    return currentProfile?.email || "admin@hrhub.com";
  });
  const [category, setCategory] = useState("profiling_201");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("completed");
  const [timeLogged, setTimeLogged] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Active HR officer record
  const activeHr = useMemo(() => {
    return hrOfficers.find((h) => (h.email || "").toLowerCase() === (selectedHrEmail || "").toLowerCase()) || {
      name: currentProfile?.name || "HR Officer",
      email: selectedHrEmail,
      company: currentProfile?.company || "Simpal Group of Companies",
      role: currentProfile?.role || "HR Administrator",
      branch: currentProfile?.branch || "Head Office (SGC)"
    };
  }, [hrOfficers, selectedHrEmail, currentProfile]);

  const handleApplyPreset = (preset) => {
    setCategory(preset.category);
    setTitle(preset.title);
    setDetails(preset.details);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a task or accomplishment title.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await addHRAccomplishmentLog({
      date: selectedDate,
      authorEmail: activeHr.email,
      authorName: activeHr.name,
      authorRole: activeHr.role,
      authorCompany: activeHr.company,
      branch: activeHr.branch,
      category,
      title: title.trim(),
      details: details.trim(),
      timeLogged,
      status,
      tags
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.log);
      onClose();
    } else {
      setErrorMsg(result.error || "Failed to save work log.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} />
              <span>Daily Work & Accomplishment Entry</span>
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Log HR Officer Activity / Accomplishment
            </h3>
            <p className="text-xs text-slate-400">
              Record official daily tasks, station audits, compliance filings, or personnel actions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 bg-slate-50/50">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-600" />
                <span>Quick-Fill Task Templates</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Click to auto-fill</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {COMMON_HR_TASK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/50 text-[11px] font-semibold text-slate-700 hover:text-emerald-800 whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0"
                >
                  {preset.title.length > 34 ? `${preset.title.slice(0, 32)}...` : preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* 1. HR Officer & Entity Assignment */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 size={13} className="text-emerald-600" />
              <span>HR Officer & Entity Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Responsible HR Officer
                </label>
                {isHRMD && hrOfficers.length > 0 ? (
                  <select
                    value={selectedHrEmail}
                    onChange={(e) => setSelectedHrEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {hrOfficers.map((h) => (
                      <option key={h.email} value={h.email}>
                        {h.name} — {h.company} ({h.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-800">
                    {activeHr.name} ({activeHr.role})
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Entity & Branch
                </label>
                <div className="px-3 py-2 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-900 truncate">
                  {activeHr.company} • {activeHr.branch || "Head Office (SGC)"}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Category Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Work Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HR_LOG_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/40"
                        : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat.badge.split(" ")[0]}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Task Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Task / Accomplishment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conducted 201 File Verification for 3 Mandaue Tellers"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              required
            />
          </div>

          {/* 4. Detailed Narrative / Remarks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Detailed Work Description / Remarks
              </label>
              <span className="text-[10px] text-slate-400">Include key actions taken</span>
            </div>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the steps performed, personnel involved, or findings..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 leading-relaxed font-medium"
            />
          </div>

          {/* 5. Execution Metadata (Time, Status, Tags) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Time Logged
              </label>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={timeLogged}
                  onChange={(e) => setTimeLogged(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  placeholder="09:30 AM"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Task Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="completed">Completed ✅</option>
                <option value="in_progress">In Progress ⏳</option>
                <option value="pending_followup">Requires Follow-up ⚠️</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tags (comma-separated)
              </label>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Tag size={13} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="201, Mandaue, Audit"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Date: <strong className="text-slate-700">{selectedDate}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSubmitting ? "Logging..." : "Save Work Log"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
