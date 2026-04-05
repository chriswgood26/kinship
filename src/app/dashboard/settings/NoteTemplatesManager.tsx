"use client";

import { useState, useEffect } from "react";

interface NoteSection {
  key: string;
  label: string;
  placeholder: string;
}

interface NoteTemplate {
  id: string;
  name: string;
  description: string | null;
  sections: NoteSection[];
  is_default: boolean;
  sort_order: number;
}

const BUILT_IN_PRESETS = [
  {
    name: "DAP Note",
    description: "Data, Assessment, Plan — common in behavioral health",
    sections: [
      { key: "data", label: "D — Data", placeholder: "Objective and subjective data from the session. Client presentation, reported symptoms, behavior observed..." },
      { key: "assessment", label: "A — Assessment", placeholder: "Clinical assessment, progress toward treatment goals, diagnostic impressions..." },
      { key: "plan", label: "P — Plan", placeholder: "Interventions provided, homework assigned, referrals made, next appointment..." },
    ],
  },
  {
    name: "BIRP Note",
    description: "Behavior, Intervention, Response, Plan",
    sections: [
      { key: "behavior", label: "B — Behavior", placeholder: "Observable behaviors and client-reported symptoms during the session..." },
      { key: "intervention", label: "I — Intervention", placeholder: "Therapeutic interventions and techniques used during the session..." },
      { key: "response", label: "R — Response", placeholder: "Client's response to interventions, engagement level, progress observed..." },
      { key: "plan", label: "P — Plan", placeholder: "Next steps, homework, next session focus, referrals..." },
    ],
  },
  {
    name: "GIRP Note",
    description: "Goal, Intervention, Response, Plan",
    sections: [
      { key: "goal", label: "G — Goal", placeholder: "Treatment goal(s) addressed in today's session..." },
      { key: "intervention", label: "I — Intervention", placeholder: "Therapeutic interventions and techniques used..." },
      { key: "response", label: "R — Response", placeholder: "Client's response to interventions and goal progress..." },
      { key: "plan", label: "P — Plan", placeholder: "Plan for next session, homework, follow-up actions..." },
    ],
  },
  {
    name: "Progress Note",
    description: "Simple narrative progress note",
    sections: [
      { key: "narrative", label: "Session Summary", placeholder: "Describe the session, client presentation, topics discussed, progress noted..." },
      { key: "plan", label: "Plan", placeholder: "Next steps, homework, referrals, next appointment..." },
    ],
  },
];

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  section: NoteSection;
  index: number;
  onChange: (s: NoteSection) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Section {index + 1}</span>
        {canRemove && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs font-medium">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Section Label</label>
          <input
            value={section.label}
            onChange={e => onChange({ ...section, label: e.target.value })}
            placeholder="e.g. D — Data"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Field Key (no spaces)</label>
          <input
            value={section.key}
            onChange={e => onChange({ ...section, key: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
            placeholder="e.g. data"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Placeholder Text</label>
        <input
          value={section.placeholder}
          onChange={e => onChange({ ...section, placeholder: e.target.value })}
          placeholder="Guidance shown inside the text field..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<NoteTemplate>;
  onSave: (data: { name: string; description: string; sections: NoteSection[]; is_default: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [sections, setSections] = useState<NoteSection[]>(
    initial?.sections?.length ? initial.sections : [{ key: "section_1", label: "", placeholder: "" }]
  );
  const [isDefault, setIsDefault] = useState(initial?.is_default || false);
  const [selectedPreset, setSelectedPreset] = useState("");

  function applyPreset(presetName: string) {
    const preset = BUILT_IN_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    setName(preset.name);
    setDescription(preset.description);
    setSections(preset.sections.map(s => ({ ...s })));
    setSelectedPreset(presetName);
  }

  function addSection() {
    setSections(s => [...s, { key: `section_${s.length + 1}`, label: "", placeholder: "" }]);
  }

  function updateSection(i: number, updated: NoteSection) {
    setSections(s => s.map((sec, idx) => idx === i ? updated : sec));
  }

  function removeSection(i: number) {
    setSections(s => s.filter((_, idx) => idx !== i));
  }

  const isValid = name.trim() && sections.length > 0 && sections.every(s => s.key && s.label);

  return (
    <div className="space-y-4">
      {/* Preset picker */}
      {!initial?.id && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Start from a preset (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {BUILT_IN_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedPreset === p.name
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-600"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name + description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. DAP Note"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of when to use this template"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Sections <span className="text-red-500">*</span>
          </label>
          <button
            onClick={addSection}
            className="text-xs text-teal-600 font-medium hover:text-teal-800"
          >
            + Add Section
          </button>
        </div>
        <div className="space-y-3">
          {sections.map((s, i) => (
            <SectionEditor
              key={i}
              section={s}
              index={i}
              onChange={updated => updateSection(i, updated)}
              onRemove={() => removeSection(i)}
              canRemove={sections.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={e => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-slate-700">Set as default template for new notes</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name: name.trim(), description: description.trim(), sections, is_default: isDefault })}
          disabled={!isValid || saving}
          className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : initial?.id ? "Save Changes" : "Create Template"}
        </button>
        <button
          onClick={onCancel}
          className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function NoteTemplatesManager() {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/note-templates", { credentials: "include" });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTemplates(); }, []);

  async function handleCreate(form: { name: string; description: string; sections: NoteSection[]; is_default: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/note-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create template");
        return;
      }
      setCreating(false);
      await loadTemplates();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, form: { name: string; description: string; sections: NoteSection[]; is_default: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/note-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to update template");
        return;
      }
      setEditingId(null);
      await loadTemplates();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Archive this template? It won't appear for new notes, but existing notes are unaffected.")) return;
    const res = await fetch(`/api/note-templates/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) await loadTemplates();
  }

  async function toggleDefault(id: string, currentDefault: boolean) {
    await fetch(`/api/note-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_default: !currentDefault }),
    });
    await loadTemplates();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SOAP — built-in */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">SOAP Note</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">Built-in</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Subjective, Objective, Assessment, Plan — the standard clinical format</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
          {["S — Subjective", "O — Objective", "A — Assessment", "P — Plan"].map(s => (
            <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{s}</span>
          ))}
        </div>
      </div>

      {/* Custom templates */}
      {loading ? (
        <div className="text-sm text-slate-400 py-4 text-center animate-pulse">Loading templates...</div>
      ) : (
        <>
          {templates.map(tpl => (
            <div key={tpl.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {editingId === tpl.id ? (
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Edit Template</h3>
                  <TemplateForm
                    initial={tpl}
                    onSave={form => handleEdit(tpl.id, form)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{tpl.name}</span>
                          {tpl.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Default</span>
                          )}
                        </div>
                        {tpl.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDefault(tpl.id, tpl.is_default)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          tpl.is_default
                            ? "border-teal-200 text-teal-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            : "border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600"
                        }`}
                      >
                        {tpl.is_default ? "Remove Default" : "Set as Default"}
                      </button>
                      <button
                        onClick={() => setEditingId(tpl.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 font-medium"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {tpl.sections.map(s => (
                      <span key={s.key} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{s.label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Create form */}
          {creating ? (
            <div className="border border-teal-200 rounded-xl p-5 bg-teal-50/30">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">New Custom Template</h3>
              <TemplateForm
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
                saving={saving}
              />
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full border border-dashed border-slate-300 rounded-xl py-4 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/30 transition-colors font-medium"
            >
              + Add Custom Template
            </button>
          )}
        </>
      )}
    </div>
  );
}
