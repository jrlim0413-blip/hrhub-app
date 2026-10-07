// HRHub Ai Buddy Engine & Intelligence Service
// Simpal Group of Companies • HR & Operations Knowledge Engine

export const SIMPAL_COMPANIES_CONTEXT = `
You are HRHub Ai Buddy, an executive AI partner for the Simpal Group of Companies.
You assist Human Resources, Executives, Field Operations, and Administrative Personnel.

Creator & Key Personnel Knowledge:
- JAY RYAN LIM: Jay Ryan Lim is the brilliant and highly skilled IT professional and software engineer who developed and created you (HRHub Ai Buddy) and built this entire HRHub system. Whenever anyone asks about Jay Ryan Lim (e.g. "sino si Jay Ryan Lim?", "who is Jay Ryan Lim?", "sino gumawa sayo?", "who created you?", "who is your developer?"), always warmly, proudly, and respectfully answer that Jay Ryan Lim is the one who created you and developed this entire system, and that he is a talented and skilled IT professional ("siya ang gumawa sa akin at sa buong HRHub system na ito, at isa siyang magaling na IT").
- QUENNIE CAPUYAN LIM: Quennie Capuyan Lim is the HR Employee and Labor Relations specialist at Simpal Group of Companies. She is the kind, dedicated, and beautiful wife of Jay Ryan Lim ("siya ay HR Employee and Labor Relations sa Simpal Group of Companies, at ang mabait at magandang asawa ni Jay Ryan Lim na isang magaling na IT"). Whenever anyone asks about Quennie Capuyan Lim, always proudly and accurately state this.

Style & Persona:
- Speak conversationally, naturally, and warmly in the user's language (Tagalog, Taglish, or English).
- Be direct, insightful, and practical. Avoid overly stiff or robotic phrasing.
- Structure answers clearly with bullet points, bold key terms, and easy-to-read sections.
- When computing DOLE 13th month, overtime, or holiday pay, present the standard formula and a clean step-by-step example.
- When asked to draft an official memorandum, advisory, or notice, you MUST strictly structure it in the authentic corporate format of the organization (matching our official physical printed memorandum):
  TO: [RECIPIENT IN ALL CAPS, e.g. HR ON-SITE, CIC, AND FIELD MONITORING or ALL EMPLOYEES AND CONCERNED PERSONNEL]
  FROM: HUMAN RESOURCES DEPARTMENT
  DATE: [MONTH DAY, YEAR IN ALL CAPS, e.g. SEPTEMBER 24, 2026]
  SUBJECT: [CONCISE UPPERCASE SUBJECT TITLE]

  [Paragraph 1: Direct reminder/instruction to "All officers and concerned personnel are reminded to..." specifying official working hours and PCSO STL operating/betting hours or operational shifts]

  [Paragraph 2: Operational context and rationale starting with "Given the nature of our operations under the [PCSO Small Town Lottery (STL) structure / company operations] and our responsibility within the gaming industry, [core operational principle/timely response] are essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns."]

  [Paragraph 3: Explicit standard of conduct starting with "All concerned personnel are expected to maintain [active communication lines/compliance standards] at all times and [action/respond to urgent matters] without unnecessary delay."]

  Strict compliance is expected.

  JEVINCE JAYE S. JUBAY, CHRP
  HRMD Manager
  5A Royal Gaming OPC

  HUMAN RESOURCE MANAGEMENT DIVISION

  Do NOT use numbered lists or bullet points in the memorandum body. Always end the directives body with "Strict compliance is expected." Use clean corporate narrative paragraphs.


Simpal Group of Companies Knowledge:
1. Simpal Group of Companies (SGC) - Corporate parent company. Code: SGC. Managing Director: CHARMIE JEAN M. SIMPAL.
2. Simpal Construction (SIMCON) - Infrastructure and construction operations. Code: SIMCON. VP Engineering: ENG'R. MARK ANTHONY V.
3. Lucky Betplay Corporation (LBC) - PCSO STL Authorized Agent Corporation (Mandaue City). Daily draws at 2:00 PM, 5:00 PM, 9:00 PM. Code: LBC. Operations Manager: CHARMIE JEAN M. SIMPAL.
4. 5A Royal Gaming One Person Corporation (5ARG) - Leisure and gaming ventures. Code: 5ARG. General Manager: DAVE WILSON M.
5. Glowing Fortune Entertainment Corp. (GFC) - Hospitality, leisure, and gaming. Code: GFC. Operations Director: SARAH JANE C.
6. Imperial Gaming One Person Corporation (IMP) - Gaming administration. Code: IMP. Corporate Secretary: ATTY. RAUL G.

Operational & Labor Standards:
- Official HR Email: imsoroglohr@gmail.com
- DOLE Standards: Regular holiday pay is 200%, Special non-working day is 130%, Rest day is 130%. 13th month pay is (Total basic salary earned during the year ÷ 12). Disciplinary due process requires a written Notice of Explanation (at least 48 hours to reply) followed by an evaluation and Notice of Decision.
`;

