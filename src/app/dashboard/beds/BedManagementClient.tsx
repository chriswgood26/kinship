"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; date_of_birth?: string | null; }
interface Bed {
  id: string; facility_id: string; bed_number: string; room_number: string | null;
  bed_type: string; status: string; client_id: string | null;
  admission_date: string | null; expected_discharge: string | null; notes: string | null;
  patient?: Patient | Patient[] | null;
}
interface Facility { id: string; name: string; facility_type: string; total_beds: number; address: string | null; }

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  available: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Available", icon: "✅" },
  occupied:  { color: "text-slate-700",   bg: "bg-slate-100 border-slate-300",    label: "Occupied",  icon: "🛏️" },
  hold:      { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     label: "On Hold",   icon: "⏸️" },
  cleaning:  { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",       label: "Cleaning",  icon: "🧹" },
  maintenance: { color: "text-red-600",   bg: "bg-red-50 border-red-200",         label: "Maintenance", icon: "🔧" },
};

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function calcLOS(admissionDate: string | null) {
  if (!admissionDate) return null;
  return Math.round((Date.now() - new Date(admissionDate + "T12:00:00").getTime()) / 86400000);
}

export default function BedManagementClient({ facilities, beds, patients }: {
  facilities: Facility[];
  beds: Bed[];
  patients: Patient[];
}) {
  const [selectedFacility, setSelectedFacility] = useState(facilities[0]?.id || "");
  const [admitModal, setAdmitModal] = useState<Bed | null>(null);
  const [statusModal, setStatusModal] = useState<Bed | null>(null);
  const [saving, setSaving] = useState(false);
  const [admitForm, setAdmitForm] = useState({ client_id: "", admission_date: new Date().toISOString().split("T")[0], expected_discharge: "", notes: "" });
  const router = useRouter();

  const facilityBeds = beds.filter(b => b.facility_id === selectedFacility);
  const facility = facilities.find(f => f.id === selectedFacility);
  const occupied = facilityBeds.filter(b => b.status === "occupied").length;
  const available = facilityBeds.filter(b => b.status === "available").length;
  const holds = facilityBeds.filter(b => b.status === "hold").length;
  const occupancyRate = facilityBeds.length > 0 ? Math.round((occupied / facilityBeds.length) * 100) : 0;

  async function admitPatient() {
    if (!admitModal || !admitForm.client_id) return;
    setSaving(true);
    await fetch(`/api/beds/${admitModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ status: "occupied", client_id: admitForm.client_id, admission_date: admitForm.admission_date, expected_discharge: admitForm.expected_discharge || null, notes: admitForm.notes || null }),
    });
    setSaving(false); setAdmitModal(null); router.refresh();
  }

  async function dischargePatient(bed: Bed) {
    if (!confirm(`Discharge ${(() => { const p = Array.isArray(bed.patient) ? bed.patient[0] : bed.patient; return p ? `${p.last_name}, ${p.first_name}` : "patient"; })()} from bed ${bed.bed_number}?`)) return;
    await fetch(`/api/beds/${bed.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ status: "cleaning", client_id: null, admission_date: null, expected_discharge: null }),
    });
    router.refresh();
  }

  async function updateStatus(bed: Bed, status: string) {
    await fetch(`/api/beds/${bed.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ status }),
    });
    setStatusModal(null); router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bed Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Residential census and occupancy tracking</p>
        </div>
      </div>

      {facilities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-slate-900 mb-1">No facilities configured</p>
          <p className="text-slate-500 text-sm">Contact your administrator to configure residential facilities and beds</p>
        </div>
      ) : (
        <>
          {/* Facility tabs */}
          {facilities.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {facilities.map(f => (
                <button key={f.id} onClick={() => setSelectedFacility(f.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${selectedFacility === f.id ? "bg-[#0d1b2e] text-white border-[#0d1b2e]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  🏠 {f.name}
                </button>
              ))}
            </div>
          )}

          {/* Facility stats */}
          {facility && (
            <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-5 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-lg">{facility.name}</div>
                  <div className="text-slate-300 text-sm capitalize">{facility.facility_type?.replace("_", " ")} · {facility.total_beds} beds</div>
                  {facility.address && <div className="text-slate-400 text-xs mt-0.5">{facility.address}</div>}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-teal-300">{occupancyRate}%</div>
                  <div className="text-slate-400 text-xs">occupancy</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Beds", value: facilityBeds.length, color: "text-white" },
                  { label: "Occupied", value: occupied, color: "text-slate-300" },
                  { label: "Available", value: available, color: "text-emerald-300" },
                  { label: "On Hold", value: holds, color: "text-amber-300" },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bed grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {facilityBeds.map(bed => {
              const cfg = STATUS_CONFIG[bed.status] || STATUS_CONFIG.available;
              const patient = Array.isArray(bed.patient) ? bed.patient[0] : bed.patient;
              const los = calcLOS(bed.admission_date);
              const age = calcAge(patient?.date_of_birth || null);
              const daysUntilDischarge = bed.expected_discharge
                ? Math.round((new Date(bed.expected_discharge + "T12:00:00").getTime() - Date.now()) / 86400000)
                : null;

              return (
                <div key={bed.id} className={`border-2 rounded-2xl p-4 transition-all ${cfg.bg}`}>
                  {/* Bed header */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Bed {bed.bed_number}</span>
                      {bed.room_number && <span className="text-slate-400 text-xs ml-1">Rm {bed.room_number}</span>}
                    </div>
                    <span className="text-lg">{cfg.icon}</span>
                  </div>

                  {/* Status badge */}
                  <div className={`text-xs font-semibold capitalize mb-3 ${cfg.color}`}>{cfg.label}</div>

                  {/* Patient info */}
                  {bed.status === "occupied" && patient ? (
                    <div className="space-y-1.5">
                      <Link href={`/dashboard/clients/${patient.id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600 no-underline block">
                        {patient.last_name}, {patient.first_name}
                        {patient.preferred_name && <span className="text-slate-400 font-normal ml-1 text-xs">"{patient.preferred_name}"</span>}
                      </Link>
                      <div className="text-xs text-slate-500">MRN: {patient.mrn || "—"}{age !== null && ` · Age ${age}`}</div>
                      {bed.admission_date && (
                        <div className="text-xs text-slate-500">
                          Admitted: {new Date(bed.admission_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {los !== null && <span className="ml-1 text-slate-400">({los}d)</span>}
                        </div>
                      )}
                      {daysUntilDischarge !== null && (
                        <div className={`text-xs font-medium ${daysUntilDischarge < 0 ? "text-red-500" : daysUntilDischarge <= 3 ? "text-amber-600" : "text-slate-500"}`}>
                          {daysUntilDischarge < 0 ? `${Math.abs(daysUntilDischarge)}d past discharge` :
                           daysUntilDischarge === 0 ? "Discharge today" :
                           `Discharge in ${daysUntilDischarge}d`}
                        </div>
                      )}
                      {bed.notes && <div className="text-xs text-slate-400 italic truncate">{bed.notes}</div>}
                      <button onClick={() => dischargePatient(bed)}
                        className="w-full mt-2 text-xs border border-slate-300 text-slate-600 py-1.5 rounded-lg hover:bg-white hover:border-red-300 hover:text-red-600 transition-colors font-medium">
                        Discharge →
                      </button>
                    </div>
                  ) : bed.status === "available" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">Ready for admission</p>
                      <button onClick={() => { setAdmitModal(bed); setAdmitForm({ client_id: "", admission_date: new Date().toISOString().split("T")[0], expected_discharge: "", notes: "" }); }}
                        className="w-full text-xs bg-teal-500 text-white py-1.5 rounded-lg hover:bg-teal-400 transition-colors font-semibold">
                        + Admit Patient
                      </button>
                      <button onClick={() => setStatusModal(bed)} className="w-full text-xs border border-slate-200 text-slate-500 py-1 rounded-lg hover:bg-white transition-colors">
                        Change Status
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">{bed.notes || "—"}</p>
                      <button onClick={() => updateStatus(bed, "available")}
                        className="w-full text-xs border border-slate-200 text-slate-600 py-1.5 rounded-lg hover:bg-white hover:text-emerald-600 transition-colors font-medium">
                        Mark Available
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Census list */}
          {occupied > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Current Census</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admitted</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LOS</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Discharge</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {facilityBeds.filter(b => b.status === "occupied").map(bed => {
                    const patient = Array.isArray(bed.patient) ? bed.patient[0] : bed.patient;
                    const los = calcLOS(bed.admission_date);
                    const daysLeft = bed.expected_discharge
                      ? Math.round((new Date(bed.expected_discharge + "T12:00:00").getTime() - Date.now()) / 86400000)
                      : null;
                    return (
                      <tr key={bed.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-sm text-slate-900">
                          {bed.bed_number}
                          {bed.room_number && <span className="text-slate-400 font-normal ml-1">Rm {bed.room_number}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={`/dashboard/clients/${patient?.id}`} className="font-semibold text-sm text-slate-900 hover:text-teal-600 no-underline">
                            {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                          </Link>
                          <div className="text-xs text-slate-400">{patient?.mrn || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {bed.admission_date ? new Date(bed.admission_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">{los !== null ? `${los} days` : "—"}</td>
                        <td className="px-4 py-3.5">
                          {bed.expected_discharge ? (
                            <div>
                              <div className="text-sm text-slate-600">{new Date(bed.expected_discharge + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                              {daysLeft !== null && (
                                <div className={`text-xs font-medium ${daysLeft < 0 ? "text-red-500" : daysLeft <= 3 ? "text-amber-600" : "text-slate-400"}`}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `in ${daysLeft}d`}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => dischargePatient(bed)} className="text-xs text-red-500 font-medium hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                            Discharge
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Admit modal */}
      {admitModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setAdmitModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Admit Patient — Bed {admitModal.bed_number}</h2>
              <button onClick={() => setAdmitModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Patient *</label>
                <select value={admitForm.client_id} onChange={e => setAdmitForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select patient...</option>
                  {patients.filter(p => !beds.some(b => b.client_id === p.id && b.status === "occupied")).map(p => (
                    <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} — MRN: {p.mrn || "—"}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Admission Date</label>
                  <input type="date" value={admitForm.admission_date} onChange={e => setAdmitForm(f => ({ ...f, admission_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Expected Discharge</label>
                  <input type="date" value={admitForm.expected_discharge} onChange={e => setAdmitForm(f => ({ ...f, expected_discharge: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Notes</label>
                <input type="text" value={admitForm.notes} onChange={e => setAdmitForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Room preferences, medical equipment needs..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdmitModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={admitPatient} disabled={saving || !admitForm.client_id}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Admitting..." : "Admit Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setStatusModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-80 p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900">Bed {statusModal.bed_number} — Change Status</h3>
            {["available", "hold", "cleaning", "maintenance"].map(s => (
              <button key={s} onClick={() => updateStatus(statusModal, s)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors hover:bg-slate-50 ${statusModal.status === s ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
                <span className="text-xl">{STATUS_CONFIG[s]?.icon}</span>
                <span className="font-medium text-sm text-slate-900 capitalize">{STATUS_CONFIG[s]?.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}