import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText, Award, ShieldAlert, X, Printer, Save, Archive,
  Search, RefreshCw, CheckCircle2, ChevronRight, Copy, Check,
  Sliders, Move, ArrowRight, Building2, UserCheck, Calendar,
  Download, Eye, Trash2, FileCheck, HelpCircle, Sparkles,
  Layers, Lock, AlertTriangle, ExternalLink, Scissors, Stamp
} from "lucide-react";
import {
  COMPANIES,
  resolveCompanyFromMemoRef,
  sanitizeMemoRef
} from "./MemoGeneratorPanel";
import {
  generateUniqueDocRef,
  registerUsedDocRef,
  getSavedDocumentsFromDb,
  saveDocumentRecordToDb,
  deleteDocumentRecordFromDb,
  getAllGlobalDocumentRefs,
  normalizeDocRef
} from "../lib/savedDocumentsStorage";

// Available Paper Sizes for the Coupon Bond
export const PAPER_SIZES = [
  { id: "letter", label: "Short Bond (8.5\" × 11\")", widthMm: 215.9, heightMm: 279.4, cssClass: "aspect-[8.5/11]" },
  { id: "legal", label: "Long Bond (8.5\" × 13\")", widthMm: 215.9, heightMm: 330.2, cssClass: "aspect-[8.5/13]" },
  { id: "a4", label: "A4 Standard (8.27\" × 11.69\")", widthMm: 210, heightMm: 297, cssClass: "aspect-[210/297]" }
];

// Available Typography Options
export const FONT_FAMILIES = [
  { id: "inter", label: "Modern Clean (Inter / Sans)", css: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: "arial", label: "Corporate Standard (Arial)", css: "Arial, Helvetica, sans-serif" },
  { id: "times", label: "Legal Formal (Times New Roman)", css: "'Times New Roman', Times, serif" },
  { id: "georgia", label: "Executive Serif (Georgia)", css: "Georgia, Cambria, serif" }
];

