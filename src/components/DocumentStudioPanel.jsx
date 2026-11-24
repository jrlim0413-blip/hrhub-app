/* eslint react-refresh/only-export-components: "off" -- This module exports reusable document-studio data alongside its component. */
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import {
  FileText, Award, ShieldAlert, X, Printer, Save, Archive, Pencil, Bookmark, PlusCircle,
  Search, RefreshCw, CheckCircle2, ChevronRight, Copy,
  Sliders, ArrowUp, ArrowDown, Building2, UserCheck, Calendar,
  Download, Eye, Trash2, Sparkles,
  Layers, AlertTriangle, Scissors, GripVertical,
  Plus, RotateCcw, Layout, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent, Settings2, Columns,
  Shield, Scale,
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Highlighter,
  Palette, Shapes, List, ListOrdered, Heading, Minus, CaseUpper, Eraser,
} from "lucide-react";
import {
  COMPANIES,
  resolveCompanyFromMemoRef,
  DIRECTIVE_FONT_FAMILIES
} from "./MemoGeneratorPanel";
import {
  getUserSettings,
  filterValidLetterheadFields
} from "../lib/userSettingsStorage";
import {
  generateUniqueDocRef,
  registerUsedDocRef,
  getSavedDocumentsFromDb,
  saveDocumentRecordToDb,
  deleteDocumentRecordFromDb,
  getAllGlobalDocumentRefs,
  normalizeDocRef
} from "../lib/savedDocumentsStorage";

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
    pageMargin: "3.5rem"
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
    pageMargin: "3.5rem"
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
    pageMargin: "3.5rem"
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
    pageMargin: "3.5rem"
  }
];

export const FONT_FAMILIES = [
  { id: "inter", label: "Modern Clean (Inter / Sans)", css: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: "arial", label: "Corporate Standard (Arial)", css: "Arial, Helvetica, sans-serif" },
  { id: "times", label: "Legal Formal (Times New Roman)", css: "'Times New Roman', Times, serif" },
  { id: "georgia", label: "Executive Serif (Georgia)", css: "Georgia, Cambria, serif" }
];

export const DOCUMENT_FONT_SIZES = [
  { label: "8 pt", value: 10.6 },
  { label: "9 pt (Compact)", value: 12 },
  { label: "10 pt (Standard)", value: 13.3 },
  { label: "10.5 pt", value: 14.0 },
  { label: "11 pt (Executive)", value: 14.6 },
  { label: "12 pt (Formal)", value: 16 },
  { label: "13 pt", value: 17.3 },
  { label: "14 pt (Large)", value: 18.6 },
  { label: "16 pt (Heading)", value: 21.3 },
  { label: "18 pt (Title)", value: 24 }
];

const getDocumentPagePadding = (marginMode, reduceTopSpacing = false) => {
  if (marginMode === "narrow") return reduceTopSpacing ? "0.5rem 1.25rem 1.25rem" : "1.5rem 1.25rem 1.25rem";
  if (marginMode === "compact") return reduceTopSpacing ? "0.5rem 2rem 2rem" : "2rem";
  return reduceTopSpacing ? "0.5rem 2.5rem 2.5rem" : "2.75rem 2.5rem";
};

export const resolveCompanyTokens = (text, company) => {
  if (!text || typeof text !== "string" || !company) return text || "";
  return text
    .replace(/\[COMPANY_NAME\]/g, company.name || "")
    .replace(/\[COMPANY_LEGAL_NAME\]/g, company.legalName || company.name || "")
    .replace(/\[COMPANY_CODE\]/g, company.code || "")
    .replace(/\[COMPANY_ADDRESS\]/g, company.address || "")
    .replace(/\[COMPANY_CONTACT\]/g, company.contact || "")
    .replace(/\[COMPANY_TAGLINE\]/g, company.tagline || "");
};

export const MODULAR_BLOCK_PRESETS = [
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
          aacNumber: "AAC-[COMPANY_CODE]-2026-089"
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
        description: "Official executive header with company logo left, corporate emblem right, centered company name & address, without colored divider line.",
        defaultData: {}
      }
    ]
  },

  {
    category: "addressing",
    categoryLabel: "2. Addressing & Metadata",
    items: [
      {
        variant: "address_termination_agency",
        name: "Agency Agreement Termination Addressing",
        description: "Official termination notice address block with Date line, Addressee Name, Field Station / Office, Company Entity, RE: Subject, and Salutation.",
        defaultData: {
          dateLine: "Date: _____________________",
          recipientName: "MR. DANIEL PADILLA",
          recipientOffice: "STL-ILIGAN OFFICE, LANAO DEL NORTE",
          recipientCompany: "[COMPANY_LEGAL_NAME]",
          subject: "RE: TERMINATION OF AGENCY AGREEMENT",
          salutation: "Dear Mr. Padilla,"
        }
      },
      {
        variant: "address_letter_to_explain",
        name: "Letter of Explanation / NTE Addressing",
        description: "Official Letter of Explanation heading with left-aligned Date, Recipient Name, Designation, Company Entity, Station / Area, RE: Subject, and Salutation.",
        defaultData: {
          date: "SEPTEMBER 28, 2026",
          recipientName: "MOSHER BEBOT",
          recipientTitle: "SALES SUPERVISOR",
          recipientCompany: "[COMPANY_LEGAL_NAME]",
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
          from: "[COMPANY_NAME] — HUMAN RESOURCES DEPARTMENT",
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
          recipientCompany: "[COMPANY_NAME] — Operations Division",
          salutation: "DEAR MR. TAN:"
        }
      },
      {
        variant: "address_public_notice",
        name: "Public Notice & Advisory Banner",
        description: "Prominent centered headline banner with bold reference badge, ideal for public circulars and community advisories.",
        defaultData: {
          bannerTitle: "PUBLIC ADVISORY & FORMAL NOTICE",
          to: "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS OF [COMPANY_NAME]"
        }
      },
      {
        variant: "address_certificate_ribbon",
        name: "Certificate Commendation Header",
        description: "Decorative ceremonial header ('This Certificate is Proudly Conferred upon') with elegant awardee typography.",
        defaultData: {
          conferralText: "THIS CERTIFICATE IS PROUDLY CONFERRED UPON",
          awardeeName: "MS. MARIA SANTOS",
          awardeeTitle: "Senior Area Coordinator • [COMPANY_NAME]"
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
          companyName: "",
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
          companyWarning: "Moreover, this action will not be tolerated by [COMPANY_LEGAL_NAME], as these are grounds for cancellation of your Agency Agreement.",
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
          company: ""
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
          company: ""
        }
      }
    ]
  },

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
          docCode: "[COMPANY_CODE]-VERIFIED-2026",
          noticeText: "This document is an authentic corporate instrument issued by [COMPANY_NAME] via HrHub Corporate System. Tampering is punishable by law."
        }
      },
      {
        variant: "footer_contact_hotline",
        name: "Regional Branch Hotline Strip",
        description: "Subtle bottom bar listing official regional operations hotline numbers, compliance email, and headquarters address.",
        defaultData: {
          hotline: "",
          email: ""
        }
      },
      {
        variant: "footer_page_tracker",
        name: "Page & ISO Compliance Tracker",
        description: "Standard document control line showing Form Code, Revision Number, and Page Numbering.",
        defaultData: {
          formCode: "[COMPANY_CODE]-FORM-HRD-2026-REV03",
          pageText: "Page 1 of 1"
        }
      },
      {
        variant: "footer_division_center",
        name: "Corporate Division Centered Footer",
        description: "Official centered division title reflecting the active company entity and division.",
        defaultData: {
          divisionText: "[COMPANY_NAME] • HUMAN RESOURCE MANAGEMENT DIVISION"
        }
      }
    ]
  }
];

