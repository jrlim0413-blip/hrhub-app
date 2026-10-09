import API_CONFIG from "../config/apiConfig";

/**
 * Zoom Web Meeting SDK Service for HRHub
 * Handles JWT signature generation, script loading, and mounting Zoom Web SDK inside HRHub DOM.
 */

// Simple Base64URL encoder for JWT signature
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Generates Zoom Meeting SDK JWT Signature (HMAC-SHA256)
 * @param {Object} params
 * @param {string} params.meetingNumber - Zoom Meeting ID (numbers only)
 * @param {number} params.role - 0 for Attendee, 1 for Host
 * @param {string} params.sdkKey - Zoom SDK Key
 * @param {string} params.sdkSecret - Zoom SDK Secret
 */
export async function generateZoomSDKSignature({
  meetingNumber,
  role = 0,
  sdkKey = API_CONFIG.ZOOM_CONFIG.SDK_KEY,
  sdkSecret = API_CONFIG.ZOOM_CONFIG.SDK_SECRET
}) {
  if (!sdkKey || !sdkSecret) {
    console.warn("Zoom SDK Key or Secret missing. Using HRHub internal WebRTC fallback.");
    return null;
  }

  const cleanMeetingNumber = String(meetingNumber).replace(/\D/g, "");
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours valid

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sdkKey: sdkKey,
    mn: cleanMeetingNumber,
    role: role,
    iat: iat,
    exp: exp,
    tokenExp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  try {
    // Browser Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(sdkSecret);
    const messageData = encoder.encode(unsignedToken);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureString = String.fromCharCode.apply(null, signatureArray);
    const encodedSignature = base64UrlEncode(signatureString);

    return `${unsignedToken}.${encodedSignature}`;
  } catch (err) {
    console.error("Zoom signature generation error:", err);
    return null;
  }
}

/**
 * Dynamically loads official Zoom Web SDK CDN scripts into document head
 */
export function loadZoomWebSdkScripts() {
  return new Promise((resolve, reject) => {
    if (window.ZoomMtg) {
      resolve(window.ZoomMtg);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://source.zoom.us/3.1.6/css/bootstrap.css";
    document.head.appendChild(cssLink);

    const cssLink2 = document.createElement("link");
    cssLink2.rel = "stylesheet";
    cssLink2.href = "https://source.zoom.us/3.1.6/css/react-select.css";
    document.head.appendChild(cssLink2);

    const script = document.createElement("script");
    script.src = "https://source.zoom.us/3.1.6/zoom-meeting-3.1.6.min.js";
    script.async = true;
    script.onload = () => {
      if (window.ZoomMtg) {
        window.ZoomMtg.setZoomJSLib("https://source.zoom.us/3.1.6/lib", "/av");
        window.ZoomMtg.preLoadWasm();
        window.ZoomMtg.prepareWebSDK();
        resolve(window.ZoomMtg);
      } else {
        reject(new Error("ZoomMtg script failed to load"));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Check if Zoom credentials are ready in the frontend
 */
export function isZoomConfigured() {
  return Boolean(
    API_CONFIG.ZOOM_CONFIG?.SDK_KEY &&
    API_CONFIG.ZOOM_CONFIG?.SDK_SECRET &&
    API_CONFIG.ZOOM_CONFIG.SDK_KEY.length > 5
  );
}

/**
 * Leave/End Zoom Web SDK session
 */
export function leaveZoomMeeting() {
  if (window.ZoomMtg) {
    try {
      window.ZoomMtg.leaveMeeting({});
    } catch (e) {
      console.warn("Leave Zoom meeting notice:", e);
    }
  }
}

/**
 * In-App Zoom SDK Join Room Controller
 */
export async function joinZoomMeetingInApp({
  meetingNumber,
  passcode = "",
  userName = "HR Administrator",
  userEmail = "hr.admin@hrhub.com",
  role = 0,
  onSuccess,
  onError
}) {
  try {
    const signature = await generateZoomSDKSignature({ meetingNumber, role });

    if (!signature) {
      if (onError) onError(new Error("No Zoom SDK Credentials configured in API_CONFIG. Using HRHub internal WebRTC."));
      return false;
    }

    // Ensure #zmmtg-root exists
    if (!document.getElementById("zmmtg-root")) {
      const zRoot = document.createElement("div");
      zRoot.id = "zmmtg-root";
      document.body.appendChild(zRoot);
    }

    const ZoomMtg = await loadZoomWebSdkScripts();
    const cleanMeetingNumber = String(meetingNumber).replace(/\D/g, "");

    ZoomMtg.init({
      leaveUrl: window.location.href,
      isSupportAV: true,
      success: () => {
        ZoomMtg.join({
          signature: signature,
          sdkKey: API_CONFIG.ZOOM_CONFIG.SDK_KEY,
          meetingNumber: cleanMeetingNumber,
          passWord: passcode,
          userName: userName,
          userEmail: userEmail,
          success: (res) => {
            console.log("Zoom Web SDK joined successfully:", res);
            if (onSuccess) onSuccess(res);
          },
          error: (res) => {
            console.error("Zoom Web SDK Join error:", res);
            if (onError) onError(res);
          }
        });
      },
      error: (res) => {
        console.error("Zoom Web SDK Init error:", res);
        if (onError) onError(res);
      }
    });

    return true;
  } catch (err) {
    console.error("joinZoomMeetingInApp error:", err);
    if (onError) onError(err);
    return false;
  }
}

