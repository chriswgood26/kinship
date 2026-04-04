"use client";

import { useState } from "react";

interface Patient {
  first_name: string; last_name: string; mrn: string | null;
  date_of_birth: string | null; insurance_provider: string | null;
  insurance_member_id: string | null; insurance_group_number: string | null;
  address_line1: string | null; city: string | null; state: string | null; zip: string | null;
}
interface Charge {
  id: string; client_id: string; service_date: string;
  cpt_code: string; cpt_description: string | null;
  icd10_codes: string[] | null; units: number; charge_amount: number;
  status: string; patient?: Patient | Patient[] | null;
}
interface Org {
  name: string; npi: string | null; tax_id: string | null;
  address_line1: string | null; city: string | null; state: string | null; zip: string | null;
  phone: string | null;
}

function generate837P(charges: Charge[], org: Org | null, batchId: string): string {
  const now = new Date();
  const dt = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  const date8 = dt.slice(0, 8);
  const time4 = dt.slice(8, 12);

  const lines: string[] = [];

  // ISA — Interchange Control Header
  lines.push(`ISA*00*          *00*          *ZZ*DRCLOUDNEO     *ZZ*CLEARINGHOUSE   *${date8}*${time4}*^*00501*${batchId.padStart(9,"0")}*0*T*:`);
  lines.push(`GS*HC*DRCLOUDNEO*CLEARINGHOUSE*${date8}*${time4}*1*X*005010X222A1`);
  lines.push(`ST*837*0001*005010X222A1`);

  // BPR — Beginning of Provider
  lines.push(`BHT*0019*00*${batchId}*${date8}*${time4}*CH`);

  // Submitter
  lines.push(`NM1*41*2*${(org?.name || "CASCADE BEHAVIORAL HEALTH").toUpperCase()}*****46*${org?.npi || "1234567890"}`);
  lines.push(`PER*IC*BILLING DEPT*TE*${org?.phone || "5035550100"}`);

  // Receiver (clearinghouse)
  lines.push(`NM1*40*2*CLEARINGHOUSE*****46*999999999`);

  lines.push(`HL*1**20*1`);
  lines.push(`PRV*BI*PXC*261QM0801X`); // Behavioral health qualifier
  lines.push(`NM1*85*2*${(org?.name || "CASCADE BEHAVIORAL HEALTH").toUpperCase()}*****XX*${org?.npi || "1234567890"}`);
  lines.push(`N3*${org?.address_line1 || "123 MAIN ST"}`);
  lines.push(`N4*${(org?.city || "PORTLAND").toUpperCase()}*${org?.state || "OR"}*${org?.zip || "97201"}`);
  lines.push(`REF*EI*${org?.tax_id || "910123456"}`);

  let hlCount = 2;
  let clmCount = 1;

  // Group by patient
  const byPatient: Record<string, Charge[]> = {};
  charges.forEach(c => {
    if (!byPatient[c.client_id]) byPatient[c.client_id] = [];
    byPatient[c.client_id].push(c);
  });

  Object.entries(byPatient).forEach(([, patientCharges]) => {
    const firstCharge = patientCharges[0];
    const patient = Array.isArray(firstCharge.patient) ? firstCharge.patient[0] : firstCharge.patient;
    if (!patient) return;

    lines.push(`HL*${hlCount}*1*22*0`);
    hlCount++;

    const dobFormatted = patient.date_of_birth?.replace(/-/g, "") || "19800101";
    lines.push(`NM1*IL*1*${patient.last_name.toUpperCase()}*${patient.first_name.toUpperCase()}****MI*${patient.insurance_member_id || "UNKNOWN"}`);
    lines.push(`N3*${patient.address_line1 || "UNKNOWN"}`);
    lines.push(`N4*${(patient.city || "PORTLAND").toUpperCase()}*${patient.state || "OR"}*${patient.zip || "97201"}`);
    lines.push(`DMG*D8*${dobFormatted}`);

    // Payer
    lines.push(`NM1*PR*2*${(patient.insurance_provider || "UNKNOWN INSURANCE").toUpperCase()}*****PI*12345`);

    patientCharges.forEach(charge => {
      const svcDate = charge.service_date.replace(/-/g, "");
      const totalAmt = (Number(charge.charge_amount) * (charge.units || 1)).toFixed(2);
      const claimId = `CLM${String(clmCount).padStart(4, "0")}`;
      clmCount++;

      lines.push(`CLM*${claimId}*${totalAmt}***11:B:1*Y*A*Y*I`);

      // Diagnoses
      const diags = charge.icd10_codes?.filter(Boolean) || ["F32.9"];
      diags.slice(0, 4).forEach((code, i) => {
        lines.push(`HI*${i === 0 ? "ABK" : "ABF"}:${code.replace(".", "")}`);
      });

      // Service line
      lines.push(`LX*1`);
      lines.push(`SV1*HC:${charge.cpt_code}*${totalAmt}*UN*${charge.units || 1}***1`);
      lines.push(`DTP*472*D8*${svcDate}`);
    });
  });

  lines.push(`SE*${lines.length + 1}*0001`);
  lines.push(`GE*1*1`);
  lines.push(`IEA*1*${batchId.padStart(9, "0")}`);

  return lines.join("\n");
}

