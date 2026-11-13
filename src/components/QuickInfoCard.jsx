import { useState, useEffect, useMemo } from "react";
import {
  Sparkles, Calendar, Megaphone, Bell, Clock, ChevronRight,
  ChevronLeft, Edit3, Check, X, ShieldAlert, Video, CreditCard
} from "lucide-react";
import {
  getBulletinPostsFromDb,
  getQuickInfoBroadcastFromDb,
  saveQuickInfoBroadcastToDb
} from "../lib/bulletinPostsStorage.js";

/**
 * Computes the real-time upcoming payroll schedule based on the current calendar date.
 * (In the Philippines / Simpal Group: 15th and End-of-Month)
 */
function getUpcomingPayrollSchedule() {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  let targetDay;
  let targetMonth = month;
  let targetYear = year;

  if (day <= 15) {
    targetDay = 15;
  } else {
    // End of the current month
    targetDay = new Date(year, month + 1, 0).getDate();
  }

  const isToday = day === targetDay;
  const daysDiff = targetDay - day;

  return {
    dateStr: `${monthNames[targetMonth]} ${targetDay}, ${targetYear}`,
    isToday,
    daysDiff
  };
}

export default function QuickInfoCard({
  isHRMD = false,
  onNavigateTab,
  profileName = "HRMD"
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bulletinItems, setBulletinItems] = useState([]);
  const [customBroadcast, setCustomBroadcast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Compute live payroll info
  const payrollInfo = useMemo(() => getUpcomingPayrollSchedule(), []);

  // Fetch latest bulletin memo & custom broadcast from database
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [feedRes, broadcastRes] = await Promise.all([
          getBulletinPostsFromDb().catch(() => ({ posts: [] })),
          getQuickInfoBroadcastFromDb().catch(() => null)
        ]);

        if (!isMounted) return;

        if (feedRes?.posts && Array.isArray(feedRes.posts)) {
          // Take up to 2 latest announcements / official memos / HR reminders
          const importantPosts = feedRes.posts
            .filter((p) => p.pinned || p.category === "Official Memo" || p.category === "HR Reminder" || p.category === "HR Motivation")
            .slice(0, 2);
          setBulletinItems(importantPosts);
        }

        if (broadcastRes?.text) {
          setCustomBroadcast(broadcastRes);
          setEditText(broadcastRes.text);
        }
      } catch (err) {
        console.warn("QuickInfoCard load error:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build the dynamic items list based on real-time data & new system features
  const items = useMemo(() => {
    const list = [];

    // 1. Custom Broadcast from HRMD (if present)
    if (customBroadcast?.text) {
      list.push({
        id: "custom_broadcast",
        category: customBroadcast.tag || "URGENT NOTICE",
        categoryColor: "text-amber-400 border-amber-500/40 bg-amber-500/10",
        icon: Bell,
        title: customBroadcast.text,
        highlight: null,
        suffix: "",
        linkTab: "bulletin"
      });
    }

    // 2. Real-time Payroll Schedule (Always accurate, never stale)
    list.push({
      id: "payroll_schedule",
      category: "PAYROLL SCHEDULE",
      categoryColor: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
      icon: CreditCard,
      prefix: "Consolidated multi-entity payroll schedule set for ",
      highlight: payrollInfo.dateStr,
      suffix: payrollInfo.isToday ? " (Processing Today)" : ` (${payrollInfo.daysDiff} days remaining).`,
      linkTab: "salary_compensation"
    });

    // 3. Latest Cloud Database Bulletin Notice / Reminder
    if (bulletinItems.length > 0) {
      bulletinItems.forEach((post, idx) => {
        list.push({
          id: `bulletin_${post.id || idx}`,
          category: post.category?.toUpperCase() || "HR NOTICE",
          categoryColor: post.pinned
            ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
            : "text-blue-400 border-blue-500/40 bg-blue-500/10",
          icon: Megaphone,
          title: post.title || post.content?.slice(0, 70),
          highlight: post.isOfficial ? " [Official]" : "",
          suffix: post.content ? ` — ${post.content.slice(0, 85)}...` : "",
          linkTab: "bulletin"
        });
      });
    }

    // 4. What's New in System: Video Bulletin & Motivations
    list.push({
      id: "system_video_feed",
      category: "SYSTEM UPDATE",
      categoryColor: "text-indigo-400 border-indigo-500/40 bg-indigo-500/10",
      icon: Video,
      prefix: "New in HrHub: ",
      highlight: "Video Posting & HR Motivations",
      suffix: " now active in Company Bulletin. Attach video clips or YouTube reels.",
      linkTab: "bulletin"
    });

    // 5. What's New in System: Cash Advance (CA) Tracking
    list.push({
      id: "system_ca_tracking",
      category: "SYSTEM UPDATE",
      categoryColor: "text-teal-400 border-teal-500/40 bg-teal-500/10",
      icon: Sparkles,
      prefix: "New feature: ",
      highlight: "Cash Advancement (CA) Ledger",
      suffix: " integrated into Salary & Compensation with automatic payroll deduction sync.",
      linkTab: "salary_compensation"
    });

    return list;
  }, [customBroadcast, payrollInfo, bulletinItems]);

  // Auto-cycle through items every 6.5 seconds unless hovered or editing
  useEffect(() => {
    if (isPaused || isEditing || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [items.length, isPaused, isEditing]);

  const currentItem = items[currentIndex % items.length] || items[0];

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleSaveBroadcast = async () => {
    if (!editText.trim()) {
      // Clear broadcast
      setIsSaving(true);
      await saveQuickInfoBroadcastToDb({ text: "", tag: "" });
      setCustomBroadcast(null);
      setIsSaving(false);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const res = await saveQuickInfoBroadcastToDb({
      text: editText.trim(),
      tag: "URGENT HRMD NOTICE",
      authorName: profileName
    });
    if (res.success) {
      setCustomBroadcast(res.broadcast);
      setCurrentIndex(0);
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-[#101d2d] text-white rounded-2xl p-4 shadow-md space-y-2.5 text-xs border border-slate-800/80 transition relative group"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between text-[10px] tracking-wider uppercase font-extrabold">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-emerald-400 font-black">Quick Info</span>
          {currentItem?.category && (
            <span className={`px-1.5 py-0.2 rounded-md border text-[9px] font-bold ${currentItem.categoryColor}`}>
              {currentItem.category}
            </span>
          )}
        </div>

        {/* Carousel controls & HRMD edit */}
        <div className="flex items-center gap-1">
          {isHRMD && (
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isEditing ? "Cancel edit" : "Edit quick broadcast message"}
            >
              {isEditing ? <X size={12} /> : <Edit3 size={12} />}
            </button>
          )}

          {items.length > 1 && !isEditing && (
            <div className="flex items-center gap-0.5 text-slate-400">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Previous update"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="font-mono text-[9px] px-1 text-slate-400 select-none">
                {((currentIndex % items.length) + 1)}/{items.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Next update"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body: Editing Mode vs Normal Display */}
      {isEditing ? (
        <div className="space-y-2 pt-1 animate-in fade-in">
          <textarea
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Type an urgent HRMD notice or reminder to broadcast here..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-medium leading-relaxed"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveBroadcast}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
            >
              <Check size={11} />
              <span>{isSaving ? "Saving..." : "Broadcast"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (currentItem?.linkTab && typeof onNavigateTab === "function") {
              onNavigateTab(currentItem.linkTab);
            }
          }}
          className={`cursor-pointer transition group/item select-none`}
        >
          <p className="text-slate-300 font-medium leading-relaxed">
            {currentItem?.prefix && <span>{currentItem.prefix}</span>}
            {currentItem?.title && <span>{currentItem.title}</span>}
            {currentItem?.highlight && (
              <strong className="text-white font-extrabold ml-0.5">
                {currentItem.highlight}
              </strong>
            )}
            {currentItem?.suffix && <span>{currentItem.suffix}</span>}
          </p>

          {/* Dot progress indicator */}
          {items.length > 1 && (
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(i);
                    }}
                    className={`h-1 rounded-full transition-all cursor-pointer ${
                      i === currentIndex % items.length
                        ? "w-4 bg-emerald-400"
                        : "w-1.5 bg-slate-700 hover:bg-slate-500"
                    }`}
                    title={`Go to item ${i + 1}`}
                  />
                ))}
              </div>

              {currentItem?.linkTab && (
                <span className="text-[10px] text-emerald-400 font-bold group-hover/item:underline flex items-center gap-0.5">
                  <span>Open</span>
                  <ChevronRight size={10} />
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

