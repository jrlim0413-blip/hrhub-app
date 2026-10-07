import { useState, useRef, useEffect, useMemo } from "react";
import {
  Printer, Download, Upload, RotateCcw, X, Image as ImageIcon,
  Check, FileText, Sparkles, User, AlertCircle, Eye, Sliders,
  Layers, ChevronDown, ZoomIn, ArrowLeftRight, Save, CheckCircle2,
  PenTool
} from "lucide-react";
import jsPDF from "jspdf";
import { processSignatureToTransparentPng } from "../lib/signatureImageProcessor";
import { processPhotoToWhiteBackground } from "../lib/photoBackgroundProcessor";

const DEFAULT_CENTER_LOGO = "/id-assets/lucky_betplay_sunburst.png";
const DEFAULT_PCSO_LOGO = "/id-assets/pcso_logo.svg";
const DEFAULT_STL_LOGO = "/id-assets/stl_logo_perfect.png";
const DEFAULT_MANAGER_SIGNATURE = "/id-assets/signature_charmie_transparent.png";

// Base factory template defaults
const FACTORY_DEFAULTS = {
  companyName: "LUCKY BETPLAY CORPORATION",
  companySubtitle1: "PCSO STL Authorized Agent Corporation",
  companySubtitle2: "Mandaue City",
  roleTitle: "SALES REPRESENTATIVE",
  officeAddressLine1: "PCSO STL Authorized Agent Corporation",
  officeAddressLine2: "Ground Floor, PCSO Building, Sergio Osmeña Street,",
  officeAddressLine3: "North Reclamation Area (NRA), Carreta, Cebu City",
  areaOfOperation: "MANDAUE CITY, CEBU",
  certifiedByName: "CHARMIE JEAN M. SIMPAL",
  certifiedByTitle: "OPERATIONS MANAGER",
  confirmedByName: "Atty. Madel Hyacinth H. Herrera-Ramos",
  confirmedByTitle: "OIC-Branch Manager",
  pcsoBranchName: "PCSO CEBU BRANCH",
  showSignatureGraphic: true,
  showConfirmedSignatureGraphic: true,
  managerSignature: DEFAULT_MANAGER_SIGNATURE,
  confirmedSignature: "",
  centerLogo: DEFAULT_CENTER_LOGO,
  rightLogo: DEFAULT_STL_LOGO,
  centerLogoSize: 100,
  rightLogoSize: 100,
  pcsoLogoSize: 100
};

