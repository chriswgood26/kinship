"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Category = "appointment_client" | "appointment_provider" | "encounter";

interface AppointmentType {
  id: string;
  name: string;
  category: Category;
  color: string | null;
  default_duration_minutes: number | null;
  is_telehealth: boolean;
  sort_order: number;
  is_active: boolean;
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; description: string }> = {
  appointment_client: {
    label: "Client Appointment Types",
    icon: "📅",
    description: "Types used when scheduling appointments with clients",
  },
  appointment_provider: {
    label: "Provider Block Types",
    icon: "🗓",
    description: "Types used for provider-only calendar blocks (no client)",
  },
  encounter: {
    label: "Encounter / Visit Types",
    icon: "📋",
    description: "Types used when creating clinical encounters",
  },
};

const DEFAULT_COLORS = [
  "#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#10b981", "#3b82f6", "#f97316", "#ec4899", "#64748b",
];

const CATEGORIES: Category[] = ["appointment_client", "appointment_provider", "encounter"];

export default function EncounterTypesPage() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add form state
  const [addingCategory, setAddingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [newDuration, setNewDuration] = useState<number | "">("");
  const [newIsTelehealth, setNewIsTelehealth] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    setLoading(true);
    try {
      const res = await fetch("/api/encounter-appointment-types", { credentials: "include" });
      const data = await res.json();
      setTypes(data.types || []);
    } catch {
      setError("Failed to load types");
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleAdd(category: Category) {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/encounter-appointment-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          category,
          color: newColor,
          default_duration_minutes: newDuration || null,
          is_telehealth: newIsTelehealth,
          sort_order: types.filter(t => t.category === category).length,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to add type"); return; }
      setTypes(prev => [...prev, data.type]);
      setNewName("");
      setNewColor(DEFAULT_COLORS[0]);
      setNewDuration("");
      setNewIsTelehealth(false);
      setAddingCategory(null);
      showSuccess(`"${data.type.name}" added`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/encounter-appointment-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update"); return; }
      setTypes(prev => prev.map(t => t.id === id ? data.type : t));
      setEditingId(null);
      showSuccess("Name updated");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}"? It will no longer appear in dropdowns.`)) return;
    try {
      const res = await fetch(`/api/encounter-appointment-types/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) { setError("Failed to delete"); return; }
      setTypes(prev => prev.filter(t => t.id !== id));
      showSuccess(`"${name}" removed`);
    } catch {
      setError("Failed to delete");
    }
  }

  async function handleColorChange(id: string, color: string) {
    try {
      const res = await fetch(`/api/encounter-appointment-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ color }),
      });
      const data = await res.json();
      if (res.ok) setTypes(prev => prev.map(t => t.id === id ? data.type : t));
    } catch {}
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Encounter &amp; Appointment Types</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure custom type definitions for your organization</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-sm text-red-700">❌ {error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-700">✅ {success}</div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ How custom types work</div>
        <ul className="space-y-0.5 text-xs">
          <li>• Types you add here appear in the dropdowns when scheduling appointments or creating encounters</li>
          <li>• <strong>If no custom types are configured</strong>, the system uses built-in defaults</li>
          <li>• Adding even one custom type to a category replaces the defaults for that category</li>
          <li>• Removing a type hides it from new records — existing records keep their type label</li>
        </ul>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Loading...</div>
      ) : (
        CATEGORIES.map(category => {
          const cfg = CATEGORY_CONFIG[category];
          const categoryTypes = types.filter(t => t.category === category);
          const isAdding = addingCategory === category;

          return (
            <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">{cfg.icon} {cfg.label}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{cfg.description}</p>
                </div>
                <button
                  onClick={() => {
                    setAddingCategory(isAdding ? null : category);
                    setNewName("");
                    setNewColor(DEFAULT_COLORS[0]);
                    setNewDuration("");
                    setNewIsTelehealth(false);
                  }}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  {isAdding ? "Cancel" : "+ Add Type"}
                </button>
              </div>

              {/* Add form */}
              {isAdding && (
                <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Type Name *</label>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAdd(category)}
                        placeholder="e.g. Individual Therapy"
                        className={inputClass}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Default Duration (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={newDuration}
                        onChange={e => setNewDuration(e.target.value ? parseInt(e.target.value) : "")}
                        placeholder="e.g. 60"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <label className={labelClass}>Color</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {DEFAULT_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? "border-slate-700 scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    {category !== "appointment_provider" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsTelehealth}
                          onChange={e => setNewIsTelehealth(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700 font-medium">🎥 Telehealth type</span>
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdd(category)}
                      disabled={saving || !newName.trim()}
                      className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
                    >
                      {saving ? "Adding..." : "Add Type"}
                    </button>
                    <button
                      onClick={() => setAddingCategory(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Type list */}
              {categoryTypes.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-400 text-sm">
                  <p>No custom types configured.</p>
                  <p className="text-xs mt-1">System defaults will be used. Add a type to override.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {categoryTypes.map(t => (
                    <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 group">
                      {/* Color dot */}
                      <div className="relative">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.color || "#94a3b8" }}
                        />
                      </div>

                      {/* Name (editable) */}
                      {editingId === t.id ? (
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRename(t.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 border border-teal-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium text-slate-900">
                          {t.name}
                          {t.is_telehealth && <span className="ml-2 text-xs text-teal-600 font-normal">🎥 telehealth</span>}
                          {t.default_duration_minutes && (
                            <span className="ml-2 text-xs text-slate-400 font-normal">{t.default_duration_minutes} min</span>
                          )}
                        </span>
                      )}

                      {/* Color swatches (visible on hover) */}
                      <div className="hidden group-hover:flex gap-1 items-center">
                        {DEFAULT_COLORS.slice(0, 5).map(c => (
                          <button
                            key={c}
                            onClick={() => handleColorChange(t.id, c)}
                            className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${t.color === c ? "border-slate-600" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                            title={`Set color to ${c}`}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      {editingId === t.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRename(t.id)}
                            disabled={saving}
                            className="text-xs bg-teal-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs border border-slate-200 text-slate-500 px-3 py-1 rounded-lg hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(t.id); setEditName(t.name); }}
                            className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="text-xs text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