// Presets for the 5 Official Templates Requested
export const OFFICIAL_TEMPLATES = [
  {
    id: "non_affiliation",
    name: "Certificate of Non-Affiliation",
    shortName: "Non-Affiliation",
    category: "Legal & Corporate Certification",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    icon: ShieldAlert,
    defaultTitle: "CERTIFICATE OF NON-AFFILIATION",
    defaultSubject: "Public Notice and Certification of Non-Affiliation & Revocation of Authority",
    defaultTo: "TO WHOM IT MAY CONCERN / ALL COMMERCIAL & GAMING ESTABLISHMENTS",
    defaultRecipientName: "MR. JUAN DELA CRUZ",
    defaultDesignation: "Former Field Agent / Collector",
    description: "Official legal certification declaring that an individual or entity is NOT connected, authorized, or representing the company in any transaction.",
    templateBody: `THIS IS TO CERTIFY that MR. JUAN DELA CRUZ, of legal age, Filipino, and residing at Mandaue City, Cebu, is NOT an employee, agent, collector, or authorized representative of [COMPANY_NAME] in any capacity whatsoever.

The aforementioned individual has NO authority to represent, transact, negotiate, solicit bets, collect funds, issue acknowledgment receipts, or enter into any contracts or undertakings for and on behalf of the Company or its authorized operations.

ANY AND ALL TRANSACTIONS, contracts, agreements, or collection of money or property executed by the said individual are strictly UNAUTHORIZED, ILLEGAL, NULL, AND VOID, and shall not bind or obligate [COMPANY_NAME] nor any of its operating branches.

The general public, gaming outlets, coordinators, field monitoring personnel, and commercial partners are hereby sternly warned and advised to refrain from entertaining or transacting with the above-named person regarding company matters. Any person with knowledge of unauthorized representation or illegal collections is urged to report immediately to the Human Resources and Legal Department.

This Certificate of Non-Affiliation is issued this [DATE] at Mandaue City, Cebu, Philippines, for all legal intents, public information, and precautionary enforcement purposes.`
  },
  {
    id: "rewards_voucher",
    name: "Certificate of Rewards and Voucher",
    shortName: "Rewards & Voucher",
    category: "Merit & Performance Commendation",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: Award,
    defaultTitle: "CERTIFICATE OF REWARDS & MERIT INCENTIVE",
    defaultSubject: "Official Commendation of Exemplary Performance & Merit Incentive Grant",
    defaultTo: "TO OUR OUTSTANDING PERSONNEL & HIGH-PERFORMING STATIONS",
    defaultRecipientName: "MS. MARIA SANTOS",
    defaultDesignation: "Senior Area Coordinator / Top Performer",
    voucherCode: "VCH-2026-REWARD",
    voucherAmount: "₱5,000.00",
    voucherValidity: "Valid within 60 days from issuance",
    description: "Official commendation certificate honoring exceptional milestones, quota achievement, or field performance, paired with an incentive voucher.",
    templateBody: `This prestigious Certificate of Recognition and Official Incentive Voucher is proudly presented to:

MS. MARIA SANTOS
Senior Area Coordinator • Central Operations Division

IN SINCERE APPRECIATION of your outstanding dedication, exceptional productivity, and exemplary field leadership during the evaluation period. Your consistent adherence to operational standards, integrity in cash reconciliation, and dedication to team excellence have significantly contributed to the success of [COMPANY_NAME].

As a tangible token of our corporate esteem and gratitude, the Management hereby confers this OFFICIAL MERIT VOUCHER with full redemption privileges under company incentive programs.

We salute your unwavering commitment and encourage you to continue setting the benchmark of professionalism and excellence for the entire organization.`
  },
  {
    id: "termination_operations",
    name: "Termination of Operations",
    shortName: "Termination of Ops",
    category: "Operational Notice & Public Advisory",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    icon: Building2,
    defaultTitle: "NOTICE OF TERMINATION OF OPERATIONS",
    defaultSubject: "Official Notice of Permanent Cessation of Branch Operations & Station Turnover",
    defaultTo: "TO ALL BRANCH PERSONNEL, CLIENTS, AND DESIGNATED AUTHORITIES",
    defaultRecipientName: "BRANCH OUTLET #14 (SUBANGDAKU STATION)",
    defaultDesignation: "Branch Station / Operations Kiosk",
    description: "Formal corporate advisory announcing the official cessation or closing of a specific branch, kiosk, or operational unit with asset surrender protocols.",
    templateBody: `NOTICE IS HEREBY GIVEN to all concerned employees, agents, coordinators, and the general patronizing public that [COMPANY_NAME] will PERMANENTLY CEASE AND TERMINATE all commercial and gaming operations at:

BRANCH OUTLET #14 (SUBANGDAKU STATION)
A.S. Fortuna Street, Subangdaku, Mandaue City, Cebu

EFFECTIVE DATE OF CESSATION: [EFFECTIVE_DATE]

In line with corporate restructuring, area consolidation, and operational realignment directives approved by the Board of Directors, all retail ticketing, daily collections, and on-site administrative activities at this location shall strictly conclude by 6:00 PM on the effective date.

MANDATORY DIRECTIVES & TURNOVER PROTOCOLS:
1. Surrender of Assets: The assigned Station Supervisor and Area Custodian must surrender all POS ticketing machines, thermal paper rolls, official ledgers, and company keys to the Central Operations Depot within forty-eight (48) hours of closure.
2. Final Financial Reconciliation: All outstanding gross sales, prize payouts, and operational cash floats must undergo immediate zero-balance audit with the Internal Audit and Finance Division.
3. Personnel Reassignment: Qualified regular field personnel affected by this closure shall be offered reassignment to adjacent active operating centers in accordance with company human resource policies.

Patrons and coordinators in the area are advised to redirect all valid transactions and inquiries to our neighboring flagship operations center. We extend our sincere gratitude to the local community for their support during our period of operation at this site.`
  },
  {
    id: "termination_agency",
    name: "Termination of Agency Agreement",
    shortName: "Agency Termination",
    category: "Contractual & Agency Revocation",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: FileCheck,
    defaultTitle: "NOTICE OF TERMINATION OF AGENCY AGREEMENT",
    defaultSubject: "Formal Revocation of Agency Appointment, Cancellation of AAC Authority & Return of Assets",
    defaultTo: "MR. ROBERTO TAN / ACCREDITED SUB-AGENCY #A-204",
    defaultRecipientName: "MR. ROBERTO TAN",
    defaultDesignation: "Authorized Sub-Agent / Retail Distributor",
    description: "Formal written notice canceling an Agency Agreement, sub-distributorship, or dealership, demanding the immediate surrender of terminals and supplies.",
    templateBody: `DEAR MR. TAN:

PLEASE BE FORMALLY INFORMED that [COMPANY_NAME], acting as the PCSO Authorized Agent Corporation (AAC), has RESOLVED TO TERMINATE AND REVOKE, effective immediately upon your receipt of this notice, the AGENCY AGREEMENT entered into between yourself and this Corporation dated March 15, 2024.

GROUNDS FOR TERMINATION:
This decisive contractual termination is executed pursuant to Section 9 (Breach and Default) of the Agency Agreement, stemming from documented infractions including unauthorized collection practices, non-compliance with remittal deadlines, and failure to maintain operational sales quotas.

DEMAND FOR IMMEDIATE SURRENDER OF COMPANY PROPERTY:
You are hereby commanded and given SEVENTY-TWO (72) HOURS from receipt of this notice to surrender and deliver to the Corporate Executive Office the following:
a. All issued Handheld POS Terminals, chargers, spare batteries, and SIM cards;
b. All unused PCSO Official Bet Slips, thermal receipt rolls, and marketing collaterals;
c. Official Agent Identification Card (ID), accreditation certificates, and station decals.

LEGAL NOTICE & CANCELLATION OF AUTHORITY:
Effective immediately, your authority to collect bets, process vouchers, or represent yourself as an agent of [COMPANY_NAME] is PERMANENTLY REVOKED AND NULLIFIED. Any further transaction conducted using our trade name or logo will be deemed illegal and subject to criminal and civil prosecution under applicable Philippine laws.

Please coordinate immediately with the Legal & Audit Department for the schedule of final accounting and clearance processing.`
  },
  {
    id: "letter_of_explain",
    name: "Letter of Explain (Written Response)",
    shortName: "Letter of Explain",
    category: "Due Process & Employee Explanation",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    icon: FileText,
    defaultTitle: "FORMAL LETTER OF EXPLANATION (WRITTEN RESPONSE)",
    defaultSubject: "Written Explanation in Response to Incident Report / Notice to Explain (NTE)",
    defaultTo: "THE HUMAN RESOURCES & MANAGEMENT DISCIPLINARY COMMITTEE",
    defaultRecipientName: "MR. JOSHUA VELASCO",
    defaultDesignation: "Field Monitoring Supervisor",
    description: "Professional employee response letter / Salaysay ng Paliwanag responding to an Incident Report or NTE, stating facts, circumstances, and mitigating plea.",
    templateBody: `RESPECTFUL SUBMISSION TO:
THE HUMAN RESOURCES DEPARTMENT & DISCIPLINARY COMMITTEE
[COMPANY_NAME]

IN REFERENCE TO: Notice to Explain / Incident Report Ref No: IR-2026-NTE-042
DATE OF NOTICE RECEIVED: November 02, 2026

I, JOSHUA VELASCO, currently employed as Field Monitoring Supervisor under the Operations Division of [COMPANY_NAME], hereby submit this formal Written Explanation in answer to the allegations set forth in the aforementioned Notice to Explain.

1. STATEMENT OF FACTS & CHRONOLOGY:
On October 30, 2026, during the scheduled afternoon drawing monitoring in Sector 4, I was unable to submit the electronic attendance log at exactly 2:00 PM as normally prescribed due to an unexpected cellular data network outage in the rural station area, coupled with assisting an on-site retail teller handling a disputed winning ticket claim.

2. EXPLANATION & MITIGATING CIRCUMSTANCES:
I respectfully submit that there was absolutely no deliberate intent on my part to abandon my monitoring post or evade company timekeeping regulations. The physical logbook kept at the kiosk station clearly bears my handwritten signature and time-in at 1:48 PM, as attested by the resident teller and area coordinator.

3. REMEDIAL ACTION & COMMITMENT:
Recognizing the vital importance of real-time digital synchronization for audit compliance, I have secured a secondary backup communication pocket WiFi to prevent similar data interruptions in the future. I am fully committed to upholding the highest standards of punctuality and diligence required by company policies.

WHEREFORE, in light of the foregoing factual clarification and my clean prior disciplinary record over two consecutive years of service, I respectfully pray that this explanation be found satisfactory and that the charge be resolved with understanding and exoneration.

Respectfully submitted under oath and good faith.`
  }
];

