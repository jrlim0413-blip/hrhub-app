import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText, Award, ShieldAlert, X, Printer, Save, Archive,
  Search, RefreshCw, CheckCircle2, ChevronRight, Copy, Check,
  Sliders, Move, ArrowRight, ArrowUp, ArrowDown, Building2, UserCheck, Calendar,
  Download, Eye, Trash2, FileCheck, HelpCircle, Sparkles,
  Layers, Lock, AlertTriangle, Scissors, Stamp, GripVertical,
  Plus, RotateCcw, Layout, Type, AlignLeft, AlignCenter,
  Shield, QrCode, Receipt, Scale, Info
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

// ================= BOND PAPER SIZES WITH VISIBLE FRONTEND DIMENSIONS =================
// Long bond is visibly 192px taller than Short bond on screen!
export const PAPER_SIZES = [
  {
    id: "letter",
    label: "Short Bond (8.5\" × 11\")",
    widthPx: 816,
    heightPx: 1056,
    aspectRatio: "8.5 / 11",
    desc: "Short Bond • 8.5\" × 11\" (279 mm)",
    printCss: "8.5in 11in"
  },
  {
    id: "legal",
    label: "Long Bond (8.5\" × 13\")",
    widthPx: 816,
    heightPx: 1248,
    aspectRatio: "8.5 / 13",
    desc: "Long Bond • 8.5\" × 13\" (330 mm)",
    printCss: "8.5in 13in"
  },
  {
    id: "a4",
    label: "A4 Standard (8.27\" × 11.69\")",
    widthPx: 794,
    heightPx: 1123,
    aspectRatio: "210 / 297",
    desc: "A4 Standard • 210 × 297 mm",
    printCss: "A4"
  }
];

export const FONT_FAMILIES = [
  { id: "inter", label: "Modern Clean (Inter / Sans)", css: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: "arial", label: "Corporate Standard (Arial)", css: "Arial, Helvetica, sans-serif" },
  { id: "times", label: "Legal Formal (Times New Roman)", css: "'Times New Roman', Times, serif" },
  { id: "georgia", label: "Executive Serif (Georgia)", css: "Georgia, Cambria, serif" }
];

