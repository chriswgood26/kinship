import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function dischargesReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const titles: Record<string, { title: string; desc: string; icon: string }> = {
    admissions: { title: "New Admissions", desc: "Patients added by date range", icon: "📥" },
    discharges: { title: "Discharges", desc: "Discharged patients by date range", icon: "📤" },
    audit: { title: "Audit Log", desc: "PHI access audit trail", icon: "🔐" },
    cpt: { title: "Revenue by CPT", desc: "Breakdown by procedure code", icon: "💳" },
    credentials: { title: "Credential Expiration", desc: "Provider license and credential tracking", icon: "🪪" },
  };
  const page = titles["discharges"];

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{page.desc}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="text-5xl mb-4">{page.icon}</div>
        <h2 className="font-semibold text-slate-900 text-lg mb-2">{page.title}</h2>
        <p className="text-slate-500 text-sm mb-6">This report is coming soon. Data collection is in progress.</p>
        <Link href="/dashboard/reports" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
          ← Back to Reports
        </Link>
      </div>
    </div>
  );
}
