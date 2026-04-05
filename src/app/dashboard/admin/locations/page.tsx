"use client";

import { useState, useEffect } from "react";

interface Location {
  id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  fax: string | null;
  npi: string | null;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: "", code: "", address_line1: "", address_line2: "",
  city: "", state: "", zip: "", phone: "", fax: "", npi: "",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Location | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showInactive, setShowInactive] = useState(false);

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function loadLocations() {
    const res = await fetch("/api/locations", { credentials: "include" });
    const d = await res.json();
    setLocations(d.locations || []);
  }

  useEffect(() => { loadLocations(); }, []);

  function startEdit(loc: Location) {
    setEditing(true);
    setForm({
      name: loc.name,
      code: loc.code || "",
      address_line1: loc.address_line1 || "",
      address_line2: loc.address_line2 || "",
      city: loc.city || "",
      state: loc.state || "",
      zip: loc.zip || "",
      phone: loc.phone || "",
      fax: loc.fax || "",
      npi: loc.npi || "",
    });
  }

  async function createLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm(EMPTY_FORM);
      await loadLocations();
    }
    setSaving(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/locations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: selected.id, ...form }),
    });
    if (res.ok) {
      setEditing(false);
      await loadLocations();
      const d = await res.json();
      setSelected(d.location);
    }
    setSaving(false);
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this location? Programs assigned to it will not be deleted.")) return;
    await fetch("/api/locations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setSelected(null);
    loadLocations();
  }

  async function reactivate(id: string) {
    await fetch("/api/locations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, is_active: true }),
    });
    loadLocations();
  }

  const visibleLocations = showInactive ? locations : locations.filter(l => l.is_active);

  const LocationForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Location Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Main Street Clinic" required />
        </div>
        <div>
          <label className={labelClass}>Code</label>
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputClass} placeholder="e.g. MSC" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Address</label>
        <input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} className={inputClass} placeholder="Street address" />
      </div>
      <div>
        <input value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} className={inputClass + " mt-2"} placeholder="Suite, unit, floor (optional)" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className={labelClass}>City</label>
          <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="City" />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputClass}>
            <option value="">— Select —</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>ZIP</label>
          <input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className={inputClass} placeholder="12345" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="(555) 000-0000" />
        </div>
        <div>
          <label className={labelClass}>Fax</label>
          <input value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} className={inputClass} placeholder="(555) 000-0001" />
        </div>
        <div>
          <label className={labelClass}>NPI (site)</label>
          <input value={form.npi} onChange={e => setForm(f => ({ ...f, npi: e.target.value }))} className={inputClass} placeholder="1234567890" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={() => { setShowNew(false); setEditing(false); setForm(EMPTY_FORM); }}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations & Sites</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage physical offices and service sites across your organization</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <button onClick={() => { setShowNew(true); setEditing(false); setSelected(null); setForm(EMPTY_FORM); }}
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
            + New Location
          </button>
        </div>
      </div>

      {/* New location form */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">New Location / Site</h2>
          <LocationForm onSubmit={createLocation} submitLabel="Create Location" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Location list */}
        <div className="col-span-1 space-y-2">
          {visibleLocations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              <div className="text-3xl mb-2">🏢</div>
              <p>No locations yet</p>
              <p className="text-xs mt-1">Add your first site above</p>
            </div>
          ) : visibleLocations.map(loc => (
            <button key={loc.id} onClick={() => { setSelected(loc); setEditing(false); }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
                selected?.id === loc.id
                  ? "border-teal-400 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              } ${!loc.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{loc.name}</div>
                  {loc.code && <div className="text-xs text-slate-400 font-mono">{loc.code}</div>}
                  {loc.city && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {[loc.city, loc.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                {!loc.is_active && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium ml-2">Inactive</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Location detail */}
        <div className="col-span-2">
          {selected && !editing ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selected.code && (
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{selected.code}</span>
                    )}
                    {!selected.is_active && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selected)}
                    className="text-xs text-teal-600 hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
                    Edit
                  </button>
                  {selected.is_active ? (
                    <button onClick={() => deactivate(selected.id)}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      Deactivate
                    </button>
                  ) : (
                    <button onClick={() => reactivate(selected.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                      Reactivate
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Address */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Address</div>
                  {selected.address_line1 ? (
                    <div className="text-sm text-slate-700">
                      <div>{selected.address_line1}</div>
                      {selected.address_line2 && <div>{selected.address_line2}</div>}
                      <div>{[selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">No address on file</div>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Contact</div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {selected.phone && <div>📞 {selected.phone}</div>}
                    {selected.fax && <div>📠 {selected.fax}</div>}
                    {!selected.phone && !selected.fax && <div className="text-slate-400">No contact info</div>}
                  </div>
                </div>

                {/* NPI */}
                {selected.npi && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Site NPI</div>
                    <div className="text-sm font-mono text-slate-700">{selected.npi}</div>
                  </div>
                )}
              </div>
            </div>
          ) : selected && editing ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">Edit Location</h2>
              <LocationForm onSubmit={saveEdit} submitLabel="Save Changes" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <div className="text-3xl mb-2">🏢</div>
              <p>Select a location to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
