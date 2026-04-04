"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Amendment {
  id: string;
  amendment_type: "amendment" | "addendum";
  content: string;
  author_name: string | null;
  author_clerk_id: string;
  created_at: string;
}

interface Props {
  noteId: string;
  initialAmendments: Amendment[];
}

const TYPE_LABELS = {
  amendment: { label: "Amendment", description: "Factual correction to the original note", color: "amber" },
  addendum: { label: "Addendum", description: "Additional clinical information", color: "blue" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function NoteAmendmentPanel({ noteId, initialAmendments }: Props) {
  const [amendments, setAmendments] = useState<Amendment[]>(initialAmendments);
  const [showForm, setShowForm] = useState(false);
  const [amendmentType, setAmendmentType] = useState<"amendment" | "addendum">("addendum");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notes/amend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note_id: noteId, amendment_type: amendmentType, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save amendment");
        return;
      }
      const data = await res.json();
      setAmendments(prev => [...prev, data.amendment]);
      setContent("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Amendments &amp; Addenda</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The original signed note cannot be changed. Corrections are appended below with a full audit trail.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 transition-colors"
          >
            + Add Amendment
          </button>
        )}
      </div>

      {/* Existing amendments */}
      {amendments.length > 0 && (
        <div className="divide-y divide-slate-100">
          {amendments.map((a) => {
            const cfg = TYPE_LABELS[a.amendment_type];
            const colorMap = {
              amber: { badge: "bg-amber-100 text-amber-700", border: "border-l-amber-400" },
              blue: { badge: "bg-blue-100 text-blue-700", border: "border-l-blue-400" },
            };
            const colors = colorMap[cfg.color as "amber" | "blue"];
            return (
              <div key={a.id} className={`px-5 py-4 border-l-4 ${colors.border}`}>
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {a.author_name || a.author_clerk_id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(a.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {amendments.length === 0 && !showForm && (
        <div className="px-5 py-6 text-center text-sm text-slate-400">
          No amendments or addenda on this note.
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 border-t border-slate-100">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-3">
            {(["addendum", "amendment"] as const).map((type) => {
              const cfg = TYPE_LABELS[type];
              const isActive = amendmentType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAmendmentType(type)}
                  className={`border rounded-xl p-3 text-left transition-colors ${
                    isActive
                      ? "border-teal-400 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`text-sm font-semibold ${isActive ? "text-teal-700" : "text-slate-900"}`}>
                    {cfg.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{cfg.description}</div>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              {TYPE_LABELS[amendmentType].label} Text
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
              placeholder={
                amendmentType === "amendment"
                  ? "Describe the correction being made and the reason for the amendment..."
                  : "Add supplementary clinical information that was omitted or has since become available..."
              }
              required
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            <span className="font-semibold">Warning:</span> This {TYPE_LABELS[amendmentType].label.toLowerCase()} will be permanently recorded with your name, timestamp, and full audit trail. The original signed note will not be altered.
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setContent(""); setError(null); }}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : `Save ${TYPE_LABELS[amendmentType].label}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
