"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

interface Vital {
  id: string;
  recorded_at: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature_f: number | null;
  oxygen_saturation: number | null;
  weight_lbs: number | null;
  height_in: number | null;
  bmi: number | null;
  pain_scale: number | null;
  blood_glucose: number | null;
  recorded_by_name: string | null;
  notes: string | null;
}

const VITAL_CONFIGS = [
  { key: "bp", label: "Blood Pressure", unit: "mmHg", color: "#ef4444", normalMin: 90, normalMax: 120, icon: "🩸" },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", color: "#f97316", normalMin: 60, normalMax: 100, icon: "❤️" },
  { key: "temperature_f", label: "Temperature", unit: "°F", color: "#eab308", normalMin: 97, normalMax: 99.5, icon: "🌡️" },
  { key: "oxygen_saturation", label: "O₂ Saturation", unit: "%", color: "#3b82f6", normalMin: 95, normalMax: 100, icon: "💨" },
  { key: "respiratory_rate", label: "Resp. Rate", unit: "/min", color: "#8b5cf6", normalMin: 12, normalMax: 20, icon: "🫁" },
  { key: "weight_lbs", label: "Weight", unit: "lbs", color: "#10b981", normalMin: null, normalMax: null, icon: "⚖️" },
  { key: "bmi", label: "BMI", unit: "", color: "#06b6d4", normalMin: 18.5, normalMax: 24.9, icon: "📊" },
  { key: "blood_glucose", label: "Blood Glucose", unit: "mg/dL", color: "#f59e0b", normalMin: 70, normalMax: 140, icon: "🩸" },
  { key: "pain_scale", label: "Pain Scale", unit: "/10", color: "#ec4899", normalMin: 0, normalMax: 3, icon: "😣" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function getBPStatus(sys: number, dia: number) {
  if (sys >= 180 || dia >= 120) return { label: "Hypertensive Crisis", color: "text-red-700 bg-red-100" };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2 Hypertension", color: "text-red-600 bg-red-50" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1 Hypertension", color: "text-orange-600 bg-orange-50" };
  if (sys >= 120) return { label: "Elevated", color: "text-yellow-600 bg-yellow-50" };
  if (sys < 90 || dia < 60) return { label: "Low BP", color: "text-blue-600 bg-blue-50" };
  return { label: "Normal", color: "text-emerald-600 bg-emerald-50" };
}

export default function VitalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeChart, setActiveChart] = useState("bp");
  const [form, setForm] = useState({
    systolic_bp: "", diastolic_bp: "", heart_rate: "", respiratory_rate: "",
    temperature_f: "", oxygen_saturation: "", weight_lbs: "", height_in: "",
    pain_scale: "", blood_glucose: "", notes: "",
    recorded_at: new Date().toISOString().slice(0, 16),
  });

  async function load() {
    const res = await fetch(`/api/vitals?client_id=${patientId}`, { credentials: "include" });
    const d = await res.json();
    setVitals(d.vitals || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/vitals", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ systolic_bp: "", diastolic_bp: "", heart_rate: "", respiratory_rate: "",
      temperature_f: "", oxygen_saturation: "", weight_lbs: "", height_in: "",
      pain_scale: "", blood_glucose: "", notes: "", recorded_at: new Date().toISOString().slice(0, 16) });
    load();
  }

  // Build chart data
  const chartData = [...vitals].reverse().map(v => ({
    date: formatDate(v.recorded_at),
    bp_sys: v.systolic_bp,
    bp_dia: v.diastolic_bp,
    heart_rate: v.heart_rate,
    temperature_f: v.temperature_f,
    oxygen_saturation: v.oxygen_saturation,
    respiratory_rate: v.respiratory_rate,
    weight_lbs: v.weight_lbs,
    bmi: v.bmi,
    blood_glucose: v.blood_glucose,
    pain_scale: v.pain_scale,
  }));

  const latest = vitals[0];
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/clients/${patientId}`} className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vitals</h1>
            <p className="text-slate-500 text-sm mt-0.5">Physical health measurements with trend history</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
          + Record Vitals
        </button>
      </div>

      {/* Latest vitals summary cards */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          {/* BP card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">🩸 Blood Pressure</div>
            {latest.systolic_bp && latest.diastolic_bp ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.systolic_bp}/{latest.diastolic_bp}</div>
                <div className="text-xs text-slate-400">mmHg</div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${getBPStatus(latest.systolic_bp, latest.diastolic_bp).color}`}>
                  {getBPStatus(latest.systolic_bp, latest.diastolic_bp).label}
                </span>
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
          {/* HR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">❤️ Heart Rate</div>
            {latest.heart_rate ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.heart_rate}</div>
                <div className="text-xs text-slate-400">bpm</div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${latest.heart_rate >= 60 && latest.heart_rate <= 100 ? "text-emerald-600 bg-emerald-50" : "text-orange-600 bg-orange-50"}`}>
                  {latest.heart_rate < 60 ? "Bradycardia" : latest.heart_rate > 100 ? "Tachycardia" : "Normal"}
                </span>
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
          {/* O2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">💨 O₂ Saturation</div>
            {latest.oxygen_saturation ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.oxygen_saturation}%</div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${latest.oxygen_saturation >= 95 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                  {latest.oxygen_saturation >= 95 ? "Normal" : "Low — Monitor"}
                </span>
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
          {/* Temp */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">🌡️ Temperature</div>
            {latest.temperature_f ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.temperature_f}°F</div>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${latest.temperature_f < 97 ? "text-blue-600 bg-blue-50" : latest.temperature_f > 99.5 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}`}>
                  {latest.temperature_f < 97 ? "Hypothermia" : latest.temperature_f > 99.5 ? "Fever" : "Normal"}
                </span>
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
          {/* Weight/BMI */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">⚖️ Weight / BMI</div>
            {latest.weight_lbs ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.weight_lbs} <span className="text-base font-normal text-slate-400">lbs</span></div>
                {latest.bmi && <div className="text-sm text-slate-500 mt-0.5">BMI: {latest.bmi}</div>}
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
          {/* Pain */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">😣 Pain Scale</div>
            {latest.pain_scale !== null && latest.pain_scale !== undefined ? (
              <>
                <div className="text-2xl font-bold text-slate-900">{latest.pain_scale}<span className="text-base font-normal text-slate-400">/10</span></div>
                <div className="flex gap-0.5 mt-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${i < latest.pain_scale! ? (latest.pain_scale! > 6 ? "bg-red-400" : latest.pain_scale! > 3 ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-100"}`} />
                  ))}
                </div>
              </>
            ) : <div className="text-slate-300 text-sm">Not recorded</div>}
          </div>
        </div>
      )}

      {/* Chart tabs + chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Trend History</h2>
          </div>
          {/* Chart selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[
              { key: "bp", label: "Blood Pressure" },
              { key: "heart_rate", label: "Heart Rate" },
              { key: "temperature_f", label: "Temperature" },
              { key: "oxygen_saturation", label: "O₂ Sat" },
              { key: "weight_lbs", label: "Weight" },
              { key: "pain_scale", label: "Pain" },
            ].map(c => (
              <button key={c.key} onClick={() => setActiveChart(c.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activeChart === c.key ? "bg-[#0d1b2e] text-white" : "border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {c.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              {activeChart === "bp" ? (
                <>
                  <Line type="monotone" dataKey="bp_sys" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Systolic" connectNulls />
                  <Line type="monotone" dataKey="bp_dia" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Diastolic" connectNulls />
                  <ReferenceLine y={120} stroke="#fca5a5" strokeDasharray="4 2" label={{ value: "120", fontSize: 10, fill: "#fca5a5" }} />
                </>
              ) : activeChart === "heart_rate" ? (
                <>
                  <Line type="monotone" dataKey="heart_rate" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" connectNulls />
                  <ReferenceLine y={100} stroke="#fed7aa" strokeDasharray="4 2" />
                  <ReferenceLine y={60} stroke="#bfdbfe" strokeDasharray="4 2" />
                </>
              ) : activeChart === "temperature_f" ? (
                <>
                  <Line type="monotone" dataKey="temperature_f" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} name="Temp (°F)" connectNulls />
                  <ReferenceLine y={99.5} stroke="#fde68a" strokeDasharray="4 2" />
                </>
              ) : activeChart === "oxygen_saturation" ? (
                <>
                  <Line type="monotone" dataKey="oxygen_saturation" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="SpO₂ %" connectNulls />
                  <ReferenceLine y={95} stroke="#bfdbfe" strokeDasharray="4 2" />
                </>
              ) : activeChart === "weight_lbs" ? (
                <Line type="monotone" dataKey="weight_lbs" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Weight (lbs)" connectNulls />
              ) : (
                <>
                  <Line type="monotone" dataKey="pain_scale" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Pain (0–10)" connectNulls />
                  <ReferenceLine y={7} stroke="#fbcfe8" strokeDasharray="4 2" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Entry form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Record Vitals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Date & Time</label>
              <input type="datetime-local" value={form.recorded_at} onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Systolic BP</label>
              <div className="relative"><input type="number" value={form.systolic_bp} onChange={e => setForm(f => ({ ...f, systolic_bp: e.target.value }))} className={inputClass} placeholder="120" min="50" max="250" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">mmHg</span></div>
            </div>
            <div>
              <label className={labelClass}>Diastolic BP</label>
              <div className="relative"><input type="number" value={form.diastolic_bp} onChange={e => setForm(f => ({ ...f, diastolic_bp: e.target.value }))} className={inputClass} placeholder="80" min="30" max="150" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">mmHg</span></div>
            </div>
            <div>
              <label className={labelClass}>Heart Rate</label>
              <div className="relative"><input type="number" value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))} className={inputClass} placeholder="72" min="20" max="250" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">bpm</span></div>
            </div>
            <div>
              <label className={labelClass}>Temperature</label>
              <div className="relative"><input type="number" step="0.1" value={form.temperature_f} onChange={e => setForm(f => ({ ...f, temperature_f: e.target.value }))} className={inputClass} placeholder="98.6" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">°F</span></div>
            </div>
            <div>
              <label className={labelClass}>O₂ Saturation</label>
              <div className="relative"><input type="number" value={form.oxygen_saturation} onChange={e => setForm(f => ({ ...f, oxygen_saturation: e.target.value }))} className={inputClass} placeholder="98" min="70" max="100" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span></div>
            </div>
            <div>
              <label className={labelClass}>Resp. Rate</label>
              <div className="relative"><input type="number" value={form.respiratory_rate} onChange={e => setForm(f => ({ ...f, respiratory_rate: e.target.value }))} className={inputClass} placeholder="16" min="5" max="60" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">/min</span></div>
            </div>
            <div>
              <label className={labelClass}>Weight</label>
              <div className="relative"><input type="number" step="0.1" value={form.weight_lbs} onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))} className={inputClass} placeholder="155" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">lbs</span></div>
            </div>
            <div>
              <label className={labelClass}>Height</label>
              <div className="relative"><input type="number" value={form.height_in} onChange={e => setForm(f => ({ ...f, height_in: e.target.value }))} className={inputClass} placeholder="68" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">in</span></div>
            </div>
            <div>
              <label className={labelClass}>Blood Glucose</label>
              <div className="relative"><input type="number" value={form.blood_glucose} onChange={e => setForm(f => ({ ...f, blood_glucose: e.target.value }))} className={inputClass} placeholder="95" /><span className="absolute right-3 top-2.5 text-xs text-slate-400">mg/dL</span></div>
            </div>
          </div>
          {/* Pain scale slider */}
          <div>
            <label className={labelClass}>Pain Scale: {form.pain_scale || "0"}/10</label>
            <input type="range" min="0" max="10" value={form.pain_scale || "0"} onChange={e => setForm(f => ({ ...f, pain_scale: e.target.value }))}
              className="w-full accent-teal-500" />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0 — No pain</span><span>5 — Moderate</span><span>10 — Severe</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className={inputClass + " resize-none"} placeholder="Any observations or context..." />
          </div>
          {/* BMI preview */}
          {form.weight_lbs && form.height_in && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5 text-sm text-teal-800">
              Calculated BMI: <strong>{Math.round((Number(form.weight_lbs) / (Number(form.height_in) ** 2)) * 703 * 10) / 10}</strong>
              {(() => {
                const bmi = Math.round((Number(form.weight_lbs) / (Number(form.height_in) ** 2)) * 703 * 10) / 10;
                if (bmi < 18.5) return " — Underweight";
                if (bmi < 25) return " — Normal weight";
                if (bmi < 30) return " — Overweight";
                return " — Obese";
              })()}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Vitals"}
            </button>
          </div>
        </form>
      )}

      {/* History table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Vitals History ({vitals.length} entries)</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : vitals.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">🩺</div>
            <p>No vitals recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Date", "BP", "HR", "Temp", "SpO₂", "RR", "Weight", "BMI", "Pain", "Glucose", "By"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vitals.map((v, i) => (
                  <tr key={v.id} className={`hover:bg-slate-50 ${i === 0 ? "bg-teal-50/30" : ""}`}>
                    <td className="px-3 py-3 text-xs text-slate-900 font-medium whitespace-nowrap">{formatDate(v.recorded_at)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-900">{v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.heart_rate ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.temperature_f ? `${v.temperature_f}°` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.respiratory_rate ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.weight_lbs ? `${v.weight_lbs}` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.bmi ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.pain_scale !== null && v.pain_scale !== undefined ? `${v.pain_scale}/10` : "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-900">{v.blood_glucose ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{v.recorded_by_name?.split(" ")[0] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
