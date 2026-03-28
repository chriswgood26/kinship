import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
          <span className="font-bold text-slate-900 text-lg">Kinship</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-slate-600 text-sm font-medium hover:text-slate-900">Sign in</Link>
          <Link href="/sign-up" className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          🌿 Modern EHR for behavioral health & DD agencies
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          A modern EHR<br />
          <span className="text-teal-500">for the rest of us</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Built for small and mid-size behavioral health, developmental disabilities, and community mental health agencies — the organizations the big EHR vendors left behind.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up"
            className="bg-teal-500 text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-teal-400 transition-colors text-lg">
            Start free trial
          </Link>
          <Link href="#features"
            className="border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-semibold hover:bg-slate-50 transition-colors text-lg">
            See features →
          </Link>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Everything your agency needs</h2>
        <p className="text-slate-500 text-center mb-12">Built specifically for behavioral health and DD — not adapted from a general medical EHR</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: "👤", title: "Patient Management", desc: "Preferred names, pronouns, family networks, portal access — dignity built in" },
            { icon: "📋", title: "Treatment Plans & ISPs", desc: "Goals, objectives, annual reviews. SOAP notes or shift-based DD progress notes" },
            { icon: "💊", title: "eMAR", desc: "Medication administration records with PRN documentation and controlled substance tracking" },
            { icon: "🧠", title: "IM+CANS Assessment", desc: "Illinois Integrated Assessment built in — 6 domains, live level of care recommendation" },
            { icon: "✅", title: "CCBHC Compliance", desc: "8 performance measures tracked in real time with drill-down detail and action items" },
            { icon: "💰", title: "Billing & Claims", desc: "837P generation, claim scrubbing, patient invoicing — the full revenue cycle" },
            { icon: "🌐", title: "Patient Portal", desc: "Family, guardians, parole officers — role-based access to exactly what you share" },
            { icon: "🏠", title: "Bed Management", desc: "Residential census, admit/discharge, length of stay — built for group homes" },
            { icon: "🚨", title: "Incident Reports", desc: "ABC analysis, state reporting, guardian notifications — compliance from day one" },
          ].map(f => (
            <div key={f.title} className="bg-slate-50 rounded-2xl p-5">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-slate-900 mb-1">{f.title}</div>
              <div className="text-sm text-slate-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-teal-500 mx-8 rounded-3xl p-16 text-center mb-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to modernize your agency?</h2>
        <p className="text-teal-100 mb-8 text-lg">Implementation in days, not months. Pricing that fits small agency budgets.</p>
        <Link href="/sign-up"
          className="bg-white text-teal-600 px-8 py-3.5 rounded-2xl font-bold hover:bg-teal-50 transition-colors text-lg inline-block">
          Get started for free
        </Link>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-400">
        © 2026 Kinship EHR · Built for behavioral health & developmental disabilities
      </footer>
    </div>
  );
}
