"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BUILT_IN_TEMPLATES, CATEGORY_META, type FormTemplate, type FormCategory } from "@/lib/formTemplates";

const ALL_CATEGORIES: FormCategory[] = ["intake", "clinical", "discharge", "crisis", "consent", "medication", "group", "administrative"];

const POPULATION_LABELS: Record<string, string> = {
  adult: "Adult",
  pediatric: "Pediatric / Youth",
  dd: "Developmental Disabilities",
  sud: "Substance Use",
  all: "All Populations",
};

export default function FormsLibraryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FormCategory | "all">("all");
  const [activePopulation, setActivePopulation] = useState<string>("all");
  const [customTemplates, setCustomTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forms/templates", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setCustomTemplates(d.custom || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allTemplates = [
    ...BUILT_IN_TEMPLATES,
    ...customTemplates.map(t => ({ ...t, isBuiltIn: false as const })),
  ];

  const filtered = allTemplates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = activeCategory === "all" || t.category === activeCategory;
    const matchPop = activePopulation === "all" || t.populations.includes(activePopulation) || t.populations.includes("all");
    return matchSearch && matchCategory && matchPop;
  });

  const categoriesWithTemplates = ALL_CATEGORIES.filter(c =>
    allTemplates.some(t => t.category === c)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form Template Library</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pre-built and custom clinical forms for behavioral health, DD, and SUD programs</p>
        </div>
        <Link href="/dashboard/forms/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Custom Template
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{BUILT_IN_TEMPLATES.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Built-in Templates</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{customTemplates.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Custom Templates</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{categoriesWithTemplates.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Categories</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">
            {BUILT_IN_TEMPLATES.reduce((acc, t) => acc + t.sections.reduce((sa, s) => sa + s.fields.length, 0), 0)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Total Fields</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search templates by name, type, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeCategory === "all" ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-teal-300"
            }`}>
            All Categories
          </button>
          {categoriesWithTemplates.map(cat => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                activeCategory === cat ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-teal-300"
              }`}>
              {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label || cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "adult", "pediatric", "dd", "sud"].map(pop => (
            <button key={pop}
              onClick={() => setActivePopulation(pop)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activePopulation === pop ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}>
              {pop === "all" ? "All Populations" : POPULATION_LABELS[pop]}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-8 w-8 bg-slate-100 rounded-lg mb-3" />
              <div className="h-4 bg-slate-100 rounded mb-2 w-3/4" />
              <div className="h-3 bg-slate-50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <div className="font-semibold text-slate-700 mb-1">No templates found</div>
          <div className="text-sm text-slate-400">Try adjusting your search or filters</div>
          <button onClick={() => { setSearch(""); setActiveCategory("all"); setActivePopulation("all"); }}
            className="mt-4 text-sm text-teal-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(template => (
            <Link key={template.id} href={`/dashboard/forms/${template.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all no-underline group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{template.icon}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {(template as { isBuiltIn?: boolean }).isBuiltIn !== false && (
                    <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">Built-in</span>
                  )}
                  {(template as { isBuiltIn?: boolean }).isBuiltIn === false && (
                    <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">Custom</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                    CATEGORY_META[template.category]
                      ? "bg-slate-50 text-slate-600 border-slate-200"
                      : "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>
                    {CATEGORY_META[template.category]?.label || template.category}
                  </span>
                </div>
              </div>
              <div className="font-bold text-slate-900 text-sm mb-1 group-hover:text-teal-700 transition-colors">{template.name}</div>
              <div className="text-xs text-slate-500 mb-3 line-clamp-2">{template.description}</div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {template.populations.slice(0, 2).map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                      {POPULATION_LABELS[p] || p}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-slate-400">
                  {template.sections.length} sections · {template.estimatedMinutes}m
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Compliance note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ About Template Library</div>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• <strong>Built-in templates</strong> are curated for behavioral health, DD, and SUD programs and updated with regulatory changes</li>
          <li>• <strong>Custom templates</strong> are created by your organization and are visible only to your staff</li>
          <li>• Templates can be previewed before use; forms are completed within the client&apos;s chart</li>
          <li>• All built-in templates follow JCAHO, CARF, SAMHSA TEDS, and ASAM documentation standards where applicable</li>
        </ul>
      </div>
    </div>
  );
}