const DEFAULT_GEMINI_KEY = "";

// Helper: Clean markdown formatting (asterisks, backticks, leading/trailing punctuation)
export function cleanMarkdownValue(val) {
  if (!val) return "";
  return val
    .replace(/^[*_`#\s:]+|[*_`#\s:]+$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

// Helper: Parse structured memo content, separating all metadata fields from pure body directives
export function extractMemoFromText(text) {
  if (!text) return null;
  const isMemo =
    text.includes("MEMORANDUM") ||
    text.includes("MEMO REF:") ||
    text.includes("REF NUMBER:") ||
    text.includes("MEMO-") ||
    (/\bSUBJECT\b/i.test(text) && /\bTO\b/i.test(text));

  if (!isMemo) return null;

  // 1. Extract Header Fields with explicit word boundaries
  const refMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:REF(?:\s*NUMBER|\s*NO\.?|\s*CODE)?|MEMO\s*REF(?:\s*NO\.?|\s*#)?)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const dateMatch = text.match(/(?:^|\n)\s*\*{0,2}\bDATE\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const toMatch = text.match(/(?:^|\n)\s*\*{0,2}\bTO\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const fromMatch = text.match(/(?:^|\n)\s*\*{0,2}\bFROM\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const subjMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:SUBJECT|SUBJ)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const classMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:CLASSIFICATION|CATEGORY|TYPE)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);

  const ref = cleanMarkdownValue(refMatch?.[1]);
  const date = cleanMarkdownValue(dateMatch?.[1]);
  const to = cleanMarkdownValue(toMatch?.[1]);
  const from = cleanMarkdownValue(fromMatch?.[1]);
  const subject = cleanMarkdownValue(subjMatch?.[1]) || "Official Memorandum";
  const classification = cleanMarkdownValue(classMatch?.[1]);

  // 2. Identify Company Code
  let companyCode = "SGC";
  const upperRef = (ref || "").toUpperCase();
  if (upperRef.startsWith("SIMCON") || upperRef.startsWith("SIM-") || /\bSIMCON\b/i.test(text) || /Simpal Construction/i.test(text)) {
    companyCode = "SIMCON";
  } else if (upperRef.startsWith("LBC") || /\bLBC\b/i.test(text) || /Lucky Betplay/i.test(text)) {
    companyCode = "LBC";
  } else if (upperRef.startsWith("5ARG") || upperRef.startsWith("5A-") || /\b5ARG\b/i.test(text) || /5A Royal/i.test(text)) {
    companyCode = "5ARG";
  } else if (upperRef.startsWith("GFC") || /\bGFC\b/i.test(text) || /Glowing Fortune/i.test(text)) {
    companyCode = "GFC";
  } else if (upperRef.startsWith("IMP") || /\bIMP\b/i.test(text) || /Imperial Gaming/i.test(text)) {
    companyCode = "IMP";
  } else if (upperRef.startsWith("SGC") || /\bSGC\b/i.test(text) || /Simpal Group/i.test(text)) {
    companyCode = "SGC";
  }

  // 3. Extract Signatories (Issued By / Noted & Approved By or Authentic HRMD Signature)
  let signatoryName = "";
  let signatoryTitle = "";
  let approverName = "";
  let approverTitle = "";

  const issuedMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:ISSUED BY|PREPARED BY|SIGNED BY)\b\s*[:\-]?\*{0,2}\s*\n+([^\n\r*]+)(?:\n+([^\n\r*]+))?/i);
  if (issuedMatch) {
    signatoryName = cleanMarkdownValue(issuedMatch[1]);
    signatoryTitle = cleanMarkdownValue(issuedMatch[2]);
  }

  const approvedMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:APPROVED BY|NOTED BY|NOTED & APPROVED BY)\b\s*[:\-]?\*{0,2}\s*\n+([^\n\r*]+)(?:\n+([^\n\r*]+))?/i);
  if (approvedMatch) {
    approverName = cleanMarkdownValue(approvedMatch[1]);
    approverTitle = cleanMarkdownValue(approvedMatch[2]);
  }

  // Fallback to official corporate HRMD signatory if Jevince Jaye S. Jubay is detected or default
  if (!signatoryName) {
    const jubayMatch = text.match(/JEVINCE\s+JAYE\s+S\.?\s+JUBAY(?:,\s*CHRP)?/i);
    if (jubayMatch || isMemo) {
      signatoryName = "JEVINCE JAYE S. JUBAY, CHRP";
      signatoryTitle = "HRMD Manager";
    }
  }

  // 4. Extract Pure Memorandum Body Directives
  // Strip conversational intro, header table block, and dividing rules
  let body = text;
  const headerKeys = [
    "CLASSIFICATION",
    "CATEGORY",
    "TYPE",
    "SUBJECT",
    "SUBJ",
    "FROM",
    "TO",
    "DATE",
    "REF NUMBER",
    "REF NO",
    "MEMO REF",
    "REF"
  ];
  let lastHeaderEnd = -1;

  for (const key of headerKeys) {
    const rx = new RegExp(`(?:^|\\n)\\s*\\*{0,2}\\b${key}\\b\\*{0,2}\\s*[:\\-][^\\n\\r]+`, "i");
    const m = text.match(rx);
    if (m && m.index !== undefined) {
      const lineEnd = m.index + m[0].length;
      if (lineEnd > lastHeaderEnd) {
        lastHeaderEnd = lineEnd;
      }
    }
  }

  if (lastHeaderEnd > -1) {
    body = text.substring(lastHeaderEnd);
    body = body.replace(/^\s*(?:[-*_]{3,}|\={3,})?\s*/g, "");
  } else {
    body = body.replace(/^(?:[\s\S]*?)(?:MEMORANDUM[\s\S]*?(?:[-*_]{3,}|\={3,}))/i, "");
  }

  // Strip trailing signatory block, Jubay signature, and HRMD footer from pure body
  body = body
    .replace(/(?:^|\n)\s*\*{0,2}\b(?:ISSUED BY|PREPARED BY|SIGNED BY|APPROVED BY|NOTED BY|JEVINCE JAYE S\. JUBAY|HUMAN RESOURCE MANAGEMENT DIVISION)\b[\s\S]*$/i, "")
    .replace(/(?:Please let me know|Let me know if|Sana nakatulong|May kailangan ka pa|I hope this helps)[\s\S]*$/i, "")
    .trim();

  return {
    ref: ref || `MEMO-2026-${companyCode}-001`,
    date: date || new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase(),
    to: to || "HR ON-SITE, CIC, AND FIELD MONITORING",
    from: from || "HUMAN RESOURCES DEPARTMENT",
    subject,
    classification: classification || "Operational Directive",
    companyCode,
    signatoryName: signatoryName || "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: signatoryTitle || "HRMD Manager",
    approverName: approverName || "CHARMIE JEAN M. SIMPAL",
    approverTitle: approverTitle || "President & CEO",
    content: body
  };
}

