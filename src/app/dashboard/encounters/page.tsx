import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EncountersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();

  const { data: encounters } = await supabaseAdmin
    .from("encounters")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name), clinical_notes(is_signed)")
    .eq("organization_id", profile?.organization_id || "")
    .order("encounter_date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Encounters</h1>
          <p className="text-slate-500 text-sm mt-0.5">{encounters?.length || 0} recent</p>
        </div>
        <Link href="/dashboard/encounters/new" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">+ New Encounter</Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!encounters?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">⚕️</div>
            <p className="font-semibold text-slate-900 mb-1">No encounters yet</p>
            <Link href="/dashboard/encounters/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-3">+ Start Encounter</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {encounters.map(enc => {
              const client = Array.isArray(enc.client) ? enc.client[0] : enc.client;
              const notes = Array.isArray(enc.clinical_notes) ? enc.clinical_notes : [];
              const isSigned = notes.some((n: {is_signed: boolean}) => n.is_signed);
              const hasUnsigned = notes.some((n: {is_signed: boolean}) => !n.is_signed);
              return (
                <Link key={enc.id} href={`/dashboard/encounters/${enc.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 no-underline">
                  <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-xl flex-shrink-0">⚕️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{enc.encounter_type} · {enc.encounter_date}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isSigned ? "bg-emerald-100 text-emerald-700" : hasUnsigned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {isSigned ? "✓ Signed" : hasUnsigned ? "Unsigned note" : enc.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
