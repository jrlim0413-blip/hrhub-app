import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText, Award, ShieldAlert, X, Printer, Save, Archive,
  Search, RefreshCw, CheckCircle2, ChevronRight, Copy, Check,
  Sliders, Move, ArrowRight, ArrowUp, ArrowDown, Building2, UserCheck, Calendar,
  Download, Eye, Trash2, FileCheck, HelpCircle, Sparkles,
  Layers, Lock, AlertTriangle, Scissors, Stamp, GripVertical,
  Plus, RotateCcw, Layout, Type, AlignLeft, AlignCenter,
  Shield, QrCode, Receipt, Scale
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

// ================= BOND PAPER SIZES =================
export const PAPER_SIZES = [
  { id: "letter", label: "Short Bond (8.5\" × 11\")", widthMm: 215.9, heightMm: 279.4, desc: "Standard Philippine Short Coupon Bond" },
  { id: "legal", label: "Long Bond (8.5\" × 13\")", widthMm: 215.9, heightMm: 330.2, desc: "Official Philippine Legal / Long Coupon Bond" },
  { id: "a4", label: "A4 Standard (8.27\" × 11.69\")", widthMm: 210, heightMm: 297, desc: "International ISO Standard" }
];

export const FONT_FAMILIES = [
  { id: "inter", label: "Modern Clean (Inter / Sans)", css: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: "arial", label: "Corporate Standard (Arial)", css: "Arial, Helvetica, sans-serif" },
  { id: "times", label: "Legal Formal (Times New Roman)", css: "'Times New Roman', Times, serif" },
  { id: "georgia", label: "Executive Serif (Georgia)", css: "Georgia, Cambria, serif" }
];

