/**
 * FHIR R4 MedicationRequest — /api/fhir/r4/MedicationRequest
 * Maps to medication_orders (eMAR)
 * Search: GET /api/fhir/r4/MedicationRequest?patient={id}&status=active&intent=order
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirMedicationRequest, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

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
  // intent is always "order" for medication_orders — validate but don't filter
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("medication_orders")
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
      stopped: "discontinued",
      completed: "completed",
      "on-hold": "on_hold",
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

  const fhirMeds = (data || []).map(toFhirMedicationRequest);
  const bundle = toFhirBundle("MedicationRequest", fhirMeds);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
