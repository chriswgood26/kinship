"use client";

import { useState } from "react";
import DocumentScanner from "./DocumentScanner";

interface IDFields {
  firstName: string;
  lastName: string;
  dob: string;
  address: string;
  idNumber: string;
  state: string;
  gender: string;
}

interface Props {
  clientId: string;
  onExtracted?: (fields: Partial<IDFields>) => void;
  onClose: () => void;
}

export default function IDCardCapture({ clientId, onExtracted, onClose }: Props) {
  const [phase, setPhase] = useState<"scanner" | "processing" | "review" | "done">("scanner");
  const [preview, setPreview] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<IDFields>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function handleCapture(file: File, previewUrl: string) {
    setPreview(previewUrl);
    setPhase("processing");
    setError("");

    try {
      // Upload the ID card image
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patient_id", clientId);
      fd.append("category", "General");
      fd.append("notes", "Government-issued ID — captured via scanner");

      const uploadRes = await fetch("/api/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const documentId = uploadData.document?.id;

      // Run OCR
      const ocrRes = await fetch("/api/documents/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId, cardType: "id" }),
      });
      const ocrData = await ocrRes.json();

      if (ocrData.note) setNote(ocrData.note);
      if (ocrData.extractedFields) setFields(ocrData.extractedFields);

      setPhase("review");
    } catch {
      setError("Failed to process the ID card. Please try again.");
      setPhase("scanner");
    }
  }

  function handleConfirm() {
    if (onExtracted) onExtracted(fields);
    setPhase("done");
  }

  if (phase === "scanner") {
    return (
      <DocumentScanner
        title="Scan Government ID"
        hint="Capture the front of the driver's license or state ID. Ensure the card is well-lit and all text is legible."
        onCapture={handleCapture}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪪</span>
            <span className="font-semibold text-slate-900 text-sm">ID Card Capture</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg hover:bg-slate-100">×</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {phase === "processing" && (
            <div className="text-center py-8 space-y-3">
              {preview && (
                <img src={preview} alt="ID card" className="w-full max-h-40 object-contain rounded-xl bg-slate-100 mx-auto" />
              )}
              <div className="animate-spin text-3xl">⏳</div>
              <p className="text-sm text-slate-600 font-medium">Processing ID card…</p>
              <p className="text-xs text-slate-400">Uploading and extracting patient information</p>
            </div>
          )}

          {phase === "review" && (
            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="ID card" className="w-full max-h-36 object-contain rounded-xl bg-slate-100" />
              )}

              {note && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> {note}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Extracted Fields — Review & Edit</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="First Name" value={fields.firstName || ""} onChange={v => setFields(f => ({ ...f, firstName: v }))} />
                    <FieldInput label="Last Name" value={fields.lastName || ""} onChange={v => setFields(f => ({ ...f, lastName: v }))} />
                  </div>
                  <FieldInput label="Date of Birth" value={fields.dob || ""} onChange={v => setFields(f => ({ ...f, dob: v }))} placeholder="YYYY-MM-DD" />
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Gender" value={fields.gender || ""} onChange={v => setFields(f => ({ ...f, gender: v }))} />
                    <FieldInput label="State" value={fields.state || ""} onChange={v => setFields(f => ({ ...f, state: v }))} />
                  </div>
                  <FieldInput label="Address" value={fields.address || ""} onChange={v => setFields(f => ({ ...f, address: v }))} />
                  <FieldInput label="ID / License Number" value={fields.idNumber || ""} onChange={v => setFields(f => ({ ...f, idNumber: v }))} />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setPhase("scanner")}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  ↺ Re-scan
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-2.5 rounded-xl text-sm font-semibold"
                >
                  ✓ Apply to Record
                </button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl">✅</div>
              <p className="font-semibold text-slate-900">ID information captured!</p>
              <p className="text-sm text-slate-500">The ID image has been saved to the client&apos;s documents and the extracted data has been applied to the record.</p>
              <button onClick={onClose} className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