// ================= PALETTE LIBRARY: MODULAR DRAGGABLE BLOCKS =================
// The user can drag any of these blocks onto a completely blank coupon bond paper!
export const MODULAR_BLOCK_PRESETS = [
  // 1. HEADERS (Iba't ibang Header Template Designs)
  {
    category: "header",
    categoryLabel: "1. Header Designs",
    items: [
      {
        variant: "header_dual_logo",
        name: "Corporate Dual-Logo Header",
        description: "Official executive header with company logo left, corporate group emblem right, centered address & contact, and colored rule line.",
        defaultData: {
          showEmblem: true,
          borderStyle: "double",
          ruleColor: "#059669"
        }
      },
      {
        variant: "header_minimal_left",
        name: "Modern Left-Aligned Header",
        description: "Contemporary layout with prominent left brand logo, vertical accent bar, and right-aligned branch contact directory.",
        defaultData: {
          accentColor: "#0284c7"
        }
      },
      {
        variant: "header_formal_seal",
        name: "Classic Centered Legal Seal",
        description: "Prestigious arched typography with large top-center crest seal, ideal for official certifications and formal court instruments.",
        defaultData: {
          sealText: "OFFICIAL SEAL OF OPERATIONS"
        }
      },
      {
        variant: "header_compact_strip",
        name: "Slim Executive Header",
        description: "Compact low-profile letterhead designed to preserve maximum printable space for dense multi-page directives.",
        defaultData: {
          showTagline: false
        }
      },
      {
        variant: "header_aac_compliance",
        name: "PCSO AAC Accreditation Header",
        description: "Formal gaming authority header with PCSO AAC authorized agent designation, provincial accreditation, and compliance badge.",
        defaultData: {
          aacNumber: "AAC-CEBU-2026-089"
        }
      }
    ]
  },

  // 2. ADDRESSING & METADATA (Iba't ibang Addressing designs)
  {
    category: "addressing",
    categoryLabel: "2. Addressing & Metadata",
    items: [
      {
        variant: "address_memo_grid",
        name: "Formal Memorandum Grid",
        description: "Structured corporate box containing REF NO, DATE, TO, FROM, and SUBJECT in clear bordered partitions.",
        defaultData: {
          title: "OFFICIAL MEMORANDUM",
          to: "ALL BRANCH MANAGERS, AREA COORDINATORS & FIELD STAFF",
          from: "HUMAN RESOURCES DEPARTMENT",
          subject: "Mandatory Directives and Operational Guidelines"
        }
      },
      {
        variant: "address_formal_letter",
        name: "Executive Formal Letter Heading",
        description: "Standard business letter format with right-aligned date, formal addressee block, and professional salutation ('Dear Sir/Madam:').",
        defaultData: {
          recipientName: "MR. ROBERTO TAN",
          recipientTitle: "Accredited Coordinator / Branch Supervisor",
          recipientCompany: "Mandaue Central Station Operations",
          salutation: "DEAR MR. TAN:"
        }
      },
      {
        variant: "address_public_notice",
        name: "Public Notice & Advisory Banner",
        description: "Prominent centered headline banner with bold reference badge, ideal for public circulars and community advisories.",
        defaultData: {
          bannerTitle: "PUBLIC ADVISORY & FORMAL NOTICE",
          to: "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS",
          subject: "Important Notice Concerning Authorized Personnel and Official Operations"
        }
      },
      {
        variant: "address_certificate_ribbon",
        name: "Certificate Commendation Header",
        description: "Decorative ceremonial header ('This Certificate is Proudly Conferred upon') with elegant awardee typography.",
        defaultData: {
          conferralText: "THIS CERTIFICATE IS PROUDLY CONFERRED UPON",
          awardeeName: "MS. MARIA SANTOS",
          awardeeTitle: "Senior Area Coordinator • Top Performer"
        }
      }
    ]
  },

  // 3. DIRECTIVES & BODY (Iba't ibang Directives Body templates)
  {
    category: "body",
    categoryLabel: "3. Directives & Body",
    items: [
      {
        variant: "body_non_affiliation",
        name: "Certificate of Non-Affiliation Body",
        description: "Complete legal body certifying that an individual has NO connection or authority to represent, collect, or transact for the company.",
        defaultData: {
          title: "CERTIFICATE OF NON-AFFILIATION",
          personName: "MR. JUAN DELA CRUZ",
          personDetails: "of legal age, Filipino, residing at Mandaue City, Cebu",
          formerStatus: "Former Field Agent / Collector",
          bodyText: `THIS IS TO CERTIFY that the aforementioned individual is NOT an employee, agent, collector, or authorized representative of [COMPANY_NAME] in any capacity whatsoever.

The said individual has NO authority to represent, transact, negotiate, solicit bets, collect funds, issue acknowledgment receipts, or enter into any contracts or undertakings for and on behalf of the Company or its authorized operations.

ANY AND ALL TRANSACTIONS, contracts, agreements, or collection of money or property executed by the said individual are strictly UNAUTHORIZED, ILLEGAL, NULL, AND VOID, and shall not bind or obligate [COMPANY_NAME] nor any of its operating branches.

The general public, gaming outlets, coordinators, field monitoring personnel, and commercial partners are hereby sternly warned and advised to refrain from entertaining or transacting with the above-named person regarding company matters.`
        }
      },
      {
        variant: "body_rewards_voucher",
        name: "Certificate of Rewards & Voucher Card",
        description: "Commendation text paired with an official Golden/Emerald Incentive Voucher Card featuring voucher code, monetary amount, and validity.",
        defaultData: {
          title: "CERTIFICATE OF MERIT & INCENTIVE VOUCHER",
          citation: `IN SINCERE APPRECIATION of your outstanding dedication, exceptional productivity, and exemplary field leadership during the evaluation period. Your consistent adherence to operational standards, integrity in cash reconciliation, and dedication to team excellence have significantly contributed to the success of [COMPANY_NAME].`,
          voucherCode: "VCH-2026-REWARD",
          voucherAmount: "₱5,000.00",
          voucherValidity: "Valid within 60 days from issuance",
          voucherTerms: "Redeemable at Central Finance Depot upon presentation of this official original certificate."
        }
      },
      {
        variant: "body_termination_operations",
        name: "Termination of Operations Notice",
        description: "Formal announcement of permanent closure/cessation of branch or outlet, asset surrender deadlines, and patron redirection.",
        defaultData: {
          title: "NOTICE OF TERMINATION OF OPERATIONS",
          branchName: "BRANCH OUTLET #14 (SUBANGDAKU STATION)",
          branchAddress: "A.S. Fortuna Street, Subangdaku, Mandaue City, Cebu",
          effectiveDate: "November 15, 2026",
          bodyText: `NOTICE IS HEREBY GIVEN to all concerned employees, agents, coordinators, and the general patronizing public that [COMPANY_NAME] will PERMANENTLY CEASE AND TERMINATE all commercial and gaming operations at the specified station location.

MANDATORY DIRECTIVES & TURNOVER PROTOCOLS:
1. Surrender of Assets: The assigned Station Supervisor and Area Custodian must surrender all POS ticketing machines, thermal paper rolls, official ledgers, and company keys to the Central Operations Depot within forty-eight (48) hours of closure.
2. Final Financial Reconciliation: All outstanding gross sales, prize payouts, and operational cash floats must undergo immediate zero-balance audit with the Internal Audit Division.
3. Personnel Reassignment: Qualified regular field personnel affected by this closure shall be offered reassignment to adjacent active operating centers in accordance with company human resource policies.`
        }
      },
      {
        variant: "body_termination_agency",
        name: "Termination of Agency Agreement Notice",
        description: "Contractual cancellation of dealership/agency agreement, revocation of authority, and 72-hour surrender demand for POS machines.",
        defaultData: {
          title: "NOTICE OF TERMINATION OF AGENCY AGREEMENT",
          agencyCode: "SUB-AGENCY #A-204",
          agreementDate: "March 15, 2024",
          bodyText: `PLEASE BE FORMALLY INFORMED that [COMPANY_NAME], acting as the PCSO Authorized Agent Corporation (AAC), has RESOLVED TO TERMINATE AND REVOKE, effective immediately upon your receipt of this notice, the AGENCY AGREEMENT entered into between yourself and this Corporation.

GROUNDS FOR TERMINATION:
This decisive contractual termination is executed pursuant to Section 9 (Breach and Default) of the Agency Agreement, stemming from documented infractions including unauthorized collection practices, non-compliance with remittal deadlines, and failure to maintain operational sales quotas.

DEMAND FOR IMMEDIATE SURRENDER OF COMPANY PROPERTY:
You are hereby commanded and given SEVENTY-TWO (72) HOURS from receipt of this notice to surrender and deliver to the Corporate Executive Office the following:
a. All issued Handheld POS Terminals, chargers, spare batteries, and SIM cards;
b. All unused PCSO Official Bet Slips, thermal receipt rolls, and marketing collaterals;
c. Official Agent Identification Card (ID), accreditation certificates, and station decals.

Effective immediately, your authority to collect bets, process vouchers, or represent yourself as an agent of [COMPANY_NAME] is PERMANENTLY REVOKED AND NULLIFIED.`
        }
      },
      {
        variant: "body_letter_of_explain",
        name: "Letter of Explain (Written Response)",
        description: "Formal employee written explanation / Salaysay ng Paliwanag responding to an Incident Report or NTE with facts and mitigating plea.",
        defaultData: {
          title: "WRITTEN EXPLANATION IN RESPONSE TO NOTICE TO EXPLAIN",
          caseRef: "IR-2026-NTE-042",
          receivedDate: "November 02, 2026",
          bodyText: `I, the undersigned employee under the Operations Division of [COMPANY_NAME], hereby submit this formal Written Explanation in answer to the allegations set forth in the aforementioned Notice to Explain.

1. STATEMENT OF FACTS & CHRONOLOGY:
On the date and time specified in the report, during the scheduled afternoon drawing monitoring in Sector 4, I was unable to submit the electronic attendance log at exactly 2:00 PM due to an unexpected cellular data network outage in the rural station area, coupled with assisting an on-site retail teller handling a disputed winning ticket claim.

2. EXPLANATION & MITIGATING CIRCUMSTANCES:
I respectfully submit that there was absolutely no deliberate intent on my part to abandon my monitoring post or evade company timekeeping regulations. The physical logbook kept at the kiosk station clearly bears my handwritten signature and time-in, as attested by the resident teller.

3. REMEDIAL ACTION & COMMITMENT:
I have secured a secondary backup communication pocket WiFi to prevent similar data interruptions in the future. I am fully committed to upholding the highest standards of diligence required by company policies.`
        }
      },
      {
        variant: "body_custom_paragraphs",
        name: "Custom Editable Body Paragraphs",
        description: "Clean multi-paragraph block where you can freely type, paste, and format any company directives, policies, or announcements.",
        defaultData: {
          title: "STATEMENT OF DIRECTIVES",
          bodyText: `Pursuant to the latest executive directives approved by Management, all personnel are hereby instructed to strictly comply with standard operating procedures and security guidelines set forth herein.\n\nAll department heads are tasked with the comprehensive dissemination and monitoring of this directive within their respective sectors.`
        }
      },
      {
        variant: "body_numbered_directives",
        name: "Numbered Directives & Action Items",
        description: "Formatted sequential list of obligations, protocols, or numbered inspection checklists.",
        defaultData: {
          title: "MANDATORY OPERATIONAL DIRECTIVES",
          items: [
            "Strict adherence to official timekeeping and biometric verification schedules.",
            "Immediate cash handover and zero-float remittal at the end of each drawing shift.",
            "Mandatory wearing of official company uniform and valid identification cards on premises.",
            "Prohibition of unauthorized visitors or former personnel within cash teller enclosures."
          ]
        }
      },
      {
        variant: "body_warning_callout",
        name: "High-Priority Warning / Compliance Box",
        description: "Framed callout box with warning icon, highlighting strict penalties, non-compliance consequences, or fraud alerts.",
        defaultData: {
          boxTitle: "CRITICAL COMPLIANCE NOTICE",
          boxMessage: "Failure to comply with the instructions specified in this document shall constitute gross insubordination and shall be dealt with under company administrative disciplinary sanctions and applicable penal laws."
        }
      }
    ]
  },

  // 4. SIGNATORIES (Iba't ibang Signatory designs)
  {
    category: "signatory",
    categoryLabel: "4. Signatory Blocks",
    items: [
      {
        variant: "sig_dual_executive",
        name: "Dual Signatories (HR & President)",
        description: "Side-by-side formal execution block with HRMD Manager on the left and President & CEO on the right.",
        defaultData: {
          leftLabel: "Prepared & Certified by:",
          leftName: "JEVINCE JAYE S. JUBAY, CHRP",
          leftTitle: "HRMD Manager",
          rightLabel: "Approved & Confirmed by:",
          rightName: "CHARMIE JEAN M. SIMPAL",
          rightTitle: "President & CEO"
        }
      },
      {
        variant: "sig_single_official",
        name: "Single Official Signatory",
        description: "Clean left-aligned or centered signatory block for memos and certifications requiring one authorized officer.",
        defaultData: {
          label: "Issued & Certified by:",
          name: "JEVINCE JAYE S. JUBAY, CHRP",
          title: "HRMD Manager"
        }
      },
      {
        variant: "sig_triple_authority",
        name: "Triple Authority Signatory",
        description: "Three-column executive endorsement: Prepared by, Reviewed/Noted by, and Approved by.",
        defaultData: {
          col1Label: "Prepared by:",
          col1Name: "JEVINCE JAYE S. JUBAY, CHRP",
          col1Title: "HRMD Manager",
          col2Label: "Noted by:",
          col2Name: "ATTY. REGIONAL COUNSEL",
          col2Title: "Corporate Legal Counsel",
          col3Label: "Approved by:",
          col3Name: "CHARMIE JEAN M. SIMPAL",
          col3Title: "President & CEO"
        }
      },
      {
        variant: "sig_receiving_acknowledgment",
        name: "Detachable Receiving Copy Slip",
        description: "Bordered acknowledgment stub at the bottom for personal service: 'Copy received by: [Name], Signature, Date, Time'.",
        defaultData: {
          stubTitle: "FORMAL ACKNOWLEDGMENT & COPY-RECEIVED SLIP",
          instructions: "The recipient must sign, date, and return this duplicate copy to the Human Resources Department within 24 hours."
        }
      }
    ]
  },

  // 5. FOOTERS & LEGAL INSTRUMENTS (Iba't ibang Footer designs)
  {
    category: "footer",
    categoryLabel: "5. Footers & Notarial",
    items: [
      {
        variant: "footer_notary_jurat",
        name: "Legal Notarial Jurat (S.S. Block)",
        description: "Official legal jurat: 'Republic of the Philippines, Province of Cebu, City of Mandaue) S.S.', with Doc/Page/Book numbers and Notary Public line.",
        defaultData: {
          city: "Mandaue City, Cebu, Philippines",
          docYear: "2026"
        }
      },
      {
        variant: "footer_corporate_security",
        name: "Corporate Security & Verification Strip",
        description: "Bottom security footer with document tracking code, verification QR placeholder, and confidentiality notice.",
        defaultData: {
          docCode: "SEC-VERIFIED-2026",
          noticeText: "This document is an authentic corporate instrument generated via HrHub Corporate System. Tampering is punishable by law."
        }
      },
      {
        variant: "footer_contact_hotline",
        name: "Regional Branch Hotline Strip",
        description: "Subtle bottom bar listing official regional operations hotline numbers, compliance email, and headquarters address.",
        defaultData: {
          hotline: "(+63 32) 231-9042 | (+63 32) 418-5522",
          email: "compliance@hrhub-operations.com"
        }
      },
      {
        variant: "footer_page_tracker",
        name: "Page & ISO Compliance Tracker",
        description: "Standard document control line showing Form Code, Revision Number, and Page Numbering.",
        defaultData: {
          formCode: "FORM-HRD-2026-REV03",
          pageText: "Page 1 of 1"
        }
      }
    ]
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

  // Bond Paper Settings
  const [paperSize, setPaperSize] = useState("letter"); // 'letter' | 'legal' | 'a4'
  const [fontFamily, setFontFamily] = useState("inter");
  const [fontSize, setFontSize] = useState(13.8); // pt
  const [zoomScale, setZoomScale] = useState(100);

  // Document Core Identifiers
  const [docRef, setDocRef] = useState(() => generateUniqueDocRef("LBC"));
  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  });

  // ================= MODULAR BOND PAPER ELEMENTS ARRAY =================
  // Starts with an empty/blank coupon bond, or loaded from saved records
  const [paperElements, setPaperElements] = useState([]);

  // Active / Selected element for fine-tuning
  const [activeElementId, setActiveElementId] = useState(null);

  // Drag-and-Drop Canvas State
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paletteActiveCategory, setPaletteActiveCategory] = useState("header");
  const [searchQuery, setSearchQuery] = useState("");

  // Saved Documents Archive Modal State
  const [savedDocs, setSavedDocs] = useState([]);
  const [isLoadingSavedDocs, setIsLoadingSavedDocs] = useState(true);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveCompanyFilter, setArchiveCompanyFilter] = useState("ALL");

  // Notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved documents on mount
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

  const triggerToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3600);
  };

  // Switch Company Entity
  const handleSelectCompany = (comp) => {
    if (!comp) return;
    setSelectedCompanyId(comp.id);
    const newRef = docRef.replace(
      /-(?:LBC|5ARG|SIMCON|GFC|GLOW|IMP|SGC|GTI|RMC|FES|OPC)-/i,
      `-${comp.code}-`
    );
    setDocRef(newRef);
    triggerToast(`Letterhead entity set to ${comp.name}`, "info");
  };

  // Add a block to the coupon bond paper at a specific index
  const addBlockToPaper = (item, insertIndex = null) => {
    const newElement = {
      id: "elem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      category: item.category,
      variant: item.variant,
      name: item.name,
      data: JSON.parse(JSON.stringify(item.defaultData))
    };

    setPaperElements((prev) => {
      if (insertIndex === null || insertIndex >= prev.length) {
        return [...prev, newElement];
      }
      const clone = [...prev];
      clone.splice(insertIndex, 0, newElement);
      return clone;
    });

    setActiveElementId(newElement.id);
    triggerToast(`✓ Added "${item.name}" to Coupon Bond`, "success");
  };

  // Update field inside a paper element
  const updateElementData = (elemId, key, value) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        return {
          ...el,
          data: {
            ...el.data,
            [key]: value
          }
        };
      })
    );
  };

  // Remove element from paper
  const removeElement = (elemId) => {
    setPaperElements((prev) => prev.filter((el) => el.id !== elemId));
    triggerToast("Element removed from bond paper", "info");
  };

  // Move element up or down
  const moveElement = (index, direction) => {
    setPaperElements((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const clone = [...prev];
      const [moved] = clone.splice(index, 1);
      clone.splice(targetIndex, 0, moved);
      return clone;
    });
  };

  // Quick Preset: Load one of the 5 requested full document configurations onto the blank paper
  const handleLoadFullDocumentPreset = (presetKey) => {
    let presetBlocks = [];

    // All presets start with the Corporate Dual Logo Header and appropriate addressing
    const headerItem = MODULAR_BLOCK_PRESETS.find((c) => c.category === "header").items[0];
    const dualSigItem = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items[0];

    if (presetKey === "non_affiliation") {
      const addr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[2]; // public advisory
      const body = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[0]; // non-affiliation body
      const jurat = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items[0]; // notary jurat
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...addr, category: "addressing" },
        { ...body, category: "body" },
        { ...dualSigItem, category: "signatory" },
        { ...jurat, category: "footer" }
      ];
    } else if (presetKey === "rewards_voucher") {
      const ribbon = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[3]; // certificate ribbon
      const rewardsBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[1]; // rewards voucher
      const securityFooter = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items[1]; // security strip
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...ribbon, category: "addressing" },
        { ...rewardsBody, category: "body" },
        { ...dualSigItem, category: "signatory" },
        { ...securityFooter, category: "footer" }
      ];
    } else if (presetKey === "termination_operations") {
      const memoGrid = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[0];
      const opsBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[2];
      const ackStub = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items[3];
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...memoGrid, category: "addressing" },
        { ...opsBody, category: "body" },
        { ...dualSigItem, category: "signatory" },
        { ...ackStub, category: "signatory" }
      ];
    } else if (presetKey === "termination_agency") {
      const letterAddr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[1];
      const agencyBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[3];
      const ackStub = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items[3];
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...letterAddr, category: "addressing" },
        { ...agencyBody, category: "body" },
        { ...dualSigItem, category: "signatory" },
        { ...ackStub, category: "signatory" }
      ];
    } else if (presetKey === "letter_of_explain") {
      const letterAddr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[1];
      const explainBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[4];
      const singleSig = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items[1];
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...letterAddr, category: "addressing" },
        { ...explainBody, category: "body" },
        { ...singleSig, category: "signatory" }
      ];
    }

    const constructed = presetBlocks.map((item) => ({
      id: "elem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      category: item.category,
      variant: item.variant,
      name: item.name,
      data: JSON.parse(JSON.stringify(item.defaultData))
    }));

    setPaperElements(constructed);
    triggerToast(`✓ Loaded full layout preset on Coupon Bond!`, "success");
  };

  // Clear paper to completely blank
  const handleClearPaper = () => {
    if (paperElements.length === 0) return;
    if (window.confirm("Clear all elements and start with a completely blank coupon bond?")) {
      setPaperElements([]);
      triggerToast("Coupon Bond reset to blank", "info");
    }
  };

  // HTML5 Drag and Drop handlers
  const handlePaletteDragStart = (e, item) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
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
      const item = JSON.parse(raw);
      addBlockToPaper(item, dragOverIndex);
      setDragOverIndex(null);
    } catch (err) {
      console.warn("Drop handling error:", err);
    }
  };

  // Save Document to Records / Supabase
  const handleSaveDocument = async () => {
    if (paperElements.length === 0) {
      alert("Please drag at least one element onto the coupon bond paper before saving.");
      return;
    }

    setIsSaving(true);
    const cleanRef = normalizeDocRef(docRef);

    // Extract title from body or addressing
    let docTitle = "Official Document";
    for (const el of paperElements) {
      if (el.data.title) { docTitle = el.data.title; break; }
      if (el.data.bannerTitle) { docTitle = el.data.bannerTitle; break; }
    }

    const docRecord = {
      id: "doc_" + Date.now(),
      ref: cleanRef,
      title: docTitle,
      date: docDate,
      companyId: selectedCompany.id,
      companyCode: selectedCompany.code,
      companyName: selectedCompany.name,
      paperSize,
      fontFamily,
      fontSize,
      paperElements, // Full serialized modular elements array
      savedAt: new Date().toISOString()
    };

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
    }
  };

  // Load saved document from archive
  const handleLoadSavedDocument = (d) => {
    if (!d) return;
    const cleanRef = normalizeDocRef(d.ref);

    const comp = resolveCompanyFromMemoRef(cleanRef, d, COMPANIES);
    setSelectedCompanyId(comp.id);
    if (cleanRef) setDocRef(cleanRef);
    if (d.date) setDocDate(d.date);
    if (d.paperSize) setPaperSize(d.paperSize);
    if (d.fontFamily) setFontFamily(d.fontFamily);
    if (d.fontSize) setFontSize(Number(d.fontSize) || 13.8);

    // Restore paperElements
    if (Array.isArray(d.paperElements) && d.paperElements.length > 0) {
      setPaperElements(d.paperElements);
    } else {
      // Fallback: reconstruct from flat record if legacy
      handleLoadFullDocumentPreset(d.templateType || "non_affiliation");
    }

    setArchiveModalOpen(false);
    triggerToast(`✓ Loaded document '${cleanRef}' with ${comp.name} letterhead!`, "success");
  };

  // Delete saved document
  const handleDeleteSavedDocument = async (id, refStr) => {
    if (!window.confirm(`Permanently delete document ${refStr} from records?`)) return;
    const filtered = savedDocs.filter((d) => d.id !== id);
    setSavedDocs(filtered);
    await deleteDocumentRecordFromDb(currentUser, id);
    triggerToast(`Deleted document ${refStr}`, "info");
  };

  const activeFont = useMemo(() => {
    return FONT_FAMILIES.find((f) => f.id === fontFamily)?.css || FONT_FAMILIES[0].css;
  }, [fontFamily]);

  const activePaperSize = useMemo(() => {
    return PAPER_SIZES.find((p) => p.id === paperSize) || PAPER_SIZES[0];
  }, [paperSize]);

  return (
    <div className="relative min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      {/* SCOPED PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "legal" ? "8.5in 13in" : paperSize === "a4" ? "A4" : "letter"};
            margin: 0.5in 0.6in;
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
          .no-print, .block-hover-controls {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= TOP STUDIO ACTION BAR ================= */}
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Bond Canvas Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs">
            <Layout size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Coupon Bond Studio
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Drag &amp; Drop Builder
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Start with a blank bond paper • Drag headers, addressing, directives body, signatories, &amp; footers
            </p>
          </div>
        </div>

        {/* Center: Entity Switcher */}
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
                title={`Switch letterhead entity to ${comp.name}`}
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Reset to Blank */}
          <button
            type="button"
            onClick={handleClearPaper}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition cursor-pointer"
            title="Clear all elements to blank bond paper"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Blank</span>
          </button>

          {/* Saved Archive */}
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
            title="Save this coupon bond document to records"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save to Records</span>
          </button>

          {/* Print / Export PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-800 bg-amber-400 hover:bg-amber-300 active:scale-95 shadow-xs transition cursor-pointer"
            title="Print or Save as PDF"
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
              title="Close Panel"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Toast Alert */}
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

      {/* Main Split Layout: Left (Coupon Bond Paper) & Right (Draggable Building Blocks Palette) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* ================= LEFT SIDE: BLANK COUPON BOND PAPER CANVAS ================= */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-slate-200/70"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* STEP 1: PAPER CONTROLS BAR (Set muna ng size sa una) */}
          <div className="no-print w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/95 backdrop-blur-xs p-3 rounded-2xl border border-slate-300 shadow-sm">
            {/* Paper Size selector */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-700 text-xs flex items-center gap-1.5">
                <Scissors size={14} className="text-amber-600" />
                Bond Paper Size:
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                {PAPER_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => {
                      setPaperSize(sz.id);
                      triggerToast(`Bond paper set to ${sz.label}`, "info");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      paperSize === sz.id ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {sz.id === "letter" ? "Short (8.5\" × 11\")" : sz.id === "legal" ? "Long (8.5\" × 13\")" : "A4"}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography & Size */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[11px] uppercase">Font:</span>
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

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[11px] uppercase">Size:</span>
                <input
                  type="range"
                  min="12"
                  max="16.5"
                  step="0.5"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseFloat(e.target.value))}
                  className="w-16 accent-amber-600 cursor-pointer"
                />
                <span className="font-mono text-[11px] font-bold text-slate-700">{fontSize}pt</span>
              </div>
            </div>

            {/* Elements count indicator */}
            <div className="text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Elements placed: <span className="text-amber-700">{paperElements.length}</span>
            </div>
          </div>

          {/* ================= THE BLANK COUPON BOND PAPER SHEET ================= */}
          <div
            id="coupon-bond-printable"
            style={{
              fontFamily: activeFont,
              fontSize: `${fontSize}pt`,
              lineHeight: 1.6,
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: "top center"
            }}
            className={`w-full max-w-[816px] min-h-[1056px] bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 md:p-14 relative transition-all duration-200 select-text flex flex-col justify-between ${
              isDragOverCanvas ? "ring-4 ring-amber-500/80 border-amber-500 bg-amber-50/15" : ""
            }`}
          >
            {/* Visual Drop Overlay */}
            {isDragOverCanvas && (
              <div className="no-print absolute inset-0 z-30 bg-amber-500/10 border-4 border-dashed border-amber-500 rounded-sm flex items-center justify-center backdrop-blur-2xs pointer-events-none">
                <div className="bg-amber-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
                  <Plus size={20} className="animate-spin" />
                  <span>Release to Drop Element onto Coupon Bond</span>
                </div>
              </div>
            )}

            {/* IF CANVAS IS COMPLETELY BLANK: SHOW FRIENDLY DROPZONE */}
            {paperElements.length === 0 ? (
              <div className="no-print my-auto py-24 text-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50/60 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                  <Layout size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-black text-slate-900">
                    Your Coupon Bond Paper is Blank
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set your bond paper size above, then drag elements from the right palette (Header, Addressing, Directives Body, Signatory, Footer).
                  </p>
                </div>

                {/* Quick 1-click Preset Fillers */}
                <div className="pt-4 border-t border-slate-200/60 max-w-lg mx-auto">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
                    Or Start with a 1-Click Document Configuration:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("non_affiliation")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition"
                    >
                      🛡️ Non-Affiliation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("rewards_voucher")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition"
                    >
                      🏆 Rewards &amp; Voucher
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("termination_operations")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition"
                    >
                      🛑 Termination of Ops
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("termination_agency")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition"
                    >
                      📜 Agency Termination
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("letter_of_explain")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition col-span-2 sm:col-span-1"
                    >
                      ✍️ Letter of Explain
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RENDER PLACED MODULAR ELEMENTS SEQUENTIALLY ON THE BOND PAPER */
              <div className="space-y-6 flex-1">
                {paperElements.map((el, index) => {
                  const isHovered = activeElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={() => setActiveElementId(el.id)}
                      className={`relative group rounded-xl p-2 transition-all ${
                        isHovered ? "ring-2 ring-amber-400/60 bg-amber-50/10" : "hover:bg-slate-50/40"
                      }`}
                    >
                      {/* Floating Control Toolbar for this placed element */}
                      <div className="no-print absolute -top-3.5 right-2 z-20 hidden group-hover:flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-md text-[10px] font-bold">
                        <span className="text-amber-400 mr-1">{el.name}</span>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveElement(index, "up"); }}
                            className="p-1 hover:text-amber-400 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                        )}
                        {index < paperElements.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveElement(index, "down"); }}
                            className="p-1 hover:text-amber-400 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                          className="p-1 hover:text-rose-400 cursor-pointer ml-1"
                          title="Remove Element"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* ================= ELEMENT RENDERER BY VARIANT ================= */}

                      {/* --- 1. HEADERS --- */}
                      {el.variant === "header_dual_logo" && (
                        <div className="border-b-2 border-emerald-700 pb-4 mb-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                              <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="max-h-full max-w-full object-contain" />
                            </div>
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
                            <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                              <img src={selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"} alt="Corporate Emblem" className="max-h-full max-w-full object-contain" />
                            </div>
                          </div>
                        </div>
                      )}

                      {el.variant === "header_minimal_left" && (
                        <div className="border-b border-slate-300 pb-4 mb-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-14 h-14 object-contain" />
                            <div className="border-l-2 border-amber-600 pl-3">
                              <h2 className="text-base font-black uppercase text-slate-950 tracking-tight leading-tight">
                                {selectedCompany.name}
                              </h2>
                              <p className="text-[11px] font-bold text-slate-500 uppercase">{selectedCompany.category}</p>
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-slate-500 font-mono">
                            <p>{selectedCompany.address}</p>
                            <p>{selectedCompany.contact}</p>
                          </div>
                        </div>
                      )}

                      {el.variant === "header_formal_seal" && (
                        <div className="border-b-2 border-double border-slate-800 pb-4 mb-4 text-center space-y-1">
                          <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-16 h-16 mx-auto object-contain mb-1" />
                          <h2 className="text-lg font-black uppercase tracking-widest text-slate-950">
                            {selectedCompany.legalName || selectedCompany.name}
                          </h2>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            {selectedCompany.address} • {selectedCompany.contact}
                          </p>
                        </div>
                      )}

                      {el.variant === "header_compact_strip" && (
                        <div className="border-b border-emerald-600 pb-2 mb-3 flex items-center justify-between text-xs font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <img src={selectedCompany.logoUrl} alt={selectedCompany.code} className="w-7 h-7 object-contain" />
                            <span className="font-black uppercase tracking-wider">{selectedCompany.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{selectedCompany.contact}</span>
                        </div>
                      )}

                      {el.variant === "header_aac_compliance" && (
                        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-14 h-14 object-contain" />
                            <div>
                              <h2 className="text-sm font-black uppercase text-slate-900">
                                {selectedCompany.name}
                              </h2>
                              <p className="text-[11px] font-extrabold text-emerald-800">
                                PCSO Authorized Agent Corporation (AAC) • Central Operations Hub
                              </p>
                            </div>
                          </div>
                          <div className="border border-slate-300 p-1.5 rounded text-center text-[10px] font-mono bg-slate-50">
                            <span className="block font-black text-slate-800">{el.data.aacNumber || "AAC-CEBU-2026-089"}</span>
                            <span className="text-slate-500">Accredited Agency</span>
                          </div>
                        </div>
                      )}

                      {/* --- 2. ADDRESSING & METADATA --- */}
                      {el.variant === "address_memo_grid" && (
                        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-2 text-xs font-semibold text-slate-700 mb-4">
                          <div className="flex justify-between border-b border-slate-200 pb-1.5">
                            <div><span className="font-bold text-slate-500">REF NO:</span> <strong className="font-mono text-slate-900">{docRef}</strong></div>
                            <div><span className="font-bold text-slate-500">DATE:</span> <strong className="text-slate-900">{docDate}</strong></div>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            <div className="flex items-baseline gap-2">
                              <span className="font-black text-slate-500 w-12">TO:</span>
                              <input
                                type="text"
                                value={el.data.to}
                                onChange={(e) => updateElementData(el.id, "to", e.target.value)}
                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none font-bold text-slate-900"
                              />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-black text-slate-500 w-12">FROM:</span>
                              <input
                                type="text"
                                value={el.data.from}
                                onChange={(e) => updateElementData(el.id, "from", e.target.value)}
                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none font-bold text-slate-900"
                              />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-black text-slate-500 w-12">SUBJECT:</span>
                              <input
                                type="text"
                                value={el.data.subject}
                                onChange={(e) => updateElementData(el.id, "subject", e.target.value)}
                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none font-extrabold text-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {el.variant === "address_formal_letter" && (
                        <div className="mb-4 space-y-3 text-xs">
                          <div className="text-right text-slate-600 font-bold">
                            Date: <strong>{docDate}</strong> | Ref: <strong className="font-mono">{docRef}</strong>
                          </div>
                          <div className="space-y-0.5">
                            <input
                              type="text"
                              value={el.data.recipientName}
                              onChange={(e) => updateElementData(el.id, "recipientName", e.target.value)}
                              className="font-black text-sm text-slate-900 uppercase bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                            />
                            <input
                              type="text"
                              value={el.data.recipientTitle}
                              onChange={(e) => updateElementData(el.id, "recipientTitle", e.target.value)}
                              className="font-semibold text-slate-600 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                            />
                            <input
                              type="text"
                              value={el.data.recipientCompany}
                              onChange={(e) => updateElementData(el.id, "recipientCompany", e.target.value)}
                              className="text-slate-500 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                            />
                          </div>
                          <div className="pt-2 font-black text-slate-800">
                            <input
                              type="text"
                              value={el.data.salutation}
                              onChange={(e) => updateElementData(el.id, "salutation", e.target.value)}
                              className="bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none font-black"
                            />
                          </div>
                        </div>
                      )}

                      {el.variant === "address_public_notice" && (
                        <div className="text-center my-4 space-y-2">
                          <span className="font-mono text-[10px] font-black bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300">
                            {docRef} • {docDate}
                          </span>
                          <input
                            type="text"
                            value={el.data.bannerTitle}
                            onChange={(e) => updateElementData(el.id, "bannerTitle", e.target.value.toUpperCase())}
                            className="w-full text-center text-lg sm:text-xl font-black uppercase tracking-widest text-slate-950 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none py-1"
                          />
                          <div className="h-0.5 w-28 bg-amber-600 mx-auto" />
                          <p className="text-xs font-bold text-slate-600 mt-2">
                            {el.data.to}
                          </p>
                        </div>
                      )}

                      {el.variant === "address_certificate_ribbon" && (
                        <div className="text-center my-6 space-y-3">
                          <p className="text-xs font-black tracking-widest text-amber-700 uppercase">
                            {el.data.conferralText}
                          </p>
                          <input
                            type="text"
                            value={el.data.awardeeName}
                            onChange={(e) => updateElementData(el.id, "awardeeName", e.target.value.toUpperCase())}
                            className="w-full text-center text-xl sm:text-2xl font-black uppercase text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none py-1"
                          />
                          <input
                            type="text"
                            value={el.data.awardeeTitle}
                            onChange={(e) => updateElementData(el.id, "awardeeTitle", e.target.value)}
                            className="w-full text-center text-xs font-bold text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* --- 3. DIRECTIVES & BODY MODULES --- */}
                      {el.variant === "body_rewards_voucher" ? (
                        <div className="space-y-4 my-3">
                          <div className="text-center">
                            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
                              {el.data.title}
                            </h3>
                          </div>
                          <textarea
                            value={el.data.citation}
                            onChange={(e) => updateElementData(el.id, "citation", e.target.value)}
                            rows={4}
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-amber-400 rounded p-1 focus:outline-none text-justify leading-relaxed"
                          />
                          {/* Voucher Card */}
                          <div className="p-4 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 text-slate-900 shadow-2xs">
                            <div className="flex justify-between items-center border-b border-amber-300 pb-2 mb-2">
                              <span className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                                Corporate Incentive Merit Voucher
                              </span>
                              <span className="font-mono text-xs font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                                {el.data.voucherCode}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary Grant</span>
                                <input
                                  type="text"
                                  value={el.data.voucherAmount}
                                  onChange={(e) => updateElementData(el.id, "voucherAmount", e.target.value)}
                                  className="font-black text-lg text-emerald-800 bg-transparent border-b border-amber-300 focus:outline-none"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Validity</span>
                                <input
                                  type="text"
                                  value={el.data.voucherValidity}
                                  onChange={(e) => updateElementData(el.id, "voucherValidity", e.target.value)}
                                  className="font-bold text-xs text-slate-700 bg-transparent border-b border-amber-300 focus:outline-none w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : el.variant === "body_numbered_directives" ? (
                        <div className="space-y-2 my-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {el.data.title}
                          </h4>
                          <ol className="list-decimal list-inside space-y-1.5 text-xs text-justify leading-relaxed">
                            {el.data.items.map((it, idx) => (
                              <li key={idx} className="text-slate-800">
                                <span className="font-semibold">{it}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : el.variant === "body_warning_callout" ? (
                        <div className="p-3.5 rounded-xl border-l-4 border-rose-600 bg-rose-50/60 my-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs uppercase tracking-wider">
                            <AlertTriangle size={15} />
                            <span>{el.data.boxTitle}</span>
                          </div>
                          <p className="text-xs text-rose-950 font-semibold leading-relaxed text-justify">
                            {el.data.boxMessage}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 my-3">
                          {el.data.title && (
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                              {el.data.title}
                            </h3>
                          )}
                          <textarea
                            value={el.data.bodyText}
                            onChange={(e) => updateElementData(el.id, "bodyText", e.target.value)}
                            rows={8}
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-lg p-2 focus:outline-none text-justify leading-relaxed transition"
                          />
                        </div>
                      )}

                      {/* --- 4. SIGNATORIES --- */}
                      {el.variant === "sig_dual_executive" && (
                        <div className="grid grid-cols-2 gap-8 text-xs pt-6 mt-4 border-t border-slate-200">
                          <div>
                            <input
                              type="text"
                              value={el.data.leftLabel}
                              onChange={(e) => updateElementData(el.id, "leftLabel", e.target.value)}
                              className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                            />
                            <div className="pt-8">
                              <input
                                type="text"
                                value={el.data.leftName}
                                onChange={(e) => updateElementData(el.id, "leftName", e.target.value)}
                                className="font-black text-slate-900 uppercase tracking-wide text-xs bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full"
                              />
                              <input
                                type="text"
                                value={el.data.leftTitle}
                                onChange={(e) => updateElementData(el.id, "leftTitle", e.target.value)}
                                className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5"
                              />
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                {selectedCompany.name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <input
                              type="text"
                              value={el.data.rightLabel}
                              onChange={(e) => updateElementData(el.id, "rightLabel", e.target.value)}
                              className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full text-right"
                            />
                            <div className="pt-8">
                              <input
                                type="text"
                                value={el.data.rightName}
                                onChange={(e) => updateElementData(el.id, "rightName", e.target.value)}
                                className="font-black text-slate-900 uppercase tracking-wide text-xs bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full text-right"
                              />
                              <input
                                type="text"
                                value={el.data.rightTitle}
                                onChange={(e) => updateElementData(el.id, "rightTitle", e.target.value)}
                                className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5 text-right"
                              />
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                {selectedCompany.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {el.variant === "sig_single_official" && (
                        <div className="pt-6 mt-4 border-t border-slate-200 max-w-xs text-xs">
                          <input
                            type="text"
                            value={el.data.label}
                            onChange={(e) => updateElementData(el.id, "label", e.target.value)}
                            className="font-bold text-slate-500 uppercase tracking-wider text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
                          />
                          <div className="pt-8">
                            <input
                              type="text"
                              value={el.data.name}
                              onChange={(e) => updateElementData(el.id, "name", e.target.value)}
                              className="font-black text-slate-900 uppercase tracking-wide text-xs bg-transparent border-b border-slate-400 focus:border-amber-500 focus:outline-none w-full"
                            />
                            <input
                              type="text"
                              value={el.data.title}
                              onChange={(e) => updateElementData(el.id, "title", e.target.value)}
                              className="text-slate-600 font-semibold text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5"
                            />
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              {selectedCompany.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {el.variant === "sig_receiving_acknowledgment" && (
                        <div className="border border-slate-400 border-dashed rounded-lg p-3 my-4 bg-slate-50 text-xs">
                          <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-2">
                            <span className="font-black uppercase tracking-wider text-slate-800">{el.data.stubTitle}</span>
                            <span className="font-mono text-[10px] text-slate-500">Duplicate Copy</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-2 text-[11px]">
                            <div className="border-b border-slate-400 pb-1">
                              <span className="text-slate-400 block text-[9px]">RECEIVED BY (PRINTED NAME):</span>
                            </div>
                            <div className="border-b border-slate-400 pb-1">
                              <span className="text-slate-400 block text-[9px]">SIGNATURE:</span>
                            </div>
                            <div className="border-b border-slate-400 pb-1">
                              <span className="text-slate-400 block text-[9px]">DATE &amp; TIME RECEIVED:</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- 5. FOOTERS & NOTARIAL --- */}
                      {el.variant === "footer_notary_jurat" && (
                        <div className="pt-4 border-t border-slate-300 text-xs text-slate-700 space-y-1.5 mt-6">
                          <p className="font-bold">REPUBLIC OF THE PHILIPPINES )</p>
                          <p className="font-bold">PROVINCE OF CEBU, MANDAUE CITY ) S.S.</p>
                          <p className="text-justify leading-relaxed">
                            SUBSCRIBED AND SWORN to before me this _____ day of _______________ {el.data.docYear || "2026"} at {el.data.city}, affiant exhibiting competent evidence of identity.
                          </p>
                          <div className="flex justify-between items-end pt-4">
                            <div className="text-[10px] text-slate-500 font-mono">
                              <p>Doc. No. ____; Page No. ____;</p>
                              <p>Book No. ____; Series of {el.data.docYear || "2026"}.</p>
                            </div>
                            <div className="text-center w-56 border-t border-slate-900 pt-1 font-bold text-xs">
                              NOTARY PUBLIC
                            </div>
                          </div>
                        </div>
                      )}

                      {el.variant === "footer_corporate_security" && (
                        <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Shield size={12} className="text-emerald-700" />
                            <span>{el.data.noticeText}</span>
                          </div>
                          <span className="font-bold text-slate-700">{el.data.docCode}</span>
                        </div>
                      )}

                      {el.variant === "footer_contact_hotline" && (
                        <div className="border-t border-slate-200 pt-2 mt-4 text-center text-[10px] text-slate-500 font-semibold">
                          <span>Hotline: {el.data.hotline} • Inquiries: {el.data.email}</span>
                        </div>
                      )}

                      {el.variant === "footer_page_tracker" && (
                        <div className="border-t border-slate-200 pt-1.5 mt-4 flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>{el.data.formCode}</span>
                          <span>{el.data.pageText}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ================= RIGHT SIDE: DRAGGABLE BUILDING BLOCKS PALETTE ================= */}
        <aside className="no-print w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 shadow-lg z-20">
          {/* Palette Navigation Tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "header", label: "Header", icon: Building2 },
              { id: "addressing", label: "Addressing", icon: AlignLeft },
              { id: "body", label: "Directives", icon: FileText },
              { id: "signatory", label: "Signatory", icon: UserCheck },
              { id: "footer", label: "Footer", icon: Scale }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = paletteActiveCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaletteActiveCategory(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Palette Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">
                {MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.categoryLabel}
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-black">
                Drag to Bond Paper
              </span>
            </div>

            {MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.items.map((item) => (
              <div
                key={item.variant}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, { ...item, category: paletteActiveCategory })}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 group-hover:bg-amber-500 group-hover:text-white transition">
                      <GripVertical size={14} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900">
                      {item.name}
                    </h4>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold inline-flex items-center gap-1">
                    <Move size={10} /> Drag or Click +
                  </span>
                  <button
                    type="button"
                    onClick={() => addBlockToPaper({ ...item, category: paletteActiveCategory })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-700 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add to Paper</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Preset Tray at bottom of Sidebar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              1-Click Preset Layouts:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("non_affiliation")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left"
              >
                🛡️ Non-Affiliation
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("rewards_voucher")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left"
              >
                🏆 Rewards &amp; Voucher
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("termination_operations")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left"
              >
                🛑 Termination of Ops
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("termination_agency")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left"
              >
                📜 Agency Term.
              </button>
            </div>
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
          if (!archiveSearchQuery.trim()) return true;
          const q = archiveSearchQuery.toLowerCase().trim();
          return (
            String(d.ref || "").toLowerCase().includes(q) ||
            String(d.title || "").toLowerCase().includes(q) ||
            String(comp.name || "").toLowerCase().includes(q)
          );
        });

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
                      Select any document to load into Coupon Bond with authentic letterhead
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setArchiveModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & Company Badges */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    placeholder="Search by reference, document title, or company..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none transition shadow-2xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {companyCodes.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setArchiveCompanyFilter(item.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 border ${
                        archiveCompanyFilter === item.code
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 text-slate-700">
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Records List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
                {savedDocs.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <FileText size={36} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No saved documents yet.</p>
                  </div>
                ) : filteredDocs.map((d) => {
                  const comp = resolveCompanyFromMemoRef(d.ref, d, COMPANIES);
                  const cleanRef = normalizeDocRef(d.ref);
                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-400 hover:shadow-md transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-12 p-1 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src={comp.logoUrl} alt={comp.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                              {cleanRef}
                            </span>
                            <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                              {comp.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1 font-mono">
                              <Calendar size={12} className="text-slate-400" />
                              {d.date}
                            </span>
                          </div>
                          <h5 className="text-sm font-black text-slate-900 leading-snug">
                            {d.title || "Official Document"}
                          </h5>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedDocument(d)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Load Document</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedDocument(d.id, cleanRef)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400 font-semibold">
                  Showing {filteredDocs.length} of {savedDocs.length} records
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
