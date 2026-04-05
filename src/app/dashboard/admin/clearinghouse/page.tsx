"use client";

import { useState } from "react";
import Link from "next/link";

const CLEARINGHOUSES = [
  {
    id: "office_ally",
    name: "Office Ally",
    logo: "🏥",
    description: "Best for small and mid-size behavioral health agencies. Widest payer coverage, lowest cost, most common in the BH market.",
    recommended: true,
    setup_time: "3–5 business days",
    cost: "Free for providers",
    payers: "5,000+",
    api_type: "REST API",
    status: "available",
  },
  {
    id: "availity",
    name: "Availity",
    logo: "🏢",
    description: "Enterprise-grade. Required by many large health systems and state Medicaid programs. Largest payer network.",
    recommended: false,
    setup_time: "5–10 business days",
    cost: "Varies by volume",
    payers: "7,000+",
    api_type: "REST API",
    status: "available",
  },
  {
    id: "change_healthcare",
    name: "Change Healthcare",
    logo: "⚕️",
    description: "Strong mid-market option. Excellent API documentation. Good for multi-state agencies.",
    recommended: false,
    setup_time: "5–7 business days",
    cost: "Per-transaction fee",
    payers: "6,500+",
    api_type: "REST API",
    status: "available",
  },
  {
    id: "waystar",
    name: "Waystar",
    logo: "🌐",
    description: "Modern platform with strong revenue cycle tools. Good for agencies that want integrated denial management.",
    recommended: false,
    setup_time: "5–10 business days",
    cost: "Per-transaction fee",
    payers: "6,000+",
    api_type: "REST API",
    status: "coming_soon",
  },
];

const COMMON_PAYERS = [
  { name: "Oregon Health Plan (Medicaid)", state: "OR", enrolled: false },
  { name: "Washington Apple Health (Medicaid)", state: "WA", enrolled: false },
  { name: "Blue Cross Blue Shield", state: "Multi", enrolled: false },
  { name: "Aetna Behavioral Health", state: "Multi", enrolled: false },
  { name: "Cigna Behavioral Health", state: "Multi", enrolled: false },
  { name: "UnitedHealthcare Behavioral Health", state: "Multi", enrolled: false },
  { name: "Medicare (Part B)", state: "Federal", enrolled: false },
  { name: "Optum Behavioral Health", state: "Multi", enrolled: false },
  { name: "Molina Healthcare", state: "Multi", enrolled: false },
  { name: "Centene / WellCare", state: "Multi", enrolled: false },
];

type Step = "select" | "enroll" | "payers" | "test" | "live";