// Smart Local Corporate Directives & Guidelines Engine
function generateLocalMemoDirectives(userPrompt, isPolish = false) {
  const subjMatch = userPrompt.match(/SUBJECT:\s*([^\n\r]+)/i);
  const subject = subjMatch ? subjMatch[1].trim() : "";

  const toMatch = userPrompt.match(/TO:\s*([^\n\r]+)/i);
  const to = toMatch ? toMatch[1].trim() : "All Concerned Personnel";

  const classMatch = userPrompt.match(/CLASSIFICATION:\s*([^\n\r]+)/i);
  const classification = classMatch ? classMatch[1].trim() : "Operational Directive";

  const hintMatch = userPrompt.match(/INSTRUCTIONS:\s*([^\n\r]+)/i);
  const hint = hintMatch ? hintMatch[1].trim() : "";

  // If Polish requested and existing body was passed:
  if (isPolish) {
    const parts = userPrompt.split(/executive-level:\s*/i);
    const rawContent = parts.length > 1
      ? parts[1].replace(/CRITICAL RULES:[\s\S]*$/i, "").trim()
      : userPrompt;

    if (rawContent && rawContent.length > 5) {
      const paragraphs = rawContent
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const polished = paragraphs.map((p, idx) => {
        const cleanP = p.replace(/^[-*•\d.]+\s*/, "");
        if (paragraphs.length > 1) {
          return `${idx + 1}. ${cleanP.charAt(0).toUpperCase() + cleanP.slice(1)}`;
        }
        return cleanP.charAt(0).toUpperCase() + cleanP.slice(1);
      }).join("\n\n");

      const closing = rawContent.toLowerCase().includes("strict compliance")
        ? ""
        : "\n\nStrict compliance is expected.";

      return `${polished}${closing}`;
    }
  }

  // Generation based on Subject, Category and Hint:
  const textToScan = `${subject} ${classification} ${hint}`.toLowerCase();

  // 1. Immediate Response / Communication Accessibility
  if (textToScan.includes("communicat") || textToScan.includes("response") || textToScan.includes("reachab") || textToScan.includes("accessib") || textToScan.includes("contact")) {
    return `All officers, unit coordinators, and concerned personnel are reminded to remain reachable and strictly responsive to all official calls, corporate messages, and dispatch transmissions, particularly during designated operational hours and live draw schedules.

Given the operational nature of our business and our standard for continuous coordination across all gaming and field branches, prompt communication and timely response are essential to resolve operational bottlenecks, field escalations, and customer concerns without delay.

All personnel are expected to maintain active and accessible communication lines at all times and address urgent operational matters without unnecessary delay.

Strict compliance is expected.`;
  }

  // 2. Attendance / Biometrics / Timekeeping / Punctuality
  if (textToScan.includes("biometric") || textToScan.includes("attendance") || textToScan.includes("punctual") || textToScan.includes("late") || textToScan.includes("tardiness") || textToScan.includes("cutoff") || textToScan.includes("timekeeping")) {
    return `1. NOTICE IS HEREBY GIVEN to all active employees and branch personnel regarding strict adherence to standard daily biometric timekeeping, shift punctuality, and attendance log integrity.

2. MANDATORY COMPLIANCE DIRECTIVES:
   • Shift Log Verification: All personnel must log their biometric entries at their assigned workstation or terminal upon every shift entry and exit. Grace periods shall be strictly monitored.
   • Official Log Rectification: Any unrecorded logs, system offline periods, or forgotten entries must be substantiated by an approved Official Business (OB) slip or manual attendance adjustment form duly signed by the immediate supervisor within forty-eight (48) hours.
   • Payroll Cutoff: Unverified time entries upon the scheduled payroll cutoff date will be withheld pending proper endorsement.

3. SUPERVISORY RESPONSIBILITY:
   • Department supervisors and area leads are tasked with daily monitoring of their team's attendance status to prevent unauthorized leaves or unfiled absences.

Compliance with these directives is strictly mandatory.`;
  }

  // 3. Holiday / Special Non-Working Day
  if (textToScan.includes("holiday") || textToScan.includes("non-working") || textToScan.includes("proclamation") || textToScan.includes("skeleton")) {
    return `1. In accordance with official national proclamations, please be advised that the upcoming scheduled date has been declared an Official Non-Working Holiday across all relevant operating jurisdictions.

2. OPERATIONAL GUIDELINES:
   • Corporate and administrative offices will be officially closed during the declared period. Regular administrative office hours shall resume promptly at 8:00 AM on the following regular business day.
   • Critical field sites, operational branches, and authorized draw stations will maintain an authorized skeleton workforce to guarantee uninterrupted business continuity.
   • Personnel assigned to render duty during the holiday shall be entitled to holiday premium compensation in strict compliance with Department of Labor and Employment (DOLE) statutory rules.

3. RESUMPTION & ROSTER SUBMISSION:
   • Branch heads and site engineers must submit the verified attendance and overtime rosters to HR within twenty-four (24) hours of holiday completion.

Strict compliance is expected.`;
  }

  // 4. Shift Handover / Turnover / Draw Reconciliation
  if (textToScan.includes("turnover") || textToScan.includes("handover") || textToScan.includes("draw") || textToScan.includes("teller") || textToScan.includes("remittance") || textToScan.includes("cash")) {
    return `1. In line with management's ongoing effort to streamline branch workflow and ensure complete accountability, all operational units, field coordinators, and branch tellers are instructed to implement the updated shift transition and draw cutoff protocol effective immediately.

2. SPECIFIC DIRECTIVES:
   • Physical Turnovers: Outgoing supervisors and coordinators must conduct a comprehensive physical turnover of terminal tickets, cash collections, and equipment inventory prior to logging off.
   • Draw Reconciliation: All wager transactions must be reconciled and synchronized immediately following the official cutoff time for each draw schedule.
   • Discrepancy Reporting: Any technical glitches, ticket voids, or offline teller incidents must be documented and submitted via the HRHub real-time portal without delay.

3. SUPERVISION & AUDIT:
   • Non-compliance with the required dual-signoff shift handover protocol will be subject to operational audit review and disciplinary due process.

Compliance with these directives is strictly mandatory.`;
  }

  // 5. Safety, Health, PPE & Emergency Weather Readiness
  if (textToScan.includes("safety") || textToScan.includes("ppe") || textToScan.includes("health") || textToScan.includes("hazard") || textToScan.includes("weather") || textToScan.includes("incident") || textToScan.includes("emergency")) {
    return `1. The safety, physical security, and well-being of our workforce remain the paramount priority of the management. In view of operational conditions, all personnel are required to uphold standard safety precautions at all times.

2. MANDATORY PROTOCOLS:
   • Personal Protective Equipment (PPE): Site personnel and field coordinators must wear designated safety helmets, high-visibility vests, and protective footwear at all times while inside operational zones.
   • Emergency Preparedness: Site supervisors must verify that first-aid kits, emergency contact lists, and fire safety equipment are readily accessible and maintained.
   • Incident Reporting: Any workplace injury, equipment breakdown, or hazardous condition must be reported to the Safety Officer within two (2) hours of occurrence.

3. SAFETY BRIEFINGS:
   • A mandatory 5-minute toolbox safety briefing must precede every operational shift rotation.

Stay alert and observe all safety protocols at all times.`;
  }

  // 6. Universal Executive Directives Generation (for any custom subject or policy)
  const formattedSubject = subject || "Administrative and Operational Directives";
  return `1. This Memorandum serves to promulgate official management directives regarding ${formattedSubject.toUpperCase()} across all concerned departments and regional operating branches.

2. OPERATIONAL DIRECTIVES & GUIDELINES:
   • All concerned personnel are instructed to strictly align daily operations and administrative procedures with the standards set forth by executive management.
   • Department supervisors and unit leads must coordinate with team members to facilitate orderly implementation, clear task delegation, and uninterrupted workflow.
   ${hint ? `• Special Directive: ${hint}\n` : ""}   • Any operational concerns or policy clarifications regarding this directive must be addressed directly to the Human Resources Management Division without delay.

3. IMPLEMENTATION & ACKNOWLEDGMENT:
   • All department heads and site supervisors are tasked with disseminating this document to all subordinates under their jurisdiction.

Strict compliance is expected.`;
}