// Draggable Pre-built Legal & Structural Clauses
export const DRAGGABLE_CLAUSES = [
  {
    id: "non_liability_clause",
    title: "Public Non-Liability Disclaimer",
    category: "Legal Disclaimer",
    snippet: "ANY AND ALL TRANSACTIONS, contracts, or agreements entered into by unauthorized persons are strictly NULL AND VOID and shall not bind the Company in any manner."
  },
  {
    id: "turnover_demand_clause",
    title: "Surrender of POS & Company Assets",
    category: "Operations Turnover",
    snippet: "The respondent is hereby given seventy-two (72) hours from receipt of this notice to surrender all POS terminals, official receipts, IDs, and company property to the Central Depot."
  },
  {
    id: "voucher_monetary_box",
    title: "Incentive Grant & Voucher Card",
    category: "Rewards Block",
    snippet: "OFFICIAL INCENTIVE VOUCHER: Conferred with redeemable monetary incentive value of ₱5,000.00, valid under corporate reward guidelines."
  },
  {
    id: "immediate_cessation_clause",
    title: "Immediate Cease & Desist Order",
    category: "Notice & Injunction",
    snippet: "Effective immediately upon service of this notice, all business operations, bet solicitations, and representations under this entity must CEASE AND DESIST permanently."
  },
  {
    id: "jurat_notary_clause",
    title: "Legal Jurat / Notarial Acknowledgment",
    category: "Notarization Block",
    snippet: "SUBSCRIBED AND SWORN to before me this ___ day of ________ 2026 at Mandaue City, Philippines, affiant exhibiting competent evidence of identity."
  },
  {
    id: "copy_received_clause",
    title: "Receiving Copy & Acknowledgment Slip",
    category: "Receipt Slip",
    snippet: "COPY RECEIVED AND ACCEPTED BY: _____________________ | Date: ____________ | Time: ________"
  }
];

