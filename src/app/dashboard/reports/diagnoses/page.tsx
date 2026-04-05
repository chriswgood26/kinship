import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ICD10_LABELS: Record<string, string> = {
  "F32.0": "Major Depression, mild",
  "F32.1": "Major Depression, moderate",
  "F32.9": "Major Depression, unspecified",
  "F33.0": "Recurrent Depression, mild",
  "F33.1": "Recurrent Depression, moderate",
  "F41.0": "Panic Disorder",
  "F41.1": "Generalized Anxiety Disorder",
  "F41.9": "Anxiety, unspecified",
  "F43.10": "PTSD, unspecified",
  "F43.21": "Adjustment Disorder w/ depressed mood",
  "F60.3": "Borderline Personality Disorder",
  "F10.20": "Alcohol Use Disorder, moderate",
  "F10.10": "Alcohol Use Disorder, mild",
  "F19.20": "Polysubstance Use Disorder",
  "F20.9": "Schizophrenia, unspecified",
  "F31.9": "Bipolar Disorder, unspecified",
  "F90.0": "ADHD, predominantly inattentive",
  "F84.0": "Autism Spectrum Disorder",
};

export default async function DiagnosesReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: notes } = await supabaseAdmin
    .from("clinical_notes")
    .select("diagnosis_codes")
    .not("diagnosis_codes", "is", null);

  const { data: plans } = await supabaseAdmin
    .from("treatment_plans")
    .select("diagnosis_codes")
    .not("diagnosis_codes", "is", null);

  const freq: Record<string, number> = {};
  [...(notes || []), ...(plans || [])].forEach(item => {
    (item.diagnosis_codes || []).forEach((code: string) => {
      if (code) freq[code] = (freq[code] || 0) + 1;
    });
  });

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, c]) => s + c, 0);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Diagnosis Summary</h1>
          <p className="text-slate-500 text-sm mt-0.5">ICD-10 code frequency across all clinical records</p>
        </div>
      </div>
        <ReportActions reportTitle="Diagnosis Summary Report" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{sorted.length}</div>
          <div className="text-sm text-slate-500 mt-0.5">Unique Diagnoses</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Code Entries</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{sorted[0]?.[0] || "—"}</div>
          <div className="text-sm text-slate-500 mt-0.5">Most Common</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Frequency by ICD-10 Code</h2>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No diagnosis data recorded yet</div>
        ) : (
          <div className="p-5 space-y-4">
            {sorted.map(([code, count]) => (
              <div key={code}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{code}</span>
                    <span className="text-slate-500 text-sm ml-2">{ICD10_LABELS[code] || "Other"}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">{count}</span>
                    <span className="text-slate-400 text-xs ml-1">({Math.round((count / total) * 100)}%)</span>
                  </div>
                </div>
                <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-teal-500 h-3 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