// ─── CMS-1500 Form Generator ────────────────────────────────────────────────
function generateCMS1500HTML(charges: Charge[], org: Org | null): string {
  // Group charges by patient
  const byPatient: Record<string, Charge[]> = {};
  charges.forEach(c => {
    if (!byPatient[c.client_id]) byPatient[c.client_id] = [];
    byPatient[c.client_id].push(c);
  });

  const forms = Object.values(byPatient).map(patientCharges => {
    const firstCharge = patientCharges[0];
    const patient = Array.isArray(firstCharge.patient) ? firstCharge.patient[0] : firstCharge.patient;
    if (!patient) return "";

    const ptName = `${patient.last_name}, ${patient.first_name}`;
    const ptDob = patient.date_of_birth ? patient.date_of_birth.replace(/-/g, "/") : "";
    const ptAddr = [patient.address_line1, patient.city, patient.state, patient.zip].filter(Boolean).join(", ");
    const insurer = patient.insurance_provider || "";
    const memberId = patient.insurance_member_id || "";
    const groupNum = patient.insurance_group_number || "";
    const orgName = org?.name || "";
    const orgNpi = org?.npi || "";
    const orgTaxId = org?.tax_id || "";
    const orgAddr = [org?.address_line1, org?.city, org?.state, org?.zip].filter(Boolean).join(", ");

    // Collect all unique diagnoses
    const allDiags: string[] = [];
    patientCharges.forEach(c => {
      (c.icd10_codes || []).forEach(d => {
        if (d && !allDiags.includes(d)) allDiags.push(d);
      });
    });
    const diags = allDiags.slice(0, 12);

    // Service lines (up to 6 per form page)
    const serviceLines = patientCharges.slice(0, 6).map((c, idx) => {
      const svcDate = c.service_date
        ? new Date(c.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
        : "";
      const amount = Number(c.charge_amount).toFixed(2);
      // Build diagnosis pointer (A=1st, B=2nd, etc.)
      const diagPtrs = (c.icd10_codes || []).slice(0, 4).map((d: string) => {
        const pos = allDiags.indexOf(d);
        return pos >= 0 ? String.fromCharCode(65 + pos) : "";
      }).filter(Boolean).join("");
      return `
        <tr style="height:22px;font-size:9pt;">
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;">${svcDate}</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;"></td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;">11</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;font-weight:bold;">${c.cpt_code}</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;"></td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;">${diagPtrs || "A"}</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:right;">${amount}</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;">${c.units || 1}</td>
          <td style="border-right:1px solid #999;padding:1px 4px;text-align:center;"></td>
          <td style="padding:1px 4px;text-align:center;">${orgNpi}</td>
        </tr>`;
    }).join("");

    const totalCharge = patientCharges.reduce((s, c) => s + Number(c.charge_amount), 0).toFixed(2);

    const diagCells = Array.from({ length: 12 }, (_, i) => {
      const code = diags[i] || "";
      const letter = String.fromCharCode(65 + i);
      return `<td style="border:1px solid #999;padding:2px 4px;font-size:8pt;">${letter}. ${code}</td>`;
    });
    // Arrange in 4 columns × 3 rows
    const diagRows = [
      [0,1,2,3], [4,5,6,7], [8,9,10,11]
    ].map(group =>
      `<tr>${group.map(i => diagCells[i]).join("")}</tr>`
    ).join("");

    return `
    <div class="cms-form">
      <!-- Form Header -->
      <div style="text-align:center;margin-bottom:4px;">
        <div style="font-size:11pt;font-weight:bold;letter-spacing:1px;">HEALTH INSURANCE CLAIM FORM</div>
        <div style="font-size:7.5pt;color:#555;">APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12 &nbsp;&nbsp; CMS-1500 (02-12)</div>
      </div>

      <table style="width:100%;border-collapse:collapse;border:1.5px solid #333;font-size:8.5pt;font-family:Arial,sans-serif;">
        <!-- Row 1: Insurance type + Insured ID -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;font-weight:bold;">1. MEDICARE&nbsp;□ &nbsp; MEDICAID&nbsp;□ &nbsp; TRICARE&nbsp;□ &nbsp; CHAMPVA&nbsp;□ &nbsp; GROUP HEALTH PLAN&nbsp;■ &nbsp; FECA&nbsp;□ &nbsp; OTHER&nbsp;□</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">1a. INSURED'S I.D. NUMBER</div>
            <div style="font-weight:bold;">${memberId}</div>
          </td>
        </tr>

        <!-- Row 2: Patient name | DOB | Sex | Insured name -->
        <tr>
          <td colspan="3" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">2. PATIENT'S NAME (Last Name, First Name, Middle Initial)</div>
            <div style="font-weight:bold;">${ptName}</div>
          </td>
          <td style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">3. PATIENT'S BIRTH DATE</div>
            <div style="font-weight:bold;">${ptDob}</div>
          </td>
          <td style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">SEX</div>
            <div>M □ &nbsp; F □</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">4. INSURED'S NAME (Last Name, First Name, Middle Initial)</div>
            <div style="font-weight:bold;">${ptName}</div>
          </td>
        </tr>

        <!-- Row 3: Patient address | Relationship | Insured address -->
        <tr>
          <td colspan="3" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">5. PATIENT'S ADDRESS (No., Street)</div>
            <div>${ptAddr}</div>
          </td>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">6. PATIENT RELATIONSHIP TO INSURED</div>
            <div>Self ■ &nbsp; Spouse □ &nbsp; Child □ &nbsp; Other □</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">7. INSURED'S ADDRESS (No., Street)</div>
            <div>${ptAddr}</div>
          </td>
        </tr>

        <!-- Row 4: Insurance info -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">9. OTHER INSURED'S NAME (Last Name, First Name, Middle Initial)</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">11. INSURED'S POLICY GROUP OR FECA NUMBER</div>
            <div style="font-weight:bold;">${groupNum}</div>
          </td>
        </tr>

        <!-- Row 5: Insurance name -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">10. IS PATIENT'S CONDITION RELATED TO:</div>
            <div style="font-size:8pt;">a. Employment □ &nbsp; b. Auto Accident □ &nbsp; c. Other Accident □</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">11c. INSURANCE PLAN NAME OR PROGRAM NAME</div>
            <div style="font-weight:bold;">${insurer}</div>
          </td>
        </tr>

        <!-- Signature / authorization -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE</div>
            <div style="font-size:8pt;font-style:italic;">Signature on File</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE</div>
            <div style="font-size:8pt;font-style:italic;">Signature on File</div>
          </td>
        </tr>

        <!-- Row 14-16: Condition dates -->
        <tr>
          <td colspan="3" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">14. DATE OF CURRENT ILLNESS/INJURY/PREGNANCY</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">15. OTHER DATE</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">16. DATES PATIENT UNABLE TO WORK IN CURRENT OCCUPATION</div>
            <div>&nbsp;</div>
          </td>
        </tr>

        <!-- Row 17: Referring provider -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">17. NAME OF REFERRING PROVIDER OR OTHER SOURCE</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">18. HOSPITALIZATION DATES RELATED TO CURRENT SERVICES</div>
            <div>&nbsp;</div>
          </td>
        </tr>

        <!-- Row 19-20 -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">19. ADDITIONAL CLAIM INFORMATION</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">20. OUTSIDE LAB? □ YES □ NO &nbsp;&nbsp; $ CHARGES</div>
            <div>&nbsp;</div>
          </td>
        </tr>

        <!-- Row 21: Diagnosis codes -->
        <tr>
          <td colspan="10" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;margin-bottom:3px;">21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY (Relate A-L to service line below)</div>
            <table style="width:100%;border-collapse:collapse;">
              ${diagRows}
            </table>
          </td>
        </tr>

        <!-- Row 22-23 -->
        <tr>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">22. RESUBMISSION CODE &nbsp;&nbsp; ORIGINAL REF. NO.</div>
            <div>&nbsp;</div>
          </td>
          <td colspan="5" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">23. PRIOR AUTHORIZATION NUMBER</div>
            <div>&nbsp;</div>
          </td>
        </tr>

        <!-- Row 24 header -->
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">24A. DATE(S) OF SERVICE</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">B. POS</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">C. EMG</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">D. PROCEDURES, SERVICES, OR SUPPLIES<br/>(CPT/HCPCS)</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">E. MODIFIER</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">F. DIAG. POINTER</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">G. $ CHARGES</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">H. DAYS/UNITS</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">I. EPSDT</th>
          <th style="border:1px solid #999;padding:2px 3px;font-size:7pt;text-align:center;">J. RENDERING PROVIDER ID#</th>
        </tr>

        <!-- Service lines -->
        <tbody style="font-size:8.5pt;">
          ${serviceLines}
          ${Array.from({ length: Math.max(0, 6 - Math.min(6, patientCharges.length)) }, () =>
            `<tr style="height:22px;"><td colspan="10" style="border:1px solid #999;">&nbsp;</td></tr>`
          ).join("")}
        </tbody>

        <!-- Row 25-30 -->
        <tr>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">25. FEDERAL TAX I.D. NUMBER &nbsp; SSN □ EIN □</div>
            <div style="font-weight:bold;">${orgTaxId}</div>
          </td>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">26. PATIENT'S ACCOUNT NO.</div>
            <div style="font-weight:bold;">${patient.mrn || ""}</div>
          </td>
          <td style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">27. ACCEPT ASSIGNMENT?</div>
            <div>YES ■ &nbsp; NO □</div>
          </td>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">28. TOTAL CHARGE</div>
            <div style="font-weight:bold;">$&nbsp;${totalCharge}</div>
          </td>
          <td style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">29. AMOUNT PAID</div>
            <div>$&nbsp;0.00</div>
          </td>
          <td colspan="2" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">30. BALANCE DUE (Reserved)</div>
            <div style="font-weight:bold;">$&nbsp;${totalCharge}</div>
          </td>
        </tr>

        <!-- Row 31-33 -->
        <tr>
          <td colspan="4" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">31. SIGNATURE OF PHYSICIAN OR SUPPLIER</div>
            <div style="font-style:italic;font-size:8pt;">Signature on File &nbsp;&nbsp; Date: ${new Date().toLocaleDateString("en-US")}</div>
          </td>
          <td colspan="3" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">32. SERVICE FACILITY LOCATION INFORMATION</div>
            <div style="font-weight:bold;font-size:8pt;">${orgName}</div>
            <div style="font-size:8pt;">${orgAddr}</div>
          </td>
          <td colspan="3" style="border:1px solid #999;padding:3px 5px;">
            <div style="font-size:7pt;color:#666;">33. BILLING PROVIDER INFO &amp; PH #</div>
            <div style="font-weight:bold;font-size:8pt;">${orgName}</div>
            <div style="font-size:8pt;">${orgAddr}</div>
            <div style="font-size:8pt;">NPI: ${orgNpi}</div>
          </td>
        </tr>
      </table>
    </div>`;
  }).filter(Boolean).join(`<div style="page-break-after:always;"></div>`);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>CMS-1500 Claim Form</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { font-family: Arial, sans-serif; font-size: 9pt; background: #fff; color: #000; margin: 0; padding: 0; }
    .cms-form { width: 100%; max-width: 7.5in; margin: 0 auto 20px auto; }
    table { width: 100%; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .cms-form { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:12px;background:#1e40af;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;cursor:pointer;" onclick="window.print()">
    🖨️ Click here to Print / Save as PDF &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight:normal;font-size:11px;">Use browser print dialog (Ctrl+P / Cmd+P)</span>
  </div>
  <div style="padding:12px;">
    ${forms}
  </div>
</body>
</html>`;
}

export default function ClaimsBatchClient({ charges, submittedCharges, org }: {
  charges: Charge[];
  submittedCharges: Charge[];
  org: Org | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview837, setPreview837] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [batchId] = useState(() => String(Math.floor(Math.random() * 900000) + 100000));

  const allSelected = selected.size === charges.length && charges.length > 0;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(charges.map(c => c.id)));
  }

  function toggle(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  const selectedCharges = charges.filter(c => selected.has(c.id));
  const selectedTotal = selectedCharges.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);

  function handlePreview() {
    const edi = generate837P(selectedCharges, org, batchId);
    setPreview837(edi);
  }

  function handleDownload() {
    const edi = generate837P(selectedCharges, org, batchId);
    const blob = new Blob([edi], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims_837P_batch${batchId}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintCMS1500() {
    const html = generateCMS1500HTML(selectedCharges, org);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  async function handleMarkSubmitted() {
    setSubmitting(true);
    await fetch("/api/billing/claims/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charge_ids: Array.from(selected), batch_id: batchId }),
    });
    setSubmitting(false);
    setSubmitted(true);
    setSelected(new Set());
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    submitted: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5">
      {/* Charges ready to claim */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              className="w-4 h-4 rounded text-teal-500 accent-teal-500" />
            <h2 className="font-semibold text-slate-900">Pending Charges</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{charges.length}</span>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{selected.size} selected · <span className="font-semibold text-slate-900">${selectedTotal.toFixed(2)}</span></span>
              <button onClick={handlePreview}
                className="border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50">
                Preview 837P
              </button>
              <button onClick={handleDownload}
                className="border border-teal-200 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-50">
                ↓ Download EDI
              </button>
              <button onClick={handlePrintCMS1500}
                className="border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-50">
                🖨 Print CMS-1500
              </button>
              <button onClick={handleMarkSubmitted} disabled={submitting}
                className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-400 disabled:opacity-50">
                {submitting ? "Submitting..." : "Mark Submitted"}
              </button>
            </div>
          )}
        </div>

        {submitted && (
          <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
            ✅ Batch {batchId} marked as submitted. Claims moved to submitted queue.
          </div>
        )}

        {charges.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No pending charges. All charges have been submitted.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="w-10 px-5 py-3"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPT</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnoses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {charges.map(charge => {
                const patient = Array.isArray(charge.patient) ? charge.patient[0] : charge.patient;
                return (
                  <tr key={charge.id} className={`hover:bg-slate-50 transition-colors ${selected.has(charge.id) ? "bg-teal-50/50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <input type="checkbox" checked={selected.has(charge.id)} onChange={() => toggle(charge.id)}
                        className="w-4 h-4 rounded text-teal-500 accent-teal-500" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{patient?.mrn}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-sm text-slate-900">{charge.cpt_code}</span>
                      <div className="text-xs text-slate-400">{charge.cpt_description}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {charge.icd10_codes?.slice(0, 2).map(code => (
                          <span key={code} className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{code}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-slate-900">${Number(charge.charge_amount).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{patient?.insurance_provider || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 837P Preview */}
      {preview837 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">837P EDI Preview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Batch ID: {batchId} · {selectedCharges.length} claim{selectedCharges.length !== 1 ? "s" : ""} · ${selectedTotal.toFixed(2)} total</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownload}
                className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-400">
                ↓ Download .txt
              </button>
              <button onClick={() => setPreview837(null)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Close</button>
            </div>
          </div>
          <div className="p-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-700 overflow-x-auto max-h-96 overflow-y-auto leading-6 whitespace-pre">
              {preview837.split("\n").map((line, i) => {
                const seg = line.split("*")[0];
                const isHeader = ["ISA", "GS", "GE", "IEA"].includes(seg);
                const isTxnHeader = ["ST", "BHT", "SE"].includes(seg);
                const isNM1 = seg === "NM1";
                const isCLM = seg === "CLM";
                const isSV1 = seg === "SV1";
                const isDX = seg === "HI";
                const isRef = seg === "REF";
                const isDTP = seg === "DTP";
                const isPRV = ["PRV", "CUR"].includes(seg);
                const color = isHeader ? "text-slate-400 italic" :
                  isTxnHeader ? "text-slate-500" :
                  isCLM ? "text-emerald-700 font-bold" :
                  isSV1 ? "text-teal-700 font-bold" :
                  isDX ? "text-red-600 font-semibold" :
                  isNM1 ? "text-blue-700 font-semibold" :
                  isPRV ? "text-purple-600" :
                  isRef ? "text-amber-600" :
                  isDTP ? "text-indigo-600" :
                  "text-slate-700";
                return (
                  <div key={i} className={color} title={seg ? `Segment: ${seg}` : ""}>
                    {line}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-100 rounded-lg p-3">
                <div className="font-semibold text-slate-700 mb-1">Color Guide</div>
                <div className="space-y-1 text-slate-500">
                  <div><span className="text-emerald-700">■</span> CLM — Claim header</div>
                  <div><span className="text-teal-700">■</span> SV1 — Service line (CPT)</div>
                  <div><span className="text-red-600">■</span> HI — Diagnosis codes</div>
                  <div><span className="text-blue-700">■</span> NM1 — Name/entity</div>
                  <div><span className="text-amber-600">■</span> REF — Reference numbers</div>
                  <div><span className="text-indigo-600">■</span> DTP — Date/time</div>
                </div>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <div className="font-semibold text-slate-700 mb-1">Key Segments</div>
                <div className="space-y-1 text-slate-500">
                  <div><strong>ISA/GS</strong> — Interchange envelope</div>
                  <div><strong>CLM</strong> — Claim header + amount</div>
                  <div><strong>HI</strong> — Diagnosis codes</div>
                  <div><strong>SV1</strong> — Service line (CPT)</div>
                </div>
              </div>
              <div className="bg-slate-100 rounded-lg p-3">
                <div className="font-semibold text-slate-700 mb-1">Next Steps</div>
                <div className="space-y-1 text-slate-500">
                  <div>1. Download .txt file</div>
                  <div>2. Upload to clearinghouse portal</div>
                  <div>3. Monitor 277CA acknowledgment</div>
                  <div>4. Post 835 ERA when received</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitted queue */}
      {submittedCharges.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <h2 className="font-semibold text-slate-900">Submitted — Awaiting Response</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{submittedCharges.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {submittedCharges.map(c => {
              const patient = Array.isArray(c.patient) ? c.patient[0] : c.patient;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1">
                    <span className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                    <span className="text-slate-400 text-xs ml-2">{new Date(c.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-700">{c.cpt_code}</span>
                  <span className="font-semibold text-sm text-slate-900">${Number(c.charge_amount).toFixed(2)}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">Submitted</span>
                  <div className="flex gap-2">
                    <button className="text-xs text-emerald-600 font-medium hover:text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">Mark Paid</button>
                    <button className="text-xs text-red-500 font-medium hover:text-red-600 border border-red-200 px-2.5 py-1 rounded-lg">Denied</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
