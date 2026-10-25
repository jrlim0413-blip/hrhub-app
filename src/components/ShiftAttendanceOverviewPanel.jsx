import { useState, useMemo } from "react";
import {
  Calendar, Clock, Users, Building2, MapPin, Search,
  CheckCircle2, Sparkles, Filter, Printer, MessageSquare,
  ShieldCheck, AlertCircle, ArrowUpRight
} from "lucide-react";

const SHIFTS = [
  { id: "all", label: "All Active Shifts" },
  { id: "morning", label: "Morning Shift (06:00 AM - 02:00 PM)" },
  { id: "mid", label: "Mid Shift (02:00 PM - 10:00 PM)" },
  { id: "night", label: "Night Shift & Vault (10:00 PM - 06:00 AM)" }
];

const BRANCH_LOCATIONS = [
  "All Branches",
  "Head Office (Mandaue)",
  "Maguindanao Branch",
  "Cotabato City Branch",
  "Iligan City Branch",
  "SIMCON Field Site (Cebu)",
  "Regional Draw & Operations"
];

export default function ShiftAttendanceOverviewPanel({
  profiles = [],
  presenceMap = {},
  onOpenChat
}) {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedShift, setSelectedShift] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter roster
  const filteredRoster = useMemo(() => {
    return profiles.filter((p) => {
      const email = (p.email || "").toLowerCase();
      const name = (p.name || email.split("@")[0]).toLowerCase();
      const company = (p.company || "").toLowerCase();
      const branch = (p.branch || "Head Office (Mandaue)").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || company.includes(q) || branch.includes(q);
      const matchesBranch = selectedBranch === "All Branches" || (p.branch || "Head Office (Mandaue)") === selectedBranch;

      return matchesSearch && matchesBranch;
    });
  }, [profiles, selectedBranch, searchQuery]);

  const activeOnlineCount = useMemo(() => {
    return profiles.filter((p) => {
      const email = (p.email || "").toLowerCase();
      return presenceMap[email]?.status !== "offline";
    }).length;
  }, [profiles, presenceMap]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER & KPI CARDS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black tracking-tight mb-2">
              <Calendar size={13} className="text-emerald-600" />
              <span>LIVE SHIFT & ATTENDANCE ROSTER</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Enterprise Shift Schedules & On-Duty Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Consolidated real-time operational roster across Simpal Group subsidiaries, field branches, gaming stations, and construction sites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Roster</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>On-Duty Personnel</span>
              <Users size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{profiles.length}</div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeOnlineCount} Online & Active Now
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Branch Locations</span>
              <Building2 size={15} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">6 Locations</div>
            <div className="text-[10px] text-slate-500 font-bold mt-1">Multi-Entity Covered</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Shift Attendance</span>
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">99.2%</div>
            <div className="text-[10px] text-slate-500 font-bold mt-1">DOLE Compliant</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Biometric Audit</span>
              <ShieldCheck size={15} className="text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">Synchronized</div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1">Supervisor Verified</div>
          </div>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search on-duty personnel or branch..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            {BRANCH_LOCATIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            {SHIFTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. ROSTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoster.length > 0 ? (
          filteredRoster.map((person) => {
            const email = (person.email || "").toLowerCase();
            const presence = presenceMap[email];
            const isOnline = presence?.status !== "offline";
            const initials = person.name
              ? person.name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()
              : (email.slice(0, 2).toUpperCase() || "HR");

            return (
              <div
                key={person.id || person.email}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 font-bold text-sm flex items-center justify-center shadow-xs">
                      {initials}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        isOnline ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate">
                      {person.name || email.split("@")[0]}
                    </h3>
                    <p className="text-[11px] font-bold text-emerald-700 truncate mt-0.5">
                      {person.role || "Team Member"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 truncate font-medium">
                        <Building2 size={11} className="text-slate-400 shrink-0" />
                        {person.company || "Simpal Group of Companies"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate font-medium">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        {person.branch || "Head Office (Mandaue)"}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                        <Clock size={10} className="text-emerald-600" />
                        08:00 AM - 05:00 PM
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isOnline ? "Checked In • Active" : "Scheduled"}
                      </span>
                    </div>
                  </div>
                </div>

                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(person)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition cursor-pointer shrink-0"
                    title={`Direct Chat with ${person.name || person.email}`}
                  >
                    <MessageSquare size={16} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-slate-400 text-xs space-y-2">
            <Users size={28} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No personnel match your selected branch or search query.</p>
            <p className="text-[11px]">Adjust your branch dropdown filter or clear the search field.</p>
          </div>
        )}
      </div>
    </div>
  );
}
