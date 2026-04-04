/**
 * FHIR R4 Encounter — /api/fhir/r4/Encounter/[id]
 */
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { toFhirEncounter, fhirOperationOutcome, FHIR_CONTENT_TYPE } from "@/lib/fhir";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("encounters")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) {
    return NextResponse.json(fhirOperationOutcome("error", "not-found", `Encounter/${id} not found`), {
      status: 404,
      headers: { "Content-Type": FHIR_CONTENT_TYPE },
    });
  }

  return NextResponse.json(toFhirEncounter(data), {
    headers: { "Content-Type": FHIR_CONTENT_TYPE },
  });
}
