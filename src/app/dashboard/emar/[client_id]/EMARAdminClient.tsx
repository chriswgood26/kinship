"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MedOrder {
  id: string;
  medication_name: string;
  generic_name: string | null;
  dosage: string;
  route: string;
  frequency: string;
  scheduled_times: string[] | null;
  indication: string | null;
  prescriber: string | null;
  is_prn: boolean;
  prn_indication: string | null;
  is_controlled: boolean;
  instructions: string | null;
}

interface MedAdmin {
  id: string;
  order_id: string;
  scheduled_time: string;
  administered_at: string | null;
  administered_by: string | null;
  status: string;
  outcome: string;
  refused_reason: string | null;
  held_reason: string | null;
  prn_reason: string | null;
  notes: string | null;
}

const ROUTE_ICONS: Record<string, string> = {
  oral: "💊", sublingual: "👅", topical: "🩹", injection: "💉",
  inhaled: "🫁", transdermal: "🩹", rectal: "⚕️", nasal: "👃", ophthalmic: "👁️"
};

const OUTCOME_COLORS: Record<string, string> = {
  given: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-600",
  held: "bg-amber-100 text-amber-700",
  not_available: "bg-slate-100 text-slate-500",
  self_administered: "bg-blue-100 text-blue-700",
};

export default function EMARAdminClient({ orders, adminsByOrder, clientId, today, staffName }: {
  orders: MedOrder[];
  adminsByOrder: Record<string, MedAdmin[] | null | undefined>;
  clientId: string;
  today: string;
  staffName: string;
}) {
  const [modal, setModal] = useState<{ order: MedOrder; time: string } | null>(null);
  const [prnModal, setPrnModal] = useState<MedOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({ outcome: "given", refused_reason: "", held_reason: "", notes: "", witness: "" });
  const [prnForm, setPrnForm] = useState({ prn_reason: "", outcome: "given", notes: "" });
  const router = useRouter();

  const now = new Date();
  const currentHour = now.getHours();

  function getShift() {
    if (currentHour >= 7 && currentHour < 15) return "Day (7am-3pm)";
    if (currentHour >= 15 && currentHour < 23) return "Evening (3pm-11pm)";
    return "Night (11pm-7am)";
  }

  async function administerDose() {
    if (!modal) return;
    setSaving(true);
    const scheduledTime = `${today}T${modal.time}:00`;
    await fetch("/api/emar/administer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        order_id: modal.order.id,
        client_id: clientId,
        scheduled_time: scheduledTime,
        administered_at: adminForm.outcome === "given" ? new Date().toISOString() : null,
        administered_by: staffName,
        status: adminForm.outcome === "given" ? "given" : "documented",
        outcome: adminForm.outcome,
        refused_reason: adminForm.refused_reason || null,
        held_reason: adminForm.held_reason || null,
        notes: adminForm.notes || null,
        witness: adminForm.witness || null,
      }),
    });
    setSaving(false);
    setModal(null);
    setAdminForm({ outcome: "given", refused_reason: "", held_reason: "", notes: "", witness: "" });
    router.refresh();
  }

  async function administerPRN() {
    if (!prnModal) return;
    setSaving(true);
    await fetch("/api/emar/administer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        order_id: prnModal.id,
        client_id: clientId,
        scheduled_time: new Date().toISOString(),
        administered_at: new Date().toISOString(),
        administered_by: staffName,
        status: "given",
        outcome: "given",
        prn_reason: prnForm.prn_reason,
        notes: prnForm.notes || null,
      }),
    });
    setSaving(false);
    setPrnModal(null);
    setPrnForm({ prn_reason: "", outcome: "given", notes: "" });
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  const scheduledOrders = orders.filter(o => !o.is_prn);
  const prnOrders = orders.filter(o => o.is_prn);

  return (
    <div className="space-y-4">
      {/* Shift indicator */}
      <div className="bg-[#0d1b2e] rounded-2xl px-5 py-3 flex items-center justify-between text-white">
        <div className="text-sm font-medium">Current Shift: <span className="text-teal-300 font-bold">{getShift()}</span></div>
        <div className="text-xs text-slate-400">Staff: {staffName}</div>
      </div>

      {/* Scheduled medications */}
      {scheduledOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Scheduled Medications</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {scheduledOrders.map(order => {
              const times = order.scheduled_times || ["08:00"];
              const admins = adminsByOrder[order.id] || [];
              return (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ROUTE_ICONS[order.route] || "💊"}</span>
                        <span className="font-bold text-slate-900">{order.medication_name}</span>
                        <span className="text-slate-500">{order.dosage}</span>
                        {order.is_controlled && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">CONTROLLED</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 ml-7">
                        {order.route} · {order.frequency}
                        {order.indication && ` · ${order.indication}`}
                        {order.prescriber && ` · Prescriber: ${order.prescriber}`}
                      </div>
                      {order.instructions && <div className="text-xs text-amber-600 mt-1 ml-7 font-medium">⚠️ {order.instructions}</div>}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="flex flex-wrap gap-2 ml-7">
                    {times.map(time => {
                      const admin = admins.find(a => a.scheduled_time?.includes(time.replace(":", "")));
                      const isPast = parseInt(time.split(":")[0]) < currentHour;
                      return (
                        <div key={time}>
                          {admin ? (
                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${OUTCOME_COLORS[admin.outcome] || OUTCOME_COLORS.given}`}>
                              <span>{admin.outcome === "given" ? "✓" : admin.outcome === "refused" ? "✗" : "—"}</span>
                              <span>{time}</span>
                              <span className="capitalize">{admin.outcome.replace("_", " ")}</span>
                              {admin.administered_by && <span className="opacity-70">by {admin.administered_by.split(" ")[0]}</span>}
                            </div>
                          ) : (
                            <button onClick={() => { setModal({ order, time }); setAdminForm({ outcome: "given", refused_reason: "", held_reason: "", notes: "", witness: "" }); }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                isPast ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                              }`}>
                              {isPast ? "⚠️ " : ""}
                              {time} — {isPast ? "MISSED" : "Pending"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRN medications */}
      {prnOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">PRN Medications <span className="text-slate-400 font-normal text-sm">(as needed)</span></h2>
          </div>
          <div className="divide-y divide-slate-50">
            {prnOrders.map(order => {
              const admins = adminsByOrder[order.id] || [];
              const givenToday = admins.filter(a => a.outcome === "given").length;
              return (
                <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ROUTE_ICONS[order.route] || "💊"}</span>
                      <span className="font-bold text-slate-900">{order.medication_name}</span>
                      <span className="text-slate-500">{order.dosage}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PRN</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 ml-7">
                      For: {order.prn_indication || order.indication || "As needed"}
                      {givenToday > 0 && <span className="ml-2 text-emerald-600 font-medium">· Given {givenToday}x today</span>}
                    </div>
                  </div>
                  <button onClick={() => { setPrnModal(order); setPrnForm({ prn_reason: "", outcome: "given", notes: "" }); }}
                    className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-400">
                    Give PRN
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Administration modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Document Administration</h2>
                <p className="text-sm text-slate-500">{modal.order.medication_name} {modal.order.dosage} · {modal.time}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div>
              <label className={labelClass}>Outcome *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "given", label: "✓ Given", color: "bg-emerald-500" },
                  { value: "refused", label: "✗ Refused", color: "bg-red-500" },
                  { value: "held", label: "⏸ Held", color: "bg-amber-500" },
                  { value: "self_administered", label: "👤 Self-Admin", color: "bg-blue-500" },
                ].map(o => (
                  <button key={o.value} type="button"
                    onClick={() => setAdminForm(f => ({ ...f, outcome: o.value }))}
                    className={`py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${adminForm.outcome === o.value ? o.color + " scale-105 shadow-sm" : "bg-slate-200 text-slate-600"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {adminForm.outcome === "refused" && (
              <div><label className={labelClass}>Reason for Refusal</label>
                <input value={adminForm.refused_reason} onChange={e => setAdminForm(f => ({ ...f, refused_reason: e.target.value }))} className={inputClass} placeholder="Client refused, sleeping, nausea..." />
              </div>
            )}
            {adminForm.outcome === "held" && (
              <div><label className={labelClass}>Reason Held</label>
                <input value={adminForm.held_reason} onChange={e => setAdminForm(f => ({ ...f, held_reason: e.target.value }))} className={inputClass} placeholder="Prescriber order, adverse reaction, hospitalized..." />
              </div>
            )}
            {modal.order.is_controlled && (
              <div><label className={labelClass}>Witness (required for controlled substances)</label>
                <input value={adminForm.witness} onChange={e => setAdminForm(f => ({ ...f, witness: e.target.value }))} className={inputClass} placeholder="Witnessing staff member name" />
              </div>
            )}
            <div><label className={labelClass}>Notes (optional)</label>
              <input value={adminForm.notes} onChange={e => setAdminForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="Any relevant observations..." />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={administerDose} disabled={saving || (modal.order.is_controlled && !adminForm.witness && adminForm.outcome === "given")}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Saving..." : "Document & Sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRN modal */}
      {prnModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPrnModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">PRN Administration</h2>
                <p className="text-sm text-slate-500">{prnModal.medication_name} {prnModal.dosage}</p>
              </div>
              <button onClick={() => setPrnModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
              PRN medications require documented clinical justification
            </div>
            <div><label className={labelClass}>Reason for Administration *</label>
              <textarea value={prnForm.prn_reason} onChange={e => setPrnForm(f => ({ ...f, prn_reason: e.target.value }))} rows={3}
                className={inputClass + " resize-none"} placeholder="Client reported pain level 7/10, complained of headache..." />
            </div>
            <div><label className={labelClass}>Additional Notes</label>
              <input value={prnForm.notes} onChange={e => setPrnForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="Response to medication, observations..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPrnModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={administerPRN} disabled={saving || !prnForm.prn_reason}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-400 disabled:opacity-50">
                {saving ? "Saving..." : "Document PRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