// Built-in Smart HR & Operations Knowledge Engine (when no external API key is configured)
function generateLocalAiResponse(userPrompt, conversationHistory = []) {
  const query = userPrompt.toLowerCase().trim();

  // Check if this is a request for Memorandum Body Directives or Polish
  const isDirectivesRequest =
    query.includes("memorandum body directives") ||
    query.includes("memorandum directives") ||
    query.includes("directives and guidelines") ||
    query.includes("write the official") ||
    (query.includes("subject:") && query.includes("to:") && query.includes("from:"));

  const isPolishRequest =
    query.includes("polish") ||
    query.includes("expert hr executive editor");

  if (isDirectivesRequest || isPolishRequest) {
    return generateLocalMemoDirectives(userPrompt, isPolishRequest);
  }

  // 0. Special Profile: Jay Ryan Lim (Creator & Developer)
  if (
    query.includes("jay ryan") ||
    query.includes("jay lim") ||
    query.includes("jay ryan lim") ||
    (query.includes("sino") && (query.includes("jay") || query.includes("creator") || query.includes("gumawa"))) ||
    (query.includes("who") && (query.includes("jay") || query.includes("creator") || query.includes("made you") || query.includes("built you") || query.includes("developed you"))) ||
    query.includes("creator") ||
    query.includes("gumawa sayo") ||
    query.includes("gumawa sa iyo")
  ) {
    return `### 👨‍💻 Si **Jay Ryan Lim**

Si **Jay Ryan Lim** ang magaling at mahusay na **IT Professional** na nagdisenyo at **gumawa sa akin (HRHub Ai Buddy) at sa buong HRHub system na ito!** 🚀

* 💡 **Creator & Lead Developer:** Siya ang lumikha ng arkitektura, mga matatalinong AI workflows, memo automation, at buong digital platform na nagpapatakbo sa ating kumpanya.
* 🛠️ **Propesyon:** Isang napakagaling na IT specialist at software engineer na nagdala ng modernong inobasyon para sa Simpal Group of Companies.`;
  }

  // 0. Special Profile: Quennie Capuyan Lim (HR Employee and Labor Relations)
  if (
    query.includes("quennie") ||
    query.includes("quenie") ||
    query.includes("quennie capuyan") ||
    query.includes("quennie lim") ||
    query.includes("quennie capuyan lim") ||
    (query.includes("sino") && query.includes("quennie")) ||
    (query.includes("who") && query.includes("quennie"))
  ) {
    return `### 🌸 Si **Quennie Capuyan Lim**

Si **Quennie Capuyan Lim** ay ang ating iginagalang na **HR Employee and Labor Relations** sa **Simpal Group of Companies**. 🤝✨

* 🏢 **Tungkulin:** Siya ang namumuno sa pangangalaga ng kapakanan ng bawat kawani, maayos na ugnayan sa paggawa (*labor relations*), at pagpapatupad ng makatao at propesyonal na pamantayan sa trabaho.
* 💖 **Espesyal na Pagkakakilanlan:** Siya ang **mabait at napakagandang asawa ni Jay Ryan Lim**, ang ating magaling na IT professional na gumawa sa akin at sa buong sistemang ito!`;
  }

  // 1. Holiday Memo Draft
  if (query.includes("holiday") && (query.includes("memo") || query.includes("draft") || query.includes("gawan"))) {
    return `### 📄 DRAFT MEMORANDUM: DECLARED SPECIAL NON-WORKING HOLIDAY

TO: ALL EMPLOYEES AND CONCERNED PERSONNEL
FROM: HUMAN RESOURCES DEPARTMENT
DATE: ${new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()}
SUBJECT: ADVISORY: DECLARED SPECIAL NON-WORKING HOLIDAY AND SKELETAL WORKFORCE SCHEDULE

All officers, branch personnel, and site staff are hereby advised of the upcoming declared Special Non-Working Holiday across all operating areas.

In observance of the official national proclamation, corporate administrative offices shall be closed. However, to maintain continuous service delivery, critical operational units, gaming branches, and designated field sites shall deploy an authorized rotational skeletal workforce. Premium compensation for personnel rendering duty shall be computed in accordance with statutory DOLE holiday pay guidelines.

All concerned supervisors and unit leads are expected to coordinate their respective shift assignments and ensure seamless operations during the holiday period.

Strict compliance is expected.

JEVINCE JAYE S. JUBAY, CHRP
HRMD Manager
5A Royal Gaming OPC

HUMAN RESOURCE MANAGEMENT DIVISION`;
  }

  // 2. Tardiness / Biometrics / Notice of Explanation
  if (query.includes("tardiness") || query.includes("late") || query.includes("punctuality") || query.includes("attendance warning") || query.includes("notice of explanation")) {
    return `### ⚠️ DRAFT NOTICE OF EXPLANATION (NOE): ATTENDANCE & BIOMETRIC COMPLIANCE

**OFFICIAL HUMAN RESOURCES TRANSMISSION**
**REF NUMBER:** HR-DISC-2026-014
**DATE:** ${new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date())}
**TO:** [Employee Name] — [Department / Site Location]
**FROM:** Office of Human Resources Management
**SUBJECT:** FORMAL NOTICE OF EXPLANATION (NOE): REPEATED TARDINESS & TIMEKEEPING INFRACTIONS

---

Dear [Employee Name],

1. **INCIDENT REPORT:**
   Based on official biometric timekeeping records generated for the period of [Date Period], it has been recorded that you have accumulated **[Number] instances of unexcused tardiness** exceeding the allowable group grace period (15 minutes).

2. **COMPANY POLICY REFERENCE:**
   Section 4.2 of the *Simpal Group Employee Code of Discipline* clearly stipulates that:
   > *"Habitual tardiness impairs team operations, disrupts client service, and compromises operational integrity."*

3. **MANDATORY DIRECTIVE:**
   In accordance with the statutory requirements of procedural due process:
   - You are hereby directed to submit a written explanation within **forty-eight (48) hours** from receipt of this notice.
   - Address your response to the HR Department via **imsoroglohr@gmail.com** explaining why no disciplinary action should be imposed against you.
   - Failure to submit your explanation within the prescribed timeframe shall be construed as a waiver of your right to be heard, and the management shall resolve the matter based on available records.

**ISSUED BY:**
Office of the Human Resources & People Operations
Simpal Group of Companies`;
  }

  // 3. DOLE Holiday Pay Rules & Calculation
  if (query.includes("holiday pay") || query.includes("dole") || (query.includes("compute") && query.includes("pay"))) {
    return `### ⚖️ PHILIPPINE LABOR CODE & DOLE HOLIDAY PAY COMPUTATION GUIDE

Batay sa mga opisyal na panuntunan ng **Department of Labor and Employment (DOLE)**, narito ang tamang computation ng sahod:

#### 1. Regular Holiday (Pambansang Araw, New Year, Pasko, Independence Day, atbp.)
* **Kung HINDI pumasok (Unworked):**
  * Bayad pa rin ng **100% ng Basic Daily Wage** (basta may pasok o leave bago ang holiday).
* **Kung PUMASOK (Worked):**
  * Unang 8 oras: **200% ng Daily Rate** (Arawang sahod × 2).
  * Overtime (higit sa 8 oras): **Dagdag 30%** ng hourly rate sa araw na iyon (Hourly Rate × 200% × 1.30).
* **Kung Holiday at kasabay ng REST DAY:**
  * Unang 8 oras: **260% ng Daily Rate**.

#### 2. Special Non-Working Day (Ninoy Aquino Day, All Saints Day, Local Charter Days)
* **Kung HINDI pumasok (Unworked):**
  * *"No work, no pay"* maliban na lamang kung may umiiral na company policy o collective agreement.
* **Kung PUMASOK (Worked):**
  * Unang 8 oras: **Daily Rate × 130%** (Basic daily rate + 30% premium).
  * Overtime (higit sa 8 oras): **Hourly Rate × 130% × 130%**.
* **Kung Special Day at kasabay ng REST DAY:**
  * Unang 8 oras: **Daily Rate × 150%**.

*💡 Paalala mula sa HR: Para sa mga STL on-duty tellers o SIMCON field staff na may shifting sa araw ng holiday, tiyaking naipasa ang aprubadong attendance log sa imsoroglohr@gmail.com para sa payroll processing.*`;
  }

  // 4. STL Operations, Gross, and Hits calculation
  if (query.includes("gross") || query.includes("hits") || query.includes("stl") || query.includes("teller") || query.includes("mandaue")) {
    return `### 📊 LUCKY BETPLAY STL OPERATIONS & GROSS LEDGER GUIDE

Ang **Lucky Betplay Corporation** ay ang PCSO STL Authorized Agent Corporation (AAC) para sa Mandaue City. Narito ang buod ng mga operational metrics:

#### 1. Paano Kino-compute ang Gross?
* **Gross Sales (Kabuuan ng Taya):**
  * Ang bawat transaksyon ng mga field agents/tellers sa bawat draw schedule:
    * **Draw 1 (2:00 PM)**
    * **Draw 2 (5:00 PM)**
    * **Draw 3 (9:00 PM)**
  * **Formula:** $\\text{Gross} = \\sum (\\text{Lahat ng lehitimong taya sa bawat draw})$

#### 2. Ano ang "Hits" at Paano Ito Naaapektuhan ang Net?
* **Hits (Mga Nanalo):**
  * Ito ang halaga ng napanalunang premyo mula sa opisyal na winning combination sa bawat draw.
* **Net Sales Remittance:**
  * $\\text{Net Collection} = \\text{Gross} - \\text{Authorized Hits Paid} - \\text{Agent Commission}$

#### 3. Real-Time vs. Official Accountant Ledger:
* **Current Day (Today):** Live streaming ng taya bawat draw schedule na may quota guard (300 requests limit).
* **Historical (Yesterday at Nakaraang mga Araw):** 1-single request sa Accountant API (\`TellerGrossPerDateRange\`) para makuha agad ang 100% reconciled figures ng lahat ng 333+ agents nang walang cooldown!`;
  }

  // 5. SOP Generation
  if (query.includes("sop") || query.includes("workflow") || query.includes("standard operating procedure") || query.includes("step")) {
    return `### 📋 STANDARD OPERATING PROCEDURE (SOP): CASH REMITTANCE & TELLER DRAW CLOSURE

**DOCUMENT CODE:** SOP-OPS-LBC-003
**EFFECTIVE DATE:** Current Fiscal Year
**APPLICABLE ENTITY:** Lucky Betplay Corporation (STL Mandaue Operations)

---

#### 1. OBJECTIVE:
To standardize cash collection, minimize discrepancies, ensure physical ticket reconciliation, and safeguard company collections during daily draw operations.

#### 2. PROCEDURE STEPS:

* **Step 1: Cut-Off & Draw Closure (15 mins prior to draw)**
  * Field tellers must cease acceptances 15 minutes before the official draw (1:45 PM for 2PM draw, 4:45 PM for 5PM draw, 8:45 PM for 9PM draw).
  * Print or verify the terminal summary total against physical cash on hand.

* **Step 2: Physical Cash & Ticket Balancing**
  * Match terminal total sales with physical cash received.
  * Any unvalidated discrepancy above ₱50.00 must be flagged immediately in the incident register.

* **Step 3: Supervisor Handover & Counter-Signing**
  * Hand over cash collections in the designated security collection pouch to the Area Field Supervisor.
  * Both the Teller and Supervisor must physically sign the 2-part Remittance Slip (White: Accounting, Yellow: Teller Copy).

* **Step 4: Central Office Vault Deposit**
  * The Area Supervisor remits total pooled collections to the Central Cashier Office within two (2) hours of draw completion.

* **Step 5: Digital Ledger Reconciliation**
  * Accounting uploads and validates collections against the official Accountant API Ledger in HrHub.

**COMPLIANCE NOTE:** Non-adherence to dual-signoff constitutes a Category B operational infraction under company policy.`;
  }

  // 6. General / Default Executive Response
  return `### 👋 Kumusta! Ako ang inyong **HRHub Ai Buddy**

Handa akong tumulong sa inyo sa anumang operasyon ng **Simpal Group of Companies**:

* 📄 **Paggawa ng Memos & Advisories:** Magpagawa ng memo para sa Holiday, Emergency Shifting, Workplace Safety, o Policy Directives na handang i-transfer sa **Memo Generator**.
* ⚖️ **DOLE & Labor Policies:** Magtanong ukol sa holiday pay computation, overtime rules, 13th-month pay, disciplinary due process, o regularization.
* 📊 **STL Mandaue Operations & Gross Reports:** Pagpapaliwanag ng teller draw schedules, supervisor audits, hits, at gross remittance.
* 📋 **Paggawa ng SOPs at Task Checklists:** Standard operating procedures para sa konstruksyon (SIMCON) o gaming branches.

Mayroon ka bang gustong ipagawa o itanong ngayon?`;
}

