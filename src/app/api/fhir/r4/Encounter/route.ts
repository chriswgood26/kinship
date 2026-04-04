/**
 * FHIR R4 Encounter — /api/fhir/r4/Encounter
 * Search: GET /api/fhir/r4/Encounter?patient={id}&status=finished&date=2025-01-01
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirEncounter, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

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
  // FHIR: patient param may be "Patient/uuid" or just "uuid"
  const patientParam = params.get("patient");
  const patientId = patientParam?.startsWith("Patient/")
    ? patientParam.slice(8)
    : patientParam;
  const status = params.get("status");
  const date = params.get("date"); // exact date or ge/le prefix
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("encounters")
    .select("*")
    .eq("organization_id", orgId)
    .order("encounter_date", { ascending: false })
    .range(_offset, _offset + _count - 1);

  if (_id) query = query.eq("id", _id);
  if (patientId) query = query.eq("client_id", patientId);
  if (status) {
    // Map FHIR status back to DB status
    const statusMap: Record<string, string> = {
      "in-progress": "in_progress",
      finished: "completed",
      cancelled: "cancelled",
      planned: "scheduled",
    };
    query = query.eq("status", statusMap[status] || status);
  }
  if (date) {
    // Handle date prefixes: ge, le, gt, lt, eq
    const prefix = date.match(/^(ge|le|gt|lt|eq)/)?.[1];
    const dateVal = prefix ? date.slice(2) : date;
    if (!prefix || prefix === "eq") query = query.eq("encounter_date", dateVal);
    else if (prefix === "ge") query = query.gte("encounter_date", dateVal);
    else if (prefix === "le") query = query.lte("encounter_date", dateVal);
    else if (prefix === "gt") query = query.gt("encounter_date", dateVal);
    else if (prefix === "lt") query = query.lt("encounter_date", dateVal);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(fhirOperationOutcome("error", "exception", error.message), {
      status: 500,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const fhirEncounters = (data || []).map(toFhirEncounter);
  const bundle = toFhirBundle("Encounter", fhirEncounters);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
