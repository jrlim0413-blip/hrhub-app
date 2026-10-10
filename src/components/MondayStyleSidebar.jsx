import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Layers, FileText, BarChart3,
  Bot, CloudSun, Sparkles, Search, Plus, Star, ShieldCheck,
  Building2, Calculator, Clock, HardHat, Dices, Award, Zap, TrendingUp,
  Receipt, FileCheck, Sliders, Activity, MailCheck, Wrench, Home,
  Compass, PhoneCall, Mail, DollarSign, CircleDollarSign, Workflow, LayoutDashboard
} from "lucide-react";

export default function MondayStyleSidebar({
  workspaceTab,
  setWorkspaceTab,
  onOpenAiBuddy,
  isCollapsed,
  setIsCollapsed
}) {
  // Selected active icon category on the primary rail ('home' | 'operations' | 'finance' | 'hr' | 'analytics' | 'tools')
  const [selectedCategory, setSelectedCategory] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState(["simcon_equipment", "payroll_calc"]);
  const [activeItemId, setActiveItemId] = useState("home_overview");

  // Primary left rail categories (Icon + Text label below icon matching screenshot)
  const railCategories = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      color: "text-[#008559]"
    },
    {
      id: "operations",
      label: "Operations",
      icon: LayoutDashboard,
      color: "text-amber-500"
    },
    {
      id: "finance",
      label: "Finance",
      icon: CircleDollarSign,
      color: "text-emerald-500"
    },
    {
      id: "hr",
      label: "HR Admin",
      icon: FileText,
      color: "text-sky-500"
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      color: "text-purple-500"
    },
    {
      id: "tools",
      label: "Tools",
      icon: Sliders,
      color: "text-teal-500"
    }
  ];

  // Specific specialized features per category (Clean terminology, NO "Monday" or "Mock" text)
  const categoryModules = {
    home: {
      title: "Home & HR Dashboard",
      items: [
        {
          id: "home_overview",
          label: "Home HR Summary",
          icon: Home,
          tag: "Greeting"
        },
        {
          id: "meeting_scheduler",
          label: "Zoom & Google Meet Scheduler",
          icon: Compass,
          tag: "Meetings"
        }
      ]
    },
    operations: {
      title: "Field & Operations",
      items: [
        {
          id: "weather_map",
          label: "Field Hazard Weather Radar",
          icon: CloudSun,
          tag: "Live Radar"
        },
        {
          id: "simcon_equipment",
          label: "SIMCON Equipment Log",
          icon: Building2,
          tag: "SIMCON"
        },
        {
          id: "gaming_draws",
          label: "Gaming Branch Draws",
          icon: Dices,
          tag: "Gaming"
        },
        {
          id: "supervisor_audit",
          label: "Supervisor Audit Checklist",
          icon: FileCheck,
          tag: "Audit"
        }
      ]
    },
    finance: {
      title: "Finance & Remittance",
      items: [
        {
          id: "payroll_calc",
          label: "13th Month Payroll Calculator",
          icon: Calculator,
          tag: "DOLE"
        },
        {
          id: "petty_cash",
          label: "Branch Expense & Vouchers",
          icon: Receipt,
          tag: "Finance"
        },
        {
          id: "shortage_tracker",
          label: "Teller Shortage / Overage Log",
          icon: Activity,
          tag: "Tellers"
        }
      ]
    },
    hr: {
      title: "HR & Administration",
      items: [
        {
          id: "leave_queue",
          label: "Leave & Overtime Queue",
          icon: Clock,
          tag: "Leave"
        },
        {
          id: "dole_handbook",
          label: "DOLE Legal Guidelines",
          icon: ShieldCheck,
          tag: "Legal"
        },
        {
          id: "offboarding_clearance",
          label: "Contract & Exit Clearance",
          icon: FileCheck,
          tag: "201 File"
        },
        {
          id: "employee_rewards",
          label: "Staff Commendations",
          icon: Award,
          tag: "Rewards"
        }
      ]
    },
    analytics: {
      title: "Analytics & AI",
      items: [
        {
          id: "ai_sidekick_action",
          label: "HR AI Buddy Sidekick",
          icon: Sparkles,
          tag: "AI Partner"
        },
        {
          id: "revenue_trends",
          label: "Multi-Entity Revenue Trends",
          icon: TrendingUp,
          tag: "Executive"
        },
        {
          id: "compliance_scorecard",
          label: "DOLE & BIR Scorecard",
          icon: ShieldCheck,
          tag: "Compliance"
        }
      ]
    },
    tools: {
      title: "Tools",
      items: [
        {
          id: "email_webhook",
          label: "Mass Email & Webhook Dispatch",
          icon: MailCheck,
          tag: "Dispatch"
        },
        {
          id: "api_health",
          label: "System Health & API Latency",
          icon: Wrench,
          tag: "System"
        }
      ]
    }
  };

  // Handle clicking an icon on the primary rail
  const handleCategoryIconClick = (catId) => {
    if (catId === "home" && setWorkspaceTab) {
      setWorkspaceTab("home");
    }
    if (selectedCategory === catId) {
      // Toggle collapse if clicking the currently active icon
      setIsCollapsed(!isCollapsed);
    } else {
      // Switch active icon category AND uncollapse drawer
      setSelectedCategory(catId);
      setIsCollapsed(false);
    }
  };

  const toggleFavorite = (e, itemId) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Active category module ONLY
  const activeModule = categoryModules[selectedCategory] || categoryModules.operations;

  // Filter items inside active category
  const filteredActiveItems = activeModule.items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop Overlay when drawer is expanded on mobile screens */}
      {!isCollapsed && (
        <div
          onClick={() => setIsCollapsed(true)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          title="Close Navigation Menu"
        />
      )}

      <aside className={`fixed md:sticky top-[53px] left-0 h-[calc(100vh-53px)] flex shrink-0 z-50 md:z-30 select-none font-['Figtree','Inter',sans-serif] self-start transition-transform duration-300 ${
        isCollapsed ? "max-md:-translate-x-full" : "translate-x-0"
      }`}>
        {/* ================= 1. PRIMARY LEFT ICON RAIL (Matching Screenshot: Icon + Label below) ================= */}
      <div className="w-[68px] h-full bg-[#f5f6f8] border-r border-slate-200/80 flex flex-col items-center justify-between py-3 text-slate-600 shrink-0 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center gap-1.5 w-full">
          {/* Top Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:bg-[#008559] hover:text-white text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer group mb-1"
            title={isCollapsed ? "Expand Sidebar Drawer" : "Collapse Sidebar Drawer"}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronLeft size={18} className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          <div className="w-9 h-[1px] bg-slate-200/80 mb-1" />

          {/* Primary Rail Category Icons with Label Below (Exact Figtree/Inter Styling) */}
          <div className="flex flex-col items-center gap-1 w-full px-1">
            {railCategories.map((cat) => {
              const Icon = cat.icon;
              const isActiveIcon = selectedCategory === cat.id && !isCollapsed;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryIconClick(cat.id)}
                  className={`w-[58px] py-2 px-1 rounded-xl flex flex-col items-center justify-center transition cursor-pointer gap-1 ${
                    isActiveIcon
                      ? "bg-[#e6f4f1] text-[#008559] font-bold shadow-2xs"
                      : "hover:bg-slate-200/60 text-[#676879] hover:text-[#323338]"
                  }`}
                  title={cat.label}
                >
                  <div className={`p-1 rounded-lg ${isActiveIcon ? "bg-[#008559] text-white" : ""}`}>
                    <Icon size={18} className={isActiveIcon ? "text-white" : "text-slate-600"} />
                  </div>
                  <span className="text-[10px] tracking-tight leading-none text-center font-medium truncate w-full">
                    {cat.label}
                  </span>
                </button>
              );
            })}

            <div className="w-9 h-[1px] bg-slate-200/80 my-1" />

            {/* HR AI Buddy Partner Button */}
            <button
              type="button"
              onClick={onOpenAiBuddy}
              className="w-[58px] py-2 px-1 rounded-xl flex flex-col items-center justify-center transition cursor-pointer gap-1 hover:bg-emerald-50 text-[#008559] group"
              title="HR AI Buddy"
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles size={16} />
              </div>
              <span className="text-[10px] tracking-tight leading-none text-center font-semibold text-emerald-700 truncate w-full">
                Ai Buddy
              </span>
            </button>
          </div>
        </div>

        {/* Rail Bottom Action */}
        <button
          type="button"
          onClick={() => handleCategoryIconClick("tools")}
          className="w-[58px] py-2 px-1 rounded-xl flex flex-col items-center justify-center text-[#676879] hover:text-[#323338] hover:bg-slate-200/60 transition cursor-pointer gap-1"
          title="Tools & Workflows"
        >
          <Sliders size={18} />
          <span className="text-[10px] tracking-tight leading-none text-center font-medium">
            Settings
          </span>
        </button>
      </div>

      {/* ================= 2. SECONDARY DRAWER PANEL (Matching Screenshot: Header + Soft Pill Items) ================= */}
      <div
        className={`h-full bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-0 opacity-0 overflow-hidden border-none pointer-events-none" : "w-64 opacity-100"
        }`}
      >
        {/* Drawer Header (Matching Screenshot "Tools" Header Style) */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-[#323338] tracking-tight">
              {activeModule.title}
            </h2>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Collapse panel"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Clean Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeModule.title.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs text-[#323338] placeholder-slate-400 focus:outline-none focus:border-[#008559] transition"
            />
          </div>
        </div>

        {/* FLAT LIST OF CATEGORY ITEMS (Exact Figtree 14px Font & Soft Selected Pill from Screenshot) */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
          {filteredActiveItems.map((item) => {
            const ItemIcon = item.icon;
            const isSelected = activeItemId === item.id;
            const isFav = favorites.includes(item.id);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveItemId(item.id);
                  if (item.id === "ai_sidekick_action") {
                    onOpenAiBuddy();
                  } else if (selectedCategory === "home" && setWorkspaceTab) {
                    setWorkspaceTab("home");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveItemId(item.id);
                    if (item.id === "ai_sidekick_action") {
                      onOpenAiBuddy();
                    } else if (selectedCategory === "home" && setWorkspaceTab) {
                      setWorkspaceTab("home");
                    }
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer group ${
                  isSelected
                    ? "bg-[#e5f5f5] text-[#0f4c4c] font-medium shadow-2xs"
                    : "hover:bg-slate-100/80 text-[#323338] font-normal"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon
                    size={18}
                    className={`shrink-0 ${
                      isSelected ? "text-[#008559]" : "text-slate-600 group-hover:text-[#323338]"
                    }`}
                  />

                  <span className="text-sm tracking-tight truncate font-['Figtree','Inter',sans-serif]">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-[#008559]/15 text-[#008559]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.tag}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, item.id)}
                    className={`p-0.5 rounded transition ${
                      isFav
                        ? "text-amber-400"
                        : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500"
                    }`}
                    title={isFav ? "Favorite" : "Add favorite"}
                  >
                    <Star size={12} fill={isFav ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredActiveItems.length === 0 && (
            <p className="p-4 text-center text-xs text-slate-400">
              No items match your search.
            </p>
          )}
        </div>

        {/* Panel Footer Action */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onOpenAiBuddy}
            className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Open HR AI Buddy</span>
          </button>
        </div>
      </div>
    </aside>
  </>
);
}
