/**
 * FHIR R4 Patient — /api/fhir/r4/Patient
 * Search: GET /api/fhir/r4/Patient?name=Smith&birthdate=1980-01-01&gender=female
 * Required search params: _id, identifier, name, birthdate, gender
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirPatient, toFhirBundle, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

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
  const identifier = params.get("identifier"); // MRN lookup e.g. KIN-010001
  const name = params.get("name") || params.get("family");
  const birthdate = params.get("birthdate");
  const gender = params.get("gender");
  const _count = Math.min(parseInt(params.get("_count") || "20", 10), 100);
  const _offset = parseInt(params.get("_offset") || "0", 10);

  let query = supabaseAdmin
    .from("clients")
    .select("*")
    .eq("organization_id", orgId)
    .order("last_name")
    .range(_offset, _offset + _count - 1);

  if (_id) query = query.eq("id", _id);
  if (identifier) query = query.eq("mrn", identifier.split("|").pop() || identifier);
  if (name) query = query.or(`last_name.ilike.%${name}%,first_name.ilike.%${name}%`);
  if (birthdate) query = query.eq("date_of_birth", birthdate);
  if (gender) {
    // Reverse-map FHIR gender → DB gender values
    const genderMap: Record<string, string[]> = {
      male: ["male", "m"],
      female: ["female", "f"],
      other: ["other", "non-binary", "nonbinary"],
      unknown: ["unknown"],
    };
    const dbGenders = genderMap[gender.toLowerCase()] || [gender];
    query = query.in("gender", dbGenders);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(fhirOperationOutcome("error", "exception", error.message), {
      status: 500,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  const fhirPatients = (data || []).map(toFhirPatient);
  const bundle = toFhirBundle("Patient", fhirPatients);

  return NextResponse.json(bundle, {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