function ElementVisualPreview({ item, selectedCompany, docRef, docDate }) {
  if (!item) return null;

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
            <span className="block font-black text-slate-900 text-sm">{resolveCompanyTokens(item.data?.aacNumber || "AAC-[COMPANY_CODE]-2026-089", selectedCompany)}</span>
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
                {resolveCompanyTokens(item.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany)}
              </h2>
              <p className="text-[10px] font-semibold text-slate-700 mt-1 leading-snug uppercase whitespace-pre-line">
                {resolveCompanyTokens(item.data?.address || selectedCompany.address || "", selectedCompany)}
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

  if (item.category === "addressing") {
    if (item.variant === "address_termination_agency") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-2 select-text">
          <div className="font-bold text-slate-900">{resolveCompanyTokens(item.data?.dateLine || "Date: _____________________", selectedCompany)}</div>
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase text-slate-950">{resolveCompanyTokens(item.data?.recipientName || "MR. DANIEL PADILLA", selectedCompany)}</div>
            <div className="font-bold text-[11px] uppercase text-slate-800">{resolveCompanyTokens(item.data?.recipientOffice || "STL-ILIGAN OFFICE, LANAO DEL NORTE", selectedCompany)}</div>
            <div className="font-bold text-[11px] uppercase text-slate-700">{resolveCompanyTokens(item.data?.recipientCompany || "[COMPANY_LEGAL_NAME]", selectedCompany)}</div>
          </div>
          <div className="font-black text-xs uppercase text-slate-950 pt-1">
            {resolveCompanyTokens(item.data?.subject || "RE: TERMINATION OF AGENCY AGREEMENT", selectedCompany)}
          </div>
          <div className="font-bold text-xs text-slate-900 pt-0.5">{resolveCompanyTokens(item.data?.salutation || "Dear Mr. Padilla,", selectedCompany)}</div>
        </div>
      );
    }
    if (item.variant === "address_letter_to_explain") {
      return (
        <div className="my-3 text-xs text-slate-900 space-y-2 select-text">
          <div className="font-bold uppercase text-slate-900">{resolveCompanyTokens(item.data?.date || "SEPTEMBER 28, 2026", selectedCompany)}</div>
          <div className="space-y-0.5">
            <div className="font-black text-xs uppercase text-slate-950">{resolveCompanyTokens(item.data?.recipientName || "MOSHER BEBOT", selectedCompany)}</div>
            <div className="font-bold text-[11px] uppercase text-slate-800">{resolveCompanyTokens(item.data?.recipientTitle || "SALES SUPERVISOR", selectedCompany)}</div>
            <div className="font-bold text-[11px] uppercase text-slate-800">{resolveCompanyTokens(item.data?.recipientCompany || "[COMPANY_LEGAL_NAME]", selectedCompany)}</div>
            <div className="font-semibold text-[11px] uppercase text-slate-700">{resolveCompanyTokens(item.data?.recipientStation || "MAGUINDANAO DEL NORTE", selectedCompany)}</div>
          </div>
          <div className="font-black italic text-xs uppercase text-slate-950 pt-1">
            {resolveCompanyTokens(item.data?.subject || "RE: LETTER OF EXPLANATION", selectedCompany)}
          </div>
          <div className="font-bold text-xs text-slate-900 pt-0.5">{resolveCompanyTokens(item.data?.salutation || "Dear Gomez,", selectedCompany)}</div>
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
              <span className="font-bold text-slate-900 flex-1">{resolveCompanyTokens(item.data?.to || selectedCompany.defaultTo || "ALL CONCERNED (BRANCH SUPERVISORS & FIELD STAFF)", selectedCompany)}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">FROM:</span>
              <span className="font-bold text-slate-900 flex-1">{resolveCompanyTokens(item.data?.from || "[COMPANY_NAME] — HUMAN RESOURCES DEPARTMENT", selectedCompany)}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">DATE:</span>
              <span className="font-bold text-slate-800 flex-1">{docDate}</span>
            </div>
            <div className="flex items-baseline border-b border-slate-300 pb-2">
              <span className="font-black text-slate-600 w-24 shrink-0 tracking-wide">SUBJECT:</span>
              <span className="font-black text-slate-950 flex-1 uppercase">{resolveCompanyTokens(item.data?.subject || "MANDATORY OPERATIONAL DIRECTIVES", selectedCompany)}</span>
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
            <div className="font-black text-sm uppercase text-slate-900">{resolveCompanyTokens(item.data?.recipientName || "MR. ROBERTO TAN", selectedCompany)}</div>
            <div className="font-semibold text-xs text-slate-700">{resolveCompanyTokens(item.data?.recipientTitle || "Accredited Coordinator • Branch Operations", selectedCompany)}</div>
            <div className="text-xs text-slate-600">{resolveCompanyTokens(item.data?.recipientCompany || "[COMPANY_NAME] — Operations Division", selectedCompany)}</div>
          </div>
          <div className="font-black text-xs text-slate-900 pt-1">
            {resolveCompanyTokens(item.data?.salutation || "DEAR MR. TAN:", selectedCompany)}
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
            {resolveCompanyTokens(item.data?.bannerTitle || "PUBLIC ADVISORY & FORMAL NOTICE", selectedCompany)}
          </h2>
          <div className="h-0.5 w-32 bg-amber-600 mx-auto" />
          <p className="text-xs font-bold text-slate-700 mt-2">
            {resolveCompanyTokens(item.data?.to || "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS OF [COMPANY_NAME]", selectedCompany)}
          </p>
        </div>
      );
    }
    if (item.variant === "address_certificate_ribbon") {
      return (
        <div className="text-center my-4 space-y-2 select-text">
          <p className="text-xs font-black tracking-widest text-amber-700 uppercase">
            {resolveCompanyTokens(item.data?.conferralText || "THIS CERTIFICATE IS PROUDLY CONFERRED UPON", selectedCompany)}
          </p>
          <h2 className="text-2xl font-black uppercase text-slate-950">
            {resolveCompanyTokens(item.data?.awardeeName || "MS. MARIA SANTOS", selectedCompany)}
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {resolveCompanyTokens(item.data?.awardeeTitle || "Senior Area Coordinator • [COMPANY_NAME]", selectedCompany)}
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

  if (item.category === "body") {
    if (item.variant === "body_rewards_voucher") {
      return (
        <div className="space-y-3 my-3 select-text">
          <div className="text-center">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              {resolveCompanyTokens(item.data?.title || "CERTIFICATE OF MERIT & INCENTIVE VOUCHER", selectedCompany)}
            </h3>
          </div>
          <p className="text-justify text-xs leading-relaxed text-slate-800">
            {resolveCompanyTokens(item.data?.citation || "In sincere appreciation of outstanding dedication, exemplary teamwork, and consistent quota achievement in regional operations for [COMPANY_NAME].", selectedCompany)}
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
            {resolveCompanyTokens(item.data?.introText || "", selectedCompany)}
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
            {resolveCompanyTokens(item.data?.justificationText2 || "", selectedCompany)}
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
            {resolveCompanyTokens(item.data?.companyWarning || "Moreover, this action will not be tolerated by [COMPANY_LEGAL_NAME], as these are grounds for cancellation of your Agency Agreement.", selectedCompany)}
          </p>
          <p className="font-medium">
            {item.data?.conclusionParagraph || "In conclusion, your Agency Agreement is hereby terminated effective _____________________."}
          </p>
        </div>
      );
    }
    if (item.variant === "body_non_affiliation_salesforce") {
      const resolvedCompanyName = resolveCompanyTokens(item.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany);
      return (
        <div className="space-y-2.5 my-2 text-xs leading-relaxed text-slate-900 select-text">
          <div className="text-center font-black text-sm tracking-wide uppercase text-slate-950">
            {resolveCompanyTokens(item.data?.title || "CERTIFICATE OF NON-AFFILIATION", selectedCompany)}
          </div>
          {item.data?.dateLine && (
            <div className="font-bold text-xs text-slate-950">
              {item.data.dateLine}
            </div>
          )}
          <p className="text-justify line-clamp-3">
            This is to certify that <strong>{item.data?.personName || "ARJUN BAGUIO PATALINGHUG"}</strong>, is not <strong>affiliated</strong> with <strong>{resolvedCompanyName}</strong> as a Salesforce partner under the <strong>{item.data?.agencyName || "Philippine Charity Sweepstakes Office (PCSO)"}</strong>.
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
            {resolveCompanyTokens(item.data.title, selectedCompany)}
          </h3>
        )}
        <div className="text-justify text-xs leading-relaxed text-slate-800 whitespace-pre-line">
          {resolveCompanyTokens(item.data?.bodyText || "", selectedCompany)}
        </div>
      </div>
    );
  }

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
            <div className="text-slate-400 font-bold uppercase text-[9px]">{selectedCompany.name}</div>
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase text-[10px] mb-5">{item.data?.col2Label || "Noted by:"}</div>
            <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{item.data?.col2Name || "ATTY. REGIONAL COUNSEL"}</div>
            <div className="text-slate-500 text-[10px]">{item.data?.col2Title || "Legal Directorate"}</div>
            <div className="text-slate-400 font-bold uppercase text-[9px]">{selectedCompany.name}</div>
          </div>
          <div>
            <div className="font-bold text-slate-500 uppercase text-[10px] mb-5">{item.data?.col3Label || "Approved by:"}</div>
            <div className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs">{item.data?.col3Name || "CHARMIE JEAN M. SIMPAL"}</div>
            <div className="text-slate-500 text-[10px]">{item.data?.col3Title || "President & CEO"}</div>
            <div className="text-slate-400 font-bold uppercase text-[9px]">{selectedCompany.name}</div>
          </div>
        </div>
      );
    }
    if (item.variant === "sig_receiving_acknowledgment") {
      return (
        <div className="border-t-2 border-dashed border-slate-400 pt-3 my-4 text-xs select-text">
          <div className="flex justify-between items-center pb-1.5 mb-2">
            <span className="font-black uppercase tracking-wider text-slate-900 text-[11px]">{item.data?.stubTitle || "ACKNOWLEDGMENT & RECEIVING SLIP"}</span>
            <span className="font-mono text-[10px] text-slate-500 font-bold">{selectedCompany.code} Copy • Return to HRMD</span>
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
            <div className="text-slate-500 font-bold uppercase text-[9px]">{resolveCompanyTokens(item.data?.company || selectedCompany.legalName || selectedCompany.name, selectedCompany)}</div>
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
            <div className="text-slate-500 font-bold uppercase text-[9px]">
              {selectedCompany.name}
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
          <div>
            <div className="font-black text-xs uppercase text-slate-950 tracking-wider">
              {item.data?.title || "OPERATIONS MANAGER"}
            </div>
            <div className="text-slate-500 font-bold uppercase text-[10px] mt-0.5">
              {selectedCompany.name}
            </div>
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
              <div className="text-slate-500 font-bold uppercase text-[10px]">{resolveCompanyTokens(item.data?.company || selectedCompany.legalName || selectedCompany.name, selectedCompany)}</div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (item.category === "footer") {
    if (item.variant === "footer_division_center") {
      return (
        <div className="border-t border-slate-300 pt-3 mt-4 text-center text-xs text-slate-600 font-black tracking-widest uppercase select-text">
          {resolveCompanyTokens(item.data?.divisionText || "[COMPANY_NAME] • HUMAN RESOURCE MANAGEMENT DIVISION", selectedCompany)}
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
    if (item.variant === "footer_corporate_security") {
      return (
        <div className="border-t border-slate-300 pt-3 mt-4 flex items-center justify-between gap-4 text-[10px] text-slate-500 font-mono select-text">
          <div className="font-bold text-slate-700 shrink-0">{resolveCompanyTokens(item.data?.docCode || "[COMPANY_CODE]-VERIFIED-2026", selectedCompany)}</div>
          <div className="italic text-right">{resolveCompanyTokens(item.data?.noticeText || "This document is an authentic corporate instrument issued by [COMPANY_NAME] via HrHub Corporate System.", selectedCompany)}</div>
        </div>
      );
    }
    if (item.variant === "footer_contact_hotline") {
      return (
        <div className="border-t border-slate-300 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono select-text">
          <div>{resolveCompanyTokens(item.data?.hotline || selectedCompany.contact || selectedCompany.address, selectedCompany)}</div>
          <div>{resolveCompanyTokens(item.data?.email || `${selectedCompany.legalName || selectedCompany.name} Official Records`, selectedCompany)}</div>
        </div>
      );
    }
    if (item.variant === "footer_page_tracker") {
      return (
        <div className="border-t border-slate-300 pt-2 mt-4 flex justify-between text-[10px] text-slate-500 font-mono select-text">
          <span>{resolveCompanyTokens(item.data?.formCode || "[COMPANY_CODE]-FORM-HRD-2026-REV03", selectedCompany)}</span>
          <span>{item.data?.pageText || "Page 1 of 1"}</span>
          <span>{selectedCompany.name}</span>
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

export const CUSTOM_TEMPLATES_STORAGE_KEY = "hrhub_doc_custom_templates";
const LEGACY_CUSTOM_TEMPLATES_STORAGE_KEY = "hrhub_doc_studio_custom_templates";

export function getStoredCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
      || localStorage.getItem(LEGACY_CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const templates = JSON.parse(raw);
    if (Array.isArray(templates)) return templates;
    console.warn("Saved document templates are not in the expected format.");
    return [];
  } catch (error) {
    console.warn("Failed to load custom templates from localStorage:", error);
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
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category] = useState(initialData?.category || "body");
  const [variant] = useState(initialData?.variant || "body_standard");
  const [formData, setFormData] = useState(initialData?.data || {});

  if (!isOpen) return null;

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

  const previewItem = {
    category,
    variant,
    name: name || "Custom Template",
    data: formData
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl xl:max-w-7xl rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pr-1">
          <form onSubmit={handleFormSubmit} id="custom-template-form" className="lg:col-span-6 space-y-4 text-xs pr-1">
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

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  2. Content &amp; Document Text
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Entity: {selectedCompany.name}
                </span>
              </div>

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
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Entity / Company Name (Dynamic Token):</label>
                      <input
                        type="text"
                        value={formData.recipientCompany ?? "[COMPANY_LEGAL_NAME]"}
                        onChange={(e) => updateField("recipientCompany", e.target.value)}
                        placeholder="[COMPANY_LEGAL_NAME]"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase text-slate-800"
                      />
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
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Entity / Company Name (Dynamic Token):</label>
                      <input
                        type="text"
                        value={formData.recipientCompany ?? "[COMPANY_LEGAL_NAME]"}
                        onChange={(e) => updateField("recipientCompany", e.target.value)}
                        placeholder="[COMPANY_LEGAL_NAME]"
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
  onClose = () => { },
}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const [letterheadOverrides, setLetterheadOverrides] = useState({});
  const companies = useMemo(() => {
    return COMPANIES.map((company) => ({
      ...company,
      ...letterheadOverrides[company.id]
    }));
  }, [letterheadOverrides]);
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);
  const selectedCompanyCodeRef = useRef(selectedCompany?.code || "LBC");
  useEffect(() => {
    selectedCompanyCodeRef.current = selectedCompany?.code || "LBC";
  }, [selectedCompany?.code]);

  const [paperSize, setPaperSize] = useState("letter");
  const [fontFamily, setFontFamily] = useState("Arial, Helvetica, sans-serif");
  const [toolbarFontFamily, setToolbarFontFamily] = useState("Arial, Helvetica, sans-serif");
  const [toolbarFontSize, setToolbarFontSize] = useState(16);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [clausesMenuOpen, setClausesMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [docLineHeight, setDocLineHeight] = useState("1.55");
  const [isPrintConfigOpen, setIsPrintConfigOpen] = useState(false);
  const [printMarginMode, setPrintMarginMode] = useState("standard");
  const [reduceTopSpacingInPrint, setReduceTopSpacingInPrint] = useState(false);
  const [printColorMode, setPrintColorMode] = useState("color");
  const [includeLetterheadInPrint, setIncludeLetterheadInPrint] = useState(true);
  const [includeSignaturesInPrint, setIncludeSignaturesInPrint] = useState(true);
  const [includeFooterInPrint, setIncludeFooterInPrint] = useState(true);
  const [includeWatermarkInPrint, setIncludeWatermarkInPrint] = useState(true);
  const [printOrientation, setPrintOrientation] = useState("portrait");
  const [printCustomScale, setPrintCustomScale] = useState(100);
  const [printPreviewZoom, setPrintPreviewZoom] = useState(1.0);
  const [previewFitMode, setPreviewFitMode] = useState("fit-page");
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [paletteDrawerWidth, setPaletteDrawerWidth] = useState("normal");
  const [printModalPreviewHtml, setPrintModalPreviewHtml] = useState("");
  const lastSelectionRangeRef = useRef(null);

  useEffect(() => {
    const handleEscapePrint = (e) => {
      if (e.key === "Escape" && isPrintConfigOpen) {
        setIsPrintConfigOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscapePrint);
    return () => window.removeEventListener("keydown", handleEscapePrint);
  }, [isPrintConfigOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".doc-toolbar-container")) {
        setHighlightMenuOpen(false);
        setColorMenuOpen(false);
        setShapesMenuOpen(false);
        setClausesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [watermarkOpacity, setWatermarkOpacity] = useState(4);
  const [watermarkScale, setWatermarkScale] = useState(100);
  const [activeTopToolbarTab, setActiveTopToolbarTab] = useState("formatting");
  const [isTopToolbarVisible, setIsTopToolbarVisible] = useState(false);
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [contentDensity, setContentDensity] = useState("normal");
  const contentFlowRef = useRef(null);
  const topToolbarRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsTopToolbarVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isPaletteDrawerOpen) {
        setIsPaletteDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteDrawerOpen]);

  const currentPaperDef = useMemo(() => {
    return PAPER_SIZES.find((p) => p.id === paperSize) || PAPER_SIZES[0];
  }, [paperSize]);
  const [pageHeightMeasurement, setPageHeightMeasurement] = useState({ paperId: "", heightPx: 0 });
  const measuredPageHeightPx = pageHeightMeasurement.paperId === currentPaperDef.id
    ? pageHeightMeasurement.heightPx
    : currentPaperDef.heightPx;
  const effectivePageHeightPx = Math.max(currentPaperDef.heightPx, measuredPageHeightPx);
  const effectivePageHeightIn = effectivePageHeightPx > currentPaperDef.heightPx
    ? `${(effectivePageHeightPx / 96).toFixed(3)}in`
    : currentPaperDef.heightIn;

  const selectedPaper = useMemo(() => {
    return {
      ...currentPaperDef,
      name: currentPaperDef.label.split(" (")[0],
      dimensions: `${currentPaperDef.widthIn || '8.5in'} × ${currentPaperDef.heightIn || '11in'}`
    };
  }, [currentPaperDef]);

  const calculatedFitScale = useMemo(() => {
    const isLandscape = printOrientation === "landscape";
    const targetW = isLandscape ? effectivePageHeightPx : currentPaperDef.widthPx;
    const targetH = isLandscape ? currentPaperDef.widthPx : effectivePageHeightPx;
    const availH = Math.max(300, windowDimensions.height - 110);
    const availW = Math.max(360, windowDimensions.width - 360);
    const scaleH = availH / targetH;
    const scaleW = availW / targetW;
    const rawScale = Math.min(scaleH, scaleW, 1.0);
    return Math.max(0.35, Math.min(1.0, parseFloat(rawScale.toFixed(2))));
  }, [printOrientation, currentPaperDef, effectivePageHeightPx, windowDimensions]);

  const effectivePreviewZoom = useMemo(() => {
    if (previewFitMode === "fit-page") {
      return calculatedFitScale;
    }
    return printPreviewZoom;
  }, [previewFitMode, calculatedFitScale, printPreviewZoom]);

  const [docRef, setDocRef] = useState(() => generateUniqueDocRef("LBC"));
  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  });

  const [paperElements, setPaperElements] = useState([]);

  const [activeElementId, setActiveElementId] = useState(null);

  const [hoveredPreview, setHoveredPreview] = useState(null);

  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [paletteActiveCategory, setPaletteActiveCategory] = useState("header");

  const [customTemplates, setCustomTemplates] = useState(() => {
    return getStoredCustomTemplates();
  });

  const [templateEditorModal, setTemplateEditorModal] = useState(null);

  const [savedDocs, setSavedDocs] = useState([]);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveCompanyFilter, setArchiveCompanyFilter] = useState("ALL");

  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [{ documents }, globalRefs, userSettingsRes] = await Promise.all([
          getSavedDocumentsFromDb(currentUser),
          getAllGlobalDocumentRefs(),
          getUserSettings(currentUser)
        ]);
        if (isMounted) {
          const settings = userSettingsRes?.settings || {};
          const companyIds = COMPANIES.map((c) => c.id);
          const mergedLetterheads = {
            ...filterValidLetterheadFields(settings.organizationLetterheadDefaults, companyIds),
            ...filterValidLetterheadFields(settings.letterheadDefaults, companyIds)
          };
          setLetterheadOverrides(mergedLetterheads);
          setSavedDocs(documents || []);
          setDocRef(() => {
            return generateUniqueDocRef(selectedCompanyCodeRef.current, globalRefs);
          });
        }
      } catch (e) {
        console.warn("Failed fetching saved documents:", e);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  const triggerToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3600);
  };

  const handleSelectCompany = (comp) => {
    if (!comp) return;
    setSelectedCompanyId(comp.id);
    const newRef = docRef.replace(
      /-(?:LBC|5ARG|SIMCON|GFC|GLOW|IMP|SGC|GTI|RMC|FES|OPC)-/i,
      `-${comp.code}-`
    );
    setDocRef(newRef);

    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.category === "header") {
          if (el.variant === "header_dual_clean") {
            return {
              ...el,
              data: {
                ...el.data,
                leftLogo: comp.logoUrl,
                rightLogo: comp.rightLogoUrl || "/logos/group_emblem.jpg",
                companyName: "",
                address: ""
              }
            };
          }
          if (el.variant === "header_triple_logo") {
            return {
              ...el,
              data: {
                ...el.data,
                centerLogo: comp.logoUrl,
                leftLogo: comp.rightLogoUrl || "/id-assets/group_emblem.jpg",
                rightLogo: el.data?.rightLogo || "/id-assets/pcso_logo.png"
              }
            };
          }
          return {
            ...el,
            data: {
              ...el.data,
              centerLogo: comp.logoUrl,
              leftLogo: comp.logoUrl,
              rightLogo: comp.rightLogoUrl || "/logos/group_emblem.jpg",
              companyName: "",
              address: "",
              contact: "",
              tagline: "",
              aacNumber: el.variant === "header_aac_compliance" ? "AAC-[COMPANY_CODE]-2026-089" : el.data?.aacNumber
            }
          };
        }
        if (el.category === "addressing") {
          if (el.variant === "address_termination_agency" || el.variant === "address_letter_to_explain") {
            return {
              ...el,
              data: {
                ...el.data,
                recipientCompany: "[COMPANY_LEGAL_NAME]"
              }
            };
          }
          if (el.variant === "address_formal_letter") {
            return {
              ...el,
              data: {
                ...el.data,
                recipientCompany: "[COMPANY_NAME] — Operations Division"
              }
            };
          }
          if (el.variant === "address_public_notice") {
            return {
              ...el,
              data: {
                ...el.data,
                to: "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS OF [COMPANY_NAME]"
              }
            };
          }
          if (el.variant === "address_certificate_ribbon") {
            return {
              ...el,
              data: {
                ...el.data,
                awardeeTitle: "Senior Area Coordinator • [COMPANY_NAME]"
              }
            };
          }
          if (el.variant === "address_memo_grid") {
            const matchedDefaultTo = COMPANIES.some((c) => c.defaultTo && c.defaultTo === el.data?.to);
            return {
              ...el,
              data: {
                ...el.data,
                to: matchedDefaultTo ? (comp.defaultTo || el.data?.to) : el.data?.to,
                companyName: ""
              }
            };
          }
          return el;
        }
        if (el.variant === "body_non_affiliation_salesforce") {
          return {
            ...el,
            data: {
              ...el.data,
              companyName: ""
            }
          };
        }
        if (el.variant === "body_termination_agency") {
          return {
            ...el,
            data: {
              ...el.data,
              companyWarning: "Moreover, this action will not be tolerated by [COMPANY_LEGAL_NAME], as these are grounds for cancellation of your Agency Agreement."
            }
          };
        }
        if (el.category === "signatory") {
          return {
            ...el,
            data: {
              ...el.data,
              company: ""
            }
          };
        }
        if (el.category === "footer") {
          if (el.variant === "footer_contact_hotline") {
            return {
              ...el,
              data: {
                ...el.data,
                hotline: "",
                email: ""
              }
            };
          }
          return {
            ...el,
            data: {
              ...el.data,
              company: ""
            }
          };
        }
        return el;
      })
    );

    triggerToast(`Document entity switched to ${comp.name}`, "info");
  };

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
      saveStoredCustomTemplates(updated);
      return updated;
    });

    triggerToast(`✓ Template "${newTemplate.name}" saved locally!`, "success");
    setTemplateEditorModal(null);
  };

  const handleDeleteCustomTemplate = (templateId) => {
    setCustomTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== templateId);
      saveStoredCustomTemplates(updated);
      return updated;
    });
    triggerToast("Custom template deleted", "info");
  };

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

  const addBlockToPaper = (item, insertIndex = null) => {
    const baseData = item.data ? JSON.parse(JSON.stringify(item.data)) : (item.defaultData ? JSON.parse(JSON.stringify(item.defaultData)) : {});

    for (const k of Object.keys(baseData)) {
      if (typeof baseData[k] === "string") {
        baseData[k] = resolveCompanyTokens(baseData[k], selectedCompany);
      }
    }

    if (item.variant === "body_non_affiliation_salesforce") {
      const pName = baseData.personName || "ARJUN BAGUIO PATALINGHUG";
      const pTitle = baseData.personNameTitle || "Arjun Baguio Patalinghug";
      const cLegal = selectedCompany.legalName || selectedCompany.name;
      const agency = baseData.agencyName || "Philippine Charity Sweepstakes Office (PCSO)";
      const cNumber = baseData.contactNumber || "09243223514";

      if (!baseData.para1) {
        baseData.para1 = `This is to certify that <strong class="font-black text-slate-950">${pName}</strong>, is not <strong class="font-bold">affiliated</strong> with <strong class="font-bold">${cLegal}</strong> as a Salesforce partner under the <strong class="font-bold text-slate-950">${agency}</strong>.`;
      }
      if (!baseData.para2) {
        baseData.para2 = `We affirm that the aforementioned individual <strong class="font-bold">has no formal or informal association</strong> with <strong class="font-bold">${cLegal}</strong> in any capacity related to Salesforce services, nor do they represent the company in any activities associated with PCSO.`;
      }
      if (!baseData.para3) {
        baseData.para3 = `Any claims or representation made by this individual suggesting that He is a Salesforce partner of <strong class="font-bold">${cLegal}</strong> or have any related business dealings with the company are <strong class="font-bold">false and unauthorized</strong>.`;
      }
      if (!baseData.para4) {
        baseData.para4 = `This certification is issued for the <strong class="font-bold">purpose of clarifying</strong> that <strong class="font-bold text-slate-950">${pTitle}</strong> has <strong class="font-bold">never been affiliated</strong> with <strong class="font-bold">${cLegal} as a Salesforce partner</strong>.`;
      }
      if (!baseData.para5) {
        baseData.para5 = `For verification or further inquiries, please contact #: <strong class="font-black text-slate-950">${cNumber}</strong>.`;
      }
    }

    const newElement = {
      id: "elem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      category: item.category,
      variant: item.variant,
      name: item.name,
      data: baseData
    };

    setPaperElements((prev) => {
      const existingIdx = prev.findIndex((el) => el.category === item.category);
      if (existingIdx !== -1) {
        const clone = [...prev];
        clone[existingIdx] = newElement;
        const catLabel = item.category === "body" ? "Directives" : item.category.toUpperCase();
        triggerToast(`✓ Replaced ${catLabel} with "${item.name}"`, "success");
        return clone;
      }

      const CATEGORY_ORDER = ["header", "addressing", "body", "signatory", "footer"];
      const targetCatOrder = CATEGORY_ORDER.indexOf(item.category);

      if (insertIndex !== null && insertIndex < prev.length) {
        const clone = [...prev];
        clone.splice(insertIndex, 0, newElement);
        triggerToast(`✓ Added "${item.name}" to Coupon Bond`, "success");
        return clone;
      }

      if (targetCatOrder !== -1) {
        let insertAt = prev.length;
        for (let i = 0; i < prev.length; i++) {
          const elCatOrder = CATEGORY_ORDER.indexOf(prev[i].category);
          if (elCatOrder > targetCatOrder) {
            insertAt = i;
            break;
          }
        }
        const clone = [...prev];
        clone.splice(insertAt, 0, newElement);
        triggerToast(`✓ Added "${item.name}" to Coupon Bond`, "success");
        return clone;
      }

      return [...prev, newElement];
    });

    setActiveElementId(newElement.id);
  };

  const handleFieldInput = (elemId, key, value) => {
    const target = paperElements.find((el) => el.id === elemId);
    if (target) {
      if (!target.data) target.data = {};
      target.data[key] = value;
    }
  };
  const handleTokenAwareBlur = (elemId, key, rawValue, editedText) => {
    updateElementData(elemId, key, editedText);
  };

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

  const removeElement = (elemId) => {
    setPaperElements((prev) => prev.filter((el) => el.id !== elemId));
    triggerToast("Element removed from bond paper", "info");
  };

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

  const duplicateElement = (elemId) => {
    setPaperElements((prev) => {
      const idx = prev.findIndex((el) => el.id === elemId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const cloned = {
        ...target,
        id: "elem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: `${target.name} (Copy)`,
        data: JSON.parse(JSON.stringify(target.data || {}))
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, cloned);
      return copy;
    });
    triggerToast("✓ Duplicated block", "success");
  };

  const adjustElementLayout = (elemId, updates) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        return {
          ...el,
          data: {
            ...(el.data || {}),
            ...updates
          }
        };
      })
    );
  };

  const handleStartBlockResize = (e, elemId, direction) => {
    e.preventDefault();
    e.stopPropagation();

    const targetElem = paperElements.find((p) => p.id === elemId);
    if (!targetElem) return;

    const startY = e.clientY;
    const startX = e.clientX;
    const initialPaddingTop = targetElem.data?.paddingTop ?? 4;
    const initialPaddingBottom = targetElem.data?.paddingBottom ?? 8;
    const initialWidth = targetElem.data?.widthPercent ?? 100;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaX = moveEvent.clientX - startX;

      if (direction === "bottom" || direction === "se" || direction === "sw") {
        const nextPadding = Math.max(0, Math.min(60, initialPaddingBottom + Math.round(deltaY / 2)));
        adjustElementLayout(elemId, { paddingBottom: nextPadding });
      } else if (direction === "top" || direction === "ne" || direction === "nw") {
        const nextPadding = Math.max(0, Math.min(60, initialPaddingTop - Math.round(deltaY / 2)));
        adjustElementLayout(elemId, { paddingTop: nextPadding });
      }

      if (direction === "se" || direction === "ne" || direction === "right") {
        const nextWidth = Math.max(40, Math.min(100, initialWidth + Math.round(deltaX / 4)));
        adjustElementLayout(elemId, { widthPercent: nextWidth });
      } else if (direction === "sw" || direction === "nw" || direction === "left") {
        const nextWidth = Math.max(40, Math.min(100, initialWidth - Math.round(deltaX / 4)));
        adjustElementLayout(elemId, { widthPercent: nextWidth });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      lastSelectionRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (lastSelectionRangeRef.current && sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(lastSelectionRangeRef.current);
      } catch (error) {
        console.warn("Could not restore the document text selection:", error);
      }
    }
  };

  const executeCommand = (command, value = null) => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();

    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      while (node && node !== document.body) {
        if (node.nodeType === 1 && node.getAttribute && node.getAttribute("contenteditable") === "true") {
          node.dispatchEvent(new Event("input", { bubbles: true }));
          break;
        }
        node = node.parentNode;
      }
    }
  };

  const insertHtmlAtCursor = (html) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = tempDiv.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      saveSelection();
    } else if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).startContainer) {
      const range = sel.getRangeAt(0);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = tempDiv.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      saveSelection();
    } else {
      const printable = document.getElementById("coupon-bond-printable");
      if (printable) {
        const activeEl = printable.querySelector("[contenteditable='true']:focus") || printable.querySelector("[data-last-active='true']") || printable.querySelector("[contenteditable='true']");
        if (activeEl) {
          activeEl.innerHTML += html;
        }
      }
    }
  };

  const transformSelectedToUppercase = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().toUpperCase();
    document.execCommand("insertText", false, text);
    saveSelection();
  };

  const handleUndo = () => {
    restoreSelection();
    document.execCommand("undo", false, null);
    saveSelection();
  };

  const handleRedo = () => {
    restoreSelection();
    document.execCommand("redo", false, null);
    saveSelection();
  };

  const handleAlign = (align) => {
    switch (align) {
      case "center":
        executeCommand("justifyCenter");
        break;
      case "right":
        executeCommand("justifyRight");
        break;
      case "justify":
        executeCommand("justifyFull");
        break;
      case "left":
      default:
        executeCommand("justifyLeft");
        break;
    }
  };

  const handleIncreaseIndent = () => {
    executeCommand("indent");
  };

  const handleDecreaseIndent = () => {
    executeCommand("outdent");
  };

  const handleSetLineHeight = (val) => {
    setDocLineHeight(val);
    const printable = document.getElementById("coupon-bond-printable");
    if (printable) {
      printable.style.setProperty("--doc-line-height", val);
      printable.style.lineHeight = val;
    }
  };

  const handleInsertParagraph = () => {
    insertHtmlAtCursor('<p style="margin: 0.5rem 0; line-height: inherit;">Insert new directive or paragraph here...</p><p><br></p>');
    triggerToast("✓ Inserted editable paragraph block at cursor", "success");
  };

  const handleSetToolbarFontFamily = (val) => {
    setToolbarFontFamily(val);
    setFontFamily(val);
    restoreSelection();
    document.execCommand("fontName", false, val);
    saveSelection();
  };

  const handleSetToolbarFontSize = (sizeVal) => {
    const numVal = Math.max(8, Math.min(36, Number(sizeVal) || 16));
    setToolbarFontSize(numVal);
    restoreSelection();
    try {
      document.execCommand("fontSize", false, "3");
    } catch (error) {
      console.warn("Could not apply the selected font size:", error);
    }
    saveSelection();
  };

  const selectedFontSizeValue = useMemo(() => {
    let closest = DOCUMENT_FONT_SIZES[5];
    let minDiff = 999;
    for (const sz of DOCUMENT_FONT_SIZES) {
      const diff = Math.abs(sz.value - toolbarFontSize);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sz;
      }
    }
    return closest.value;
  }, [toolbarFontSize]);

  const handleStepFontSize = (direction) => {
    let currentIndex = -1;
    let minDiff = 999;
    DOCUMENT_FONT_SIZES.forEach((sz, idx) => {
      const diff = Math.abs(sz.value - toolbarFontSize);
      if (diff < minDiff) {
        minDiff = diff;
        currentIndex = idx;
      }
    });
    const nextIndex = Math.max(0, Math.min(DOCUMENT_FONT_SIZES.length - 1, currentIndex + direction));
    handleSetToolbarFontSize(DOCUMENT_FONT_SIZES[nextIndex].value);
  };

  useEffect(() => {
    const flowEl = contentFlowRef.current;
    const pageEl = flowEl?.closest("#coupon-bond-printable");
    if (!flowEl || !pageEl) {
      setPageHeightMeasurement({ paperId: currentPaperDef.id, heightPx: currentPaperDef.heightPx });
      return;
    }

    const measureRequiredPageHeight = () => {
      const pageStyles = window.getComputedStyle(pageEl);
      const topPadding = parseFloat(pageStyles.paddingTop) || 0;
      const bottomPadding = parseFloat(pageStyles.paddingBottom) || 0;
      const flowStyles = window.getComputedStyle(flowEl);
      const rowGap = parseFloat(flowStyles.rowGap) || 0;
      const contentHeight = Array.from(flowEl.children).reduce((total, child) => {
        const childStyles = window.getComputedStyle(child);
        const marginTop = childStyles.marginTop === "auto" ? 0 : parseFloat(childStyles.marginTop) || 0;
        const marginBottom = childStyles.marginBottom === "auto" ? 0 : parseFloat(childStyles.marginBottom) || 0;
        return total + child.getBoundingClientRect().height + marginTop + marginBottom;
      }, 0) + Math.max(0, flowEl.children.length - 1) * rowGap;
      const requiredHeight = Math.max(
        currentPaperDef.heightPx,
        Math.ceil(topPadding + contentHeight + bottomPadding + 12)
      );
      setPageHeightMeasurement((previous) => (
        previous.paperId === currentPaperDef.id && Math.abs(previous.heightPx - requiredHeight) <= 1
          ? previous
          : { paperId: currentPaperDef.id, heightPx: requiredHeight }
      ));
    };

    const resizeObserver = new ResizeObserver(measureRequiredPageHeight);
    resizeObserver.observe(flowEl);
    resizeObserver.observe(pageEl);
    measureRequiredPageHeight();
    return () => resizeObserver.disconnect();
  }, [paperElements, paperSize, toolbarFontSize, toolbarFontFamily, contentDensity, printMarginMode, reduceTopSpacingInPrint, currentPaperDef]);

  const handleCanvasKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      executeCommand("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
      return;
    }
    if (e.key === " ") {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const textNode = sel.anchorNode;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const textBeforeCursor = textNode.textContent.slice(0, sel.anchorOffset).trim();
          if (/^(\d+)[.)]$/.test(textBeforeCursor)) {
            e.preventDefault();
            textNode.textContent = textNode.textContent.slice(sel.anchorOffset);
            document.execCommand("insertOrderedList", false, null);
            return;
          }
          if (/^[-*\u2022]$/.test(textBeforeCursor)) {
            e.preventDefault();
            textNode.textContent = textNode.textContent.slice(sel.anchorOffset);
            document.execCommand("insertUnorderedList", false, null);
            return;
          }
        }
      }
    }
  };

  const addTerminationClause = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.terminationClauses || [
          "5.6. If the concerned member violates, in any way, any provision of this Contract.",
          "5.8. In case of loss of trust and confidence in the concerned member.",
          "5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force and those which may from time to time be promulgated by the Company."
        ];
        return {
          ...el,
          data: {
            ...el.data,
            terminationClauses: [...current, "5.10. Additional specific violation grounds or operational clause."]
          }
        };
      })
    );
  };

  const removeTerminationClause = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.terminationClauses || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            terminationClauses: current
          }
        };
      })
    );
  };

  const addAllegation = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.allegations || [
          "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
        ];
        return {
          ...el,
          data: {
            ...el.data,
            allegations: [...current, "Additional reported allegation or violation incident details."]
          }
        };
      })
    );
  };

  const removeAllegation = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.allegations || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            allegations: current
          }
        };
      })
    );
  };

  const addContractClause = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.contractClauses || [
          { num: "9.11", text: "Acts of theft, dishonesty, fraud, misrepresentation, or breach of trust." },
          { num: "9.12", text: "Violation of any terms in the Agency Agreement." },
          { num: "9.14", text: "Loss of trust and confidence in the Cabo or Cobrador." },
          { num: "9.15", text: "Violation of any provision of the 2020 STL RIRR, existing rules, regulations, or ethical standards, as well as future directives from the STL-AAC." }
        ];
        return {
          ...el,
          data: {
            ...el.data,
            contractClauses: [...current, { num: "9.16", text: "New contractual directive or breach condition." }]
          }
        };
      })
    );
  };

  const removeContractClause = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.contractClauses || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            contractClauses: current
          }
        };
      })
    );
  };

  const addTableRow = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.tableRows || [
          { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
          { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
        ];
        return {
          ...el,
          data: {
            ...el.data,
            tableRows: [...current, { desc: "NEW ITEM DESCRIPTION", qty: "1 PIECE", price: "PHP 0.00", total: "PHP 0.00" }]
          }
        };
      })
    );
  };

  const removeTableRow = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.tableRows || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            tableRows: current
          }
        };
      })
    );
  };

  const addDirectiveItem = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.items || [
          "Strict adherence to official timekeeping and biometric verification schedules.",
          "Immediate cash handover and zero-float remittal at the end of each drawing shift.",
          "Mandatory wearing of official company uniform and valid identification cards on premises.",
          "Prohibition of unauthorized visitors or former personnel within cash teller enclosures."
        ];
        return {
          ...el,
          data: {
            ...el.data,
            items: [...current, "New sequential operational directive or protocol requirement."]
          }
        };
      })
    );
  };

  const removeDirectiveItem = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.items || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            items: current
          }
        };
      })
    );
  };

  const addCcRecipient = (elemId) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = el.data?.ccRecipients || [
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
        ];
        return {
          ...el,
          data: {
            ...el.data,
            ccRecipients: [
              ...current,
              {
                name: "OFFICER / RECIPIENT NAME",
                title: "Designation / Position",
                company: selectedCompany.name || "SGC Corporation",
                address: selectedCompany.address || ""
              }
            ]
          }
        };
      })
    );
  };

  const removeCcRecipient = (elemId, idx) => {
    setPaperElements((prev) =>
      prev.map((el) => {
        if (el.id !== elemId) return el;
        const current = [...(el.data?.ccRecipients || [])];
        current.splice(idx, 1);
        return {
          ...el,
          data: {
            ...el.data,
            ccRecipients: current
          }
        };
      })
    );
  };

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
        { ...tripleHeader, category: "header" },
        { ...termAddr, category: "addressing" },
        { ...agencyBody, category: "body" },
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
        { ...dualCleanHeader, category: "header" },
        { ...sfBody, category: "body" },
        { ...certSig, category: "signatory" }
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
    if (presetKey === "request_letter_csr") {
      setPaperSize("legal14");
      setToolbarFontSize(16);
      setContentDensity("compact");
      setPrintMarginMode("compact");
    } else {
      setToolbarFontSize(16);
      setContentDensity("normal");
    }
    triggerToast(`✓ Loaded full layout preset on Coupon Bond!`, "success");
  };

  const handleClearPaper = () => {
    if (paperElements.length === 0) return;
    if (window.confirm("Clear all elements and start with a completely blank coupon bond?")) {
      setPaperElements([]);
      setContentDensity("normal");
      triggerToast("Coupon Bond reset to blank", "info");
    };
  };

  const handlePaletteDragStart = (e, item) => {
    setIsDraggingItem(true);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handlePaletteDragEnd = () => {
    setIsDraggingItem(false);
    setIsDragOverCanvas(false);
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
    setIsDraggingItem(false);
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
      if (el.data?.subject) { docTitle = el.data.subject; break; }
    }

    const authorName = currentUser?.name || currentUser?.displayName || currentUser?.username || "HR Officer";
    const authorEmail = currentUser?.email || "";
    const authorRole = currentUser?.role || "HR Administrator";
    const authorCompany = currentUser?.company || selectedCompany.name;
    const nowIso = new Date().toISOString();

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
      fontSize: toolbarFontSize,
      toolbarFontSize,
      paperElements: JSON.parse(JSON.stringify(paperElements)),
      savedBy: authorName,
      savedByEmail: authorEmail,
      savedByRole: authorRole,
      savedByCompany: authorCompany,
      savedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const updated = [docRecord, ...savedDocs.filter((d) => d.ref !== cleanRef && d.id !== docRecord.id)];
    setSavedDocs(updated);
    registerUsedDocRef(cleanRef);

    try {
      const res = await saveDocumentRecordToDb(currentUser, docRecord);
      if (res.syncedToSupabase) {
        triggerToast(`✓ Document '${cleanRef}' saved to Database! (Visible to all HR users)`, "success");
      } else {
        triggerToast(`✓ Saved '${cleanRef}' to shared HR records archive`, "info");
      }
    } catch (e) {
      console.error("Save document error:", e);
      triggerToast(`Saved to session cache: ${e.message}`, "info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSavedDocument = (d) => {
    if (!d) return;
    const cleanRef = normalizeDocRef(d.ref);

    const comp = resolveCompanyFromMemoRef(cleanRef, d, COMPANIES);
    setSelectedCompanyId(comp.id);
    if (cleanRef) setDocRef(cleanRef);
    if (d.date) setDocDate(d.date);
    if (d.paperSize) setPaperSize(d.paperSize);
    if (d.fontFamily) {
      setFontFamily(d.fontFamily);
      setToolbarFontFamily(d.fontFamily);
    }
    const savedToolbarFontSize = Number(d.toolbarFontSize);
    const savedLegacyFontSize = Number(d.fontSize);
    const restoredToolbarFontSize = Number.isFinite(savedToolbarFontSize) && savedToolbarFontSize > 0
      ? savedToolbarFontSize
      : Number.isFinite(savedLegacyFontSize) && savedLegacyFontSize > 0
        ? savedLegacyFontSize * (16 / 12)
        : 16;
    const clampedToolbarFontSize = Math.max(8, Math.min(36, restoredToolbarFontSize));
    setToolbarFontSize(clampedToolbarFontSize);

    let loadedElements = [];
    if (Array.isArray(d.paperElements) && d.paperElements.length > 0) {
      loadedElements = JSON.parse(JSON.stringify(d.paperElements));
    } else if (typeof d.content === "string" && d.content.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(d.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedElements = parsed;
        }
      } catch (e) {
        console.warn("Could not parse content as JSON:", e);
      }
    }

    if (loadedElements.length > 0) {
      setPaperElements(loadedElements);
    } else {
      handleLoadFullDocumentPreset(d.templateType || "non_affiliation");
    }

    setArchiveModalOpen(false);
    triggerToast(`✓ Loaded document '${cleanRef}' with ${comp.name} letterhead!`, "success");
  };

  const handleDeleteSavedDocument = async (id, refStr) => {
    if (!window.confirm(`Permanently delete document ${refStr} from records?`)) return;
    const filtered = savedDocs.filter((d) => d.id !== id);
    setSavedDocs(filtered);
    await deleteDocumentRecordFromDb(currentUser, id);
    triggerToast(`Deleted document ${refStr}`, "info");
  };

  const activeFont = useMemo(() => {
    return toolbarFontFamily || FONT_FAMILIES.find((f) => f.id === fontFamily)?.css || FONT_FAMILIES[0].css;
  }, [toolbarFontFamily, fontFamily]);
  const directPrintPageWidthIn = printOrientation === "landscape"
    ? effectivePageHeightIn
    : currentPaperDef.widthIn || "8.5in";
  const directPrintPageHeightIn = printOrientation === "landscape"
    ? currentPaperDef.widthIn || "8.5in"
    : effectivePageHeightIn;
  const directPrintPadding = getDocumentPagePadding(printMarginMode, reduceTopSpacingInPrint);

  const generatePrintHtml = (customOptions = {}) => {
    const printableElement = document.getElementById("coupon-bond-printable");
    if (!printableElement) {
      return "";
    }

    const marginMode = customOptions.marginMode || printMarginMode;
    const reduceTopSpacing = customOptions.reduceTopSpacing !== undefined
      ? customOptions.reduceTopSpacing
      : reduceTopSpacingInPrint;
    const colorMode = customOptions.colorMode || printColorMode;
    const includeLetterhead = customOptions.includeLetterhead !== undefined ? customOptions.includeLetterhead : includeLetterheadInPrint;
    const includeSignatures = customOptions.includeSignatures !== undefined ? customOptions.includeSignatures : includeSignaturesInPrint;
    const includeFooter = customOptions.includeFooter !== undefined ? customOptions.includeFooter : includeFooterInPrint;
    const includeWatermark = customOptions.includeWatermark !== undefined ? customOptions.includeWatermark : includeWatermarkInPrint;
    const orientation = customOptions.orientation || printOrientation || "portrait";
    const customScale = customOptions.scale !== undefined ? customOptions.scale : printCustomScale;

    const clone = printableElement.cloneNode(true);
    const sourceElements = [printableElement, ...printableElement.querySelectorAll("*")];
    const clonedElements = [clone, ...clone.querySelectorAll("*")];
    const viewerStyleProperties = [
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-indent",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left"
    ];
    sourceElements.forEach((sourceElement, index) => {
      if (index === 0 || !clonedElements[index]) return;
      const computedStyle = window.getComputedStyle(sourceElement);
      viewerStyleProperties.forEach((property) => {
        clonedElements[index].style.setProperty(
          property,
          computedStyle.getPropertyValue(property),
          "important"
        );
      });
    });

    clone.querySelectorAll(".no-print, .block-hover-controls, [role='tooltip'], button, .block-resize-handle, .glass-blue-inspector").forEach((el) => el.remove());
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("suppresscontenteditablewarning");
    });

    clone.querySelectorAll("[data-category]").forEach((el) => {
      el.classList.remove(
        "ring-2",
        "ring-blue-500",
        "ring-blue-500/90",
        "bg-blue-50/20",
        "border-2",
        "border-blue-400/80",
        "shadow-lg",
        "shadow-blue-500/15",
        "backdrop-blur-[0.5px]",
        "hover:ring-1",
        "hover:ring-blue-300/40"
      );
    });

    if (!includeLetterhead) {
      clone.querySelectorAll("[data-category='header']").forEach((el) => el.remove());
    }
    if (!includeSignatures) {
      clone.querySelectorAll("[data-category='signatory']").forEach((el) => el.remove());
    }
    if (!includeFooter) {
      clone.querySelectorAll("[data-category='footer']").forEach((el) => el.remove());
    }

    const wmSize = Math.round((340 * watermarkScale) / 100);
    const wmOpacity = (watermarkOpacity / 100).toFixed(2);

    const watermarkEl = clone.querySelector(".doc-watermark-layer, [class*='opacity-[0.03'], [class*='opacity-[0.04']");
    if (watermarkEl) {
      if (!includeWatermark || watermarkOpacity <= 0) {
        watermarkEl.remove();
      } else {
        watermarkEl.setAttribute(
          "style",
          `position: absolute !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: ${wmSize}px !important; height: ${wmSize}px !important; pointer-events: none !important; z-index: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: ${wmOpacity} !important; user-select: none !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important;`
        );
        const wmImg = watermarkEl.querySelector("img");
        if (wmImg) {
          wmImg.setAttribute(
            "style",
            `max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; filter: ${colorMode === "monochrome" ? "grayscale(100%)" : "grayscale(15%)"} !important; display: block !important; margin: 0 auto !important;`
          );
        }
      }
    }

    const currentPaper = customOptions.paperDef || currentPaperDef;
    const pageContentHeightPx = Math.max(currentPaper.heightPx, effectivePageHeightPx);
    const pageContentHeightIn = pageContentHeightPx > currentPaper.heightPx
      ? `${(pageContentHeightPx / 96).toFixed(3)}in`
      : currentPaper.heightIn || "11in";
    const pageWidthIn = orientation === "landscape"
      ? pageContentHeightIn
      : currentPaper.widthIn || "8.5in";
    const pageHeightIn = orientation === "landscape"
      ? currentPaper.widthIn || "8.5in"
      : pageContentHeightIn;
    const pagePaddingCss = getDocumentPagePadding(marginMode, reduceTopSpacing);
    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .filter((node) => {
        const text = node.textContent || "";
        return !text.includes("printing-agent-id-card");
      })
      .map((node) => node.outerHTML)
      .join("\n");

    const monoFilterCss = colorMode === "monochrome" ? "filter: grayscale(100%) contrast(105%) !important;" : "";

    const printHtml = String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
  <title>${docRef || "DOCUMENT"} - ${selectedCompany.name} (${currentPaper.label})</title>
  ${headStyles}
  <style>
    @page {
      size: ${pageWidthIn} ${pageHeightIn};
      margin: 0;
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
      min-height: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      overflow: visible !important;
      font-family: ${activeFont} !important;
      font-size: ${toolbarFontSize}px !important;
      line-height: ${docLineHeight || (contentDensity === "compact" ? 1.48 : 1.55)} !important;
      color: #0f172a !important;
    }
    .print-sheet {
      --doc-font-size: ${toolbarFontSize}px;
      --doc-font-family: ${activeFont};
      --doc-line-height: ${docLineHeight || (contentDensity === "compact" ? 1.48 : 1.55)};
      width: 100% !important;
      min-height: ${pageHeightIn} !important;
      height: ${pageHeightIn} !important;
      max-width: ${pageWidthIn} !important;
      zoom: ${(customScale || 100) / 100} !important;
      box-sizing: border-box !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      padding: ${pagePaddingCss} !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      font-family: ${activeFont} !important;
      font-size: ${toolbarFontSize}px !important;
      line-height: ${docLineHeight || (contentDensity === "compact" ? 1.48 : 1.55)} !important;
      overflow: visible !important;
      page-break-before: avoid !important;
      break-before: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      ${monoFilterCss}
    }
    .print-sheet [data-category="footer"],
    .print-sheet .footer-stick-bottom {
      margin-top: auto !important;
      break-inside: avoid !important;
    }
    @media print {
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      .print-sheet {
        width: ${pageWidthIn} !important;
        height: ${pageHeightIn} !important;
        min-height: ${pageHeightIn} !important;
        max-height: none !important;
        padding: ${pagePaddingCss} !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
      }
    }
    .doc-watermark-layer {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: ${wmSize}px !important;
      height: ${wmSize}px !important;
      pointer-events: none !important;
      z-index: 0 !important;
      display: ${watermarkOpacity > 0 ? "flex" : "none"} !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: ${wmOpacity} !important;
      user-select: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .doc-watermark-layer img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      filter: ${colorMode === "monochrome" ? "grayscale(100%)" : "grayscale(15%)"} !important;
      display: block !important;
      margin: 0 auto !important;
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
    .max-h-full { max-height: 100% !important; }
    .max-w-full { max-width: 100% !important; }
    .object-contain { object-fit: contain !important; }
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .items-end { align-items: flex-end !important; }
    .items-baseline { align-items: baseline !important; }
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
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .w-14 { width: 3.5rem !important; min-width: 3.5rem !important; }
    .h-14 { height: 3.5rem !important; min-height: 3.5rem !important; }
    .w-16 { width: 4rem !important; min-width: 4rem !important; }
    .h-16 { height: 4rem !important; min-height: 4rem !important; }
    .w-18 { width: 4.5rem !important; min-width: 4.5rem !important; }
    .h-18 { height: 4.5rem !important; min-height: 4.5rem !important; }
    .w-20, [class*="w-20"] { width: 5.5rem !important; min-width: 5.5rem !important; display: inline-block !important; flex-shrink: 0 !important; }
    .h-20 { height: 5rem !important; min-height: 5rem !important; }
    .w-24, [class*="w-24"] { width: 6.5rem !important; min-width: 6.5rem !important; display: inline-block !important; flex-shrink: 0 !important; }
    .h-24 { height: 6rem !important; min-height: 6rem !important; }
    .w-28 { width: 7rem !important; min-width: 7rem !important; }
    .h-28 { height: 7rem !important; min-height: 7rem !important; }
    .w-52 { width: 13rem !important; }
    .w-56 { width: 14rem !important; }
    .w-60 { width: 15rem !important; }
    .w-full { width: 100% !important; }
    .h-full { height: 100% !important; }
    .p-1 { padding: 0.25rem !important; }
    .p-1\.5 { padding: 0.375rem !important; }
    .p-2 { padding: 0.5rem !important; }
    .p-2\.5 { padding: 0.625rem !important; }
    .p-3 { padding: 0.75rem !important; }
    .p-4 { padding: 1rem !important; }
    .px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
    .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
    .px-2\.5 { padding-left: 0.625rem !important; padding-right: 0.625rem !important; }
    .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
    .py-0\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
    .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
    .py-1\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
    .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
    .pt-1 { padding-top: 0.25rem !important; }
    .pt-2 { padding-top: 0.5rem !important; }
    .pt-3 { padding-top: 0.75rem !important; }
    .pt-4 { padding-top: 1rem !important; }
    .pt-5 { padding-top: 1.25rem !important; }
    .pt-6 { padding-top: 1.5rem !important; }
    .pt-8 { padding-top: 2rem !important; }
    .pb-1 { padding-bottom: 0.25rem !important; }
    .pb-1\.5 { padding-bottom: 0.375rem !important; }
    .pb-2 { padding-bottom: 0.5rem !important; }
    .pb-3 { padding-bottom: 0.75rem !important; }
    .pb-4 { padding-bottom: 1rem !important; }
    .pl-3 { padding-left: 0.75rem !important; }
    .pl-6 { padding-left: 1.5rem !important; }
    .my-2 { margin-top: 0.5rem !important; margin-bottom: 0.5rem !important; }
    .my-2\.5 { margin-top: 0.625rem !important; margin-bottom: 0.625rem !important; }
    .my-3 { margin-top: 0.75rem !important; margin-bottom: 0.75rem !important; }
    .my-4 { margin-top: 1rem !important; margin-bottom: 1rem !important; }
    .my-6 { margin-top: 1.5rem !important; margin-bottom: 1.5rem !important; }
    .mt-0\.5 { margin-top: 0.125rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .mt-3 { margin-top: 0.75rem !important; }
    .mt-4 { margin-top: 1rem !important; }
    .mt-6 { margin-top: 1.5rem !important; }
    .mt-auto { margin-top: auto !important; }
    .mb-1 { margin-bottom: 0.25rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mb-2\.5 { margin-bottom: 0.625rem !important; }
    .mb-3 { margin-bottom: 0.75rem !important; }
    .mb-3\.5 { margin-bottom: 0.875rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .mb-5 { margin-bottom: 1.25rem !important; }
    .mb-6 { margin-bottom: 1.5rem !important; }
    .mb-8 { margin-bottom: 2rem !important; }
    .gap-1 { gap: 0.25rem !important; }
    .gap-1\.5 { gap: 0.375rem !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-2\.5 { gap: 0.625rem !important; }
    .gap-3 { gap: 0.75rem !important; }
    .gap-4 { gap: 1rem !important; }
    .gap-6 { gap: 1.5rem !important; }
    .gap-8 { gap: 2rem !important; }
    .space-y-1 > * + * { margin-top: 0.25rem !important; }
    .space-y-1\.5 > * + * { margin-top: 0.375rem !important; }
    .space-y-2 > * + * { margin-top: 0.5rem !important; }
    .space-y-2\.5 > * + * { margin-top: 0.625rem !important; }
    .space-y-3 > * + * { margin-top: 0.75rem !important; }
    .space-y-3\.5 > * + * { margin-top: 0.875rem !important; }
    .space-y-4 > * + * { margin-top: 1rem !important; }
    .space-y-6 > * + * { margin-top: 1.5rem !important; }
    .text-\[10px\] { font-size: 10px !important; }
    .text-\[10\.5px\] { font-size: 10.5px !important; }
    .text-\[11px\] { font-size: 11px !important; }
    .text-xs { font-size: 0.75rem !important; }
    .text-sm { font-size: 0.875rem !important; }
    .text-base { font-size: 1rem !important; }
    .text-lg { font-size: 1.125rem !important; }
    .text-xl { font-size: 1.25rem !important; }
    .text-slate-400 { color: #94a3b8 !important; }
    .text-slate-500 { color: #64748b !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-900 { color: #0f172a !important; }
    .text-slate-950 { color: #020617 !important; }
    .text-emerald-800 { color: #065f46 !important; }
    .text-emerald-700 { color: #047857 !important; }
    .text-emerald-600 { color: #059669 !important; }
    .text-amber-700 { color: #b45309 !important; }
    .text-amber-800 { color: #92400e !important; }
    .text-amber-950 { color: #451a03 !important; }
    .tracking-wide { letter-spacing: 0.025em !important; }
    .tracking-wider { letter-spacing: 0.05em !important; }
    .tracking-widest { letter-spacing: 0.1em !important; }
    .tracking-tight { letter-spacing: -0.025em !important; }
    .indent-2 { text-indent: 0.5rem !important; }
    .indent-4 { text-indent: 1rem !important; }
    .indent-6 { text-indent: 1.5rem !important; }
    .indent-8 { text-indent: 2rem !important; }
    .indent-10 { text-indent: 2.5rem !important; }
    .indent-12 { text-indent: 3rem !important; }
    .whitespace-pre-line { white-space: pre-line !important; }
    .whitespace-pre-wrap { white-space: pre-wrap !important; }
    .inline-block { display: inline-block !important; }
    .block { display: block !important; }
    blockquote { margin: 0.5rem 0 0.5rem 2rem !important; padding: 0 !important; border: none !important; }
    .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
    .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
    .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
    .border-t-2 { border-top-width: 2px !important; border-top-style: solid !important; }
    .border-emerald-700 { border-color: #047857 !important; }
    .border-slate-900, .border-slate-800, .border-black { border-color: #0f172a !important; }
    .border-slate-300, .border-slate-200 { border-color: #cbd5e1 !important; }
    .leading-tight { line-height: 1.2 !important; }
    .leading-snug { line-height: 1.35 !important; }
    .leading-relaxed { line-height: 1.45 !important; }
    .no-print, .block-hover-controls, [role="tooltip"], button, .block-resize-handle, .glass-blue-inspector {
      display: none !important;
      visibility: hidden !important;
    }
  </style>
</head>
<body>
  <div class="print-sheet" id="print-sheet-root">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    return printHtml;
  };

  const updatePrintModalPreview = (opts = {}) => {
    try {
      const html = generatePrintHtml(opts);
      if (html) setPrintModalPreviewHtml(html);
    } catch (e) {
      console.warn("Print preview generation error:", e);
    }
  };

  const updatePrintModalPreviewRef = useRef(null);
  useEffect(() => {
    updatePrintModalPreviewRef.current = updatePrintModalPreview;
  });

  useEffect(() => {
    if (isPrintConfigOpen) {
      const timer = setTimeout(() => {
        const updatePreview = updatePrintModalPreviewRef.current;
        if (updatePreview) updatePreview();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    isPrintConfigOpen,
    paperSize,
    selectedPaper,
    printMarginMode,
    reduceTopSpacingInPrint,
    printColorMode,
    includeLetterheadInPrint,
    includeSignaturesInPrint,
    includeFooterInPrint,
    includeWatermarkInPrint,
    docLineHeight,
    printOrientation,
    printCustomScale,
    paperElements,
    effectivePageHeightPx
  ]);

  const handlePrintDocument = (customOptions = {}) => {
    const printableElement = document.getElementById("coupon-bond-printable");
    if (!printableElement) {
      window.print();
      return;
    }

    if (paperElements.length === 0) {
      triggerToast("Please add elements onto the coupon bond paper before printing.", "error");
      return;
    }

    const currentPaper = customOptions.paperDef || currentPaperDef;
    const orientation = customOptions.orientation || printOrientation;
    const contentHeightIn = effectivePageHeightPx > currentPaper.heightPx
      ? `${(effectivePageHeightPx / 96).toFixed(3)}in`
      : currentPaper.heightIn || "11in";
    const pageWidthIn = orientation === "landscape"
      ? contentHeightIn
      : currentPaper.widthIn || "8.5in";
    const pageHeightIn = orientation === "landscape"
      ? currentPaper.widthIn || "8.5in"
      : contentHeightIn;
    const printHtml = generatePrintHtml(customOptions);
    if (!printHtml) {
      window.print();
      return;
    }

    let printFrame = document.getElementById("doc-studio-print-frame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "doc-studio-print-frame";
      printFrame.style.position = "fixed";
      printFrame.style.top = "0";
      printFrame.style.left = "-99999px";
      printFrame.style.width = pageWidthIn;
      printFrame.style.height = pageHeightIn;
      printFrame.style.opacity = "0.01";
      printFrame.style.pointerEvents = "none";
      printFrame.style.border = "none";
      printFrame.style.zIndex = "-9999";
      document.body.appendChild(printFrame);
    } else {
      printFrame.style.width = pageWidthIn;
      printFrame.style.height = pageHeightIn;
    }

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    const executeSeamlessPrint = () => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.warn("Direct iframe print error, fallback to window.print", err);
        window.print();
      }
    };

    const frameImages = Array.from(frameDoc.images || []);
    if (frameImages.length === 0) {
      setTimeout(executeSeamlessPrint, 150);
    } else {
      let loadedCount = 0;
      let hasTriggered = false;
      const onImageFinished = () => {
        loadedCount++;
        if (loadedCount >= frameImages.length && !hasTriggered) {
          hasTriggered = true;
          setTimeout(executeSeamlessPrint, 120);
        }
      };
      frameImages.forEach((img) => {
        if (img.complete) {
          onImageFinished();
        } else {
          img.onload = onImageFinished;
          img.onerror = onImageFinished;
        }
      });
      setTimeout(() => {
        if (!hasTriggered) {
          hasTriggered = true;
          executeSeamlessPrint();
        }
      }, 500);
    }
  };

  const handleCopyDocumentImage = async (customOptions = {}) => {
    const printableElement = document.getElementById("coupon-bond-printable");
    if (!printableElement) {
      triggerToast("Document preview element not found.", "error");
      return;
    }
    if (paperElements.length === 0) {
      triggerToast("Please add elements onto the coupon bond paper before copying.", "error");
      return;
    }

    setIsCopyingImage(true);
    const originalTransform = printableElement.style.transform;
    const originalTransition = printableElement.style.transition;
    const originalFilter = printableElement.style.filter;

    const colorMode = customOptions.colorMode || printColorMode;
    const includeLetterhead = customOptions.includeLetterhead !== undefined ? customOptions.includeLetterhead : includeLetterheadInPrint;
    const includeFooter = customOptions.includeFooter !== undefined ? customOptions.includeFooter : includeFooterInPrint;
    const includeWatermark = customOptions.includeWatermark !== undefined ? customOptions.includeWatermark : includeWatermarkInPrint;

    const tempHidden = [];
    if (!includeLetterhead) {
      printableElement.querySelectorAll("[data-category='header']").forEach((el) => {
        el.style.display = "none";
        tempHidden.push(el);
      });
    }
    if (!includeFooter) {
      printableElement.querySelectorAll("[data-category='footer']").forEach((el) => {
        el.style.display = "none";
        tempHidden.push(el);
      });
    }
    if (!includeWatermark) {
      const wm = printableElement.querySelector(".doc-watermark-layer");
      if (wm) {
        wm.style.display = "none";
        tempHidden.push(wm);
      }
    }

    try {
      printableElement.style.transform = "none";
      printableElement.style.transition = "none";
      if (colorMode === "monochrome") {
        printableElement.style.filter = "grayscale(100%) contrast(105%)";
      }

      const dataUrl = await toPng(printableElement, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: (node) => {
          if (
            node.classList &&
            (node.classList.contains("no-print") ||
              node.classList.contains("block-hover-controls") ||
              node.classList.contains("glass-blue-inspector") ||
              node.classList.contains("block-resize-handle") ||
              node.getAttribute?.("role") === "tooltip")
          ) {
            return false;
          }
          if (node.tagName === "BUTTON") {
            return false;
          }
          return true;
        }
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        triggerToast("✓ Document image copied to clipboard! Ready to paste (Ctrl+V) into Word, chat, or email.", "success");
      } else {
        const cleanDocRef = (docRef || "DOCUMENT").replace(/[^a-zA-Z0-9_-]/g, "_");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${cleanDocRef}.png`;
        a.click();
        triggerToast("✓ Document image downloaded as high-res PNG file!", "success");
      }
    } catch (err) {
      console.error("Copy image error:", err);
      try {
        const dataUrl = await toPng(printableElement, { pixelRatio: 2, backgroundColor: "#ffffff" });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${(docRef || "DOCUMENT").replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
        a.click();
        triggerToast("✓ Image downloaded as PNG (clipboard access was restricted).", "info");
      } catch {
        triggerToast("Failed to copy image. Please try again.", "error");
      }
    } finally {
      printableElement.style.transform = originalTransform;
      printableElement.style.transition = originalTransition;
      printableElement.style.filter = originalFilter;
      tempHidden.forEach((el) => {
        el.style.display = "";
      });
      setIsCopyingImage(false);
    }
  };

  const handleDownloadPdf = async (customOptions = {}) => {
    const printableElement = document.getElementById("coupon-bond-printable");
    if (!printableElement) {
      triggerToast("Document preview element not found.", "error");
      return;
    }
    if (paperElements.length === 0) {
      triggerToast("Please add elements onto the coupon bond paper before downloading.", "error");
      return;
    }

    setIsExportingPdf(true);
    let printFrame = null;
    try {
      const paperDef = customOptions.paperDef || currentPaperDef;
      const orientation = customOptions.orientation || printOrientation;
      const pageHeightPx = Math.max(paperDef.heightPx, effectivePageHeightPx);
      const contentHeightIn = pageHeightPx > paperDef.heightPx
        ? `${(pageHeightPx / 96).toFixed(3)}in`
        : paperDef.heightIn || "11in";
      const pageWidthIn = orientation === "landscape"
        ? contentHeightIn
        : paperDef.widthIn || "8.5in";
      const pageHeightIn = orientation === "landscape"
        ? paperDef.widthIn || "8.5in"
        : contentHeightIn;
      const printHtml = generatePrintHtml(customOptions);
      if (!printHtml) {
        throw new Error("Could not create the configured document print layout.");
      }

      printFrame = document.createElement("iframe");
      printFrame.title = "Configured document PDF render";
      printFrame.style.position = "fixed";
      printFrame.style.left = "-10000px";
      printFrame.style.top = "0";
      printFrame.style.width = pageWidthIn;
      printFrame.style.height = pageHeightIn;
      printFrame.style.border = "0";
      printFrame.style.pointerEvents = "none";

      const frameLoaded = new Promise((resolve, reject) => {
        printFrame.addEventListener("load", resolve, { once: true });
        printFrame.addEventListener("error", () => reject(new Error("Could not load the configured document print layout.")), { once: true });
      });
      printFrame.srcdoc = printHtml;
      document.body.appendChild(printFrame);
      await frameLoaded;

      const frameDocument = printFrame.contentDocument;
      const printSheet = frameDocument?.querySelector(".print-sheet");
      if (!frameDocument || !printSheet) {
        throw new Error("The configured document print layout did not render.");
      }
      await frameDocument.fonts.ready;
      await Promise.all(Array.from(frameDocument.images, (image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }));

      const dataUrl = await toPng(printSheet, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff"
      });
      const unitToIn = (value) => {
        const match = String(value).match(/^([\d.]+)\s*(mm|cm|px|in)?$/i);
        if (!match) return NaN;
        const amount = Number(match[1]);
        switch ((match[2] || "in").toLowerCase()) {
          case "mm": return amount / 25.4;
          case "cm": return amount / 2.54;
          case "px": return amount / 96;
          default: return amount;
        }
      };
      const pdfWidthIn = unitToIn(pageWidthIn);
      const pdfHeightIn = unitToIn(pageHeightIn);
      if (!Number.isFinite(pdfWidthIn) || !Number.isFinite(pdfHeightIn)) {
        throw new Error(`Unsupported PDF page dimensions: ${pageWidthIn} × ${pageHeightIn}`);
      }
      const pdf = new jsPDF({
        orientation: orientation === "landscape" ? "landscape" : "portrait",
        unit: "in",
        format: [pdfWidthIn, pdfHeightIn]
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidthIn, pdfHeightIn, undefined, "FAST");
      const cleanDocRef = (docRef || "DOCUMENT").replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanCompany = (selectedCompany?.name || "HR").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${cleanDocRef}_${cleanCompany}.pdf`;
      pdf.save(filename);
      triggerToast(`✓ PDF successfully exported: ${filename}`, "success");
      setIsPrintConfigOpen(false);
    } catch (err) {
      console.error("PDF export error:", err);
      triggerToast("Failed to generate PDF. Print -> Save as PDF is also available.", "error");
    } finally {
      printFrame?.remove();
      setIsExportingPdf(false);
    }
  };

  return (
    <div id="document-studio-panel" className="relative h-screen max-h-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none antialiased">
      <style>{`
        @media print {
          @page {
            size: ${directPrintPageWidthIn} ${directPrintPageHeightIn};
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, nav, .no-print, .block-hover-controls, [role="tooltip"], button {
            display: none !important;
            visibility: hidden !important;
          }
          #root,
          #root > div,
          #document-studio-panel,
          #document-studio-workspace,
          #document-studio-workspace > main {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
          }
          #document-studio-panel,
          #document-studio-workspace {
            position: relative !important;
          }
          #coupon-bond-printable {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: ${directPrintPageWidthIn} !important;
            max-width: ${directPrintPageWidthIn} !important;
            height: ${directPrintPageHeightIn} !important;
            min-height: ${directPrintPageHeightIn} !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: ${directPrintPadding} !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .doc-palette-scroll {
            scrollbar-width: thin;
            scrollbar-color: #f59e0b #f1f5f9;
            overscroll-behavior: contain;
          }
          .doc-palette-scroll::-webkit-scrollbar {
            width: 7px;
          }
          .doc-palette-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 9999px;
          }
          .doc-palette-scroll::-webkit-scrollbar-thumb {
            background: #f59e0b;
            border-radius: 9999px;
          }
          .doc-palette-scroll::-webkit-scrollbar-thumb:hover {
            background: #d97706;
          }
        }
        #coupon-bond-printable {
          --doc-font-size: ${toolbarFontSize}px;
          --doc-font-family: ${activeFont};
          --doc-line-height: ${contentDensity === "ultra" ? 1.32 : contentDensity === "compact" ? 1.42 : 1.55};
          --doc-gap: ${contentDensity === "ultra" ? "6px" : contentDensity === "compact" ? "10px" : "14px"};
        }
        #coupon-bond-printable [data-category="body"],
        #coupon-bond-printable [data-category="body"] p,
        #coupon-bond-printable [data-category="body"] span:not([class*="badge"]),
        #coupon-bond-printable [data-category="body"] div,
        #coupon-bond-printable [data-category="body"] li,
        #coupon-bond-printable [data-category="body"] [contenteditable="true"] {
          font-size: var(--doc-font-size, 16px) !important;
          font-family: var(--doc-font-family, inherit) !important;
          line-height: var(--doc-line-height, 1.55) !important;
        }
        #coupon-bond-printable [data-category="addressing"] [contenteditable="true"],
        #coupon-bond-printable [data-category="signatory"] [contenteditable="true"],
        #coupon-bond-printable [data-category="footer"] [contenteditable="true"] {
          font-family: var(--doc-font-family, inherit) !important;
        }
      `}</style>

      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
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

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Entity:</span>
          {companies.map((comp) => {
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearPaper}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-300 transition cursor-pointer"
            title="Clear all elements to blank bond paper"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Blank</span>
          </button>

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

          <button
            type="button"
            onClick={() => setIsPrintConfigOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 active:scale-95 shadow-2xs transition cursor-pointer"
            title="Configure Print Margins, Ink Mode, Watermark, and Paper Size"
          >
            <Settings2 size={14} className="text-slate-600" />
            <span className="hidden sm:inline">Print Setup</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyDocumentImage()}
            disabled={isCopyingImage}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-xs transition cursor-pointer disabled:opacity-60"
            title="Copy 1:1 High-Resolution Document Image to Clipboard (Ctrl+V into Word, chat, email)"
          >
            {isCopyingImage ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
            <span>Copy Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updatePrintModalPreview();
              setIsPrintConfigOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-95 shadow-xs transition cursor-pointer"
            title="Open Print Configuration &amp; Live Preview (Epson L120 / Printer / PDF)"
          >
            <Printer size={14} />
            <span>Print Document</span>
          </button>

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

      {isPaletteDrawerOpen && hoveredPreview?.item && (() => {
        const previewWidth = 580;
        const targetX = hoveredPreview.x ?? 900;
        const targetY = hoveredPreview.y ?? 200;

        const leftPos = Math.max(16, targetX - previewWidth - 20);
        const topPos = Math.max(16, Math.min(window.innerHeight - 560, targetY - 120));

        return (
          <div
            style={{
              left: `${leftPos}px`,
              top: `${topPos}px`,
              width: `${previewWidth}px`,
            }}
            className="no-print fixed z-[60] bg-white rounded-2xl border-2 border-amber-400 shadow-2xl p-4.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none max-w-[calc(100vw-450px)]"
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

      <div id="document-studio-workspace" className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        <main
          id="document-studio-canvas"
          className={`flex-1 h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-slate-200/70 transition-all duration-300 ${
            isPaletteDrawerOpen
              ? paletteDrawerWidth === "compact"
                ? "xl:pr-[430px]"
                : "xl:pr-[530px]"
              : ""
          }`}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {!isTopToolbarVisible && (
            <button
              type="button"
              onClick={() => setIsTopToolbarVisible(true)}
              className="no-print fixed left-1/2 top-0 z-[70] flex h-3 w-20 -translate-x-1/2 items-center justify-center rounded-b-lg border border-t-0 border-slate-300 bg-white/95 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Show formatting toolbar"
              aria-label="Show formatting toolbar"
            >
              <span className="h-1 w-8 rounded-full bg-current" />
            </button>
          )}
          <div
            ref={topToolbarRef}
            className="no-print fixed left-1/2 top-2 w-[calc(100%-1rem)] max-w-4xl doc-toolbar-container bg-white border border-slate-200 shadow-sm rounded-2xl p-2.5 sm:p-3 select-none z-[60] will-change-transform"
            style={{
              transform: `translate(-50%, ${isTopToolbarVisible ? "0" : "calc(-100% - 14px)"})`,
              opacity: isTopToolbarVisible ? 1 : 0,
              visibility: isTopToolbarVisible ? "visible" : "hidden",
              transition: `transform 300ms ease-in-out, opacity 300ms ease-in-out, visibility ${isTopToolbarVisible ? "0ms" : "300ms"} linear`,
              pointerEvents: isTopToolbarVisible ? "auto" : "none",
              maxHeight: "calc(100vh - 1rem)",
              overflowY: "auto"
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTopToolbarTab("formatting")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    activeTopToolbarTab === "formatting"
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <CaseUpper size={14} className={activeTopToolbarTab === "formatting" ? "text-amber-600" : "text-slate-400"} />
                  <span>Text &amp; Formatting</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTopToolbarTab("page_setup")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    activeTopToolbarTab === "page_setup"
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Scissors size={14} className={activeTopToolbarTab === "page_setup" ? "text-amber-600" : "text-slate-400"} />
                  <span>Paper Size &amp; Page Setup</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  Paper: <span className="text-amber-700 font-extrabold ml-1">{currentPaperDef.label.split(" ")[0]}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  Elements: <span className="text-amber-700 font-extrabold ml-1">{paperElements.length}</span>
                </span>
              </div>
            </div>

            {activeTopToolbarTab === "formatting" ? (
              <div className="space-y-2">
                {/* Row 1: Undo/Redo, Font, Size, Bold/Italic/Underline/Strikethrough, Highlight, Color */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleUndo}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRedo}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                >
                  <Redo2 size={14} />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                <Type size={13} className="text-slate-500 shrink-0" />
                <select
                  value={toolbarFontFamily}
                  onChange={(e) => handleSetToolbarFontFamily(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[150px] truncate"
                  title="Change Directives Font Style / Family"
                >
                  {DIRECTIVE_FONT_FAMILIES.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleStepFontSize(-1)}
                  className="px-1.5 py-0.5 rounded text-[11px] font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Decrease Font Size (A-)"
                >
                  A-
                </button>
                <select
                  value={selectedFontSizeValue}
                  onChange={(e) => handleSetToolbarFontSize(Number(e.target.value))}
                  className="text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer px-1 text-center"
                  title="Set Exact Font Size"
                >
                  {DOCUMENT_FONT_SIZES.map((sz) => (
                    <option key={sz.value} value={sz.value}>
                      {sz.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleStepFontSize(1)}
                  className="px-1.5 py-0.5 rounded text-[11px] font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Increase Font Size (A+)"
                >
                  A+
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("bold")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={14} className="stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("italic")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 italic transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("underline")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 underline transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("strikeThrough")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 line-through transition flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Strikethrough"
                >
                  <Strikethrough size={14} />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setHighlightMenuOpen(!highlightMenuOpen);
                    setShapesMenuOpen(false);
                    setColorMenuOpen(false);
                    setClausesMenuOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    highlightMenuOpen ? "bg-amber-100 border-amber-300 text-amber-950" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                  }`}
                  title="Highlight Text with Color"
                >
                  <Highlighter size={14} className="text-amber-500" />
                  <span className="text-[11px] hidden sm:inline">Highlight</span>
                </button>

                {highlightMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
                    <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Highlight Colors</div>
                    {[
                      { label: "Yellow Highlight", color: "#fef08a", bg: "bg-yellow-300 border-yellow-400" },
                      { label: "Green Highlight", color: "#bbf7d0", bg: "bg-emerald-300 border-emerald-400" },
                      { label: "Cyan Highlight", color: "#bae6fd", bg: "bg-sky-300 border-sky-400" },
                      { label: "Pink Highlight", color: "#fbcfe8", bg: "bg-pink-300 border-pink-400" }
                    ].map((h) => (
                      <button
                        key={h.color}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          executeCommand("hiliteColor", h.color);
                          setHighlightMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border ${h.bg}`} />
                        <span>{h.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setColorMenuOpen(!colorMenuOpen);
                    setShapesMenuOpen(false);
                    setHighlightMenuOpen(false);
                    setClausesMenuOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    colorMenuOpen ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                  }`}
                  title="Text Color"
                >
                  <Palette size={14} className="text-rose-600" />
                  <span className="text-[11px] hidden sm:inline">Color</span>
                </button>

                {colorMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
                    <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Text Color</div>
                    {[
                      { label: "Red Alert", color: "#dc2626", dot: "bg-red-600" },
                      { label: "Emerald Green", color: "#059669", dot: "bg-emerald-600" },
                      { label: "Navy Blue", color: "#1e40af", dot: "bg-blue-800" },
                      { label: "Dark Slate", color: "#0f172a", dot: "bg-slate-900" }
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          executeCommand("foreColor", c.color);
                          setColorMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
                      >
                        <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand("removeFormat")}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition flex items-center justify-center cursor-pointer shadow-2xs"
                title="Clear Formatting (Remove Font Styles, Colors, Highlights)"
              >
                <Eraser size={14} />
              </button>
            </div>

            {/* Row 2: Alignment, Indentation, Line Spacing, Lists, Paragraph Insertion, Badges & Directives */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
              {/* MS Word Alignment Controls */}
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAlign("left")}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Align Left (Ctrl+L)"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAlign("center")}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Align Center (Ctrl+E)"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAlign("right")}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Align Right (Ctrl+R)"
                >
                  <AlignRight size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAlign("justify")}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Justify (Ctrl+J)"
                >
                  <AlignJustify size={14} />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              {/* MS Word Indentation Controls */}
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleDecreaseIndent}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Decrease Indent (Shift+Tab / Outdent)"
                >
                  <Outdent size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleIncreaseIndent}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition cursor-pointer"
                  title="Increase Indent (Indent Paragraph)"
                >
                  <Indent size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;")}
                  className="px-2 py-1 rounded hover:bg-slate-100 text-slate-800 font-bold text-[10px] transition cursor-pointer uppercase tracking-wider"
                  title="Insert 4-Space Tab"
                >
                  Tab
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              {/* Line Spacing Selector */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                <Sliders size={12} className="text-slate-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Spacing:</span>
                <select
                  value={docLineHeight}
                  onChange={(e) => handleSetLineHeight(e.target.value)}
                  className="text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  title="Document Line Height / Spacing"
                >
                  <option value="1.15">1.15 (Tight)</option>
                  <option value="1.25">1.25 (Compact)</option>
                  <option value="1.40">1.40 (Office)</option>
                  <option value="1.55">1.55 (Standard)</option>
                  <option value="1.80">1.80 (Relaxed)</option>
                  <option value="2.0">2.0 (Double)</option>
                </select>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              {/* Lists */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("insertOrderedList")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-850 hover:border-emerald-300 text-slate-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Numbered List (1. 2. 3.)"
                >
                  <ListOrdered size={14} className="text-emerald-600" />
                  <span className="text-[11px] hidden sm:inline">Numbers</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => executeCommand("insertUnorderedList")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-850 hover:border-emerald-300 text-slate-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Bullet List (• • •)"
                >
                  <List size={14} className="text-emerald-600" />
                  <span className="text-[11px] hidden sm:inline">Bullets</span>
                </button>
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              {/* Quick Insert Paragraph */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleInsertParagraph}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Insert New Editable Directive / Paragraph at Cursor"
              >
                <Plus size={13} className="text-amber-700" />
                <span className="text-[11px]">+ Paragraph</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertHtmlAtCursor('<h4 style="font-weight: 900; text-transform: uppercase; font-size: 1.15em; margin: 14px 0 6px 0; border-bottom: 2px solid #0f172a; padding-bottom: 2px;">SECTION TITLE</h4><p><br></p>')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-2xs"
                title="Section Heading Banner"
              >
                <Heading size={14} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertHtmlAtCursor('<hr style="border: none; border-top: 1.5px solid #cbd5e1; margin: 14px 0;"><p><br></p>')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-2xs"
                title="Divider Line (<hr>)"
              >
                <Minus size={14} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={transformSelectedToUppercase}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-black text-xs transition flex items-center justify-center cursor-pointer shadow-2xs"
                title="Convert Selected Text to UPPERCASE"
              >
                <CaseUpper size={13} className="mr-0.5" />
                <span className="text-[10px]">AA</span>
              </button>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShapesMenuOpen(!shapesMenuOpen);
                    setHighlightMenuOpen(false);
                    setColorMenuOpen(false);
                    setClausesMenuOpen(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    shapesMenuOpen ? "bg-indigo-100 border-indigo-300 text-indigo-950" : "bg-white border-slate-200 hover:bg-slate-100 text-indigo-800"
                  }`}
                  title="Shapes, Official Badges & Callout Shape Boxes"
                >
                  <Shapes size={14} className="text-indigo-600" />
                  <span className="text-[11px]">Shapes &amp; Badges</span>
                </button>

                {shapesMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-76 sm:w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in duration-100 max-h-[460px] overflow-y-auto">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Geometric Shapes &amp; Bullet Symbols
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { shape: "■ ", label: "Square" },
                          { shape: "● ", label: "Circle" },
                          { shape: "◆ ", label: "Diamond" },
                          { shape: "▲ ", label: "Triangle" },
                          { shape: "★ ", label: "Star" },
                          { shape: "✔ ", label: "Check" },
                          { shape: "➔ ", label: "Arrow" },
                          { shape: "❖ ", label: "Ornate" }
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              insertHtmlAtCursor(`<span>${item.shape}</span>`);
                              setShapesMenuOpen(false);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            title={`Insert ${item.label}`}
                          >
                            <span className="text-sm font-black text-indigo-600">{item.shape.trim()}</span>
                            <span className="text-[10px] text-slate-600">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Official Compliance Shape Badges
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { text: "MANDATORY COMPLIANCE", color: "#fee2e2", textColor: "#991b1b", border: "#f87171", label: "Red Badge" },
                          { text: "CONFIDENTIAL", color: "#fef3c7", textColor: "#92400e", border: "#fcd34d", label: "Amber Badge" },
                          { text: "FOR IMMEDIATE COMPLIANCE", color: "#dbeafe", textColor: "#1e40af", border: "#93c5fd", label: "Blue Badge" },
                          { text: "OFFICIALLY APPROVED", color: "#d1fae5", textColor: "#065f46", border: "#6ee7b7", label: "Green Badge" }
                        ].map((b) => (
                          <button
                            key={b.text}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              insertHtmlAtCursor(`&nbsp;<span style="display: inline-block; background-color: ${b.color}; color: ${b.textColor}; border: 1px solid ${b.border}; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${b.text}</span>&nbsp;`);
                              setShapesMenuOpen(false);
                            }}
                            className="w-full text-left p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                          >
                            <span
                              style={{ backgroundColor: b.color, color: b.textColor, borderColor: b.border }}
                              className="text-[10px] font-black uppercase px-2 py-0.5 rounded border"
                            >
                              {b.text}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Structured Directive Shape Boxes
                      </div>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            insertHtmlAtCursor('<div style="border-left: 4px solid #059669; background-color: #f0fdf4; padding: 8px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; font-weight: 500;"><b>📌 DIRECTIVE:</b> Insert specific operational instructions or guidelines here.</div><p><br></p>');
                            setShapesMenuOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg border-l-4 border-l-emerald-600 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition text-[11px] font-semibold text-emerald-950 cursor-pointer"
                        >
                          <b>📌 Green Directive Box</b>
                          <div className="text-[10px] text-emerald-700 font-normal">Highlighted operational directive card</div>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            insertHtmlAtCursor('<div style="border-left: 4px solid #dc2626; background-color: #fef2f2; padding: 8px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; font-weight: 500;"><b>⚠️ SANCTION NOTICE:</b> Failure to strictly observe these directives shall be dealt with under company rules.</div><p><br></p>');
                            setShapesMenuOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg border-l-4 border-l-red-600 bg-red-50 hover:bg-red-100/70 border border-red-200 transition text-[11px] font-semibold text-red-950 cursor-pointer"
                        >
                          <b>⚠️ Red Sanction Box</b>
                          <div className="text-[10px] text-red-700 font-normal">Disciplinary penalty notice box</div>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            insertHtmlAtCursor('<div style="border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 10px 14px; margin: 8px 0; border-radius: 6px; font-weight: 500;"><b>📋 POLICY STATEMENT:</b> All personnel are required to uphold standard corporate protocols.</div><p><br></p>');
                            setShapesMenuOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition text-[11px] font-semibold text-slate-900 cursor-pointer"
                        >
                          <b>📋 Framed Policy Box</b>
                          <div className="text-[10px] text-slate-500 font-normal">Enclosed formal policy statement</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-5 w-px bg-slate-300 mx-0.5" />

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setClausesMenuOpen(!clausesMenuOpen);
                    setShapesMenuOpen(false);
                    setHighlightMenuOpen(false);
                    setColorMenuOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    clausesMenuOpen ? "bg-emerald-100 border-emerald-300 text-emerald-950" : "bg-white border-slate-200 hover:bg-slate-100 text-emerald-800"
                  }`}
                  title="Insert Standard HR Policy Directives"
                >
                  <Bookmark size={13} className="text-emerald-600" />
                  <span className="text-[11px] hidden sm:inline">HR Clauses</span>
                </button>

                {clausesMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
                    <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Standard HR Directives</div>
                    {[
                      "Strict compliance is hereby mandated for all concerned officers and personnel.",
                      "This memorandum shall take effect immediately upon issuance and official transmission.",
                      "Failure to comply with the guidelines stipulated herein shall warrant corresponding disciplinary penalties pursuant to company rules and regulations.",
                      "For strict implementation and immediate observance by all concerned.",
                      "Any unauthorized deviations or violations shall be subject to administrative sanctions under existing company rules."
                    ].map((clause) => (
                      <button
                        key={clause}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          insertHtmlAtCursor(`<p>${clause}</p>`);
                          setClausesMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-800 cursor-pointer transition"
                      >
                        • &quot;{clause.slice(0, 38)}...&quot;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
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
                        setToolbarFontSize(16);
                        setContentDensity("normal");
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

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <span className="font-bold text-slate-500 text-[11px] uppercase flex items-center gap-1">
                <Sliders size={12} className="text-emerald-600" />
                Margins:
              </span>
              <select
                value={printMarginMode}
                onChange={(e) => {
                  setPrintMarginMode(e.target.value);
                  triggerToast(`Margin set to ${e.target.value}`, "info");
                }}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                title="Page Margins (Upper, Lower, Left, Right Indent)"
              >
                <option value="standard">Standard (1.0 in)</option>
                <option value="compact">Compact (0.75 in)</option>
                <option value="narrow">Narrow (0.50 in)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[11px] uppercase">Font:</span>
                <select
                  value={toolbarFontFamily}
                  onChange={(e) => handleSetToolbarFontFamily(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-amber-500 max-w-[140px] truncate cursor-pointer"
                >
                  {DIRECTIVE_FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[11px] uppercase">Size:</span>
                <input
                  type="range"
                  min="8"
                  max="20"
                  step="0.5"
                  value={Math.round((toolbarFontSize / 1.3333) * 10) / 10}
                  onChange={(e) => {
                    const ptVal = parseFloat(e.target.value);
                    handleSetToolbarFontSize(Math.round(ptVal * 1.3333 * 10) / 10);
                  }}
                  className="w-16 accent-amber-600 cursor-pointer"
                />
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {Math.round((toolbarFontSize / 1.3333) * 10) / 10}pt
                </span>
              </div>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="font-bold text-slate-500 text-[11px] uppercase">Watermark:</span>
                <div className="flex items-center gap-1" title="Adjust watermark opacity (thickness)">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseInt(e.target.value, 10))}
                    className="w-16 accent-amber-600 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold text-slate-700 w-7 text-right">
                    {watermarkOpacity === 0 ? "Off" : `${watermarkOpacity}%`}
                  </span>
                </div>
                <div className="flex items-center gap-1" title="Adjust watermark dimensions (scale)">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Scale</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(parseInt(e.target.value, 10))}
                    className="w-14 accent-amber-600 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold text-slate-700 w-9 text-right">{watermarkScale}%</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Elements placed: <span className="text-amber-700">{paperElements.length}</span>
            </div>
              </div>
            )}
            {isTopToolbarVisible && (
              <button
                type="button"
                onClick={() => setIsTopToolbarVisible(false)}
                className="absolute -bottom-3 left-1/2 z-[70] flex h-3 w-20 -translate-x-1/2 items-center justify-center rounded-b-lg border border-t-0 border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                title="Hide formatting toolbar"
                aria-label="Hide formatting toolbar"
              >
                <span className="h-1 w-8 rounded-full bg-current" />
              </button>
            )}
          </div>

          <div
            id="coupon-bond-printable"
            onSelect={saveSelection}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onKeyDown={handleCanvasKeyDown}
            onClick={(e) => {
              if (e.target.id === "coupon-bond-printable" || e.target === contentFlowRef.current) {
                setActiveElementId(null);
              }
            }}
            style={{
              "--doc-font-family": activeFont,
              "--doc-font-size": `${toolbarFontSize}px`,
              "--doc-line-height": docLineHeight || (contentDensity === "compact" ? 1.48 : 1.55),
              fontFamily: activeFont,
              fontSize: `${toolbarFontSize}px`,
              lineHeight: docLineHeight || (contentDensity === "compact" ? 1.48 : 1.55),
              width: "100%",
              maxWidth: `${currentPaperDef.widthPx}px`,
              minHeight: `${effectivePageHeightPx}px`,
              height: "auto",
              overflow: "visible",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              padding: getDocumentPagePadding(printMarginMode, reduceTopSpacingInPrint),
              filter: printColorMode === "monochrome" ? "grayscale(100%) contrast(105%)" : "none",
              marginBottom: "6rem",
              transition: "min-height 0.35s ease, max-width 0.35s ease, padding 0.2s ease"
            }}
            className={`bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm relative select-text flex flex-col justify-start ${
              isDragOverCanvas ? "ring-4 ring-amber-500/80 border-amber-500 bg-amber-50/15" : ""
            }`}
          >
            <div className="no-print absolute top-3 right-4 z-10 text-[10px] font-extrabold text-slate-400 bg-slate-50/90 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 select-none pointer-events-none shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-700">{currentPaperDef.label}</span>
              <span className="text-amber-700 font-mono">({effectivePageHeightPx}px height)</span>
            </div>

            {isDragOverCanvas && (
              <div className="no-print absolute inset-0 z-30 bg-amber-500/10 border-4 border-dashed border-amber-500 rounded-sm flex items-center justify-center backdrop-blur-2xs pointer-events-none">
                <div className="bg-amber-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
                  <Plus size={20} className="animate-spin" />
                  <span>Release to Drop Element onto Coupon Bond</span>
                </div>
              </div>
            )}

            {selectedCompany?.logoUrl && watermarkOpacity > 0 && (
              <div
                className="doc-watermark-layer pointer-events-none select-none overflow-hidden"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: `${Math.round((360 * watermarkScale) / 100)}px`,
                  height: `${Math.round((360 * watermarkScale) / 100)}px`,
                  pointerEvents: "none",
                  zIndex: 0,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: watermarkOpacity / 100
                }}
              >
                <img
                  src={selectedCompany.logoUrl}
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
                    Set your bond paper size above, then open the Elements Palette to add authentic letterheads, addressing, directives body, signatories, &amp; footers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPaletteDrawerOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition cursor-pointer"
                  >
                    <Layers size={15} />
                    <span>Open Elements Palette &amp; Add Blocks</span>
                  </button>
                </div>

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
              <div
                ref={contentFlowRef}
                data-doc-flow="true"
                className="relative z-10 flex flex-col justify-start w-full"
                style={{
                  position: "relative",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  flexGrow: 1,
                  flexShrink: 0,
                  flexBasis: "auto",
                  minHeight: "100%",
                  width: "100%",
                  gap: contentDensity === "compact" ? "0.45rem" : "0.75rem",
                  transition: "gap 0.2s ease"
                }}
              >
                {paperElements.map((el, index) => {
                  const isSelected = activeElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      data-category={el.category}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveElementId(el.id);
                      }}
                      style={{
                        paddingTop: `${Math.max(el.data?.paddingTop ?? 4, el.category === "signatory" ? 16 : 0)}px`,
                        paddingBottom: `${el.data?.paddingBottom ?? 8}px`,
                        paddingLeft: `${el.data?.paddingLeft ?? 0}px`,
                        paddingRight: `${el.data?.paddingRight ?? 0}px`,
                        maxWidth: el.data?.widthPercent ? `${el.data.widthPercent}%` : "100%",
                        margin: el.data?.align === "center" ? "0 auto" : el.data?.align === "right" ? "0 0 0 auto" : "0",
                        textAlign: el.data?.align || "inherit"
                      }}
                      className={`relative group transition-all duration-150 ${
                        el.category === "footer" ? "mt-auto footer-stick-bottom" : ""
                      } ${
                        isSelected
                          ? "ring-2 ring-blue-500 bg-blue-50/25 border-2 border-blue-400/80 rounded-xl shadow-lg shadow-blue-500/15 backdrop-blur-[0.5px]"
                          : "hover:ring-1 hover:ring-blue-300/40 rounded-xl"
                      }`}
                    >
                      {/* Highlighted Corner & Edge Handles when Glass Blue selected */}
                      {isSelected && (
                        <>
                          {/* 4 Highlighted Corner Handles */}
                          <div
                            onMouseDown={(e) => handleStartBlockResize(e, el.id, "nw")}
                            className="no-print block-resize-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md z-30 cursor-nwse-resize hover:scale-125 transition-transform"
                            title="Drag to resize top-left corner"
                          />
                          <div
                            onMouseDown={(e) => handleStartBlockResize(e, el.id, "ne")}
                            className="no-print block-resize-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md z-30 cursor-nesw-resize hover:scale-125 transition-transform"
                            title="Drag to resize top-right corner"
                          />
                          <div
                            onMouseDown={(e) => handleStartBlockResize(e, el.id, "sw")}
                            className="no-print block-resize-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md z-30 cursor-nesw-resize hover:scale-125 transition-transform"
                            title="Drag to resize bottom-left corner"
                          />
                          <div
                            onMouseDown={(e) => handleStartBlockResize(e, el.id, "se")}
                            className="no-print block-resize-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md z-30 cursor-nwse-resize hover:scale-125 transition-transform"
                            title="Drag to resize bottom-right corner"
                          />

                          {/* Center Bottom Spacing Handle */}
                          <div
                            onMouseDown={(e) => handleStartBlockResize(e, el.id, "bottom")}
                            className="no-print block-resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-600 border border-white rounded-full shadow-md z-30 cursor-ns-resize hover:scale-110 transition-transform"
                            title="Drag down/up to adjust block spacing"
                          />
                        </>
                      )}

                      {/* Glass Blue Floating Quick Inspector Bar */}
                      {isSelected ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="no-print glass-blue-inspector absolute -top-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white border border-blue-500/60 rounded-xl px-2.5 py-1 flex items-center gap-2 shadow-2xl backdrop-blur-md text-xs select-none animate-in fade-in zoom-in-95 duration-100"
                        >
                          <span className="flex items-center gap-1 text-[11px] font-black text-blue-300 uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40">
                            <Layers size={12} className="text-blue-400" />
                            <span className="max-w-[120px] truncate">{el.name}</span>
                          </span>

                          <div className="h-4 w-px bg-slate-700" />

                          {/* Spacing / Padding adjustment */}
                          <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-1.5 py-0.5" title="Vertical Spacing (Padding)">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Pad:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = el.data?.paddingBottom ?? 8;
                                adjustElementLayout(el.id, {
                                  paddingBottom: Math.max(0, current - 4),
                                  paddingTop: Math.max(0, (el.data?.paddingTop ?? 4) - 2)
                                });
                              }}
                              className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white font-black text-xs cursor-pointer"
                              title="Decrease Spacing"
                            >
                              −
                            </button>
                            <span className="font-mono text-amber-400 text-[11px] font-bold min-w-[20px] text-center">
                              {el.data?.paddingBottom ?? 8}px
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = el.data?.paddingBottom ?? 8;
                                adjustElementLayout(el.id, {
                                  paddingBottom: Math.min(60, current + 4),
                                  paddingTop: Math.min(30, (el.data?.paddingTop ?? 4) + 2)
                                });
                              }}
                              className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white font-black text-xs cursor-pointer"
                              title="Increase Spacing"
                            >
                              +
                            </button>
                          </div>

                          {/* Width Scale */}
                          <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-1.5 py-0.5" title="Block Width Size">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Width:</span>
                            {[100, 90, 80].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => {
                                  adjustElementLayout(el.id, { widthPercent: w });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                                  (el.data?.widthPercent ?? 100) === w
                                    ? "bg-blue-600 text-white font-black"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                {w}%
                              </button>
                            ))}
                          </div>

                          <div className="h-4 w-px bg-slate-700" />

                          {/* Move block Up / Down */}
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveElement(index, "up")}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer"
                              title="Move Block Up"
                            >
                              <ArrowUp size={13} />
                            </button>
                          )}
                          {index < paperElements.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveElement(index, "down")}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer"
                              title="Move Block Down"
                            >
                              <ArrowDown size={13} />
                            </button>
                          )}

                          {/* Duplicate Block */}
                          <button
                            type="button"
                            onClick={() => duplicateElement(el.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-300 cursor-pointer"
                            title="Duplicate Block"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Save as Template */}
                          <button
                            type="button"
                            onClick={() => handleOpenSaveAsTemplateFromPaper(el)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer"
                            title="Save as Custom Template"
                          >
                            <Bookmark size={13} />
                          </button>

                          {/* Delete Block */}
                          <button
                            type="button"
                            onClick={() => removeElement(el.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete Block"
                          >
                            <Trash2 size={13} />
                          </button>

                          {/* Close/Deselect button */}
                          <button
                            type="button"
                            onClick={() => setActiveElementId(null)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white cursor-pointer ml-1"
                            title="Deselect Block"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
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
                      )}

                      {/* 1. Header Designs */}
                      {el.category === "header" && (
                        <div>
                          {el.variant === "header_dual_logo" && (
                            <div className="border-b-2 border-emerald-700 pb-4 mb-4 select-text">
                              <div className="flex items-center justify-between gap-4">
                                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0" style={{ width: "5rem", height: "5rem", flexShrink: 0 }}>
                                  <img src={selectedCompany.logoUrl} alt={selectedCompany.name} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="flex-1 text-center px-2">
                                  <h2
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                    className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-tight outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany)}
                                  </h2>
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "tagline", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "tagline", e.currentTarget.innerText)}
                                    className="text-xs font-semibold text-emerald-800 tracking-wide mt-0.5 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.tagline ?? (selectedCompany.tagline || ""), selectedCompany)}
                                  </p>
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "address", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "address", e.currentTarget.innerText)}
                                    className="text-[11px] text-slate-600 mt-1 leading-snug outline-none hover:bg-amber-50/50 rounded px-1 transition whitespace-pre-line"
                                  >
                                    {resolveCompanyTokens(el.data?.address ?? (selectedCompany.address || ""), selectedCompany)}
                                  </p>
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "contact", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "contact", e.currentTarget.innerText)}
                                    className="text-[10px] text-slate-500 font-mono mt-0.5 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.contact ?? (selectedCompany.contact || ""), selectedCompany)}
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
                                  <h2
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                    className="text-base font-black uppercase text-slate-950 tracking-tight leading-tight outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.companyName || selectedCompany.name, selectedCompany)}
                                  </h2>
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "categoryText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "categoryText", e.currentTarget.innerText)}
                                    className="text-[11px] font-bold text-slate-500 uppercase outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.categoryText || selectedCompany.category, selectedCompany)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right text-[10px] text-slate-500 font-mono">
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "address", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "address", e.currentTarget.innerText)}
                                  className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.address || selectedCompany.address, selectedCompany)}
                                </p>
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "contact", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "contact", e.currentTarget.innerText)}
                                  className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.contact || selectedCompany.contact, selectedCompany)}
                                </p>
                              </div>
                            </div>
                          )}

                          {el.variant === "header_formal_seal" && (
                            <div className="border-b-2 border-double border-slate-800 pb-4 mb-4 text-center space-y-1 select-text">
                              <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-16 h-16 mx-auto object-contain mb-1" />
                              <h2
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                className="text-lg font-black uppercase tracking-widest text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany)}
                              </h2>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "addressContact", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "addressContact", e.currentTarget.innerText)}
                                className="text-[11px] font-bold uppercase tracking-wider text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.addressContact || `${selectedCompany.address} • ${selectedCompany.contact}`, selectedCompany)}
                              </p>
                            </div>
                          )}

                          {el.variant === "header_compact_strip" && (
                            <div className="border-b border-emerald-600 pb-2 mb-3 flex items-center justify-between text-xs font-bold text-slate-800 select-text">
                              <div className="flex items-center gap-2">
                                <img src={selectedCompany.logoUrl} alt={selectedCompany.code} className="w-7 h-7 object-contain" />
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                  className="font-black uppercase tracking-wider outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.companyName || selectedCompany.name, selectedCompany)}
                                </span>
                              </div>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "contact", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "contact", e.currentTarget.innerText)}
                                className="text-[10px] text-slate-500 font-mono outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.contact || selectedCompany.contact, selectedCompany)}
                              </span>
                            </div>
                          )}

                          {el.variant === "header_aac_compliance" && (
                            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-3 select-text">
                              <div className="flex items-center gap-3">
                                <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-14 h-14 object-contain" />
                                <div>
                                  <h2
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                    className="text-sm font-black uppercase text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.companyName || selectedCompany.name, selectedCompany)}
                                  </h2>
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "tagline", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "tagline", e.currentTarget.innerText)}
                                    className="text-[11px] font-extrabold text-emerald-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.tagline || "PCSO Authorized Agent Corporation (AAC) • Central Operations Hub", selectedCompany)}
                                  </p>
                                </div>
                              </div>
                              <div className="border border-slate-300 p-1.5 rounded text-center text-[10px] font-mono bg-slate-50">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "aacNumber", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "aacNumber", e.currentTarget.innerText)}
                                  className="block font-black text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.aacNumber || "AAC-[COMPANY_CODE]-2026-089", selectedCompany)}
                                </span>
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "agencySubtitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "agencySubtitle", e.currentTarget.innerText)}
                                  className="text-slate-500 outline-none hover:bg-amber-50/50 rounded px-1 transition block"
                                >
                                  {resolveCompanyTokens(el.data?.agencySubtitle || "Accredited Agency", selectedCompany)}
                                </span>
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
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "companyName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyName", e.currentTarget.innerText)}
                                className="text-center font-black uppercase text-slate-800 text-xs mt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany)}
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
                                    onFocus={saveSelection}
                                    onBlur={(e) => {
                                      const next = e.currentTarget.innerText.trim();
                                      const fallback = (selectedCompany.legalName || selectedCompany.name || "").trim();
                                      handleTokenAwareBlur(el.id, "companyName", el.data?.companyName, next === fallback ? "" : next, fallback);
                                    }}
                                    className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.companyName || selectedCompany.legalName || selectedCompany.name, selectedCompany)}
                                  </h2>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onBlur={(e) => {
                                      const next = e.currentTarget.innerText.trim();
                                      const fallback = (selectedCompany.address || "").trim();
                                      handleTokenAwareBlur(el.id, "address", el.data?.address, next === fallback ? "" : next, fallback);
                                    }}
                                    className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1 leading-snug uppercase outline-none hover:bg-amber-50/50 rounded px-1 transition whitespace-pre-line"
                                  >
                                    {resolveCompanyTokens(el.data?.address || selectedCompany.address || "", selectedCompany)}
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

                      {/* 2. Addressing & Metadata */}
                      {el.category === "addressing" && (
                        <div>
                          {el.variant === "address_termination_agency" && (
                            <div className="mb-5 text-xs text-slate-900 space-y-3.5 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "dateLine", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "dateLine", el.data?.dateLine, e.currentTarget.innerText, "Date: _____________________")}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {resolveCompanyTokens(el.data?.dateLine || "Date: _____________________", selectedCompany)}
                              </div>

                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientName", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientName", el.data?.recipientName, e.currentTarget.innerText, "MR. DANIEL PADILLA")}
                                  className="font-black text-sm uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientName || "MR. DANIEL PADILLA", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientOffice", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientOffice", el.data?.recipientOffice, e.currentTarget.innerText, "STL-ILIGAN OFFICE, LANAO DEL NORTE")}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientOffice || "STL-ILIGAN OFFICE, LANAO DEL NORTE", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientCompany", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientCompany", el.data?.recipientCompany, e.currentTarget.innerText, "[COMPANY_LEGAL_NAME]")}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientCompany || "[COMPANY_LEGAL_NAME]", selectedCompany)}
                                </div>
                              </div>

                              <div className="pt-2">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "subject", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "subject", el.data?.subject, e.currentTarget.innerText, "RE: TERMINATION OF AGENCY AGREEMENT")}
                                  className="font-black italic text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.subject || "RE: TERMINATION OF AGENCY AGREEMENT", selectedCompany)}
                                </span>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "salutation", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "salutation", el.data?.salutation, e.currentTarget.innerText, "Dear Mr. Padilla,")}
                                className="font-bold text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.salutation || "Dear Mr. Padilla,", selectedCompany)}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_letter_to_explain" && (
                            <div className="mb-5 text-xs text-slate-900 space-y-3.5 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "date", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "date", el.data?.date, e.currentTarget.innerText, docDate || "SEPTEMBER 28, 2026")}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition uppercase tracking-wide inline-block"
                              >
                                {resolveCompanyTokens(el.data?.date || docDate || "SEPTEMBER 28, 2026", selectedCompany)}
                              </div>

                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientName", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientName", el.data?.recipientName, e.currentTarget.innerText, "MOSHER BEBOT")}
                                  className="font-black text-sm uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientName || "MOSHER BEBOT", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientTitle", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientTitle", el.data?.recipientTitle, e.currentTarget.innerText, "SALES SUPERVISOR")}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientTitle || "SALES SUPERVISOR", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientCompany", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientCompany", el.data?.recipientCompany, e.currentTarget.innerText, "[COMPANY_LEGAL_NAME]")}
                                  className="font-bold text-xs uppercase text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientCompany || "[COMPANY_LEGAL_NAME]", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientStation", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientStation", el.data?.recipientStation, e.currentTarget.innerText, "MAGUINDANAO DEL NORTE")}
                                  className="font-semibold text-xs uppercase text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientStation || "MAGUINDANAO DEL NORTE", selectedCompany)}
                                </div>
                              </div>

                              <div className="pt-2">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "subject", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "subject", el.data?.subject, e.currentTarget.innerText, "RE: LETTER OF EXPLANATION")}
                                  className="font-black italic text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.subject || "RE: LETTER OF EXPLANATION", selectedCompany)}
                                </span>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "salutation", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "salutation", el.data?.salutation, e.currentTarget.innerText, "Dear Gomez,")}
                                className="font-bold text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.salutation || "Dear Gomez,", selectedCompany)}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_memo_grid" && (
                            <div className="my-3 text-xs text-slate-800 space-y-2 select-text">
                              <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-1.5 mb-2.5">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "memoTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "memoTitle", e.currentTarget.innerText)}
                                  className="font-black tracking-widest text-slate-950 text-base outline-none hover:bg-amber-50/50 rounded px-1"
                                >
                                  {el.data?.memoTitle || "MEMORANDUM"}
                                </span>
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "ref", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "ref", e.currentTarget.innerText)}
                                  className="font-mono text-slate-500 font-bold text-xs outline-none hover:bg-amber-50/50 rounded px-1"
                                >
                                  {el.data?.ref || `REF: ${docRef}`}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 text-xs">
                                <div className="flex items-baseline" style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "toLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "toLabel", e.currentTarget.innerText)}
                                    style={{ width: "6rem", minWidth: "6rem", flexShrink: 0, display: "inline-block", color: "#64748b" }}
                                    className="font-black text-slate-500 w-24 shrink-0 outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.toLabel || "FOR / TO:"}
                                  </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "to", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "to", el.data?.to, e.currentTarget.innerText, selectedCompany.defaultTo || "ALL CONCERNED")}
                                    style={{ flex: "1 1 0%", minWidth: 0, paddingLeft: "0.25rem" }}
                                    className="font-bold text-slate-900 flex-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.to || selectedCompany.defaultTo || "ALL CONCERNED", selectedCompany)}
                                  </span>
                                </div>
                                <div className="flex items-baseline" style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "fromLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "fromLabel", e.currentTarget.innerText)}
                                    style={{ width: "6rem", minWidth: "6rem", flexShrink: 0, display: "inline-block", color: "#64748b" }}
                                    className="font-black text-slate-500 w-24 shrink-0 outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.fromLabel || "FROM:"}
                                  </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "from", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "from", el.data?.from, e.currentTarget.innerText, "[COMPANY_NAME] — HUMAN RESOURCES DEPARTMENT")}
                                    style={{ flex: "1 1 0%", minWidth: 0, paddingLeft: "0.25rem" }}
                                    className="font-bold text-slate-900 flex-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.from || "[COMPANY_NAME] — HUMAN RESOURCES DEPARTMENT", selectedCompany)}
                                  </span>
                                </div>
                                <div className="flex items-baseline" style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "dateLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "dateLabel", e.currentTarget.innerText)}
                                    style={{ width: "6rem", minWidth: "6rem", flexShrink: 0, display: "inline-block", color: "#64748b" }}
                                    className="font-black text-slate-500 w-24 shrink-0 outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.dateLabel || "DATE:"}
                                  </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "date", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "date", e.currentTarget.innerText)}
                                    style={{ flex: "1 1 0%", minWidth: 0, paddingLeft: "0.25rem" }}
                                    className="font-bold text-slate-800 flex-1 px-1 outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.date || docDate}
                                  </span>
                                </div>
                                <div className="flex items-baseline" style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "subjectLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "subjectLabel", e.currentTarget.innerText)}
                                    style={{ width: "6rem", minWidth: "6rem", flexShrink: 0, display: "inline-block", color: "#64748b" }}
                                    className="font-black text-slate-500 w-24 shrink-0 outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.subjectLabel || "SUBJECT:"}
                                  </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "subject", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "subject", el.data?.subject, e.currentTarget.innerText, "OFFICIAL DIRECTIVE")}
                                    style={{ flex: "1 1 0%", minWidth: 0, paddingLeft: "0.25rem" }}
                                    className="font-black text-slate-950 flex-1 uppercase outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.subject || "OFFICIAL DIRECTIVE", selectedCompany)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "address_formal_letter" && (
                            <div className="mb-4 text-xs text-slate-900 space-y-3 select-text">
                              <div className="text-right text-slate-600 font-bold space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "date", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "date", e.currentTarget.innerText)}
                                  className="outline-none hover:bg-amber-50/50 rounded px-1 inline-block"
                                >
                                  {el.data?.date || docDate}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "ref", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "ref", e.currentTarget.innerText)}
                                  className="block font-mono text-[11px] text-slate-500 outline-none hover:bg-amber-50/50 rounded px-1"
                                >
                                  {el.data?.ref || `REF: ${docRef}`}
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientName", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientName", el.data?.recipientName, e.currentTarget.innerText, "RECIPIENT NAME")}
                                  className="font-black text-sm uppercase text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientName || "RECIPIENT NAME", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientTitle", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientTitle", el.data?.recipientTitle, e.currentTarget.innerText, "Designation")}
                                  className="font-semibold text-xs text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientTitle || "Designation", selectedCompany)}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "recipientCompany", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "recipientCompany", el.data?.recipientCompany, e.currentTarget.innerText, "[COMPANY_NAME] — Operations Division")}
                                  className="text-xs text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data?.recipientCompany || "[COMPANY_NAME] — Operations Division", selectedCompany)}
                                </div>
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "salutation", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "salutation", el.data?.salutation, e.currentTarget.innerText, "DEAR SIR/MADAM:")}
                                className="font-black text-xs text-slate-900 pt-1 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.salutation || "DEAR SIR/MADAM:", selectedCompany)}
                              </div>
                            </div>
                          )}

                          {el.variant === "address_public_notice" && (
                            <div className="text-center my-4 space-y-2 select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "badgeText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "badgeText", e.currentTarget.innerText)}
                                className="inline-block font-mono text-[10px] font-black bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded border border-amber-300 outline-none hover:bg-amber-200 transition"
                              >
                                {el.data?.badgeText || `${docRef} • ${docDate}`}
                              </div>
                              <h2
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "bannerTitle", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "bannerTitle", el.data?.bannerTitle, e.currentTarget.innerText, "PUBLIC ADVISORY & FORMAL NOTICE")}
                                className="text-lg sm:text-xl font-black uppercase tracking-widest text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 transition"
                              >
                                {resolveCompanyTokens(el.data?.bannerTitle || "PUBLIC ADVISORY & FORMAL NOTICE", selectedCompany)}
                              </h2>
                              <div className="h-0.5 w-28 bg-amber-600 mx-auto" />
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "to", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "to", el.data?.to, e.currentTarget.innerText, "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS OF [COMPANY_NAME]")}
                                className="text-xs font-bold text-slate-700 mt-2 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.to || "TO THE GENERAL PATRONIZING PUBLIC AND ALL GAMING OUTLETS OF [COMPANY_NAME]", selectedCompany)}
                              </p>
                            </div>
                          )}

                          {el.variant === "address_certificate_ribbon" && (
                            <div className="text-center my-6 space-y-2.5 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "conferralText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "conferralText", e.currentTarget.innerText)}
                                className="text-xs font-black tracking-widest text-amber-700 uppercase outline-none hover:bg-amber-50/50 rounded px-2"
                              >
                                {resolveCompanyTokens(el.data?.conferralText || "THIS CERTIFICATE IS PROUDLY CONFERRED UPON", selectedCompany)}
                              </p>
                              <h2
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "awardeeName", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "awardeeName", el.data?.awardeeName, e.currentTarget.innerText, "AWARDEE NAME")}
                                className="text-xl sm:text-2xl font-black uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 transition"
                              >
                                {resolveCompanyTokens(el.data?.awardeeName || "AWARDEE NAME", selectedCompany)}
                              </h2>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "awardeeTitle", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "awardeeTitle", el.data?.awardeeTitle, e.currentTarget.innerText, "Senior Area Coordinator • [COMPANY_NAME]")}
                                className="text-xs font-bold text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.awardeeTitle || "Senior Area Coordinator • [COMPANY_NAME]", selectedCompany)}
                              </p>
                            </div>
                          )}

                          {el.variant === "address_letter_with_cc" && (
                            <div className={`text-xs text-slate-900 select-text ${contentDensity === "compact" ? "mb-2 space-y-2" : "mb-4 space-y-3.5"}`}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "date", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "date", e.currentTarget.innerText)}
                                className="font-bold text-xs text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block uppercase tracking-wide"
                              >
                                {el.data?.date || docDate || "OCTOBER 24, 2026"}
                              </div>

                              <div className="flex items-start text-xs leading-snug">
                                <span className="font-black text-slate-950 w-12 shrink-0">TO:</span>
                                <div className="space-y-0.5 flex-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "toName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "toName", e.currentTarget.innerText)}
                                    className="font-black text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toName || "CHARMIE JEAN M. SIMPAL, RRT"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "toTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "toTitle", e.currentTarget.innerText)}
                                    className="font-semibold text-[11px] text-slate-800 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.toTitle || "Assistant General Manager"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "toCompany", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "toCompany", el.data?.toCompany, e.currentTarget.innerText, "SGC Corporation")}
                                    className="text-[11px] text-slate-700 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.toCompany || "SGC Corporation", selectedCompany)}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "toAddress", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "toAddress", el.data?.toAddress, e.currentTarget.innerText, "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat")}
                                    className="text-[11px] text-slate-600 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {resolveCompanyTokens(el.data?.toAddress || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat", selectedCompany)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start text-xs leading-snug">
                                <span className="font-black text-slate-950 w-12 shrink-0">CC:</span>
                                <div className={`flex-1 ${contentDensity === "compact" ? "space-y-1.5" : "space-y-3"}`}>
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
                                    <div key={ccIdx} className="space-y-0.5 relative group/cc">
                                      <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        onFocus={saveSelection}
                                        onBlur={(e) => {
                                          const nextCC = [...(el.data?.ccRecipients || [
                                            { name: "JEVINCE JAYE S. JUBAY, CHRP", title: "HRMD Manager", company: "SGC Corporation", address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat" },
                                            { name: "FATIMA MARIE B. OBILLOS", title: "CFO Head", company: "SGC Corporation", address: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat" }
                                          ])];
                                          nextCC[ccIdx] = { ...nextCC[ccIdx], name: e.currentTarget.innerText };
                                          updateElementData(el.id, "ccRecipients", nextCC);
                                        }}
                                        className="font-black text-xs uppercase text-slate-950 px-1 outline-none hover:bg-amber-50/50 rounded"
                                      >
                                        {cc.name}
                                      </div>
                                      <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        onFocus={saveSelection}
                                        onBlur={(e) => {
                                          const nextCC = [...(el.data?.ccRecipients || [])];
                                          nextCC[ccIdx] = { ...nextCC[ccIdx], title: e.currentTarget.innerText };
                                          updateElementData(el.id, "ccRecipients", nextCC);
                                        }}
                                        className="font-semibold text-[11px] text-slate-800 px-1 outline-none hover:bg-amber-50/50 rounded"
                                      >
                                        {cc.title}
                                      </div>
                                      <div
                                        contentEditable
                                        suppressContentEditableWarning
                                        onFocus={saveSelection}
                                        onBlur={(e) => {
                                          const nextCC = [...(el.data?.ccRecipients || [])];
                                          nextCC[ccIdx] = { ...nextCC[ccIdx], company: e.currentTarget.innerText };
                                          updateElementData(el.id, "ccRecipients", nextCC);
                                        }}
                                        className="text-[11px] text-slate-700 px-1 outline-none hover:bg-amber-50/50 rounded"
                                      >
                                        {cc.company}
                                      </div>
                                      {cc.address && (
                                        <div
                                          contentEditable
                                          suppressContentEditableWarning
                                          onFocus={saveSelection}
                                          onBlur={(e) => {
                                            const nextCC = [...(el.data?.ccRecipients || [])];
                                            nextCC[ccIdx] = { ...nextCC[ccIdx], address: e.currentTarget.innerText };
                                            updateElementData(el.id, "ccRecipients", nextCC);
                                          }}
                                          className="text-[11px] text-slate-600 px-1 outline-none hover:bg-amber-50/50 rounded"
                                        >
                                          {cc.address}
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeCcRecipient(el.id, ccIdx)}
                                        className="no-print absolute top-0 right-0 hidden group-hover/cc:inline-block text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1"
                                        title="Remove this CC recipient"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => addCcRecipient(el.id)}
                                    className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                                  >
                                    + Add CC Recipient
                                  </button>
                                </div>
                              </div>

                              <div className="pt-2">
                                <div className="font-black text-xs text-slate-950 uppercase leading-snug">
                                  <span>SUBJECT: </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "subject", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "subject", e.currentTarget.innerText)}
                                    className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                  >
                                    {el.data?.subject || "REQUEST FOR CORPORATE SOCIAL RESPONSIBILITY (CSR) DONATION FOR THE LABOGON FIRE VICTIMS"}
                                  </span>
                                </div>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "salutation", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "salutation", e.currentTarget.innerText)}
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
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "dateLine", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                className="font-bold text-xs sm:text-sm text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {el.data?.dateLine || "Date: November 06, 2026"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Directives & Body */}
                      {el.category === "body" && (
                        <div>
                          {el.variant === "body_non_affiliation_salesforce" ? (
                            <div className="space-y-4 my-3 text-xs sm:text-sm leading-relaxed text-slate-900 select-text">
                              <div className="text-center my-3">
                                <h2
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 outline-none hover:bg-amber-50/50 rounded px-2 inline-block transition"
                                >
                                  {resolveCompanyTokens(el.data?.title || "CERTIFICATE OF NON-AFFILIATION", selectedCompany)}
                                </h2>
                              </div>

                              <div className="pt-1 pb-1">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "dateLine", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
                                  className="font-bold text-xs sm:text-sm text-slate-950 outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {resolveCompanyTokens(el.data?.dateLine || "Date: November 06, 2026", selectedCompany)}
                                </span>
                              </div>

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "para1", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "para1", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(
                                    el.data?.para1 ||
                                      `This is to certify that <strong class="font-black text-slate-950">${el.data?.personName || "ARJUN BAGUIO PATALINGHUG"}</strong>, is not <strong class="font-bold">affiliated</strong> with <strong class="font-bold">${selectedCompany.legalName || selectedCompany.name}</strong> as a Salesforce partner under the <strong class="font-bold text-slate-950">${el.data?.agencyName || "Philippine Charity Sweepstakes Office (PCSO)"}</strong>.`,
                                    selectedCompany
                                  )
                                }}
                                className="text-justify leading-relaxed outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "para2", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "para2", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(
                                    el.data?.para2 ||
                                      `We affirm that the aforementioned individual <strong class="font-bold">has no formal or informal association</strong> with <strong class="font-bold">${selectedCompany.legalName || selectedCompany.name}</strong> in any capacity related to Salesforce services, nor do they represent the company in any activities associated with PCSO.`,
                                    selectedCompany
                                  )
                                }}
                                className="text-justify leading-relaxed outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "para3", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "para3", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(
                                    el.data?.para3 ||
                                      `Any claims or representation made by this individual suggesting that He is a Salesforce partner of <strong class="font-bold">${selectedCompany.legalName || selectedCompany.name}</strong> or have any related business dealings with the company are <strong class="font-bold">false and unauthorized</strong>.`,
                                    selectedCompany
                                  )
                                }}
                                className="text-justify leading-relaxed outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "para4", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "para4", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(
                                    el.data?.para4 ||
                                      `This certification is issued for the <strong class="font-bold">purpose of clarifying</strong> that <strong class="font-bold text-slate-950">${el.data?.personNameTitle || "Arjun Baguio Patalinghug"}</strong> has <strong class="font-bold">never been affiliated</strong> with <strong class="font-bold">${selectedCompany.legalName || selectedCompany.name} as a Salesforce partner</strong>.`,
                                    selectedCompany
                                  )
                                }}
                                className="text-justify leading-relaxed outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "para5", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "para5", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(
                                    el.data?.para5 ||
                                      `For verification or further inquiries, please contact #: <strong class="font-black text-slate-950">${el.data?.contactNumber || "09243223514"}</strong>.`,
                                    selectedCompany
                                  )
                                }}
                                className="text-justify leading-relaxed pt-1 outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />
                            </div>
                          ) : el.variant === "body_termination_agency" ? (
                            <div className="space-y-4 my-3 text-xs leading-relaxed text-slate-900 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "incidentParagraph", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "incidentParagraph", el.data?.incidentParagraph, e.currentTarget.innerText, "Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company. This action constitutes, based on the Agency Agreement signed and notarized on _____________________, which is attached as Annex A of this letter, which, is a terminable case.")}
                                className="text-justify indent-6 outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.incidentParagraph || "Based on the Incident Report last March 7, 2025, it was determined that you have been involved in a quarrel within the premises of the Company. This action constitutes, based on the Agency Agreement signed and notarized on _____________________, which is attached as Annex A of this letter, which, is a terminable case.", selectedCompany)}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "provisionsIntro", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "provisionsIntro", el.data?.provisionsIntro, e.currentTarget.innerText, "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:")}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.provisionsIntro || "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:", selectedCompany)}
                              </p>

                              <div className="pl-6 space-y-2">
                                {(el.data?.terminationClauses || [
                                  "5.6. If the concerned member violates, in any way, any provision of this Contract.",
                                  "5.8. In case of loss of trust and confidence in the concerned member.",
                                  "5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force and those which may from time to time be promulgated by the Company."
                                ]).map((clause, cIdx) => (
                                  <div key={cIdx} className="flex items-start gap-2 text-justify relative group/clause">
                                    <span className="font-black text-slate-900">•</span>
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onInput={(e) => {
                                        const target = paperElements.find((item) => item.id === el.id);
                                        if (target && target.data) {
                                          if (!Array.isArray(target.data.terminationClauses)) {
                                            target.data.terminationClauses = [...(el.data?.terminationClauses || [])];
                                          }
                                          target.data.terminationClauses[cIdx] = e.currentTarget.innerText;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const newClauses = [...(el.data?.terminationClauses || [
                                          "5.6. If the concerned member violates, in any way, any provision of this Contract.",
                                          "5.8. In case of loss of trust and confidence in the concerned member.",
                                          "5.9. In case of violation of any provision of the 2020 STL RIRR, rules, regulations, and ethical conduct now in force and those which may from time to time be promulgated by the Company."
                                        ])];
                                        newClauses[cIdx] = e.currentTarget.innerText;
                                        updateElementData(el.id, "terminationClauses", newClauses);
                                      }}
                                      className="flex-1 outline-none hover:bg-amber-50/20 rounded px-1 transition"
                                    >
                                      {clause}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeTerminationClause(el.id, cIdx)}
                                      className="no-print hidden group-hover/clause:inline-block text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1"
                                      title="Remove clause"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => addTerminationClause(el.id)}
                                  className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                                >
                                  + Add Clause
                                </button>
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "companyWarning", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "companyWarning", el.data?.companyWarning, e.currentTarget.innerText, "Moreover, this action will not be tolerated by [COMPANY_LEGAL_NAME], as these are grounds for cancellation of your Agency Agreement.")}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.companyWarning || "Moreover, this action will not be tolerated by [COMPANY_LEGAL_NAME], as these are grounds for cancellation of your Agency Agreement.", selectedCompany)}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "conclusionParagraph", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "conclusionParagraph", el.data?.conclusionParagraph, e.currentTarget.innerText, "In conclusion, your Agency Agreement is hereby terminated effective _____________________.")}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.conclusionParagraph || "In conclusion, your Agency Agreement is hereby terminated effective _____________________.", selectedCompany)}
                              </p>
                            </div>
                          ) : el.variant === "body_letter_of_explain" ? (
                            <div className="space-y-4 my-3 text-xs leading-relaxed text-slate-900 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "reportCitation", e.currentTarget.innerHTML)} onBlur={(e) => handleTokenAwareBlur(el.id, "reportCitation", el.data?.reportCitation, e.currentTarget.innerHTML, "We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:")}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.reportCitation || "We received a report from Ms. Quennie R. Capuyan, HR Admin, of the following allegations:", selectedCompany)
                                }}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div className="pl-6 space-y-2">
                                {(el.data?.allegations || [
                                  "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
                                ]).map((allegation, aIdx) => (
                                  <div key={aIdx} className="flex items-start gap-2 text-justify relative group/alleg">
                                    <span className="font-black text-slate-900">•</span>
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onInput={(e) => {
                                        const target = paperElements.find((item) => item.id === el.id);
                                        if (target && target.data) {
                                          if (!Array.isArray(target.data.allegations)) {
                                            target.data.allegations = [...(el.data?.allegations || [])];
                                          }
                                          target.data.allegations[aIdx] = e.currentTarget.innerHTML;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const newAllegations = [...(el.data?.allegations || [
                                          "It was reported that you insisted on obtaining your fuel allowance in advance despite the prescribed release schedule and borrowed PHP 1,000.00 from company cash, contrary to Company policy prohibiting such borrowing."
                                        ])];
                                        newAllegations[aIdx] = e.currentTarget.innerHTML;
                                        updateElementData(el.id, "allegations", newAllegations);
                                      }}
                                      dangerouslySetInnerHTML={{ __html: allegation }}
                                      className="flex-1 outline-none hover:bg-amber-50/20 rounded px-1 transition"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeAllegation(el.id, aIdx)}
                                      className="no-print hidden group-hover/alleg:inline-block text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1"
                                      title="Remove allegation"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => addAllegation(el.id)}
                                  className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                                >
                                  + Add Allegation
                                </button>
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "explanationNotice", e.currentTarget.innerHTML)} onBlur={(e) => handleTokenAwareBlur(el.id, "explanationNotice", el.data?.explanationNotice, e.currentTarget.innerHTML, "In view thereof, you are hereby requested to explain in writing (in a language you are most comfortable with) within three (3) days from receipt hereof why your Agency Agreement with the company shall not be terminated for the said offense/s.")}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.explanationNotice || "In view thereof, you are hereby requested to explain in writing (in a language you are most comfortable with) within three (3) days from receipt hereof why your Agency Agreement with the company shall not be terminated for the said offense/s.", selectedCompany)
                                }}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "contractClauseIntro", e.currentTarget.innerHTML)} onBlur={(e) => handleTokenAwareBlur(el.id, "contractClauseIntro", el.data?.contractClauseIntro, e.currentTarget.innerHTML, "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:")}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.contractClauseIntro || "As stated in the General Provisions of the Agency Agreement – TERMINATION “The Company may immediately terminate this Contract of the concerned member of the SALESFORCE on account of any of the following:", selectedCompany)
                                }}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <div className="pl-10 space-y-1.5 font-bold italic text-slate-950">
                                {(el.data?.contractClauses || [
                                  { num: "9.11", text: "Acts of theft, dishonesty, fraud, misrepresentation, or breach of trust." },
                                  { num: "9.12", text: "Violation of any terms in the Agency Agreement." },
                                  { num: "9.14", text: "Loss of trust and confidence in the Cabo or Cobrador." },
                                  { num: "9.15", text: "Violation of any provision of the 2020 STL RIRR, existing rules, regulations, or ethical standards, as well as future directives from the STL-AAC." }
                                ]).map((clause, cIdx) => (
                                  <div key={cIdx} className="flex items-baseline gap-4 relative group/cclause">
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onBlur={(e) => {
                                        const clauses = [...(el.data?.contractClauses || [])];
                                        clauses[cIdx] = { ...clauses[cIdx], num: e.currentTarget.innerText };
                                        updateElementData(el.id, "contractClauses", clauses);
                                      }}
                                      className="w-10 shrink-0 font-black font-mono outline-none hover:bg-amber-50/50 rounded"
                                    >
                                      {clause.num}
                                    </span>
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onInput={(e) => {
                                        const target = paperElements.find((item) => item.id === el.id);
                                        if (target && target.data && Array.isArray(target.data.contractClauses)) {
                                          target.data.contractClauses[cIdx].text = e.currentTarget.innerHTML;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const clauses = [...(el.data?.contractClauses || [])];
                                        clauses[cIdx] = { ...clauses[cIdx], text: e.currentTarget.innerHTML };
                                        updateElementData(el.id, "contractClauses", clauses);
                                      }}
                                      dangerouslySetInnerHTML={{ __html: clause.text }}
                                      className="flex-1 outline-none hover:bg-amber-50/50 rounded"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeContractClause(el.id, cIdx)}
                                      className="no-print hidden group-hover/cclause:inline-block text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1"
                                      title="Remove clause"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => addContractClause(el.id)}
                                  className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                                >
                                  + Add Clause
                                </button>
                              </div>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "waiverWarning", e.currentTarget.innerHTML)} onBlur={(e) => handleTokenAwareBlur(el.id, "waiverWarning", el.data?.waiverWarning, e.currentTarget.innerHTML, "Failure to submit a response letter shall mean waiving your right to be heard and this case shall be dealt with given the available information.")}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.waiverWarning || "Failure to submit a response letter shall mean waiving your right to be heard and this case shall be dealt with given the available information.", selectedCompany)
                                }}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "closingDirective", e.currentTarget.innerHTML)} onBlur={(e) => handleTokenAwareBlur(el.id, "closingDirective", el.data?.closingDirective, e.currentTarget.innerHTML, "Please be guided accordingly.")}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.closingDirective || "Please be guided accordingly.", selectedCompany)
                                }}
                                className="outline-none hover:bg-amber-50/20 rounded p-1 transition font-medium"
                              />
                            </div>
                          ) : el.variant === "body_request_proposal_table" ? (
                            <div className={`text-xs leading-relaxed text-slate-900 select-text ${contentDensity === "compact" ? "space-y-1.5 my-1.5" : "space-y-3.5 my-3"}`}>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "introText", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "introText", el.data?.introText, e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.introText || "", selectedCompany)}
                              </p>

                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "proposalText", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "proposalText", el.data?.proposalText, e.currentTarget.innerText)}
                                className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.proposalText || "", selectedCompany)}
                              </p>

                              <div className={`border border-slate-900 rounded overflow-hidden ${contentDensity === "compact" ? "my-1.5" : "my-3"}`}>
                                <table className="w-full text-xs text-slate-900 border-collapse">
                                  <thead className="bg-slate-100 font-bold border-b border-slate-900">
                                    <tr>
                                      <th className="p-1.5 text-left font-black">DESCRIPTION</th>
                                      <th className="p-1.5 text-center font-black">QUANTITY</th>
                                      <th className="p-1.5 text-right font-black">MARKET PRICE</th>
                                      <th className="p-1.5 text-right font-black">TOTAL</th>
                                      <th className="no-print w-6"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(el.data?.tableRows || [
                                      { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
                                      { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
                                    ]).map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-slate-300 group/row">
                                        <td
                                          contentEditable
                                          suppressContentEditableWarning
                                          onFocus={saveSelection}
                                          onBlur={(e) => {
                                            const rows = [...(el.data?.tableRows || [
                                              { desc: "10 LITER OF BOTTLED WATER", qty: "106 PIECES", price: "PHP 88.50", total: "PHP 9,381.00" },
                                              { desc: "5 KILOS OF RICE", qty: "106 PIECES", price: "PHP 250.50", total: "PHP 26,553.00" }
                                            ])];
                                            rows[rIdx] = { ...rows[rIdx], desc: e.currentTarget.innerText };
                                            updateElementData(el.id, "tableRows", rows);
                                          }}
                                          className="p-1.5 font-bold uppercase outline-none hover:bg-amber-50/50 rounded"
                                        >
                                          {row.desc}
                                        </td>
                                        <td
                                          contentEditable
                                          suppressContentEditableWarning
                                          onFocus={saveSelection}
                                          onBlur={(e) => {
                                            const rows = [...(el.data?.tableRows || [])];
                                            rows[rIdx] = { ...rows[rIdx], qty: e.currentTarget.innerText };
                                            updateElementData(el.id, "tableRows", rows);
                                          }}
                                          className="p-1.5 text-center font-semibold outline-none hover:bg-amber-50/50 rounded"
                                        >
                                          {row.qty}
                                        </td>
                                        <td
                                          contentEditable
                                          suppressContentEditableWarning
                                          onFocus={saveSelection}
                                          onBlur={(e) => {
                                            const rows = [...(el.data?.tableRows || [])];
                                            rows[rIdx] = { ...rows[rIdx], price: e.currentTarget.innerText };
                                            updateElementData(el.id, "tableRows", rows);
                                          }}
                                          className="p-1.5 text-right font-mono outline-none hover:bg-amber-50/50 rounded"
                                        >
                                          {row.price}
                                        </td>
                                        <td
                                          contentEditable
                                          suppressContentEditableWarning
                                          onFocus={saveSelection}
                                          onBlur={(e) => {
                                            const rows = [...(el.data?.tableRows || [])];
                                            rows[rIdx] = { ...rows[rIdx], total: e.currentTarget.innerText };
                                            updateElementData(el.id, "tableRows", rows);
                                          }}
                                          className="p-1.5 text-right font-mono font-bold outline-none hover:bg-amber-50/50 rounded"
                                        >
                                          {row.total}
                                        </td>
                                        <td className="no-print p-1 text-center">
                                          <button
                                            type="button"
                                            onClick={() => removeTableRow(el.id, rIdx)}
                                            className="text-slate-400 hover:text-rose-600 font-bold text-xs"
                                            title="Delete row"
                                          >
                                            ✕
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-50 font-black border-t border-slate-900">
                                      <td colSpan={3} className="p-1.5 text-center font-black tracking-wider">TOTAL</td>
                                      <td
                                        contentEditable
                                        suppressContentEditableWarning
                                        onFocus={saveSelection}
                                        onInput={(e) => handleFieldInput(el.id, "tableTotal", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "tableTotal", e.currentTarget.innerText)}
                                        className="p-1.5 text-right font-mono font-black outline-none hover:bg-amber-50/50 rounded"
                                      >
                                        {el.data?.tableTotal || "PHP 35,934.00"}
                                      </td>
                                      <td className="no-print"></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              <button
                                type="button"
                                onClick={() => addTableRow(el.id)}
                                className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                              >
                                + Add Item Row
                              </button>

                              {el.data?.justificationText1 && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "justificationText1", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "justificationText1", el.data?.justificationText1, e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {resolveCompanyTokens(el.data.justificationText1, selectedCompany)}
                                </p>
                              )}

                              {el.data?.justificationText2 && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "justificationText2", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "justificationText2", el.data?.justificationText2, e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {resolveCompanyTokens(el.data.justificationText2, selectedCompany)}
                                </p>
                              )}

                              {el.data?.closingRequest && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "closingRequest", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "closingRequest", el.data?.closingRequest, e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition"
                                >
                                  {resolveCompanyTokens(el.data.closingRequest, selectedCompany)}
                                </p>
                              )}

                              {el.data?.thankYouText && (
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "thankYouText", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "thankYouText", el.data?.thankYouText, e.currentTarget.innerText)}
                                  className="text-justify outline-none hover:bg-amber-50/20 rounded p-1 transition font-medium"
                                >
                                  {resolveCompanyTokens(el.data.thankYouText, selectedCompany)}
                                </p>
                              )}
                            </div>
                          ) : el.variant === "body_rewards_voucher" ? (
                            <div className="space-y-4 my-3 select-text">
                              <div className="text-center">
                                <h3
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-base font-black uppercase tracking-wider text-slate-900 outline-none hover:bg-amber-50/50 rounded px-2 inline-block"
                                >
                                  {resolveCompanyTokens(el.data?.title || "CERTIFICATE OF MERIT & INCENTIVE VOUCHER", selectedCompany)}
                                </h3>
                              </div>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "citation", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "citation", el.data?.citation, e.currentTarget.innerText)}
                                className="text-justify leading-relaxed text-slate-800 outline-none hover:bg-amber-50/30 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.citation || "", selectedCompany)}
                              </p>

                              <div className="p-4 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 text-slate-900 shadow-2xs">
                                <div className="flex justify-between items-center border-b border-amber-300 pb-2 mb-2">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "voucherHeader", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "voucherHeader", e.currentTarget.innerText)}
                                    className="text-[11px] font-black uppercase tracking-widest text-amber-900 outline-none hover:bg-white/50 rounded px-1"
                                  >
                                    {el.data?.voucherHeader || "Corporate Incentive Merit Voucher"}
                                  </span>
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "voucherCode", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "voucherCode", e.currentTarget.innerText)}
                                    className="font-mono text-xs font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded border border-amber-300 outline-none hover:bg-white"
                                  >
                                    {el.data?.voucherCode || "VCH-2026-REWARD"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monetary Grant</span>
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onInput={(e) => handleFieldInput(el.id, "voucherAmount", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "voucherAmount", e.currentTarget.innerText)}
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
                                      onFocus={saveSelection}
                                      onInput={(e) => handleFieldInput(el.id, "voucherValidity", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "voucherValidity", e.currentTarget.innerText)}
                                      className="font-bold text-xs text-slate-700 outline-none hover:bg-white/50 rounded transition"
                                    >
                                      {el.data?.voucherValidity || "Valid within 60 days"}
                                    </div>
                                  </div>
                                </div>
                                <p
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "voucherTerms", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "voucherTerms", e.currentTarget.innerText)}
                                  className="text-[10px] text-slate-500 italic mt-2 pt-1 border-t border-amber-200 outline-none hover:bg-white/50 rounded px-1"
                                >
                                  {el.data?.voucherTerms || "Redeemable at Central Finance Depot."}
                                </p>
                              </div>
                            </div>
                          ) : el.variant === "body_numbered_directives" ? (
                            <div className="space-y-2 my-3 select-text">
                              <h4
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                className="text-xs font-black uppercase tracking-wider text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1"
                              >
                                {resolveCompanyTokens(el.data?.title || "DIRECTIVES", selectedCompany)}
                              </h4>
                              <ol className="list-decimal list-inside space-y-1.5 text-xs text-justify leading-relaxed">
                                {(el.data?.items || [
                                  "Strict adherence to official timekeeping and biometric verification schedules.",
                                  "Immediate cash handover and zero-float remittal at the end of each drawing shift.",
                                  "Mandatory wearing of official company uniform and valid identification cards on premises.",
                                  "Prohibition of unauthorized visitors or former personnel within cash teller enclosures."
                                ]).map((it, idx) => (
                                  <li key={idx} className="text-slate-800 font-semibold relative group/it">
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onFocus={saveSelection}
                                      onInput={(e) => {
                                        const target = paperElements.find((item) => item.id === el.id);
                                        if (target && target.data) {
                                          if (!Array.isArray(target.data.items)) {
                                            target.data.items = [...(el.data?.items || [])];
                                          }
                                          target.data.items[idx] = e.currentTarget.innerText;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const newItems = [...(el.data?.items || [
                                          "Strict adherence to official timekeeping and biometric verification schedules.",
                                          "Immediate cash handover and zero-float remittal at the end of each drawing shift.",
                                          "Mandatory wearing of official company uniform and valid identification cards on premises.",
                                          "Prohibition of unauthorized visitors or former personnel within cash teller enclosures."
                                        ])];
                                        newItems[idx] = e.currentTarget.innerText;
                                        updateElementData(el.id, "items", newItems);
                                      }}
                                      className="outline-none hover:bg-amber-50/50 rounded px-1"
                                    >
                                      {resolveCompanyTokens(it, selectedCompany)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeDirectiveItem(el.id, idx)}
                                      className="no-print hidden group-hover/it:inline-block text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1 ml-1"
                                      title="Remove directive item"
                                    >
                                      ✕
                                    </button>
                                  </li>
                                ))}
                              </ol>
                              <button
                                type="button"
                                onClick={() => addDirectiveItem(el.id)}
                                className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                              >
                                + Add Directive Item
                              </button>
                            </div>
                          ) : el.variant === "body_warning_callout" ? (
                            <div className="p-3.5 rounded-xl border-l-4 border-rose-600 bg-rose-50/60 my-3 space-y-1 select-text">
                              <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs uppercase tracking-wider">
                                <AlertTriangle size={15} />
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "boxTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "boxTitle", e.currentTarget.innerText)}
                                  className="outline-none hover:bg-rose-100 rounded px-1"
                                >
                                  {resolveCompanyTokens(el.data?.boxTitle || "COMPLIANCE NOTICE", selectedCompany)}
                                </span>
                              </div>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "boxMessage", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "boxMessage", e.currentTarget.innerText)}
                                className="text-xs text-rose-950 font-semibold leading-relaxed text-justify outline-none hover:bg-rose-100 rounded p-1"
                              >
                                {resolveCompanyTokens(el.data?.boxMessage || "", selectedCompany)}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 my-3 select-text">
                              {(el.data?.title || el.data?.title === "") && (
                                <h3
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-sm font-black uppercase tracking-wider text-slate-900 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                                >
                                  {resolveCompanyTokens(el.data.title, selectedCompany)}
                                </h3>
                              )}
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "bodyText", e.currentTarget.innerHTML)} onBlur={(e) => updateElementData(el.id, "bodyText", e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{
                                  __html: resolveCompanyTokens(el.data?.bodyText || "", selectedCompany)
                                }}
                                style={{ whiteSpace: "pre-line", textAlign: "justify" }}
                                className="text-justify leading-relaxed text-slate-800 whitespace-pre-line outline-none hover:bg-amber-50/20 rounded p-1 transition"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Signatory Blocks */}
                      {el.category === "signatory" && (
                        <div>
                          {el.variant === "sig_dual_executive" && (
                            <div className="grid grid-cols-2 gap-8 text-xs pt-8 mt-6 border-t border-slate-200 select-text">
                              <div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "leftLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "leftLabel", e.currentTarget.innerText)}
                                  className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8 outline-none hover:bg-amber-50/50 rounded inline-block"
                                >
                                  {el.data?.leftLabel || "Prepared & Certified by:"}
                                </div>
                                <div className="w-60 border-b-2 border-slate-900 pb-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "leftName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "leftName", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.leftName || "JEVINCE JAYE S. JUBAY, CHRP"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "leftTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "leftTitle", e.currentTarget.innerText)}
                                  className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.leftTitle || "HRMD Manager"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "leftCompany", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "leftCompany", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.leftCompany || selectedCompany.name, selectedCompany)}
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "rightLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "rightLabel", e.currentTarget.innerText)}
                                  className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8 outline-none hover:bg-amber-50/50 rounded inline-block"
                                >
                                  {el.data?.rightLabel || "Approved & Confirmed by:"}
                                </div>
                                <div className="w-60 border-b-2 border-slate-900 pb-1 text-right">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "rightName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "rightName", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.rightName || "CHARMIE JEAN M. SIMPAL"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "rightTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "rightTitle", e.currentTarget.innerText)}
                                  className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.rightTitle || "President & CEO"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "rightCompany", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "rightCompany", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.rightCompany || selectedCompany.name, selectedCompany)}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_single_official" && (
                            <div className="pt-8 mt-6 border-t border-slate-200 max-w-xs text-xs select-text">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "label", e.currentTarget.innerText)}
                                className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mb-8 outline-none hover:bg-amber-50/50 rounded inline-block"
                              >
                                {el.data?.label || "Issued & Certified by:"}
                              </div>
                              <div className="w-60 border-b-2 border-slate-900 pb-1">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                  className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.name || "JEVINCE JAYE S. JUBAY, CHRP"}
                                </div>
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                className="text-slate-600 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                              >
                                {el.data?.title || "HRMD Manager"}
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "company", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "company", e.currentTarget.innerText)}
                                className="text-slate-500 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                              >
                                {resolveCompanyTokens(el.data?.company || selectedCompany.name, selectedCompany)}
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_triple_authority" && (
                            <div className="grid grid-cols-3 gap-4 text-xs pt-8 mt-6 border-t border-slate-200 select-text">
                              <div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col1Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col1Label", e.currentTarget.innerText)}
                                  className="font-bold text-slate-500 uppercase text-[10px] mb-6 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col1Label || "Prepared by:"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col1Name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col1Name", e.currentTarget.innerText)}
                                  className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col1Name || "JEVINCE JAYE S. JUBAY, CHRP"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col1Title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col1Title", e.currentTarget.innerText)}
                                  className="text-slate-500 text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col1Title || "HRMD Manager"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col1Company", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col1Company", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[9px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.col1Company || selectedCompany.name, selectedCompany)}
                                </div>
                              </div>
                              <div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col2Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col2Label", e.currentTarget.innerText)}
                                  className="font-bold text-slate-500 uppercase text-[10px] mb-6 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col2Label || "Noted by:"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col2Name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col2Name", e.currentTarget.innerText)}
                                  className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col2Name || "ATTY. REGIONAL COUNSEL"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col2Title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col2Title", e.currentTarget.innerText)}
                                  className="text-slate-500 text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col2Title || "Corporate Legal Counsel"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col2Company", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col2Company", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[9px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.col2Company || selectedCompany.name, selectedCompany)}
                                </div>
                              </div>
                              <div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col3Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col3Label", e.currentTarget.innerText)}
                                  className="font-bold text-slate-500 uppercase text-[10px] mb-6 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col3Label || "Approved by:"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col3Name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col3Name", e.currentTarget.innerText)}
                                  className="border-b border-slate-800 pb-1 font-black text-slate-900 text-xs outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col3Name || "CHARMIE JEAN M. SIMPAL"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col3Title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col3Title", e.currentTarget.innerText)}
                                  className="text-slate-500 text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.col3Title || "President & CEO"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "col3Company", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col3Company", e.currentTarget.innerText)}
                                  className="text-slate-500 font-bold uppercase text-[9px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.col3Company || selectedCompany.name, selectedCompany)}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_receiving_acknowledgment" && (
                            <div className="border-t-2 border-dashed border-slate-400 pt-3 my-4 text-xs select-text">
                              <div className="flex justify-between items-center pb-1.5 mb-2">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "stubTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "stubTitle", e.currentTarget.innerText)}
                                  className="font-black uppercase tracking-wider text-slate-900 text-[11px] outline-none hover:bg-amber-50/50 rounded px-1"
                                >
                                  {el.data?.stubTitle || "ACKNOWLEDGMENT & RECEIVING SLIP"}
                                </span>
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "stubSubtitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "stubSubtitle", e.currentTarget.innerText)}
                                  className="font-mono text-[10px] text-slate-500 font-bold outline-none hover:bg-amber-50/50 rounded px-1"
                                >
                                  {el.data?.stubSubtitle || `${selectedCompany.code} Copy • Return to HRMD`}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 pt-4 text-[11px]">
                                <div className="border-b border-slate-900 pb-1">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "col1Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col1Label", e.currentTarget.innerText)}
                                    className="text-slate-400 block text-[9px] uppercase font-bold outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.col1Label || "Received by (Printed Name):"}
                                  </span>
                                </div>
                                <div className="border-b border-slate-900 pb-1">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "col2Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col2Label", e.currentTarget.innerText)}
                                    className="text-slate-400 block text-[9px] uppercase font-bold outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.col2Label || "Official Signature:"}
                                  </span>
                                </div>
                                <div className="border-b border-slate-900 pb-1">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "col3Label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "col3Label", e.currentTarget.innerText)}
                                    className="text-slate-400 block text-[9px] uppercase font-bold outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.col3Label || "Date & Time Received:"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_staff_requestor" && (
                            <div className="pt-6 my-4 max-w-xs text-xs select-text space-y-7">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "closeLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "closeLabel", e.currentTarget.innerText)}
                                className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.closeLabel || "Sincerely yours,"}
                              </div>
                              <div className="space-y-0.5">
                                <div className="w-56 border-b-2 border-slate-900 pb-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs tracking-wide outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.name || "QUENNIE R. CAPUYAN"}
                                  </div>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="text-slate-700 font-semibold text-[11px] mt-0.5 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.title || "Human Resource Staff"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onBlur={(e) => {
                                    const next = e.currentTarget.innerText.trim();
                                    const fallback = (selectedCompany.name || selectedCompany.legalName || "").trim();
                                    handleTokenAwareBlur(el.id, "company", el.data?.company, next === fallback ? "" : next, fallback);
                                  }}
                                  className="text-slate-500 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.company || selectedCompany.name || selectedCompany.legalName, selectedCompany)}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_operations_manager" && (
                            <div className="pt-6 my-4 text-xs select-text space-y-7">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "closeLabel", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "closeLabel", e.currentTarget.innerText)}
                                className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {el.data?.closeLabel || "Sincerely,"}
                              </div>
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                  className="font-black text-xs uppercase text-slate-950 tracking-wider outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {el.data?.title || "OPERATIONS MANAGER"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "company", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "company", e.currentTarget.innerText)}
                                  className="text-slate-600 font-bold uppercase text-[10px] px-1 outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.company || selectedCompany.name || selectedCompany.legalName, selectedCompany)}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "sig_nte_with_acknowledgment" && (
                            <div className="pt-6 my-4 text-xs select-text space-y-8">
                              <div className="space-y-0.5">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "issuerName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "issuerName", e.currentTarget.innerText)}
                                  className="font-black text-xs uppercase text-slate-950 underline decoration-slate-950 decoration-1 underline-offset-2 outline-none hover:bg-amber-50/50 rounded inline-block"
                                >
                                  {el.data?.issuerName || "JULIE E. ALMANO"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "issuerTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "issuerTitle", e.currentTarget.innerText)}
                                  className="text-slate-700 font-semibold text-[11px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.issuerTitle || "HR Salesforce Specialist"}
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "issuerCompany", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "issuerCompany", e.currentTarget.innerText)}
                                  className="text-slate-600 font-bold uppercase text-[10px] outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {resolveCompanyTokens(el.data?.issuerCompany || selectedCompany.name || selectedCompany.legalName, selectedCompany)}
                                </div>
                              </div>

                              <div className="space-y-6 pt-2">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "ackHeading", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "ackHeading", e.currentTarget.innerText)}
                                  className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded"
                                >
                                  {el.data?.ackHeading || "Received & acknowledged by:"}
                                </div>

                                <div className="space-y-1">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "recipientName", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "recipientName", e.currentTarget.innerText)}
                                    className="font-black text-xs uppercase text-slate-950 outline-none hover:bg-amber-50/50 rounded inline-block"
                                  >
                                    {el.data?.recipientName || "JOEVERT SUDSUD"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "recipientTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "recipientTitle", e.currentTarget.innerText)}
                                    className="text-slate-600 text-[11px] outline-none hover:bg-amber-50/50 rounded"
                                  >
                                    {el.data?.recipientTitle || "Signature Over Printed Name"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "dateLine", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "dateLine", e.currentTarget.innerText)}
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
                              <div className="border-b border-slate-300 my-4" />

                              <div className="space-y-6">
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "label", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "label", e.currentTarget.innerText)}
                                  className="text-slate-800 text-xs font-semibold outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                >
                                  {el.data?.label || "Certified by:"}
                                </div>

                                <div className="space-y-0.5">
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "name", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "name", e.currentTarget.innerText)}
                                    className="font-black text-slate-950 uppercase text-xs sm:text-sm tracking-wide outline-none hover:bg-amber-50/50 rounded px-1 inline-block"
                                  >
                                    {el.data?.name || "QUENNIE R. CAPUYAN"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "title", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "title", e.currentTarget.innerText)}
                                    className="text-slate-700 font-semibold text-[11px] sm:text-xs outline-none hover:bg-amber-50/50 rounded px-1"
                                  >
                                    {el.data?.title || "Human Resource Staff"}
                                  </div>
                                  <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onBlur={(e) => {
                                      const next = e.currentTarget.innerText.trim();
                                      const fallback = (selectedCompany.name || selectedCompany.legalName || "").trim();
                                      handleTokenAwareBlur(el.id, "company", el.data?.company, next === fallback ? "" : next, fallback);
                                    }}
                                    className="text-slate-600 font-bold uppercase text-[10px] sm:text-[11px] outline-none hover:bg-amber-50/50 rounded px-1"
                                  >
                                    {resolveCompanyTokens(el.data?.company || selectedCompany.name || selectedCompany.legalName, selectedCompany)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. Footers & Notarial */}
                      {el.category === "footer" && (
                        <div>
                          {el.variant === "footer_notary_jurat" && (
                            <div className="pt-4 border-t border-slate-300 text-xs text-slate-700 space-y-1.5 mt-6 select-text">
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "juratCountry", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "juratCountry", e.currentTarget.innerText)}
                                className="font-bold outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {el.data?.juratCountry || "REPUBLIC OF THE PHILIPPINES )"}
                              </p>
                              <br />
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "juratCity", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "juratCity", e.currentTarget.innerText)}
                                className="font-bold outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {el.data?.juratCity || "PROVINCE OF CEBU, MANDAUE CITY ) S.S."}
                              </p>
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "juratBody", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "juratBody", e.currentTarget.innerText)}
                                className="text-justify leading-relaxed outline-none hover:bg-amber-50/50 rounded p-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.juratBody || `SUBSCRIBED AND SWORN to before me this _____ day of _______________ ${el.data?.docYear || "2026"} at ${el.data?.city || "Mandaue City, Cebu"}, affiant exhibiting competent evidence of identity.`, selectedCompany)}
                              </p>
                              <div className="flex justify-between items-end pt-5">
                                <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "docLine1", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "docLine1", e.currentTarget.innerText)}
                                    className="outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                  >
                                    {el.data?.docLine1 || "Doc. No. ____; Page No. ____;"}
                                  </p>
                                  <br />
                                  <p
                                    contentEditable
                                    suppressContentEditableWarning
                                    onFocus={saveSelection}
                                    onInput={(e) => handleFieldInput(el.id, "docLine2", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "docLine2", e.currentTarget.innerText)}
                                    className="outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                                  >
                                    {resolveCompanyTokens(el.data?.docLine2 || `Book No. ____; Series of ${el.data?.docYear || "2026"}.`, selectedCompany)}
                                  </p>
                                </div>
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "notaryTitle", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "notaryTitle", e.currentTarget.innerText)}
                                  className="text-center w-56 border-t border-slate-900 pt-1 font-bold text-xs outline-none hover:bg-amber-50/50 rounded transition"
                                >
                                  {el.data?.notaryTitle || "NOTARY PUBLIC"}
                                </div>
                              </div>
                            </div>
                          )}

                          {el.variant === "footer_corporate_security" && (
                            <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between gap-3 text-[10px] text-slate-500 font-mono select-text">
                              <div className="flex items-center gap-1.5 flex-1">
                                <Shield size={12} className="text-emerald-700 shrink-0" />
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onFocus={saveSelection}
                                  onInput={(e) => handleFieldInput(el.id, "noticeText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "noticeText", e.currentTarget.innerText)}
                                  className="outline-none hover:bg-amber-50/50 rounded px-1 transition flex-1"
                                >
                                  {resolveCompanyTokens(el.data?.noticeText || "This document is an authentic corporate instrument issued by [COMPANY_NAME] via HrHub Corporate System.", selectedCompany)}
                                </span>
                              </div>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "docCode", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "docCode", e.currentTarget.innerText)}
                                className="font-bold text-slate-700 shrink-0 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.docCode || "[COMPANY_CODE]-VERIFIED-2026", selectedCompany)}
                              </span>
                            </div>
                          )}

                          {el.variant === "footer_contact_hotline" && (
                            <div className="border-t border-slate-200 pt-2 mt-4 text-center text-[10px] text-slate-500 font-semibold select-text">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "footerText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "footerText", e.currentTarget.innerText)}
                                className="outline-none hover:bg-amber-50/50 rounded px-1 transition inline-block"
                              >
                                {resolveCompanyTokens(el.data?.footerText || `${el.data?.hotline || selectedCompany.contact || selectedCompany.address} • ${el.data?.email || `${selectedCompany.legalName || selectedCompany.name} Official Records`}`, selectedCompany)}
                              </span>
                            </div>
                          )}

                          {el.variant === "footer_page_tracker" && (
                            <div className="border-t border-slate-200 pt-1.5 mt-4 flex justify-between text-[9px] text-slate-400 font-mono select-text">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "formCode", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "formCode", e.currentTarget.innerText)}
                                className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.formCode || "[COMPANY_CODE]-FORM-HRD-2026-REV03", selectedCompany)}
                              </span>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "companyText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "companyText", e.currentTarget.innerText)}
                                className="font-semibold text-slate-500 outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.companyText || selectedCompany.name, selectedCompany)}
                              </span>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "pageText", e.currentTarget.innerText)} onBlur={(e) => updateElementData(el.id, "pageText", e.currentTarget.innerText)}
                                className="outline-none hover:bg-amber-50/50 rounded px-1 transition"
                              >
                                {resolveCompanyTokens(el.data?.pageText || "Page 1 of 1", selectedCompany)}
                              </span>
                            </div>
                          )}

                          {el.variant === "footer_division_center" && (
                            <div className="pt-2 mt-3 border-t border-slate-300 text-center text-[10.5px] text-slate-500 font-black tracking-widest uppercase select-text">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={saveSelection}
                                onInput={(e) => handleFieldInput(el.id, "divisionText", e.currentTarget.innerText)} onBlur={(e) => handleTokenAwareBlur(el.id, "divisionText", el.data?.divisionText, e.currentTarget.innerText, "[COMPANY_NAME] • HUMAN RESOURCE MANAGEMENT DIVISION")}
                                className="outline-none hover:bg-amber-50/50 rounded px-2 transition inline-block"
                              >
                                {resolveCompanyTokens(el.data?.divisionText || "[COMPANY_NAME] • HUMAN RESOURCE MANAGEMENT DIVISION", selectedCompany)}
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

        {/* Slide-over Palette Drawer Backdrop */}
        {isPaletteDrawerOpen && (
          <div
            className={`no-print fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 transition-opacity duration-300 ${
              isDraggingItem ? "pointer-events-none opacity-20" : ""
            }`}
            onClick={() => setIsPaletteDrawerOpen(false)}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          />
        )}

        {/* Floating Drawer Trigger Pill when drawer is closed (nudged slightly inward) */}
        {!isPaletteDrawerOpen && (
          <button
            type="button"
            onClick={() => setIsPaletteDrawerOpen(true)}
            className="no-print fixed right-1.5 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-2 py-3.5 rounded-l-2xl shadow-2xl border-l-2 border-y-2 border-amber-300 flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer group hover:pr-3"
            title="Open Elements &amp; Templates Palette Drawer"
          >
            <Layers size={17} className="group-hover:scale-110 transition-transform text-slate-950" />
            <span
              className="text-[10px] tracking-wider uppercase font-black text-slate-950"
              style={{ writingMode: "vertical-rl" }}
            >
              Elements Palette
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          </button>
        )}

        <aside
          className={`no-print fixed inset-y-0 right-0 z-50 w-full ${
            paletteDrawerWidth === "compact"
              ? "sm:w-[410px] md:w-[420px] lg:w-[420px]"
              : "sm:w-[480px] md:w-[500px] lg:w-[510px]"
          } max-w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full max-h-screen overscroll-contain transform transition-transform duration-300 ease-in-out ${
            isPaletteDrawerOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
          }`}
          onWheel={(e) => e.stopPropagation()}
        >
          {isPaletteDrawerOpen && (
            <button
              type="button"
              onClick={() => setIsPaletteDrawerOpen(false)}
              className="no-print absolute -left-7 top-1/2 -translate-y-1/2 z-50 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white px-1.5 py-3.5 rounded-l-xl shadow-xl border-l border-y border-slate-700 hidden sm:flex items-center justify-center cursor-pointer transition-colors animate-in fade-in duration-200"
              title="Collapse Palette Drawer"
            >
              <ChevronRight size={18} />
            </button>
          )}
          {/* Drawer Top Header with Title, Width Toggle and Close button */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white leading-tight">Modular Elements Palette</h3>
                <p className="text-[11px] text-amber-300/90 font-medium">Drag or click &quot;+ Add to Paper&quot;</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaletteDrawerWidth((prev) => (prev === "compact" ? "normal" : "compact"))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title={paletteDrawerWidth === "compact" ? "Expand Palette (510px)" : "Compact Palette (410px)"}
              >
                <Columns size={14} />
                <span className="text-[11px] hidden sm:inline">{paletteDrawerWidth === "compact" ? "510px" : "410px"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPaletteDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Close Palette Drawer (Esc)"
              >
                <X size={16} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
          {/* 3-Column x 2-Row Ribbon Tabs: Guarantees Footer & Templates are ALWAYS visible */}
          <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 grid grid-cols-3 gap-1.5 shrink-0">
            {[
              { id: "header", label: "Header", icon: Building2 },
              { id: "addressing", label: "Addressing", icon: AlignLeft },
              { id: "body", label: "Directives", icon: FileText },
              { id: "signatory", label: "Signatory", icon: UserCheck },
              { id: "footer", label: "Footer", icon: Scale },
              { id: "custom", label: `Templates (${customTemplates.length})`, icon: Bookmark }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = paletteActiveCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaletteActiveCategory(tab.id)}
                  className={`px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300"
                  }`}
                  title={`Switch to ${tab.label}`}
                >
                  <Icon size={14} className={isActive ? "text-slate-950 shrink-0" : "text-slate-500 shrink-0"} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5 doc-palette-scroll"
            onWheel={(e) => e.stopPropagation()}
            onScroll={(e) => e.stopPropagation()}
          >
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
                      onDragEnd={handlePaletteDragEnd}
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
              <div className="space-y-3">
                {customTemplates.filter((t) => t.category === paletteActiveCategory).map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      setHoveredPreview(null);
                      handlePaletteDragStart(e, item);
                    }}
                    onDragEnd={handlePaletteDragEnd}
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

                {MODULAR_BLOCK_PRESETS.find((c) => c.category === paletteActiveCategory)?.items.map((item) => (
                  <div
                    key={item.variant}
                    draggable
                    onDragStart={(e) => {
                      setHoveredPreview(null);
                      handlePaletteDragStart(e, { ...item, category: paletteActiveCategory });
                    }}
                    onDragEnd={handlePaletteDragEnd}
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

      {templateEditorModal && (
        <TemplateEditorModal
          key={`${templateEditorModal.item?.id || "new"}-${templateEditorModal.item?.category || ""}-${templateEditorModal.item?.variant || ""}-${templateEditorModal.item?.name || ""}`}
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

      {/* Full-Page Custom Print Studio Engine (Reference: Condense Remittance / Custom Print Studio Engine) */}
      {isPrintConfigOpen && typeof document !== "undefined" && createPortal(
        <div className="no-print fixed inset-0 z-[999999] bg-[#070b14] text-slate-100 flex flex-col w-full h-full overflow-hidden select-none animate-in fade-in duration-150">
          {/* Top Header Bar */}
          <header className="h-14 bg-[#0d1527] border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-md w-full">
            <div className="flex items-center gap-3 min-w-0 max-w-[36%] shrink">
              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-600/25 text-blue-300 border border-blue-500/40 font-black text-xs uppercase tracking-wide">
                Print Format Config
              </span>
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-2 truncate">
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Custom Print Studio Engine
                  </span>
                  <span className="shrink-0 text-slate-600">•</span>
                  <span className="text-xs font-black text-white truncate">
                    {docRef || "DOCUMENT"} • {selectedCompany?.name || "LUCKY BETPLAY"} • {docDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Center Zoom / Scale controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2 sm:px-3 py-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setPreviewFitMode("fit-page")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  previewFitMode === "fit-page"
                    ? "bg-blue-600 text-white font-black shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Fit Entire Bond Paper to Screen (Full View)"
              >
                <CheckCircle2 size={13} className={previewFitMode === "fit-page" ? "text-emerald-300" : "opacity-0"} />
                <span>Fit Page ({Math.round(calculatedFitScale * 100)}%)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewFitMode("actual");
                  setPrintPreviewZoom(1.0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  previewFitMode === "actual" && printPreviewZoom === 1.0
                    ? "bg-blue-600 text-white font-black shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="100% Actual Print Size"
              >
                100% Actual
              </button>

              <div className="h-4 w-px bg-slate-800 hidden sm:block" />

              <button
                type="button"
                onClick={() => {
                  setPreviewFitMode("actual");
                  setPrintPreviewZoom((z) => Math.max(0.4, parseFloat((z - 0.1).toFixed(2))));
                }}
                className="text-slate-400 hover:text-white font-black text-sm px-1.5 transition cursor-pointer"
                title="Zoom Out"
              >
                −
              </button>
              <span className="font-mono font-bold text-amber-400 text-xs min-w-[42px] text-center">
                {Math.round(effectivePreviewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setPreviewFitMode("actual");
                  setPrintPreviewZoom((z) => Math.min(1.5, parseFloat((z + 0.1).toFixed(2))));
                }}
                className="text-slate-400 hover:text-white font-black text-sm px-1.5 transition cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {/* Right Action buttons: shrink-0 guaranteed never to be clipped or squished */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => {
                  handleDownloadPdf({
                    paperDef: selectedPaper,
                    marginMode: printMarginMode,
                    reduceTopSpacing: reduceTopSpacingInPrint,
                    colorMode: printColorMode,
                    includeLetterhead: includeLetterheadInPrint,
                    includeSignatures: includeSignaturesInPrint,
                    includeFooter: includeFooterInPrint,
                    includeWatermark: includeWatermarkInPrint,
                    orientation: printOrientation,
                    scale: printCustomScale,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                title="Download 1:1 Clean PDF"
              >
                <Download size={14} className="text-amber-400" />
                <span className="hidden sm:inline">{isExportingPdf ? "Generating..." : "Download PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handlePrintDocument({
                    paperDef: selectedPaper,
                    marginMode: printMarginMode,
                    reduceTopSpacing: reduceTopSpacingInPrint,
                    colorMode: printColorMode,
                    includeLetterhead: includeLetterheadInPrint,
                    includeSignatures: includeSignaturesInPrint,
                    includeFooter: includeFooterInPrint,
                    includeWatermark: includeWatermarkInPrint,
                    orientation: printOrientation,
                    scale: printCustomScale,
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-900/40 transition cursor-pointer active:scale-95 shrink-0"
                title="Send directly to printer or browser print dialog (Ctrl+P)"
              >
                <Printer size={15} />
                <span>Print Document</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintConfigOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 shrink-0 ml-1"
                title="Exit Print Studio (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {/* Studio Body: Left Configuration Sidebar + Center Full Bond Paper Canvas */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden bg-[#070b14]">
            {/* Left Configuration Sidebar */}
            <aside className="w-80 bg-[#0d1527] border-r border-slate-800/90 flex flex-col h-full shrink-0 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
              {/* Card 1: PAPER & MEDIA FORMAT */}
              <div className="bg-[#111c35] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-wider">
                  <FileText size={14} />
                  <span>Paper &amp; Media Format</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Paper Size Preset:
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => {
                      setPaperSize(e.target.value);
                      const targetPaper = PAPER_SIZES.find((p) => p.id === e.target.value);
                      if (targetPaper) {
                        updatePrintModalPreview({ paperDef: targetPaper });
                      }
                    }}
                    className="w-full bg-[#0a1020] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {PAPER_SIZES.map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    {selectedPaper.dimensions} • {selectedPaper.desc || ""}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Orientation:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintOrientation("portrait");
                        updatePrintModalPreview({ orientation: "portrait" });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        printOrientation === "portrait"
                          ? "bg-blue-600 text-white font-black shadow-xs"
                          : "bg-[#0a1020] text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      Portrait (Vertical)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintOrientation("landscape");
                        updatePrintModalPreview({ orientation: "landscape" });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        printOrientation === "landscape"
                          ? "bg-blue-600 text-white font-black shadow-xs"
                          : "bg-[#0a1020] text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: MARGINS & SPACING */}
              <div className="bg-[#111c35] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <Sliders size={14} />
                  <span>Margins &amp; Spacing</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Page Margins:
                  </label>
                  <select
                    value={printMarginMode}
                    onChange={(e) => {
                      setPrintMarginMode(e.target.value);
                      updatePrintModalPreview({ marginMode: e.target.value });
                    }}
                    className="w-full bg-[#0a1020] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="standard">Standard (1.0 in / 25mm)</option>
                    <option value="compact">Compact (0.75 in / 19mm)</option>
                    <option value="narrow">Narrow (0.50 in / 12mm)</option>
                  </select>
                </div>

                <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-slate-800 bg-[#0a1020] p-2.5">
                  <input
                    type="checkbox"
                    checked={reduceTopSpacingInPrint}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setReduceTopSpacingInPrint(enabled);
                      updatePrintModalPreview({ reduceTopSpacing: enabled });
                    }}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span>
                    <span className="block text-xs font-bold text-white">Reduce extra space at top</span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">
                      Keeps the other margins and moves the printed content closer to the top edge.
                    </span>
                  </span>
                </label>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Line Spacing (Density):
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { val: "1.15", label: "1.15" },
                      { val: "1.25", label: "1.25" },
                      { val: "1.40", label: "1.40" },
                      { val: "1.55", label: "1.55" }
                    ].map((ls) => (
                      <button
                        key={ls.val}
                        type="button"
                        onClick={() => {
                          handleSetLineHeight(ls.val);
                          updatePrintModalPreview();
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                          docLineHeight === ls.val
                            ? "bg-emerald-600 text-white font-black"
                            : "bg-[#0a1020] text-slate-400 hover:text-white border border-slate-800"
                        }`}
                        title={`Line Height ${ls.val}`}
                      >
                        {ls.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: FIT & SCALE MODE */}
              <div className="bg-[#111c35] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Layout size={14} />
                  <span>Fit &amp; Scale Mode</span>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printCustomScale === 100}
                    onChange={(e) => {
                      const next = e.target.checked ? 100 : 95;
                      setPrintCustomScale(next);
                      updatePrintModalPreview({ scale: next });
                    }}
                    className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white text-xs block">Smart Auto-Fit to 1 Single Page</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Standard 100% scale (Content flows naturally across paper)
                    </span>
                  </div>
                </label>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Custom Scale:</span>
                    <span className="text-amber-400 font-mono font-bold">{printCustomScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="120"
                    step="5"
                    value={printCustomScale}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPrintCustomScale(val);
                      updatePrintModalPreview({ scale: val });
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Card 4: SECTIONS VISIBILITY & STYLE */}
              <div className="bg-[#111c35] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
                  <Layers size={14} />
                  <span>Sections Visibility &amp; Style</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLetterheadInPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeLetterheadInPrint(val);
                        updatePrintModalPreview({ includeLetterhead: val });
                      }}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">Header Banner &amp; Letterhead</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSignaturesInPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeSignaturesInPrint(val);
                        updatePrintModalPreview({ includeSignatures: val });
                      }}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">Signatures Block</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFooterInPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeFooterInPrint(val);
                        updatePrintModalPreview({ includeFooter: val });
                      }}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">Audit / Legal Footer Timestamp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWatermarkInPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIncludeWatermarkInPrint(val);
                        updatePrintModalPreview({ includeWatermark: val });
                      }}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">Official Security Watermark</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
                    Color Output Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintColorMode("color");
                        updatePrintModalPreview({ colorMode: "color" });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        printColorMode === "color"
                          ? "bg-blue-600 text-white font-black shadow-xs"
                          : "bg-[#0a1020] text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      Full Color
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintColorMode("monochrome");
                        updatePrintModalPreview({ colorMode: "monochrome" });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        printColorMode === "monochrome"
                          ? "bg-blue-600 text-white font-black shadow-xs"
                          : "bg-[#0a1020] text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      Monochrome / B&amp;W
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Reset Settings Button */}
              <button
                type="button"
                onClick={() => {
                  setPaperSize("letter");
                  setPrintMarginMode("standard");
                  setReduceTopSpacingInPrint(false);
                  setPrintColorMode("color");
                  setPrintOrientation("portrait");
                  setPrintCustomScale(100);
                  setPrintPreviewZoom(1.0);
                  setPreviewFitMode("fit-page");
                  setIncludeLetterheadInPrint(true);
                  setIncludeSignaturesInPrint(true);
                  setIncludeFooterInPrint(true);
                  setIncludeWatermarkInPrint(true);
                  handleSetLineHeight("1.55");
                  triggerToast("✓ Reset settings to default standard bond paper format", "info");
                }}
                className="w-full py-2.5 rounded-xl border border-slate-800 bg-[#111c35] hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer text-center mt-2"
              >
                Reset Settings to Defaults
              </button>
            </aside>

            {/* Center Main Canvas: Dynamic Fit or Actual Bond Paper Preview */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-auto p-4 sm:p-8 flex items-center justify-center bg-[#070b14] overscroll-contain">
              <div
                className="flex items-center justify-center transition-all duration-150 shrink-0 my-auto"
                style={{
                  width: `${(printOrientation === "landscape" ? effectivePageHeightPx : currentPaperDef.widthPx) * effectivePreviewZoom}px`,
                  height: `${(printOrientation === "landscape" ? currentPaperDef.widthPx : effectivePageHeightPx) * effectivePreviewZoom}px`,
                }}
              >
                <div
                  className="relative bg-white shadow-2xl rounded-sm transition-transform duration-150 origin-top-left shrink-0"
                  style={{
                    width: `${printOrientation === "landscape" ? effectivePageHeightPx : currentPaperDef.widthPx}px`,
                    height: `${printOrientation === "landscape" ? currentPaperDef.widthPx : effectivePageHeightPx}px`,
                    minHeight: `${printOrientation === "landscape" ? currentPaperDef.widthPx : effectivePageHeightPx}px`,
                    maxHeight: `${printOrientation === "landscape" ? currentPaperDef.widthPx : effectivePageHeightPx}px`,
                    transform: `scale(${effectivePreviewZoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  {paperElements.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-sm space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs border border-amber-200">
                        <Layout size={32} />
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h3 className="text-base font-black text-slate-900">
                          Document Canvas is Currently Empty
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          No document elements have been placed on the bond paper yet. Load an official template preset below to preview and print immediately:
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full pt-2">
                        <button
                          type="button"
                          onClick={() => handleLoadFullDocumentPreset("non_affiliation_salesforce")}
                          className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left font-bold text-xs text-blue-900 transition cursor-pointer flex items-center gap-2"
                        >
                          <Shield size={16} className="text-blue-600 shrink-0" />
                          <span>🛡️ Non-Affiliation Letter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadFullDocumentPreset("termination_operations")}
                          className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-left font-bold text-xs text-rose-900 transition cursor-pointer flex items-center gap-2"
                        >
                          <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                          <span>📋 Termination Notice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadFullDocumentPreset("rewards_voucher")}
                          className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-left font-bold text-xs text-amber-900 transition cursor-pointer flex items-center gap-2"
                        >
                          <Award size={16} className="text-amber-600 shrink-0" />
                          <span>🏆 Rewards &amp; Voucher</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadFullDocumentPreset("letter_of_explain")}
                          className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-left font-bold text-xs text-purple-900 transition cursor-pointer flex items-center gap-2"
                        >
                          <FileText size={16} className="text-purple-600 shrink-0" />
                          <span>📝 Explanation Letter</span>
                        </button>
                      </div>
                    </div>
                  ) : printModalPreviewHtml ? (
                    <iframe
                      srcDoc={printModalPreviewHtml}
                      title="Full Page Live Bond Paper Print Preview"
                      className="w-full h-full border-0 bg-white pointer-events-none select-none rounded-sm"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                      Rendering Live Bond Paper Preview...
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
