"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const DocumentViewer = dynamic(() => import("./DocumentViewer"), { ssr: false });
const DocumentScanner = dynamic(() => import("./DocumentScanner"), { ssr: false });

interface OcrData {
  rawText?: string;
  cardType?: string;
  extractedFields?: Record<string, string>;
  processedAt?: string;
  engine?: string;
  error?: string;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  notes: string | null;
  storage_path: string;
  created_at: string;
  ocr_data?: OcrData | null;
}

interface Props {
  patientId?: string;
  referralId?: string;
  userProfileId?: string;
  categories?: string[];
  showScanner?: boolean;
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
  "image/webp": "🖼️",
  "image/gif": "🖼️",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "text/plain": "📃",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

function isPDFType(mimeType: string | null) {
  return mimeType === "application/pdf";
}

function isPreviewable(mimeType: string | null) {
  return isImageType(mimeType) || isPDFType(mimeType);
}

// Thumbnail component that lazily loads a signed URL
function DocumentThumbnail({ doc }: { doc: Document }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isImageType(doc.file_type)) return;
    setLoading(true);
    fetch(`/api/documents/thumbnail?path=${encodeURIComponent(doc.storage_path)}`, {
      credentials: "include",
    })
      .then(r => r.json())
      .then(d => { if (d.url) setThumbUrl(d.url); })
      .catch(() => {/* fail silently */})
      .finally(() => setLoading(false));
  }, [doc.storage_path, doc.file_type]);

  if (!isImageType(doc.file_type)) return null;

  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
      {loading && <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">…</div>}
      {thumbUrl && !loading && (
        <img
          src={thumbUrl}
          alt={doc.file_name}
          className="w-full h-full object-cover"
          onError={() => setThumbUrl(null)}
        />
      )}
      {!thumbUrl && !loading && (
        <div className="w-full h-full flex items-center justify-center text-xl">🖼️</div>
      )}
    </div>
  );
}

export default function DocumentUploader({ patientId, referralId, userProfileId, categories, showScanner = false }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const effectiveCategories = categories || (userProfileId ? STAFF_CATEGORIES : DEFAULT_CATEGORIES);
  const [category, setCategory] = useState(effectiveCategories[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [ocrDoc, setOcrDoc] = useState<Document | null>(null);
  const [ocrRunning, setOcrRunning] = useState<string | null>(null); // doc id being processed
  const [ocrResult, setOcrResult] = useState<{ text: string; note?: string; error?: string } | null>(null);
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
    if (data.url) {
      const a = document.createElement("a");
      a.href = data.url;
      a.download = doc.file_name;
      a.target = "_blank";
      a.click();
    }
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

  async function handleScanCapture(file: File) {
    setShowScannerModal(false);
    await uploadFile(file);
  }

  async function handleOcr(doc: Document) {
    setOcrDoc(doc);
    setOcrResult(null);
    // If we already have OCR data cached, show it immediately
    if (doc.ocr_data?.rawText) {
      setOcrResult({ text: doc.ocr_data.rawText });
      return;
    }
    setOcrRunning(doc.id);
    try {
      const res = await fetch("/api/documents/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId: doc.id, cardType: "general" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOcrResult({ text: "", error: data.error || "OCR failed" });
      } else {
        setOcrResult({
          text: data.rawText || "",
          note: data.note,
          error: data.ocrError,
        });
        // Update local document list with new ocr_data
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, ocr_data: { rawText: data.rawText, processedAt: new Date().toISOString() } }
              : d
          )
        );
      }
    } catch {
      setOcrResult({ text: "", error: "Request failed" });
    } finally {
      setOcrRunning(null);
    }
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
      <div className="flex gap-2 items-center flex-wrap">
        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
          {effectiveCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)" className={inputClass + " flex-1 min-w-0"} />
        {showScanner && (
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex-shrink-0"
            title="Scan document with camera"
          >
            📷 Scan
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {uploading && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 flex items-center gap-2">
          <span className="animate-spin">⏳</span> Uploading…
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              {/* Thumbnail for images, icon for others */}
              {isImageType(doc.file_type) ? (
                <DocumentThumbnail doc={doc} />
              ) : (
                <span className="text-2xl flex-shrink-0 w-12 flex items-center justify-center">
                  {FILE_ICON[doc.file_type || ""] || "📄"}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 truncate">{doc.file_name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">{doc.category}</span>
                  {doc.file_size && <span className="text-xs text-slate-400">{formatBytes(doc.file_size)}</span>}
                  <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  {doc.notes && <span className="text-xs text-slate-500 truncate max-w-[120px]">{doc.notes}</span>}
                </div>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                {isPreviewable(doc.file_type) && (
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="text-xs text-slate-500 hover:text-teal-600 font-medium border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100"
                    title="Preview"
                  >
                    👁
                  </button>
                )}
                {isPreviewable(doc.file_type) && (
                  <button
                    onClick={() => handleOcr(doc)}
                    disabled={ocrRunning === doc.id}
                    className="text-xs text-slate-500 hover:text-purple-600 font-medium border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                    title={doc.ocr_data?.rawText ? "View extracted text" : "Extract text (OCR)"}
                  >
                    {ocrRunning === doc.id ? "⏳" : doc.ocr_data?.rawText ? "📋" : "🔍"}
                  </button>
                )}
                <button onClick={() => handleDownload(doc)}
                  title="Download"
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50">
                  ↓
                </button>
                <button onClick={() => handleDelete(doc)}
                  title="Delete"
                  className="text-xs text-red-400 hover:text-red-600 font-medium border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p className="text-xs text-slate-400 text-center py-2">No documents yet</p>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <DocumentViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}

      {/* Scanner modal */}
      {showScannerModal && (
        <DocumentScanner
          title="Scan Document"
          onCapture={handleScanCapture}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* OCR result modal */}
      {ocrDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) { setOcrDoc(null); setOcrResult(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Extracted Text (OCR)</p>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">{ocrDoc.file_name}</p>
                </div>
              </div>
              <button
                onClick={() => { setOcrDoc(null); setOcrResult(null); }}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg hover:bg-slate-100"
              >×</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {!ocrResult && (
                <div className="text-center py-8 space-y-3">
                  <div className="animate-spin text-3xl">⏳</div>
                  <p className="text-sm text-slate-600">Extracting text…</p>
                </div>
              )}
              {ocrResult && ocrResult.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> {ocrResult.note}
                </div>
              )}
              {ocrResult && ocrResult.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                  <span className="font-semibold">Error:</span> {ocrResult.error}
                </div>
              )}
              {ocrResult && (
                <div>
                  {ocrResult.text ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extracted Content</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(ocrResult.text)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-2 py-1 rounded-lg hover:bg-teal-50"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                        {ocrResult.text}
                      </pre>
                    </>
                  ) : (
                    !ocrResult.error && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No text could be extracted from this document.
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
