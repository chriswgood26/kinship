/**
 * FHIR R4 Condition — /api/fhir/r4/Condition
 * Search: GET /api/fhir/r4/Condition?patient={id}&clinical-status=active&code=F32.1
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirCondition, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

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
  const clinicalStatus = params.get("clinical-status");
  const code = params.get("code"); // ICD-10 code, optionally with system prefix
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("patient_problems")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(_offset, _offset + _count - 1);

  if (_id) query = query.eq("id", _id);
  if (patientId) query = query.eq("client_id", patientId);
  if (clinicalStatus) {
    // Map FHIR clinical status back to DB status
    const statusMap: Record<string, string[]> = {
      active: ["active"],
      resolved: ["resolved"],
      inactive: ["inactive"],
    };
    const dbStatuses = statusMap[clinicalStatus] || [clinicalStatus];
    query = query.in("status", dbStatuses);
  }
  if (code) {
    // Strip system prefix e.g. "http://hl7.org/fhir/sid/icd-10-cm|F32.1" → "F32.1"
    const codeVal = code.includes("|") ? code.split("|")[1] : code;
    query = query.eq("icd10_code", codeVal);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(fhirOperationOutcome("error", "exception", error.message), {
      status: 500,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const fhirConditions = (data || []).map(toFhirCondition);
  const bundle = toFhirBundle("Condition", fhirConditions);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
