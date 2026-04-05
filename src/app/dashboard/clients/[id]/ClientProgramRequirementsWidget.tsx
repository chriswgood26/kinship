import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

const ASSESSMENT_ICONS: Record<string, string> = {
  "PHQ-9": "🔵",
  "GAD-7": "🟣",
  "C-SSRS": "🔴",
  "BPS": "📋",
  "CUMHA": "👶",
  "IM+CANS": "🧠",
  "Psych Eval": "🔍",
};

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  outpatient: "Outpatient",
  intensive_outpatient: "IOP",
  partial_hospitalization: "PHP",
  residential: "Residential",
  crisis: "Crisis",
  day_program: "Day Program",
  community_support: "Community Support",
  dd_waiver: "DD Waiver",
  ccbhc: "CCBHC",
  other: "Other",
};

type MergedRequirement = {
  assessment_type: string;
  is_required_at_intake: boolean;
  reassessment_frequency_days: number | null;
  reminder_days_before: number;
  source_programs: string[];
};

function freqLabel(days: number | null): string {
  if (!days) return "No re-assessment";
  if (days === 30) return "Monthly";
  if (days === 60) return "Every 2 months";
  if (days === 90) return "Quarterly";
  if (days === 180) return "Every 6 months";
  if (days === 365) return "Annually";
  return `Every ${days} days`;
}

export default async function ClientProgramRequirementsWidget({
  clientId,
  orgId,
}: {
  clientId: string;
  orgId: string;
}) {
  // 1. Fetch active program enrollments for this client
  const { data: enrollments } = await supabaseAdmin
    .from("client_programs")
    .select("id, program_id, admission_date, program:program_id(id, name, code, program_type)")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("admission_date", { ascending: false });

  if (!enrollments?.length) {
    return (
      <div className="text-xs text-slate-400 italic">Not enrolled in any active programs</div>
    );
  }

  const programIds = enrollments.map((e: { program_id: string }) => e.program_id);

  // 2. Fetch requirements across all enrolled programs
  const { data: allRequirements } = await supabaseAdmin
    .from("program_assessment_requirements")
    .select("*")
    .eq("organization_id", orgId)
    .in("program_id", programIds)
    .eq("is_active", true)
    .order("assessment_type");

  // 3. Build a name map and compute the union with strictest settings
  const programNameMap: Record<string, string> = {};
  for (const e of enrollments) {
    const prog = e.program as unknown as { id: string; name: string } | null;
    if (prog) programNameMap[e.program_id] = prog.name;
  }

  type DbReq = {
    assessment_type: string;
    is_required_at_intake: boolean;
    reassessment_frequency_days: number | null;
    reminder_days_before: number;
    program_id: string;
  };

  const merged: Record<string, MergedRequirement> = {};
  for (const req of (allRequirements || []) as DbReq[]) {
    const progName = programNameMap[req.program_id] || req.program_id;
    const existing = merged[req.assessment_type];
    if (!existing) {
      merged[req.assessment_type] = {
        assessment_type: req.assessment_type,
        is_required_at_intake: req.is_required_at_intake,
        reassessment_frequency_days: req.reassessment_frequency_days,
        reminder_days_before: req.reminder_days_before,
        source_programs: [progName],
      };
    } else {
      existing.source_programs.push(progName);
      // Strictest wins
      if (req.is_required_at_intake) existing.is_required_at_intake = true;
      if (
        req.reassessment_frequency_days !== null &&
        (existing.reassessment_frequency_days === null ||
          req.reassessment_frequency_days < existing.reassessment_frequency_days)
      ) {
        existing.reassessment_frequency_days = req.reassessment_frequency_days;
      }
      if (req.reminder_days_before > existing.reminder_days_before) {
        existing.reminder_days_before = req.reminder_days_before;
      }
    }
  }

  const mergedList = Object.values(merged);

  return (
    <div className="space-y-3">
      {/* Enrolled programs */}
      <div className="space-y-1.5">
        {enrollments.map((e: { id: string; program_id: string; admission_date: string; program: unknown }) => {
          const prog = e.program as { id: string; name: string; code: string | null; program_type: string } | null;
          if (!prog) return null;
          return (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{prog.name}</span>
              <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                {PROGRAM_TYPE_LABELS[prog.program_type] || prog.program_type}
              </span>
            </div>
          );
        })}
      </div>

      {/* Combined requirements */}
      {mergedList.length > 0 ? (
        <div className="border-t border-slate-100 pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            Required Assessments ({mergedList.length})
          </div>
          <div className="space-y-1.5">
            {mergedList.map((r) => (
              <div key={r.assessment_type} className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {ASSESSMENT_ICONS[r.assessment_type] || "📋"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800">{r.assessment_type}</span>
                    {r.is_required_at_intake && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1 py-0 rounded font-medium">
                        Intake
                      </span>
                    )}
                    {r.reassessment_frequency_days && (
                      <span className="text-xs text-slate-500">{freqLabel(r.reassessment_frequency_days)}</span>
                    )}
                  </div>
                  {r.source_programs.length > 1 && (
                    <div className="text-xs text-slate-400 truncate" title={r.source_programs.join(", ")}>
                      {r.source_programs.length} programs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-2 text-xs text-slate-400 italic">
          No assessment requirements configured for enrolled programs
        </div>
      )}

      <div className="pt-1">
        <Link href="/dashboard/programs" className="text-xs text-teal-600 font-medium hover:text-teal-700">
          Manage programs →
        </Link>
      </div>
    </div>
  );
}
