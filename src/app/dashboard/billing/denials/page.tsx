import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import DenialsClient from "./DenialsClient";

export const dynamic = "force-dynamic";

export default async function DenialsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);

  // Fetch existing denial records
  const { data: denials } = await supabaseAdmin
    .from("claim_denials")
    .select(`
      *,
      charge:charge_id(
        id, service_date, cpt_code, cpt_description, charge_amount, status, icd10_codes, modifier,
        client:client_id(id, first_name, last_name, mrn)
      )
    `)
    .eq("organization_id", orgId)
    .order("denial_date", { ascending: false })
    .limit(500);

  // Fetch submitted charges that can be logged as denials (submitted or already denied)
  const { data: deniableCharges } = await supabaseAdmin
    .from("charges")
    .select("id, service_date, cpt_code, cpt_description, charge_amount, client:client_id(id, first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .in("status", ["submitted", "denied"])
    .order("service_date", { ascending: false })
    .limit(200);

  return (
    <DenialsClient
      initialDenials={denials || []}
      deniableCharges={deniableCharges || []}
    />
  );
}
