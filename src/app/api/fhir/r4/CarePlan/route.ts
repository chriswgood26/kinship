/**
 * FHIR R4 CarePlan — /api/fhir/r4/CarePlan
 * Maps to treatment_plans
 * Search: GET /api/fhir/r4/CarePlan?patient={id}&status=active
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirCarePlan, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(fhirOperationOutcome("error", "login", "Authentication required"), {
      status: 401,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json(fhirOperationOutcome("error", "forbidden", "No organization found"), {
      status: 403,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const params = req.nextUrl.searchParams;
  const _id = params.get("_id");
  const patientParam = params.get("patient");
  const patientId = patientParam?.startsWith("Patient/")
    ? patientParam.slice(8)
    : patientParam;
  const status = params.get("status");
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("treatment_plans")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(_offset, _offset + _count - 1);

  if (_id) query = query.eq("id", _id);
  if (patientId) query = query.eq("client_id", patientId);
  if (status) {
    // Map FHIR status back to DB status
    const statusMap: Record<string, string> = {
      active: "active",
      completed: "completed",
      revoked: "revoked",
      "on-hold": "on_hold",
      draft: "draft",
    };
    query = query.eq("status", statusMap[status] || status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(fhirOperationOutcome("error", "exception", error.message), {
      status: 500,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const fhirCarePlans = (data || []).map(toFhirCarePlan);
  const bundle = toFhirBundle("CarePlan", fhirCarePlans);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
