// Office Ally Clearinghouse Integration
// Handles claim submission (837P), 999 acknowledgments, and ERA/835 auto-payment posting
//
// Configuration via environment variables:
//   OFFICE_ALLY_USERNAME     — Office Ally account username
//   OFFICE_ALLY_PASSWORD     — Office Ally account password
//   OFFICE_ALLY_API_BASE     — Optional override (default: https://pms.officeally.com/secure)
//
// Reference: https://pms.officeally.com/secure/API_Help

export const OFFICE_ALLY_BASE =
  process.env.OFFICE_ALLY_API_BASE || "https://pms.officeally.com/secure";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OACredentials {
  username: string;
  password: string;
}

export interface ClaimSubmissionRequest {
  /** Raw X12 837P or 837I EDI content */
  ediContent: string;
  /** Internal charge IDs this submission covers */
  chargeIds: string[];
  /** Submitter's NPI */
  npi: string;
  /** Organization name for the envelope */
  orgName: string;
}

export interface ClaimSubmissionResult {
  success: boolean;
  submissionId?: string;       // Office Ally's tracking ID
  controlNumber?: string;      // ISA13 interchange control number
  error?: string;
  rawResponse?: string;
}

// ─────────── 999 Functional Acknowledgment ───────────
export interface Ack999Transaction {
  /** Group control number (GS06/GE02) */
  groupControlNumber: string;
  /** Transaction set control number (ST02) */
  transactionSetId: string;
  /** "A" = Accepted, "E" = Accepted with errors, "R" = Rejected */
  acknowledgeCode: "A" | "E" | "R";
  errors: Ack999Error[];
}

export interface Ack999Error {
  /** AK304 / AK404 element position */
  elementPosition?: number;
  /** AK305 / AK405 error code */
  errorCode: string;
  /** Human-readable description */
  description: string;
  /** "transaction" | "group" | "interchange" */
  level: "interchange" | "group" | "transaction" | "segment";
  /** AK303 — segment ID if applicable */
  segmentId?: string;
}

export interface Ack999ParseResult {
  interchangeControlNumber: string;   // ISA13
  sentDate: string;                   // ISA09
  transactions: Ack999Transaction[];
  overallAccepted: boolean;
}

// ─────────── ERA / 835 ───────────
export interface EraClaimPayment {
  /** CLP01 — payer's claim number */
  payerClaimNumber: string;
  /** CLP02 — claim status code */
  claimStatusCode: string;
  claimStatusLabel: string;
  /** CLP03 — charged amount */
  chargedAmount: number;
  /** CLP04 — paid amount */
  paidAmount: number;
  /** CLP05 — patient responsibility */
  patientResponsibility: number;
  patientName?: string;
  patientMemberId?: string;
  serviceLines: EraServiceLine[];
  adjustments: EraAdjustment[];
}

export interface EraServiceLine {
  /** SVC01 — CPT code */
  cptCode: string;
  /** SVC02 — submitted charge */
  submittedCharge: number;
  /** SVC03 — paid amount */
  paidAmount: number;
  /** SVC04 — revenue code (if applicable) */
  revenueCode?: string;
  /** SVC05 — units */
  units?: number;
  adjustments: EraAdjustment[];
}

export interface EraAdjustment {
  /** CAS01 — group code: CO/OA/PI/PR */
  groupCode: string;
  groupLabel: string;
  /** CAS02 — reason code */
  reasonCode: string;
  reasonDescription: string;
  /** CAS03 — adjustment amount */
  amount: number;
  /** CAS04 — units */
  units?: number;
}

export interface EraParseResult {
  /** BPR02 — total payment amount */
  totalPaymentAmount: number;
  /** BPR16 — check/EFT number */
  checkNumber: string;
  /** BPR04 — payment method (ACH, CHK, etc.) */
  paymentMethod: string;
  /** DTM01=405 — payment date */
  paymentDate: string;
  /** N1*PR — payer name */
  payerName: string;
  /** N1*PE — payee NPI */
  payeeNpi?: string;
  claims: EraClaimPayment[];
  /** Raw 835 content for storage */
  rawContent: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Office Ally REST Client
// ─────────────────────────────────────────────────────────────────────────────

export class OfficeAllyClient {
  private username: string;
  private password: string;
  private base: string;

  constructor(creds?: OACredentials) {
    this.username = creds?.username || process.env.OFFICE_ALLY_USERNAME || "";
    this.password = creds?.password || process.env.OFFICE_ALLY_PASSWORD || "";
    this.base = OFFICE_ALLY_BASE;

    if (!this.username || !this.password) {
      throw new Error("Office Ally credentials not configured. Set OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD.");
    }
  }

