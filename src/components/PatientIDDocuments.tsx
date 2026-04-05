"use client";

import { useState, useEffect, useRef } from "react";

interface IDDocument {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  tag: string | null;
  notes: string | null;
  storage_path: string;
  created_at: string;
}

interface Props {
  clientId: string;
}

const TAG_OPTIONS = [
  { value: "patient_photo", label: "Patient Photo", icon: "🧑", color: "teal" },
  { value: "government_id", label: "Government ID", icon: "🪪", color: "emerald" },
  { value: "insurance_card", label: "Insurance Card", icon: "🏥", color: "blue" },
  { value: "other_id", label: "Other ID Document", icon: "📋", color: "slate" },
] as const;

type TagValue = typeof TAG_OPTIONS[number]["value"];

function tagMeta(tag: string | null) {
  return TAG_OPTIONS.find(t => t.value === tag) ?? { value: tag ?? "", label: tag ?? "Untagged", icon: "📄", color: "slate" };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PhotoThumbnail({ doc, onClick }: { doc: IDDocument; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!doc.file_type?.startsWith("image/")) return;
    fetch(`/api/documents/thumbnail?path=${encodeURIComponent(doc.storage_path)}`, {
      credentials: "include",
    })
      .then(r => r.json())
      .then(d => { if (d.url) setUrl(d.url); })
      .catch(() => {});
  }, [doc.storage_path, doc.file_type]);

  const meta = tagMeta(doc.tag);

  return (
    <button
      onClick={onClick}
      className="relative group flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-300 hover:bg-teal-50 transition-all text-left w-full"
    >
      {/* Image or icon */}
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
        {url ? (
          <img src={url} alt={doc.file_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">{meta.icon}</span>
        )}
      </div>

      {/* Tag badge */}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-${meta.color}-100 text-${meta.color}-700 self-start`}>
        {meta.label}
      </span>

      <div className="w-full">
        <div className="text-xs font-medium text-slate-700 truncate">{doc.file_name}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {doc.file_size && ` · ${formatBytes(doc.file_size)}`}
        </div>
      </div>
    </button>
  );
}

export default function PatientIDDocuments({ clientId }: Props) {
  const [docs, setDocs] = useState<IDDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagValue>("government_id");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<IDDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, [clientId]);

  async function fetchDocs() {
    try {
      const res = await fetch(
        `/api/documents?patient_id=${clientId}&tag=patient_photo&tag=government_id&tag=insurance_card&tag=other_id`,
        { credentials: "include" }
      );
      // The API only filters by one tag at a time — fetch all and filter client-side
      const allRes = await fetch(`/api/documents?patient_id=${clientId}`, { credentials: "include" });
      const allData = await allRes.json();
      const tagged = (allData.documents || []).filter((d: IDDocument) =>
        d.tag && ["patient_photo", "government_id", "insurance_card", "other_id"].includes(d.tag)
      );
      setDocs(tagged);
    } catch {
      // fail silently
    }
  }

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only images and PDFs are allowed.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("File must be under 25MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patient_id", clientId);
      fd.append("tag", selectedTag);
      fd.append("category", tagMeta(selectedTag)?.label ?? "ID Document");
      if (notes) fd.append("notes", notes);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }

      const data = await res.json();
      setDocs(prev => [data.document, ...prev]);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleView(doc: IDDocument) {
    setViewDoc(doc);
    setViewUrl(null);
    try {
      const res = await fetch(`/api/documents/thumbnail?path=${encodeURIComponent(doc.storage_path)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) setViewUrl(data.url);
    } catch {
      // Fallback to download
    }
  }

  async function handleDownload(doc: IDDocument) {
    const res = await fetch(`/api/documents/download?path=${encodeURIComponent(doc.storage_path)}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (data.url) {
      const a = document.createElement("a");
      a.href = data.url;
      a.download = doc.file_name;
      a.target = "_blank";
      a.click();
    }
  }

  async function handleDelete(doc: IDDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: doc.id, storage_path: doc.storage_path }),
    });
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  const inputClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <span>🪪</span> Photos &amp; ID Documents
        </h2>

        {/* Tag selector + notes + upload button */}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Document Type</label>
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value as TagValue)}
              className={inputClass}
            >
              {TAG_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Front of license"
              className={inputClass + " w-full"}
            />
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
          >
            {uploading ? "⏳ Uploading…" : "📤 Upload"}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Tag filter pills */}
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.filter(t => docs.some(d => d.tag === t.value)).map(t => (
              <span key={t.value} className={`text-xs font-medium px-2.5 py-1 rounded-full bg-${t.color}-100 text-${t.color}-700`}>
                {t.icon} {t.label} ({docs.filter(d => d.tag === t.value).length})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid of tagged documents */}
      {docs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {docs.map(doc => (
            <div key={doc.id} className="relative">
              <PhotoThumbnail doc={doc} onClick={() => handleView(doc)} />
              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); handleDownload(doc); }}
                  title="Download"
                  className="bg-white/90 text-teal-600 border border-teal-200 px-1.5 py-0.5 rounded-lg text-xs font-medium hover:bg-teal-50 shadow-sm"
                >↓</button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(doc); }}
                  title="Delete"
                  className="bg-white/90 text-red-400 border border-red-100 px-1.5 py-0.5 rounded-lg text-xs font-medium hover:bg-red-50 shadow-sm"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="text-3xl mb-2">🪪</div>
          No photos or ID documents uploaded yet
        </div>
      )}

      {/* Lightbox viewer */}
      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) { setViewDoc(null); setViewUrl(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tagMeta(viewDoc.tag).icon}</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{viewDoc.file_name}</p>
                  <p className="text-xs text-slate-400">{tagMeta(viewDoc.tag).label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewDoc)}
                  className="text-xs text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 font-medium"
                >
                  ↓ Download
                </button>
                <button
                  onClick={() => { setViewDoc(null); setViewUrl(null); }}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg hover:bg-slate-100"
                >×</button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5 flex items-center justify-center bg-slate-50">
              {viewUrl ? (
                <img
                  src={viewUrl}
                  alt={viewDoc.file_name}
                  className="max-w-full max-h-[60vh] rounded-xl object-contain shadow-md"
                />
              ) : viewDoc.file_type === "application/pdf" ? (
                <div className="text-center space-y-3 py-8">
                  <div className="text-5xl">📄</div>
                  <p className="text-sm text-slate-600">PDF document</p>
                  <button onClick={() => handleDownload(viewDoc)} className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                    Download to view
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center text-3xl py-8">⏳</div>
              )}
            </div>

            {/* Notes */}
            {viewDoc.notes && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500"><span className="font-semibold">Notes:</span> {viewDoc.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
