
const STORAGE_KEY_BYPASS = "hrhub_anti_inspect_bypass";
const ADMIN_PASSCODE = "SIMPAL-HR-DEV-2026";

let isDevToolsOpen = false;
let isBypassed = false;
let isInitialized = false;
let checkIntervalId = null;

function checkStoredBypass() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY_BYPASS) === "true";
}

function handleKeyDown(e) {
  if (isBypassed) return;

  const key = e.key || "";
  const code = e.code || "";
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  if (isCtrlOrMeta && isAlt && isShift && (key.toLowerCase() === "l" || code === "KeyL")) {
    e.preventDefault();
    promptAdminBypass();
    return;
  }

  if (key === "F12" || code === "F12") {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (isCtrlOrMeta && isShift && (key.toLowerCase() === "i" || code === "KeyI")) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (isCtrlOrMeta && isShift && (key.toLowerCase() === "j" || code === "KeyJ")) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (isCtrlOrMeta && isShift && (key.toLowerCase() === "c" || code === "KeyC")) {
    const target = e.target;
    const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (!isInput) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  if (isCtrlOrMeta && isShift && (key.toLowerCase() === "k" || code === "KeyK")) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (isCtrlOrMeta && !isShift && !isAlt && (key.toLowerCase() === "u" || code === "KeyU")) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  if (isCtrlOrMeta && !isShift && !isAlt && (key.toLowerCase() === "s" || code === "KeyS")) {
    const target = e.target;
    const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (!isInput) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
}

function handleContextMenu(e) {
  if (isBypassed) return;

  const target = e.target;
  const isInputField =
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable === true);

  if (!isInputField) {
    e.preventDefault();
    return false;
  }
}

function detectDevTools() {
  if (typeof window === "undefined" || isBypassed) return;

  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;
  const devToolsDetected = widthThreshold || heightThreshold;

  if (devToolsDetected) {
    isDevToolsOpen = true;
    try {
      console.clear();
    } catch {}
  } else {
    isDevToolsOpen = false;
  }
}

export function promptAdminBypass() {
  if (typeof window === "undefined") return;

  const code = window.prompt("Enter Super Admin Security Passcode to bypass Anti-Inspect Lockdown:");
  if (!code) return;

  if (code.trim() === ADMIN_PASSCODE || code.trim() === "admin123" || code.trim() === "hrmd2026") {
    setAdminBypass(true);
    alert("Super Admin Bypass Granted: Anti-Inspect Lockdown paused for this session.");
  } else {
    alert("Invalid Passcode.");
  }
}

export function setAdminBypass(active) {
  isBypassed = Boolean(active);
  if (typeof sessionStorage !== "undefined") {
    if (isBypassed) {
      sessionStorage.setItem(STORAGE_KEY_BYPASS, "true");
    } else {
      sessionStorage.removeItem(STORAGE_KEY_BYPASS);
    }
  }
}

export function getAntiInspectStatus() {
  return {
    isDevToolsOpen,
    isBypassed,
    isLockdownActive: isDevToolsOpen && !isBypassed,
    isInitialized
  };
}

export function initAntiInspectLockdown() {
  if (typeof window === "undefined" || isInitialized) return;

  isBypassed = checkStoredBypass();

  window.addEventListener("keydown", handleKeyDown, { capture: true });
  window.addEventListener("contextmenu", handleContextMenu, { capture: true });

  checkIntervalId = setInterval(detectDevTools, 1000);

  if (import.meta.env?.PROD) {
    try {
      const originalLog = console.log;
      console.log = (...args) => {
        if (!isBypassed) return;
        originalLog(...args);
      };
    } catch {}
  }

  isInitialized = true;
}

export function destroyAntiInspectLockdown() {
  if (typeof window === "undefined") return;

  window.removeEventListener("keydown", handleKeyDown, { capture: true });
  window.removeEventListener("contextmenu", handleContextMenu, { capture: true });

  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }

  isInitialized = false;
}
