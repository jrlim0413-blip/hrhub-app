import { useState } from "react";
import {
  X, Copy, Check, Download, Mail, Sparkles,
  Image as ImageIcon, Send, ExternalLink, FileCode2
} from "lucide-react";
import {
  getPortalInviteUrl,
  formatInviteDisplayName,
  buildActivationPlainText,
  renderInviteCardPngBlob,
  copyRichInviteToClipboard
} from "../lib/preRegisterInvite";

export default function PreRegisterInviteModal({ employee, onClose }) {
  const [statusFeedback, setStatusFeedback] = useState("");
  const [busyAction, setBusyAction] = useState("");

  if (!employee) return null;

  const portalUrl = getPortalInviteUrl();
  const email = (employee.email || "").trim();
  const displayName = formatInviteDisplayName(employee);
  const company = employee.company?.trim() || "Simpal Group of Companies";
  const role = employee.role?.trim() || "Team Member";
  const plainMessage = buildActivationPlainText(employee, portalUrl);

  const showTempStatus = (key) => {
    setStatusFeedback(key);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === key ? "" : prev));
    }, 3200);
  };

  const handleCopyPlain = async () => {
    try {
      await navigator.clipboard?.writeText(plainMessage);
      showTempStatus("plain");
    } catch (err) {
      console.warn("Plain copy failed:", err);
    }
  };

  const handleCopyRichHtml = async () => {
    setBusyAction("rich");
    try {
      const res = await copyRichInviteToClipboard(employee, portalUrl);
      showTempStatus(res.mode === "rich_html" ? "rich" : "plain");
    } catch (err) {
      console.warn("Rich copy failed:", err);
    } finally {
      setBusyAction("");
    }
  };

  const triggerDownloadPng = (blob) => {
    if (!blob) return;
    const safeSlug = (email.split("@")[0] || displayName || "employee")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HRHub_Invite_${safeSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleCopyCardImage = async () => {
    setBusyAction("image_copy");
    try {
      const pngBlob = await renderInviteCardPngBlob(employee, portalUrl);
      if (!pngBlob) throw new Error("Failed to render card image");

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": pngBlob })
          ]);
          showTempStatus("image_copied");
          return;
        } catch {
          // If browser refuses image clipboard write, download PNG automatically
        }
      }
      triggerDownloadPng(pngBlob);
      showTempStatus("downloaded");
    } catch (err) {
      console.warn("Image copy error:", err);
    } finally {
      setBusyAction("");
    }
  };

  const handleDownloadCardImage = async () => {
    setBusyAction("image_download");
    try {
      const pngBlob = await renderInviteCardPngBlob(employee, portalUrl);
      triggerDownloadPng(pngBlob);
      showTempStatus("downloaded");
    } catch (err) {
      console.warn("Image download error:", err);
    } finally {
      setBusyAction("");
    }
  };

  const handleOpenGmail = async () => {
    setBusyAction("gmail");
    try {
      await copyRichInviteToClipboard(employee, portalUrl);
    } catch {
      // ignore clipboard error before opening Gmail
    } finally {
      setBusyAction("");
    }
    const subject = `[HRHub] Your Pre-Registered Account & First-Time Setup Instructions`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainMessage)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
    showTempStatus("gmail_opened");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/hrhub-logo.png" alt="HRHub Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <Sparkles size={12} /> Pre-Registered Account Invite Studio
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Send Setup Instructions with HRHub Logo
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 cursor-pointer transition"
            title="Close invite window"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Official Branded Card Preview (Matches Generated PNG & Rich HTML Email) */}
          <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            {/* Dark Slate + Emerald HRHub Branded Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-5 py-4 border-b-4 border-emerald-500 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-emerald-400/40 bg-slate-900 shrink-0">
                  <img src="/hrhub-logo.png" alt="HRHub Official Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-xl font-black text-white tracking-tight leading-none">
                    HR<span className="text-emerald-400">Hub</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90 mt-1">
                    Simpal Group &bull; Official Portal
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full shrink-0">
                Pre-Registered Account
              </span>
            </div>

            {/* Invitation Card Body */}
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Welcome to HRHub, {displayName}!
                </h4>
                <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-950 leading-relaxed font-medium">
                  {plainMessage}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Registered Email
                  </span>
                  <span className="font-mono font-bold text-emerald-700 mt-0.5 block break-all">
                    {email}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Company &amp; Designation
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">
                    {company}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {role}
                  </span>
                </div>
              </div>

              {/* 3 Activation Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold">
                <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-center text-slate-700">
                  1. Open Portal URL
                </div>
                <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-emerald-400">
                  2. Click &ldquo;First-Time Setup&rdquo;
                </div>
                <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-center text-slate-700">
                  3. Set Personal Password
                </div>
              </div>
            </div>
          </div>

          {/* Primary Send / Copy Action Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Choose How to Send with HRHub Logo
              </p>
              {statusFeedback && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <Check size={12} />
                  {statusFeedback === "image_copied"
                    ? "Logo card image copied! Paste (Ctrl+V) in Messenger, Viber, or Gmail."
                    : statusFeedback === "downloaded"
                    ? "Invite card PNG downloaded!"
                    : statusFeedback === "rich"
                    ? "Branded HTML invite w/ HRHub Logo copied! Paste in Gmail/Outlook."
                    : statusFeedback === "gmail_opened"
                    ? "Gmail opened & HRHub Logo HTML card copied — press Ctrl+V in email body if desired."
                    : "Plain invitation text copied!"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Copy Image Card for Messenger / Viber / WhatsApp */}
              <button
                type="button"
                disabled={busyAction === "image_copy"}
                onClick={handleCopyCardImage}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              >
                <ImageIcon size={15} />
                <span>Copy Card Image (w/ HRHub Logo)</span>
              </button>

              {/* 2. Download Image Card PNG */}
              <button
                type="button"
                disabled={busyAction === "image_download"}
                onClick={handleDownloadCardImage}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-emerald-400 text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Download size={15} />
                <span>Download Invite Card (.png)</span>
              </button>

              {/* 3. Copy Rich Email HTML w/ HRHub Logo */}
              <button
                type="button"
                disabled={busyAction === "rich"}
                onClick={handleCopyRichHtml}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 hover:text-emerald-800 text-xs font-bold transition cursor-pointer"
              >
                <FileCode2 size={15} className="text-emerald-600" />
                <span>Copy Rich Email Card (w/ Logo)</span>
              </button>

              {/* 4. Open Gmail + Auto-copy Rich Logo Card */}
              <button
                type="button"
                disabled={busyAction === "gmail"}
                onClick={handleOpenGmail}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <Mail size={15} className="text-rose-500" />
                <span>Send via Gmail (Copies Logo Card)</span>
                <ExternalLink size={12} className="text-slate-400" />
              </button>
            </div>

            {/* Plain-text Copy Strip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 flex-1">
                {plainMessage}
              </p>
              <button
                type="button"
                onClick={handleCopyPlain}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold shrink-0 cursor-pointer transition"
              >
                {statusFeedback === "plain" ? (
                  <>
                    <Check size={12} className="text-emerald-600" /> Copied Text
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy Text
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Tip: For <strong>Messenger / Viber / WhatsApp</strong>, click <strong>Copy Card Image (w/ HRHub Logo)</strong> and paste (<code className="bg-slate-100 px-1 rounded text-slate-600">Ctrl+V</code>) the visual card directly, or share the link which now includes the <strong>HRHub Logo</strong> link preview card. For <strong>Gmail / Outlook</strong>, use <strong>Copy Rich Email Card</strong> or <strong>Send via Gmail</strong>.
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
          >
            <Send size={13} className="text-emerald-400" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
