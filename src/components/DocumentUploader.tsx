"use client";

import { useState, useEffect, useRef } from "react";

interface Document {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  notes: string | null;
  storage_path: string;
  created_at: string;
}

interface Props {
  patientId?: string;
  referralId?: string;
  userProfileId?: string;
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  "General", "Referral", "Authorization", "Assessment", "Treatment Plan",
  "Progress Notes", "Discharge", "Insurance", "Consent", "Lab Results", "Other"
];

const STAFF_CATEGORIES = [
  "License / Credential", "NPI Certificate", "DEA Registration", "Background Check",
  "Training Certificate", "CPR / First Aid", "Annual Training", "TB Test",
  "Offer Letter", "I-9 / Work Authorization", "Performance Review", "Other HR"
];

const FILE_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "image/jpeg": "🖼️",
  "image/png": "🖼️",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "text/plain": "📃",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploader({ patientId, referralId, userProfileId, categories }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const effectiveCategories = categories || (userProfileId ? STAFF_CATEGORIES : DEFAULT_CATEGORIES);
  const [category, setCategory] = useState(effectiveCategories[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    const params = new URLSearchParams();
    if (patientId) params.set("patient_id", patientId);
    if (referralId) params.set("referral_id", referralId);
    if (userProfileId) params.set("user_profile_id", userProfileId);
    const res = await fetch(`/api/documents?${params}`, { credentials: "include" });
    const data = await res.json();
    setDocuments(data.documents || []);
  }

  async function uploadFile(file: File) {
    if (file.size > 25 * 1024 * 1024) { setError("File too large — max 25MB"); return; }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    if (patientId) fd.append("patient_id", patientId);
    if (referralId) fd.append("referral_id", referralId);
    if (userProfileId) fd.append("user_profile_id", userProfileId);
    fd.append("category", category);
    fd.append("notes", notes);
    const res = await fetch("/api/documents", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Upload failed"); setUploading(false); return; }
    setDocuments(prev => [data.document, ...prev]);
    setNotes("");
    setUploading(false);
  }

  async function handleDownload(doc: Document) {
    const res = await fetch(`/api/documents/download?path=${encodeURIComponent(doc.storage_path)}`, { credentials: "include" });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: doc.id, storage_path: doc.storage_path }),
    });
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  const inputClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${dragOver ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
        <div className="text-3xl mb-2">📎</div>
        <p className="text-sm font-medium text-slate-700">Drop a file here or{" "}
          <button type="button" onClick={() => fileRef.current?.click()} className="text-teal-600 hover:text-teal-700 font-semibold">browse</button>
        </p>
        <p className="text-xs text-slate-400 mt-1">PDF, Word, images — max 25MB</p>
        <input ref={fileRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
          onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
      </div>

      {/* Upload options */}
      <div className="flex gap-2 items-center">
        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
          {effectiveCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)" className={inputClass + " flex-1"} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {uploading && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 flex items-center gap-2">
          <span className="animate-spin">⏳</span> Uploading...
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <span className="text-2xl flex-shrink-0">{FILE_ICON[doc.file_type || ""] || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 truncate">{doc.file_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">{doc.category}</span>
                  {doc.file_size && <span className="text-xs text-slate-400">{formatBytes(doc.file_size)}</span>}
                  <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  {doc.notes && <span className="text-xs text-slate-500 truncate">{doc.notes}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleDownload(doc)}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50">
                  ↓ Download
                </button>
                <button onClick={() => handleDelete(doc)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p className="text-xs text-slate-400 text-center py-2">No documents yet</p>
      )}
    </div>
  );
}