export default function DocumentStudioPanel({
  currentUser = null,
  profiles = [],
  onClose = () => {},
  onOpenAiBuddy = () => {},
  onSwitchToMemo = () => {}
}) {
  // Selected Company Entity (Default: Lucky Betplay Corporation)
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const selectedCompany = useMemo(() => {
    return COMPANIES.find((c) => c.id === selectedCompanyId) || COMPANIES[0];
  }, [selectedCompanyId]);

  // Paper & Typography Settings
  const [paperSize, setPaperSize] = useState("letter"); // 'letter' | 'legal' | 'a4'
  const [fontFamily, setFontFamily] = useState("inter");
  const [fontSize, setFontSize] = useState(13.8); // pt
  const [watermarkText, setWatermarkText] = useState(""); // e.g. "OFFICIAL", "CONFIDENTIAL"
  const [zoomScale, setZoomScale] = useState(100); // 85% to 115%

  // Document Core Fields
  const [activeTemplateId, setActiveTemplateId] = useState("non_affiliation");
  const [docRef, setDocRef] = useState(() => generateUniqueDocRef("LBC"));
  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  });
  const [docTitle, setDocTitle] = useState("CERTIFICATE OF NON-AFFILIATION");
  const [docSubject, setDocSubject] = useState("Public Notice and Certification of Non-Affiliation & Revocation of Authority");
  const [docTo, setDocTo] = useState("TO WHOM IT MAY CONCERN / ALL COMMERCIAL & GAMING ESTABLISHMENTS");
  const [docRecipientName, setDocRecipientName] = useState("MR. JUAN DELA CRUZ");
  const [docDesignation, setDocDesignation] = useState("Former Field Agent / Collector");
  const [docBody, setDocBody] = useState(() => {
    const defaultTpl = OFFICIAL_TEMPLATES.find((t) => t.id === "non_affiliation");
    return defaultTpl ? defaultTpl.templateBody.replace(/\[COMPANY_NAME\]/g, "Lucky Betplay Corporation").replace(/\[DATE\]/g, "November 05, 2026") : "";
  });

  // Rewards Voucher Specific Data
  const [voucherCode, setVoucherCode] = useState("VCH-2026-REWARD");
  const [voucherAmount, setVoucherAmount] = useState("₱5,000.00");
  const [voucherValidity, setVoucherValidity] = useState("Valid within 60 days from issuance");

  // Signatory State
  const [signatoryLayout, setSignatoryLayout] = useState("dual"); // 'dual' | 'single'
  const [signatoryLabel, setSignatoryLabel] = useState("Prepared & Certified by:");
  const [signatoryName, setSignatoryName] = useState("JEVINCE JAYE S. JUBAY, CHRP");
  const [signatoryTitle, setSignatoryTitle] = useState("HRMD Manager");
  const [approverLabel, setApproverLabel] = useState("Approved by:");
  const [approverName, setApproverName] = useState("CHARMIE JEAN M. SIMPAL");
  const [approverTitle, setApproverTitle] = useState("President & CEO");

  // Notary Block
  const [showNotaryBlock, setShowNotaryBlock] = useState(false);

  // Drag and Drop UI State
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("templates"); // 'templates' | 'clauses' | 'paper'

  // Saved Archive State
  const [savedDocs, setSavedDocs] = useState([]);
  const [isLoadingSavedDocs, setIsLoadingSavedDocs] = useState(true);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveCompanyFilter, setArchiveCompanyFilter] = useState("ALL");
  const [archiveTypeFilter, setArchiveTypeFilter] = useState("ALL");

  // Notifications & Feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Load saved documents on initial mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingSavedDocs(true);
        const [{ documents }, globalRefs] = await Promise.all([
          getSavedDocumentsFromDb(currentUser),
          getAllGlobalDocumentRefs()
        ]);
        if (isMounted) {
          setSavedDocs(documents || []);
          setDocRef((prev) => {
            const compCode = selectedCompany?.code || "LBC";
            return generateUniqueDocRef(compCode, globalRefs);
          });
        }
      } catch (e) {
        console.warn("Failed fetching saved documents:", e);
      } finally {
        if (isMounted) setIsLoadingSavedDocs(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Show transient toast notification
  const triggerToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Switch Company Entity cleanly and update reference code while preserving sequence
  const handleSelectCompany = (comp) => {
    if (!comp) return;
    setSelectedCompanyId(comp.id);
    const newRef = docRef.replace(
      /-(?:LBC|5ARG|SIMCON|GFC|GLOW|IMP|SGC|GTI|RMC|FES|OPC)-/i,
      `-${comp.code}-`
    );
    setDocRef(newRef);
    triggerToast(`Switched letterhead to ${comp.name}`, "info");
  };

  // Apply a template preset cleanly to the Coupon Bond paper
  const handleApplyTemplate = (tpl) => {
    if (!tpl) return;
    setActiveTemplateId(tpl.id);
    setDocTitle(tpl.defaultTitle);
    setDocSubject(tpl.defaultSubject);
    setDocTo(tpl.defaultTo);
    setDocRecipientName(tpl.defaultRecipientName || "");
    setDocDesignation(tpl.defaultDesignation || "");

    const effectiveDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric"
    });

    const replacedBody = tpl.templateBody
      .replace(/\[COMPANY_NAME\]/g, selectedCompany.name)
      .replace(/\[DATE\]/g, docDate)
      .replace(/\[EFFECTIVE_DATE\]/g, effectiveDate);

    setDocBody(replacedBody);

    if (tpl.id === "rewards_voucher") {
      setVoucherCode(tpl.voucherCode || "VCH-2026-REWARD");
      setVoucherAmount(tpl.voucherAmount || "₱5,000.00");
      setVoucherValidity(tpl.voucherValidity || "Valid within 60 days from issuance");
    }

    if (tpl.id === "termination_operations" || tpl.id === "termination_agency") {
      setShowNotaryBlock(false);
    }

    triggerToast(`✓ Loaded "${tpl.name}" into Coupon Bond!`, "success");
  };

  // Append a draggable clause or block to the document body
  const handleInsertClause = (clause) => {
    if (!clause) return;
    setDocBody((prev) => {
      const trimmed = prev.trim();
      return `${trimmed}\n\n${clause.snippet.replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}`;
    });
    triggerToast(`✓ Added "${clause.title}" to document body`, "info");
  };

  // Drag and Drop handlers for paper canvas
  const handleDragStart = (e, itemType, data) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ itemType, data }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = (e) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { itemType, data } = JSON.parse(raw);
      if (itemType === "template") {
        handleApplyTemplate(data);
      } else if (itemType === "clause") {
        handleInsertClause(data);
      }
    } catch (err) {
      console.warn("Canvas drop handling notice:", err);
    }
  };

  // Save Document to Records / Supabase Archive
  const handleSaveDocument = async () => {
    setIsSaving(true);
    const cleanRef = normalizeDocRef(docRef);

    const docRecord = {
      id: "doc_" + Date.now(),
      ref: cleanRef,
      title: docTitle,
      templateType: activeTemplateId,
      date: docDate,
      to: docTo,
      from: selectedCompany.name,
      subject: docSubject,
      content: docBody,
      companyId: selectedCompany.id,
      companyCode: selectedCompany.code,
      companyName: selectedCompany.name,
      paperSize,
      fontFamily,
      fontSize,
      signatoryLayout,
      signatoryLabel,
      signatoryName,
      signatoryTitle,
      signatoryCompany: selectedCompany.name,
      approverLabel,
      approverName,
      approverTitle,
      approverCompany: selectedCompany.name,
      voucherData: activeTemplateId === "rewards_voucher" ? { voucherCode, voucherAmount, voucherValidity } : null,
      showNotaryBlock,
      watermarkText,
      savedAt: new Date().toISOString()
    };

    // Update in-memory state immediately
    const updated = [docRecord, ...savedDocs.filter((d) => d.ref !== cleanRef || d.id !== docRecord.id)];
    setSavedDocs(updated);
    registerUsedDocRef(cleanRef);

    try {
      const res = await saveDocumentRecordToDb(currentUser, docRecord);
      if (res.syncedToSupabase) {
        triggerToast(`✓ Document '${cleanRef}' saved to Supabase!`, "success");
      } else {
        triggerToast(`✓ Saved '${cleanRef}' to local system archive`, "info");
      }
    } catch (e) {
      console.error("Save document error:", e);
      triggerToast(`Saved to session cache: ${e.message}`, "info");
    } finally {
      setIsSaving(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3500);
    }
  };

  // Load a saved document back into the Coupon Bond studio
  const handleLoadSavedDocument = (d) => {
    if (!d) return;
    const cleanRef = normalizeDocRef(d.ref);

    // 1. Resolve matching company entity from reference code
    const comp = resolveCompanyFromMemoRef(cleanRef, d, COMPANIES);
    setSelectedCompanyId(comp.id);

    // 2. Restore document fields
    if (cleanRef) setDocRef(cleanRef);
    if (d.title) setDocTitle(d.title);
    if (d.templateType) setActiveTemplateId(d.templateType);
    if (d.date) setDocDate(d.date);
    if (d.to) setDocTo(d.to);
    if (d.subject) setDocSubject(d.subject);
    if (d.content) setDocBody(d.content);
    if (d.paperSize) setPaperSize(d.paperSize);
    if (d.fontFamily) setFontFamily(d.fontFamily);
    if (d.fontSize) setFontSize(Number(d.fontSize) || 13.8);
    if (d.signatoryLayout) setSignatoryLayout(d.signatoryLayout);
    if (d.signatoryName) setSignatoryName(d.signatoryName);
    if (d.signatoryTitle) setSignatoryTitle(d.signatoryTitle);
    if (d.approverName) setApproverName(d.approverName);
    if (d.approverTitle) setApproverTitle(d.approverTitle);
    if (d.showNotaryBlock !== undefined) setShowNotaryBlock(Boolean(d.showNotaryBlock));
    if (d.watermarkText !== undefined) setWatermarkText(d.watermarkText);

    // 3. Restore voucher data if present
    if (d.voucherData) {
      if (d.voucherData.voucherCode) setVoucherCode(d.voucherData.voucherCode);
      if (d.voucherData.voucherAmount) setVoucherAmount(d.voucherData.voucherAmount);
      if (d.voucherData.voucherValidity) setVoucherValidity(d.voucherData.voucherValidity);
    }

    setArchiveModalOpen(false);
    triggerToast(`✓ Loaded document '${cleanRef}' with ${comp.name} letterhead!`, "success");
  };

  // Delete document from records
  const handleDeleteSavedDocument = async (id, refStr) => {
    if (!window.confirm(`Permanently delete document ${refStr} from records?`)) return;
    const filtered = savedDocs.filter((d) => d.id !== id);
    setSavedDocs(filtered);
    await deleteDocumentRecordFromDb(currentUser, id);
    triggerToast(`Deleted document ${refStr}`, "info");
  };

  // Create brand new blank document
  const handleNewDocument = () => {
    const nextRef = generateUniqueDocRef(selectedCompany.code, savedDocs.map((d) => d.ref));
    setDocRef(nextRef);
    setDocTitle("CERTIFICATE OF NON-AFFILIATION");
    setActiveTemplateId("non_affiliation");
    const tpl = OFFICIAL_TEMPLATES[0];
    setDocBody(tpl.templateBody.replace(/\[COMPANY_NAME\]/g, selectedCompany.name).replace(/\[DATE\]/g, docDate));
    triggerToast("Created new document draft", "info");
  };

  // Print Coupon Bond Paper cleanly
  const handlePrint = () => {
    window.print();
  };

  // Font styling lookup
  const activeFont = useMemo(() => {
    return FONT_FAMILIES.find((f) => f.id === fontFamily)?.css || FONT_FAMILIES[0].css;
  }, [fontFamily]);

  const activePaperSize = useMemo(() => {
    return PAPER_SIZES.find((p) => p.id === paperSize) || PAPER_SIZES[0];
  }, [paperSize]);

  return (
    <div className="relative min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      {/* SCOPED PRINT STYLESHEET: Prints ONLY the coupon bond paper canvas */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "legal" ? "8.5in 13in" : paperSize === "a4" ? "A4" : "letter"};
            margin: 0.6in 0.7in;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #coupon-bond-printable, #coupon-bond-printable * {
            visibility: visible !important;
          }
          #coupon-bond-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= TOP STUDIO ACTION BAR ================= */}
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Studio Title & Mode */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs">
            <Award size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Document &amp; Certificate Studio
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Coupon Bond Canvas
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official Certificates, Termination Notices, &amp; Formal Letters • Drag templates &amp; clauses
            </p>
          </div>
        </div>

        {/* Center: Company Letterhead Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Entity:</span>
          {COMPANIES.map((comp) => {
            const isSelected = selectedCompanyId === comp.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => handleSelectCompany(comp)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs scale-102"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
                title={`Switch letterhead to ${comp.name}`}
              >
                <img
                  src={comp.logoUrl}
                  alt={comp.code}
                  className="w-4 h-4 object-contain rounded-sm"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <span>{comp.code}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions (Save, Archive, Print, Close) */}
        <div className="flex items-center gap-2">
          {/* Quick switch to Memo Generator */}
          {onSwitchToMemo && (
            <button
              type="button"
              onClick={onSwitchToMemo}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
              title="Open Official Memo Generator"
            >
              <FileText size={14} />
              <span>Memo Generator</span>
            </button>
          )}

          {/* New Document Draft */}
          <button
            type="button"
            onClick={handleNewDocument}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title="Create a fresh document"
          >
            <Scissors size={14} />
            <span className="hidden sm:inline">New Draft</span>
          </button>

          {/* Saved Documents Archive Modal Trigger */}
          <button
            type="button"
            onClick={() => setArchiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition cursor-pointer"
            title="Browse saved certificates and letters"
          >
            <Archive size={14} className="text-amber-600" />
            <span>Saved Archive</span>
            <span className="ml-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2">
              {savedDocs.length}
            </span>
          </button>

          {/* Save to Records */}
          <button
            type="button"
            onClick={handleSaveDocument}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-xs transition cursor-pointer"
            title="Save this document to cloud records and local archive"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save to Records</span>
          </button>

          {/* Print / Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-800 bg-amber-400 hover:bg-amber-300 active:scale-95 shadow-xs transition cursor-pointer"
            title="Print or Save as PDF (Ctrl+P)"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>

          {/* Close Panel */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer ml-1"
              title="Close Document Studio"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="no-print fixed top-16 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
              toastMessage.type === "success"
                ? "bg-emerald-950 text-emerald-200 border-emerald-700"
                : toastMessage.type === "info"
                ? "bg-slate-900 text-slate-100 border-slate-700"
                : "bg-rose-950 text-rose-200 border-rose-700"
            }`}
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Split Layout: Left (Coupon Bond Paper) & Right (Draggable Palette) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* ================= LEFT SIDE: COUPON BOND PAPER CANVAS ================= */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-slate-200/70"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* Quick Canvas Controls (Paper Size & Scale) */}
          <div className="no-print w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/90 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-300 shadow-2xs">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Bond Size:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                {PAPER_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => setPaperSize(sz.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      paperSize === sz.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {sz.id === "letter" ? "Short (8.5×11)" : sz.id === "legal" ? "Long (8.5×13)" : "A4"}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography Font selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Font:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-amber-500"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size slider */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Size:</span>
              <input
                type="range"
                min="12"
                max="16.5"
                step="0.5"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-20 accent-amber-600 cursor-pointer"
                title={`Font Size: ${fontSize}pt`}
              />
              <span className="font-mono text-[11px] font-bold text-slate-700 w-8">{fontSize}pt</span>
            </div>

            {/* Drag drop hint banner */}
            <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Move size={12} />
              <span>Drag templates from right to apply</span>
            </div>
          </div>

          {/* ================= THE ACTUAL COUPON BOND SHEET ================= */}
          <div
            id="coupon-bond-printable"
            style={{
              fontFamily: activeFont,
              fontSize: `${fontSize}pt`,
              lineHeight: 1.6,
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: "top center"
            }}
            className={`w-full max-w-[816px] min-h-[1056px] bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 md:p-14 relative transition-all duration-200 select-text ${
              isDragOverCanvas ? "ring-4 ring-amber-500/70 border-amber-400 bg-amber-50/10 scale-[1.01]" : ""
            }`}
          >
            {/* Visual Drag Over Overlay */}
            {isDragOverCanvas && (
              <div className="no-print absolute inset-0 z-30 bg-amber-500/10 border-4 border-dashed border-amber-500 rounded-sm flex items-center justify-center backdrop-blur-2xs pointer-events-none">
                <div className="bg-amber-900 text-white px-5 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
                  <Award size={18} />
                  <span>Release to Apply Template / Clause to Coupon Bond</span>
                </div>
              </div>
            )}

            {/* Optional Watermark */}
            {watermarkText && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none opacity-[0.05]">
                <span className="text-8xl sm:text-9xl font-black uppercase tracking-widest text-slate-900 -rotate-45">
                  {watermarkText}
                </span>
              </div>
            )}

            {/* ================= OFFICIAL COMPANY LETTERHEAD ================= */}
            <header className="border-b-2 border-emerald-700 pb-4 mb-6 relative z-10">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Company Official Logo */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <img
                    src={selectedCompany.logoUrl}
                    alt={selectedCompany.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>

                {/* Center: Corporate Legal Names, Tagline & Address */}
                <div className="flex-1 text-center px-2">
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {selectedCompany.legalName || selectedCompany.name}
                  </h2>
                  <p className="text-xs font-semibold text-emerald-800 tracking-wide mt-0.5">
                    {selectedCompany.tagline}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {selectedCompany.address}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {selectedCompany.contact}
                  </p>
                </div>

                {/* Right: Group Emblem */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <img
                    src={selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"}
                    alt="Corporate Group Emblem"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              </div>
            </header>

            {/* ================= DOCUMENT REFERENCE & METADATA BAR ================= */}
            <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-600 border-b border-slate-200 pb-2 mb-6">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400 font-bold">REF NO:</span>
                <input
                  type="text"
                  value={docRef}
                  onChange={(e) => setDocRef(normalizeDocRef(e.target.value))}
                  className="bg-transparent border-b border-slate-300 font-black text-slate-900 focus:border-amber-500 focus:outline-none px-1"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">DATE:</span>
                <input
                  type="text"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="bg-transparent border-b border-slate-300 font-bold text-slate-800 focus:border-amber-500 focus:outline-none px-1 text-right"
                />
              </div>
            </div>

            {/* ================= DOCUMENT TITLE ================= */}
            <div className="text-center my-6">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value.toUpperCase())}
                className="w-full text-center text-lg sm:text-xl font-black tracking-widest text-slate-950 uppercase bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none py-1 transition"
                placeholder="DOCUMENT TITLE"
              />
              <div className="h-0.5 w-32 bg-amber-600 mx-auto mt-1" />
            </div>

            {/* ================= ADDRESSEE / RECIPIENT ================= */}
            <div className="mb-6 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-black text-xs text-slate-500 tracking-wider">TO:</span>
                <input
                  type="text"
                  value={docTo}
                  onChange={(e) => setDocTo(e.target.value)}
                  className="flex-1 font-black text-xs sm:text-sm text-slate-900 uppercase bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none px-1"
                  placeholder="Recipient Name / Target Branch / All Concerned"
                />
              </div>

              {docSubject && (
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-xs text-slate-500 tracking-wider">SUBJECT:</span>
                  <input
                    type="text"
                    value={docSubject}
                    onChange={(e) => setDocSubject(e.target.value)}
                    className="flex-1 font-bold text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none px-1"
                    placeholder="Document Subject"
                  />
                </div>
              )}
            </div>

            {/* ================= REWARD VOUCHER SPECIAL CARD (IF APPLICABLE) ================= */}
            {activeTemplateId === "rewards_voucher" && (
              <div className="my-6 p-4 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50/70 via-amber-100/50 to-amber-50/70 text-slate-900 shadow-xs relative overflow-hidden">
                <div className="absolute right-3 top-3 text-amber-500 opacity-20">
                  <Award size={64} />
                </div>
                <div className="flex items-center justify-between border-b border-amber-300 pb-2 mb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                    Official Corporate Incentive Voucher
                  </span>
                  <span className="font-mono text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    {voucherCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary Grant / Prize</span>
                    <input
                      type="text"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      className="font-black text-base text-emerald-800 bg-transparent border-b border-amber-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Redemption Validity</span>
                    <input
                      type="text"
                      value={voucherValidity}
                      onChange={(e) => setVoucherValidity(e.target.value)}
                      className="font-semibold text-xs text-slate-700 bg-transparent border-b border-amber-300 focus:outline-none w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= DOCUMENT BODY TEXTAREA ================= */}
            <div className="my-6">
              <textarea
                value={docBody}
                onChange={(e) => setDocBody(e.target.value)}
                rows={16}
                className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-lg p-2 focus:outline-none resize-y text-justify leading-relaxed transition"
                placeholder="Type or paste document body text..."
              />
            </div>

            {/* ================= OPTIONAL NOTARIAL JURAT BLOCK ================= */}
            {showNotaryBlock && (
              <div className="my-8 pt-4 border-t border-slate-300 text-xs text-slate-700 space-y-2">
                <p className="font-bold">REPUBLIC OF THE PHILIPPINES )</p>
                <p className="font-bold">CITY OF MANDAUE, CEBU &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) S.S.</p>
                <p className="text-justify leading-relaxed">
                  SUBSCRIBED AND SWORN to before me this _____ day of _______________ 2026 at Mandaue City, Cebu, Philippines, affiant exhibiting to me his/her competent evidence of identity.
                </p>
                <div className="flex justify-between items-end pt-6">
                  <div>
                    <p className="text-[11px] text-slate-500">Doc. No. ____;</p>
                    <p className="text-[11px] text-slate-500">Page No. ____;</p>
                    <p className="text-[11px] text-slate-500">Book No. ____;</p>
                    <p className="text-[11px] text-slate-500">Series of 2026.</p>
                  </div>
                  <div className="text-center w-64 border-t border-slate-900 pt-1 font-bold text-xs">
                    NOTARY PUBLIC
                  </div>
                </div>
              </div>
            )}

            {/* ================= SIGNATORY BLOCK ================= */}
            <footer className="mt-12 pt-6 border-t border-slate-200">
              {signatoryLayout === "dual" ? (
                <div className="grid grid-cols-2 gap-8 text-xs">
                  {/* Left Signatory (HR / Prepared by) */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={signatoryLabel}
                      onChange={(e) => setSignatoryLabel(e.target.value)}
                      className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                    />
                    <div className="pt-10">
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="font-black text-slate-900 uppercase tracking-wide text-xs sm:text-sm bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full"
                      />
                      <input
                        type="text"
                        value={signatoryTitle}
                        onChange={(e) => setSignatoryTitle(e.target.value)}
                        className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5"
                      />
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        {selectedCompany.name}
                      </p>
                    </div>
                  </div>

                  {/* Right Signatory (Approver / President & CEO) */}
                  <div className="space-y-1 text-right">
                    <input
                      type="text"
                      value={approverLabel}
                      onChange={(e) => setApproverLabel(e.target.value)}
                      className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full text-right"
                    />
                    <div className="pt-10">
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="font-black text-slate-900 uppercase tracking-wide text-xs sm:text-sm bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full text-right"
                      />
                      <input
                        type="text"
                        value={approverTitle}
                        onChange={(e) => setApproverTitle(e.target.value)}
                        className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5 text-right"
                      />
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        {selectedCompany.name}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-xs space-y-1 text-xs">
                  <input
                    type="text"
                    value={signatoryLabel}
                    onChange={(e) => setSignatoryLabel(e.target.value)}
                    className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                  />
                  <div className="pt-10">
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="font-black text-slate-900 uppercase tracking-wide text-xs sm:text-sm bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full"
                    />
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5"
                    />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {selectedCompany.name}
                    </p>
                  </div>
                </div>
              )}
            </footer>
          </div>
        </main>

        {/* ================= RIGHT SIDE: DRAGGABLE TEMPLATES & PALETTE ================= */}
        <aside className="no-print w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 shadow-lg z-20">
          {/* Palette Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-amber-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Studio Palette
              </h3>
            </div>

            {/* Sidebar Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setSidebarTab("templates")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  sidebarTab === "templates" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Templates (5)
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("clauses")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  sidebarTab === "clauses" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Clauses
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("paper")}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                  sidebarTab === "paper" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Palette Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: THE 5 OFFICIAL TEMPLATES (DRAGGABLE) */}
            {sidebarTab === "templates" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold">Official Document Presets</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                    Drag or Click Apply
                  </span>
                </div>

                {OFFICIAL_TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  const isActive = activeTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, "template", tpl)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                        isActive
                          ? "border-amber-500 bg-amber-50/40 shadow-xs"
                          : "border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-amber-600 shrink-0 shadow-2xs">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-slate-900 truncate">
                              {tpl.name}
                            </h4>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${tpl.badgeColor}`}>
                              {tpl.shortName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {tpl.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] text-slate-400 font-bold inline-flex items-center gap-1">
                              <Move size={10} /> Drag to bond
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate(tpl)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              Apply to Paper
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: DRAGGABLE CLAUSES & BUILDING BLOCKS */}
            {sidebarTab === "clauses" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold">Standard Legal Blocks</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    Drop into Body
                  </span>
                </div>

                {DRAGGABLE_CLAUSES.map((clause) => (
                  <div
                    key={clause.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "clause", clause)}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition cursor-grab active:cursor-grabbing space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">{clause.title}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {clause.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                      &quot;{clause.snippet}&quot;
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 inline-flex items-center gap-1 font-bold">
                        <Move size={10} /> Drag
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInsertClause(clause)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        + Insert into Body
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: PAPER & LAYOUT SETTINGS */}
            {sidebarTab === "paper" && (
              <div className="space-y-4 text-xs">
                {/* Signatory Layout */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-700 block">Signatories Layout</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatoryLayout("dual")}
                      className={`p-2 rounded-xl font-bold border transition text-center ${
                        signatoryLayout === "dual" ? "bg-white border-amber-500 text-amber-900 shadow-2xs" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Dual (HR + CEO)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatoryLayout("single")}
                      className={`p-2 rounded-xl font-bold border transition text-center ${
                        signatoryLayout === "single" ? "bg-white border-amber-500 text-amber-900 shadow-2xs" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Single Signatory
                    </button>
                  </div>
                </div>

                {/* Notary Jurat Toggle */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Notarial Jurat Block</span>
                    <span className="text-[10px] text-slate-500">Legal S.S. acknowledgment at bottom</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showNotaryBlock}
                    onChange={(e) => setShowNotaryBlock(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* Watermark Preset */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-700 block">Background Watermark</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["", "OFFICIAL", "CONFIDENTIAL", "CERTIFIED", "TERMINATED"].map((wm) => (
                      <button
                        key={wm || "none"}
                        type="button"
                        onClick={() => setWatermarkText(wm)}
                        className={`p-1.5 rounded-lg text-[10px] font-bold border transition ${
                          watermarkText === wm ? "bg-amber-100 text-amber-900 border-amber-400" : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {wm || "None"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom Scale */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Preview Zoom</span>
                    <span className="font-mono font-bold text-slate-900">{zoomScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="115"
                    step="5"
                    value={zoomScale}
                    onChange={(e) => setZoomScale(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ================= SAVED DOCUMENTS ARCHIVE MODAL ================= */}
      {archiveModalOpen && (() => {
        const filteredDocs = savedDocs.filter((d) => {
          const comp = resolveCompanyFromMemoRef(d.ref, d, COMPANIES);
          if (archiveCompanyFilter !== "ALL") {
            if (archiveCompanyFilter === "5ARG" && comp.id !== "5a_royal" && !String(d.ref).includes("5ARG")) return false;
            if (archiveCompanyFilter === "GFC" && comp.id !== "glowing_fortune" && !String(d.ref).includes("GFC")) return false;
            if (archiveCompanyFilter === "LBC" && comp.id !== "lucky_betplay" && !String(d.ref).includes("LBC")) return false;
            if (archiveCompanyFilter === "SIMCON" && comp.id !== "simcon" && !String(d.ref).includes("SIMCON")) return false;
            if (archiveCompanyFilter === "SGC" && comp.id !== "sgc" && !String(d.ref).includes("SGC")) return false;
            if (archiveCompanyFilter === "IMP" && comp.id !== "imperial_gaming" && !String(d.ref).includes("IMP")) return false;
          }
          if (archiveTypeFilter !== "ALL") {
            if (d.templateType !== archiveTypeFilter) return false;
          }
          if (!archiveSearchQuery.trim()) return true;
          const q = archiveSearchQuery.toLowerCase().trim();
          return (
            String(d.ref || "").toLowerCase().includes(q) ||
            String(d.title || "").toLowerCase().includes(q) ||
            String(d.to || "").toLowerCase().includes(q) ||
            String(d.subject || "").toLowerCase().includes(q) ||
            String(comp.name || "").toLowerCase().includes(q)
          );
        });

        // Compute company count badges
        const companyCodes = [
          { code: "ALL", label: "All Documents", count: savedDocs.length },
          { code: "5ARG", label: "5ARG", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "5a_royal" || String(d.ref).includes("5ARG")).length },
          { code: "GFC", label: "GFC", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "glowing_fortune" || String(d.ref).includes("GFC")).length },
          { code: "LBC", label: "LBC", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "lucky_betplay" || String(d.ref).includes("LBC")).length },
          { code: "SIMCON", label: "SIMCON", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "simcon" || String(d.ref).includes("SIMCON")).length },
          { code: "SGC", label: "SGC", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "sgc" || String(d.ref).includes("SGC")).length },
          { code: "IMP", label: "IMP", count: savedDocs.filter((d) => resolveCompanyFromMemoRef(d.ref, d, COMPANIES).id === "imperial_gaming" || String(d.ref).includes("IMP")).length }
        ].filter((item) => item.code === "ALL" || item.count > 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-4xl lg:max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs">
                    <Archive size={22} />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Saved Documents &amp; Certificates Archive ({savedDocs.length})
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Official stored records in HrHub system • Select any document to load into Coupon Bond with authentic letterhead
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition"
                  title="Close Archive"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & Company Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    placeholder="Search by reference (e.g. 5ARG, GFC), document title, recipient..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none transition shadow-2xs"
                  />
                  {archiveSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setArchiveSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Company filter badges */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {companyCodes.map((item) => {
                    const isActive = archiveCompanyFilter === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setArchiveCompanyFilter(item.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 border ${
                          isActive
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Template Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs shrink-0">
                <span className="font-bold text-slate-400 text-[11px] uppercase">Type:</span>
                {[
                  { id: "ALL", label: "All Types" },
                  { id: "non_affiliation", label: "Non-Affiliation" },
                  { id: "rewards_voucher", label: "Rewards & Voucher" },
                  { id: "termination_operations", label: "Termination of Ops" },
                  { id: "termination_agency", label: "Agency Termination" },
                  { id: "letter_of_explain", label: "Letter of Explain" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setArchiveTypeFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                      archiveTypeFilter === t.id
                        ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Records List Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
                {savedDocs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <FileText size={36} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No saved documents or certificates yet.</p>
                    <p className="text-xs">Draft a certificate or notice and click &quot;Save to Records&quot; at the top.</p>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <Search size={32} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No documents matched your filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveSearchQuery("");
                        setArchiveCompanyFilter("ALL");
                        setArchiveTypeFilter("ALL");
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  filteredDocs.map((d) => {
                    const comp = resolveCompanyFromMemoRef(d.ref, d, COMPANIES);
                    const cleanRef = normalizeDocRef(d.ref);
                    return (
                      <div
                        key={d.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-400 hover:shadow-md transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3.5 group shadow-2xs"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Company Logo Badge */}
                          <div className="w-12 h-12 p-1 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-amber-300 transition">
                            <img
                              src={comp.logoUrl}
                              alt={comp.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          </div>

                          {/* Metadata */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                                {cleanRef}
                              </span>
                              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                {comp.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1 font-mono">
                                <Calendar size={12} className="text-slate-400" />
                                {d.date}
                              </span>
                            </div>

                            <h5 className="text-sm font-black text-slate-900 leading-snug group-hover:text-amber-800 transition-colors">
                              {d.title || d.subject || "Untitled Official Document"}
                            </h5>

                            <p className="text-xs text-slate-500 truncate">
                              TO: <strong className="text-slate-700">{d.to || "All Concerned"}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => handleLoadSavedDocument(d)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs hover:shadow-md transition cursor-pointer active:scale-95"
                            title={`Load document with ${comp.name} letterhead`}
                          >
                            <Eye size={13} />
                            <span>Load Document</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSavedDocument(d.id, cleanRef)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete from records"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400 font-semibold">
                  Showing {filteredDocs.length} of {savedDocs.length} official documents
                </span>
                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer transition"
                >
                  Close Archive
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

