import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const prompt: string = (body.prompt || "").toLowerCase().trim();

  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const firstOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0];
  const lastOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0];

  // Helper to pick date range from prompt
  function pickDateRange(): { from: string; to: string } {
    if (/this\s+year|ytd|year.to.date/.test(prompt)) return { from: firstOfYear, to: today };
    if (/last\s+month/.test(prompt)) return { from: firstOfLastMonth, to: lastOfLastMonth };
    if (/this\s+month/.test(prompt)) return { from: firstOfMonth, to: today };
    if (/last\s+90|past\s+90|90\s+day/.test(prompt)) return { from: ninetyDaysAgo, to: today };
    if (/last\s+30|past\s+30|30\s+day/.test(prompt)) return { from: thirtyDaysAgo, to: today };
    if (/today/.test(prompt)) return { from: today, to: today };
    return { from: thirtyDaysAgo, to: today };
  }

  const dateRange = pickDateRange();

  // ── Encounters ───────────────────────────────────────────────────────────
  if (
    /encounter|visit|session|appointment|therapy|psychiatric|note|see/.test(prompt) &&
    !/charge|billing|revenue|payment|cpt|claim|paid/.test(prompt)
  ) {
    let q = supabaseAdmin
      .from("encounters")
      .select("id, encounter_date, encounter_type, status, chief_complaint, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .gte("encounter_date", dateRange.from)
      .lte("encounter_date", dateRange.to)
      .order("encounter_date", { ascending: false })
      .limit(200);

    if (/signed|complete/.test(prompt)) q = q.eq("status", "signed");
    if (/unsigned|progress|incomplete|in.progress/.test(prompt)) q = q.eq("status", "in_progress");
    if (/group/.test(prompt)) q = q.eq("is_group", true);
    if (/individual/.test(prompt)) q = q.eq("encounter_type", "Individual Therapy");
    if (/psychiatric|psych eval/.test(prompt)) q = q.ilike("encounter_type", "%psych%");

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Encounters Report",
      description: `${data?.length || 0} encounters · ${dateRange.from} to ${dateRange.to}`,
      columns: [
        { key: "date", label: "Date" },
        { key: "client", label: "Client" },
        { key: "mrn", label: "MRN" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "chief_complaint", label: "Chief Complaint" },
      ],
      rows: (data || []).map(e => {
        const c = Array.isArray(e.client) ? e.client[0] : e.client;
        return {
          date: e.encounter_date,
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          mrn: c?.mrn || "—",
          type: e.encounter_type || "—",
          status: e.status?.replace(/_/g, " ") || "—",
          chief_complaint: e.chief_complaint || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Charges / Revenue / Billing ──────────────────────────────────────────
  if (/charge|billing|revenue|payment|cpt|claim|paid|collect|invoice|money|dollar|\$/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("charges")
      .select("id, service_date, cpt_code, cpt_description, charge_amount, paid_amount, status, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .gte("service_date", dateRange.from)
      .lte("service_date", dateRange.to)
      .order("service_date", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []).map(ch => {
      const c = Array.isArray(ch.client) ? ch.client[0] : ch.client;
      return {
        date: ch.service_date,
        client: c ? `${c.last_name}, ${c.first_name}` : "—",
        mrn: c?.mrn || "—",
        cpt: ch.cpt_code || "—",
        description: ch.cpt_description || "—",
        charged: ch.charge_amount != null ? `$${Number(ch.charge_amount).toFixed(2)}` : "—",
        paid: ch.paid_amount != null ? `$${Number(ch.paid_amount).toFixed(2)}` : "—",
        status: ch.status || "—",
      };
    });

    const totalCharged = (data || []).reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);
    const totalPaid = (data || []).reduce((s, c) => s + (Number(c.paid_amount) || 0), 0);

    return NextResponse.json({
      title: "Charges & Revenue Report",
      description: `${data?.length || 0} charges · $${totalCharged.toFixed(2)} billed · $${totalPaid.toFixed(2)} collected`,
      columns: [
        { key: "date", label: "Service Date" },
        { key: "client", label: "Client" },
        { key: "cpt", label: "CPT" },
        { key: "description", label: "Description" },
        { key: "charged", label: "Charged" },
        { key: "paid", label: "Paid" },
        { key: "status", label: "Status" },
      ],
      rows,
      dateRange,
      summary: { totalCharged, totalPaid },
    });
  }

  // ── Clients / Demographics ────────────────────────────────────────────────
  if (/client|patient|individual|person|demograph|age|gender|race|ethnicit|active|admit|discharg|waitlist/.test(prompt)) {
    let q = supabaseAdmin
      .from("clients")
      .select("id, mrn, first_name, last_name, date_of_birth, gender, race, ethnicity, status, is_active, insurance_provider, created_at")
      .eq("organization_id", orgId)
      .order("last_name", { ascending: true })
      .limit(300);

    if (/active/.test(prompt) && !/in.active|dis.active/.test(prompt)) q = q.eq("is_active", true);
    if (/discharg/.test(prompt)) q = q.eq("status", "discharged");
    if (/waitlist/.test(prompt)) q = q.eq("status", "waitlist");
    if (/admit/.test(prompt)) {
      q = q.gte("created_at", `${dateRange.from}T00:00:00`).lte("created_at", `${dateRange.to}T23:59:59`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Client Report",
      description: `${data?.length || 0} clients`,
      columns: [
        { key: "mrn", label: "MRN" },
        { key: "name", label: "Name" },
        { key: "dob", label: "DOB" },
        { key: "gender", label: "Gender" },
        { key: "race", label: "Race" },
        { key: "insurance", label: "Insurance" },
        { key: "status", label: "Status" },
        { key: "admitted", label: "Admitted" },
      ],
      rows: (data || []).map(c => ({
        mrn: c.mrn || "—",
        name: `${c.last_name}, ${c.first_name}`,
        dob: c.date_of_birth || "—",
        gender: c.gender || "—",
        race: c.race || "—",
        insurance: c.insurance_provider || "—",
        status: c.status || "—",
        admitted: c.created_at ? new Date(c.created_at).toLocaleDateString("en-US") : "—",
      })),
      dateRange,
    });
  }

  // ── Diagnoses ─────────────────────────────────────────────────────────────
  if (/diagnos|icd|dx|condition/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("clinical_notes")
      .select("diagnosis_codes, encounter:encounter_id(encounter_date, client:client_id(first_name, last_name, mrn), organization_id)")
      .not("diagnosis_codes", "is", null)
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (data || []).filter((n: Record<string, unknown>) => {
      const enc = Array.isArray(n.encounter) ? n.encounter[0] : n.encounter as Record<string, unknown> | null;
      return enc && (enc as Record<string, unknown>).organization_id === orgId;
    });

    const codeCount: Record<string, number> = {};
    filtered.forEach((n: Record<string, unknown>) => {
      ((n.diagnosis_codes as string[]) || []).forEach(code => {
        codeCount[code] = (codeCount[code] || 0) + 1;
      });
    });

    const rows = Object.entries(codeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([code, count]) => ({ code, count: String(count) }));

    return NextResponse.json({
      title: "Diagnosis Code Frequency",
      description: `Top ${rows.length} diagnosis codes across ${filtered.length} notes`,
      columns: [
        { key: "code", label: "ICD-10 Code" },
        { key: "count", label: "Frequency" },
      ],
      rows,
      dateRange,
    });
  }

  // ── Treatment Plans ───────────────────────────────────────────────────────
  if (/treatment.plan|goal|tp|care.plan/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("treatment_plans")
      .select("id, plan_start_date, next_review_date, status, level_of_care, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .order("plan_start_date", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Treatment Plans Report",
      description: `${data?.length || 0} treatment plans`,
      columns: [
        { key: "client", label: "Client" },
        { key: "mrn", label: "MRN" },
        { key: "start_date", label: "Start Date" },
        { key: "next_review", label: "Next Review" },
        { key: "level", label: "Level of Care" },
        { key: "status", label: "Status" },
      ],
      rows: (data || []).map(tp => {
        const c = Array.isArray(tp.client) ? tp.client[0] : tp.client;
        return {
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          mrn: c?.mrn || "—",
          start_date: tp.plan_start_date || "—",
          next_review: tp.next_review_date || "—",
          level: tp.level_of_care || "—",
          status: tp.status || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Incidents ─────────────────────────────────────────────────────────────
  if (/incident|behavior|critical|event|adverse/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("incidents")
      .select("id, incident_date, incident_type, severity, status, description, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .gte("incident_date", dateRange.from)
      .lte("incident_date", dateRange.to)
      .order("incident_date", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Incident Report",
      description: `${data?.length || 0} incidents · ${dateRange.from} to ${dateRange.to}`,
      columns: [
        { key: "date", label: "Date" },
        { key: "client", label: "Client" },
        { key: "type", label: "Type" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
        { key: "description", label: "Description" },
      ],
      rows: (data || []).map(inc => {
        const c = Array.isArray(inc.client) ? inc.client[0] : inc.client;
        return {
          date: inc.incident_date || "—",
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          type: inc.incident_type || "—",
          severity: inc.severity || "—",
          status: inc.status || "—",
          description: inc.description?.slice(0, 80) || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Authorizations ────────────────────────────────────────────────────────
  if (/auth|authorization|prior.auth|approved|units|payer/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("authorizations")
      .select("id, auth_number, payer_name, service_type, authorized_units, used_units, start_date, end_date, status, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .order("end_date", { ascending: true })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Authorizations Report",
      description: `${data?.length || 0} authorizations`,
      columns: [
        { key: "client", label: "Client" },
        { key: "auth_number", label: "Auth #" },
        { key: "payer", label: "Payer" },
        { key: "service", label: "Service" },
        { key: "units", label: "Auth'd Units" },
        { key: "used", label: "Used" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
        { key: "status", label: "Status" },
      ],
      rows: (data || []).map(a => {
        const c = Array.isArray(a.client) ? a.client[0] : a.client;
        return {
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          auth_number: a.auth_number || "—",
          payer: a.payer_name || "—",
          service: a.service_type || "—",
          units: String(a.authorized_units ?? "—"),
          used: String(a.used_units ?? "—"),
          start_date: a.start_date || "—",
          end_date: a.end_date || "—",
          status: a.status || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Staff / Users ─────────────────────────────────────────────────────────
  if (/staff|user|clinician|provider|therapist|employee|roster|credential/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, email, roles, title, credentials, npi, is_provider, is_active")
      .eq("organization_id", orgId)
      .order("last_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Staff Roster",
      description: `${data?.length || 0} staff members`,
      columns: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "title", label: "Title" },
        { key: "credentials", label: "Credentials" },
        { key: "npi", label: "NPI" },
        { key: "roles", label: "Roles" },
        { key: "active", label: "Active" },
      ],
      rows: (data || []).map(u => ({
        name: `${u.last_name}, ${u.first_name}`,
        email: u.email || "—",
        title: u.title || "—",
        credentials: u.credentials || "—",
        npi: u.npi || "—",
        roles: (u.roles || []).join(", ") || "—",
        active: u.is_active ? "Yes" : "No",
      })),
      dateRange,
    });
  }

  // ── Screenings ────────────────────────────────────────────────────────────
  if (/screen|phq|gad|cssrs|assessment|suicide|depression|anxiety/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("screenings")
      .select("id, screening_type, total_score, severity_label, administered_at, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .gte("administered_at", `${dateRange.from}T00:00:00`)
      .lte("administered_at", `${dateRange.to}T23:59:59`)
      .order("administered_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Screenings Report",
      description: `${data?.length || 0} screenings · ${dateRange.from} to ${dateRange.to}`,
      columns: [
        { key: "date", label: "Date" },
        { key: "client", label: "Client" },
        { key: "type", label: "Screening" },
        { key: "score", label: "Score" },
        { key: "severity", label: "Severity" },
      ],
      rows: (data || []).map(s => {
        const c = Array.isArray(s.client) ? s.client[0] : s.client;
        return {
          date: s.administered_at ? new Date(s.administered_at).toLocaleDateString("en-US") : "—",
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          type: s.screening_type || "—",
          score: s.total_score != null ? String(s.total_score) : "—",
          severity: s.severity_label || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Referrals ─────────────────────────────────────────────────────────────
  if (/referral|refer|refer out|refer in/.test(prompt)) {
    const { data, error } = await supabaseAdmin
      .from("referrals")
      .select("id, referral_date, referral_type, referred_to, status, reason, client:client_id(first_name, last_name, mrn)")
      .eq("organization_id", orgId)
      .gte("referral_date", dateRange.from)
      .lte("referral_date", dateRange.to)
      .order("referral_date", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      title: "Referrals Report",
      description: `${data?.length || 0} referrals · ${dateRange.from} to ${dateRange.to}`,
      columns: [
        { key: "date", label: "Date" },
        { key: "client", label: "Client" },
        { key: "type", label: "Type" },
        { key: "referred_to", label: "Referred To" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
      ],
      rows: (data || []).map(r => {
        const c = Array.isArray(r.client) ? r.client[0] : r.client;
        return {
          date: r.referral_date || "—",
          client: c ? `${c.last_name}, ${c.first_name}` : "—",
          type: r.referral_type || "—",
          referred_to: r.referred_to || "—",
          reason: r.reason?.slice(0, 80) || "—",
          status: r.status || "—",
        };
      }),
      dateRange,
    });
  }

  // ── Fallback: Return a helpful suggestions response ───────────────────────
  return NextResponse.json({
    title: "Report Builder",
    description: "No matching report found. Try one of the example prompts below.",
    columns: [{ key: "suggestion", label: "Try asking about..." }],
    rows: [
      { suggestion: "Encounters this month" },
      { suggestion: "Charges for last 30 days" },
      { suggestion: "Active clients" },
      { suggestion: "Unsigned notes" },
      { suggestion: "Treatment plans" },
      { suggestion: "Incidents this quarter" },
      { suggestion: "Staff roster" },
      { suggestion: "PHQ-9 screenings this month" },
      { suggestion: "Authorizations expiring soon" },
      { suggestion: "Revenue this year" },
    ],
    dateRange,
    isSuggestion: true,
  });
}
