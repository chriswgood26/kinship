"use client";

interface Document { id: string; file_name: string; file_size: number | null; file_type: string | null; category: string; storage_path: string; created_at: string; notes: string | null; }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICON: Record<string, string> = {
  "application/pdf": "📄", "image/jpeg": "🖼️", "image/png": "🖼️",
  "application/msword": "📝", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
};

export default function PortalDocumentsClient({ documents }: { documents: Document[] }) {
  async function handleDownload(doc: Document) {
    const res = await fetch(`/api/documents/download?path=${encodeURIComponent(doc.storage_path)}`, { credentials: "include" });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  if (!documents.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-3">📄</div>
        <p className="font-semibold text-slate-900 mb-1">No documents yet</p>
        <p className="text-slate-500 text-sm">Your care team will share documents here when available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="divide-y divide-slate-50">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-3xl flex-shrink-0">{FILE_ICON[doc.file_type || ""] || "📄"}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">{doc.file_name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">{doc.category}</span>
                {doc.file_size && <span className="text-xs text-slate-400">{formatBytes(doc.file_size)}</span>}
                <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {doc.notes && <div className="text-xs text-slate-500 mt-0.5">{doc.notes}</div>}
            </div>
            <button onClick={() => handleDownload(doc)}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 flex-shrink-0">
              ↓ Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