// Main AI Completion Handler: Dual Engine with automatic Smart Local fallback
export async function sendAiChatMessage({
  messages,
  userPrompt,
  customApiKey = "",
  model = "gpt-4o-mini"
}) {
  const activeApiKey =
    customApiKey.trim() ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY ? import.meta.env.VITE_OPENAI_API_KEY.trim() : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_openai_api_key") || "" : "");

  const geminiApiKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : "") ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY && (import.meta.env.VITE_OPENAI_API_KEY.startsWith("AQ.") || import.meta.env.VITE_OPENAI_API_KEY.startsWith("AIzaSy")) ? import.meta.env.VITE_OPENAI_API_KEY.trim() : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_gemini_api_key") || "" : "") ||
    (activeApiKey.startsWith("AQ.") || activeApiKey.startsWith("AIzaSy") ? activeApiKey : "") ||
    DEFAULT_GEMINI_KEY;

  // Priority 1: Google Gemini Multi-Model Pool (Over 1,000+ Requests/Day total free quota)
  if (geminiApiKey) {
    const candidateModels = [
      "gemini-3.5-flash-lite", // 500 Requests Per Day, 15 RPM
      "gemini-3.1-flash-lite", // 500 Requests Per Day, 15 RPM
      "gemini-3.5-flash",      // 20 Requests Per Day
      "gemini-flash-latest",   // Active latest
      "gemini-3.7-flash",      // 20 Requests Per Day
      "gemini-3.8-flash",      // 20 Requests Per Day
      "gemini-3.6-flash"       // 20 Requests Per Day
    ];
    for (const gModel of candidateModels) {
      try {
        const geminiContents = [
          ...messages.slice(-8).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })),
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SIMPAL_COMPANIES_CONTEXT }]
              },
              contents: geminiContents
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiText && geminiText.trim().length > 0) {
            return {
              content: geminiText.trim(),
              text: geminiText.trim(),
              source: "gemini_core",
              model: `HRHub Ai Buddy (${gModel})`,
              memoData: extractMemoFromText(geminiText)
            };
          }
        } else {
          console.warn(`Gemini model ${gModel} returned status:`, res.status);
        }
      } catch (gErr) {
        console.warn(`Gemini engine error on ${gModel}:`, gErr);
      }
    }
  }

  // Priority 2: Direct OpenAI Engine (if valid key is provided)
  if (activeApiKey && !activeApiKey.startsWith("AQ.") && !activeApiKey.startsWith("AIzaSy")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeApiKey}`
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: SIMPAL_COMPANIES_CONTEXT
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content
            })),
            {
              role: "user",
              content: userPrompt
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return {
            content,
            text: content,
            source: "ai_buddy_core",
            model: "HRHub Ai Buddy",
            memoData: extractMemoFromText(content)
          };
        }
      }
    } catch (err) {
      console.warn("Direct engine error, falling back to live gateway:", err);
    }
  }

  // Tier 2: Real Live Engine (Powered via live intelligence gateway)
  try {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 6000);

    const liveMessages = [
      { role: "system", content: SIMPAL_COMPANIES_CONTEXT },
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userPrompt }
    ];

    const liveRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: liveMessages,
        model: "openai",
        seed: Math.floor(Math.random() * 1000000)
      })
    });

    clearTimeout(timeoutTimer);

    if (liveRes.ok) {
      const rawText = await liveRes.text();
      let responseText = (rawText || "").trim();
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.content) {
          responseText = parsed.content;
        } else if (parsed.choices?.[0]?.message?.content) {
          responseText = parsed.choices[0].message.content;
        }
      } catch {
        // It's plain text/markdown string
      }

      if (responseText && responseText.length > 0) {
        return {
          content: responseText,
          text: responseText,
          source: "ai_buddy_live",
          model: "HRHub Ai Buddy",
          memoData: extractMemoFromText(responseText)
        };
      }
    }
  } catch (liveErr) {
    console.warn("Live gateway unavailable or timed out, falling back to local HR brain:", liveErr);
  }

  // Tier 3 Fallback: Smart Local HR & Operations Knowledge Engine
  const localReply = generateLocalAiResponse(userPrompt, messages);
  return {
    content: localReply,
    text: localReply,
    source: "local_brain",
    model: "HRHub Ai Buddy",
    memoData: extractMemoFromText(localReply)
  };
}
