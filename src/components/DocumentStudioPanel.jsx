import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText, Award, ShieldAlert, X, Printer, Save, Archive, Star, Pencil, Bookmark, PlusCircle, FilePlus,
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
import { getUserSettings, saveUserSettings } from "../lib/userSettingsStorage";
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
// Physical paper dimensions tuned to match viewer 1:1 and eliminate 2nd page spillover!
export const PAPER_SIZES = [
  {
    id: "letter",
    label: "Short Bond (8.5\" × 11\")",
    widthPx: 816,
    heightPx: 1056,
    widthIn: "8.5in",
    heightIn: "11in",
    aspectRatio: "8.5 / 11",
    desc: "Short Bond • 8.5\" × 11\" (279 mm)",
    printCss: "8.5in 11in",
    pageMargin: "0.5in 0.65in"
  },
  {
    id: "legal",
    label: "Long Bond (8.5\" × 13\")",
    widthPx: 816,
    heightPx: 1248,
    widthIn: "8.5in",
    heightIn: "13in",
    aspectRatio: "8.5 / 13",
    desc: "Long Bond • 8.5\" × 13\" (330 mm / Folio)",
    printCss: "8.5in 13in",
    pageMargin: "0.45in 0.65in"
  },
  {
    id: "legal14",
    label: "Legal (8.5\" × 14\")",
    widthPx: 816,
    heightPx: 1344,
    widthIn: "8.5in",
    heightIn: "14in",
    aspectRatio: "8.5 / 14",
    desc: "Legal Standard • 8.5\" × 14\" (356 mm)",
    printCss: "8.5in 14in",
    pageMargin: "0.45in 0.65in"
  },
  {
    id: "a4",
    label: "A4 Standard (8.27\" × 11.69\")",
    widthPx: 794,
    heightPx: 1123,
    widthIn: "210mm",
    heightIn: "297mm",
    aspectRatio: "210 / 297",
    desc: "A4 Standard • 210 × 297 mm",
    printCss: "A4 portrait",
    pageMargin: "12mm 15mm"
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
      },
      {
        variant: "header_blank_letterhead",
        name: "Stationery Top Margin (Pre-Printed)",
        description: "Reserved 1.25-inch top spacing for feeding directly into pre-printed corporate letterhead paper without overlapping printed logos.",
        defaultData: {
          height: "48px"
        }
      },
      {
        variant: "header_triple_logo",
        name: "Triple Agency Header (SGC • Brand • PCSO)",
        description: "Official 3-logo letterhead showing corporate emblem left, operating company emblem center, and PCSO authority seal right.",
        defaultData: {
          leftLogo: "/id-assets/group_emblem.jpg",
          centerLogo: "",
          rightLogo: "/id-assets/pcso_logo.png"
        }
      },
      {
        variant: "header_dual_clean",
        name: "Corporate Dual-Logo Header (Clean / No Green Line)",
        description: "Official executive header with company logo left, corporate emblem right, centered company name & Barlaps address, without colored divider line.",
        defaultData: {
          companyName: "LUCKY BETPLAY CORPORATION",
          address: "#257 BARLAPS, A.S. FORTUNA STREET,\nBAKILID, MANDAUE CITY, CEBU 6014"
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
        variant: "address_termination_agency",
        name: "Agency Agreement Termination Addressing",
        description: "Official termination notice address block with Date line, Addressee Name, Field Station / Office, RE: Subject, and Salutation.",
        defaultData: {
          dateLine: "Date: _____________________",
          recipientName: "MR. DANIEL PADILLA",
          recipientOffice: "STL-ILIGAN OFFICE, LANAO DEL NORTE",
          subject: "RE: TERMINATION OF AGENCY AGREEMENT",
          salutation: "Dear Mr. Padilla,"
        }
      },
      {
        variant: "address_letter_to_explain",
        name: "Letter of Explanation / NTE Addressing",
        description: "Official Letter of Explanation heading with left-aligned Date, Recipient Name, Designation, Station / Area, RE: Subject, and Salutation.",
        defaultData: {
          date: "SEPTEMBER 28, 2026",
          recipientName: "MOSHER BEBOT",
          recipientTitle: "SALES SUPERVISOR",
          recipientStation: "MAGUINDANAO DEL NORTE",
          subject: "RE: LETTER OF EXPLANATION",
          salutation: "Dear Gomez,"
        }
      },
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
      },
      {
        variant: "address_letter_with_cc",
        name: "Executive Request Letter Addressing (with CC)",
        description: "Official inter-office request header with Date, TO executive recipient, multiple CC carbon copies (HRMD, CFO, etc.), bold SUBJECT title, and salutation.",
        defaultData: {
          date: "OCTOBER 24, 2026",
          toName: "CHARMIE JEAN M. SIMPAL, RRT",
          toTitle: "Assistant General Manager",
          toCompany: "SGC Corporation",
          toAddress: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
          ccRecipients: [
            {
              name: "JEVINCE JAYE S. JUBAY, CHRP",
              title: "HRMD Manager",
              company: "SGC Corporation",
              address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
            },
            {
              name: "FATIMA MARIE B. OBILLOS",
              title: "CFO Head",
              company: "SGC Corporation",
              address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
            }
          ],
          subject: "REQUEST FOR CORPORATE SOCIAL RESPONSIBILITY (CSR) DONATION FOR THE LABOGON FIRE VICTIMS",
          salutation: "Dear AGM Simpal,"
        }
      },
      {
        variant: "address_simple_date",
        name: "Left-Aligned Bold Date Line",
        description: "Clean bold date heading formatted as 'Date: November 06, 2026', aligned to the left margin.",
        defaultData: {
          dateLine: "Date: November 06, 2026"
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
        variant: "body_non_affiliation_salesforce",
        name: "Certificate of Non-Affiliation (Salesforce Partner / PCSO)",
        description: "Official certificate body with centered title, Date line, 4 legal non-affiliation paragraphs with bold highlights, and official verification hotline.",
        defaultData: {
          title: "CERTIFICATE OF NON-AFFILIATION",
          dateLine: "Date: November 06, 2026",
          personName: "ARJUN BAGUIO PATALINGHUG",
          personNameTitle: "Arjun Baguio Patalinghug",
          companyName: "Lucky Betplay Corporation",
          partnerRole: "Salesforce partner",
          agencyName: "Philippine Charity Sweepstakes Office (PCSO)",
          contactNumber: "09243223514"
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
        description: "Official termination of salesforce agency contract based on incident report, notarized agreement violation, and General Provisions 5.6, 5.8, 5.9.",
        defaultData: {
          incidentParagraph: "Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company. This action constitutes, based on the Agency Agreement signed and notarized on _____________________, which is attached as Annex A of this letter, which, is a terminable case.",
          provisionsIntro: "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:",
          terminationClauses: [
            "5.6. If the concerned member violates, in any way, any provision of this Contract.",
            "5.8. In case of loss of trust and confidence in the concerned member.",
            "5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force and those which may from time to time be promulgated by the Company."
          ],
          companyWarning: "Moreover, this action will not be tolerated by 5A Royal Gaming OPC, as these are grounds for cancellation of your Agency Agreement.",
          conclusionParagraph: "In conclusion, your Agency Agreement is hereby terminated effective _____________________."
        }
      },
      {
        variant: "body_letter_of_explain",
        name: "Letter of Explanation (Notice to Explain / NTE)",
        description: "Official company demand to explain with HR Admin report citation, itemized allegation bullets, 3-day deadline, General Provisions 9.11-9.15 termination grounds, and waiver warning.",
        defaultData: {
          reportCitation: "We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:",
          allegations: [
            "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
          ],
          explanationNotice: "In view thereof, you are hereby requested to explain in writing (in a language you are most comfortable with) within three (3) days from receipt hereof why your Agency Agreement with the company shall not be terminated for the said offense/s.",
          contractClauseIntro: "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:",
          contractClauses: [
            { num: "9.11", text: "Acts of theft, dishonesty, fraud, misrepresentation, or breach of trust." },
            { num: "9.12", text: "Violation of any terms in the Agency Agreement." },
            { num: "9.14", text: "Loss of trust and confidence in the Cabo or Cobrador." },
            { num: "9.15", text: "Violation of any provision of the 2020 STL RIRR, existing rules, regulations, or ethical standards, as well as future directives from the STL-AAC." }
          ],
          waiverWarning: "Failure to submit a response letter shall mean waiving your right to be heard and this case shall be dealt with given the available information.",
          closingDirective: "Please be guided accordingly."
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
      },
      {
        variant: "body_request_proposal_table",
        name: "CSR / Budget Request Proposal with Cost Table",
        description: "Official request proposal letter format with itemized cost computation table, community impact statement (malasakit), and formal approval prayer.",
        defaultData: {
          introText: "We are writing to respectfully request Management's approval for a Corporate Social Responsibility (CSR) initiative in observance of the National Day of Charity, through a donation to the fire victims in Labogon, Mandaue City, where 106 Household were affected by the fire incident on October 20, 2026.",
          proposalText: "As part of this initiative, [COMPANY_NAME] proposes to do 106 pieces of 10 Liter bottled water and 106 pieces of 5 kilos of rice to provide basic necessities and extend assistance to the affected families. The proposed cost computation for the aforementioned donations is detailed below for Management's reference and consideration.",
          tableHeaders: ["DESCRIPTION", "QUANTITY", "MARKET PRICE", "TOTAL"],
          tableRows: [
            { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
            { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
          ],
          tableTotal: "PHP 35,934.00",
          justificationText1: "This initiative aims to extend assistance within the company's available resources and demonstrate [COMPANY_NAME]'s genuine compassion and concern for the affected community.",
          justificationText2: "Furthermore, this serves as an opportunity to show the people of Mandaue City that [COMPANY_NAME] is not only present to conduct STL operations but is also committed to giving back to the community and extending a helping hand to its constituents in times of need. Through this gesture, we hope to foster goodwill and reflect the company's values of compassion, social responsibility, and malasakit.",
          closingRequest: "In this regard, we respectfully request Management's approval for a donation in an amount or form deemed appropriate and feasible by Management.",
          thankYouText: "Thank you for your kind consideration and continued support of initiatives that make a meaningful difference in our community."
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
      },
      {
        variant: "sig_staff_requestor",
        name: "Proponent / Staff Requestor Signatory",
        description: "Official staff proponent closing block ('Sincerely yours,') with employee name, HR designation, and company affiliation.",
        defaultData: {
          closeLabel: "Sincerely yours,",
          name: "QUENNIE R. CAPUYAN",
          title: "Human Resource Staff",
          company: "Lucky Betplay Corporation"
        }
      },
      {
        variant: "sig_nte_with_acknowledgment",
        name: "NTE Issuer & Employee Acknowledgment Signatory",
        description: "Official two-tier block with HR Specialist issuer line, followed by employee 'Received & acknowledged by:' with signature line and date.",
        defaultData: {
          issuerName: "JULIE E. ALMANO",
          issuerTitle: "HR Salesforce Specialist",
          ackHeading: "Received & acknowledged by:",
          recipientName: "JOEVERT SUDSUD",
          recipientTitle: "Signature Over Printed Name",
          dateLine: "Date: ____________________"
        }
      },
      {
        variant: "sig_operations_manager",
        name: "Operations Manager Sign-Off",
        description: "Official executive sign-off with 'Sincerely,' closing and OPERATIONS MANAGER signatory designation.",
        defaultData: {
          closeLabel: "Sincerely,",
          title: "OPERATIONS MANAGER"
        }
      },
      {
        variant: "sig_single_certified_by",
        name: "Certified by Signatory (with Divider Line)",
        description: "Official single signatory block preceded by a subtle horizontal divider line, 'Certified by:', signature space, and Human Resource Staff designation.",
        defaultData: {
          label: "Certified by:",
          name: "QUENNIE R. CAPUYAN",
          title: "Human Resource Staff",
          company: "Lucky Betplay Corporation"
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
      },
      {
        variant: "footer_division_center",
        name: "Corporate Division Centered Footer",
        description: "Official centered division title ('HUMAN RESOURCE MANAGEMENT DIVISION') matching corporate letterheads.",
        defaultData: {
          divisionText: "HUMAN RESOURCE MANAGEMENT DIVISION"
        }
      }
    ]
  }
];

// ================= VISUAL PREVIEW COMPONENT FOR HOVER =================
// Renders an authentic, full-scale, crystal-clear 1:1 replica of the element!
function ElementVisualPreview({ item, selectedCompany, docRef, docDate }) {
  if (!item) return null;

  // Header Previews (1:1 with bond paper output)
  if (item.category === "header") {
    if (item.variant === "header_dual_logo") {
      return (
        <div className="border-b-2 border-emerald-700 pb-4 select-text">
          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 text-center px-2">
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
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
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              <img src={selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"} alt="Corporate Emblem" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "header_minimal_left") {
      return (
        <div className="border-b border-slate-300 pb-3 flex items-center justify-between gap-4 select-text">
          <div className="flex items-center gap-3">
            <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-14 h-14 object-contain" />
            <div className="border-l-2 border-amber-600 pl-3">
              <h2 className="text-base font-black uppercase text-slate-950 tracking-tight leading-tight">
                {selectedCompany.name}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase">{selectedCompany.category}</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500 font-mono">
            <p>{selectedCompany.address}</p>
            <p>{selectedCompany.contact}</p>
          </div>
        </div>
      );
    }
    if (item.variant === "header_formal_seal") {
      return (
        <div className="border-b-2 border-double border-slate-800 pb-4 text-center space-y-1 select-text">
          <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-16 h-16 mx-auto object-contain mb-1" />
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-950">
            {selectedCompany.legalName || selectedCompany.name}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {selectedCompany.address} • {selectedCompany.contact}
          </p>
        </div>
      );
    }
    if (item.variant === "header_compact_strip") {
      return (
        <div className="border-b border-emerald-600 pb-2 flex items-center justify-between text-xs font-bold text-slate-800 select-text">
          <div className="flex items-center gap-2.5">
            <img src={selectedCompany.logoUrl} alt={selectedCompany.code} className="w-8 h-8 object-contain" />
            <span className="font-black uppercase tracking-wider text-sm">{selectedCompany.name}</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">{selectedCompany.contact}</span>
        </div>
      );
    }
    if (item.variant === "header_aac_compliance") {
      return (
        <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-3 select-text">
          <div className="flex items-center gap-3">
            <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-14 h-14 object-contain" />
            <div>
              <h2 className="text-base font-black uppercase text-slate-900">
                {selectedCompany.name}
              </h2>
              <p className="text-xs font-extrabold text-emerald-800">
                PCSO Authorized Agent Corporation (AAC) • Central Operations Hub
              </p>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <span className="block font-black text-slate-900 text-sm">{item.data?.aacNumber || "AAC-CEBU-2026-089"}</span>
            <span className="text-slate-500 text-[11px]">PCSO Accredited Agent</span>
          </div>
        </div>
      );
    }
    if (item.variant === "header_blank_letterhead") {
      return (
        <div className="py-6 border-b border-dashed border-slate-300 text-center text-xs text-slate-400 font-bold select-text">
          <span>[ Reserved Top Letterhead Space for Pre-Printed Stationery ]</span>
        </div>
      );
    }
    if (item.variant === "header_triple_logo") {
      const centerLogoSrc = item.data?.centerLogo || selectedCompany.logoUrl;
      return (
        <div className="pb-3 border-b border-slate-200 select-text">
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src={item.data?.leftLogo || selectedCompany.rightLogoUrl || "/id-assets/group_emblem.jpg"} alt="Corporate Emblem" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="w-20 h-14 flex items-center justify-center shrink-0">
              <img src={centerLogoSrc} alt={selectedCompany.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src={item.data?.rightLogo || "/id-assets/pcso_logo.png"} alt="PCSO" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "header_dual_clean") {
      return (
        <div className="pb-3 select-text">
          <div className="flex items-center justify-between gap-4">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src={item.data?.leftLogo || selectedCompany.logoUrl} alt={selectedCompany.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 text-center px-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                {item.data?.companyName || selectedCompany.legalName || selectedCompany.name || "LUCKY BETPLAY CORPORATION"}
              </h2>
              <p className="text-[10px] font-semibold text-slate-700 mt-1 leading-snug uppercase whitespace-pre-line">
                {item.data?.address || "#257 BARLAPS, A.S. FORTUNA STREET,\nBAKILID, MANDAUE CITY, CEBU 6014"}
              </p>
            </div>
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src={item.data?.rightLogo || selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"} alt="Corporate Emblem" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>
      );
    }
  }

  // Addressing Previews (1:1 with bond paper output, borderless)
  if (item.category === "addressing") {
    if (item.variant === "address_termination_agency") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-2 select-text">
          <div className="font-bold text-slate-900">{item.data?.dateLine || "Date: _____________________"}</div>
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase text-slate-950">{item.data?.recipientName || "MR. DANIEL PADILLA"}</div>
            <div className="font-bold text-[11px] uppercase text-slate-800">{item.data?.recipientOffice || "STL-ILIGAN OFFICE, LANAO DEL NORTE"}</div>
          </div>
          <div className="font-black text-xs uppercase text-slate-950 pt-1">
            {item.data?.subject || "RE: TERMINATION OF AGENCY AGREEMENT"}
          </div>
          <div className="font-bold text-xs text-slate-900 pt-0.5">{item.data?.salutation || "Dear Mr. Padilla,"}</div>
        </div>
      );
    }
    if (item.variant === "address_letter_to_explain") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-2 select-text">
          <div className="font-bold uppercase text-slate-900">{item.data?.date || "SEPTEMBER 28, 2026"}</div>
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase text-slate-950">{item.data?.recipientName || "MOSHER BEBOT"}</div>
            <div className="font-bold text-[11px] uppercase text-slate-800">{item.data?.recipientTitle || "SALES SUPERVISOR"}</div>
            <div className="font-semibold text-[11px] uppercase text-slate-700">{item.data?.recipientStation || "MAGUINDANAO DEL NORTE"}</div>
          </div>
          <div className="font-black italic text-xs uppercase text-slate-950 pt-1">
            {item.data?.subject || "RE: LETTER OF EXPLANATION"}
          </div>
          <div className="font-bold text-xs text-slate-900 pt-0.5">{item.data?.salutation || "Dear Gomez,"}</div>
        </div>
      );
    }
    if (item.variant === "address_memo_grid") {
      return (
        <div className="my-3 text-xs select-text">
          <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-1.5 mb-2.5">
            <span className="font-black tracking-widest text-slate-950 text-base">MEMORANDUM</span>
            <span className="font-mono text-slate-500 font-bold text-xs">REF: {docRef}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-baseline">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">FOR / TO:</span>
              <span className="font-bold text-slate-900 flex-1">{item.data?.to || "ALL CONCERNED (BRANCH SUPERVISORS & FIELD STAFF)"}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">FROM:</span>
              <span className="font-bold text-slate-900 flex-1">{item.data?.from || "HUMAN RESOURCES DEPARTMENT"}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">DATE:</span>
              <span className="font-bold text-slate-800 flex-1">{docDate}</span>
            </div>
            <div className="flex items-baseline border-b border-slate-300 pb-2">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">SUBJECT:</span>
              <span className="font-black text-slate-950 flex-1 uppercase">{item.data?.subject || "MANDATORY OPERATIONAL DIRECTIVES"}</span>
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "address_formal_letter") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-3 select-text">
          <div className="text-right text-slate-600 font-bold">
            <span>{docDate}</span>
            <span className="block font-mono text-[11px] text-slate-500">REF: {docRef}</span>
          </div>
          <div className="space-y-0.5">
            <div className="font-black text-sm uppercase text-slate-900">{item.data?.recipientName || "MR. ROBERTO TAN"}</div>
            <div className="font-semibold text-xs text-slate-700">{item.data?.recipientTitle || "Accredited Coordinator • Branch Operations"}</div>
            <div className="text-xs text-slate-600">{item.data?.recipientCompany || "Operations Division"}</div>
          </div>
          <div className="font-black text-xs text-slate-900 pt-1">
            {item.data?.salutation || "DEAR MR. TAN:"}
          </div>
        </div>
      );
    }
    if (item.variant === "address_public_notice") {
      return (
        <div className="text-center my-4 space-y-2 select-text">
          <div className="inline-block font-mono text-[11px] font-black bg-amber-100 text-amber-950 px-3 py-0.5 rounded border border-amber-300">
            {docRef} • {docDate}
          </div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-950">
            {item.data?.bannerTitle || "PUBLIC ADVISORY & FORMAL NOTICE"}
          </h2>
          <div className="h-0.5 w-32 bg-amber-600 mx-auto" />
          <p className="text-xs font-bold text-slate-700 mt-2">
            {item.data?.to || "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS"}
          </p>
        </div>
      );
    }
    if (item.variant === "address_certificate_ribbon") {
      return (
        <div className="text-center my-4 space-y-2 select-text">
          <p className="text-xs font-black tracking-widest text-amber-700 uppercase">
            {item.data?.conferralText || "THIS CERTIFICATE IS PROUDLY CONFERRED UPON"}
          </p>
          <h2 className="text-2xl font-black uppercase text-slate-950">
            {item.data?.awardeeName || "MS. MARIA SANTOS"}
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {item.data?.awardeeTitle || "Senior Area Coordinator • Operations Division"}
          </p>
        </div>
      );
    }
    if (item.variant === "address_letter_with_cc") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-2.5 select-text">
          <div className="font-bold text-slate-900 uppercase">{item.data?.date || "OCTOBER 24, 2026"}</div>
          <div className="flex gap-3">
            <span className="font-black text-slate-900 w-8">TO:</span>
            <div>
              <div className="font-black text-xs uppercase text-slate-950">{item.data?.toName || "CHARMIE JEAN M. SIMPAL, RRT"}</div>
              <div className="text-[11px] text-slate-700">{item.data?.toTitle || "Assistant General Manager"} • {item.data?.toCompany || "SGC Corporation"}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="font-black text-slate-900 w-8">CC:</span>
            <div className="text-[11px] text-slate-600">
              {(item.data?.ccRecipients || []).map((c) => c.name).join(", ") || "JEVINCE JAYE S. JUBAY, FATIMA MARIE B. OBILLOS"}
            </div>
          </div>
          <div className="font-black text-xs uppercase text-slate-950 border-t border-slate-200 pt-1">
            {item.data?.subject?.startsWith("SUBJECT:") ? item.data.subject : `SUBJECT: ${item.data?.subject || "REQUEST FOR CSR DONATION"}`}
          </div>
          <div className="font-bold text-xs text-slate-800">{item.data?.salutation || "Dear AGM Simpal,"}</div>
        </div>
      );
    }
    if (item.variant === "address_simple_date") {
      return (
        <div className="my-2 select-text font-bold text-xs text-slate-950">
          {item.data?.dateLine || "Date: November 06, 2026"}
        </div>
      );
    }
  }

  // Directives & Body Previews (1:1 with bond paper output)
  if (item.category === "body") {
    if (item.variant === "body_rewards_voucher") {
      return (
        <div className="space-y-3 my-3 select-text">
          <div className="text-center">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              {item.data?.title || "CERTIFICATE OF MERIT & INCENTIVE VOUCHER"}
            </h3>
          </div>
          <p className="text-justify text-xs leading-relaxed text-slate-800">
            {item.data?.citation || "In sincere appreciation of outstanding dedication, exemplary teamwork, and consistent quota achievement in regional operations..."}
          </p>
          <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 text-slate-900">
            <div className="flex justify-between items-center border-b border-amber-300 pb-1.5 mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-900">
                Corporate Incentive Merit Voucher
              </span>
              <span className="font-mono text-xs font-black bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded border border-amber-300">
                {item.data?.voucherCode || "VCH-2026-REWARD"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary Grant</span>
                <div className="font-black text-xl text-emerald-800">{item.data?.voucherAmount || "₱5,000.00"}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Validity</span>
                <div className="font-bold text-xs text-slate-700">{item.data?.voucherValidity || "Valid within 60 days from issuance"}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "body_numbered_directives") {
      return (
        <div className="space-y-2 my-3 select-text">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            {item.data?.title || "DIRECTIVES & MANDATORY PROTOCOLS"}
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-justify leading-relaxed">
            {(item.data?.items || [
              "Strict compliance with daily cash turnover cut-off time of 5:00 PM.",
              "Unauthorized transactions and off-system gaming ticket issuances are strictly prohibited.",
              "Failure to adhere shall result in immediate formal administrative inquiry and suspension."
            ]).map((it, idx) => (
              <li key={idx} className="text-slate-800 font-semibold">{it}</li>
            ))}
          </ol>
        </div>
      );
    }
    if (item.variant === "body_warning_callout") {
      return (
        <div className="p-3 rounded-xl border-l-4 border-rose-600 bg-rose-50/70 my-3 space-y-1 select-text">
          <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs uppercase tracking-wider">
            <AlertTriangle size={15} />
            <span>{item.data?.boxTitle || "CRITICAL COMPLIANCE NOTICE"}</span>
          </div>
          <p className="text-xs text-rose-950 font-semibold leading-relaxed text-justify">
            {item.data?.boxMessage || "Any deviation from authorized operational guidelines constitutes gross negligence under company policies and applicable statutory labor regulations."}
          </p>
        </div>
      );
    }
    if (item.variant === "body_request_proposal_table") {
      return (
        <div className="space-y-2 my-2 text-xs leading-relaxed text-slate-900 select-text">
          <p className="line-clamp-2 text-justify">
            {(item.data?.introText || "").replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
          </p>
          <div className="my-2 border border-slate-900 rounded overflow-hidden">
            <table className="w-full text-[10px] text-slate-900 border-collapse">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="p-1 text-left">DESCRIPTION</th>
                  <th className="p-1 text-center">QTY</th>
                  <th className="p-1 text-right">PRICE</th>
                  <th className="p-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {(item.data?.tableRows || [
                  { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
                  { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
                ]).map((r, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="p-1 font-semibold">{r.desc}</td>
                    <td className="p-1 text-center">{r.qty}</td>
                    <td className="p-1 text-right font-mono">{r.price}</td>
                    <td className="p-1 text-right font-mono font-bold">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black border-t border-slate-900">
                  <td colSpan={3} className="p-1 text-center font-bold">TOTAL</td>
                  <td className="p-1 text-right font-mono font-black">{item.data?.tableTotal || "PHP 35,934.00"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="line-clamp-2 text-justify text-slate-700">
            {(item.data?.justificationText2 || "").replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
          </p>
        </div>
      );
    }
    if (item.variant === "body_letter_of_explain") {
      return (
        <div className="space-y-2 my-2.5 text-xs text-slate-900 select-text leading-relaxed">
          <p className="text-justify font-normal">
            {item.data?.reportCitation || "We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:"}
          </p>
          <div className="pl-4 space-y-1">
            {(item.data?.allegations || [
              "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
            ]).map((al, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-justify">
                <span>•</span>
                <span className="flex-1">{al}</span>
              </div>
            ))}
          </div>
          <p className="text-justify font-normal">
            {item.data?.explanationNotice || "In view thereof, you are hereby requested to explain in writing within three (3) days from receipt hereof why your Agency Agreement with the company shall not be terminated for the said offense/s."}
          </p>
          <div className="pl-6 space-y-1 font-bold italic text-slate-950 text-[11px]">
            <div>9.11 Acts of theft, dishonesty, fraud, misrepresentation, or breach of trust.</div>
            <div>9.12 Violation of any terms in the Agency Agreement.</div>
            <div>9.14 Loss of trust and confidence in the Cabo or Cobrador.</div>
            <div>9.15 Violation of any provision of the 2020 STL RIRR, existing rules...</div>
          </div>
          <p className="text-justify font-normal">
            {item.data?.waiverWarning || "Failure to submit a response letter shall mean waiving your right to be heard and this case shall be dealt with given the available information."}
          </p>
          <p className="font-medium">
            {item.data?.closingDirective || "Please be guided accordingly."}
          </p>
        </div>
      );
    }
    if (item.variant === "body_termination_agency") {
      return (
        <div className="space-y-2 my-2.5 text-xs text-slate-900 select-text leading-relaxed">
          <p className="text-justify font-normal indent-4">
            {item.data?.incidentParagraph || "Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company. This action constitutes, based on the Agency Agreement signed and notarized on _____________________, which is attached as Annex A of this letter, which, is a terminable case."}
          </p>
          <p className="text-justify font-normal">
            {item.data?.provisionsIntro || "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:"}
          </p>
          <div className="pl-4 space-y-1 font-semibold text-slate-950 text-[11px]">
            <div>• 5.6. If the concerned member violates, in any way, any provision of this Contract.</div>
            <div>• 5.8. In case of loss of trust and confidence in the concerned member.</div>
            <div>• 5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force...</div>
          </div>
          <p className="text-justify font-normal">
            {item.data?.companyWarning || "Moreover, this action will not be tolerated by 5A Royal Gaming OPC, as these are grounds for cancellation of your Agency Agreement."}
          </p>
          <p className="font-medium">
            {item.data?.conclusionParagraph || "In conclusion, your Agency Agreement is hereby terminated effective _____________________."}
          </p>
        </div>
      );
    }
    if (item.variant === "body_non_affiliation_salesforce") {
      return (
        <div className="space-y-2.5 my-2 text-xs leading-relaxed text-slate-900 select-text">
          <div className="text-center font-black text-sm tracking-wide uppercase text-slate-950">
            {item.data?.title || "CERTIFICATE OF NON-AFFILIATION"}
          </div>
          {item.data?.dateLine && (
            <div className="font-bold text-xs text-slate-950">
              {item.data.dateLine}
            </div>
          )}
          <p className="text-justify line-clamp-3">
            This is to certify that <strong>{item.data?.personName || "ARJUN BAGUIO PATALINGHUG"}</strong>, is not <strong>affiliated</strong> with <strong>{item.data?.companyName || selectedCompany.name}</strong> as a Salesforce partner under the <strong>{item.data?.agencyName || "Philippine Charity Sweepstakes Office (PCSO)"}</strong>.
          </p>
          <div className="text-slate-600 text-[11px] font-mono">
            Hotline: <strong>{item.data?.contactNumber || "09243223514"}</strong>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 my-3 select-text">
        {item.data?.title && (
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {item.data.title}
          </h3>
        )}
        <div className="text-justify text-xs leading-relaxed text-slate-800 whitespace-pre-line">
          {(item.data?.bodyText || "").replace(/[COMPANY_NAME]/g, selectedCompany.name)}
        </div>
      </div>
    );
  }

  // Signatory Previews (1:1 with bond paper output, borderless)
  if (item.category === "signatory") {
    if (item.variant === "sig_dual_executive") {
      return (
        <div className="grid grid-cols-2 gap-8 text-xs pt-6 mt-4 border-t border-slate-300 select-text">
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-6">
              {item.data?.leftLabel || "Prepared & Certified by:"}
            </div>
            <div className="w-56 border-b-2 border-slate-900 pb-1">
              <div className="font-black text-slate-950 uppercase text-xs tracking-wide">
                {item.data?.leftName || "JEVINCE JAYE S. JUBAY, CHRP"}
              </div>
            </div>
            <div className="text-slate-600 font-semibold text-[11px] mt-0.5">
              {item.data?.leftTitle || "HRMD Manager"}
            </div>
            <div className="text-slate-500 font-bold uppercase text-[10px]">
              {selectedCompany.name}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-6">
              {item.data?.rightLabel || "Approved & Confirmed by:"}
            </div>
            <div className="w-56 border-b-2 border-slate-900 pb-1 text-right">
              <div className="font-black text-slate-950 uppercase text-xs tracking-wide">
                {item.data?.rightName || "CHARMIE JEAN M. SIMPAL"}
              </div>
            </div>
            <div className="text-slate-600 font-semibold text-[11px] mt-0.5">
              {item.data?.rightTitle || "President & CEO"}
            </div>
            <div className="text-slate-500 font-bold uppercase text-[10px]">
              {selectedCompany.name}
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_single_official") {
      return (
        <div className="pt-6 mt-4 border-t border-slate-300 max-w-xs text-xs select-text">
          <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-6">
            {item.data?.label || "Issued & Certified by:"}
          </div>
          <div className="w-56 border-b-2 border-slate-900 pb-1">
            <div className="font-black text-slate-950 uppercase text-xs tracking-wide">
              {item.data?.name || "JEVINCE JAYE S. JUBAY, CHRP"}
            </div>
          </div>
          <div className="text-slate-600 font-semibold text-[11px] mt-0.5">
            {item.data?.title || "HRMD Manager"}
          </div>
          <div className="text-slate-500 font-bold uppercase text-[10px]">
            {selectedCompany.name}
          </div>
        </div>
      );
    }
    if (item.variant === "sig_triple_authority") {
      return (
        <div className="grid grid-cols-3 gap-4 text-xs pt-6 mt-4 border-t border-slate-300 select-text">
          <div>
            <div className="font-bold text-slate-500 uppercase text-[10px] mb-5">{item.data?.col1Label || "Prepared by:"}</div>
            <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{item.data?.col1Name || "JEVINCE JAYE S. JUBAY"}</div>
            <div className="text-slate-500 text-[10px]">{item.data?.col1Title || "HRMD Manager"}</div>
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase text-[10px] mb-5">{item.data?.col2Label || "Noted by:"}</div>
            <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{item.data?.col2Name || "ATTY. REGIONAL COUNSEL"}</div>
            <div className="text-slate-500 text-[10px]">{item.data?.col2Title || "Legal Directorate"}</div>
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase text-[10px] mb-5">{item.data?.col3Label || "Approved by:"}</div>
            <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{item.data?.col3Name || "CHARMIE JEAN M. SIMPAL"}</div>
            <div className="text-slate-500 text-[10px]">{item.data?.col3Title || "President & CEO"}</div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_receiving_acknowledgment") {
      return (
        <div className="border-t-2 border-dashed border-slate-400 pt-3 my-4 text-xs select-text">
          <div className="flex justify-between items-center pb-1.5 mb-2">
            <span className="font-black uppercase tracking-wider text-slate-900 text-[11px]">{item.data?.stubTitle || "ACKNOWLEDGMENT & RECEIVING SLIP"}</span>
            <span className="font-mono text-[10px] text-slate-500 font-bold">Duplicate Copy • Return to HRMD</span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3 text-[11px]">
            <div className="border-b border-slate-800 pb-1">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Received by (Printed Name):</span>
            </div>
            <div className="border-b border-slate-800 pb-1">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Official Signature:</span>
            </div>
            <div className="border-b border-slate-800 pb-1">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Date & Time Received:</span>
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_staff_requestor") {
      return (
        <div className="pt-4 my-2 max-w-xs text-xs select-text space-y-4">
          <div className="text-slate-800 text-xs font-semibold">{item.data?.closeLabel || "Sincerely yours,"}</div>
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase text-slate-950 border-b border-slate-800 pb-0.5 w-48">{item.data?.name || "QUENNIE R. CAPUYAN"}</div>
            <div className="text-slate-600 text-[11px]">{item.data?.title || "Human Resource Staff"}</div>
            <div className="text-slate-500 font-bold uppercase text-[9px]">{item.data?.company || selectedCompany.name}</div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_nte_with_acknowledgment") {
      return (
        <div className="pt-4 my-2 text-xs select-text space-y-5">
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase underline text-slate-950">
              {item.data?.issuerName || "JULIE E. ALMANO"}
            </div>
            <div className="text-slate-700 text-[11px]">
              {item.data?.issuerTitle || "HR Salesforce Specialist"}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="text-slate-700 text-xs font-semibold">{item.data?.ackHeading || "Received & acknowledged by:"}</div>
            <div className="space-y-0.5">
              <div className="font-black text-xs uppercase text-slate-950">{item.data?.recipientName || "JOEVERT SUDSUD"}</div>
              <div className="text-slate-600 text-[11px]">{item.data?.recipientTitle || "Signature Over Printed Name"}</div>
              <div className="text-slate-600 font-mono text-[10px]">{item.data?.dateLine || "Date: ____________________"}</div>
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_operations_manager") {
      return (
        <div className="pt-4 my-2 text-xs select-text space-y-6">
          <div className="text-slate-800 text-xs font-semibold">{item.data?.closeLabel || "Sincerely,"}</div>
          <div className="font-black text-xs uppercase text-slate-950 tracking-wider">
            {item.data?.title || "OPERATIONS MANAGER"}
          </div>
        </div>
      );
    }
    if (item.variant === "sig_single_certified_by") {
      return (
        <div className="pt-3 my-2 text-xs select-text">
          <div className="border-b border-slate-300 mb-4" />
          <div className="space-y-4">
            <div className="text-slate-800 font-semibold">{item.data?.label || "Certified by:"}</div>
            <div className="space-y-0.5">
              <div className="font-black text-xs uppercase text-slate-950">{item.data?.name || "QUENNIE R. CAPUYAN"}</div>
              <div className="text-slate-700 text-[11px]">{item.data?.title || "Human Resource Staff"}</div>
              <div className="text-slate-500 font-bold uppercase text-[10px]">{item.data?.company || selectedCompany.name}</div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Footer Previews (1:1 with bond paper output)
  if (item.category === "footer") {
    if (item.variant === "footer_division_center") {
      return (
        <div className="border-t border-slate-300 pt-3 mt-4 text-center text-xs text-slate-600 font-black tracking-widest uppercase select-text">
          {item.data?.divisionText || "HUMAN RESOURCE MANAGEMENT DIVISION"}
        </div>
      );
    }
    if (item.variant === "footer_notary_jurat") {
      return (
        <div className="pt-4 border-t border-slate-300 text-xs text-slate-700 space-y-1.5 mt-4 select-text">
          <p className="font-bold">REPUBLIC OF THE PHILIPPINES )</p>
          <p className="font-bold">PROVINCE OF CEBU, MANDAUE CITY ) S.S.</p>
          <p className="text-justify text-[11px] leading-relaxed">
            SUBSCRIBED AND SWORN to before me this _____ day of _______________ {item.data?.docYear || "2026"} at {item.data?.city || "Mandaue City, Cebu"}, affiant exhibiting competent evidence of identity.
          </p>
          <div className="flex justify-between items-end pt-4">
            <div className="text-[10px] text-slate-500 font-mono">
              <p>Doc. No. ____; Page No. ____;</p>
              <p>Book No. ____; Series of {item.data?.docYear || "2026"}.</p>
            </div>
            <div className="text-center w-52 border-t border-slate-900 pt-1 font-bold text-xs">
              NOTARY PUBLIC
            </div>
          </div>
        </div>
      );
    }
    if (item.variant === "footer_corporate_bar") {
      return (
        <div className="border-t border-slate-300 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono select-text">
          <div>{selectedCompany.contact} • {selectedCompany.address}</div>
          <div className="italic text-[10px]">Strictly Confidential • Official Records</div>
        </div>
      );
    }
    if (item.variant === "footer_doc_control") {
      return (
        <div className="border-t border-slate-300 pt-2 mt-4 flex justify-between text-[10px] text-slate-500 font-mono select-text">
          <span>{docRef} • REV-01</span>
          <span>Page 1 of 1</span>
          <span>CONFIDENTIAL DOCUMENT</span>
        </div>
      );
    }
    return (
      <div className="border-t border-slate-300 pt-2 mt-4 text-center text-xs text-slate-500 font-semibold select-text">
        {selectedCompany.legalName || selectedCompany.name} • Official Administrative Instrument
      </div>
    );
  }

  return null;
}

// ================= CUSTOM REUSABLE TEMPLATES STORAGE =================
export const CUSTOM_TEMPLATES_STORAGE_KEY = "hrhub_doc_studio_custom_templates";

export function getStoredCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomTemplates(templates = []) {
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to save custom templates to localStorage:", e);
  }
}


// ================= MODAL: EXECUTIVE TEMPLATE STUDIO & CUSTOMIZER =================
// Full-featured, spacious, highly presentable customizer for all element categories
function TemplateEditorModal({
  isOpen,
  initialData,
  selectedCompany,
  docRef,
  docDate,
  onClose,
  onSave,
  onSaveAndApply
}) {
  if (!isOpen) return null;

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "body");
  const [variant, setVariant] = useState(initialData?.variant || "body_standard");
  const [formData, setFormData] = useState(initialData?.data || {});

  const updateField = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const insertTag = (tag) => {
    const current = formData.bodyText || "";
    updateField("bodyText", current + (current ? " " : "") + tag);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: initialData?.id || (initialData?.isCustom ? initialData.id : null),
      name: name.trim(),
      description: description.trim() || `Custom ${category} template`,
      category,
      variant,
      data: formData,
      isCustom: true
    });
  };

  const handleSaveAndAddToPaper = () => {
    if (!name.trim()) return;
    const templateObj = {
      id: initialData?.id || (initialData?.isCustom ? initialData.id : null),
      name: name.trim(),
      description: description.trim() || `Custom ${category} template`,
      category,
      variant,
      data: formData,
      isCustom: true
    };
    if (onSaveAndApply) {
      onSaveAndApply(templateObj);
    } else {
      onSave(templateObj);
    }
  };

  // Live preview representation
  const previewItem = {
    category,
    variant,
    name: name || "Custom Template",
    data: formData
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl xl:max-w-7xl rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-md">
              <Bookmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Executive Template Studio
                </h3>
                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {category} • {variant}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Customize content, phrasing, and signatories. Changes are saved locally for instant 1-click reuse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition"
              title="Close Customizer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Main Grid: Left (Rich Form Editor) & Right (Drafting Table & Real Bond Paper Preview) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pr-1">
          {/* LEFT COLUMN: Form Inputs (7 Cols) */}
          <form onSubmit={handleFormSubmit} id="custom-template-form" className="lg:col-span-6 space-y-4 text-xs pr-1">
            {/* Template Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                1. Template Identity &amp; Classification
              </span>
              <div>
                <label className="block text-[11px] font-black text-slate-800 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mindanao Operations Mandatory Memo Directives"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-bold text-slate-900 bg-white text-xs transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard 5-point directive block for branch audits and cash cutoff"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-amber-500 focus:outline-none text-slate-700 bg-white text-xs transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Category</span>
                  <span className="font-black text-xs text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block truncate uppercase">
                    {category}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Design Variant</span>
                  <span className="font-mono text-[11px] text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block truncate">
                    {variant}
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC CONTENT FIELDS ACCORDING TO VARIANT */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  2. Content &amp; Document Text
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Entity: {selectedCompany.name}
                </span>
              </div>

              {/* Triple Logo Agency Header */}
              {variant === "header_triple_logo" && (
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">3-Logo Agency Letterhead Configuration:</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 border rounded-lg bg-slate-50 flex flex-col items-center justify-between">
                        <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Left Logo</span>
                        <img src={formData.leftLogo || "/id-assets/group_emblem.jpg"} alt="Left Logo" className="h-10 object-contain" />
                        <span className="text-[9px] text-slate-400 block mt-1">SGC Group Emblem</span>
                      </div>
                      <div className="p-2 border rounded-lg bg-slate-50 flex flex-col items-center justify-between">
                        <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Center Brand</span>
                        <img src={formData.centerLogo || selectedCompany.logoUrl} alt="Center Logo" className="h-10 object-contain" />
                        <select
                          value={formData.centerLogo || selectedCompany.logoUrl}
                          onChange={(e) => updateField("centerLogo", e.target.value)}
                          className="w-full mt-1 text-[10px] border border-slate-300 rounded px-1 py-0.5 bg-white font-medium"
                        >
                          {COMPANIES.map((c) => (
                            <option key={c.id} value={c.logoUrl}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="p-2 border rounded-lg bg-slate-50 flex flex-col items-center justify-between">
                        <span className="text-[9.5px] font-bold text-slate-500 block mb-1">Right Logo</span>
                        <img src={formData.rightLogo || "/id-assets/pcso_logo.png"} alt="Right Logo" className="h-10 object-contain" />
                        <span className="text-[9px] text-slate-400 block mt-1">PCSO Official Seal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Addressing Grid */}
              {variant === "address_memo_grid" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">FOR / TO:</label>
                    <input
                      type="text"
                      value={formData.to || ""}
                      onChange={(e) => updateField("to", e.target.value)}
                      placeholder="ALL BRANCH MANAGERS, AREA COORDINATORS & FIELD STAFF"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">FROM:</label>
                    <input
                      type="text"
                      value={formData.from || ""}
                      onChange={(e) => updateField("from", e.target.value)}
                      placeholder="HUMAN RESOURCES DEPARTMENT"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">SUBJECT:</label>
                    <input
                      type="text"
                      value={formData.subject || ""}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="MANDATORY DIRECTIVES & OPERATIONAL PROTOCOLS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white uppercase font-black"
                    />
                  </div>
                </div>
              )}

              {/* Formal Letter Heading */}
              {variant === "address_formal_letter" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Recipient Full Name:</label>
                    <input
                      type="text"
                      value={formData.recipientName || ""}
                      onChange={(e) => updateField("recipientName", e.target.value)}
                      placeholder="MR. ROBERTO TAN"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation / Title:</label>
                      <input
                        type="text"
                        value={formData.recipientTitle || ""}
                        onChange={(e) => updateField("recipientTitle", e.target.value)}
                        placeholder="Accredited Coordinator / Branch Supervisor"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Station:</label>
                      <input
                        type="text"
                        value={formData.recipientCompany || ""}
                        onChange={(e) => updateField("recipientCompany", e.target.value)}
                        placeholder="Central Operations Station"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Formal Salutation:</label>
                    <input
                      type="text"
                      value={formData.salutation || ""}
                      onChange={(e) => updateField("salutation", e.target.value)}
                      placeholder="DEAR MR. TAN:"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>
                </div>
              )}

              {/* Public Advisory Notice Banner */}
              {variant === "address_public_notice" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Banner Headline Title:</label>
                    <input
                      type="text"
                      value={formData.bannerTitle || ""}
                      onChange={(e) => updateField("bannerTitle", e.target.value)}
                      placeholder="PUBLIC ADVISORY & FORMAL NOTICE"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Addressed Public / Group:</label>
                    <input
                      type="text"
                      value={formData.to || ""}
                      onChange={(e) => updateField("to", e.target.value)}
                      placeholder="TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Certificate Ribbon */}
              {variant === "address_certificate_ribbon" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Conferral Phrasing:</label>
                    <input
                      type="text"
                      value={formData.conferralText || ""}
                      onChange={(e) => updateField("conferralText", e.target.value)}
                      placeholder="THIS CERTIFICATE IS PROUDLY CONFERRED UPON"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Awardee Name:</label>
                    <input
                      type="text"
                      value={formData.awardeeName || ""}
                      onChange={(e) => updateField("awardeeName", e.target.value)}
                      placeholder="MS. MARIA SANTOS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Awardee Title / Division:</label>
                    <input
                      type="text"
                      value={formData.awardeeTitle || ""}
                      onChange={(e) => updateField("awardeeTitle", e.target.value)}
                      placeholder="Senior Area Coordinator • Operations Division"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Executive Request Letter Addressing with CC */}
              {variant === "address_letter_with_cc" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Letter Date:</label>
                    <input
                      type="text"
                      value={formData.date || ""}
                      onChange={(e) => updateField("date", e.target.value)}
                      placeholder="e.g. OCTOBER 24, 2026"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">TO (Target Executive):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.toName || ""}
                        onChange={(e) => updateField("toName", e.target.value)}
                        placeholder="CHARMIE JEAN M. SIMPAL, RRT"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-900"
                      />
                      <input
                        type="text"
                        value={formData.toTitle || ""}
                        onChange={(e) => updateField("toTitle", e.target.value)}
                        placeholder="Assistant General Manager"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.toCompany || ""}
                        onChange={(e) => updateField("toCompany", e.target.value)}
                        placeholder="SGC Corporation"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                      />
                      <input
                        type="text"
                        value={formData.toAddress || ""}
                        onChange={(e) => updateField("toAddress", e.target.value)}
                        placeholder="Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">SUBJECT Line:</label>
                    <input
                      type="text"
                      value={formData.subject || ""}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="REQUEST FOR CORPORATE SOCIAL RESPONSIBILITY (CSR) DONATION..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Salutation:</label>
                    <input
                      type="text"
                      value={formData.salutation || ""}
                      onChange={(e) => updateField("salutation", e.target.value)}
                      placeholder="Dear AGM Simpal,"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Letter of Explanation / NTE Addressing */}
              {variant === "address_letter_to_explain" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Letter Date:</label>
                    <input
                      type="text"
                      value={formData.date || ""}
                      onChange={(e) => updateField("date", e.target.value)}
                      placeholder="e.g. SEPTEMBER 28, 2026"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Recipient Addressee:</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Full Name:</label>
                      <input
                        type="text"
                        value={formData.recipientName || ""}
                        onChange={(e) => updateField("recipientName", e.target.value)}
                        placeholder="MOSHER BEBOT"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black uppercase text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Designation / Title:</label>
                        <input
                          type="text"
                          value={formData.recipientTitle || ""}
                          onChange={(e) => updateField("recipientTitle", e.target.value)}
                          placeholder="SALES SUPERVISOR"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Area / Division:</label>
                        <input
                          type="text"
                          value={formData.recipientStation || ""}
                          onChange={(e) => updateField("recipientStation", e.target.value)}
                          placeholder="MAGUINDANAO DEL NORTE"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Subject (RE:) Line:</label>
                    <input
                      type="text"
                      value={formData.subject || ""}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="RE: LETTER OF EXPLANATION"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black italic"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Salutation:</label>
                    <input
                      type="text"
                      value={formData.salutation || ""}
                      onChange={(e) => updateField("salutation", e.target.value)}
                      placeholder="Dear Gomez,"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Agency Agreement Termination Addressing */}
              {variant === "address_termination_agency" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Notice Date Line:</label>
                    <input
                      type="text"
                      value={formData.dateLine || ""}
                      onChange={(e) => updateField("dateLine", e.target.value)}
                      placeholder="Date: _____________________"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Recipient Addressee:</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Full Name:</label>
                      <input
                        type="text"
                        value={formData.recipientName || ""}
                        onChange={(e) => updateField("recipientName", e.target.value)}
                        placeholder="MR. DANIEL PADILLA"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black uppercase text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Branch / Office Station:</label>
                      <input
                        type="text"
                        value={formData.recipientOffice || ""}
                        onChange={(e) => updateField("recipientOffice", e.target.value)}
                        placeholder="STL-ILIGAN OFFICE, LANAO DEL NORTE"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Subject Line:</label>
                    <input
                      type="text"
                      value={formData.subject || ""}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="RE: TERMINATION OF AGENCY AGREEMENT"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Salutation:</label>
                    <input
                      type="text"
                      value={formData.salutation || ""}
                      onChange={(e) => updateField("salutation", e.target.value)}
                      placeholder="Dear Mr. Padilla,"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Rewards Voucher */}
              {variant === "body_rewards_voucher" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Voucher Instrument Title:</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="CERTIFICATE OF MERIT & INCENTIVE VOUCHER"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Commendation / Citation Text:</label>
                    <textarea
                      rows={3}
                      value={formData.citation || ""}
                      onChange={(e) => updateField("citation", e.target.value)}
                      placeholder="In sincere appreciation of outstanding dedication, exemplary teamwork, and consistent quota achievement..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-emerald-800 mb-1">Monetary Grant (Amount):</label>
                      <input
                        type="text"
                        value={formData.voucherAmount || ""}
                        onChange={(e) => updateField("voucherAmount", e.target.value)}
                        placeholder="₱5,000.00"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-emerald-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Voucher Serial Code:</label>
                      <input
                        type="text"
                        value={formData.voucherCode || ""}
                        onChange={(e) => updateField("voucherCode", e.target.value)}
                        placeholder="VCH-2026-REWARD"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Validity:</label>
                      <input
                        type="text"
                        value={formData.voucherValidity || ""}
                        onChange={(e) => updateField("voucherValidity", e.target.value)}
                        placeholder="Valid within 60 days from issuance"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Terms:</label>
                      <input
                        type="text"
                        value={formData.voucherTerms || ""}
                        onChange={(e) => updateField("voucherTerms", e.target.value)}
                        placeholder="Redeemable at Central Finance Depot."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Numbered Directives */}
              {variant === "body_numbered_directives" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Directives Heading:</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="DIRECTIVES & MANDATORY PROTOCOLS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700">Directive Items (One per line):</label>
                      <span className="text-[10px] text-amber-700 italic">Enter each rule on a new line</span>
                    </div>
                    <textarea
                      rows={6}
                      value={Array.isArray(formData.items) ? formData.items.join("\n") : (formData.itemsText || "")}
                      onChange={(e) => {
                        const lines = e.target.value.split("\n");
                        updateField("items", lines);
                        updateField("itemsText", e.target.value);
                      }}
                      placeholder="Strict compliance with daily cash turnover cut-off time of 5:00 PM.\nUnauthorized transactions are strictly prohibited.\nFailure to adhere shall result in immediate formal inquiry."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Warning Notice Callout */}
              {variant === "body_warning_callout" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-rose-800 mb-1">Callout Header:</label>
                    <input
                      type="text"
                      value={formData.boxTitle || ""}
                      onChange={(e) => updateField("boxTitle", e.target.value)}
                      placeholder="CRITICAL COMPLIANCE NOTICE"
                      className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs text-rose-950 bg-white font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Callout Message:</label>
                    <textarea
                      rows={4}
                      value={formData.boxMessage || ""}
                      onChange={(e) => updateField("boxMessage", e.target.value)}
                      placeholder="Any deviation from authorized operational guidelines constitutes gross negligence..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* CSR / Budget Request Proposal with Cost Table */}
              {variant === "body_request_proposal_table" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">1. Purpose / Introduction Paragraph:</label>
                    <textarea
                      rows={3}
                      value={formData.introText || ""}
                      onChange={(e) => updateField("introText", e.target.value)}
                      placeholder="We are writing to respectfully request Management's approval..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">2. Proposal Details Paragraph:</label>
                    <textarea
                      rows={3}
                      value={formData.proposalText || ""}
                      onChange={(e) => updateField("proposalText", e.target.value)}
                      placeholder="As part of this initiative, [COMPANY_NAME] proposes to do..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">3. Total Budget Amount:</label>
                    <input
                      type="text"
                      value={formData.tableTotal || ""}
                      onChange={(e) => updateField("tableTotal", e.target.value)}
                      placeholder="PHP 35,934.00"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">4. Community Impact & Malasakit Statement:</label>
                    <textarea
                      rows={3}
                      value={formData.justificationText2 || ""}
                      onChange={(e) => updateField("justificationText2", e.target.value)}
                      placeholder="Furthermore, this serves as an opportunity to show the people of Mandaue City..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">5. Formal Approval Request Prayer:</label>
                    <textarea
                      rows={2}
                      value={formData.closingRequest || ""}
                      onChange={(e) => updateField("closingRequest", e.target.value)}
                      placeholder="In this regard, we respectfully request Management's approval..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Notice to Explain (Letter of Explanation) Body */}
              {variant === "body_letter_of_explain" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">1. Report Citation Intro:</label>
                    <textarea
                      rows={2}
                      value={formData.reportCitation || ""}
                      onChange={(e) => updateField("reportCitation", e.target.value)}
                      placeholder="We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">2. Specific Allegation (Bulleted):</label>
                    <textarea
                      rows={3}
                      value={(formData.allegations || []).join("\n")}
                      onChange={(e) => updateField("allegations", e.target.value.split("\n").filter(Boolean))}
                      placeholder="Enter allegation details (one per line)..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">3. Explanation Demand Notice (with 3-day deadline):</label>
                    <textarea
                      rows={3}
                      value={formData.explanationNotice || ""}
                      onChange={(e) => updateField("explanationNotice", e.target.value)}
                      placeholder="In view thereof, you are hereby requested to explain in writing within three (3) days..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">4. Contract Termination Provision Citation:</label>
                    <textarea
                      rows={2}
                      value={formData.contractClauseIntro || ""}
                      onChange={(e) => updateField("contractClauseIntro", e.target.value)}
                      placeholder="As stated in the General Provisions of the Agency Agreement – TERMINATION..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">5. Due Process & Waiver Warning:</label>
                    <textarea
                      rows={2}
                      value={formData.waiverWarning || ""}
                      onChange={(e) => updateField("waiverWarning", e.target.value)}
                      placeholder="Failure to submit a response letter shall mean waiving your right to be heard..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">6. Closing Directive:</label>
                    <input
                      type="text"
                      value={formData.closingDirective || ""}
                      onChange={(e) => updateField("closingDirective", e.target.value)}
                      placeholder="Please be guided accordingly."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Termination of Agency Agreement Body */}
              {variant === "body_termination_agency" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">1. Incident Report Paragraph:</label>
                    <textarea
                      rows={4}
                      value={formData.incidentParagraph || ""}
                      onChange={(e) => updateField("incidentParagraph", e.target.value)}
                      placeholder="Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">2. General Provisions Intro:</label>
                    <textarea
                      rows={3}
                      value={formData.provisionsIntro || ""}
                      onChange={(e) => updateField("provisionsIntro", e.target.value)}
                      placeholder="As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black text-slate-700">3. Termination Grounds Clauses (One per line):</label>
                      <span className="text-[10px] text-amber-700 italic">Enter each bulleted clause on a new line</span>
                    </div>
                    <textarea
                      rows={4}
                      value={Array.isArray(formData.terminationClauses) ? formData.terminationClauses.join("\n") : (formData.terminationClausesText || "")}
                      onChange={(e) => {
                        const lines = e.target.value.split("\n").filter(Boolean);
                        updateField("terminationClauses", lines);
                        updateField("terminationClausesText", e.target.value);
                      }}
                      placeholder="5.6. If the concerned member violates, in any way, any provision of this Contract.\n5.8. In case of loss of trust and confidence in the concerned member.\n5.9. In case of violation of any provision of the 2020 STL RIRR..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">4. Company Zero-Tolerance / Cancellation Warning:</label>
                    <textarea
                      rows={2}
                      value={formData.companyWarning || ""}
                      onChange={(e) => updateField("companyWarning", e.target.value)}
                      placeholder="Moreover, this action will not be tolerated by 5A Royal Gaming OPC, as these are grounds for cancellation of your Agency Agreement."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">5. Effective Termination Conclusion:</label>
                    <textarea
                      rows={2}
                      value={formData.conclusionParagraph || ""}
                      onChange={(e) => updateField("conclusionParagraph", e.target.value)}
                      placeholder="In conclusion, your Agency Agreement is hereby terminated effective _____________________."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Standard Legal / Directive Body */}
              {category === "body" && variant !== "body_rewards_voucher" && variant !== "body_numbered_directives" && variant !== "body_warning_callout" && variant !== "body_request_proposal_table" && variant !== "body_letter_of_explain" && variant !== "body_termination_agency" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">Clause Section Title:</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="e.g. NOTICE OF TERMINATION OF OPERATIONS"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                      <label className="text-[11px] font-black text-slate-700">Directive Body Paragraph:</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold">Quick Tags:</span>
                        <button
                          type="button"
                          onClick={() => insertTag("[COMPANY_NAME]")}
                          className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10px] transition cursor-pointer"
                        >
                          + [COMPANY_NAME]
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={8}
                      value={formData.bodyText || ""}
                      onChange={(e) => updateField("bodyText", e.target.value)}
                      placeholder="Pursuant to executive directives approved by Management, all personnel are hereby instructed..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:outline-none text-xs text-slate-800 bg-white leading-relaxed font-sans shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Dual Signatory */}
              {variant === "sig_dual_executive" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Left Signatory (Prepared by):</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Label:</label>
                      <input
                        type="text"
                        value={formData.leftLabel || ""}
                        onChange={(e) => updateField("leftLabel", e.target.value)}
                        placeholder="Prepared & Certified by:"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Signatory Full Name:</label>
                      <input
                        type="text"
                        value={formData.leftName || ""}
                        onChange={(e) => updateField("leftName", e.target.value)}
                        placeholder="JEVINCE JAYE S. JUBAY, CHRP"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Official Designation:</label>
                      <input
                        type="text"
                        value={formData.leftTitle || ""}
                        onChange={(e) => updateField("leftTitle", e.target.value)}
                        placeholder="HRMD Manager"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Right Signatory (Approved by):</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Label:</label>
                      <input
                        type="text"
                        value={formData.rightLabel || ""}
                        onChange={(e) => updateField("rightLabel", e.target.value)}
                        placeholder="Approved & Confirmed by:"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Signatory Full Name:</label>
                      <input
                        type="text"
                        value={formData.rightName || ""}
                        onChange={(e) => updateField("rightName", e.target.value)}
                        placeholder="CHARMIE JEAN M. SIMPAL"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Official Designation:</label>
                      <input
                        type="text"
                        value={formData.rightTitle || ""}
                        onChange={(e) => updateField("rightTitle", e.target.value)}
                        placeholder="President & CEO"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Single Signatory */}
              {variant === "sig_single_official" && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Official Authority Signatory:</span>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Label:</label>
                    <input
                      type="text"
                      value={formData.label || ""}
                      onChange={(e) => updateField("label", e.target.value)}
                      placeholder="Issued & Certified by:"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Signatory Full Name:</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="JEVINCE JAYE S. JUBAY, CHRP"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Official Designation:</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="HRMD Manager"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* Proponent / Staff Requestor Signatory */}
              {variant === "sig_staff_requestor" && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Staff Proponent / Requestor Signatory:</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Complimentary Close:</label>
                    <input
                      type="text"
                      value={formData.closeLabel || ""}
                      onChange={(e) => updateField("closeLabel", e.target.value)}
                      placeholder="Sincerely yours,"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Signatory Full Name:</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="QUENNIE R. CAPUYAN"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-950 uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Designation / Title:</label>
                      <input
                        type="text"
                        value={formData.title || ""}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Human Resource Staff"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Company / Entity:</label>
                      <input
                        type="text"
                        value={formData.company || ""}
                        onChange={(e) => updateField("company", e.target.value)}
                        placeholder="Lucky Betplay Corporation"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Triple Signatory */}
              {variant === "sig_triple_authority" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <span className="text-[9.5px] font-black uppercase text-slate-500 block">Col 1</span>
                    <input type="text" value={formData.col1Label || ""} onChange={(e) => updateField("col1Label", e.target.value)} placeholder="Prepared by:" className="w-full px-2 py-1 text-xs rounded border border-slate-300" />
                    <input type="text" value={formData.col1Name || ""} onChange={(e) => updateField("col1Name", e.target.value)} placeholder="Name" className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-bold" />
                    <input type="text" value={formData.col1Title || ""} onChange={(e) => updateField("col1Title", e.target.value)} placeholder="Title" className="w-full px-2 py-1 text-xs rounded border border-slate-300 text-slate-500" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <span className="text-[9.5px] font-black uppercase text-slate-500 block">Col 2</span>
                    <input type="text" value={formData.col2Label || ""} onChange={(e) => updateField("col2Label", e.target.value)} placeholder="Noted by:" className="w-full px-2 py-1 text-xs rounded border border-slate-300" />
                    <input type="text" value={formData.col2Name || ""} onChange={(e) => updateField("col2Name", e.target.value)} placeholder="Name" className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-bold" />
                    <input type="text" value={formData.col2Title || ""} onChange={(e) => updateField("col2Title", e.target.value)} placeholder="Title" className="w-full px-2 py-1 text-xs rounded border border-slate-300 text-slate-500" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <span className="text-[9.5px] font-black uppercase text-slate-500 block">Col 3</span>
                    <input type="text" value={formData.col3Label || ""} onChange={(e) => updateField("col3Label", e.target.value)} placeholder="Approved by:" className="w-full px-2 py-1 text-xs rounded border border-slate-300" />
                    <input type="text" value={formData.col3Name || ""} onChange={(e) => updateField("col3Name", e.target.value)} placeholder="Name" className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-bold" />
                    <input type="text" value={formData.col3Title || ""} onChange={(e) => updateField("col3Title", e.target.value)} placeholder="Title" className="w-full px-2 py-1 text-xs rounded border border-slate-300 text-slate-500" />
                  </div>
                </div>
              )}

              {/* Acknowledgment Slip */}
              {variant === "sig_receiving_acknowledgment" && (
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Slip Header Banner:</label>
                  <input
                    type="text"
                    value={formData.stubTitle || ""}
                    onChange={(e) => updateField("stubTitle", e.target.value)}
                    placeholder="ACKNOWLEDGMENT & RECEIVING SLIP"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black"
                  />
                </div>
              )}

              {/* NTE Issuer & Acknowledgment Signatory */}
              {variant === "sig_nte_with_acknowledgment" && (
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">HR Issuer:</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Issuer Full Name:</label>
                      <input
                        type="text"
                        value={formData.issuerName || ""}
                        onChange={(e) => updateField("issuerName", e.target.value)}
                        placeholder="JULIE E. ALMANO"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Official Title / Role:</label>
                      <input
                        type="text"
                        value={formData.issuerTitle || ""}
                        onChange={(e) => updateField("issuerTitle", e.target.value)}
                        placeholder="HR Salesforce Specialist"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Employee Acknowledgment:</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Heading:</label>
                      <input
                        type="text"
                        value={formData.ackHeading || ""}
                        onChange={(e) => updateField("ackHeading", e.target.value)}
                        placeholder="Received & acknowledged by:"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Recipient Full Name:</label>
                      <input
                        type="text"
                        value={formData.recipientName || ""}
                        onChange={(e) => updateField("recipientName", e.target.value)}
                        placeholder="JOEVERT SUDSUD"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Signature Line Subtext:</label>
                      <input
                        type="text"
                        value={formData.recipientTitle || ""}
                        onChange={(e) => updateField("recipientTitle", e.target.value)}
                        placeholder="Signature Over Printed Name"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Operations Manager Signatory */}
              {variant === "sig_operations_manager" && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Operations Manager Signatory:</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Complimentary Close:</label>
                    <input
                      type="text"
                      value={formData.closeLabel || ""}
                      onChange={(e) => updateField("closeLabel", e.target.value)}
                      placeholder="Sincerely,"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Signatory Designation / Title:</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="OPERATIONS MANAGER"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-950 uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Corporate Division Centered Footer */}
              {variant === "footer_division_center" && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-700 mb-1">Division Title:</label>
                  <input
                    type="text"
                    value={formData.divisionText || ""}
                    onChange={(e) => updateField("divisionText", e.target.value)}
                    placeholder="HUMAN RESOURCE MANAGEMENT DIVISION"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-black tracking-widest uppercase text-center"
                  />
                </div>
              )}
            </div>
          </form>

          {/* RIGHT COLUMN: Live 1:1 Coupon Bond Output Studio (5 Cols) */}
          <div className="lg:col-span-6 flex flex-col space-y-2.5 bg-slate-100/80 p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-inner">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wide">
                  Live 1:1 Coupon Bond Output
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs font-mono">
                {selectedCompany.code} letterhead
              </span>
            </div>

            {/* Simulated Real White Bond Paper Sheet */}
            <div className="flex-1 bg-white p-6 sm:p-7 rounded-2xl border border-slate-300/80 shadow-xl overflow-y-auto max-h-[500px] select-text">
              <ElementVisualPreview
                item={previewItem}
                selectedCompany={selectedCompany}
                docRef={docRef}
                docDate={docDate}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10.5px]">
                <Sparkles size={13} className="text-emerald-600" /> Matches printed coupon bond typography
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                REF: {docRef}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer transition shadow-2xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveAndAddToPaper}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              title="Save to My Templates and immediately add to current bond paper"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Save &amp; Add to Paper</span>
            </button>

            <button
              type="submit"
              form="custom-template-form"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
            >
              <Bookmark size={15} />
              <span>Save to My Templates (Local)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function DocumentStudioPanel({
  currentUser = null,
  profiles = [],
  onClose = () => { },
  onOpenAiBuddy = () => { },
  onSwitchToMemo = () => { }
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
  const [hoveredPreview, setHoveredPreview] = useState(null);

  // Drag-and-Drop Canvas State
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paletteActiveCategory, setPaletteActiveCategory] = useState("header");

  // Custom Reusable Templates (Persisted locally in localStorage)
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const raw = localStorage.getItem("hrhub_doc_custom_templates");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Template Editor Modal State
  const [templateEditorModal, setTemplateEditorModal] = useState(null);

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

    // Synchronize placed header elements and company-bound fields with the new entity
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.category === "header") {
          return {
            ...el,
            data: {
              ...el.data,
              centerLogo: comp.logoUrl,
              leftLogo: el.data?.leftLogo || comp.rightLogoUrl || "/id-assets/group_emblem.jpg",
              rightLogo: el.data?.rightLogo || "/id-assets/pcso_logo.png"
            }
          };
        }
        if (el.variant === "body_termination_agency") {
          return {
            ...el,
            data: {
              ...el.data,
              companyWarning: `Moreover, this action will not be tolerated by ${comp.legalName || comp.name}, as these are grounds for cancellation of your Agency Agreement.`
            }
          };
        }
        if (el.variant === "sig_staff_requestor") {
          return {
            ...el,
            data: {
              ...el.data,
              company: comp.name
            }
          };
        }
        return el;
      })
    );

    triggerToast(`Letterhead entity set to ${comp.name}`, "info");
  };

  // Save custom template to local storage
  const handleSaveCustomTemplate = (templateData) => {
    const newTemplate = {
      id: templateData.id || "tpl_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      category: templateData.category || "body",
      variant: templateData.variant || "body_standard",
      name: templateData.name.trim() || "Untitled Custom Template",
      description: templateData.description.trim() || `Custom ${templateData.category} template`,
      data: templateData.data || {},
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    setCustomTemplates((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === newTemplate.id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = newTemplate;
      } else {
        updated = [newTemplate, ...prev];
      }
      try {
        localStorage.setItem("hrhub_doc_custom_templates", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save custom templates to localStorage:", e);
      }
      return updated;
    });

    triggerToast(`✓ Template "${newTemplate.name}" saved locally!`, "success");
    setTemplateEditorModal(null);
  };

  // Delete custom template from local storage
  const handleDeleteCustomTemplate = (templateId) => {
    setCustomTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== templateId);
      try {
        localStorage.setItem("hrhub_doc_custom_templates", JSON.stringify(updated));
      } catch { }
      return updated;
    });
    triggerToast("Custom template deleted", "info");
  };

  // Open Template Editor from placed element on the bond paper
  const handleOpenSaveAsTemplateFromPaper = (elem) => {
    setTemplateEditorModal({
      isOpen: true,
      source: "paper",
      item: {
        category: elem.category,
        variant: elem.variant,
        name: elem.name,
        description: `Custom template saved from bond paper`,
        data: JSON.parse(JSON.stringify(elem.data || {}))
      }
    });
  };

  // Open Template Editor from palette card
  const handleOpenTemplateEditorFromPalette = (item, cat) => {
    setTemplateEditorModal({
      isOpen: true,
      source: "palette",
      item: {
        id: item.isCustom ? item.id : null,
        category: item.category || cat,
        variant: item.variant,
        name: item.name,
        description: item.description,
        data: item.data ? JSON.parse(JSON.stringify(item.data)) : (item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : {}),
        isCustom: item.isCustom
      }
    });
  };

  // Create a brand new custom template
  const handleCreateNewCustomTemplate = (cat) => {
    const categoryPresets = MODULAR_BLOCK_PRESETS.find((p) => p.category === cat);
    const defaultPreset = categoryPresets?.items?.[0];
    setTemplateEditorModal({
      isOpen: true,
      source: "palette",
      item: {
        category: cat === "custom" ? "body" : cat,
        variant: defaultPreset?.variant || (cat === "body" ? "body_standard" : cat === "addressing" ? "address_memo_grid" : "header_dual_logo"),
        name: `New Custom ${(cat === "custom" ? "body" : cat).toUpperCase()} Template`,
        description: "Custom user-defined template",
        data: defaultPreset?.defaultData ? JSON.parse(JSON.stringify(defaultPreset.defaultData)) : {}
      }
    });
  };

  // Add a block to the coupon bond paper at a specific index
  const addBlockToPaper = (item, insertIndex = null) => {
    const newElement = {
      id: "elem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      category: item.category,
      variant: item.variant,
      name: item.name,
      data: item.data ? JSON.parse(JSON.stringify(item.data)) : (item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : {})
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
      const tripleHeader = MODULAR_BLOCK_PRESETS.find((c) => c.category === "header").items.find((i) => i.variant === "header_triple_logo") || headerItem;
      const termAddr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items.find((i) => i.variant === "address_termination_agency");
      const agencyBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items.find((i) => i.variant === "body_termination_agency");
      const opsSig = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items.find((i) => i.variant === "sig_operations_manager");
      presetBlocks = [
        {
          ...tripleHeader,
          category: "header",
          data: {
            ...tripleHeader.defaultData,
            centerLogo: selectedCompany.logoUrl,
            leftLogo: selectedCompany.rightLogoUrl || "/id-assets/group_emblem.jpg",
            rightLogo: "/id-assets/pcso_logo.png"
          }
        },
        { ...termAddr, category: "addressing" },
        {
          ...agencyBody,
          category: "body",
          data: {
            ...agencyBody.defaultData,
            companyWarning: `Moreover, this action will not be tolerated by ${selectedCompany.legalName || selectedCompany.name}, as these are grounds for cancellation of your Agency Agreement.`
          }
        },
        { ...opsSig, category: "signatory" }
      ];
    } else if (presetKey === "letter_of_explain") {
      const letterAddr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items.find((i) => i.variant === "address_letter_to_explain");
      const explainBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items.find((i) => i.variant === "body_letter_of_explain");
      const nteSig = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items.find((i) => i.variant === "sig_nte_with_acknowledgment");
      const divFooter = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items.find((i) => i.variant === "footer_division_center");
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...letterAddr, category: "addressing" },
        { ...explainBody, category: "body" },
        { ...nteSig, category: "signatory" },
        { ...divFooter, category: "footer" }
      ];
    } else if (presetKey === "request_letter_csr") {
      const ccAddr = MODULAR_BLOCK_PRESETS.find((c) => c.category === "addressing").items.find((i) => i.variant === "address_letter_with_cc");
      const proposalBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items.find((i) => i.variant === "body_request_proposal_table");
      const staffSig = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items.find((i) => i.variant === "sig_staff_requestor");
      const securityFooter = MODULAR_BLOCK_PRESETS.find((c) => c.category === "footer").items[1];
      presetBlocks = [
        { ...headerItem, category: "header" },
        { ...ccAddr, category: "addressing" },
        { ...proposalBody, category: "body" },
        { ...staffSig, category: "signatory" },
        { ...securityFooter, category: "footer" }
      ];
    } else if (presetKey === "non_affiliation_salesforce") {
      const dualCleanHeader = MODULAR_BLOCK_PRESETS.find((c) => c.category === "header").items.find((i) => i.variant === "header_dual_clean") || headerItem;
      const sfBody = MODULAR_BLOCK_PRESETS.find((c) => c.category === "body").items.find((i) => i.variant === "body_non_affiliation_salesforce");
      const certSig = MODULAR_BLOCK_PRESETS.find((c) => c.category === "signatory").items.find((i) => i.variant === "sig_single_certified_by");
      presetBlocks = [
        {
          ...dualCleanHeader,
          category: "header",
          data: {
            ...dualCleanHeader.defaultData,
            leftLogo: selectedCompany.logoUrl,
            rightLogo: selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg",
            companyName: selectedCompany.legalName || selectedCompany.name || "LUCKY BETPLAY CORPORATION"
          }
        },
        {
          ...sfBody,
          category: "body",
          data: {
            ...sfBody.defaultData,
            companyName: selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"
          }
        },
        {
          ...certSig,
          category: "signatory",
          data: {
            ...certSig.defaultData,
            company: selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"
          }
        }
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

  // High-fidelity printing engine that matches viewer 1:1, auto-adapts paper size to the printer, and eliminates 2nd page spillover!
  const handlePrintDocument = () => {
    const printableElement = document.getElementById("coupon-bond-printable");
    if (!printableElement) {
      window.print();
      return;
    }

    // 1. Clone the element to safely sanitize for printing
    const clone = printableElement.cloneNode(true);

    // 2. Remove all interactive / editing / no-print artifacts
    clone.querySelectorAll(".no-print, .block-hover-controls, [role='tooltip']").forEach((el) => el.remove());
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("suppresscontenteditablewarning");
    });

    // Strictly ensure watermark is absolute, centered, faint, and NEVER in normal flow
    const watermarkEl = clone.querySelector(".doc-watermark-layer, [class*='opacity-[0.03'], [class*='opacity-[0.04']");
    if (watermarkEl) {
      watermarkEl.setAttribute("style", "position: absolute !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: 340px !important; height: 340px !important; pointer-events: none !important; z-index: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0.04 !important; user-select: none !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important;");
      const wmImg = watermarkEl.querySelector("img");
      if (wmImg) {
        wmImg.setAttribute("style", "max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; filter: grayscale(15%) !important; display: block !important; margin: 0 auto !important;");
      }
    }

    // Ensure content wrapper fills sheet and distributes top/bottom elements
    const hasFooter = Boolean(clone.querySelector("[data-category='footer'], .footer-stick-bottom"));
    const contentEl = clone.querySelector(".space-y-6");
    if (contentEl) {
      contentEl.setAttribute("style", `position: relative !important; z-index: 10 !important; display: flex !important; flex-direction: column !important; justify-content: ${hasFooter ? "space-between" : "flex-start"} !important; flex: 1 1 0% !important; width: 100% !important; height: 100% !important; min-height: 100% !important;`);
    }

    const fontCss = FONT_FAMILIES.find((f) => f.id === fontFamily)?.css || "'Inter', sans-serif";
    const currentPaper = currentPaperDef;

    // Collect all stylesheets and style tags without filtering out Tailwind CSS
    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .filter((node) => {
        const text = node.textContent || "";
        return !text.includes("printing-agent-id-card");
      })
      .map((node) => node.outerHTML)
      .join("\n");

    // 3. Build isolated, self-contained printable document matching exact viewer specifications
    const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
  <title>${docRef || "DOCUMENT"} - ${selectedCompany.name} (${currentPaper.label})</title>
  ${headStyles}
  <style>
    @page {
      size: ${currentPaper.printCss} !important;
      margin: 0 !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-font-smoothing: antialiased !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      visibility: visible !important;
    }
    html, body {
      width: 100% !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      overflow: visible !important;
      font-family: ${fontCss} !important;
      font-size: ${fontSize}pt !important;
      line-height: 1.6 !important;
      color: #0f172a !important;
    }
    .print-sheet {
      width: ${currentPaper.widthIn || '8.5in'} !important;
      height: ${currentPaper.heightIn || '11in'} !important;
      min-height: ${currentPaper.heightIn || '11in'} !important;
      max-height: ${currentPaper.heightIn || '11in'} !important;
      box-sizing: border-box !important;
      position: relative !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      padding: ${currentPaper.pageMargin || '0.5in 0.65in'} !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      page-break-before: avoid !important;
      break-before: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .print-sheet * {
      visibility: visible !important;
    }
    /* Centered faint watermark layer - 0 impact on vertical flow */
    .doc-watermark-layer,
    .print-sheet > div.doc-watermark-layer,
    .print-sheet > div[class*="opacity-[0.03"],
    .print-sheet > div[class*="opacity-[0.04"] {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 340px !important;
      height: 340px !important;
      pointer-events: none !important;
      z-index: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0.04 !important;
      user-select: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .doc-watermark-layer img,
    .print-sheet > div.doc-watermark-layer img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      filter: grayscale(15%) !important;
      display: block !important;
      margin: 0 auto !important;
    }

    /* Content flow: occupies full sheet height, top items stay top, bottom items stay bottom */
    .print-sheet > div.space-y-6,
    .print-sheet > div:not(.doc-watermark-layer):not([class*="absolute"]) {
      position: relative !important;
      z-index: 10 !important;
      flex: 1 1 0% !important;
      height: 100% !important;
      min-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: ${hasFooter ? "space-between" : "flex-start"} !important;
      width: 100% !important;
    }
    .print-sheet .space-y-6 > * + * {
      margin-top: 1.15rem !important;
    }
    .space-y-3\.5 > * + * {
      margin-top: 0.75rem !important;
    }
    .space-y-4 > * + * {
      margin-top: 0.85rem !important;
    }
    .print-sheet p {
      color: #0f172a !important;
    }
    .print-sheet table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    .print-sheet table th, .print-sheet table td {
      border: 1px solid #0f172a !important;
      padding: 4px 6px !important;
    }
    img {
      max-width: 100% !important;
      object-fit: contain !important;
      visibility: visible !important;
    }
    /* Comprehensive utility fallback rules */
    .w-18, .w-20 { width: 4.5rem !important; height: 4.5rem !important; }
    .h-18, .h-20 { height: 4.5rem !important; }
    .w-14 { width: 3.5rem !important; }
    .h-14 { height: 3.5rem !important; }
    .w-16 { width: 4rem !important; }
    .h-16 { height: 4rem !important; }
    .max-h-full { max-height: 100% !important; }
    .max-w-full { max-width: 100% !important; }
    .object-contain { object-fit: contain !important; }
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .items-end { align-items: flex-end !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .text-justify { text-align: justify !important; }
    .uppercase { text-transform: uppercase !important; }
    .font-bold { font-weight: 700 !important; }
    .font-black { font-weight: 900 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-mono { font-family: monospace !important; }
    .grid { display: grid !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .gap-8 { gap: 2rem !important; }
    .gap-6 { gap: 1.5rem !important; }
    .gap-4 { gap: 1rem !important; }
    .gap-3 { gap: 0.75rem !important; }
    .gap-2 { gap: 0.5rem !important; }
    .pb-4 { padding-bottom: 1rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .pb-2 { padding-bottom: 0.5rem !important; }
    .mb-3 { margin-bottom: 0.75rem !important; }
    .pt-4 { padding-top: 1rem !important; }
    .pt-3 { padding-top: 0.75rem !important; }
    .mt-8 { margin-top: 2rem !important; }
    .mb-1 { margin-bottom: 0.25rem !important; }
    .mt-0\.5 { margin-top: 0.125rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
    .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
    .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
    .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
    .border-t-2 { border-top-width: 2px !important; border-top-style: solid !important; }
    .border-emerald-700 { border-color: #047857 !important; }
    .border-slate-900, .border-slate-800, .border-black { border-color: #0f172a !important; }
    .border-slate-300, .border-slate-200 { border-color: #cbd5e1 !important; }
    .leading-tight { line-height: 1.25 !important; }
    .leading-snug { line-height: 1.375 !important; }
    .leading-relaxed { line-height: 1.55 !important; }
    .tracking-wider { letter-spacing: 0.05em !important; }
    .tracking-wide { letter-spacing: 0.025em !important; }
    .no-print, .block-hover-controls, [role="tooltip"] {
      display: none !important;
      visibility: hidden !important;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    let printWindow = null;
    try {
      printWindow = window.open("", "_blank", "width=920,height=1100");
    } catch {
      printWindow = null;
    }

    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();

      const doTriggerPrint = () => {
        try {
          printWindow.focus();
          printWindow.onafterprint = () => {
            try {
              printWindow.close();
            } catch {}
          };
          printWindow.print();
        } catch (e) {
          console.warn("Popup print failed, falling back to direct window.print", e);
          window.print();
        }
      };

      const imgs = Array.from(printWindow.document.images || []);
      if (imgs.length === 0) {
        setTimeout(doTriggerPrint, 250);
      } else {
        let loaded = 0;
        let triggered = false;
        const onImgDone = () => {
          loaded++;
          if (loaded >= imgs.length && !triggered) {
            triggered = true;
            setTimeout(doTriggerPrint, 180);
          }
        };
        imgs.forEach((img) => {
          if (img.complete) {
            onImgDone();
          } else {
            img.onload = onImgDone;
            img.onerror = onImgDone;
          }
        });
        setTimeout(() => {
          if (!triggered) {
            triggered = true;
            doTriggerPrint();
          }
        }, 650);
      }
    } else {
      // Invisible iframe fallback if browser popup blocker prevented window.open
      let printFrame = document.getElementById("doc-studio-print-frame");
      if (!printFrame) {
        printFrame = document.createElement("iframe");
        printFrame.id = "doc-studio-print-frame";
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "none";
        document.body.appendChild(printFrame);
      }
      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch {
          window.print();
        }
      }, 400);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      {/* SCOPED PRINT STYLESHEET (For native Ctrl+P and direct printing) */}
      <style>{`
        @media print {
          @page {
            size: ${currentPaperDef.printCss} !important;
            margin: 0 !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, nav, .no-print, .block-hover-controls, [role="tooltip"] {
            display: none !important;
            visibility: hidden !important;
          }
          #coupon-bond-printable {
            position: static !important;
            transform: none !important;
            width: ${currentPaperDef.widthIn || '8.5in'} !important;
            max-width: ${currentPaperDef.widthIn || '8.5in'} !important;
            height: ${currentPaperDef.heightIn || '11in'} !important;
            min-height: ${currentPaperDef.heightIn || '11in'} !important;
            max-height: ${currentPaperDef.heightIn || '11in'} !important;
            margin: 0 auto !important;
            padding: ${currentPaperDef.pageMargin || '0.5in 0.65in'} !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #coupon-bond-printable > div.space-y-6,
          #coupon-bond-printable > div:not([class*="absolute"]) {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          #coupon-bond-printable .space-y-6 > * + * {
            margin-top: 1.15rem !important;
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
                Document Studio
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
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${isSelected
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
            onClick={handlePrintDocument}
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
            className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${toastMessage.type === "success"
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
      {/* Appears right where the cursor is pointing, extra large for crystal-clear inspection */}
      {hoveredPreview?.item && (() => {
        const previewWidth = 580;
        const targetX = hoveredPreview.x ?? 900;
        const targetY = hoveredPreview.y ?? 200;

        // Position to the left of the cursor, with 20px gap
        const leftPos = Math.max(16, targetX - previewWidth - 20);
        // Vertically aligned with cursor, clamped so it never goes off-screen
        const topPos = Math.max(16, Math.min(window.innerHeight - 560, targetY - 120));

        return (
          <div
            style={{
              left: `${leftPos}px`,
              top: `${topPos}px`,
              width: `${previewWidth}px`,
            }}
            className="no-print fixed z-50 bg-white rounded-2xl border-2 border-amber-400 shadow-2xl p-4.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none max-w-[calc(100vw-450px)]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Eye size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-950 tracking-wide">
                    Live Preview: {hoveredPreview.item.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    1:1 exact output replica with {selectedCompany.name} letterhead
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                {hoveredPreview.item.category}
              </span>
            </div>

            {/* Crisp white paper canvas simulating authentic coupon bond output */}
            <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-xs pointer-events-none overflow-hidden select-none">
              <ElementVisualPreview
                item={hoveredPreview.item}
                selectedCompany={selectedCompany}
                docRef={docRef}
                docDate={docDate}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                <Sparkles size={13} className="text-emerald-600" /> Exact replica of bond paper output
              </span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                Drag onto paper or click &quot;+ Add to Paper&quot;
              </span>
            </div>
          </div>
        );
      })()}

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
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${isSelected
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
            className={`bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 md:p-14 relative select-text flex flex-col justify-between ${isDragOverCanvas ? "ring-4 ring-amber-500/80 border-amber-500 bg-amber-50/15" : ""
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

            {/* Elegant Background Corporate Watermark (Faint corporate logo as in official documents) */}
            {selectedCompany?.logoUrl && (
              <div
                className="doc-watermark-layer pointer-events-none select-none overflow-hidden"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "360px",
                  height: "360px",
                  pointerEvents: "none",
                  zIndex: 0,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.04
                }}
              >
                <img
                  src={selectedCompany.rightLogoUrl || selectedCompany.logoUrl}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    filter: "grayscale(15%)",
                    display: "block"
                  }}
                />
              </div>
            )}

            {/* IF CANVAS IS COMPLETELY BLANK: SHOW FRIENDLY DROPZONE */}
            {paperElements.length === 0 ? (
              <div className="no-print my-auto py-24 text-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50/60 space-y-4 relative z-10">
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
                      onClick={() => handleLoadFullDocumentPreset("non_affiliation_salesforce")}
                      className="p-2 rounded-xl border border-indigo-300 bg-indigo-50/80 hover:border-indigo-500 hover:bg-indigo-100 font-black text-indigo-950 transition cursor-pointer"
                    >
                      🛡️ Non-Affiliation (Salesforce)
                    </button>
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
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 font-bold text-slate-700 transition cursor-pointer"
                    >
                      ✍️ Letter of Explain
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFullDocumentPreset("request_letter_csr")}
                      className="p-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:border-amber-500 hover:bg-amber-100/70 font-black text-amber-950 transition cursor-pointer"
                    >
                      📬 Request Letter (CSR)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RENDER PLACED MODULAR ELEMENTS SEQUENTIALLY ON THE BOND PAPER */
              /* CRASH-PROOF: strictly scoped by el.category with zero textbox frames */
              <div
                className="space-y-6 flex-1 relative z-10"
                style={{
                  position: "relative",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: paperElements.some((e) => e.category === "footer") ? "space-between" : "flex-start",
                  flex: "1 1 0%",
                  height: "100%",
                  minHeight: "100%",
                  width: "100%"
                }}
              >
                {paperElements.map((el, index) => {
                  const isHovered = activeElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      data-category={el.category}
                      onClick={() => setActiveElementId(el.id)}
                      className={`relative group transition-all ${el.category === "footer" ? "mt-auto footer-stick-bottom" : ""}`}
                    >
                      {/* Floating Control Toolbar for this placed element */}
                      <div className="no-print absolute -top-3.5 right-2 z-20 hidden group-hover:flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-md text-[10px] font-bold">
                        <span className="text-amber-400 mr-1 max-w-[150px] truncate">{el.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSaveAsTemplateFromPaper(el);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer flex items-center gap-1 text-[10px]"
                          title="Save this edited element as a reusable Template"
                        >
                          <Bookmark size={11} />
                          <span>Save Template</span>
                        </button>
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
                                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0" style={{ width: "5rem", height: "5rem", flexShrink: 0 }}>
                                  <img src={selectedCompany.logoUrl} alt={selectedCompany.name} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} className="max-h-full max-w-full object-contain" />
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
                                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0" style={{ width: "5rem", height: "5rem", flexShrink: 0 }}>
                                  <img src={selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"} alt="Corporate Emblem" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} className="max-h-full max-w-full object-contain" />
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

                          {el.variant === "header_blank_letterhead" && (
                            <div className="h-12 border-b border-dashed border-slate-200/50 mb-3 select-none flex items-center justify-center text-[10px] text-slate-300 font-mono no-print">
                              [ Pre-printed Letterhead Top Margin ]
                            </div>
                          )}

                          {el.variant === "header_triple_logo" && (
                            <div className="pb-3 mb-4 border-b border-slate-200 select-text">
                              <div className="flex items-center justify-between gap-4 px-2">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                                  <img
                                    src={el.data?.leftLogo || selectedCompany.rightLogoUrl || "/id-assets/group_emblem.jpg"}
                                    alt="Corporate Group Emblem"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="w-24 h-16 sm:w-28 sm:h-20 flex items-center justify-center shrink-0">
                                  <img
                                    src={el.data?.centerLogo || selectedCompany.logoUrl}
                                    alt={selectedCompany.name}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                                  <img
                                    src={el.data?.rightLogo || "/id-assets/pcso_logo.png"}
                                    alt="PCSO Authority Seal"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "header_dual_clean" && (
                            <div className="pb-2 mb-4 select-text">
                              <div className="flex items-center justify-between gap-4">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0" style={{ width: "5.5rem", height: "5.5rem", flexShrink: 0 }}>
                                  <img
                                    src={el.data?.leftLogo || selectedCompany.logoUrl}
                                    alt={selectedCompany.name}
                                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 text-center px-2">
                                  <h2
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                    className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.companyName || selectedCompany.legalName || selectedCompany.name || "LUCKY BETPLAY CORPORATION"}
                                  </h2>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "address", e.currentTarget.innerText)}
                                    className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1 leading-snug uppercase outline-none hover:bg-amber-50/50 rounded px-1 transition whitespace-pre-line"
                                  >
                                    {el.data?.address || "#257 BARLAPS, A.S. FORTUNA STREET,\nBAKILID, MANDAUE CITY, CEBU 6014"}
                                  </div>
                                </div>
                                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0" style={{ width: "5rem", height: "5rem", flexShrink: 0 }}>
                                  <img
                                    src={el.data?.rightLogo || selectedCompany.rightLogoUrl || "/logos/group_emblem.jpg"}
                                    alt="Corporate Group Emblem"
                                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 2: ADDRESSING & METADATA ================= */}
                      {el.category === "addressing" && (
                        <div>
                          {el.variant === "address_termination_agency" && (
                            <div className="mb-5 text-xs text-slate-900 space-y-3.5 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {el.data?.dateLine || "Date: _____________________"}
                              </div>

                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientName", e.currentTarget.innerText)}
                                  className="font-black text-sm uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientName || "MR. DANIEL PADILLA"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientOffice", e.currentTarget.innerText)}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientOffice || "STL-ILIGAN OFFICE, LANAO DEL NORTE"}
                                </div>
                              </div>

                              <div className="pt-1">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "subject", e.currentTarget.innerText)}
                                  className="font-black text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {el.data?.subject || "RE: TERMINATION OF AGENCY AGREEMENT"}
                                </span>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "salutation", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 pt-0.5 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.salutation || "Dear Mr. Padilla,"}
                              </div>
                            </div>
                          )}
                          {el.variant === "address_letter_to_explain" && (
                            <div className="mb-5 text-xs text-slate-900 space-y-3.5 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "date", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition uppercase tracking-wide inline-block"
                              >
                                {el.data?.date || docDate || "SEPTEMBER 28, 2026"}
                              </div>

                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientName", e.currentTarget.innerText)}
                                  className="font-black text-sm uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientName || "MOSHER BEBOT"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientTitle", e.currentTarget.innerText)}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientTitle || "SALES SUPERVISOR"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "recipientStation", e.currentTarget.innerText)}
                                  className="font-semibold text-xs uppercase text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.recipientStation || "MAGUINDANAO DEL NORTE"}
                                </div>
                              </div>

                              <div className="pt-2">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "subject", e.currentTarget.innerText)}
                                  className="font-black italic text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {el.data?.subject || "RE: LETTER OF EXPLANATION"}
                                </span>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "salutation", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.salutation || "Dear Gomez,"}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_memo_grid" && (
                            <div className="my-3 text-xs text-slate-800 space-y-2 select-text">
                              <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-1.5 mb-2.5">
                                <span className="font-black tracking-widest text-slate-950 text-base">MEMORANDUM</span>
                                <span className="font-mono text-slate-500 font-bold text-xs">REF: {docRef}</span>
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

                          {el.variant === "address_letter_with_cc" && (
                            <div className="mb-4 text-xs text-slate-900 space-y-3.5 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "date", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block uppercase tracking-wide"
                              >
                                {el.data?.date || docDate || "OCTOBER 24, 2026"}
                              </div>

                              {/* TO Section */}
                              <div className="flex items-start text-xs leading-snug">
                                <span className="font-black text-slate-950 w-12 shrink-0">TO:</span>
                                <div className="space-y-0.5 flex-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "toName", e.currentTarget.innerText)}
                                    className="font-black text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toName || "CHARMIE JEAN M. SIMPAL, RRT"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "toTitle", e.currentTarget.innerText)}
                                    className="font-semibold text-[11px] text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toTitle || "Assistant General Manager"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "toCompany", e.currentTarget.innerText)}
                                    className="text-[11px] text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toCompany || "SGC Corporation"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "toAddress", e.currentTarget.innerText)}
                                    className="text-[11px] text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toAddress || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"}
                                  </div>
                                </div>
                              </div>

                              {/* CC Section */}
                              <div className="flex items-start text-xs leading-snug">
                                <span className="font-black text-slate-950 w-12 shrink-0">CC:</span>
                                <div className="space-y-3 flex-1">
                                  {(el.data?.ccRecipients || [
                                    {
                                      name: "JEVINCE JAYE S. JUBAY, CHRP",
                                      title: "HRMD Manager",
                                      company: "SGC Corporation",
                                      address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
                                    },
                                    {
                                      name: "FATIMA MARIE B. OBILLOS",
                                      title: "CFO Head",
                                      company: "SGC Corporation",
                                      address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
                                    }
                                  ]).map((cc, ccIdx) => (
                                    <div key={ccIdx} className="space-y-0.5">
                                      <div className="font-black text-xs uppercase text-slate-950 px-1">
                                        {cc.name}
                                      </div>
                                      <div className="font-semibold text-[11px] text-slate-800 px-1">
                                        {cc.title}
                                      </div>
                                      <div className="text-[11px] text-slate-700 px-1">
                                        {cc.company}
                                      </div>
                                      {cc.address && (
                                        <div className="text-[11px] text-slate-600 px-1">
                                          {cc.address}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* SUBJECT Line */}
                              <div className="pt-2">
                                <div className="font-black text-xs text-slate-950 uppercase leading-snug">
                                  <span>SUBJECT: </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "subject", e.currentTarget.innerText)}
                                    className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.subject || "REQUEST FOR CORPORATE SOCIAL RESPONSIBILITY (CSR) DONATION FOR THE LABOGON FIRE VICTIMS"}
                                  </span>
                                </div>
                              </div>

                              {/* Salutation */}
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "salutation", e.currentTarget.innerText)}
                                className="font-black text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.salutation || "Dear AGM Simpal,"}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_simple_date" && (
                            <div className="my-2 select-text">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                className="font-bold text-xs sm:text-sm text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {el.data?.dateLine || "Date: November 06, 2026"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= CATEGORY 3: DIRECTIVES & BODY ================= */}
                      {el.category === "body" && (
                        <div>
                          {el.variant === "body_non_affiliation_salesforce" ? (
                            <div className="space-y-4 my-3 text-xs sm:text-sm leading-relaxed text-slate-900 select-text">
                              {/* Centered Document Title */}
                              <div className="text-center my-3">
                                <h2
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 inline-block transition"
                                >
                                  {el.data?.title || "CERTIFICATE OF NON-AFFILIATION"}
                                </h2>
                              </div>

                              {/* Date Line */}
                              {el.data?.dateLine && (
                                <div className="pt-1 pb-1">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                    className="font-bold text-xs sm:text-sm text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                  >
                                    {el.data.dateLine}
                                  </span>
                                </div>
                              )}

                              {/* Paragraph 1 */}
                              <p className="text-justify leading-relaxed">
                                This is to certify that{" "}
                                <strong
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "personName", e.currentTarget.innerText)}
                                  className="font-black text-slate-950 outline-none hover:bg-amber-50/50 rounded px-0.5"
                                >
                                  {el.data?.personName || "ARJUN BAGUIO PATALINGHUG"}
                                </strong>
                                , is not <strong className="font-bold">affiliated</strong> with{" "}
                                <strong className="font-bold">{el.data?.companyName || selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"}</strong> as a Salesforce partner under the{" "}
                                <strong className="font-bold">{el.data?.agencyName || "Philippine Charity Sweepstakes Office (PCSO)"}</strong>.
                              </p>

                              {/* Paragraph 2 */}
                              <p className="text-justify leading-relaxed">
                                We affirm that the aforementioned individual <strong className="font-bold">has no formal or informal association</strong> with <strong className="font-bold">{el.data?.companyName || selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"}</strong> in any capacity related to Salesforce services, nor do they represent the company in any activities associated with PCSO.
                              </p>

                              {/* Paragraph 3 */}
                              <p className="text-justify leading-relaxed">
                                Any claims or representation made by this individual suggesting that He is a Salesforce partner of <strong className="font-bold">{el.data?.companyName || selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"}</strong> or have any related business dealings with the company are <strong className="font-bold">false and unauthorized</strong>.
                              </p>

                              {/* Paragraph 4 */}
                              <p className="text-justify leading-relaxed">
                                This certification is issued for the <strong className="font-bold">purpose of clarifying</strong> that{" "}
                                <strong
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "personNameTitle", e.currentTarget.innerText)}
                                  className="font-bold text-slate-950 outline-none hover:bg-amber-50/50 rounded px-0.5"
                                >
                                  {el.data?.personNameTitle || "Arjun Baguio Patalinghug"}
                                </strong>{" "}
                                has <strong className="font-bold">never been affiliated</strong> with <strong className="font-bold">{el.data?.companyName || selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"} as a Salesforce partner</strong>.
                              </p>

                              {/* Paragraph 5 (Verification Hotline) */}
                              <p className="text-justify leading-relaxed pt-1">
                                For verification or further inquiries, please contact #:{" "}
                                <strong
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "contactNumber", e.currentTarget.innerText)}
                                  className="font-black text-slate-950 outline-none hover:bg-amber-50/50 rounded px-0.5"
                                >
                                  {el.data?.contactNumber || "09243223514"}
                                </strong>
                                .
                              </p>
                            </div>
                          ) : el.variant === "body_termination_agency" ? (
                            <div className="space-y-4 my-3 text-xs leading-relaxed text-slate-900 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "incidentParagraph", e.currentTarget.innerText)}
                                className="text-justify indent-6 outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.incidentParagraph || "Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company. This action constitutes, based on the Agency Agreement signed and notarized on _____________________, which is attached as Annex A of this letter, which, is a terminable case."}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "provisionsIntro", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.provisionsIntro || "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:"}
                              </p>

                              {/* Indented Bullets */}
                              <div className="pl-6 space-y-2">
                                {(el.data?.terminationClauses || [
                                  "5.6. If the concerned member violates, in any way, any provision of this Contract.",
                                  "5.8. In case of loss of trust and confidence in the concerned member.",
                                  "5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force and those which may from time to time be promulgated by the Company."
                                ]).map((clause, cIdx) => (
                                  <div key={cIdx} className="flex items-start gap-2 text-justify">
                                    <span className="font-black text-slate-900">•</span>
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const newClauses = [...(el.data?.terminationClauses || [])];
                                        newClauses[cIdx] = e.currentTarget.innerText;
                                        updateElementData(el.id, "terminationClauses", newClauses);
                                      }}
                                      className="flex-1 outline-none hover:bg-amber-50/20 rounded px-1 transition"
                                    >
                                      {clause}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "companyWarning", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.companyWarning || "Moreover, this action will not be tolerated by 5A Royal Gaming OPC, as these are grounds for cancellation of your Agency Agreement."}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "conclusionParagraph", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.conclusionParagraph || "In conclusion, your Agency Agreement is hereby terminated effective _____________________."}
                              </p>
                            </div>
                          ) : el.variant === "body_letter_of_explain" ? (
                            <div className="space-y-4 my-3 text-xs leading-relaxed text-slate-900 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "reportCitation", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.reportCitation || "We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:"}
                              </p>

                              {/* Allegations Bullets */}
                              <div className="pl-6 space-y-2">
                                {(el.data?.allegations || [
                                  "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
                                ]).map((allegation, aIdx) => (
                                  <div key={aIdx} className="flex items-start gap-2 text-justify">
                                    <span className="font-black text-slate-900">•</span>
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const newAllegations = [...(el.data?.allegations || [])];
                                        newAllegations[aIdx] = e.currentTarget.innerText;
                                        updateElementData(el.id, "allegations", newAllegations);
                                      }}
                                      className="flex-1 outline-none hover:bg-amber-50/20 rounded px-1 transition"
                                    >
                                      {allegation}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "explanationNotice", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.explanationNotice || "In view thereof, you are hereby requested to explain in writing (in a language you are most comfortable with) within three (3) days from receipt hereof why your Agency Agreement with the company shall not be terminated for the said offense/s."}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "contractClauseIntro", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.contractClauseIntro || "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:"}
                              </p>

                              {/* Indented Contract Clauses */}
                              <div className="pl-10 space-y-1.5 font-bold italic text-slate-950">
                                {(el.data?.contractClauses || [
                                  { num: "9.11", text: "Acts of theft, dishonesty, fraud, misrepresentation, or breach of trust." },
                                  { num: "9.12", text: "Violation of any terms in the Agency Agreement." },
                                  { num: "9.14", text: "Loss of trust and confidence in the Cabo or Cobrador." },
                                  { num: "9.15", text: "Violation of any provision of the 2020 STL RIRR, existing rules, regulations, or ethical standards, as well as future directives from the STL-AAC." }
                                ]).map((clause, cIdx) => (
                                  <div key={cIdx} className="flex items-baseline gap-4">
                                    <span className="w-10 shrink-0 font-black font-mono">{clause.num}</span>
                                    <span className="flex-1">{clause.text}</span>
                                  </div>
                                ))}
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "waiverWarning", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {el.data?.waiverWarning || "Failure to submit a response letter shall mean waiving your right to be heard and this case shall be dealt with given the available information."}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "closingDirective", e.currentTarget.innerText)}
                                className="outline-none hover:bg-amber-50/20 rounded p-1 transition font-medium"
                              >
                                {el.data?.closingDirective || "Please be guided accordingly."}
                              </p>
                            </div>
                          ) : el.variant === "body_request_proposal_table" ? (
                            <div className="space-y-3.5 my-3 text-xs leading-relaxed text-slate-900 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "introText", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {(el.data?.introText || "").replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "proposalText", e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {(el.data?.proposalText || "").replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                              </p>

                              {/* Itemized Cost Breakdown Table */}
                              <div className="my-3 border border-slate-900 rounded overflow-hidden">
                                <table className="w-full text-xs text-slate-900 border-collapse">
                                  <thead className="bg-slate-100 font-bold border-b border-slate-900">
                                    <tr>
                                      <th className="p-1.5 text-left font-black">DESCRIPTION</th>
                                      <th className="p-1.5 text-center font-black">QUANTITY</th>
                                      <th className="p-1.5 text-right font-black">MARKET PRICE</th>
                                      <th className="p-1.5 text-right font-black">TOTAL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(el.data?.tableRows || [
                                      { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
                                      { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
                                    ]).map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-slate-300">
                                        <td className="p-1.5 font-bold uppercase">{row.desc}</td>
                                        <td className="p-1.5 text-center font-semibold">{row.qty}</td>
                                        <td className="p-1.5 text-right font-mono">{row.price}</td>
                                        <td className="p-1.5 text-right font-mono font-bold">{row.total}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-50 font-black border-t border-slate-900">
                                      <td colSpan={3} className="p-1.5 text-center font-black tracking-wider">TOTAL</td>
                                      <td
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => updateElementData(el.id, "tableTotal", e.currentTarget.innerText)}
                                        className="p-1.5 text-right font-mono font-black outline-none hover:bg-amber-50/50 rounded"
                                      >
                                        {el.data?.tableTotal || "PHP 35,934.00"}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                              {el.data?.justificationText1 && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "justificationText1", e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {el.data.justificationText1.replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                                </p>
                              )}

                              {el.data?.justificationText2 && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "justificationText2", e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {el.data.justificationText2.replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                                </p>
                              )}

                              {el.data?.closingRequest && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "closingRequest", e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {el.data.closingRequest.replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                                </p>
                              )}

                              {el.data?.thankYouText && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "thankYouText", e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition font-medium"
                                >
                                  {el.data.thankYouText.replace(/\[COMPANY_NAME\]/g, selectedCompany.name)}
                                </p>
                              )}
                            </div>
                          ) : el.variant === "body_rewards_voucher" ? (
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
                            <div className="border-t-2 border-dashed border-slate-400 pt-3 my-4 text-xs select-text">
                              <div className="flex justify-between items-center pb-1.5 mb-2">
                                <span className="font-black uppercase tracking-wider text-slate-900 text-[11px]">{el.data?.stubTitle || "ACKNOWLEDGMENT & RECEIVING SLIP"}</span>
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

                          {el.variant === "sig_staff_requestor" && (
                            <div className="pt-6 my-4 max-w-xs text-xs select-text space-y-7">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "closeLabel", e.currentTarget.innerText)}
                                className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.closeLabel || "Sincerely yours,"}
                              </div>
                              <div className="space-y-0.5">
                                <div className="w-56 border-b-2 border-slate-900 pb-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.name || "QUENNIE R. CAPUYAN"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-slate-700 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.title || "Human Resource Staff"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "company", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.company || selectedCompany.name}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_operations_manager" && (
                            <div className="pt-6 my-4 text-xs select-text space-y-7">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "closeLabel", e.currentTarget.innerText)}
                                className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.closeLabel || "Sincerely,"}
                              </div>
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="font-black text-xs uppercase text-slate-950 tracking-wider outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {el.data?.title || "OPERATIONS MANAGER"}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_nte_with_acknowledgment" && (
                            <div className="pt-6 my-4 text-xs select-text space-y-8">
                              {/* Issuer Line */}
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "issuerName", e.currentTarget.innerText)}
                                  className="font-black text-xs uppercase text-slate-950 underline decoration-slate-950 decoration-1 underline-offset-2 outline-none hover:bg-amber-50/50 rounded inline-block"
                                >
                                  {el.data?.issuerName || "JULIE E. ALMANO"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "issuerTitle", e.currentTarget.innerText)}
                                  className="text-slate-700 font-semibold text-[11px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.issuerTitle || "HR Salesforce Specialist"}
                                </div>
                              </div>

                              {/* Acknowledgment & Receipt Section */}
                              <div className="space-y-6 pt-2">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "ackHeading", e.currentTarget.innerText)}
                                  className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.ackHeading || "Received & acknowledged by:"}
                                </div>

                                <div className="space-y-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "recipientName", e.currentTarget.innerText)}
                                    className="font-black text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded inline-block"
                                  >
                                    {el.data?.recipientName || "JOEVERT SUDSUD"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "recipientTitle", e.currentTarget.innerText)}
                                    className="text-slate-600 text-[11px] outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.recipientTitle || "Signature Over Printed Name"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                    className="text-slate-700 font-mono text-[11px] outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.dateLine || "Date: ____________________"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_single_certified_by" && (
                            <div className="pt-3 my-2 text-xs select-text">
                              {/* Horizontal Divider Line */}
                              <div className="border-b border-slate-300 my-4" />

                              <div className="space-y-6">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => updateElementData(el.id, "label", e.currentTarget.innerText)}
                                  className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {el.data?.label || "Certified by:"}
                                </div>

                                <div className="space-y-0.5">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs sm:text-sm tracking-wide outline-none hover:bg-amber-50/50 rounded px-1 inline-block"
                                  >
                                    {el.data?.name || "QUENNIE R. CAPUYAN"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                    className="text-slate-700 font-semibold text-[11px] sm:text-xs outline-none hover:bg-amber-50/50 rounded px-1"
                                  >
                                    {el.data?.title || "Human Resource Staff"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateElementData(el.id, "company", e.currentTarget.innerText)}
                                    className="text-slate-600 font-bold uppercase text-[10px] sm:text-[11px] outline-none hover:bg-amber-50/50 rounded px-1"
                                  >
                                    {el.data?.company || selectedCompany.legalName || selectedCompany.name || "Lucky Betplay Corporation"}
                                  </div>
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

                          {el.variant === "footer_division_center" && (
                            <div className="pt-6 mt-6 border-t border-slate-200 text-center text-xs text-slate-500 font-black tracking-widest uppercase select-text">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElementData(el.id, "divisionText", e.currentTarget.innerText)}
                                className="outline-none hover:bg-amber-50/50 rounded px-2 transition inline-block"
                              >
                                {el.data?.divisionText || "HUMAN RESOURCE MANAGEMENT DIVISION"}
                              </span>
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
        <aside className="no-print w-full lg:w-[560px] xl:w-[620px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 shadow-2xl z-20">
          {/* Palette Navigation Tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "header", label: "Header", icon: Building2 },
              { id: "addressing", label: "Addressing", icon: AlignLeft },
              { id: "body", label: "Directives", icon: FileText },
              { id: "signatory", label: "Signatory", icon: UserCheck },
              { id: "footer", label: "Footer", icon: Scale },
              { id: "custom", label: `⭐ Templates (${customTemplates.length})`, icon: Bookmark }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = paletteActiveCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaletteActiveCategory(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${isActive
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* Header / Create button */}
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-black uppercase tracking-wider text-[11px] text-slate-800">
                {paletteActiveCategory === "custom"
                  ? `My Saved Templates (${customTemplates.length})`
                  : MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.categoryLabel}
              </span>
              <button
                type="button"
                onClick={() => handleCreateNewCustomTemplate(paletteActiveCategory)}
                className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[11px] transition cursor-pointer flex items-center gap-1"
                title="Create a new custom template"
              >
                <PlusCircle size={13} />
                <span>+ New Template</span>
              </button>
            </div>

            {/* Custom Tab View */}
            {paletteActiveCategory === "custom" ? (
              customTemplates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 my-4">
                  <Bookmark size={36} className="mx-auto text-amber-500/70" />
                  <h4 className="font-black text-sm text-slate-800">No Custom Templates Yet</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    You can customize any preset by clicking <strong>&quot;Customize&quot;</strong>, or edit any block on the bond paper and click <strong>&quot;Save as Template&quot;</strong>!
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaletteActiveCategory("header")}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
                  >
                    Browse Built-in Blocks
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {customTemplates.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        setHoveredPreview(null);
                        handlePaletteDragStart(e, item);
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredPreview({
                          item,
                          x: e.clientX,
                          y: e.clientY,
                          cardTop: rect.top,
                          cardLeft: rect.left,
                        });
                      }}
                                            onMouseLeave={() => setHoveredPreview(null)}
                      className="p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50/30 hover:border-amber-500 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2 shadow-2xs relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-500 text-white transition">
                            <Bookmark size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {item.name}
                            </h4>
                            <span className="text-[9.5px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                              {item.category} • {item.variant}
                            </span>
                          </div>
                        </div>

                        <span className="p-1 rounded-md text-slate-400 hover:text-amber-600 transition" title="Hover to see live preview">
                          <Eye size={13} />
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {item.description || "Custom saved template"}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenTemplateEditorFromPalette(item, item.category)}
                            className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
                            title="Edit this template"
                          >
                            <Pencil size={11} className="text-amber-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTemplate(item.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete custom template"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => addBlockToPaper(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Plus size={13} />
                          <span>Add to Paper</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Regular Category Items (Custom templates for this category first, then built-in presets) */
              <div className="space-y-3">
                {/* Custom templates matching this category */}
                {customTemplates.filter((t) => t.category === paletteActiveCategory).map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      setHoveredPreview(null);
                      handlePaletteDragStart(e, item);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPreview({
                        item,
                        x: e.clientX,
                        y: e.clientY,
                        cardTop: rect.top,
                        cardLeft: rect.left,
                      });
                    }}
                                        onMouseLeave={() => setHoveredPreview(null)}
                    className="p-3.5 rounded-2xl border-2 border-amber-300 bg-amber-50/20 hover:border-amber-500 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2 shadow-2xs relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500 text-white transition">
                          <Bookmark size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-900">
                              {item.name}
                            </h4>
                            <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded">
                              ⭐ My Template
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{item.variant}</span>
                        </div>
                      </div>

                      <span className="p-1 rounded-md text-slate-400 hover:text-amber-600 transition" title="Hover to see live preview">
                        <Eye size={13} />
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                      {item.description || "Custom saved template"}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenTemplateEditorFromPalette(item, paletteActiveCategory)}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
                          title="Edit this template"
                        >
                          <Pencil size={11} className="text-amber-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomTemplate(item.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete custom template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBlockToPaper(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Plus size={13} />
                        <span>Add to Paper</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Built-in Presets */}
                {MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.items.map((item) => (
                  <div
                    key={item.variant}
                    draggable
                    onDragStart={(e) => {
                      setHoveredPreview(null);
                      handlePaletteDragStart(e, { ...item, category: paletteActiveCategory });
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPreview({
                        item: { ...item, category: paletteActiveCategory },
                        x: e.clientX,
                        y: e.clientY,
                        cardTop: rect.top,
                        cardLeft: rect.left,
                      });
                    }}
                                        onMouseLeave={() => setHoveredPreview(null)}
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
                      <span className="p-1 rounded-md text-slate-400 hover:text-amber-600 transition" title="Hover to see live preview">
                        <Eye size={13} />
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenTemplateEditorFromPalette(item, paletteActiveCategory)}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-200"
                        title="Customize and save as your template"
                      >
                        <Pencil size={11} className="text-amber-600" />
                        <span>Customize</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addBlockToPaper({ ...item, category: paletteActiveCategory })}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Plus size={13} />
                        <span>Add to Paper</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Preset Tray at bottom of Sidebar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              1-Click Preset Layouts:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("non_affiliation_salesforce")}
                className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-300 hover:border-indigo-500 font-black text-indigo-950 transition truncate text-left cursor-pointer col-span-2"
              >
                🛡️ Non-Affiliation (Salesforce Partner)
              </button>
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
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("letter_of_explain")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 font-bold text-slate-700 transition truncate text-left cursor-pointer"
              >
                ✍️ Letter of Explain
              </button>
              <button
                type="button"
                onClick={() => handleLoadFullDocumentPreset("request_letter_csr")}
                className="p-1.5 rounded-lg bg-amber-50 border border-amber-300 hover:border-amber-500 font-black text-amber-950 transition truncate text-left cursor-pointer col-span-2"
              >
                📬 Request Letter (CSR)
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ================= SAVED DOCUMENTS ARCHIVE MODAL ================= */}
      {/* ================= CUSTOMIZE & SAVE TEMPLATE MODAL ================= */}
      {templateEditorModal && (
        <TemplateEditorModal
          isOpen={templateEditorModal.isOpen}
          initialData={templateEditorModal.item}
          selectedCompany={selectedCompany}
          docRef={docRef}
          docDate={docDate}
          onClose={() => setTemplateEditorModal(null)}
          onSave={handleSaveCustomTemplate}
          onSaveAndApply={(tpl) => {
            handleSaveCustomTemplate(tpl);
            addBlockToPaper(tpl);
          }}
        />
      )}

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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 border ${archiveCompanyFilter === item.code
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
