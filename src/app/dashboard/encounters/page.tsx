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

  // Fetch participant counts for group encounters
  const groupIds = (encounters || []).filter((e: Record<string, unknown>) => e.is_group).map((e: Record<string, unknown>) => e.id as string);
  const groupCounts: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: participantRows } = await supabaseAdmin
      .from("group_session_participants")
      .select("encounter_id")
      .in("encounter_id", groupIds);
    for (const row of participantRows || []) {
      groupCounts[row.encounter_id] = (groupCounts[row.encounter_id] || 0) + 1;
    }
  }

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
            {encounters.map((enc: Record<string, unknown>) => {
              const client = Array.isArray(enc.client) ? (enc.client as Record<string,string>[])[0] : enc.client as Record<string,string> | null;
              const notes = Array.isArray(enc.clinical_notes) ? enc.clinical_notes as {is_signed: boolean}[] : [];
              const isSigned = notes.some((n: {is_signed: boolean}) => n.is_signed);
              const hasUnsigned = notes.some((n: {is_signed: boolean}) => !n.is_signed);
              const isGroup = enc.is_group === true;
              const participantCount = isGroup ? (groupCounts[enc.id as string] || 0) : null;
              return (
                <Link key={enc.id as string} href={`/dashboard/encounters/${enc.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 no-underline">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${isGroup ? "bg-purple-50" : "bg-teal-50"}`}>
                    {isGroup ? "👥" : "⚕️"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900 text-sm">
                        {isGroup
                          ? ((enc.group_name as string) || "Group Session")
                          : (client ? `${client.last_name}, ${client.first_name}` : "—")}
                      </div>
                      {isGroup && participantCount !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {participantCount} members
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{enc.encounter_type as string} · {enc.encounter_date as string}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isSigned ? "bg-emerald-100 text-emerald-700" : hasUnsigned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {isSigned ? "✓ Signed" : hasUnsigned ? "Unsigned note" : enc.status as string}
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
