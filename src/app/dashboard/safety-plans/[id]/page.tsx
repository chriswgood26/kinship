import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const riskColors: Record<string, string> = {
  "Low Risk": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Moderate Risk": "bg-amber-100 text-amber-700 border-amber-300",
  "High Risk": "bg-orange-100 text-orange-700 border-orange-300",
  "Imminent Risk": "bg-red-100 text-red-700 border-red-300",
};

interface Contact {
  name: string;
  phone?: string;
  relationship?: string;
  agency?: string;
}

export default async function SafetyPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const { data: plan } = await supabaseAdmin
    .from("safety_plans")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth, phone_primary)")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id || "")
    .single();

  if (!plan) notFound();

  const client = Array.isArray(plan.client) ? plan.client[0] : plan.client;
  const riskColor = plan.risk_level ? riskColors[plan.risk_level] || "bg-slate-100 text-slate-700 border-slate-200" : null;

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {children}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/safety-plans" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Safety Plan</h1>
            {plan.risk_level && (
              <span className={`text-sm px-3 py-1 rounded-full font-semibold border ${riskColor}`}>{plan.risk_level}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {plan.status}
            </span>
          </div>
          {client && (
            <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {client.last_name}, {client.first_name} · MRN: {client.mrn || "—"}
            </Link>
          )}
        </div>
        <Link href={`/dashboard/safety-plans/new?client_id=${plan.client_id}`}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
          Revise Plan
        </Link>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Created</div>
            <div className="font-medium text-slate-900">
              {plan.created_at ? new Date(plan.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Clinician</div>
            <div className="font-medium text-slate-900">
              {plan.clinician_name || "—"}
              {plan.clinician_credentials && <span className="text-slate-500">, {plan.clinician_credentials}</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Follow-Up</div>
            <div className="font-medium text-slate-900">
              {plan.follow_up_date
                ? new Date(plan.follow_up_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : <span className="text-amber-600">Not scheduled</span>}
            </div>
          </div>
        </div>
        {plan.cssrs_screening_id && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link href={`/dashboard/screenings/cssrs/${plan.cssrs_screening_id}`}
              className="text-sm text-teal-600 font-medium hover:text-teal-700">
              🔗 View linked C-SSRS assessment →
            </Link>
          </div>
        )}
      </div>

      {/* Step 1: Warning Signs */}
      {plan.warning_signs?.length > 0 && (
        <Section title="Step 1: Warning Signs">
          <ul className="space-y-1.5">
            {plan.warning_signs.map((sign: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-amber-500 mt-0.5">⚠</span>
                {sign}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Step 2: Internal Coping Strategies */}
      {plan.internal_coping_strategies?.length > 0 && (
        <Section title="Step 2: Internal Coping Strategies">
          <ul className="space-y-1.5">
            {plan.internal_coping_strategies.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-teal-500 mt-0.5">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Step 3: Social Contacts */}
      {plan.social_contacts?.length > 0 && (
        <Section title="Step 3: Social Contacts & Distractions">
          <div className="space-y-2">
            {plan.social_contacts.map((c: Contact, i: number) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-slate-900 min-w-[120px]">{c.name}</span>
                {c.phone && <a href={`tel:${c.phone}`} className="text-teal-600 hover:underline">{c.phone}</a>}
                {c.relationship && <span className="text-slate-500 text-xs">{c.relationship}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Step 4: Support Contacts */}
      {plan.support_contacts?.length > 0 && (
        <Section title="Step 4: People to Ask for Help">
          <div className="space-y-2">
            {plan.support_contacts.map((c: Contact, i: number) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-slate-900 min-w-[120px]">{c.name}</span>
                {c.phone && <a href={`tel:${c.phone}`} className="text-teal-600 hover:underline">{c.phone}</a>}
                {c.relationship && <span className="text-slate-500 text-xs">{c.relationship}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Step 5: Professional & Crisis Contacts */}
      <Section title="Step 5: Professional & Crisis Contacts">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1.5 mb-3">
          <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Crisis Resources</div>
          <div className="grid grid-cols-2 gap-1.5 text-sm text-red-800">
            <div>📞 <span className="font-semibold">988 Lifeline:</span> Call/text 988</div>
            <div>💬 <span className="font-semibold">Crisis Text Line:</span> Text HOME to 741741</div>
            <div>🚨 <span className="font-semibold">Emergency:</span> 911</div>
          </div>
          {plan.crisis_line_included && (
            <div className="mt-2 text-xs text-emerald-700 font-semibold">✓ Crisis lines reviewed with client</div>
          )}
        </div>
        {plan.professional_contacts?.length > 0 && (
          <div className="space-y-2">
            {plan.professional_contacts.map((c: Contact, i: number) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-slate-900 min-w-[120px]">{c.name}</span>
                {c.phone && <a href={`tel:${c.phone}`} className="text-teal-600 hover:underline">{c.phone}</a>}
                {c.agency && <span className="text-slate-500 text-xs">{c.agency}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Step 6: Means Restriction */}
      <Section title="Step 6: Making the Environment Safe">
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${plan.means_restriction_discussed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
            {plan.means_restriction_discussed ? "✓" : "—"}
          </span>
          <span className={plan.means_restriction_discussed ? "text-slate-700" : "text-slate-400"}>
            Means restriction counseling {plan.means_restriction_discussed ? "was provided" : "not documented"}
          </span>
        </div>
        {plan.means_restriction_notes && (
          <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">{plan.means_restriction_notes}</p>
        )}
      </Section>

      {/* Reasons for Living */}
      {plan.reasons_for_living && (
        <Section title="Reasons for Living">
          <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{plan.reasons_for_living}&rdquo;</p>
        </Section>
      )}

      {/* Signatures */}
      <Section title="Signatures & Agreement">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Client Agreement</div>
            {plan.client_agreement ? (
              <div>
                <div className="text-emerald-700 font-semibold">✓ Client agreed to safety plan</div>
                {plan.client_signature_date && (
                  <div className="text-slate-500 text-xs mt-0.5">
                    Date: {new Date(plan.client_signature_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-amber-600">Not documented</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Clinician Signature</div>
            {plan.clinician_name ? (
              <div>
                <div className="font-semibold text-slate-900">{plan.clinician_name}{plan.clinician_credentials && `, ${plan.clinician_credentials}`}</div>
                {plan.clinician_signature_date && (
                  <div className="text-slate-500 text-xs mt-0.5">
                    Date: {new Date(plan.clinician_signature_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-amber-600">Not documented</div>
            )}
          </div>
        </div>
      </Section>

      {/* Clinical Notes */}
      {plan.notes && (
        <Section title="Clinical Notes">
          <p className="text-sm text-slate-700 leading-relaxed">{plan.notes}</p>
        </Section>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {client && (
          <Link href={`/dashboard/clients/${client.id}`}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            View Client
          </Link>
        )}
        <Link href={`/dashboard/screenings/cssrs/new?client_id=${plan.client_id}`}
          className="border border-red-200 text-red-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
          New C-SSRS
        </Link>
        <Link href={`/dashboard/safety-plans/new?client_id=${plan.client_id}`}
          className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400">
          Revise Safety Plan
        </Link>
      </div>
    </div>
  );
}
