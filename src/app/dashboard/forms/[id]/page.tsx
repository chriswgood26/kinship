"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CATEGORY_META, type FormTemplate, type FormField } from "@/lib/formTemplates";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text / paragraph",
  select: "Dropdown select",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  radio: "Radio (single choice)",
  date: "Date",
  number: "Number",
  phone: "Phone number",
  email: "Email",
  signature: "Signature",
  heading: "Section heading",
  divider: "Divider",
};

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: "📝",
  textarea: "📄",
  select: "▾",
  multiselect: "☑️",
  checkbox: "☐",
  radio: "◉",
  date: "📅",
  number: "🔢",
  phone: "📞",
  email: "✉️",
  signature: "✍️",
  heading: "H",
  divider: "—",
};

function FieldPreview({ field }: { field: FormField }) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-base w-5 text-center flex-shrink-0 mt-0.5 text-slate-400">{FIELD_TYPE_ICONS[field.type] || "📝"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900">{field.label}</span>
            {field.required && <span className="text-xs text-red-500 font-semibold">Required</span>}
            {field.conditional && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Conditional
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{FIELD_TYPE_LABELS[field.type] || field.type}</span>
            {field.hint && <span className="text-xs text-blue-500">· {field.hint}</span>}
          </div>
          {field.options && field.options.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {field.options.slice(0, 5).map(opt => (
                <span key={opt} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{opt}</span>
              ))}
              {field.options.length > 5 && (
                <span className="text-xs text-slate-400">+{field.options.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FormTemplatePage() {
  const params = useParams();
  const id = params.id as string;
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [isBuiltIn, setIsBuiltIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/forms/templates/${id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setTemplate(d.template);
        setIsBuiltIn(d.isBuiltIn);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function copyTemplateId() {
    if (!template) return;
    await navigator.clipboard.writeText(template.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-1/3" />
        <div className="h-4 bg-slate-50 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-3">📄</div>
        <div className="font-semibold text-slate-700 mb-1">Template not found</div>
        <Link href="/dashboard/forms" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
          ← Back to Template Library
        </Link>
      </div>
    );
  }

  const totalFields = template.sections.reduce((acc, s) => acc + s.fields.length, 0);
  const requiredFields = template.sections.reduce((acc, s) => acc + s.fields.filter(f => f.required).length, 0);
  const catMeta = CATEGORY_META[template.category];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back link */}
      <Link href="/dashboard/forms" className="text-slate-400 hover:text-slate-700 text-sm flex items-center gap-1">
        ← Back to Template Library
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-5xl">{template.icon}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{template.name}</h1>
                {isBuiltIn ? (
                  <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">Built-in</span>
                ) : (
                  <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">Custom</span>
                )}
                {catMeta && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {catMeta.icon} {catMeta.label}
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm">{template.description}</p>
              {(template as { complianceNotes?: string }).complianceNotes && (
                <p className="text-xs text-blue-600 mt-1.5">ℹ️ {(template as { complianceNotes?: string }).complianceNotes}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {template.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={copyTemplateId}
              className="text-xs border border-slate-200 text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              {copied ? "✓ Copied" : "Copy ID"}
            </button>
            {!isBuiltIn && (
              <Link href={`/dashboard/forms/${id}/edit`}
                className="text-xs bg-slate-800 text-white px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors">
                Edit Template
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div>
            <div className="text-xl font-bold text-slate-900">{template.sections.length}</div>
            <div className="text-xs text-slate-500">Sections</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalFields}</div>
            <div className="text-xs text-slate-500">Total Fields</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">{requiredFields}</div>
            <div className="text-xs text-slate-500">Required Fields</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{template.estimatedMinutes}m</div>
            <div className="text-xs text-slate-500">Est. Completion Time</div>
          </div>
        </div>
      </div>

      {/* Populations */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Applicable Populations</div>
        <div className="flex gap-2 flex-wrap">
          {(template as { populations: string[] }).populations.map(p => (
            <span key={p} className="text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium capitalize">
              {p === "all" ? "All Populations" : p === "dd" ? "Developmental Disabilities" : p === "sud" ? "Substance Use Disorder" : p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Section navigator + preview */}
      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Sidebar nav */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 h-fit sticky top-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-2">Sections</div>
          <nav className="space-y-0.5">
            {template.sections.map((section, i) => (
              <button key={i} onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  activeSection === i
                    ? "bg-teal-500 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}>
                <div className="truncate">{section.title}</div>
                <div className={`text-xs mt-0.5 ${activeSection === i ? "text-teal-100" : "text-slate-400"}`}>
                  {section.fields.length} fields
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Section detail */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {template.sections[activeSection] && (
            <>
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">{template.sections[activeSection].title}</h2>
                    {template.sections[activeSection].description && (
                      <p className="text-xs text-slate-500 mt-0.5">{template.sections[activeSection].description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                      disabled={activeSection === 0}
                      className="text-xs border border-slate-200 px-2.5 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors">
                      ← Prev
                    </button>
                    <button
                      onClick={() => setActiveSection(Math.min(template.sections.length - 1, activeSection + 1))}
                      disabled={activeSection === template.sections.length - 1}
                      className="text-xs border border-slate-200 px-2.5 py-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-2">
                {template.sections[activeSection].fields.map(field => (
                  <FieldPreview key={field.key} field={field} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* All sections summary */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Full Template Structure</h2>
          <p className="text-xs text-slate-400 mt-0.5">All {template.sections.length} sections with field counts</p>
        </div>
        <div className="divide-y divide-slate-50">
          {template.sections.map((section, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4">
              <div className="w-7 h-7 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-900">{section.title}</div>
                {section.description && <div className="text-xs text-slate-400 mt-0.5">{section.description}</div>}
              </div>
              <div className="text-xs text-slate-400 flex-shrink-0">
                {section.fields.length} fields
                {section.fields.some(f => f.required) && (
                  <span className="ml-2 text-red-400">· {section.fields.filter(f => f.required).length} required</span>
                )}
              </div>
              <button onClick={() => setActiveSection(i)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex-shrink-0">
                Preview →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
