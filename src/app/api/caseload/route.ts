import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

async function enrichClientsWithLastEncounter(clientIds: string[], orgId: string) {
  if (!clientIds.length) return {};
  // Fetch most recent encounter date per client
  const { data: encounters } = await supabaseAdmin
    .from("encounters")
    .select("client_id, encounter_date")
    .eq("organization_id", orgId)
    .in("client_id", clientIds)
    .order("encounter_date", { ascending: false });

  const lastEncMap: Record<string, string> = {};
  for (const enc of encounters || []) {
    if (!lastEncMap[enc.client_id]) {
      lastEncMap[enc.client_id] = enc.encounter_date;
    }
  }
  return lastEncMap;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const url = new URL(req.url);
  const clinicianId = url.searchParams.get("clinician_id");

  // If a specific clinician_id is requested, return their clients + last encounter
  if (clinicianId) {
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, mrn, first_name, last_name, preferred_name, date_of_birth, status, phone_primary, insurance_provider, primary_clinician_id, primary_clinician_name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("primary_clinician_id", clinicianId)
      .order("last_name");

    const ids = (clients || []).map(c => c.id);
    const lastEncMap = await enrichClientsWithLastEncounter(ids, orgId);
    const enriched = (clients || []).map(c => ({ ...c, last_encounter_date: lastEncMap[c.id] || null }));
    return NextResponse.json({ clients: enriched });
  }

  // If unassigned=true, return clients without a primary clinician + last encounter
  const unassigned = url.searchParams.get("unassigned");
  if (unassigned === "true") {
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, mrn, first_name, last_name, preferred_name, date_of_birth, status, phone_primary, insurance_provider, primary_clinician_id, primary_clinician_name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("primary_clinician_id", null)
      .order("last_name");

    const ids = (clients || []).map(c => c.id);
    const lastEncMap = await enrichClientsWithLastEncounter(ids, orgId);
    const enriched = (clients || []).map(c => ({ ...c, last_encounter_date: lastEncMap[c.id] || null }));
    return NextResponse.json({ clients: enriched });
  }

  // Otherwise return summary: all active clinicians + their caseload counts
  const [{ data: clinicians }, { data: allClients }] = await Promise.all([
    supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, credentials, role, roles, title, is_active, caseload_capacity")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("last_name"),
    supabaseAdmin
      .from("clients")
      .select("id, primary_clinician_id, status")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  // Count clients per clinician
  const countMap: Record<string, { active: number; total: number }> = {};
  for (const c of allClients || []) {
    if (!c.primary_clinician_id) continue;
    if (!countMap[c.primary_clinician_id]) countMap[c.primary_clinician_id] = { active: 0, total: 0 };
    countMap[c.primary_clinician_id].total++;
    if (c.status === "active") countMap[c.primary_clinician_id].active++;
  }

  const unassignedCount = (allClients || []).filter(c => !c.primary_clinician_id).length;
  const totalActive = (allClients || []).filter(c => c.status === "active").length;

  const summary = (clinicians || [])
    .filter(c => {
      const roles = c.roles || [c.role];
      return roles.some((r: string) => ["clinician", "supervisor", "care_coordinator"].includes(r));
    })
    .map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      credentials: c.credentials,
      title: c.title,
      role: c.role,
      count: countMap[c.id]?.active || 0,
      total_count: countMap[c.id]?.total || 0,
      caseload_capacity: c.caseload_capacity ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    summary,
    unassigned_count: unassignedCount,
    total_active: totalActive,
  });
}

// PATCH: Reassign one or many clients to a new clinician
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  // Support bulk: { client_ids: string[], clinician_id: string | null }
  // or single: { client_id: string, clinician_id: string | null }
  const clientIds: string[] = body.client_ids
    ? body.client_ids
    : body.client_id
      ? [body.client_id]
      : [];

  if (!clientIds.length) return NextResponse.json({ error: "client_id or client_ids required" }, { status: 400 });

  const clinicianId: string | null = body.clinician_id || null;

  let updateData: Record<string, string | null> = {
    primary_clinician_id: clinicianId,
    primary_clinician_name: null,
  };

  if (clinicianId) {
    const { data: clinician } = await supabaseAdmin
      .from("user_profiles")
      .select("first_name, last_name, credentials")
      .eq("id", clinicianId)
      .single();
    if (clinician) {
      updateData.primary_clinician_name = `${clinician.first_name} ${clinician.last_name}${clinician.credentials ? `, ${clinician.credentials}` : ""}`;
    }
  }

  const { error } = await supabaseAdmin
    .from("clients")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .in("id", clientIds)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, updated: clientIds.length });
}

// PUT: Update a clinician's caseload capacity
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { clinician_id, caseload_capacity } = body;
  if (!clinician_id) return NextResponse.json({ error: "clinician_id required" }, { status: 400 });

  const capacity = caseload_capacity === null || caseload_capacity === "" ? null : parseInt(caseload_capacity, 10);
  if (capacity !== null && (isNaN(capacity) || capacity <= 0)) {
    return NextResponse.json({ error: "caseload_capacity must be a positive integer or null" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({ caseload_capacity: capacity })
    .eq("id", clinician_id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
