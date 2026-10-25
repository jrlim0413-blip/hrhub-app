/**
 * nteLegalAnalyzer.js
 * Intelligent legal violation analyzer for Notice to Explain (NTE) generation.
 * Formulates non-generic, legally sound citations under the Company Employee Code of Conduct
 * and the Philippine Labor Code (PD 442 as amended, Art. 297 [formerly Art. 282], and DOLE D.O. 147-15).
 */

export const VIOLATION_PRESETS = {
  CASH_SHORTAGE_THEFT: {
    id: "CASH_SHORTAGE_THEFT",
    label: "Cash Shortage, Unremitted Funds & Breach of Trust",
    severity: "CRITICAL / SERIOUS OFFENSE",
    recommendedAction: "Mandatory Notice to Explain with 5-Day Due Process Period & Assessment for Preventive Suspension",
    codeOfConductSection:
      "Section 14. Offenses Against Honesty, Financial Custodianship & Company Property:\n" +
      "• Subsection 14.1: Incurring unexplained cash shortage, drawer deficit, or discrepancy in custody of company collections.\n" +
      "• Subsection 14.3: Unauthorized retention, delayed remittance, or personal use of company cash floats, petty cash, or daily sales receipts.\n" +
      "• Subsection 14.7: Unauthorized extension of credit, 'vale', or personal advances using company cashier funds without prior written authorization.\n" +
      "Penalty Classification: SERIOUS OFFENSE punishable by dismissal from employment upon due inquiry.",
    laborCodeViolation:
      "Article 297 [formerly Art. 282] of the Labor Code of the Philippines (Presidential Decree No. 442, as renumbered):\n" +
      "• Paragraph (a) - Serious Misconduct in connection with cashiering duties;\n" +
      "• Paragraph (b) - Gross and Habitual Neglect in safeguarding financial assets;\n" +
      "• Paragraph (c) - Fraud and Willful Breach of Trust reposed by the Employer (Loss of Confidence in a Fiduciary Position of Trust).",
    summaryTitle: "Gross Breach of Financial Trust & Cash Drawer Shortage Discrepancy"
  },
  GROSS_SOP_NEGLECT: {
    id: "GROSS_SOP_NEGLECT",
    label: "Gross Neglect of Duties & SOP Breaches",
    severity: "MAJOR OFFENSE",
    recommendedAction: "Formal Notice to Explain, Operational Audit Hearing & Corrective Disciplinary Sanction",
    codeOfConductSection:
      "Section 18. Offenses Related to Job Performance, Diligence, and Standard Operating Procedures (SOPs):\n" +
      "• Subsection 18.1: Non-observance of Cashier / Operational Standard Operating Procedures, checklist guidelines, or audit protocols.\n" +
      "• Subsection 18.2: Failure to conduct mandatory shift-end drawer reconciliation, dual-custody verification, or turnover procedures.\n" +
      "• Subsection 18.4: Careless, negligent, or irresponsible performance of designated branch responsibilities resulting in operational loss.\n" +
      "Penalty Classification: MAJOR TO SERIOUS OFFENSE depending on severity of recurrence and financial exposure.",
    laborCodeViolation:
      "Article 297, Paragraph (b) of the Labor Code of the Philippines:\n" +
      "• Gross and Habitual Neglect of Duties, and failure to exercise extraordinary diligence required in the performance of assigned operational responsibilities.",
    summaryTitle: "Non-Observance of Standard Operating Procedures & Gross Neglect of Assigned Duties"
  },
  FALSIFICATION_FRAUD: {
    id: "FALSIFICATION_FRAUD",
    label: "Falsification of Records, Tampering & Fraud",
    severity: "CRITICAL / SERIOUS OFFENSE",
    recommendedAction: "Immediate Notice to Explain, Document Forensic Verification & Possible Criminal / Administrative Action",
    codeOfConductSection:
      "Section 15. Offenses Involving Integrity, Documentation & Falsification:\n" +
      "• Subsection 15.1: Altering, tampering with, forging, or falsifying company logbooks, cash count sheets, official receipts, or audit records.\n" +
      "• Subsection 15.3: Producing or submitting fraudulent, fictitious, or forged supporting slips, borrower chits, or balancing vouchers.\n" +
      "• Subsection 15.5: Making untruthful statements, withholding material facts, or misrepresenting official figures during internal audits.\n" +
      "Penalty Classification: SERIOUS OFFENSE (Ground for Termination of Employment).",
    laborCodeViolation:
      "Article 297, Paragraph (c) and Paragraph (a) of the Labor Code of the Philippines:\n" +
      "• Fraud or Willful Breach by the employee of the trust reposed in him by the employer;\n" +
      "• Serious Misconduct and commission of acts of deceit affecting company documentation and fiscal accountability.",
    summaryTitle: "Falsification of Official Audit Documents, Record Tampering, and Fraudulent Representation"
  },
  INSUBORDINATION_DISOBEDIENCE: {
    id: "INSUBORDINATION_DISOBEDIENCE",
    label: "Insubordination & Willful Disobedience",
    severity: "SERIOUS OFFENSE",
    recommendedAction: "Notice to Explain, Administrative Conference & Review of Written Management Directives",
    codeOfConductSection:
      "Section 12. Offenses Involving Insubordination, Lawful Authority & Workplace Decorum:\n" +
      "• Subsection 12.1: Willful failure or blatant refusal to carry out lawful, reasonable, and work-related orders or directives issued by superiors.\n" +
      "• Subsection 12.3: Showing defiant, disrespectful, or recalcitrant behavior toward supervisors, internal auditors, or company representatives.\n" +
      "• Subsection 12.6: Refusal to submit mandatory incident reports, turnover logs, or cooperate with company investigation proceedings.\n" +
      "Penalty Classification: SERIOUS OFFENSE.",
    laborCodeViolation:
      "Article 297, Paragraph (a) of the Labor Code of the Philippines:\n" +
      "• Willful Disobedience by the employee of the lawful orders of his employer or representative in connection with his work.",
    summaryTitle: "Willful Disobedience to Lawful Management Orders and Insubordination"
  },
  ATTENDANCE_AWOL: {
    id: "ATTENDANCE_AWOL",
    label: "Absence Without Official Leave (AWOL) & Abandonment",
    severity: "MAJOR TO CRITICAL OFFENSE",
    recommendedAction: "Notice to Explain / Return to Work Order Served to Registered Residential Address",
    codeOfConductSection:
      "Section 8. Offenses Against Attendance, Punctuality, and Operational Availability:\n" +
      "• Subsection 8.1: Absence Without Official Leave (AWOL) or failure to report to assigned branch without prior approved leave or timely notification.\n" +
      "• Subsection 8.4: Unauthorized abandonment of designated post, workstation, or cashier counter during operating hours.\n" +
      "• Subsection 8.7: Prolonged absence exceeding three (3) consecutive working days without medical certificate or formal emergency notification.\n" +
      "Penalty Classification: MAJOR OFFENSE to Abandonment of Work.",
    laborCodeViolation:
      "Article 297, Paragraph (b) of the Labor Code of the Philippines:\n" +
      "• Gross Neglect of Duties and abandonment of work, disrupting normal business operations and leaving assigned responsibilities unprotected.",
    summaryTitle: "Absence Without Official Leave (AWOL) and Desertion of Assigned Duties"
  },
  DISORDERLY_CONDUCT_ALTERCATION: {
    id: "DISORDERLY_CONDUCT_ALTERCATION",
    label: "Disorderly Conduct, Altercation & Workplace Violence",
    severity: "SERIOUS OFFENSE",
    recommendedAction: "Immediate Notice to Explain with Assessment for Safety Preventive Suspension",
    codeOfConductSection:
      "Section 16. Offenses Involving Workplace Peace, Order, Safety & Decorum:\n" +
      "• Subsection 16.1: Engaging in physical fights, scuffles, assault, or threatening co-employees, superiors, or customers within company premises.\n" +
      "• Subsection 16.3: Using profane, abusive, scandalous, or threatening language creating workplace hostility.\n" +
      "• Subsection 16.5: Reporting for work under the influence of intoxicating liquor or prohibited drugs.\n" +
      "Penalty Classification: SERIOUS OFFENSE punishable by dismissal.",
    laborCodeViolation:
      "Article 297, Paragraph (a) and Paragraph (d) of the Labor Code of the Philippines:\n" +
      "• Serious Misconduct and commission of an offense against persons within the company premises, creating immediate danger to workplace peace and order.",
    summaryTitle: "Disorderly Conduct, Workplace Threat, and Breach of Decorum"
  },
  PROPERTY_DAMAGE_LOSS: {
    id: "PROPERTY_DAMAGE_LOSS",
    label: "Mishandling, Damage or Loss of Company Property",
    severity: "MAJOR OFFENSE",
    recommendedAction: "Notice to Explain, Asset Assessment & Restitution / Disciplinary Hearing",
    codeOfConductSection:
      "Section 17. Offenses Involving Company Assets, Hardware & Equipment Care:\n" +
      "• Subsection 17.1: Gross recklessness or negligence resulting in destruction, damage, or loss of company tools, POS machines, or facilities.\n" +
      "• Subsection 17.4: Unauthorized use of company equipment or premises for personal benefit without written consent.\n" +
      "Penalty Classification: MAJOR OFFENSE with liability for restitution.",
    laborCodeViolation:
      "Article 297, Paragraph (b) of the Labor Code of the Philippines:\n" +
      "• Gross Neglect of Duties resulting in damage and economic prejudice to employer assets.",
    summaryTitle: "Reckless Mishandling and Damage to Company Property"
  }
};