// ================= PALETTE LIBRARY: PURE MODULAR BUILDING BLOCKS =================
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
          borderStyle: "double"
        }
      },
      {
        variant: "header_minimal_left",
        name: "Modern Left-Aligned Header",
        description: "Contemporary layout with prominent left brand logo, vertical accent bar, and right-aligned branch contact directory.",
        defaultData: {}
      },
      {
        variant: "header_formal_seal",
        name: "Classic Centered Legal Seal",
        description: "Prestigious arched typography with large top-center crest seal, ideal for official certifications and formal court instruments.",
        defaultData: {}
      },
      {
        variant: "header_compact_strip",
        name: "Slim Executive Header",
        description: "Compact low-profile letterhead designed to preserve maximum printable space for dense multi-page directives.",
        defaultData: {}
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
        description: "Structured corporate box containing REF NO, DATE, TO, FROM, and SUBJECT in clear clean partitions without form input frames.",
        defaultData: {
          title: "OFFICIAL MEMORANDUM",
          to: "ALL BRANCH MANAGERS, AREA COORDINATORS & FIELD STAFF",
          from: "HUMAN RESOURCES DEPARTMENT",
          subject: "MANDATORY DIRECTIVES AND OPERATIONAL GUIDELINES"
        }
      },
      {
        variant: "address_formal_letter",
        name: "Executive Formal Letter Heading",
        description: "Standard business letter format with right-aligned date, formal addressee block, and professional salutation ('DEAR MR./MS.').",
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
          to: "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS"
        }
      },
      {
        variant: "address_certificate_ribbon",
        name: "Certificate Commendation Header",
        description: "Decorative ceremonial header ('This Certificate is Proudly Conferred upon') with elegant awardee typography.",
        defaultData: {
          conferralText: "THIS CERTIFICATE IS PROUDLY CONFERRED UPON",
          awardeeName: "MS. MARIA SANTOS",
          awardeeTitle: "Senior Area Coordinator • Operations Division"
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
          bodyText: `THIS IS TO CERTIFY that MR. JUAN DELA CRUZ, of legal age, Filipino, and residing at Mandaue City, Cebu, is NOT an employee, agent, collector, or authorized representative of [COMPANY_NAME] in any capacity whatsoever.

The aforementioned individual has NO authority to represent, transact, negotiate, solicit bets, collect funds, issue acknowledgment receipts, or enter into any contracts or undertakings for and on behalf of the Company or its authorized operations.

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
          effectiveDate: "November 15, 2026",
          bodyText: `NOTICE IS HEREBY GIVEN to all concerned employees, agents, coordinators, and the general patronizing public that [COMPANY_NAME] will PERMANENTLY CEASE AND TERMINATE all commercial and gaming operations at BRANCH OUTLET #14 (SUBANGDAKU STATION), Mandaue City, Cebu, effective November 15, 2026.

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
          bodyText: `PLEASE BE FORMALLY INFORMED that [COMPANY_NAME], acting as the PCSO Authorized Agent Corporation (AAC), has RESOLVED TO TERMINATE AND REVOKE, effective immediately upon your receipt of this notice, the AGENCY AGREEMENT entered into between yourself and this Corporation.

GROUNDS FOR TERMINATION:
This decisive contractual termination is executed pursuant to Section 9 (Breach and Default) of the Agency Agreement, stemming from documented infractions including unauthorized collection practices, non-compliance with remittal deadlines, and failure to maintain operational sales quotas.

DEMAND FOR IMMEDIATE SURRENDER OF COMPANY PROPERTY:
You are hereby commanded and given SEVENTY-TWO (72) HOURS from receipt of this notice to surrender and deliver to the Corporate Executive Office all issued Handheld POS Terminals, chargers, spare batteries, SIM cards, official bet slips, ID badges, and station decals.

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

// ================= VISUAL MINI-PREVIEW COMPONENT FOR HOVER =================
// Renders an authentic miniature visual depiction of the design on hover!
function ElementVisualPreview({ item, selectedCompany, docRef, docDate }) {
  if (!item) return null;

  // Header Previews
  if (item.category === "header") {
    if (item.variant === "header_dual_logo") {
      return (
        <div className="border-b-2 border-emerald-600 pb-2 text-[10px] bg-white p-2 rounded shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <img src={selectedCompany.logoUrl} alt="logo" className="w-8 h-8 object-contain shrink-0" />
            <div className="text-center flex-1">
              <span className="font-black uppercase block text-[10px] leading-tight text-slate-900">{selectedCompany.name}</span>
              <span className="text-[8px] text-emerald-800 font-semibold block">{selectedCompany.tagline}</span>
              <span className="text-[7px] text-slate-500 block truncate">{selectedCompany.address}</span>
            </div>
            <img src={selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"} alt="emblem" className="w-8 h-8 object-contain shrink-0" />
          </div>
        </div>
      );
    }
    if (item.variant === "header_minimal_left") {
      return (
        <div className="border-b border-slate-300 pb-2 text-[10px] bg-white p-2 rounded flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <img src={selectedCompany.logoUrl} alt="logo" className="w-7 h-7 object-contain" />
            <div className="border-l border-amber-600 pl-1.5">
              <span className="font-black text-[10px] uppercase block text-slate-900 leading-tight">{selectedCompany.name}</span>
              <span className="text-[8px] text-slate-500 uppercase">{selectedCompany.category}</span>
            </div>
          </div>
          <div className="text-right text-[7px] text-slate-400 font-mono">
            <span>{selectedCompany.contact}</span>
          </div>
        </div>
      );
    }
    if (item.variant === "header_formal_seal") {
      return (
        <div className="border-b border-double border-slate-800 pb-2 text-center bg-white p-2 rounded shadow-2xs space-y-0.5">
          <img src={selectedCompany.logoUrl} alt="seal" className="w-7 h-7 mx-auto object-contain" />
          <span className="font-black uppercase text-[10px] block text-slate-900">{selectedCompany.name}</span>
          <span className="text-[7px] text-slate-500 block">{selectedCompany.address}</span>
        </div>
      );
    }
    if (item.variant === "header_compact_strip") {
      return (
        <div className="border-b border-emerald-600 pb-1 flex items-center justify-between bg-white p-1.5 rounded shadow-2xs text-[9px]">
          <div className="flex items-center gap-1.5">
            <img src={selectedCompany.logoUrl} alt="logo" className="w-4 h-4 object-contain" />
            <span className="font-black uppercase">{selectedCompany.name}</span>
          </div>
          <span className="text-[7px] text-slate-500 font-mono">{selectedCompany.contact}</span>
        </div>
      );
    }
    if (item.variant === "header_aac_compliance") {
      return (
        <div className="border-b border-slate-900 pb-2 bg-white p-2 rounded shadow-2xs flex justify-between items-center text-[9px]">
          <div className="flex items-center gap-2">
            <img src={selectedCompany.logoUrl} alt="logo" className="w-6 h-6 object-contain" />
            <div>
              <span className="font-black uppercase block text-[10px]">{selectedCompany.name}</span>
              <span className="text-[7px] text-emerald-800 font-bold">PCSO Authorized Agent Corporation</span>
            </div>
          </div>
          <span className="text-[7px] font-mono border border-slate-300 px-1 py-0.5 rounded bg-slate-50">AAC-2026</span>
        </div>
      );
    }
  }

  // Addressing Previews
  if (item.category === "addressing") {
    if (item.variant === "address_memo_grid") {
      return (
        <div className="border border-slate-300 rounded p-2 bg-slate-50 text-[9px] space-y-1 shadow-2xs">
          <div className="flex justify-between font-bold text-slate-700 border-b pb-0.5">
            <span>MEMORANDUM</span>
            <span className="font-mono text-slate-500">{docRef}</span>
          </div>
          <div className="text-[8px] space-y-0.5">
            <p><strong>TO:</strong> All Branch Supervisors &amp; Field Staff</p>
            <p><strong>FROM:</strong> Human Resources Department</p>
            <p><strong>DATE:</strong> {docDate}</p>
            <p><strong>SUBJECT:</strong> Mandatory Operational Directives</p>
          </div>
        </div>
      );
    }
    if (item.variant === "address_formal_letter") {
      return (
        <div className="bg-white p-2 rounded border border-slate-200 text-[8px] space-y-1 shadow-2xs">
          <div className="text-right text-slate-500">{docDate}</div>
          <p className="font-bold text-slate-900 uppercase">MR. ROBERTO TAN</p>
          <p className="text-slate-600">Accredited Coordinator • Branch Operations</p>
          <p className="font-bold text-slate-800 pt-0.5">DEAR MR. TAN:</p>
        </div>
      );
    }
    if (item.variant === "address_public_notice") {
      return (
        <div className="text-center p-2 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-[7px] font-mono font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 text-amber-900">{docRef}</span>
          <p className="font-black text-[10px] uppercase tracking-wider text-slate-900">PUBLIC ADVISORY &amp; FORMAL NOTICE</p>
          <div className="h-0.5 w-16 bg-amber-600 mx-auto" />
          <p className="text-[8px] text-slate-600">TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS</p>
        </div>
      );
    }
    if (item.variant === "address_certificate_ribbon") {
      return (
        <div className="text-center p-2 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-[7px] font-bold tracking-widest text-amber-700 uppercase">THIS CERTIFICATE IS PROUDLY CONFERRED UPON</span>
          <p className="font-black text-[11px] uppercase text-slate-900">MS. MARIA SANTOS</p>
          <p className="text-[8px] text-slate-500">Senior Area Coordinator • Operations Division</p>
        </div>
      );
    }
  }

  // Directives & Body Previews
  if (item.category === "body") {
    if (item.variant === "body_rewards_voucher") {
      return (
        <div className="space-y-1.5 bg-white p-2 rounded border border-slate-200 shadow-2xs">
          <p className="text-[8px] text-slate-700 italic leading-snug">In sincere appreciation of outstanding dedication and quota performance...</p>
          <div className="border border-amber-400 bg-amber-50 p-1.5 rounded flex justify-between items-center text-[8px]">
            <div>
              <span className="text-[7px] text-slate-500 block uppercase">Incentive Grant</span>
              <strong className="text-emerald-800 text-[10px] font-black">₱5,000.00</strong>
            </div>
            <span className="font-mono text-[7px] bg-amber-200 px-1 rounded font-bold">VCH-2026-REWARD</span>
          </div>
        </div>
      );
    }
    if (item.variant === "body_non_affiliation") {
      return (
        <div className="bg-white p-2 rounded border border-rose-200 text-[8px] space-y-1 shadow-2xs">
          <strong className="text-rose-900 font-black block uppercase text-[9px]">Certificate of Non-Affiliation</strong>
          <p className="text-slate-700 leading-snug">THIS IS TO CERTIFY that MR. JUAN DELA CRUZ is NOT an employee, agent, or representative of {selectedCompany.name}...</p>
        </div>
      );
    }
    if (item.variant === "body_termination_operations") {
      return (
        <div className="bg-white p-2 rounded border border-amber-200 text-[8px] space-y-1 shadow-2xs">
          <strong className="text-amber-900 font-black block uppercase text-[9px]">Notice of Termination of Operations</strong>
          <p className="text-slate-700 leading-snug">Permanent cessation of operations at Branch Outlet #14 effective Nov 15, 2026 with 48hr asset surrender...</p>
        </div>
      );
    }
    if (item.variant === "body_termination_agency") {
      return (
        <div className="bg-white p-2 rounded border border-slate-200 text-[8px] space-y-1 shadow-2xs">
          <strong className="text-slate-900 font-black block uppercase text-[9px]">Termination of Agency Agreement</strong>
          <p className="text-slate-700 leading-snug">Resolution to revoke Agency Agreement with 72-hour surrender demand for POS machines, SIMs, and IDs...</p>
        </div>
      );
    }
    if (item.variant === "body_letter_of_explain") {
      return (
        <div className="bg-white p-2 rounded border border-purple-200 text-[8px] space-y-1 shadow-2xs">
          <strong className="text-purple-900 font-black block uppercase text-[9px]">Letter of Explanation (NTE Answer)</strong>
          <p className="text-slate-700 leading-snug">Formal written response detailing factual chronology, cellular outage circumstances, and remedial commitment...</p>
        </div>
      );
    }
    if (item.variant === "body_warning_callout") {
      return (
        <div className="border-l-2 border-rose-600 bg-rose-50 p-1.5 rounded text-[8px] text-rose-900 shadow-2xs">
          <strong>CRITICAL COMPLIANCE NOTICE:</strong> Non-compliance shall be dealt with under company administrative disciplinary sanctions.
        </div>
      );
    }
    return (
      <div className="bg-white p-2 rounded border border-slate-200 text-[8px] text-slate-700 leading-snug shadow-2xs">
        <p>Pursuant to executive directives approved by Management, all personnel are hereby instructed to comply...</p>
      </div>
    );
  }

  // Signatory Previews
  if (item.category === "signatory") {
    if (item.variant === "sig_dual_executive") {
      return (
        <div className="grid grid-cols-2 gap-3 bg-white p-2 rounded border border-slate-200 text-[8px] shadow-2xs">
          <div>
            <span className="text-[7px] text-slate-500 block">Prepared by:</span>
            <div className="border-b border-slate-800 pt-3 pb-0.5 font-bold text-slate-900">JEVINCE JAYE S. JUBAY</div>
            <span className="text-[7px] text-slate-600 block">HRMD Manager</span>
          </div>
          <div className="text-right">
            <span className="text-[7px] text-slate-500 block">Approved by:</span>
            <div className="border-b border-slate-800 pt-3 pb-0.5 font-bold text-slate-900">CHARMIE JEAN M. SIMPAL</div>
            <span className="text-[7px] text-slate-600 block">President &amp; CEO</span>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_single_official") {
      return (
        <div className="bg-white p-2 rounded border border-slate-200 text-[8px] shadow-2xs">
          <span className="text-[7px] text-slate-500 block">Issued by:</span>
          <div className="border-b border-slate-800 pt-3 pb-0.5 font-bold text-slate-900 max-w-[130px]">JEVINCE JAYE S. JUBAY</div>
          <span className="text-[7px] text-slate-600 block">HRMD Manager</span>
        </div>
      );
    }
    if (item.variant === "sig_receiving_acknowledgment") {
      return (
        <div className="border border-dashed border-slate-400 bg-slate-50 p-1.5 rounded text-[7px] space-y-1 shadow-2xs">
          <span className="font-bold block uppercase text-slate-800">Acknowledgment &amp; Receiving Slip</span>
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200">
            <span className="border-b border-slate-400 pb-0.5 text-slate-400">Name:</span>
            <span className="border-b border-slate-400 pb-0.5 text-slate-400">Signature:</span>
            <span className="border-b border-slate-400 pb-0.5 text-slate-400">Date/Time:</span>
          </div>
        </div>
      );
    }
  }

  // Footer Previews
  if (item.category === "footer") {
    if (item.variant === "footer_notary_jurat") {
      return (
        <div className="bg-white p-1.5 rounded border border-slate-200 text-[7px] text-slate-600 space-y-0.5 shadow-2xs">
          <p className="font-bold">REPUBLIC OF THE PHILIPPINES ) S.S.</p>
          <p className="leading-snug">SUBSCRIBED AND SWORN to before me this ___ day of ________ 2026...</p>
          <div className="text-right pt-1 font-bold text-slate-800">NOTARY PUBLIC</div>
        </div>
      );
    }
    return (
      <div className="bg-white p-1 rounded border border-slate-200 text-[7px] text-slate-500 flex justify-between items-center shadow-2xs">
        <span>Official Instrument • HrHub Corporate</span>
        <span className="font-mono">SEC-VERIFIED</span>
      </div>
    );
  }

  return null;
}

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

  // Active paper size definition
  const currentPaperDef = useMemo(() => {
    return PAPER_SIZES.find((p) => p.id === paperSize) || PAPER_SIZES[0];
  }, [paperSize]);

  // Document Core Identifiers
  const [docRef, setDocRef] = useState(() => generateUniqueDocRef("LBC"));
  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  });

  // ================= MODULAR BOND PAPER ELEMENTS ARRAY =================
  // Starts with a completely blank coupon bond paper!
  const [paperElements, setPaperElements] = useState([]);

  // Active / Selected element for fine-tuning
  const [activeElementId, setActiveElementId] = useState(null);

  // Hover visual preview state
  const [hoveredPreviewItem, setHoveredPreviewItem] = useState(null);

  // Drag-and-Drop Canvas State
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paletteActiveCategory, setPaletteActiveCategory] = useState("header");

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
      data: item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : {}
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

  // Update field inside a paper element safely
  const updateElementData = (elemId, key, value) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        return {
          ...el,
          data: {
            ...(el.data || {}),
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

    const headerItem = MODULAR_BLOCK_PRESETS.find((c) => c.category === "header").items[0];
    const dualSigItem = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items[0];

    if (presetKey === "non_affiliation") {
      const addr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[2];
      const body = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[0];
      const jurat = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items[0];
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...addr, category: "addressing" },
        { ...body, category: "body" },
        { ...dualSigItem, category: "signatory" },
        { ...jurat, category: "footer" }
      ];
    } else if (presetKey === "rewards_voucher") {
      const ribbon = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items[3];
      const rewardsBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items[1];
      const securityFooter = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items[1];
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
      data: item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : {}
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

    let docTitle = "Official Document";
    for (const el of paperElements) {
      if (el.data?.title) { docTitle = el.data.title; break; }
      if (el.data?.bannerTitle) { docTitle = el.data.bannerTitle; break; }
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

    if (Array.isArray(d.paperElements) && d.paperElements.length > 0) {
      setPaperElements(d.paperElements);
    } else {
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

  return (
    <div className="relative min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      {/* SCOPED PRINT STYLESHEET */}
      <style>{`
        @media print {
          @page {
            size: ${currentPaperDef.printCss};
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
                Modular Drag &amp; Drop
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Blank coupon bond paper • Drag authentic headers, addressing, directives, signatories, &amp; footers
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

      {/* ================= FLOATING HOVER VISUAL PREVIEW MODAL ================= */}
      {/* Appears when hovering over any element in the palette on the right */}
      {hoveredPreviewItem && (
        <div className="no-print fixed right-[405px] top-24 z-50 w-96 max-w-[calc(100vw-430px)] bg-white rounded-2xl border-2 border-amber-400 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Eye size={15} className="text-amber-600" />
              <span className="text-xs font-black uppercase text-slate-900 tracking-wide">
                Live Preview: {hoveredPreviewItem.name}
              </span>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {hoveredPreviewItem.category}
            </span>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 pointer-events-none text-xs overflow-hidden">
            <ElementVisualPreview
              item={hoveredPreviewItem}
              selectedCompany={selectedCompany}
              docRef={docRef}
              docDate={docDate}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span className="text-amber-700 flex items-center gap-1">
              <Sparkles size={11} /> Shown with {selectedCompany.name} letterhead
            </span>
            <span className="text-slate-400">Drag onto paper to apply</span>
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
          {/* STEP 1: PAPER CONTROLS BAR (REAL VISUAL FRONTEND SIZE SWITCHER) */}
          <div className="no-print w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/95 backdrop-blur-xs p-3 rounded-2xl border border-slate-300 shadow-sm">
            {/* Paper Size selector with visible dimension indicators */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <Scissors size={14} className="text-amber-600" />
                Bond Paper Size:
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
                {PAPER_SIZES.map((sz) => {
                  const isSelected = paperSize === sz.id;
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => {
                        setPaperSize(sz.id);
                        triggerToast(`Bond paper resized to ${sz.label}`, "info");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 shadow-xs scale-102"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      }`}
                      title={sz.desc}
                    >
                      <span>{sz.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 inline-block" />}
                    </button>
                  );
                })}
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
          {/* Note: maxWidth and minHeight dynamically scale in frontend pixels when clicked! */}
          <div
            id="coupon-bond-printable"
            style={{
              fontFamily: activeFont,
              fontSize: `${fontSize}pt`,
              lineHeight: 1.6,
              width: "100%",
              maxWidth: `${currentPaperDef.widthPx}px`,
              minHeight: `${currentPaperDef.heightPx}px`,
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: "top center",
              transition: "min-height 0.35s ease, max-width 0.35s ease, transform 0.2s ease"
            }}
            className={`bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 md:p-14 relative select-text flex flex-col justify-between ${
              isDragOverCanvas ? "ring-4 ring-amber-500/80 border-amber-500 bg-amber-50/15" : ""
            }`}
          >
            {/* Visual Paper Size Dimension Badge in Top-Right Corner */}
            <div className="no-print absolute top-3 right-4 z-10 text-[10px] font-extrabold text-slate-400 bg-slate-50/90 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 select-none pointer-events-none shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-700">{currentPaperDef.label}</span>
              <span className="text-amber-700 font-mono">({currentPaperDef.heightPx}px height)</span>
            </div>

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
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer"
                    >
                      🛡️ Non-Affiliation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("rewards_voucher")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer"
                    >
                      🏆 Rewards &amp; Voucher
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("termination_operations")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer"
                    >
                      🛑 Termination of Ops
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("termination_agency")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer"
                    >
                      📜 Agency Termination
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("letter_of_explain")}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer col-span-2 sm:col-span-1"
                    >
                      ✍️ Letter of Explain
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RENDER PLACED MODULAR ELEMENTS SEQUENTIALLY ON THE BOND PAPER */
              /* CRASH-PROOF: strictly scoped by el.category with zero textbox frames */
              <div className="space-y-6 flex-1">
                {paperElements.map((el, index) => {
                  const isHovered = activeElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={() => setActiveElementId(el.id)}
                      className={`relative group rounded-xl p-1.5 transition-all ${
                        isHovered ? "ring-1 ring-amber-400/50 bg-amber-50/5" : "hover:bg-slate-50/30"
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

                      {/* ================= CATEGORY 1: HEADERS ================= */}
                      {el.category === "header" && (
                        <div>
                          {el.variant === "header_dual_logo" && (
                            <div className="border-b-2 border-emerald-700 pb-4 mb-4 select-text">
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
                            <div className="border-b border-slate-300 pb-4 mb-4 flex items-center justify-between gap-4 select-text">
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
                            <div className="border-b-2 border-double border-slate-800 pb-4 mb-4 text-center space-y-1 select-text">
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
                            <div className="border-b border-emerald-600 pb-2 mb-3 flex items-center justify-between text-xs font-bold text-slate-800 select-text">
                              <div className="flex items-center gap-2">
                                <img src={selectedCompany.logoUrl} alt={selectedCompany.code} className="w-7 h-7 object-contain" />
                                <span className="font-black uppercase tracking-wider">{selectedCompany.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{selectedCompany.contact}</span>
                            </div>
                          )}

                          {el.variant === "header_aac_compliance" && (
                            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-3 select-text">
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
                                <span className="block font-black text-slate-800">{el.data?.aacNumber || "AAC-CEBU-2026-089"}</span>
                                <span className="text-slate-500">Accredited Agency</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 2: ADDRESSING & METADATA ================= */}
                      {el.category === "addressing" && (
                        <div>
                          {el.variant === "address_memo_grid" && (
                            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/40 text-xs text-slate-800 space-y-2 mb-4 select-text">
                              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="font-black tracking-widest text-slate-900 text-sm">MEMORANDUM</span>
                                <span className="font-mono text-slate-500 font-bold">REF: {docRef}</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 text-xs">
                                <div className="flex items-baseline">
                                  <span className="font-black text-slate-500 w-20 shrink-0">FOR / TO:</span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "to", e.currentTarget.innerText)}
                                    className="font-bold text-slate-900 flex-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.to || "ALL CONCERNED"}
                                  </span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="font-black text-slate-500 w-20 shrink-0">FROM:</span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "from", e.currentTarget.innerText)}
                                    className="font-bold text-slate-900 flex-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.from || "HUMAN RESOURCES DEPARTMENT"}
                                  </span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="font-black text-slate-500 w-20 shrink-0">DATE:</span>
                                  <span className="font-bold text-slate-800 flex-1 px-1">{docDate}</span>
                                </div>
                                <div className="flex items-baseline">
                                  <span className="font-black text-slate-500 w-20 shrink-0">SUBJECT:</span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "subject", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 flex-1 uppercase outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.subject || "OFFICIAL DIRECTIVE"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "address_formal_letter" && (
                            <div className="mb-4 text-xs text-slate-900 space-y-3 select-text">
                              <div className="text-right text-slate-600 font-bold">
                                <span>{docDate}</span>
                                <span className="block font-mono text-[11px] text-slate-500">REF: {docRef}</span>
                              </div>
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientName", e.currentTarget.innerText)}
                                  className="font-black text-sm uppercase text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientName || "RECIPIENT NAME"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientTitle", e.currentTarget.innerText)}
                                  className="font-semibold text-xs text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientTitle || "Designation"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientCompany", e.currentTarget.innerText)}
                                  className="text-xs text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientCompany || "Company / Station"}
                                </div>
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "salutation", e.currentTarget.innerText)}
                                className="font-black text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.salutation || "DEAR SIR/MADAM:"}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_public_notice" && (
                            <div className="text-center my-4 space-y-2 select-text">
                              <div className="inline-block font-mono text-[10px] font-black bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded border border-amber-300">
                                {docRef} • {docDate}
                              </div>
                              <h2
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "bannerTitle", e.currentTarget.innerText)}
                                className="text-lg sm:text-xl font-black uppercase tracking-widest text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 transition"
                              >
                                {el.data?.bannerTitle || "PUBLIC ADVISORY & FORMAL NOTICE"}
                              </h2>
                              <div className="h-0.5 w-28 bg-amber-600 mx-auto" />
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "to", e.currentTarget.innerText)}
                                className="text-xs font-bold text-slate-700 mt-2 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.to || "TO THE GENERAL PATRONIZING PUBLIC"}
                              </p>
                            </div>
                          )}

                          {el.variant === "address_certificate_ribbon" && (
                            <div className="text-center my-6 space-y-2.5 select-text">
                              <p className="text-xs font-black tracking-widest text-amber-700 uppercase">
                                {el.data?.conferralText || "THIS CERTIFICATE IS PROUDLY CONFERRED UPON"}
                              </p>
                              <h2
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "awardeeName", e.currentTarget.innerText)}
                                className="text-xl sm:text-2xl font-black uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 transition"
                              >
                                {el.data?.awardeeName || "AWARDEE NAME"}
                              </h2>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "awardeeTitle", e.currentTarget.innerText)}
                                className="text-xs font-bold text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.awardeeTitle || "Designation"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 3: DIRECTIVES & BODY ================= */}
                      {el.category === "body" && (
                        <div>
                          {el.variant === "body_rewards_voucher" ? (
                            <div className="space-y-4 my-3 select-text">
                              <div className="text-center">
                                <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
                                  {el.data?.title || "CERTIFICATE OF MERIT & INCENTIVE VOUCHER"}
                                </h3>
                              </div>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "citation", e.currentTarget.innerText)}
                                className="text-justify leading-relaxed text-slate-800 outline-none hover:bg-amber-50/30 rounded p-1 transition"
                              >
                                {el.data?.citation || ""}
                              </p>

                              {/* Authentic Incentive Voucher Card */}
                              <div className="p-4 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 text-slate-900 shadow-2xs">
                                <div className="flex justify-between items-center border-b border-amber-300 pb-2 mb-2">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                                    Corporate Incentive Merit Voucher
                                  </span>
                                  <span className="font-mono text-xs font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                                    {el.data?.voucherCode || "VCH-2026-REWARD"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary Grant</span>
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => updateElementData(el.id, "voucherAmount", e.currentTarget.innerText)}
                                      className="font-black text-xl text-emerald-800 outline-none hover:bg-white/50 rounded transition"
                                    >
                                      {el.data?.voucherAmount || "₱5,000.00"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Validity</span>
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => updateElementData(el.id, "voucherValidity", e.currentTarget.innerText)}
                                      className="font-bold text-xs text-slate-700 outline-none hover:bg-white/50 rounded transition"
                                    >
                                      {el.data?.voucherValidity || "Valid within 60 days"}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 italic mt-2 pt-1 border-t border-amber-200">
                                  {el.data?.voucherTerms || "Redeemable at Central Finance Depot."}
                                </p>
                              </div>
                            </div>
                          ) : el.variant === "body_numbered_directives" ? (
                            <div className="space-y-2 my-3 select-text">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                {el.data?.title || "DIRECTIVES"}
                              </h4>
                              <ol className="list-decimal list-inside space-y-1.5 text-xs text-justify leading-relaxed">
                                {(el.data?.items || []).map((it, idx) => (
                                  <li key={idx} className="text-slate-800 font-semibold">
                                    <span>{it}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ) : el.variant === "body_warning_callout" ? (
                            <div className="p-3.5 rounded-xl border-l-4 border-rose-600 bg-rose-50/60 my-3 space-y-1 select-text">
                              <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs uppercase tracking-wider">
                                <AlertTriangle size={15} />
                                <span>{el.data?.boxTitle || "COMPLIANCE NOTICE"}</span>
                              </div>
                              <p className="text-xs text-rose-950 font-semibold leading-relaxed text-justify">
                                {el.data?.boxMessage || ""}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 my-3 select-text">
                              {el.data?.title && (
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                  {el.data.title}
                                </h3>
                              )}
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "bodyText", e.currentTarget.innerText)}
                                className="text-justify leading-relaxed text-slate-800 whitespace-pre-line outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {(el.data?.bodyText || "").replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 4: SIGNATORIES ================= */}
                      {el.category === "signatory" && (
                        <div>
                          {el.variant === "sig_dual_executive" && (
                            <div className="grid grid-cols-2 gap-8 text-xs pt-8 mt-6 border-t border-slate-200 select-text">
                              <div>
                                <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8">
                                  {el.data?.leftLabel || "Prepared & Certified by:"}
                                </div>
                                <div className="w-60 border-b-2 border-slate-900 pb-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "leftName", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.leftName || "JEVINCE JAYE S. JUBAY, CHRP"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "leftTitle", e.currentTarget.innerText)}
                                  className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.leftTitle || "HRMD Manager"}
                                </div>
                                <div className="text-slate-500 font-bold uppercase text-[10px]">
                                  {selectedCompany.name}
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end">
                                <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8">
                                  {el.data?.rightLabel || "Approved & Confirmed by:"}
                                </div>
                                <div className="w-60 border-b-2 border-slate-900 pb-1 text-right">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "rightName", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.rightName || "CHARMIE JEAN M. SIMPAL"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "rightTitle", e.currentTarget.innerText)}
                                  className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.rightTitle || "President & CEO"}
                                </div>
                                <div className="text-slate-500 font-bold uppercase text-[10px]">
                                  {selectedCompany.name}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_single_official" && (
                            <div className="pt-8 mt-6 border-t border-slate-200 max-w-xs text-xs select-text">
                              <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8">
                                {el.data?.label || "Issued & Certified by:"}
                              </div>
                              <div className="w-60 border-b-2 border-slate-900 pb-1">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                  className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.name || "JEVINCE JAYE S. JUBAY, CHRP"}
                                </div>
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                              >
                                {el.data?.title || "HRMD Manager"}
                              </div>
                              <div className="text-slate-500 font-bold uppercase text-[10px]">
                                {selectedCompany.name}
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_triple_authority" && (
                            <div className="grid grid-cols-3 gap-4 text-xs pt-8 mt-6 border-t border-slate-200 select-text">
                              <div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] mb-6">{el.data?.col1Label || "Prepared by:"}</div>
                                <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{el.data?.col1Name}</div>
                                <div className="text-slate-500 text-[10px]">{el.data?.col1Title}</div>
                              </div>
                              <div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] mb-6">{el.data?.col2Label || "Noted by:"}</div>
                                <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{el.data?.col2Name}</div>
                                <div className="text-slate-500 text-[10px]">{el.data?.col2Title}</div>
                              </div>
                              <div>
                                <div className="font-bold text-slate-500 uppercase text-[10px] mb-6">{el.data?.col3Label || "Approved by:"}</div>
                                <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{el.data?.col3Name}</div>
                                <div className="text-slate-500 text-[10px]">{el.data?.col3Title}</div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_receiving_acknowledgment" && (
                            <div className="border border-slate-400 border-dashed rounded-lg p-3.5 my-4 bg-slate-50/80 text-xs select-text">
                              <div className="flex justify-between items-center border-b border-slate-300 pb-1.5 mb-2.5">
                                <span className="font-black uppercase tracking-wider text-slate-900">{el.data?.stubTitle || "ACKNOWLEDGMENT SLIP"}</span>
                                <span className="font-mono text-[10px] text-slate-500 font-bold">Duplicate Copy</span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 pt-4 text-[11px]">
                                <div className="border-b border-slate-900 pb-1">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Received by (Printed Name):</span>
                                </div>
                                <div className="border-b border-slate-900 pb-1">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Official Signature:</span>
                                </div>
                                <div className="border-b border-slate-900 pb-1">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Date &amp; Time Received:</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 5: FOOTERS ================= */}
                      {el.category === "footer" && (
                        <div>
                          {el.variant === "footer_notary_jurat" && (
                            <div className="pt-4 border-t border-slate-300 text-xs text-slate-700 space-y-1.5 mt-6 select-text">
                              <p className="font-bold">REPUBLIC OF THE PHILIPPINES )</p>
                              <p className="font-bold">PROVINCE OF CEBU, MANDAUE CITY ) S.S.</p>
                              <p className="text-justify leading-relaxed">
                                SUBSCRIBED AND SWORN to before me this _____ day of _______________ {el.data?.docYear || "2026"} at {el.data?.city || "Mandaue City, Cebu"}, affiant exhibiting competent evidence of identity.
                              </p>
                              <div className="flex justify-between items-end pt-5">
                                <div className="text-[10px] text-slate-500 font-mono">
                                  <p>Doc. No. ____; Page No. ____;</p>
                                  <p>Book No. ____; Series of {el.data?.docYear || "2026"}.</p>
                                </div>
                                <div className="text-center w-56 border-t border-slate-900 pt-1 font-bold text-xs">
                                  NOTARY PUBLIC
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "footer_corporate_security" && (
                            <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between text-[10px] text-slate-500 font-mono select-text">
                              <div className="flex items-center gap-1.5">
                                <Shield size={12} className="text-emerald-700" />
                                <span>{el.data?.noticeText || "Authentic corporate instrument generated via HrHub."}</span>
                              </div>
                              <span className="font-bold text-slate-700">{el.data?.docCode || "SEC-VERIFIED"}</span>
                            </div>
                          )}

                          {el.variant === "footer_contact_hotline" && (
                            <div className="border-t border-slate-200 pt-2 mt-4 text-center text-[10px] text-slate-500 font-semibold select-text">
                              <span>Hotline: {el.data?.hotline || "(+63 32) 231-9042"} • Inquiries: {el.data?.email || "compliance@hrhub-operations.com"}</span>
                            </div>
                          )}

                          {el.variant === "footer_page_tracker" && (
                            <div className="border-t border-slate-200 pt-1.5 mt-4 flex justify-between text-[9px] text-slate-400 font-mono select-text">
                              <span>{el.data?.formCode || "FORM-HRD-2026"}</span>
                              <span>{el.data?.pageText || "Page 1 of 1"}</span>
                            </div>
                          )}
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
                Hover to Preview • Drag to Bond
              </span>
            </div>

            {MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.items.map((item) => (
              <div
                key={item.variant}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, { ...item, category: paletteActiveCategory })}
                onMouseEnter={() => setHoveredPreviewItem({ ...item, category: paletteActiveCategory })}
                onMouseLeave={() => setHoveredPreviewItem(null)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2 shadow-2xs relative"
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

                  {/* Eye preview badge */}
                  <span
                    className="p-1 rounded-md text-slate-400 hover:text-amber-600 transition"
                    title="Hover to see live preview"
                  >
                    <Eye size={13} />
                  </span>
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
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left cursor-pointer"
              >
                🛡️ Non-Affiliation
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("rewards_voucher")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left cursor-pointer"
              >
                🏆 Rewards &amp; Voucher
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("termination_operations")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left cursor-pointer"
              >
                🛑 Termination of Ops
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("termination_agency")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left cursor-pointer"
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
