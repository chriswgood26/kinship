/**
 * FHIR R4 Observation — /api/fhir/r4/Observation
 * Maps to screenings (PHQ-9, GAD-7, C-SSRS)
 * Search: GET /api/fhir/r4/Observation?patient={id}&category=survey&code=44249-1
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirObservation, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE, SCREENING_LOINC } from "@/lib/fhir";

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
  // category is always "survey" for screenings
  const code = params.get("code"); // LOINC code — map back to tool name
  const date = params.get("date");
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("screenings")
    .select("*")
    .eq("organization_id", orgId)
    .order("administered_at", { ascending: false })
    .range(_offset, _offset + _count - 1);

  if (_id) query = query.eq("id", _id);
  if (patientId) query = query.eq("client_id", patientId);

  if (code) {
    // Map LOINC code back to tool name
    const loincCode = code.includes("|") ? code.split("|")[1] : code;
    const toolName = Object.entries(SCREENING_LOINC).find(
      ([, v]) => v.code === loincCode || v.scoreCode === loincCode
    )?.[0];
    if (toolName) {
      query = query.ilike("tool", toolName);
    }
  }

  if (date) {
    const prefix = date.match(/^(ge|le|gt|lt|eq)/)?.[1];
    const dateVal = prefix ? date.slice(2) : date;
    if (!prefix || prefix === "eq") query = query.gte("administered_at", `${dateVal}T00:00:00`).lte("administered_at", `${dateVal}T23:59:59`);
    else if (prefix === "ge") query = query.gte("administered_at", dateVal);
    else if (prefix === "le") query = query.lte("administered_at", dateVal);
    else if (prefix === "gt") query = query.gt("administered_at", dateVal);
    else if (prefix === "lt") query = query.lt("administered_at", dateVal);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(fhirOperationOutcome("error", "exception", error.message), {
      status: 500,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const fhirObservations = (data || []).map(toFhirObservation);
  const bundle = toFhirBundle("Observation", fhirObservations);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
