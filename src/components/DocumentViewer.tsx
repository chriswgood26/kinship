"use client";

import { useEffect, useState } from "react";

interface Props {
  document: {
    id: string;
    file_name: string;
    file_type: string | null;
    storage_path: string;
  } | null;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!document) return;
    setLoading(true);
    setError("");
    fetch(`/api/documents/download?path=${encodeURIComponent(document.storage_path)}`, {
      credentials: "include",
    })
      .then(r => r.json())
      .then(d => {
        if (d.url) setUrl(d.url);
        else setError("Could not load preview");
      })
      .catch(() => setError("Failed to load document"))
      .finally(() => setLoading(false));
  }, [document]);

  if (!document) return null;

  const isImage = document.file_type?.startsWith("image/");
  const isPDF = document.file_type === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">
              {isImage ? "🖼️" : isPDF ? "📄" : "📎"}
            </span>
            <span className="font-semibold text-slate-900 truncate text-sm">{document.file_name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50"
              >
                ↗ Open
              </a>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 font-bold text-xl leading-none px-2 py-1 rounded-lg hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-0">
          {loading && (
            <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="animate-spin text-2xl">⏳</div>
              Loading preview…
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center p-6">
              <div className="text-3xl mb-2">⚠️</div>
              {error}
            </div>
          )}
          {!loading && !error && url && isImage && (
            <img
              src={url}
              alt={document.file_name}
              className="max-w-full max-h-full object-contain p-4"
            />
          )}
          {!loading && !error && url && isPDF && (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full min-h-[60vh]"
              title={document.file_name}
            />
          )}
          {!loading && !error && url && !isImage && !isPDF && (
            <div className="text-center p-8 text-slate-500">
              <div className="text-5xl mb-4">📎</div>
              <p className="font-medium text-slate-700 mb-1">{document.file_name}</p>
              <p className="text-sm text-slate-400 mb-4">Preview not available for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
