import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ClaimsBatchClient from "./ClaimsBatchClient";
import ClaimScrubber from "@/components/ClaimScrubber";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  // Get pending charges ready to be batched into claims
  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("*, client:client_id(first_name, last_name, mrn, date_of_birth, insurance_provider, insurance_member_id, insurance_group_number, address_line1, city, state, zip)")
    .in("status", ["pending", "submitted"])
    .order("service_date", { ascending: false })
    .limit(100);

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  const pending = charges?.filter(c => c.status === "pending") || [];
  const submitted = charges?.filter(c => c.status === "submitted") || [];
  const totalPending = pending.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claim Submission</h1>
            <p className="text-slate-500 text-sm mt-0.5">Generate 837P claims and submit to clearinghouse</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold">
            {pending.length} charges ready · ${totalPending.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Clearinghouse status */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg mb-1">Clearinghouse Connection</div>
            <div className="text-slate-300 text-sm">Route claims through your clearinghouse partner</div>
          </div>
          <div className="flex gap-3">
            {["Availity", "Change Healthcare", "Office Ally", "Waystar"].map(ch => (
              <div key={ch} className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                <div className="text-xs font-semibold text-white">{ch}</div>
                <div className="text-xs text-amber-300 mt-0.5">Configure →</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-2.5 text-sm text-amber-200">
          ⚠️ Clearinghouse not yet configured. Claims can be previewed and exported as 837P EDI files for manual submission.
        </div>
      </div>

      <ClaimScrubber charges={pending} />
      <ClaimsBatchClient charges={pending} submittedCharges={submitted} org={org} />
    </div>
  );
}
