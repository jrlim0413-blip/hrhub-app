import { useState, useMemo } from "react";
import {
  X, CheckCircle2, Clock, MapPin, Coffee, Car,
  LogOut, ShieldCheck, AlertCircle, Building2
} from "lucide-react";
import { punchHRAttendance, getTodayDateStr } from "../lib/hrAttendanceStorage.js";

export default function HRAttendancePunchModal({
  isOpen,
  onClose,
  onSuccess,
  hrOfficers = [],
  currentProfile = null,
  isHRMD = true,
  selectedDate = getTodayDateStr(),
  preSelectedHrEmail = null
}) {
  const [selectedHrEmail, setSelectedHrEmail] = useState(() => {
    return preSelectedHrEmail || currentProfile?.email || "admin@hrhub.com";
  });
  const [punchAction, setPunchAction] = useState("time_in"); // 'time_in' | 'break' | 'field_work' | 'time_out' | 'off_duty'
  const [punchTime, setPunchTime] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
  const [location, setLocation] = useState("");
  const [shift, setShift] = useState("Regular Office Shift (08:00 AM - 05:00 PM)");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const activeHr = useMemo(() => {
    return hrOfficers.find((h) => (h.email || "").toLowerCase() === (selectedHrEmail || "").toLowerCase()) || {
      name: currentProfile?.name || "HR Officer",
      email: selectedHrEmail,
      company: currentProfile?.company || "Simpal Group of Companies",
      role: currentProfile?.role || "HR Administrator",
      branch: currentProfile?.branch || "Head Office (SGC)"
    };
  }, [hrOfficers, selectedHrEmail, currentProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    let status = "present";
    let timeInVal = undefined;
    let timeOutVal = undefined;
    let breakStartVal = undefined;

    if (punchAction === "time_in") {
      status = "present";
      timeInVal = punchTime;
    } else if (punchAction === "break") {
      status = "break";
      breakStartVal = punchTime;
    } else if (punchAction === "field_work") {
      status = "field_work";
    } else if (punchAction === "time_out") {
      status = "completed";
      timeOutVal = punchTime;
    } else if (punchAction === "off_duty") {
      status = "off_duty";
    }

    const payload = {
      date: selectedDate,
      email: activeHr.email,
      name: activeHr.name,
      company: activeHr.company,
      role: activeHr.role,
      branch: activeHr.branch,
      status,
      timeIn: timeInVal,
      timeOut: timeOutVal,
      breakStart: breakStartVal,
      location: location || `${activeHr.company} • ${activeHr.branch || "Office"}`,
      shift,
      notes: notes.trim()
    };

    const res = await punchHRAttendance(payload);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess(res.record);
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to record attendance status.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider mb-1">
              <Clock size={11} />
              <span>HR Attendance & Duty Punch</span>
            </div>
            <h3 className="text-base font-black text-white">Record Daily Attendance Action</h3>
            <p className="text-xs text-slate-400">Punch Time-In, Breaks, Field Inspections, or Shift Closure.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 bg-slate-50/50">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* HR Officer Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              HR Officer
            </label>
            {isHRMD && hrOfficers.length > 0 ? (
              <select
                value={selectedHrEmail}
                onChange={(e) => setSelectedHrEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                {hrOfficers.map((h) => (
                  <option key={h.email} value={h.email}>
                    {h.name} — {h.company} ({h.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs">
                {activeHr.name} ({activeHr.role}) • {activeHr.company}
              </div>
            )}
          </div>

          {/* Action Chooser */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Select Attendance Action *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPunchAction("time_in")}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  punchAction === "time_in"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Time In (Start Shift)</span>
              </button>

              <button
                type="button"
                onClick={() => setPunchAction("break")}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  punchAction === "break"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Coffee size={14} />
                <span>Break / Lunch</span>
              </button>

              <button
                type="button"
                onClick={() => setPunchAction("field_work")}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  punchAction === "field_work"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Car size={14} />
                <span>Field Terminal Visit</span>
              </button>

              <button
                type="button"
                onClick={() => setPunchAction("time_out")}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  punchAction === "time_out"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <LogOut size={14} />
                <span>Time Out (End Shift)</span>
              </button>
            </div>
          </div>

          {/* Time & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Action Timestamp
              </label>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Clock size={13} className="text-slate-400" />
                <input
                  type="text"
                  value={punchTime}
                  onChange={(e) => setPunchTime(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Shift Schedule
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Regular Office Shift (08:00 AM - 05:00 PM)">Office (8:00 AM - 5:00 PM)</option>
                <option value="Executive Shift (07:30 AM - 05:30 PM)">Executive (7:30 AM - 5:30 PM)</option>
                <option value="Field Inspection & Audit Shift">Field & Station Audit</option>
                <option value="Special Operations Shift">Special Operations Shift</option>
              </select>
            </div>
          </div>

          {/* Location & Duty Focus */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Duty Station / Location
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <MapPin size={13} className="text-emerald-600 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={`e.g. ${activeHr.company} • ${activeHr.branch || "Head Office"}`}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              Daily Focus / Shift Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. On-site cashier attendance checking and terminal employee profiling..."
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
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
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Recording..." : "Confirm & Punch Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