/**
 * Detects the most appropriate violation category based on the incident narrative, causes, category, and cash amount
 */
export function detectViolationCategory(report = {}) {
  const narrative = [
    report.specificFindings,
    report.specific_findings,
    report.fullIncidentNarrative,
    report.full_incident_narrative,
    report.incidentDetails,
    report.incidentCauses,
    report.incident_causes,
    report.incidentCategory,
    report.incident_category
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rawShortage = String(report.cashShortageAmount || report.cash_shortage_amount || "").replace(/[^0-9.]/g, "");
  const shortageNum = parseFloat(rawShortage) || 0;

  // 1. Falsification / Tampering
  if (
    narrative.includes("falsif") ||
    narrative.includes("tamper") ||
    narrative.includes("forg") ||
    narrative.includes("fake") ||
    narrative.includes("alter receipt") ||
    narrative.includes("altered slip")
  ) {
    return VIOLATION_PRESETS.FALSIFICATION_FRAUD;
  }

  // 2. Physical Fight / Violence / Alcohol / Threat
  if (
    narrative.includes("fight") ||
    narrative.includes("suntok") ||
    narrative.includes("altercation") ||
    narrative.includes("brawl") ||
    narrative.includes("alcohol") ||
    narrative.includes("intoxicated") ||
    narrative.includes("threat") ||
    narrative.includes("harass") ||
    narrative.includes("scandal")
  ) {
    return VIOLATION_PRESETS.DISORDERLY_CONDUCT_ALTERCATION;
  }

  // 3. AWOL / Attendance
  if (
    narrative.includes("awol") ||
    narrative.includes("abandon") ||
    narrative.includes("unexcused absence") ||
    narrative.includes("absent without") ||
    narrative.includes("missing shift")
  ) {
    return VIOLATION_PRESETS.ATTENDANCE_AWOL;
  }

  // 4. Insubordination / Refusal of Orders
  if (
    narrative.includes("insubordinat") ||
    narrative.includes("refused to follow") ||
    narrative.includes("defian") ||
    narrative.includes("disobey") ||
    narrative.includes("refusal")
  ) {
    return VIOLATION_PRESETS.INSUBORDINATION_DISOBEDIENCE;
  }

  // 5. Cash Shortage / Theft / Unremitted collections
  if (
    shortageNum > 0 ||
    narrative.includes("shortage") ||
    narrative.includes("cash") ||
    narrative.includes("drawer") ||
    narrative.includes("unremit") ||
    narrative.includes("vault") ||
    narrative.includes("bale") ||
    narrative.includes("advance") ||
    narrative.includes("missing money") ||
    narrative.includes("fund")
  ) {
    return VIOLATION_PRESETS.CASH_SHORTAGE_THEFT;
  }

  // 6. Property Damage
  if (narrative.includes("damage") || narrative.includes("broke") || narrative.includes("pos machine") || narrative.includes("vehicle")) {
    return VIOLATION_PRESETS.PROPERTY_DAMAGE_LOSS;
  }

  // 7. General SOP Neglect
  return VIOLATION_PRESETS.GROSS_SOP_NEGLECT;
}

/**
 * Intelligent analyzer that generates non-generic, legally tailored NTE paragraphs and citations
 */
export function analyzeAndFormulateNte(report = {}, forcedPresetKey = null) {
  const preset = forcedPresetKey && VIOLATION_PRESETS[forcedPresetKey]
    ? VIOLATION_PRESETS[forcedPresetKey]
    : detectViolationCategory(report);

  const employeeName = (report.employeeName || "THE CONCERNED EMPLOYEE").toUpperCase();
  const employeePosition = report.employeePosition || "Assigned Personnel";
  const branch = report.branch || report.branchLocation || "Designated Branch / Station";
  const company = report.senderCompany || report.company || "Subsidiary Company";
  const senderHr = report.senderHrName || report.reportingHrName || "Branch HR Officer";
  const senderHrTitle = report.reportingHrTitle || report.senderHrTitle || "Branch HR Officer";
  const auditDates = report.auditDates || "the recently concluded operational compliance audit";
  const auditedBy = report.auditedBy || "Authorized Internal Audit Personnel";

  const rawShortage = String(report.cashShortageAmount || report.cash_shortage_amount || "").trim();
  const hasShortage = rawShortage && rawShortage !== "0" && rawShortage !== "0.00";
  const formattedShortage = hasShortage ? `PHP ${rawShortage}` : null;

  const narrative =
    report.specificFindings ||
    report.specific_findings ||
    report.fullIncidentNarrative ||
    report.full_incident_narrative ||
    "Failure to observe mandatory standard operating procedures and financial control protocols.";

  const causes = report.incidentCauses || report.incident_causes || "Failure to observe company standard operating procedures.";

  // Formulate Paragraph 1: Contextual, Non-Generic Legal Finding Citation
  let para1 = "";
  if (preset.id === "CASH_SHORTAGE_THEFT" && formattedShortage) {
    para1 = `Based on the official Incident Report transmitted by ${senderHrTitle}, ${senderHr} of ${company}, regarding the compliance audit conducted on ${auditDates} by ${auditedBy} at ${branch}, a verified cash shortage amounting to ${formattedShortage} was uncovered in your assigned drawer and accountability. At the time of physical cash verification, said amount could not be accounted for, balanced, or supported by valid balancing vouchers.`;
  } else if (preset.id === "CASH_SHORTAGE_THEFT") {
    para1 = `Based on the official Incident Report transmitted by ${senderHrTitle}, ${senderHr} of ${company}, concerning operations at ${branch}, you incurred an unremitted cash collection and reconciliation deficit. As the assigned ${employeePosition}, you failed to produce lawful accounting vouchers or turn over the company collections in accordance with the prescribed cut-off schedule.`;
  } else if (preset.id === "FALSIFICATION_FRAUD") {
    para1 = `Records forwarded by ${company} HR (${senderHr}) concerning operations at ${branch} disclose that on or about ${report.dateOfIncident || "the audited period"}, you committed acts of unauthorized record tampering, falsification, or submitting inaccurate audit balancing chits, as documented in the internal audit investigation conducted by ${auditedBy}.`;
  } else if (preset.id === "ATTENDANCE_AWOL") {
    para1 = `Official attendance and operational logs transmitted by ${company} Branch HR (${senderHr}) indicate that you went on Absence Without Official Leave (AWOL) from ${branch}, abandoning your post without an approved leave of absence or valid emergency notification, severely impairing continuous branch operations.`;
  } else if (preset.id === "INSUBORDINATION_DISOBEDIENCE") {
    para1 = `An official transmittal from ${senderHrTitle}, ${senderHr} of ${company}, reports that during operations at ${branch}, you willfully refused or failed to comply with reasonable, lawful written directives and standard operational protocols issued by authorized branch management.`;
  } else if (preset.id === "DISORDERLY_CONDUCT_ALTERCATION") {
    para1 = `An incident report submitted by ${company} Branch HR (${senderHr}) confirms that an altercation, disorderly conduct, and breach of company peace and decorum occurred at ${branch} involving your direct participation, in violation of company workplace safety rules.`;
  } else {
    para1 = `According to the formal Incident Report submitted by ${senderHrTitle}, ${senderHr} of ${company} dated ${report.dateReported || "recently"}, an operational audit conducted at ${branch} by ${auditedBy} uncovered substantial lapses, procedural non-compliance, and operational irregularities under your assigned responsibility as ${employeePosition}.`;
  }

  // Formulate Paragraph 2: Specific Allegations & Itemized Breaches Derived From Narrative
  let para2 = "";
  if (narrative.length > 20) {
    para2 = `Specifically, the investigation established the following material facts and allegations:\n\n` +
      `1. Operational Narrative: ${narrative}\n\n` +
      `2. Identified Lapses / Root Causes: ${causes}\n\n` +
      `3. Direct Impact: The aforementioned actions breached internal financial checks, leaving company assets compromised and in violation of established operating guidelines.`;
  } else {
    para2 = `Specifically, your actions resulted in an uncleared discrepancy and failure to follow mandatory custody and verification protocols as detailed in the branch incident record.`;
  }

  // Formulate Paragraph 3: Positional Duty & Fiduciary Obligation
  let para3 = "";
  const posLower = employeePosition.toLowerCase();
  if (posLower.includes("cashier") || posLower.includes("vault") || posLower.includes("custodian") || posLower.includes("finance")) {
    para3 = `As a ${employeePosition}, you occupy a position of highest trust and confidence (fiduciary responsibility) entrusted with the safekeeping and proper handling of company funds. Complete transparency, strict adherence to drawer float limits, immediate reporting of discrepancies, and punctual remittance are essential terms of your employment. Your failure to observe these fundamental duties compromises company fiscal controls and constitutes a substantial breach of trust.`;
  } else if (posLower.includes("lead") || posLower.includes("supervisor") || posLower.includes("manager")) {
    para3 = `In your capacity as ${employeePosition}, you exercise supervisory authority and are expected to set the standard for compliance, diligence, and operational integrity. Lapses of this nature erode operational standards, undermine company policies, and represent a serious failure of leadership and accountability.`;
  } else {
    para3 = `As an employee of the company designated as ${employeePosition}, you are expected to adhere strictly to all operational manuals, obey lawful directives, and exercise the required diligence of a good father of a family in safeguarding company assets and processes.`;
  }

  // Formulate Due Process Clause (DOLE Twin-Notice Rule)
  const nteDueProcessClause =
    "In accordance with the constitutional mandate of procedural and statutory due process (DOLE Department Order No. 147-15), you are hereby given a period of FIVE (5) CALENDAR DAYS from receipt of this Notice to submit your sworn WRITTEN EXPLANATION, together with all supporting documents, affidavits, or evidence, explaining why no administrative disciplinary sanction, up to and including DISMISSAL FROM EMPLOYMENT, should be imposed against you for the aforementioned violations.";

  const nteConclusion =
    "Failure on your part to submit your written explanation within the mandatory five (5) calendar day period shall be deemed a waiver of your right to be heard, and the Company shall evaluate and decide your case based solely on the evidence on record.\n\nFor your strict compliance.";

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    severity: preset.severity,
    recommendedAction: preset.recommendedAction,
    summaryTitle: preset.summaryTitle,
    codeOfConductSection: preset.codeOfConductSection,
    laborCodeViolation: preset.laborCodeViolation,
    nteSubject: `Notice to Explain: ${preset.summaryTitle} (${report.caseNumber || "Case"})`,
    nteBodyParagraph1: para1,
    nteBodyParagraph2: para2,
    nteBodyParagraph3: para3,
    nteDueProcessClause,
    nteConclusion
  };
}
