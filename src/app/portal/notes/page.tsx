import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function PortalNotesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.notes) redirect("/portal/dashboard");

  // Only show signed notes — and only the Plan section (patient-appropriate)
  // Never show raw S/O/A sections which contain clinical jargon
  const { data: encounters } = await supabaseAdmin
    .from("encounters")
    .select("id, encounter_date, encounter_type, clinical_notes(plan, signed_at, is_signed)")
    .eq("client_id", portalUser.client_id)
    .order("encounter_date", { ascending: false })
    .limit(20);

  const visitNotes = (encounters || [])
    .filter(enc => {
      const notes = Array.isArray(enc.clinical_notes) ? enc.clinical_notes : [enc.clinical_notes];
      return notes.some((n: {is_signed: boolean}) => n?.is_signed);
    })
    .map(enc => {
      const notes = Array.isArray(enc.clinical_notes) ? enc.clinical_notes : [enc.clinical_notes];
      const signedNote = notes.find((n: {is_signed: boolean}) => n?.is_signed);
      return { ...enc, note: signedNote };
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visit Summaries</h1>
        <p className="text-slate-500 text-sm mt-0.5">After-visit summaries from your care team</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3.5 text-sm text-amber-800">
        ⚕️ These summaries are provided for your reference. If you have questions about your care, please contact your provider directly.
      </div>

      {visitNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-semibold text-slate-900">No visit summaries yet</p>
          <p className="text-slate-400 text-sm mt-1">Summaries will appear here after your appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitNotes.map(enc => (
            <div key={enc.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-900">
                    {enc.encounter_date ? new Date(enc.encounter_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—"}
                  </div>
                  <div className="text-sm text-slate-500 capitalize">{enc.encounter_type}</div>
                </div>
                {enc.note?.signed_at && (
                  <div className="text-xs text-slate-400">
                    Summary available {new Date(enc.note.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </div>

              {/* Only show the Plan — patient-appropriate action items */}
              {enc.note?.plan && (
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <div className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">Your Care Plan / Next Steps</div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{enc.note.plan}</p>
                </div>
              )}

              {/* Generic note about conditions addressed — no diagnosis codes exposed */}
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">
        <p>These are after-visit summaries. Your complete medical records are available upon request. Contact us at <span className="font-medium">(503) 555-0100</span> to request your full records.</p>
      </div>
    </div>
  );
}
