const LIVE_PORTAL_URL = "https://hrhub-app.vercel.app/";

export function getPortalInviteUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    if (!/localhost|127\.0\.0\.1/i.test(origin)) {
      return `${origin.replace(/\/$/, "")}/`;
    }
  }
  return LIVE_PORTAL_URL;
}

function getPublicAssetOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    if (/^https:\/\//i.test(origin) && !/localhost|127\.0\.0\.1/i.test(origin)) {
      return origin.replace(/\/$/, "");
    }
  }
  return "https://hrhub-app.vercel.app";
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatInviteDisplayName(employee) {
  const email = (employee?.email || "").trim();
  return (
    employee?.name?.trim() ||
    (email ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee")
  );
}

export function buildActivationPlainText(employee, portalUrl = getPortalInviteUrl()) {
  const email = (employee?.email || "").trim();
  return `Hi! You have been registered in the HrHub portal. Please go to ${portalUrl}, click "First-Time Setup", and enter your email (${email}) to create your personal password.`;
}

export function buildActivationRichHtml(employee, portalUrl = getPortalInviteUrl()) {
  const assetOrigin = getPublicAssetOrigin();
  const logoEmblemUrl = `${assetOrigin}/hrhub-logo.png`;
  const email = (employee?.email || "").trim();
  const displayName = formatInviteDisplayName(employee);
  const company = employee?.company?.trim() || "Simpal Group of Companies";
  const role = employee?.role?.trim() || "Team Member";

  return `
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:16px;overflow:hidden;background:#ffffff;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-bottom:3px solid #10b981;">
    <tr>
      <td style="padding:20px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <img src="${escapeHtml(logoEmblemUrl)}" alt="HRHub Logo" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:10px;border:1px solid #34d399;background:#09141d;" />
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:22px;font-weight:800;line-height:1.1;color:#ffffff;letter-spacing:-0.4px;">HR<span style="color:#34d399;">Hub</span></div>
              <div style="font-size:10px;font-weight:700;letter-spacing:1.6px;color:#a7f3d0;text-transform:uppercase;margin-top:3px;">Simpal Group &bull; Official Employee Portal</div>
            </td>
          </tr>
        </table>
      </td>
      <td align="right" style="padding:20px 24px;vertical-align:middle;">
        <span style="display:inline-block;background:#064e3b;border:1px solid #34d399;color:#6ee7b7;font-size:10px;font-weight:800;padding:5px 10px;border-radius:999px;letter-spacing:0.8px;text-transform:uppercase;">Pre-Registered Account</span>
      </td>
    </tr>
  </table>
  <div style="padding:24px;">
    <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#0f172a;">Hi ${escapeHtml(displayName)},</p>
    <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#334155;">
      Hi! You have been registered in the <strong>HrHub portal</strong>. Please go to
      <a href="${escapeHtml(portalUrl)}" style="color:#059669;font-weight:700;text-decoration:underline;">${escapeHtml(portalUrl)}</a>,
      click <strong>&ldquo;First-Time Setup&rdquo;</strong>, and enter your email
      (<strong style="color:#0f172a;">${escapeHtml(email)}</strong>) to create your personal password.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:18px;">
      <tr>
        <td style="padding:14px 16px;font-size:12px;color:#475569;">
          <div style="margin-bottom:6px;"><strong style="color:#0f172a;">Registered Email:</strong> <span style="font-family:Consolas,monospace;color:#047857;font-weight:700;">${escapeHtml(email)}</span></div>
          <div style="margin-bottom:6px;"><strong style="color:#0f172a;">Organization:</strong> ${escapeHtml(company)}</div>
          <div><strong style="color:#0f172a;">Role / Designation:</strong> ${escapeHtml(role)}</div>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin:20px 0 8px 0;">
      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#059669;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:10px;">
        Open HRHub Portal &rarr; Click &ldquo;First-Time Setup&rdquo;
      </a>
    </div>
  </div>
  <div style="padding:12px 24px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
    HRHub &bull; Simpal Group of Companies Personnel Governance
  </div>
</div>`.trim();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapTextLines(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadSameOriginImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 1500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

export async function renderInviteCardPngBlob(employee, portalUrl = getPortalInviteUrl()) {
  const canvas = document.createElement("canvas");
  const W = 1200;
  const H = 760;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const email = (employee?.email || "").trim();
  const displayName = formatInviteDisplayName(employee);
  const company = employee?.company?.trim() || "Simpal Group of Companies";
  const role = employee?.role?.trim() || "Team Member";
  const messageText = buildActivationPlainText(employee, portalUrl);

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, W, H);

  drawRoundedRect(ctx, 40, 36, W - 80, H - 72, 34);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#cbd5e1";
  ctx.stroke();

  ctx.save();
  drawRoundedRect(ctx, 40, 36, W - 80, H - 72, 34);
  ctx.clip();

  const hdrGrad = ctx.createLinearGradient(40, 36, W - 40, 220);
  hdrGrad.addColorStop(0, "#09141d");
  hdrGrad.addColorStop(0.65, "#0f172a");
  hdrGrad.addColorStop(1, "#064e3b");
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(40, 36, W - 80, 184);

  ctx.fillStyle = "#10b981";
  ctx.fillRect(40, 216, W - 80, 4);

  const logoImg = await loadSameOriginImage("/hrhub-logo.png");
  if (logoImg) {
    ctx.drawImage(logoImg, 84, 72, 112, 112);
  } else {
    drawRoundedRect(ctx, 84, 72, 112, 112, 26);
    ctx.fillStyle = "#10b981";
    ctx.fill();
    ctx.fillStyle = "#09141d";
    ctx.font = "900 66px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", 140, 130);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "900 54px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  const hrWidth = ctx.measureText("HR").width;
  ctx.fillText("HR", 220, 128);
  ctx.fillStyle = "#34d399";
  ctx.fillText("Hub", 220 + hrWidth, 128);

  ctx.font = "700 17px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = "#a7f3d0";
  ctx.fillText("SIMPAL GROUP OF COMPANIES  •  OFFICIAL HR PORTAL", 222, 162);

  drawRoundedRect(ctx, W - 360, 96, 272, 46, 23);
  ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#34d399";
  ctx.stroke();
  ctx.fillStyle = "#6ee7b7";
  ctx.font = "800 15px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PRE-REGISTERED ACCOUNT", W - 224, 124);

  const drawFittedText = (text, x, y, maxWidth, startPx, minPx, weight, family) => {
    let size = startPx;
    while (size > minPx) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    ctx.fillText(text, x, y, maxWidth);
  };

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  drawFittedText(`Welcome to HRHub, ${displayName}!`, 88, 282, W - 176, 28, 18, "800", "'Segoe UI', Arial, sans-serif");

  drawRoundedRect(ctx, 88, 308, W - 176, 148, 20);
  ctx.fillStyle = "#ecfdf5";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#a7f3d0";
  ctx.stroke();

  ctx.fillStyle = "#065f46";
  ctx.font = "600 22px 'Segoe UI', Arial, sans-serif";
  const lines = wrapTextLines(ctx, messageText, W - 232);
  let textY = 352;
  for (const line of lines.slice(0, 4)) {
    ctx.fillText(line, 116, textY);
    textY += 32;
  }

  drawRoundedRect(ctx, 88, 476, 502, 102, 18);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "800 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("REGISTERED ACCOUNT EMAIL", 114, 508);
  ctx.fillStyle = "#047857";
  drawFittedText(email, 114, 544, 450, 21, 13, "700", "Consolas, 'Courier New', monospace");

  drawRoundedRect(ctx, 610, 476, 502, 102, 18);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "800 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("COMPANY ENTITY & DESIGNATION", 636, 508);
  ctx.fillStyle = "#0f172a";
  drawFittedText(company, 636, 540, 450, 20, 14, "700", "'Segoe UI', Arial, sans-serif");
  ctx.fillStyle = "#475569";
  drawFittedText(`Role: ${role}`, 636, 564, 450, 15, 12, "600", "'Segoe UI', Arial, sans-serif");

  const steps = [
    "1. Open HRHub Portal",
    '2. Click "First-Time Setup"',
    "3. Enter Email & Set Password"
  ];
  const stepWidth = 328;
  steps.forEach((step, idx) => {
    const sx = 88 + idx * (stepWidth + 20);
    drawRoundedRect(ctx, sx, 598, stepWidth, 56, 16);
    ctx.fillStyle = idx === 1 ? "#0f172a" : "#f1f5f9";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = idx === 1 ? "#0f172a" : "#cbd5e1";
    ctx.stroke();

    ctx.fillStyle = idx === 1 ? "#34d399" : "#1e293b";
    ctx.font = "700 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(step, sx + stepWidth / 2, 632);
  });

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(40, H - 82, W - 80, 46);
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(40, H - 82);
  ctx.lineTo(W - 40, H - 82);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("Official Onboarding Notice • Use the First-Time Setup tab to activate access", 88, H - 53);
  ctx.textAlign = "right";
  ctx.fillStyle = "#059669";
  ctx.font = "800 14px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(portalUrl, W - 88, H - 53);

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function copyRichInviteToClipboard(employee, portalUrl = getPortalInviteUrl()) {
  const plainText = buildActivationPlainText(employee, portalUrl);
  const htmlText = buildActivationRichHtml(employee, portalUrl);

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlText], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" })
        })
      ]);
      return { mode: "rich_html", plainText };
    } catch {
      // Fallback to plain text if rich ClipboardItem is blocked
    }
  }

  await navigator.clipboard?.writeText(plainText);
  return { mode: "plain_text", plainText };
}