  private get authHeader(): string {
    return "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64");
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: string,
    contentType = "text/plain"
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const url = `${this.base}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json, text/plain, */*",
    };
    if (body !== undefined) {
      headers["Content-Type"] = contentType;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
    });

    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  // ───── Claim Submission ─────

  /**
   * Submit an X12 837P/I EDI claim to Office Ally.
   * Returns the clearinghouse submission tracking ID.
   */
  async submitClaim(req: ClaimSubmissionRequest): Promise<ClaimSubmissionResult> {
    try {
      const result = await this.request(
        "POST",
        "/EDI_Upload/UploadFile",
        req.ediContent,
        "text/plain"
      );

      if (!result.ok) {
        return {
          success: false,
          error: `Office Ally rejected submission (HTTP ${result.status}): ${result.text.slice(0, 200)}`,
          rawResponse: result.text,
        };
      }

      // Office Ally returns a plain-text response with a tracking/confirmation number
      const submissionId = extractSubmissionId(result.text);
      const controlNumber = extractControlNumber(req.ediContent);

      return {
        success: true,
        submissionId,
        controlNumber,
        rawResponse: result.text,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown submission error",
      };
    }
  }

  // ───── 999 Acknowledgments ─────

  /**
   * Fetch 999 functional acknowledgment files from Office Ally.
   * Office Ally stores acknowledgments as EDI files; we parse them here.
   */
  async getAcknowledgments(fromDate?: string): Promise<{
    acks: Ack999ParseResult[];
    rawFiles: string[];
    error?: string;
  }> {
    try {
      const date = fromDate || getDateDaysAgo(7);
      const result = await this.request(
        "GET",
        `/EDI_Download/Download999?startDate=${date}&endDate=${getTodayDate()}`
      );

      if (!result.ok) {
        return {
          acks: [],
          rawFiles: [],
          error: `Failed to fetch acknowledgments (HTTP ${result.status})`,
        };
      }

      // Response may be multiple 999 files separated by known delimiters
      const rawFiles = splitEdiFiles(result.text);
      const acks = rawFiles.map(raw => parse999(raw)).filter((a): a is Ack999ParseResult => a !== null);

      return { acks, rawFiles };
    } catch (err) {
      return {
        acks: [],
        rawFiles: [],
        error: err instanceof Error ? err.message : "Unknown acknowledgment error",
      };
    }
  }

  // ───── ERA / 835 ─────

  /**
   * Fetch ERA (835) files from Office Ally for auto-payment posting.
   */
  async getERAs(fromDate?: string): Promise<{
    eras: EraParseResult[];
    rawFiles: string[];
    error?: string;
  }> {
    try {
      const date = fromDate || getDateDaysAgo(30);
      const result = await this.request(
        "GET",
        `/EDI_Download/Download835?startDate=${date}&endDate=${getTodayDate()}`
      );

      if (!result.ok) {
        return {
          eras: [],
          rawFiles: [],
          error: `Failed to fetch ERAs (HTTP ${result.status})`,
        };
      }

      const rawFiles = splitEdiFiles(result.text);
      const eras = rawFiles.map(raw => parse835(raw)).filter((e): e is EraParseResult => e !== null);

      return { eras, rawFiles };
    } catch (err) {
      return {
        eras: [],
        rawFiles: [],
        error: err instanceof Error ? err.message : "Unknown ERA fetch error",
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 999 Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an X12 999 Functional Acknowledgment EDI file.
 *
 * Segment order: ISA → GS → ST(999) → AK1 → AK2* → AK3* → AK4* → AK9 → SE → GE → IEA
 */
export function parse999(ediContent: string): Ack999ParseResult | null {
  if (!ediContent.trim()) return null;

  // Detect element separator from ISA (position 3) and segment terminator (position 105)
  const isa = ediContent.slice(0, 106);
  if (!isa.startsWith("ISA")) return null;

  const elementSep = isa[3];          // e.g. "*"
  const segmentTerm = isa[105];       // e.g. "~"

  const segments = ediContent
    .split(segmentTerm)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.split(elementSep));

  const result: Ack999ParseResult = {
    interchangeControlNumber: "",
    sentDate: "",
    transactions: [],
    overallAccepted: true,
  };

  let currentTxn: Ack999Transaction | null = null;

  for (const seg of segments) {
    const id = seg[0];

    switch (id) {
      case "ISA":
        result.interchangeControlNumber = (seg[13] || "").trim();
        // ISA09 = interchange date YYMMDD
        result.sentDate = parseIsaDate(seg[9] || "");
        break;

      case "AK1":
        // AK1*FA*1 — functional group acknowledgment header
        // AK102 = group control number
        currentTxn = {
          groupControlNumber: seg[2] || "",
          transactionSetId: "",
          acknowledgeCode: "A",
          errors: [],
        };
        break;

      case "AK2":
        // AK2*999*0001 — transaction set response header
        if (currentTxn) {
          currentTxn.transactionSetId = seg[2] || "";
        }
        break;

      case "AK3":
        // AK3*segId*lineNo**errorCode — segment error
        if (currentTxn) {
          currentTxn.errors.push({
            segmentId: seg[1],
            errorCode: seg[4] || "",
            description: map999SegmentError(seg[4] || ""),
            level: "segment",
          });
        }
        break;

      case "AK4":
        // AK4*pos*elemNo*errorCode — element error
        if (currentTxn) {
          currentTxn.errors.push({
            elementPosition: parseInt(seg[1] || "0"),
            errorCode: seg[3] || "",
            description: map999ElementError(seg[3] || ""),
            level: "transaction",
          });
        }
        break;

      case "AK5":
        // AK5*A/E/R — transaction set acknowledgment (used in 997, some 999s)
        if (currentTxn) {
          const code = (seg[1] || "A") as "A" | "E" | "R";
          currentTxn.acknowledgeCode = code;
          if (code === "R") result.overallAccepted = false;
        }
        break;

      case "IK5":
        // IK5*A/E/R — 999-specific transaction set acknowledgment code
        if (currentTxn) {
          const code = (seg[1] || "A") as "A" | "E" | "R";
          currentTxn.acknowledgeCode = code;
          if (code === "R") result.overallAccepted = false;
        }
        break;

      case "AK9":
      case "IK6":
        // AK9 / IK6 — functional group response trailer
        {
          const groupCode = (seg[1] || "A") as "A" | "E" | "R";
          if (groupCode === "R" || groupCode === "E") result.overallAccepted = false;
          if (currentTxn) {
            result.transactions.push(currentTxn);
            currentTxn = null;
          }
        }
        break;
    }
  }

  // Push any unclosed transaction
  if (currentTxn) result.transactions.push(currentTxn);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 835 ERA Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an X12 835 Health Care Claim Payment/Advice (ERA).
 *
 * Key segments: ISA/GS/ST(835) → BPR → TRN → DTM → N1*PR → N1*PE → CLP → SVC → CAS → SE → GE → IEA
 */
export function parse835(ediContent: string): EraParseResult | null {
  if (!ediContent.trim()) return null;
  if (!ediContent.includes("835")) return null;

  const isa = ediContent.slice(0, 106);
  if (!isa.startsWith("ISA")) return null;

  const elementSep = isa[3];
  const segmentTerm = isa[105];

  const segments = ediContent
    .split(segmentTerm)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.split(elementSep));

  const result: EraParseResult = {
    totalPaymentAmount: 0,
    checkNumber: "",
    paymentMethod: "",
    paymentDate: "",
    payerName: "",
    payeeNpi: undefined,
    claims: [],
    rawContent: ediContent,
  };

  let currentClaim: EraClaimPayment | null = null;
  let currentServiceLine: EraServiceLine | null = null;
  let lastN1Loop = "";   // "PR" = payer, "PE" = payee

  for (const seg of segments) {
    const id = seg[0];

    switch (id) {
      case "BPR":
        // BPR*I*amount*C*ACH/CHK...
        result.totalPaymentAmount = parseFloat(seg[2] || "0");
        result.paymentMethod = mapPaymentMethod(seg[4] || "");
        break;

      case "TRN":
        // TRN*1*checkNumber
        if (seg[1] === "1") result.checkNumber = seg[2] || "";
        break;

      case "DTM":
        // DTM*405*CCYYMMDD — payment date
        if (seg[1] === "405") result.paymentDate = parseEdiDate(seg[2] || "");
        break;

      case "N1":
        lastN1Loop = seg[2] || "";
        if (seg[2] === "PR") result.payerName = seg[3] || "";
        if (seg[2] === "PE") result.payeeNpi = seg[4] || undefined;
        break;

      case "CLP":
        // Save previous claim
        if (currentServiceLine && currentClaim) {
          currentClaim.serviceLines.push(currentServiceLine);
          currentServiceLine = null;
        }
        if (currentClaim) result.claims.push(currentClaim);

        currentClaim = {
          payerClaimNumber: seg[1] || "",
          claimStatusCode: seg[2] || "",
          claimStatusLabel: mapClaimStatus(seg[2] || ""),
          chargedAmount: parseFloat(seg[3] || "0"),
          paidAmount: parseFloat(seg[4] || "0"),
          patientResponsibility: parseFloat(seg[5] || "0"),
          patientName: undefined,
          patientMemberId: undefined,
          serviceLines: [],
          adjustments: [],
        };
        break;

      case "NM1":
        // NM1*QC — patient name in claim loop
        if (seg[1] === "QC" && currentClaim) {
          currentClaim.patientName = [seg[4], seg[3]].filter(Boolean).join(" ");
          currentClaim.patientMemberId = seg[9] || undefined;
        }
        break;

      case "SVC":
        // Save previous service line
        if (currentServiceLine && currentClaim) {
          currentClaim.serviceLines.push(currentServiceLine);
        }

        // SVC*HC:CPT:mod1:mod2*submitted*paid**units**remittedCPT
        if (currentClaim) {
          const cptRaw = seg[1] || "";
          const cptParts = cptRaw.split(":");
          currentServiceLine = {
            cptCode: cptParts[1] || cptParts[0] || "",
            submittedCharge: parseFloat(seg[2] || "0"),
            paidAmount: parseFloat(seg[3] || "0"),
            revenueCode: cptParts[0] === "NU" ? undefined : undefined,
            units: seg[5] ? parseFloat(seg[5]) : undefined,
            adjustments: [],
          };
        }
        break;

      case "CAS":
        // CAS*groupCode*reasonCode*amount*units (repeating triplets)
        {
          const group = seg[1] || "";
          const target = currentServiceLine || currentClaim;
          if (target) {
            // Each CAS can have up to 6 group/reason/amount/units sets
            for (let i = 0; i < 6; i++) {
              const base = i * 4;
              const reason = seg[2 + base];
              const amt = seg[3 + base];
              if (!reason || !amt) break;
              const adj: EraAdjustment = {
                groupCode: group,
                groupLabel: mapCasGroup(group),
                reasonCode: reason,
                reasonDescription: mapCasReason(reason),
                amount: parseFloat(amt),
                units: seg[4 + base] ? parseFloat(seg[4 + base]) : undefined,
              };
              if (currentServiceLine) {
                currentServiceLine.adjustments.push(adj);
              } else if (currentClaim) {
                currentClaim.adjustments.push(adj);
              }
            }
          }
        }
        break;
    }
  }

  // Flush last service line and claim
  if (currentServiceLine && currentClaim) currentClaim.serviceLines.push(currentServiceLine);
  if (currentClaim) result.claims.push(currentClaim);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build X12 837P EDI from a Kinship charge record
// ─────────────────────────────────────────────────────────────────────────────

export interface Build837Input {
  charge: {
    id: string;
    service_date: string;
    cpt_code: string;
    cpt_description?: string | null;
    icd10_codes: string[];
    units: number;
    charge_amount: number;
  };
  client: {
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    insurance_member_id?: string | null;
    insurance_group_number?: string | null;
    insurance_provider?: string | null;
    insurance_auth_number?: string | null;
  };
  org: {
    name: string;
    npi?: string | null;
    tax_id?: string | null;
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  /** Rendering provider NPI */
  providerNpi?: string;
}

/**
 * Build a minimal X12 837P Professional claim suitable for Office Ally.
 * Uses fixed "~" segment terminator and "*" element separator.
 *
 * NOTE: For production use, verify with your Office Ally account rep that
 * this format matches your trading partner agreement specs.
 */
export function build837P(input: Build837Input): string {
  const { charge, client, org } = input;
  const now = new Date();
  const dateStr = formatDate6(now);          // YYMMDD
  const dateStr8 = formatDate8(now);         // CCYYMMDD
  const timeStr = formatTime4(now);          // HHMM
  const icn = generateControlNumber();       // ISA13 (9 digits)
  const gcn = String(Math.floor(Math.random() * 9000) + 1000); // GS06
  const tcn = "0001";

  const billerNpi = org.npi || "0000000000";
  const renderNpi = input.providerNpi || billerNpi;
  const taxId = (org.tax_id || "000000000").replace(/\D/g, "");

  const serviceDate = charge.service_date.replace(/-/g, "");

  // Diagnosis codes (max 12 in loop 2300)
  const diags = (charge.icd10_codes || []).slice(0, 12);
  const diagSegments = diags
    .map((code, i) => `HI*ABK:${code.replace(".", "")}`)
    .join("~\n");

  // Member IDs
  const memberId = client.insurance_member_id || "UNKNOWN";
  const dob = client.date_of_birth ? client.date_of_birth.replace(/-/g, "") : "19000101";
  const genderCode = client.gender?.toLowerCase() === "female" ? "F" : "M";

  const lines = [
    `ISA*00*          *00*          *ZZ*${padTo(billerNpi, 15)}*ZZ*OFFICEALLY     *${dateStr}*${timeStr}*^*00501*${padTo(icn, 9)}*0*P*:`,
    `GS*HC*${billerNpi}*OFFICEALLY*${dateStr8}*${timeStr}*${gcn}*X*005010X222A1`,
    `ST*837*${tcn}*005010X222A1`,
    // BHT — beginning of hierarchical transaction
    `BHT*0019*00*${charge.id.slice(0,10)}*${dateStr8}*${timeStr}*CH`,
    // 1000A — submitter
    `NM1*41*2*${escEdi(org.name)}*****46*${billerNpi}`,
    `PER*IC*Billing Department*TE*0000000000`,
    // 1000B — receiver (Office Ally)
    `NM1*40*2*OFFICE ALLY*****46*OFFICEALLY`,
    // 2000A — billing provider hierarchical level
    `HL*1**20*1`,
    `PRV*BI*PXC*${billerNpi}`,
    `NM1*85*2*${escEdi(org.name)}*****XX*${billerNpi}`,
    `N3*${org.address_line1 || "123 Main St"}`,
    `N4*${org.city || ""}*${org.state || ""}*${(org.zip || "").slice(0,5)}`,
    `REF*EI*${taxId}`,
    // 2000B — subscriber hierarchical level
    `HL*2*1*22*0`,
    `SBR*P*18*${client.insurance_group_number || ""}*${escEdi(client.insurance_provider || "")}****MC`,
    // 2010BA — subscriber name
    `NM1*IL*1*${escEdi(client.last_name)}*${escEdi(client.first_name)}****MI*${memberId}`,
    `DMG*D8*${dob}*${genderCode}`,
    // 2010BB — payer name
    `NM1*PR*2*${escEdi(client.insurance_provider || "UNKNOWN PAYER")}*****PI*${memberId}`,
    // 2300 — claim information
    `CLM*${charge.id.slice(0, 20)}*${charge.charge_amount.toFixed(2)}***11:B:1*Y*A*Y*I`,
    client.insurance_auth_number ? `REF*G1*${client.insurance_auth_number}` : null,
    diagSegments,
    // 2400 — service line
    `LX*1`,
    `SV1*HC:${charge.cpt_code}*${charge.charge_amount.toFixed(2)}*UN*${charge.units}***${diags.slice(0,4).map((_, i) => i + 1).join(":")}`,
    `DTP*472*D8*${serviceDate}`,
    // 2420A — rendering provider
    `NM1*82*1*${escEdi(client.last_name)}*${escEdi(client.first_name)}****XX*${renderNpi}`,
    `PRV*PE*PXC*${renderNpi}`,
    // Trailer
    `SE*${countSegments()}*${tcn}`,
    `GE*1*${gcn}`,
    `IEA*1*${padTo(icn, 9)}`,
  ].filter(Boolean).join("~\n") + "~";

  return lines;

  function countSegments(): number {
    // Rough count — in production use precise segment counter
    return lines.split("~").filter(s => s.trim() && !s.trim().startsWith("ISA")).length + 2;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractSubmissionId(responseText: string): string | undefined {
  // Office Ally returns confirmation like "Confirmation #: 12345678" or JSON with id
  const match = responseText.match(/(?:confirmation|batch|tracking)[^:]*[:#\s]+(\w+)/i);
  return match?.[1];
}

function extractControlNumber(ediContent: string): string | undefined {
  // ISA13 is at fixed position in ISA segment
  const isa = ediContent.slice(0, 106);
  if (!isa.startsWith("ISA")) return undefined;
  const sep = isa[3];
  const parts = isa.split(sep);
  return parts[13]?.trim();
}

function splitEdiFiles(content: string): string[] {
  if (!content.trim()) return [];
  // Multiple files are sometimes concatenated — split on ISA header boundaries
  const files = content.split(/(?=ISA\*)/).filter(s => s.trim().startsWith("ISA*"));
  return files.length ? files : [content];
}

function parseIsaDate(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const yyyy = yy >= 50 ? `19${yy}` : `20${String(yy).padStart(2, "0")}`;
  return `${yyyy}-${mm}-${dd}`;
}

function parseEdiDate(ccyymmdd: string): string {
  if (ccyymmdd.length !== 8) return ccyymmdd;
  return `${ccyymmdd.slice(0, 4)}-${ccyymmdd.slice(4, 6)}-${ccyymmdd.slice(6, 8)}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function formatDate6(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function formatDate8(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

function formatTime4(d: Date): string {
  return String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
}

function generateControlNumber(): string {
  return String(Math.floor(Math.random() * 900000000) + 100000000);
}

function padTo(val: string, len: number): string {
  return val.slice(0, len).padEnd(len, " ");
}

function escEdi(val: string): string {
  return val.replace(/[*~:^]/g, " ").toUpperCase().slice(0, 35);
}

function mapPaymentMethod(code: string): string {
  const map: Record<string, string> = {
    ACH: "ACH/EFT",
    BOP: "Financial Institution Option",
    CHK: "Check",
    FWT: "Federal Reserve Wire Transfer",
    NON: "Non-Payment",
  };
  return map[code] || code;
}

function mapClaimStatus(code: string): string {
  const map: Record<string, string> = {
    "1": "Processed as Primary",
    "2": "Processed as Secondary",
    "3": "Processed as Tertiary",
    "4": "Denied",
    "19": "Processed as Primary, Forwarded to Additional Payer",
    "20": "Processed as Secondary, Forwarded to Additional Payer",
    "21": "Processed as Tertiary, Forwarded to Additional Payer",
    "22": "Reversal of Prior Payment",
    "23": "Not Our Claim, Forwarded to Additional Payer",
    "25": "Predetermination Pricing",
  };
  return map[code] || `Status ${code}`;
}

function mapCasGroup(code: string): string {
  const map: Record<string, string> = {
    CO: "Contractual Obligation",
    OA: "Other Adjustment",
    PI: "Payer Initiated Reductions",
    PR: "Patient Responsibility",
  };
  return map[code] || code;
}

function mapCasReason(code: string): string {
  const map: Record<string, string> = {
    "1": "Deductible",
    "2": "Coinsurance",
    "3": "Co-payment",
    "4": "Late filing",
    "5": "Covered benefit not contracted",
    "6": "Duplicate claim/service",
    "7": "Non-covered service",
    "8": "Amount over benefit maximum",
    "10": "Amount exceeds allowed amount",
    "11": "Diagnosis inconsistent with procedure",
    "16": "Claim lacks required information",
    "18": "Duplicate claim",
    "19": "Bundling/unbundling issue",
    "22": "Non-covered service — not medically necessary",
    "24": "Charges are covered under a capitation agreement",
    "26": "Expenses incurred prior to coverage",
    "27": "Expenses incurred after coverage terminated",
    "29": "Timely filing limit exceeded",
    "35": "Lifetime benefit maximum reached",
    "45": "Charge exceeds fee schedule",
    "50": "Non-covered service — not deemed medically necessary",
    "51": "Prior authorization not obtained",
    "96": "Non-covered charges",
    "97": "Bundled payment",
    "109": "Claim not covered by payer",
    "119": "Benefit maximum reached for period",
    "197": "Precertification/authorization absent",
    "204": "Service inconsistent with diagnosis",
  };
  return map[code] || `Reason code ${code}`;
}

function map999SegmentError(code: string): string {
  const map: Record<string, string> = {
    "1": "Unrecognized segment ID",
    "2": "Unexpected segment",
    "3": "Mandatory segment missing",
    "4": "Loop not in proper sequence",
    "5": "Segment exceeds maximum use",
    "6": "Transaction set control number violation",
    "7": "Segment has data element errors",
    "8": "Trailing segments in error",
  };
  return map[code] || `Segment error ${code}`;
}

function map999ElementError(code: string): string {
  const map: Record<string, string> = {
    "1": "Mandatory element missing",
    "2": "Conditional required element missing",
    "3": "Too many data elements",
    "4": "Data element too short",
    "5": "Data element too long",
    "6": "Invalid character in data element",
    "7": "Invalid code value",
    "8": "Invalid date",
    "9": "Invalid time",
    "10": "Exclusion condition violated",
  };
  return map[code] || `Element error ${code}`;
}
