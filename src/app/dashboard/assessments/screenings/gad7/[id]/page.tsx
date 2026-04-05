import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
];

const SEVERITY = [
  { max: 4, label: "Minimal Anxiety", color: "bg-emerald-100 text-emerald-800", badge: "bg-emerald-50 border-emerald-200" },
  { max: 9, label: "Mild Anxiety", color: "bg-blue-100 text-blue-800", badge: "bg-blue-50 border-blue-200" },
  { max: 14, label: "Moderate Anxiety", color: "bg-amber-100 text-amber-800", badge: "bg-amber-50 border-amber-200" },
  { max: 19, label: "Severe Anxiety", color: "bg-orange-100 text-orange-800", badge: "bg-orange-50 border-orange-200" },
  { max: 27, label: "Severe Anxiety", color: "bg-red-100 text-red-800", badge: "bg-red-50 border-red-200" },
];

const RATINGS = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

export default async function GAD7DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;

  const { data: screening } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .eq("id", id).single();

  if (!screening) notFound();

  const patient = Array.isArray(screening.patient) ? screening.patient[0] : screening.patient;
  const answers = screening.answers || {};
  const score = screening.total_score || 0;
  const severity = SEVERITY.find(s => score <= s.max) || SEVERITY[4];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={patient ? `/dashboard/clients/${patient.id}` : "/dashboard/assessments"} className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GAD-7 Assessment</h1>
          {patient && <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">{patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}</Link>}
        </div>
        <Link href={`/dashboard/assessments/screenings/phq9/new?patient_id=${patient?.id || ""}`}
          className="ml-auto bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          Administer Again
        </Link>
      </div>

      {/* Score summary */}
      <div className={`rounded-2xl border p-6 ${severity.badge}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Score</div>
            <div className="text-5xl font-bold text-slate-900">{score}</div>
            <div className={`mt-2 inline-block text-sm font-bold px-3 py-1 rounded-full ${severity.color}`}>{severity.label}</div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>{new Date(screening.administered_at || screening.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
            {screening.administered_by && <div className="mt-1">{screening.administered_by}</div>}
          </div>
        </div>
  
      </div>

      {/* Individual answers */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Item Responses</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {QUESTIONS.map((q, i) => {
            const val = Number(answers[`q${i + 1}`] || 0);
            return (
              <div key={i} className={`flex items-start justify-between px-5 py-4 ${i === 8 && val > 0 ? "bg-red-50/40" : ""}`}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{i + 1}. {q}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className={`w-7 h-7 rounded-xl text-sm font-bold flex items-center justify-center ${val === 0 ? "bg-slate-100 text-slate-500" : val === 1 ? "bg-blue-100 text-blue-700" : val === 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{val}</div>
                  <div className="text-xs text-slate-500 w-28">{RATINGS[val]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
