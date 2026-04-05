import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  housed_stable: { label: "Housed — Stable", color: "bg-emerald-100 text-emerald-700" },
  housed_at_risk: { label: "Housed — At Risk", color: "bg-yellow-100 text-yellow-700" },
  doubled_up: { label: "Doubled Up / Couch Surfing", color: "bg-amber-100 text-amber-700" },
  transitional: { label: "Transitional Housing", color: "bg-blue-100 text-blue-700" },
  permanent_supportive: { label: "Permanent Supportive", color: "bg-teal-100 text-teal-700" },
  emergency_shelter: { label: "Emergency Shelter", color: "bg-orange-100 text-orange-700" },
  homeless_unsheltered: { label: "Homeless — Unsheltered", color: "bg-red-100 text-red-700" },
  institutional: { label: "Institutional", color: "bg-slate-100 text-slate-600" },
  unknown: { label: "Unknown", color: "bg-slate-100 text-slate-500" },
};

export default async function HousingStatusWidget({ clientId }: { clientId: string }) {
  const { data } = await supabaseAdmin
    .from("client_housing_assessments")
    .select("housing_status, assessment_date, next_assessment_date, is_chronically_homeless")
    .eq("client_id", clientId)
    .eq("status", "active")
    .single();

  if (!data) {
    return (
      <div className="text-xs text-slate-400 italic">No assessment on file</div>
    );
  }

  const cfg = STATUS_LABELS[data.housing_status] || { label: data.housing_status, color: "bg-slate-100 text-slate-600" };
  const isOverdue = data.next_assessment_date && new Date(data.next_assessment_date) < new Date();

  return (
    <div className="space-y-2">
      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
        {cfg.label}
      </span>
      {data.is_chronically_homeless && (
        <div className="text-xs font-bold text-red-600">⚠️ Chronically Homeless</div>
      )}
      <div className="text-xs text-slate-400">
        Assessed: {new Date(data.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {data.next_assessment_date && (
        <div className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
          {isOverdue ? "⛔ Reassessment overdue" : `Next due: ${new Date(data.next_assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        </div>
      )}
    </div>
  );
}
