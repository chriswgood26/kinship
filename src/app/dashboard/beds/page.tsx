import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BedManagementClient from "./BedManagementClient";

export const dynamic = "force-dynamic";

export default async function BedManagementPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const { data: facilities } = await supabaseAdmin
    .from("facilities")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  const { data: beds } = await supabaseAdmin
    .from("beds")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("organization_id", orgId)
    .order("bed_number");

  const { data: patients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, preferred_name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  return (
    <BedManagementClient
      facilities={facilities || []}
      beds={beds || []}
      patients={patients || []}
    />
  );
}