export default function ClearinghousePage() {
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    practice_name: "Beaverton Mental Health",
    npi: "",
    tax_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
  });
  const [payers, setPayers] = useState(COMMON_PAYERS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedCH = CLEARINGHOUSES.find(c => c.id === selected);

  function togglePayer(i: number) {
    setPayers(prev => prev.map((p, idx) => idx === i ? { ...p, enrolled: !p.enrolled } : p));
  }

  async function submitEnrollment() {
    setSubmitting(true);
    // Simulate API call — backend not yet connected
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
    setStep("payers");
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clearinghouse Setup</h1>
          <p className="text-slate-500 text-sm mt-0.5">Connect to a clearinghouse to submit claims electronically</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4">
        <div className="flex items-center gap-0">
          {[
            { key: "select", label: "Select" },
            { key: "enroll", label: "Enroll" },
            { key: "payers", label: "Payers" },
            { key: "test", label: "Test" },
            { key: "live", label: "Go Live" },
          ].map((s, i) => {
            const steps: Step[] = ["select", "enroll", "payers", "test", "live"];
            const currentIdx = steps.indexOf(step);
            const thisIdx = steps.indexOf(s.key as Step);
            const isDone = thisIdx < currentIdx;
            const isCurrent = thisIdx === currentIdx;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className={`flex flex-col items-center flex-1 ${i > 0 ? "" : ""}`}>
                  {i > 0 && <div className={`h-0.5 w-full mb-3 ${isDone ? "bg-teal-400" : "bg-slate-200"}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    isDone ? "bg-teal-500 border-teal-500 text-white" :
                    isCurrent ? "bg-white border-teal-500 text-teal-600" :
                    "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div className={`text-xs mt-1 font-medium ${isCurrent ? "text-teal-600" : isDone ? "text-slate-500" : "text-slate-300"}`}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep(["select","enroll","payers","test","live"][Math.max(0, ["select","enroll","payers","test","live"].indexOf(step) - 1)] as Step)}
          disabled={step === "select"}
          className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-30">
          ← Back
        </button>
        <span className="text-xs text-slate-400">Step {["select","enroll","payers","test","live"].indexOf(step) + 1} of 5</span>
        {step !== "live" && (
          <button onClick={() => {
            const steps: Step[] = ["select","enroll","payers","test","live"];
            const next = steps[steps.indexOf(step) + 1];
            if (next) setStep(next);
          }}
            className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-400">
            Next →
          </button>
        )}
        {step === "live" && <span className="text-xs text-slate-400">Final step</span>}
      </div>

      {/* Step 1: Select clearinghouse */}
      {step === "select" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Choose a Clearinghouse</h2>
          {CLEARINGHOUSES.map(ch => (
            <div key={ch.id} onClick={() => ch.status !== "coming_soon" && setSelected(ch.id)}
              className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                ch.status === "coming_soon" ? "opacity-50 cursor-not-allowed border-slate-100" :
                selected === ch.id ? "border-teal-400 bg-teal-50 cursor-pointer" :
                "border-slate-200 hover:border-teal-200 cursor-pointer"
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ch.name}</span>
                      {ch.recommended && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">Recommended</span>}
                      {ch.status === "coming_soon" && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Coming Soon</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{ch.description}</p>
                  </div>
                </div>
                {selected === ch.id && <span className="text-teal-500 text-xl flex-shrink-0">✓</span>}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                {[
                  { label: "Setup time", value: ch.setup_time },
                  { label: "Cost", value: ch.cost },
                  { label: "Payer network", value: ch.payers },
                  { label: "Connection", value: ch.api_type },
                ].map(d => (
                  <div key={d.label} className="bg-slate-50 rounded-lg p-2">
                    <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-0.5">{d.label}</div>
                    <div className="font-semibold text-slate-700">{d.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button onClick={() => selected && setStep("enroll")} disabled={!selected}
              className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              Continue with {selectedCH?.name || "Selected"} →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Enrollment form */}
      {step === "enroll" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedCH?.logo}</span>
            <h2 className="font-semibold text-slate-900">Enroll with {selectedCH?.name}</h2>
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <div className="font-bold text-emerald-800 text-lg mb-1">Enrollment submitted!</div>
              <p className="text-emerald-700 text-sm mb-4">Your enrollment has been sent to {selectedCH?.name}. Setup typically takes {selectedCH?.setup_time}. You'll receive an email with your credentials.</p>
              <button onClick={() => setStep("payers")} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
                Continue to Payer Setup →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                ℹ️ This information is sent to {selectedCH?.name} to create your provider account. Processing takes {selectedCH?.setup_time}. We'll notify you when your account is active.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={labelClass}>Practice / Organization Name</label><input value={enrollForm.practice_name} onChange={e => setEnrollForm(f => ({ ...f, practice_name: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>NPI (Group)</label><input value={enrollForm.npi} onChange={e => setEnrollForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} placeholder="10-digit NPI" /></div>
                <div><label className={labelClass}>Tax ID / EIN</label><input value={enrollForm.tax_id} onChange={e => setEnrollForm(f => ({ ...f, tax_id: e.target.value }))} className={inputClass} placeholder="XX-XXXXXXX" /></div>
                <div><label className={labelClass}>Billing Contact Name</label><input value={enrollForm.contact_name} onChange={e => setEnrollForm(f => ({ ...f, contact_name: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>Billing Contact Email</label><input type="email" value={enrollForm.contact_email} onChange={e => setEnrollForm(f => ({ ...f, contact_email: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>Phone</label><input value={enrollForm.contact_phone} onChange={e => setEnrollForm(f => ({ ...f, contact_phone: e.target.value }))} className={inputClass} /></div>
                <div className="col-span-2"><label className={labelClass}>Practice Address</label><input value={enrollForm.address} onChange={e => setEnrollForm(f => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="123 Main St, Portland, OR 97201" /></div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setStep("select")} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
                <button onClick={submitEnrollment} disabled={submitting || !enrollForm.npi || !enrollForm.tax_id}
                  className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                  {submitting ? "Submitting..." : `Submit Enrollment to ${selectedCH?.name}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Payer enrollment */}
      {step === "payers" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Select Payers to Enroll</h2>
            <p className="text-slate-500 text-sm mt-0.5">Choose the insurance companies you bill. Each payer requires separate enrollment (2–4 weeks). Start with your most common payers.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Common Behavioral Health Payers</span>
              <span className="text-xs text-slate-500">{payers.filter(p => p.enrolled).length} selected</span>
            </div>
            <div className="divide-y divide-slate-50">
              {payers.map((payer, i) => (
                <div key={i} onClick={() => togglePayer(i)}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${payer.enrolled ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${payer.enrolled ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                      {payer.enrolled && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{payer.name}</div>
                      <div className="text-xs text-slate-400">{payer.state === "Multi" ? "Multi-state" : payer.state === "Federal" ? "Federal" : `${payer.state} only`}</div>
                    </div>
                  </div>
                  {payer.enrolled && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Pending enrollment</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            ⏱️ Each payer enrollment takes 2–4 weeks. Claims can be submitted once enrollment is approved. DrCloud Neo will notify you when each payer is ready.
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep("test")}
              className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
              Continue to Test Mode →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Test */}
      {step === "test" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Test Your Connection</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
              ℹ️ <strong>Test mode</strong> — claims are submitted to {selectedCH?.name}'s test environment. No real claims are sent. Verify your setup before going live.
            </div>
            <div className="space-y-3">
              {[
                { label: "Clearinghouse connection", status: "pending", detail: "Awaiting credential approval from " + selectedCH?.name },
                { label: "NPI validation", status: "pending", detail: "Group NPI will be verified against NPPES" },
                { label: "Test claim submission", status: "pending", detail: "Submit a test 837P and verify 999 acknowledgment" },
                { label: "Test ERA receipt", status: "pending", detail: "Verify 835 payment file parsing" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-600 text-xs">⏳</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500 font-medium">⏳ Waiting for {selectedCH?.name} credentials</p>
              <p className="text-xs text-slate-400 mt-1">You'll receive an email with test credentials within {selectedCH?.setup_time}. Return here to run tests once credentials arrive.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep("live")} className="border border-teal-200 text-teal-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-50">
              Skip to Go Live Preview →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Go Live */}
      {step === "live" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Go Live</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-5 text-center space-y-3">
              <div className="text-4xl">🚀</div>
              <div className="font-bold text-slate-900">Almost there!</div>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Once {selectedCH?.name} approves your enrollment and your test claims pass validation, you'll activate live claim submission here.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "📋", label: "Clearinghouse", value: selectedCH?.name, status: "Enrollment submitted" },
                { icon: "🏥", label: "Payers enrolled", value: `${payers.filter(p => p.enrolled).length} selected`, status: "Pending approval" },
                { icon: "💳", label: "Claim format", value: "837P (EDI X12)", status: "Ready" },
                { icon: "📄", label: "ERA format", value: "835 (EDI X12)", status: "Ready" },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.icon}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">{item.value}</div>
                  <div className="text-xs text-amber-600 mt-0.5">{item.status}</div>
                </div>
              ))}
            </div>
            <button disabled className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl text-sm font-semibold cursor-not-allowed">
              🔒 Activate Live Submission — Awaiting Credential Approval
            </button>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
            <div className="font-semibold text-teal-800 mb-2">What happens next</div>
            <ol className="space-y-2 text-sm text-teal-700">
              <li className="flex gap-2"><span className="font-bold">1.</span>{selectedCH?.name} reviews your enrollment (up to {selectedCH?.setup_time})</li>
              <li className="flex gap-2"><span className="font-bold">2.</span>You receive test credentials via email</li>
              <li className="flex gap-2"><span className="font-bold">3.</span>Run test claims to verify connection</li>
              <li className="flex gap-2"><span className="font-bold">4.</span>Payer enrollments approved (2–4 weeks each)</li>
              <li className="flex gap-2"><span className="font-bold">5.</span>Activate live submission — claims go directly to payers</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