function getSavedTemplateDefaults() {
  try {
    const saved = localStorage.getItem("hrhub_id_template_defaults");
    if (saved) {
      return { ...FACTORY_DEFAULTS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Could not load saved ID template defaults:", e);
  }
  return FACTORY_DEFAULTS;
}

export default function AgentIdCardModal({
  agent,
  agentKey,
  initialData = {},
  uploadedRequirements = [],
  onClose
}) {
  // Load saved global template defaults (applies to all agents)
  const [templateDefaults, setTemplateDefaults] = useState(getSavedTemplateDefaults);

  // Center logo customizer
  const [centerLogo, setCenterLogo] = useState(templateDefaults.centerLogo || DEFAULT_CENTER_LOGO);

  // Right logo customizer
  const [rightLogo, setRightLogo] = useState(templateDefaults.rightLogo || DEFAULT_STL_LOGO);

  // Logo Size Sliders (50% to 180%)
  const [centerLogoSize, setCenterLogoSize] = useState(templateDefaults.centerLogoSize || 100);
  const [rightLogoSize, setRightLogoSize] = useState(templateDefaults.rightLogoSize || 100);
  const [pcsoLogoSize, setPcsoLogoSize] = useState(templateDefaults.pcsoLogoSize || 100);

  // Signatory Signatures (Auto-transparent PNG)
  const [managerSignature, setManagerSignature] = useState(
    templateDefaults.managerSignature !== undefined ? templateDefaults.managerSignature : DEFAULT_MANAGER_SIGNATURE
  );
  const [confirmedSignature, setConfirmedSignature] = useState(
    templateDefaults.confirmedSignature || ""
  );
  const [isProcessingSig, setIsProcessingSig] = useState(null); // null | "manager" | "confirmed" | "front"

  // Front Agent Signature (uploadable)
  const [frontSignature, setFrontSignature] = useState(() => {
    // Check if agent has a signature file in uploaded requirements
    if (uploadedRequirements && uploadedRequirements.length > 0) {
      const sigReq = uploadedRequirements.find((r) =>
        r.name?.toLowerCase().includes("signature") ||
        r.name?.toLowerCase().includes("pirma") ||
        r.name?.toLowerCase().includes("sign")
      );
      if (sigReq && sigReq.url) return sigReq.url;
    }
    return "";
  });

  // Selected agent photo (can be from requirements, custom upload, or blank)
  const [agentPhoto, setAgentPhoto] = useState(() => {
    if (uploadedRequirements && uploadedRequirements.length > 0) {
      const foundPic = uploadedRequirements.find((r) =>
        r.name?.toLowerCase().includes("2x2") ||
        r.name?.toLowerCase().includes("photo") ||
        r.name?.toLowerCase().includes("picture") ||
        r.name?.toLowerCase().includes("id")
      );
      if (foundPic && foundPic.url) return foundPic.url;
      if (uploadedRequirements[0]?.url) return uploadedRequirements[0].url;
    }
    return "";
  });
  const [rawUploadedPhoto, setRawUploadedPhoto] = useState(() => agentPhoto || "");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoWhiteBgActive, setPhotoWhiteBgActive] = useState(true);
  const [photoBackdropType, setPhotoBackdropType] = useState("");
  const [photoTolerance, setPhotoTolerance] = useState(42);
  const [showPhotoSettings, setShowPhotoSettings] = useState(false);

  // Print layout mode: fixed to "top-side-by-side" (A4 Portrait, Side-by-Side at Top Edge)
  const printLayout = "top-side-by-side";
  const [isExporting, setIsExporting] = useState(false);
  const [controlsTab, setControlsTab] = useState("company"); // "company" | "fields" | "logos" | "photo_sig"
  const [defaultSavedToast, setDefaultSavedToast] = useState("");

  // Clean agent name without arrows (« or »)
  const cleanInitialName = (initialData.fullName || agent?.fullName || agent?.full_name || agent?.name || "")
    .replace(/[«»]/g, "")
    .trim();

  // Clean ID number without arrows
  const cleanInitialId = (initialData.idNumber || agent?.agent_id || agent?.agentId || "")
    .replace(/[«»]/g, "")
    .trim();

  // Form state for all editable and underlined fields
  const [fields, setFields] = useState({
    agentName: cleanInitialName,
    idNumber: cleanInitialId,
    roleTitle: (initialData.role || agent?.role || agent?.position || templateDefaults.roleTitle || "SALES REPRESENTATIVE").replace(/[«»]/g, ""),
    companyName: templateDefaults.companyName || "LUCKY BETPLAY CORPORATION",
    companySubtitle1: templateDefaults.companySubtitle1 || "PCSO STL Authorized Agent Corporation",
    companySubtitle2: templateDefaults.companySubtitle2 || "Mandaue City",
    officeAddressLine1: templateDefaults.officeAddressLine1 || "PCSO STL Authorized Agent Corporation",
    officeAddressLine2: templateDefaults.officeAddressLine2 || "Ground Floor, PCSO Building, Sergio Osmeña Street,",
    officeAddressLine3: templateDefaults.officeAddressLine3 || "North Reclamation Area (NRA), Carreta, Cebu City",
    areaOfOperation: templateDefaults.areaOfOperation || "MANDAUE CITY, CEBU",
    emergencyName: (initialData.emergencyName || agent?.emergency_contact_name || agent?.emergencyName || "").replace(/[«»]/g, ""),
    emergencyContact: (initialData.emergencyContactNumber || agent?.emergency_contact_number || agent?.emergencyPhone || "").replace(/[«»]/g, ""),
    certifiedByName: templateDefaults.certifiedByName || "CHARMIE JEAN M. SIMPAL",
    certifiedByTitle: templateDefaults.certifiedByTitle || "OPERATIONS MANAGER",
    confirmedByName: templateDefaults.confirmedByName || "Atty. Madel Hyacinth H. Herrera-Ramos",
    confirmedByTitle: templateDefaults.confirmedByTitle || "OIC-Branch Manager",
    pcsoBranchName: templateDefaults.pcsoBranchName || "PCSO CEBU BRANCH",
    showSignatureGraphic: templateDefaults.showSignatureGraphic ?? true,
    showConfirmedSignatureGraphic: templateDefaults.showConfirmedSignatureGraphic ?? true
  });

  // Dynamic single-line font sizing for AAC Company Name
  const aacDynamicFontSize = useMemo(() => {
    const rawName = (fields.companyName || "LUCKY BETPLAY CORPORATION").trim();
    const len = rawName.length;
    if (len <= 24) return 20.5;
    if (len <= 27) return 19;
    if (len <= 31) return 17;
    if (len <= 36) return 15;
    if (len <= 42) return 13.5;
    if (len <= 50) return 12;
    return Math.max(10, Math.floor((356 / (len * 11)) * 20.5 * 10) / 10);
  }, [fields.companyName]);

  const subtitle1DynamicFontSize = useMemo(() => {
    const raw = (fields.companySubtitle1 || "PCSO STL Authorized Agent Corporation").trim();
    const len = raw.length;
    if (len <= 38) return 12;
    if (len <= 45) return 10.5;
    return 9.5;
  }, [fields.companySubtitle1]);

  const printAreaRef = useRef(null);
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const centerLogoInputRef = useRef(null);
  const rightLogoInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const frontSigInputRef = useRef(null);
  const managerSigInputRef = useRef(null);
  const confirmedSigInputRef = useRef(null);

  // =========================================================================
  // SET AS DEFAULT FOR ALL AGENTS (GLOBAL PERSISTENCE)
  // =========================================================================
  const handleSaveAsDefault = () => {
    const newDefaults = {
      companyName: fields.companyName,
      companySubtitle1: fields.companySubtitle1,
      companySubtitle2: fields.companySubtitle2,
      roleTitle: fields.roleTitle,
      officeAddressLine1: fields.officeAddressLine1,
      officeAddressLine2: fields.officeAddressLine2,
      officeAddressLine3: fields.officeAddressLine3,
      areaOfOperation: fields.areaOfOperation,
      certifiedByName: fields.certifiedByName,
      certifiedByTitle: fields.certifiedByTitle,
      confirmedByName: fields.confirmedByName,
      confirmedByTitle: fields.confirmedByTitle,
      pcsoBranchName: fields.pcsoBranchName,
      showSignatureGraphic: fields.showSignatureGraphic,
      showConfirmedSignatureGraphic: fields.showConfirmedSignatureGraphic,
      managerSignature,
      confirmedSignature,
      centerLogo,
      rightLogo,
      centerLogoSize,
      rightLogoSize,
      pcsoLogoSize
    };

    try {
      localStorage.setItem("hrhub_id_template_defaults", JSON.stringify(newDefaults));
      setTemplateDefaults(newDefaults);
      setDefaultSavedToast("Default template saved! Signatures, signatories, AAC details & logos will now apply to ALL agents.");
      setTimeout(() => setDefaultSavedToast(""), 4500);
    } catch (err) {
      console.error("Failed to save template defaults:", err);
    }
  };

  const handleResetToFactory = () => {
    try {
      localStorage.removeItem("hrhub_id_template_defaults");
      setTemplateDefaults(FACTORY_DEFAULTS);
      setCenterLogo(FACTORY_DEFAULTS.centerLogo);
      setRightLogo(FACTORY_DEFAULTS.rightLogo);
      setCenterLogoSize(FACTORY_DEFAULTS.centerLogoSize);
      setRightLogoSize(FACTORY_DEFAULTS.rightLogoSize);
      setPcsoLogoSize(FACTORY_DEFAULTS.pcsoLogoSize);
      setManagerSignature(FACTORY_DEFAULTS.managerSignature);
      setConfirmedSignature(FACTORY_DEFAULTS.confirmedSignature);
      setFields((prev) => ({
        ...prev,
        companyName: FACTORY_DEFAULTS.companyName,
        companySubtitle1: FACTORY_DEFAULTS.companySubtitle1,
        companySubtitle2: FACTORY_DEFAULTS.companySubtitle2,
        roleTitle: FACTORY_DEFAULTS.roleTitle,
        officeAddressLine1: FACTORY_DEFAULTS.officeAddressLine1,
        officeAddressLine2: FACTORY_DEFAULTS.officeAddressLine2,
        officeAddressLine3: FACTORY_DEFAULTS.officeAddressLine3,
        areaOfOperation: FACTORY_DEFAULTS.areaOfOperation,
        certifiedByName: FACTORY_DEFAULTS.certifiedByName,
        certifiedByTitle: FACTORY_DEFAULTS.certifiedByTitle,
        confirmedByName: FACTORY_DEFAULTS.confirmedByName,
        confirmedByTitle: FACTORY_DEFAULTS.confirmedByTitle,
        pcsoBranchName: FACTORY_DEFAULTS.pcsoBranchName,
        showSignatureGraphic: FACTORY_DEFAULTS.showSignatureGraphic,
        showConfirmedSignatureGraphic: FACTORY_DEFAULTS.showConfirmedSignatureGraphic
      }));
      setDefaultSavedToast("Reset to factory defaults completed.");
      setTimeout(() => setDefaultSavedToast(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick action: Clear all underlines to keep them blank for manual writing or blank template
  const handleClearUnderlines = () => {
    setFields((prev) => ({
      ...prev,
      agentName: "",
      idNumber: "",
      emergencyName: "",
      emergencyContact: ""
    }));
    setAgentPhoto("");
    setRawUploadedPhoto("");
    setPhotoWhiteBgActive(true);
    setFrontSignature("");
  };

  // Quick action: Auto-fill fields with current agent data
  const handleFillAgentData = () => {
    const rawName = (initialData.fullName || agent?.fullName || agent?.full_name || agent?.name || "").replace(/[«»]/g, "").trim();
    const rawId = (initialData.idNumber || agent?.agent_id || agent?.agentId || "").replace(/[«»]/g, "").trim();
    const rawEmerName = (initialData.emergencyName || agent?.emergency_contact_name || agent?.emergencyName || "").replace(/[«»]/g, "").trim();
    const rawEmerPhone = (initialData.emergencyContactNumber || agent?.emergency_contact_number || agent?.emergencyPhone || "").replace(/[«»]/g, "").trim();

    setFields((prev) => ({
      ...prev,
      agentName: rawName || "AGENT NAME",
      idNumber: rawId || "001",
      roleTitle: (initialData.role || agent?.role || agent?.position || templateDefaults.roleTitle || "SALES REPRESENTATIVE").replace(/[«»]/g, ""),
      emergencyName: rawEmerName,
      emergencyContact: rawEmerPhone
    }));

    if (uploadedRequirements && uploadedRequirements.length > 0) {
      const foundPic = uploadedRequirements.find((r) =>
        r.name?.toLowerCase().includes("2x2") ||
        r.name?.toLowerCase().includes("photo") ||
        r.name?.toLowerCase().includes("picture")
      );
      if (foundPic && foundPic.url) {
        handlePickRequirementPhoto(foundPic.url);
      } else if (uploadedRequirements[0]?.url) {
        handlePickRequirementPhoto(uploadedRequirements[0].url);
      }

      const sigReq = uploadedRequirements.find((r) =>
        r.name?.toLowerCase().includes("signature") ||
        r.name?.toLowerCase().includes("pirma") ||
        r.name?.toLowerCase().includes("sign")
      );
      if (sigReq && sigReq.url) {
        setFrontSignature(sigReq.url);
      }
    }
  };

  // Center logo upload
  const handleCenterLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCenterLogo(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Right logo upload
  const handleRightLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRightLogo(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Automatic background removal for Operations Manager Signature (Certified by)
  const handleManagerSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingSig("manager");
    try {
      const transparentPng = await processSignatureToTransparentPng(file);
      setManagerSignature(transparentPng);
      updateField("showSignatureGraphic", true);
      setDefaultSavedToast("Operations Manager signature converted to transparent PNG!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.error("Error processing manager signature:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setManagerSignature(reader.result);
        updateField("showSignatureGraphic", true);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingSig(null);
      e.target.value = "";
    }
  };

  // Automatic background removal for Branch Manager Signature (Confirmed by)
  const handleConfirmedSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingSig("confirmed");
    try {
      const transparentPng = await processSignatureToTransparentPng(file);
      setConfirmedSignature(transparentPng);
      updateField("showConfirmedSignatureGraphic", true);
      setDefaultSavedToast("Branch Manager signature converted to transparent PNG!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.error("Error processing branch manager signature:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setConfirmedSignature(reader.result);
        updateField("showConfirmedSignatureGraphic", true);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingSig(null);
      e.target.value = "";
    }
  };

  // Front agent signature upload with automatic transparent PNG conversion
  const handleFrontSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingSig("front");
    try {
      const transparentPng = await processSignatureToTransparentPng(file);
      setFrontSignature(transparentPng);
      setDefaultSavedToast("Agent signature converted to transparent PNG!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.error("Error processing front signature:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setFrontSignature(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingSig(null);
      e.target.value = "";
    }
  };

  // Pick requirement signature and auto-convert to clean transparent PNG
  const handlePickRequirementSignature = async (url) => {
    setIsProcessingSig("front");
    try {
      const transparentPng = await processSignatureToTransparentPng(url);
      setFrontSignature(transparentPng);
      setDefaultSavedToast("Requirement signature converted to transparent PNG!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.warn("Could not auto-process requirement signature:", err);
      setFrontSignature(url);
    } finally {
      setIsProcessingSig(null);
    }
  };

  // Custom 2x2 photo upload with automatic solid white background (#FFFFFF) conversion
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const { dataUrl, originalUrl, backdropType } = await processPhotoToWhiteBackground(file, {
        tolerance: photoTolerance
      });
      setRawUploadedPhoto(originalUrl);
      setAgentPhoto(dataUrl);
      setPhotoBackdropType(backdropType);
      setPhotoWhiteBgActive(true);
      setDefaultSavedToast("2x2 Photo background automatically converted to pure white!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.error("Error processing photo background:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setAgentPhoto(reader.result);
        setRawUploadedPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = "";
    }
  };

  // Pick requirement photo with automatic white background conversion
  const handlePickRequirementPhoto = async (url) => {
    setIsProcessingPhoto(true);
    try {
      const { dataUrl, originalUrl, backdropType } = await processPhotoToWhiteBackground(url, {
        tolerance: photoTolerance
      });
      setRawUploadedPhoto(originalUrl);
      setAgentPhoto(dataUrl);
      setPhotoBackdropType(backdropType);
      setPhotoWhiteBgActive(true);
      setDefaultSavedToast("Requirement photo converted to clean white background!");
      setTimeout(() => setDefaultSavedToast(""), 3500);
    } catch (err) {
      console.warn("Could not auto-whiten requirement photo:", err);
      setAgentPhoto(url);
      setRawUploadedPhoto(url);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Toggle between auto-whitened 2x2 photo and original photo
  const handleTogglePhotoWhiteBg = async () => {
    if (!rawUploadedPhoto && !agentPhoto) return;
    if (photoWhiteBgActive) {
      if (rawUploadedPhoto) {
        setAgentPhoto(rawUploadedPhoto);
        setPhotoWhiteBgActive(false);
        setDefaultSavedToast("Showing original photo");
        setTimeout(() => setDefaultSavedToast(""), 2500);
      }
    } else {
      await handleReapplyWhiteBg(photoTolerance);
    }
  };

  // Re-apply or fine-tune white background with custom tolerance
  const handleReapplyWhiteBg = async (customTolerance) => {
    const src = rawUploadedPhoto || agentPhoto;
    if (!src) return;
    setIsProcessingPhoto(true);
    try {
      const tol = typeof customTolerance === "number" ? customTolerance : photoTolerance;
      const { dataUrl, backdropType } = await processPhotoToWhiteBackground(src, {
        tolerance: tol
      });
      setAgentPhoto(dataUrl);
      setPhotoBackdropType(backdropType);
      setPhotoWhiteBgActive(true);
      setDefaultSavedToast("Pure white background updated!");
      setTimeout(() => setDefaultSavedToast(""), 2500);
    } catch (err) {
      console.error("Failed to re-apply white background:", err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Manage print class on body & clean up dynamic @page style
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-agent-id-card");
      const pageStyle = document.getElementById("id-card-a4-page-style");
      if (pageStyle) {
        pageStyle.remove();
      }
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-agent-id-card");
      const pageStyle = document.getElementById("id-card-a4-page-style");
      if (pageStyle) {
        pageStyle.remove();
      }
    };
  }, []);

  // Trigger high-resolution printing configured strictly for A4 coupon bond (210 × 297 mm)
  // Cards are positioned side-by-side right at the absolute top edge (0mm)
  // Preserves ~182mm (over 61%) of clean, blank coupon bond below for future printing
  const handlePrint = async () => {
    try {
      setIsExporting(true);
      const [frontCanvas, backCanvas] = await Promise.all([
        renderCardToCanvas("front"),
        renderCardToCanvas("back")
      ]);

      const frontImg = frontCanvas.toDataURL("image/png");
      const backImg = backCanvas.toDataURL("image/png");

      // Remove any existing print iframe
      const existingIframe = document.getElementById("agent-id-print-frame");
      if (existingIframe) {
        existingIframe.remove();
      }

      const printIframe = document.createElement("iframe");
      printIframe.id = "agent-id-print-frame";
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent ID Card - Print</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      background: #ffffff !important;
      overflow: hidden !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-sheet {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding-top: 5mm;
      padding-left: 4.5mm;
      padding-right: 4.5mm;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: flex-start;
      gap: 2mm;
    }
    .card-print-image {
      width: 99.5mm;
      height: 140mm;
      display: block;
      border: 2px solid #000000;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    <img id="print-card-front" class="card-print-image" src="${frontImg}" alt="Front ID" />
    <img id="print-card-back" class="card-print-image" src="${backImg}" alt="Back ID" />
  </div>
</body>
</html>`);
      iframeDoc.close();

      const imgFront = iframeDoc.getElementById("print-card-front");
      const imgBack = iframeDoc.getElementById("print-card-back");

      await Promise.all([
        new Promise((res) => {
          if (imgFront.complete) return res();
          imgFront.onload = res;
          imgFront.onerror = res;
        }),
        new Promise((res) => {
          if (imgBack.complete) return res();
          imgBack.onload = res;
          imgBack.onerror = res;
        })
      ]);

      setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 2000);
      }, 150);

    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Update field helper
  const updateField = (name, value) => {
    const cleanVal = typeof value === "string" ? value.replace(/[«»]/g, "") : value;
    setFields((prev) => ({ ...prev, [name]: cleanVal }));
  };

  // =========================================================================
  // HIGH RESOLUTION CANVAS ENGINE: 1200 × 1500 PIXELS @ 300 DPI
  // =========================================================================
  const renderCardToCanvas = async (side = "front", targetCanvas = null) => {
    const canvas = targetCanvas || document.createElement("canvas");
    if (canvas.width !== 1200) canvas.width = 1200;
    if (canvas.height !== 1500) canvas.height = 1500;
    const ctx = canvas.getContext("2d");

    // Pure white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1200, 1500);

    const loadImage = (src) => new Promise((resolve) => {
      if (!src) return resolve(null);
      if (imageCacheRef.current.has(src)) {
        const cached = imageCacheRef.current.get(src);
        if (cached && (cached.complete || cached.naturalWidth > 0)) {
          return resolve(cached);
        }
      }
      const img = new Image();
      if (src.startsWith("http://") || src.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        resolve(img);
      };
      img.onerror = (e) => {
        console.warn("Could not load image for ID card:", src, e);
        resolve(null);
      };
      img.src = src;
    });

    if (side === "front") {
      const [pcsoImg, centerImg, stlImg, photoImg, frontSigImg] = await Promise.all([
        loadImage(DEFAULT_PCSO_LOGO),
        loadImage(centerLogo),
        loadImage(rightLogo),
        agentPhoto ? loadImage(agentPhoto) : null,
        frontSignature ? loadImage(frontSignature) : null
      ]);

      // 1. Top Logos (Scaled by user sliders)
      const pcsoScale = pcsoLogoSize / 100;
      const centerScale = centerLogoSize / 100;
      const rightScale = rightLogoSize / 100;

      // PCSO Logo
      if (pcsoImg) {
        const pcsoW = 140 * pcsoScale;
        const pcsoH = 140 * pcsoScale;
        ctx.drawImage(pcsoImg, 70 + (140 - pcsoW) / 2, 45 + (140 - pcsoH) / 2, pcsoW, pcsoH);
      }
      ctx.fillStyle = "#000000";
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PCSO", 140, 215);

      // Center Logo
      if (centerImg) {
        const maxW = 300 * centerScale;
        const maxH = 175 * centerScale;
        const ratio = Math.min(maxW / centerImg.width, maxH / centerImg.height, 1.8);
        const w = centerImg.width * ratio;
        const h = centerImg.height * ratio;
        ctx.drawImage(centerImg, 600 - w / 2, 45 + (175 - h) / 2, w, h);
      }

      // Right Logo
      if (stlImg) {
        const rightW = 140 * rightScale;
        const rightH = 140 * rightScale;
        ctx.drawImage(stlImg, (1200 - 210) + (140 - rightW) / 2, 45 + (140 - rightH) / 2, rightW, rightH);
      }

      // Company header (Editable AAC Name - Automatic single-line scaling for any length name)
      const companyNameText = (fields.companyName || "LUCKY BETPLAY CORPORATION").trim();
      const maxCompanyWidth = 1060; // Max allowed width within 1200px canvas (70px margins each side)
      let companyFontSize = 64; // Default starting large size
      const minCompanyFontSize = 26; // Minimum size for exceptionally long corporation names
      
      ctx.font = `bold ${companyFontSize}px 'Segoe UI', Arial, sans-serif`;
      let measuredCompanyWidth = ctx.measureText(companyNameText).width;
      
      while (measuredCompanyWidth > maxCompanyWidth && companyFontSize > minCompanyFontSize) {
        companyFontSize -= 1;
        ctx.font = `bold ${companyFontSize}px 'Segoe UI', Arial, sans-serif`;
        measuredCompanyWidth = ctx.measureText(companyNameText).width;
      }

      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(companyNameText, 600, 275);

      // Subtitle 1 (Automatic single-line scaling)
      const sub1Text = (fields.companySubtitle1 || "PCSO STL Authorized Agent Corporation").trim();
      let sub1FontSize = 38;
      ctx.font = `bold ${sub1FontSize}px 'Segoe UI', Arial, sans-serif`;
      while (ctx.measureText(sub1Text).width > 1080 && sub1FontSize > 22) {
        sub1FontSize -= 1;
        ctx.font = `bold ${sub1FontSize}px 'Segoe UI', Arial, sans-serif`;
      }
      ctx.fillText(sub1Text, 600, 320);

      // Subtitle 2 (Automatic single-line scaling)
      const sub2Text = (fields.companySubtitle2 || "Mandaue City").trim();
      let sub2FontSize = 35;
      ctx.font = `600 ${sub2FontSize}px 'Segoe UI', Arial, sans-serif`;
      while (ctx.measureText(sub2Text).width > 1080 && sub2FontSize > 20) {
        sub2FontSize -= 1;
        ctx.font = `600 ${sub2FontSize}px 'Segoe UI', Arial, sans-serif`;
      }
      ctx.fillText(sub2Text, 600, 362);

      // 2x2 Photo Box: centered 520 x 540 px
      const photoX = 600 - 260;
      const photoY = 390;
      const photoW = 520;
      const photoH = 540;

      if (photoImg) {
        ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeRect(photoX, photoY, photoW, photoH);
      } else {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 34px Arial, sans-serif";
        ctx.fillText("2x2 PHOTO", 600, photoY + 280);
      }

      // Agent Name Section
      const nameY = 1000;
      if (fields.agentName) {
        ctx.fillStyle = "#000000";
        ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(fields.agentName.toUpperCase(), 600, nameY);
      }
      ctx.beginPath();
      ctx.moveTo(120, nameY + 18);
      ctx.lineTo(1080, nameY + 18);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("NAME", 600, nameY + 54);

      // Signature Section (with uploaded signature if available)
      const sigY = 1175;
      if (frontSigImg) {
        ctx.drawImage(frontSigImg, 600 - 180, sigY - 110, 360, 120);
      }
      ctx.beginPath();
      ctx.moveTo(180, sigY + 18);
      ctx.lineTo(1020, sigY + 18);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("SIGNATURE", 600, sigY + 54);

      // Bottom Red Banner
      ctx.fillStyle = "#E60000";
      ctx.fillRect(0, 1335, 1200, 165);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 54px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.roleTitle || "SALES REPRESENTATIVE", 600, 1435);

    } else {
      // BACK CARD
      const sigImg = (fields.showSignatureGraphic && managerSignature) ? await loadImage(managerSignature) : null;
      const confirmedSigImg = (fields.showConfirmedSignatureGraphic && confirmedSignature) ? await loadImage(confirmedSignature) : null;

      // ID Number Section (Shortened underline: 1 1/2 inches @ 300 DPI = 450px)
      ctx.fillStyle = "#000000";
      ctx.font = "bold 40px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("ID NO.:", 80, 110);

      const idVal = fields.idNumber ? fields.idNumber : "";
      const idLineStart = 220;
      const idLineWidth = 450; // 1.5 inches * 300 DPI = 450px
      const idLineEnd = idLineStart + idLineWidth;

      if (idVal) {
        ctx.textAlign = "center";
        ctx.fillText(idVal, idLineStart + (idLineWidth / 2), 105);
      }
      ctx.beginPath();
      ctx.moveTo(idLineStart, 115);
      ctx.lineTo(idLineEnd, 115);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      // NOTICE Block
      ctx.textAlign = "center";
      ctx.font = "bold 42px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("NOTICE", 600, 210);

      ctx.font = "normal 34px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("This card is NON-TRANSFERABLE;", 600, 260);

      ctx.font = "normal 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("IN CASE OF LOSS, finder is requested to surrender this card to:", 600, 320);

      ctx.font = "bold 40px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.pcsoBranchName || "PCSO CEBU BRANCH", 600, 365);

      // Address Block (Lifted up and enlarged)
      ctx.textAlign = "left";
      ctx.font = "bold 38px 'Segoe UI', Arial, sans-serif";
      const addressLabelWidth = ctx.measureText("Address:").width;
      const textStartX = 80 + addressLabelWidth + 12;

      ctx.fillText(fields.officeAddressLine1, textStartX, 445);

      ctx.font = "600 35px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.officeAddressLine2, textStartX, 490);

      ctx.font = "bold 38px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Address:", 80, 535);

      ctx.font = "600 35px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.officeAddressLine3, textStartX, 535);

      ctx.beginPath();
      ctx.moveTo(80, 550);
      ctx.lineTo(1120, 550);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Area of Operation (Lifted up and enlarged)
      ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Area of Operation:", 80, 620);
      if (fields.areaOfOperation) {
        ctx.font = "bold 38px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(fields.areaOfOperation, 430, 620);
      }
      ctx.beginPath();
      ctx.moveTo(410, 632);
      ctx.lineTo(1120, 632);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Emergency Contact (Lifted up and enlarged)
      ctx.font = "normal 34px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("In case of emergency, please contact:", 80, 705);

      const emerVal = (fields.emergencyName || fields.emergencyContact)
        ? `${fields.emergencyName || ""} ${fields.emergencyName && fields.emergencyContact ? "-" : ""} ${fields.emergencyContact || ""}`.trim()
        : "";
      if (emerVal) {
        ctx.textAlign = "center";
        ctx.font = "bold 42px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(emerVal, 600, 755);
      }
      ctx.beginPath();
      ctx.moveTo(80, 770);
      ctx.lineTo(1120, 770);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Signatories: Certified by (Lifted up and enlarged)
      ctx.textAlign = "left";
      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Certified by:", 120, 850);

      if (sigImg) {
        ctx.drawImage(sigImg, 600 - 180, 830, 360, 120);
      }
      ctx.textAlign = "center";
      ctx.font = "bold 44px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.certifiedByName || "", 600, 960);

      ctx.beginPath();
      ctx.moveTo(120, 975);
      ctx.lineTo(1080, 975);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.certifiedByTitle || "OPERATIONS MANAGER", 600, 1015);

      // Confirmed by (Lifted up and enlarged)
      ctx.textAlign = "left";
      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Confirmed by:", 120, 1100);

      if (confirmedSigImg) {
        ctx.drawImage(confirmedSigImg, 600 - 180, 1080, 360, 120);
      }
      ctx.textAlign = "center";
      ctx.font = "bold 44px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.confirmedByName || "", 600, 1210);

      ctx.beginPath();
      ctx.moveTo(120, 1225);
      ctx.lineTo(1080, 1225);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(fields.confirmedByTitle || "OIC-Branch Manager", 600, 1265);
    }

    // Solid black outer outline for official ID card border (300 DPI)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 1194, 1494);

    return canvas;
  };

  // Live WYSIWYG Canvas Rendering - 100% exact match with Print ID Card output
  useEffect(() => {
    let isCancelled = false;
    const updateLiveCanvases = async () => {
      try {
        const [frontC, backC] = await Promise.all([
          renderCardToCanvas("front"),
          renderCardToCanvas("back")
        ]);
        if (isCancelled) return;

        if (frontCanvasRef.current) {
          const ctxF = frontCanvasRef.current.getContext("2d");
          ctxF.clearRect(0, 0, 1200, 1500);
          ctxF.drawImage(frontC, 0, 0);
        }
        if (backCanvasRef.current) {
          const ctxB = backCanvasRef.current.getContext("2d");
          ctxB.clearRect(0, 0, 1200, 1500);
          ctxB.drawImage(backC, 0, 0);
        }
      } catch (err) {
        console.error("Live canvas rendering error:", err);
      }
    };
    updateLiveCanvases();
    return () => {
      isCancelled = true;
    };
  }, [
    fields,
    centerLogo,
    rightLogo,
    centerLogoSize,
    rightLogoSize,
    pcsoLogoSize,
    agentPhoto,
    frontSignature,
    managerSignature,
    confirmedSignature
  ]);

  // Download high-resolution PNG (1200 x 1500 px @ 300 DPI)
  const handleDownloadImage = async (side) => {
    try {
      setIsExporting(true);
      const canvas = await renderCardToCanvas(side);
      const link = document.createElement("a");
      const agentClean = (fields.agentName || "Agent").replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${agentClean}_ID_${side.toUpperCase()}_4x5_300DPI_1200x1500.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to download image:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download high-res PDF with exact 4" x 5" (101.6mm x 127mm) size fitted on A4 coupon bond (210 × 297 mm)
  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const [frontCanvas, backCanvas] = await Promise.all([
        renderCardToCanvas("front"),
        renderCardToCanvas("back")
      ]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const frontImgData = frontCanvas.toDataURL("image/png");
      const backImgData = backCanvas.toDataURL("image/png");

      // A4 Portrait: 210mm width × 297mm height
      // A4 Portrait: 210mm width × 297mm height
      // Side-by-Side placement near top edge (startY = 5mm) with 4.5mm side margins
      // Size: 99.5mm × 140mm - ensures all 4 borders including right-side edge are 100% visible
      const cardW = 99.5;
      const cardH = 140;
      const gap = 2;
      const totalW = cardW * 2 + gap; // 201mm
      const startX = (210 - totalW) / 2; // 4.5mm safe margin
      const startY = 5; // Moved down by 5mm so top border line is clearly visible

      // Draw Front Card (Left)
      pdf.addImage(frontImgData, "PNG", startX, startY, cardW, cardH);
      // Draw Back Card (Right)
      pdf.addImage(backImgData, "PNG", startX + cardW + gap, startY, cardW, cardH);

      // Solid black outline for ID card border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(startX, startY, cardW, cardH);
      pdf.rect(startX + cardW + gap, startY, cardW, cardH);

      const agentClean = (fields.agentName || "Agent").replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`${agentClean}_ID_A4_Portrait_Top_1Page.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Studio Dialog Container */}
      <div className="relative flex flex-col w-full max-w-[1340px] max-h-[96vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/75 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                Agent ID Card Studio
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  A4 Portrait · 4" × 5.5" (101.6 × 140 mm)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Front & Back positioned side-by-side at top of A4 coupon bond · Solid outline · Single page print
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Default Button */}
            <button
              type="button"
              onClick={handleSaveAsDefault}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/50 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-emerald-300 transition shadow-sm cursor-pointer"
              title="Save current AAC Name, Logos, Sizes and Template as Default for ALL Agents"
            >
              <Save size={14} className="text-emerald-400" />
              <span>Set as Default for All Agents</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition hover:scale-[1.02] cursor-pointer"
              title="Print ID card on A4 coupon bond (Single Page)"
            >
              <Printer size={15} />
              <span>Print ID Card</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {defaultSavedToast && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-slate-950 flex items-center justify-between shadow-md animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{defaultSavedToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setDefaultSavedToast("")}
              className="p-1 hover:bg-black/10 rounded"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scrollable Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* ========================================================================= */}
          {/* TOP SECTION: DUAL-SIDED ID PREVIEW (FRONT ON LEFT, BACK ON RIGHT)         */}
          {/* ========================================================================= */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-4 sm:p-6 shadow-inner">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-800/80 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  <ArrowLeftRight size={14} /> Side-by-Side Preview
                </span>
                <span className="text-emerald-400 font-bold text-[11px]">
                  ✓ A4 Portrait · Side-by-Side at Top Edge · Single Page Output
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px]">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-200 font-semibold">Side-by-Side at Top Edge</span>
                <span className="text-slate-400 text-[10px] hidden sm:inline">(Remaining ~152mm bottom paper is clean & reusable)</span>
              </div>
            </div>

            {/* LIVE DUAL-SIDED ID DISPLAY (FRONT ON LEFT, BACK ON RIGHT) */}
            <div 
              ref={printAreaRef}
              id="printable-id-card-area"
              className="id-card-print-container print-top-side-by-side flex flex-row flex-nowrap items-start justify-center gap-8 py-2 overflow-x-auto"
            >
              
              {/* ------------------------------------------------------------- */}
              {/* [LEFT] FRONT CARD (WYSIWYG Live Exact Print Display)         */}
              {/* ------------------------------------------------------------- */}
              <div className="flex flex-col items-center shrink-0">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-300 no-print">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    LEFT
                  </span>
                  <span>FRONT ID</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">· Exact Print Layout</span>
                </div>

                <div 
                  className="id-card-face id-card-front relative bg-white select-none overflow-hidden rounded-sm"
                  style={{
                    width: "384px",
                    height: "480px",
                    boxShadow: "0 16px 40px -8px rgba(0, 0, 0, 0.65)"
                  }}
                >
                  <canvas 
                    ref={frontCanvasRef}
                    width={1200}
                    height={1500}
                    className="w-full h-full block bg-white"
                  />
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* [RIGHT] BACK CARD (WYSIWYG Live Exact Print Display)          */}
              {/* ------------------------------------------------------------- */}
              <div className="flex flex-col items-center shrink-0">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-300 no-print">
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[10px]">
                    RIGHT
                  </span>
                  <span>BACK ID</span>
                  <span className="text-[10px] text-teal-400 font-semibold">· Exact Print Layout</span>
                </div>

                <div 
                  className="id-card-face id-card-back relative bg-white select-none overflow-hidden rounded-sm"
                  style={{
                    width: "384px",
                    height: "480px",
                    boxShadow: "0 16px 40px -8px rgba(0, 0, 0, 0.65)"
                  }}
                >
                  <canvas 
                    ref={backCanvasRef}
                    width={1200}
                    height={1500}
                    className="w-full h-full block bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Direct High-Res Export Action Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Standard 300 DPI Export (1200 × 1500 px):</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownloadImage("front")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  title="Download Front ID Card (Left) at 1200 × 1500 px"
                >
                  <Download size={13} />
                  <span>Download Front (1200×1500px)</span>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownloadImage("back")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  title="Download Back ID Card (Right) at 1200 × 1500 px"
                >
                  <Download size={13} />
                  <span>Download Back (1200×1500px)</span>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                  title="Download Print-Ready A4 PDF with Cutting Guides"
                >
                  <FileText size={13} />
                  <span>Download A4 PDF (Ready to Print)</span>
                </button>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: CUSTOMIZER & CONTROLS ORGANIZED IN TABS                   */}
          {/* ========================================================================= */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 space-y-5">
            
            {/* Control Navigation & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => setControlsTab("company")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    controlsTab === "company" ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText size={14} />
                  <span>AAC Name & Branding</span>
                </button>

                <button
                  type="button"
                  onClick={() => setControlsTab("fields")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    controlsTab === "fields" ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sliders size={14} />
                  <span>Underlined Agent Fields</span>
                </button>

                <button
                  type="button"
                  onClick={() => setControlsTab("logos")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    controlsTab === "logos" ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>Logos & Sizes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setControlsTab("photo_sig")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    controlsTab === "photo_sig" ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <PenTool size={14} />
                  <span>Photo & Front Signature</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                  title="Save current AAC Name, Logos, Sizes and Template as Default for ALL Agents"
                >
                  <Save size={13} />
                  <span>Set as Default</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearUnderlines}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition cursor-pointer"
                  title="Make all underlined lines blank for manual writing or blank template"
                >
                  <RotateCcw size={13} />
                  <span>Blank Underlines</span>
                </button>

                <button
                  type="button"
                  onClick={handleFillAgentData}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/25 hover:bg-teal-500/20 transition cursor-pointer"
                  title="Fill fields with agent data"
                >
                  <Sparkles size={13} />
                  <span>Fill Agent Data</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB: AAC NAME & BRANDING (EDITABLE & DEFAULT FOR ALL AGENTS)             */}
            {/* ========================================================================= */}
            {controlsTab === "company" && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileText size={15} className="text-emerald-400" /> Authorized Agent Corporation (AAC) Details
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAsDefault}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Save size={12} /> Set as Default for All Agents
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToFactory}
                      className="text-[10px] font-bold text-slate-500 hover:text-rose-400 cursor-pointer ml-2"
                    >
                      Reset to Factory
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* AAC Company Name */}
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-black text-emerald-400">
                      AAC Company Name (e.g. LUCKY BETPLAY CORPORATION)
                    </label>
                    <input
                      type="text"
                      value={fields.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      placeholder="LUCKY BETPLAY CORPORATION"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block">Bold uppercase header on Front card</span>
                  </div>

                  {/* Subtitle 1 */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Company Subtitle Line 1
                    </label>
                    <input
                      type="text"
                      value={fields.companySubtitle1}
                      onChange={(e) => updateField("companySubtitle1", e.target.value)}
                      placeholder="PCSO STL Authorized Agent Corporation"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block">Secondary line under AAC name</span>
                  </div>

                  {/* Subtitle 2 */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Branch / City Location
                    </label>
                    <input
                      type="text"
                      value={fields.companySubtitle2}
                      onChange={(e) => updateField("companySubtitle2", e.target.value)}
                      placeholder="Mandaue City"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block">Location under Subtitle 1</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address lines & Notice Branch */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Back: Official Office Address (3 Lines)
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={fields.officeAddressLine1}
                        onChange={(e) => updateField("officeAddressLine1", e.target.value)}
                        placeholder="Address Line 1"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={fields.officeAddressLine2}
                        onChange={(e) => updateField("officeAddressLine2", e.target.value)}
                        placeholder="Address Line 2"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={fields.officeAddressLine3}
                        onChange={(e) => updateField("officeAddressLine3", e.target.value)}
                        placeholder="Address Line 3 (with Address: prefix)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Notice: Surrender PCSO Branch Name */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <label className="text-[10.5px] font-black text-emerald-400 block">
                        Back: Surrender PCSO Branch (Notice Section)
                      </label>
                      <input
                        type="text"
                        value={fields.pcsoBranchName}
                        onChange={(e) => updateField("pcsoBranchName", e.target.value)}
                        placeholder="PCSO CEBU BRANCH"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 font-bold outline-none focus:border-emerald-500"
                      />
                      <span className="text-[9.5px] text-slate-400 block">
                        Under "IN CASE OF LOSS, finder is requested to surrender this card to: {fields.pcsoBranchName || 'PCSO CEBU BRANCH'}"
                      </span>
                    </div>
                  </div>

                  {/* Signatories & Default Signatures with Auto-PNG Background Removal */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                            <PenTool size={14} className="text-emerald-400" />
                            Back: Certified & Confirmed Signatories
                          </label>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles size={10} /> Auto-PNG Background Remover Active
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Automatically removes white, dark, or yellow paper backgrounds, converting signatures to crisp transparent PNGs!
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveAsDefault}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25 hover:bg-emerald-500/20 transition"
                          title="Save these signatories & transparent signatures as default for all agents"
                        >
                          <Save size={12} /> Set as Default for All Agents
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. OPERATIONS MANAGER (Certified by) */}
                      <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                            Certified By: Operations Manager
                          </span>
                          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fields.showSignatureGraphic}
                              onChange={(e) => updateField("showSignatureGraphic", e.target.checked)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <span>Show on ID</span>
                          </label>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Name on ID Line</label>
                          <input
                            type="text"
                            value={fields.certifiedByName}
                            onChange={(e) => updateField("certifiedByName", e.target.value)}
                            placeholder="CHARMIE JEAN M. SIMPAL"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-bold outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Title below Line</label>
                          <input
                            type="text"
                            value={fields.certifiedByTitle}
                            onChange={(e) => updateField("certifiedByTitle", e.target.value)}
                            placeholder="OPERATIONS MANAGER"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Signature Preview & Uploader */}
                        <div className="pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                            <span className="text-slate-300 flex items-center gap-1">
                              Signature Graphic
                              {managerSignature && (
                                <span className="text-emerald-400 text-[9px] font-mono font-normal">
                                  (Transparent PNG)
                                </span>
                              )}
                            </span>
                            {managerSignature && (
                              <button
                                type="button"
                                onClick={() => {
                                  setManagerSignature("");
                                  updateField("showSignatureGraphic", false);
                                }}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer text-[10px]"
                              >
                                Clear Signature
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="relative flex h-14 w-28 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 p-1 overflow-hidden shrink-0 shadow-inner">
                              {/* Checkered pattern to prove transparency */}
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,#334155_25%,transparent_25%),linear-gradient(-45deg,#334155_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#334155_75%),linear-gradient(-45deg,transparent_75%,#334155_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0px] opacity-30" />
                              {managerSignature ? (
                                <img
                                  src={managerSignature}
                                  alt="Operations Manager Signature"
                                  className="relative max-h-full max-w-full object-contain drop-shadow-md z-10"
                                />
                              ) : (
                                <span className="relative text-[9px] text-slate-500 font-medium z-10">No Signature</span>
                              )}
                            </div>

                            <div className="flex-1 space-y-1">
                              <input
                                type="file"
                                ref={managerSigInputRef}
                                onChange={handleManagerSignatureUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={isProcessingSig === "manager"}
                                onClick={() => managerSigInputRef.current?.click()}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {isProcessingSig === "manager" ? (
                                  <>
                                    <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    <span>Auto-removing BG...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload size={13} />
                                    <span>{managerSignature ? "Replace Signature" : "Upload Signature"}</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[9px] text-slate-500 block leading-tight">
                                Auto-removes white/off-white paper into clean PNG
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. BRANCH MANAGER (Confirmed by) */}
                      <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                            Confirmed By: Branch Manager
                          </span>
                          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fields.showConfirmedSignatureGraphic}
                              onChange={(e) => updateField("showConfirmedSignatureGraphic", e.target.checked)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <span>Show on ID</span>
                          </label>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Name on ID Line</label>
                          <input
                            type="text"
                            value={fields.confirmedByName}
                            onChange={(e) => updateField("confirmedByName", e.target.value)}
                            placeholder="Atty. Madel Hyacinth H. Herrera-Ramos"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-bold outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Title below Line</label>
                          <input
                            type="text"
                            value={fields.confirmedByTitle}
                            onChange={(e) => updateField("confirmedByTitle", e.target.value)}
                            placeholder="OIC-Branch Manager"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Signature Preview & Uploader */}
                        <div className="pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                            <span className="text-slate-300 flex items-center gap-1">
                              Signature Graphic
                              {confirmedSignature && (
                                <span className="text-emerald-400 text-[9px] font-mono font-normal">
                                  (Transparent PNG)
                                </span>
                              )}
                            </span>
                            {confirmedSignature && (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmedSignature("");
                                  updateField("showConfirmedSignatureGraphic", false);
                                }}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer text-[10px]"
                              >
                                Clear Signature
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="relative flex h-14 w-28 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 p-1 overflow-hidden shrink-0 shadow-inner">
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,#334155_25%,transparent_25%),linear-gradient(-45deg,#334155_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#334155_75%),linear-gradient(-45deg,transparent_75%,#334155_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0px] opacity-30" />
                              {confirmedSignature ? (
                                <img
                                  src={confirmedSignature}
                                  alt="Branch Manager Signature"
                                  className="relative max-h-full max-w-full object-contain drop-shadow-md z-10"
                                />
                              ) : (
                                <span className="relative text-[9px] text-slate-500 font-medium z-10">No Signature</span>
                              )}
                            </div>

                            <div className="flex-1 space-y-1">
                              <input
                                type="file"
                                ref={confirmedSigInputRef}
                                onChange={handleConfirmedSignatureUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                type="button"
                                disabled={isProcessingSig === "confirmed"}
                                onClick={() => confirmedSigInputRef.current?.click()}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {isProcessingSig === "confirmed" ? (
                                  <>
                                    <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    <span>Auto-removing BG...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload size={13} />
                                    <span>{confirmedSignature ? "Replace Signature" : "Upload Signature"}</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[9px] text-slate-500 block leading-tight">
                                Auto-removes white/off-white paper into clean PNG
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: UNDERLINED AGENT FIELDS                                             */}
            {/* ========================================================================= */}
            {controlsTab === "fields" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 animate-fade-in">
                {/* Agent Name */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Front: Agent Name (Underlined)
                  </label>
                  <input
                    type="text"
                    value={fields.agentName}
                    onChange={(e) => updateField("agentName", e.target.value)}
                    placeholder="Leave empty for blank line ________________"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">No arrows · Plain uppercase on card</span>
                </div>

                {/* Bottom Red Banner */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Front: Red Banner Position / Role
                  </label>
                  <input
                    type="text"
                    value={fields.roleTitle}
                    onChange={(e) => updateField("roleTitle", e.target.value)}
                    placeholder="SALES REPRESENTATIVE"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Default: SALES REPRESENTATIVE</span>
                </div>

                {/* Back: ID Number */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Back: ID Number (Underline 1 1/2 inch)
                  </label>
                  <input
                    type="text"
                    value={fields.idNumber}
                    onChange={(e) => updateField("idNumber", e.target.value)}
                    placeholder="Leave empty for blank line ________________"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Shortened underline: exactly 1.5 inches (38.1 mm)</span>
                </div>

                {/* Emergency Contact */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Back: Emergency Contact
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={fields.emergencyName}
                      onChange={(e) => updateField("emergencyName", e.target.value)}
                      placeholder="Contact Name"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={fields.emergencyContact}
                      onChange={(e) => updateField("emergencyContact", e.target.value)}
                      placeholder="Phone Number"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">Appears underlined on back</span>
                </div>

                {/* Area of Operation */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Back: Area of Operation
                  </label>
                  <input
                    type="text"
                    value={fields.areaOfOperation}
                    onChange={(e) => updateField("areaOfOperation", e.target.value)}
                    placeholder="e.g. MANDAUE CITY, CEBU"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Underlined territory line</span>
                </div>

                {/* Back: PCSO Surrender Branch */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Back: Surrender PCSO Branch (Notice)
                  </label>
                  <input
                    type="text"
                    value={fields.pcsoBranchName}
                    onChange={(e) => updateField("pcsoBranchName", e.target.value)}
                    placeholder="PCSO CEBU BRANCH"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Under Notice: surrender this card to</span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: LOGOS & SIZE ADJUSTER                                               */}
            {/* ========================================================================= */}
            {controlsTab === "logos" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1 animate-fade-in">
                
                {/* 1. Left Logo (PCSO) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-300">
                      Left Logo (PCSO)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      {pcsoLogoSize}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 border border-slate-700 p-1 shrink-0">
                      <img src={DEFAULT_PCSO_LOGO} alt="PCSO Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Adjust Size</label>
                      <input 
                        type="range" 
                        min="50" 
                        max="180" 
                        value={pcsoLogoSize} 
                        onChange={(e) => setPcsoLogoSize(Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Official Philippine Charity Sweepstakes Office vector.
                  </p>
                </div>

                {/* 2. Center Logo (Replaceable + Size Slider) */}
                <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={13} /> Center Logo (Replaceable)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {centerLogoSize}%
                      </span>
                      {centerLogo !== DEFAULT_CENTER_LOGO && (
                        <button
                          type="button"
                          onClick={() => setCenterLogo(DEFAULT_CENTER_LOGO)}
                          className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-16 items-center justify-center rounded-xl bg-white/10 border border-slate-700 p-1 shrink-0">
                      <img src={centerLogo} alt="Center Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        ref={centerLogoInputRef}
                        onChange={handleCenterLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => centerLogoInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>Upload Custom Logo</span>
                      </button>
                    </div>
                  </div>

                  {/* Size Slider */}
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Adjust Center Logo Size</span>
                      <button 
                        type="button" 
                        onClick={() => setCenterLogoSize(100)} 
                        className="text-[9px] text-slate-500 hover:text-slate-300"
                      >
                        Reset 100%
                      </button>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="180" 
                      value={centerLogoSize} 
                      onChange={(e) => setCenterLogoSize(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Right Logo (Clean STL + Size Slider) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-300">
                      Right Logo (STL Clean)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {rightLogoSize}%
                      </span>
                      {rightLogo !== DEFAULT_STL_LOGO && (
                        <button
                          type="button"
                          onClick={() => setRightLogo(DEFAULT_STL_LOGO)}
                          className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 border border-slate-700 p-1 shrink-0">
                      <img src={rightLogo} alt="STL Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        ref={rightLogoInputRef}
                        onChange={handleRightLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => rightLogoInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>Change Right Logo</span>
                      </button>
                    </div>
                  </div>

                  {/* Size Slider */}
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Adjust Right Logo Size</span>
                      <button 
                        type="button" 
                        onClick={() => setRightLogoSize(100)} 
                        className="text-[9px] text-slate-500 hover:text-slate-300"
                      >
                        Reset 100%
                      </button>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="180" 
                      value={rightLogoSize} 
                      onChange={(e) => setRightLogoSize(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: 2X2 PHOTO & FRONT SIGNATURE UPLOADER                                 */}
            {/* ========================================================================= */}
            {controlsTab === "photo_sig" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 animate-fade-in">
                
                {/* 1. Photo Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <User size={15} className="text-emerald-400" /> Agent Photo (2x2 Box)
                    </span>
                    <div className="flex items-center gap-2">
                      {agentPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setAgentPhoto("");
                            setRawUploadedPhoto("");
                            setPhotoWhiteBgActive(true);
                          }}
                          className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          Keep Blank
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-slate-700 overflow-hidden shrink-0 shadow-inner">
                      {agentPhoto ? (
                        <img src={agentPhoto} alt="Agent" className="h-full w-full object-cover" />
                      ) : (
                        <User size={30} className="text-slate-500" />
                      )}
                      {isProcessingPhoto && (
                        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center">
                          <div className="h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-1" />
                          <span className="text-[8px] font-bold text-emerald-300 tracking-wider">Whitening...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                        >
                          {isProcessingPhoto ? (
                            <>
                              <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span>Auto-whitening BG...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={13} />
                              <span>Upload 2x2 Photo</span>
                            </>
                          )}
                        </button>

                        {/* Toggle between Auto White BG & Original photo */}
                        {agentPhoto && rawUploadedPhoto && (
                          <button
                            type="button"
                            onClick={handleTogglePhotoWhiteBg}
                            title="Toggle between automatic pure white background and original photo"
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                              photoWhiteBgActive
                                ? "bg-emerald-950/60 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            <Sparkles size={11} className={photoWhiteBgActive ? "text-emerald-400" : "text-slate-400"} />
                            <span>{photoWhiteBgActive ? "White BG: ON" : "Original Photo"}</span>
                          </button>
                        )}

                        {/* Fine-tune toggle button */}
                        {agentPhoto && (
                          <button
                            type="button"
                            onClick={() => setShowPhotoSettings(!showPhotoSettings)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Sliders size={11} />
                            <span>Fine-tune</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-emerald-400/90 font-medium">
                        ✨ 100% Pure White Background: Powered by Neural AI portrait segmentation to give a spotless, studio-clean solid white (#FFFFFF) 2x2 photo!
                      </p>

                      {/* Fine-tune panel */}
                      {showPhotoSettings && agentPhoto && (
                        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-300">Cutout Cleanliness & Edge Trim</span>
                            <span className="text-emerald-400 font-mono text-[10px]">{photoTolerance}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="80"
                            value={photoTolerance}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPhotoTolerance(val);
                            }}
                            onMouseUp={() => handleReapplyWhiteBg(photoTolerance)}
                            onTouchEnd={() => handleReapplyWhiteBg(photoTolerance)}
                            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Natural Hair (25)</span>
                            <span>Standard Clean (45)</span>
                            <span>Crisp White (65)</span>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoTolerance(35);
                                handleReapplyWhiteBg(35);
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
                            >
                              Natural Soft Hair
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoTolerance(65);
                                handleReapplyWhiteBg(65);
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
                            >
                              Crisp Studio White
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requirements picker */}
                  {uploadedRequirements && uploadedRequirements.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Or pick from profile requirements:</span>
                        <span className="text-[9px] text-emerald-400 font-normal">Auto-whitening applies on select</span>
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {uploadedRequirements.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handlePickRequirementPhoto(req.url)}
                            className={`relative h-11 w-11 rounded-lg border overflow-hidden shrink-0 cursor-pointer transition ${
                              agentPhoto === req.url || (rawUploadedPhoto === req.url)
                                ? "border-emerald-400 ring-2 ring-emerald-400/40"
                                : "border-slate-700 hover:border-slate-500"
                            }`}
                          >
                            <img src={req.url} alt={req.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Front Signature Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <PenTool size={15} className="text-emerald-400" /> Front ID: Agent Signature Line
                    </span>
                    {frontSignature && (
                      <button
                        type="button"
                        onClick={() => setFrontSignature("")}
                        className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                      >
                        Keep Line Blank
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-28 items-center justify-center rounded-2xl bg-white/10 border border-slate-700 p-2 overflow-hidden shrink-0 shadow-inner">
                      {frontSignature ? (
                        <img src={frontSignature} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <div className="text-center text-[10px] text-slate-500">
                          <span className="block border-b border-slate-600 w-16 mx-auto mb-1"></span>
                          <span>Blank Line</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={frontSigInputRef}
                        onChange={handleFrontSignatureUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isProcessingSig === "front"}
                        onClick={() => frontSigInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingSig === "front" ? (
                          <>
                            <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <span>Auto-removing BG...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            <span>{frontSignature ? "Replace Agent Signature" : "Upload Agent Signature"}</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-400">
                        Automatic background remover turns white/off-white paper into clean transparent PNG!
                      </p>
                    </div>
                  </div>

                  {/* Requirements signature picker */}
                  {uploadedRequirements && uploadedRequirements.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 mb-1.5">Or choose from uploaded documents (auto-converts to transparent PNG):</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {uploadedRequirements.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handlePickRequirementSignature(req.url)}
                            className={`relative h-11 w-11 rounded-lg border overflow-hidden shrink-0 cursor-pointer transition ${
                              frontSignature === req.url ? "border-emerald-400 ring-2 ring-emerald-400/40" : "border-slate-700 hover:border-slate-500"
                            }`}
                            title={req.name}
                          >
                            <img src={req.url} alt={req.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Banner: Back ID Signatories Status */}
                <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <PenTool size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Back ID Signatories: Certified & Confirmed
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {managerSignature ? "✓ Operations Manager Signature Active" : "No Operations Manager Signature"} · {confirmedSignature ? "✓ Branch Manager Signature Active" : "No Branch Manager Signature"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setControlsTab("company")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                  >
                    <span>Edit Signatories in AAC Tab</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
