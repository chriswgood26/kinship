import Link from "next/link";
import WaitlistForm from "./WaitlistForm";

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
          <a href="#waitlist" className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Get early access</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          🌿 Purpose-built for behavioral health & DD agencies
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          A modern EHR<br />
          <span className="text-teal-500">for the rest of us</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Small and mid-size behavioral health, developmental disabilities, and community mental health agencies deserve modern software too. Kinship was built for you.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="#waitlist" className="bg-teal-500 text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-teal-400 transition-colors text-lg">
            Get early access →
          </a>
          <Link href="/sign-in" className="border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-semibold hover:bg-slate-50 transition-colors text-lg">
            Sign in
          </Link>
        </div>
      </div>

      {/* Pain points */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Sound familiar?</h2>
          <p className="text-slate-500 text-center mb-12">The problems every small agency faces with legacy EHR software</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              "Implementation takes 6-12 months",
              "It takes 14 clicks to write a progress note",
              "Your EHR was built before smartphones existed",
              "Support tickets go unanswered for weeks",
              "No mobile access — only desktop",
              "Adding a simple feature costs $50,000",
              "Your staff dreads using it every day",
              "Compliance reporting is a manual nightmare",
            ].map(p => (
              <div key={p} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200">
                <span className="text-red-400 flex-shrink-0">✗</span>
                <span className="text-sm text-slate-700">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Everything your agency needs</h2>
        <p className="text-slate-500 text-center mb-12">Built specifically for behavioral health and DD — not adapted from a general medical EHR</p>
        <div className="grid grid-cols-3 gap-5">
          {[
            { icon: "👤", title: "Client Management", desc: "Preferred names, pronouns, family networks. Configure whether to call them clients, patients, or individuals." },
            { icon: "📋", title: "Treatment Plans & ISPs", desc: "Goals, objectives, annual reviews. SOAP notes or DD shift-based progress notes. Both." },
            { icon: "💊", title: "eMAR", desc: "Electronic medication administration with PRN documentation and controlled substance tracking." },
            { icon: "🧠", title: "IM+CANS Assessment", desc: "Illinois Integrated Assessment built in with live level of care recommendation." },
            { icon: "✅", title: "CCBHC Compliance", desc: "8 performance measures tracked in real time. Click any measure to see live data and action items." },
            { icon: "💰", title: "Billing & Claims", desc: "837P generation, claim scrubbing with 8 validation rules, patient invoicing. Full revenue cycle." },
            { icon: "🌐", title: "Patient Portal", desc: "Families, guardians, parole officers — role-based access. You control exactly what each person sees." },
            { icon: "🏠", title: "Bed Management", desc: "Group home and residential census. Admit/discharge with length of stay tracking." },
            { icon: "🚨", title: "Incident Reports", desc: "ABC analysis, state reporting flags, guardian notification timestamps — compliance from day one." },
          ].map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-200 hover:shadow-sm transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-slate-900 mb-1">{f.title}</div>
              <div className="text-sm text-slate-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="bg-teal-50 border-y border-teal-100 py-12">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <div className="text-4xl font-bold text-teal-600 mb-2">72%</div>
          <div className="text-slate-700 font-semibold text-lg mb-1">fewer clicks vs legacy EHR systems</div>
          <div className="text-slate-500 text-sm">Across 10 common clinical workflows — same tasks, fraction of the effort</div>
        </div>
      </div>

      {/* Pricing preview */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Pricing that fits small agencies</h2>
        <p className="text-slate-500 text-center mb-12">No 12-month contracts. No $50k implementation fees. No surprise costs.</p>
        <div className="grid grid-cols-3 gap-5">
          {[
            { name: "Starter", price: "$149", per: "/mo", desc: "Up to 3 staff", features: ["Clients & scheduling", "Encounters & notes", "Basic billing", "Email support"] },
            { name: "Growth", price: "$299", per: "/mo", desc: "Up to 10 staff", features: ["Everything in Starter", "Treatment plans", "CCBHC dashboard", "eMAR", "Patient portal", "Priority support"], highlight: true },
            { name: "Practice", price: "$599", per: "/mo", desc: "Unlimited staff", features: ["Everything in Growth", "ISPs & DD workflows", "Advanced reporting", "Custom integrations", "Dedicated support"] },
          ].map(p => (
            <div key={p.name} className={`rounded-2xl border p-6 ${p.highlight ? "border-teal-500 bg-teal-50 shadow-md" : "border-slate-200 bg-white"}`}>
              {p.highlight && <div className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">Most Popular</div>}
              <div className="font-bold text-slate-900 text-lg">{p.name}</div>
              <div className="mt-2 mb-1"><span className="text-4xl font-bold text-slate-900">{p.price}</span><span className="text-slate-400 text-sm">{p.per}</span></div>
              <div className="text-xs text-slate-400 mb-4">{p.desc}</div>
              <ul className="space-y-2">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-teal-500 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Waitlist */}
      <div id="waitlist" className="bg-[#0d1b2e] py-20">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Get early access</h2>
          <p className="text-slate-300 mb-8">Kinship is in early access. Join the waitlist and be first when we launch.</p>
          <WaitlistForm />
        </div>
      </div>

      <footer className="text-center py-8 text-sm text-slate-400">
        © 2026 Kinship EHR · A modern EHR for the rest of us
      </footer>
    </div>
  );
}
