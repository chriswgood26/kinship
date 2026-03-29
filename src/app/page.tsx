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

      {/* Pricing */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Simple, transparent pricing</h2>
        <p className="text-slate-500 text-center mb-3">Built for small agencies. No $50k implementation fees. No long-term contracts.</p>
        <p className="text-slate-400 text-center text-sm mb-12">Save 20% with annual billing</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {
              name: "Starter",
              price: "$149",
              annual: "$1,430",
              desc: "Up to 5 staff",
              color: "border-slate-200 bg-white",
              features: ["Clients & scheduling", "Encounters & SOAP notes", "Basic billing & charges", "Patient portal", "5GB document storage", "Email support"],
            },
            {
              name: "Growth",
              price: "$349",
              annual: "$3,350",
              desc: "Up to 15 staff",
              color: "border-teal-500 bg-teal-50 shadow-lg",
              highlight: true,
              features: ["Everything in Starter", "Treatment plans", "CCBHC dashboard", "Supervisor review", "Assessments (PHQ-9, GAD-7, C-SSRS)", "20GB storage", "Priority support"],
            },
            {
              name: "Practice",
              price: "$599",
              annual: "$5,750",
              desc: "Up to 30 staff",
              color: "border-slate-200 bg-white",
              features: ["Everything in Growth", "eMAR & medications", "DD modules (ISP, incidents)", "Bed management", "Prior authorizations", "Advanced reporting", "Phone support"],
            },
            {
              name: "Agency",
              price: "$899",
              annual: "$8,630",
              desc: "Up to 50 staff",
              color: "border-slate-200 bg-white",
              features: ["Everything in Practice", "Unlimited clients", "50GB storage", "Multi-location support", "Custom workflows", "Dedicated onboarding", "SLA guarantee"],
            },
          ].map(p => (
            <div key={p.name} className={`rounded-2xl border p-5 ${p.color}`}>
              {p.highlight && <div className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">Most Popular</div>}
              <div className="font-bold text-slate-900 text-lg">{p.name}</div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                <span className="text-slate-400 text-xs">/mo</span>
              </div>
              <div className="text-xs text-slate-400 mb-1">{p.annual}/yr (save 20%)</div>
              <div className="text-xs font-semibold text-slate-600 mb-4 bg-slate-100 rounded-lg px-2 py-1 inline-block">{p.desc}</div>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-teal-500 flex-shrink-0 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              {p.highlight && (
                <a href="#waitlist" className="block text-center mt-4 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
                  Get started →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Optional Add-ons</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "CCBHC Module", price: "+$49/mo", desc: "Performance measures, compliance reporting" },
              { name: "eMAR", price: "+$49/mo", desc: "Medication administration records" },
              { name: "DD Modules", price: "+$49/mo", desc: "ISP, incident reports, DD workflows" },
              { name: "SMS Reminders", price: "+$29/mo", desc: "Automated appointment reminders via text" },
            ].map(a => (
              <div key={a.name} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="font-semibold text-slate-900 text-sm">{a.name}</div>
                <div className="text-teal-600 font-bold text-sm mt-0.5">{a.price}</div>
                <div className="text-xs text-slate-400 mt-1">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Implementation */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="text-2xl flex-shrink-0">🚀</div>
          <div>
            <div className="font-semibold text-slate-900">One-time implementation fee: $500–$2,500</div>
            <div className="text-sm text-slate-500 mt-0.5">Includes data migration, staff training, and onboarding support. Most agencies are live within 5 business days.</div>
          </div>
        </div>

        {/* vs competitors */}
        <div className="mt-4 bg-teal-50 rounded-2xl border border-teal-100 p-5">
          <div className="text-sm font-semibold text-teal-900 mb-2">How Kinship compares</div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { name: "Legacy DD/BH EHR", price: "$50k–$200k/yr", note: "Long implementation, legacy tech" },
              { name: "SimplePractice", price: "$29–$99/clinician/mo", note: "Individual practitioners only" },
              { name: "Kinship", price: "$149–$899/mo flat", note: "✓ Modern · Fast · Affordable" },
            ].map(c => (
              <div key={c.name} className={`rounded-xl p-3 ${c.name === "Kinship" ? "bg-teal-500 text-white" : "bg-white border border-slate-200"}`}>
                <div className={`font-bold ${c.name === "Kinship" ? "text-white" : "text-slate-900"}`}>{c.name}</div>
                <div className={`font-semibold mt-0.5 ${c.name === "Kinship" ? "text-teal-100" : "text-teal-600"}`}>{c.price}</div>
                <div className={`mt-0.5 ${c.name === "Kinship" ? "text-teal-200" : "text-slate-400"}`}>{c.note}</div>
              </div>
            ))}
          </div>
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
// force redeploy Sun Mar 29 10:15:25 PDT 2026
