import { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  Copy,
  Check,
  X,
  Share2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  QrCode,
  Info
} from "lucide-react";

export default function PwaInstallModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState("android"); // 'android' | 'ios'

  // Get current portal link or default to live Vercel URL
  const appUrl = typeof window !== "undefined" && window.location?.origin?.includes("vercel.app")
    ? window.location.origin
    : "https://hrhub-app.vercel.app";

  useEffect(() => {
    // Check if already running as standalone PWA
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsInstalled(isStandalone);
    }

    // Capture the beforeinstallprompt event for 1-click native install
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Brand Gradient */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shadow-inner">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 mb-0.5">
                <Sparkles size={10} />
                <span>PWA Mobile App</span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Download HRHub Mobile App
              </h3>
            </div>
          </div>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            I-download at i-save ang HRHub portal direkta sa cellphone ng mga Supervisor para sa mabilis na attendance, live camera captures, at GPS tagging.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Copy Link Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Official Mobile Portal Link:</span>
              <span className="text-[10px] text-emerald-600 font-bold">I-share sa Messenger / SMS</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-bold select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${
                  isCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{isCopied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
            {isCopied && (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                <Check size={12} /> Na-copy na ang link! I-paste ito sa browser ng cellphone.
              </p>
            )}
          </div>

          {/* 1-Click Native Install Button (if browser supports it) */}
          {deferredPrompt && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between gap-3 shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-black">Naka-detect ang browser ng 1-Tap Install!</p>
                <p className="text-[10px] text-emerald-100">Pindutin para kusa nang maidagdag sa home screen.</p>
              </div>
              <button
                type="button"
                onClick={handleNativeInstall}
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 transition shadow-xs cursor-pointer"
              >
                Install Now
              </button>
            </div>
          )}

          {/* Step-by-Step Instructions Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Paano I-download sa Cellphone:
              </h4>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("android")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    activeTab === "android"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Android / Chrome
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ios")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    activeTab === "ios"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  iPhone / Safari
                </button>
              </div>
            </div>

            {/* Android Instructions */}
            {activeTab === "android" && (
              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2 mb-2">
                  <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kung galing sa Messenger:</strong> I-tap muna ang <strong>••• (tatlong tuldok sa itaas)</strong> ➔ piliin ang <strong>"Open in browser"</strong> para lumipat sa Google Chrome.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                    1
                  </span>
                  <p>
                    Buksan ang <strong>Google Chrome</strong> sa iyong Android phone at i-paste ang link (o i-click ang link sa itaas).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                    2
                  </span>
                  <p>
                    Pindutin ang <strong>tatlong tuldok (⋮)</strong> sa kanang itaas ng browser.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                    3
                  </span>
                  <p>
                    Piliin ang <strong>"Install app"</strong> o <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                    4
                  </span>
                  <p>
                    I-click ang <strong>"Install"</strong>. Kusa nang lilitaw ang <strong>HRHub App Icon</strong> sa iyong cellphone katulad ng regular na mobile app!
                  </p>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === "ios" && (
              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    1
                  </span>
                  <p>
                    Buksan ang link gamit ang <strong>Safari</strong> browser sa inyong iPhone o iPad.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    2
                  </span>
                  <p>
                    Pindutin ang <strong>Share button</strong> (parisukat na may arrow pataas) sa ilalim ng screen.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    3
                  </span>
                  <p>
                    I-scroll pababa at pindutin ang <strong>"Add to Home Screen"</strong> (may icon na +).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    4
                  </span>
                  <p>
                    Pindutin ang <strong>"Add"</strong> sa kanang itaas. Handa na at nakalagay na ang HRHub app sa home screen!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Benefits Info Pill */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-700 shrink-0" />
            <div className="text-[11px] text-emerald-900 leading-tight">
              <strong>PWA Advantage:</strong> Hindi na kailangang dumaan sa Google Play Store o Apple App Store. Direkta itong gagana sa camera at GPS ng cellphone na may cloud sync.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-mono">
            {isInstalled ? "✅ App is installed on this device" : "Ready for Mobile Installation"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
