"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ROIDocumentUpload({ roiId, orgId }: { roiId: string; orgId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
    if (!allowed.includes(file.type)) { setError("PDF, JPG, PNG, or HEIC files only"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10MB"); return; }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", "roi");
      formData.append("entity_id", roiId);
      formData.append("org_id", orgId);
      formData.append("document_type", "signed_roi");
      formData.append("label", `Signed ROI — ${file.name}`);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      setUploaded(prev => [...prev, file.name]);
      router.refresh();
    } catch {
      setError("Upload failed — try again");
    }
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attach Signed Copy</div>
      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-6 py-6 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50"}`}>
        <span className="text-2xl">{uploading ? "⏳" : "📎"}</span>
        <span className="text-sm font-medium text-slate-700">{uploading ? "Uploading..." : "Click to upload signed ROI"}</span>
        <span className="text-xs text-slate-400">PDF, JPG, or PNG · Max 10MB</span>
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {uploaded.map(name => (
        <div key={name} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800">
          <span>✓</span><span className="font-medium">{name}</span><span className="text-emerald-500 text-xs">uploaded</span>
        </div>
      ))}
      <p className="text-xs text-slate-400">Upload a scan or photo of the patient-signed ROI form for your records.</p>
    </div>
  );
}
