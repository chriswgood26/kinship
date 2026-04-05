"use client";

import { useState } from "react";
import DocumentScanner from "./DocumentScanner";

interface InsuranceFields {
  provider: string;
  memberId: string;
  groupNumber: string;
  planName: string;
  rxBin: string;
  subscriberName: string;
  copay: string;
  effectiveDate: string;
}

interface Props {
  clientId: string;
  onExtracted?: (fields: Partial<InsuranceFields>) => void;
  onClose: () => void;
}

// Map OCR-extracted insurance fields to client database columns (primary insurance)
function buildClientPatch(fields: Partial<InsuranceFields>): Record<string, string | number | null> {
  const patch: Record<string, string | number | null> = {};
  if (fields.provider !== undefined) patch.insurance_provider = fields.provider || null;
  if (fields.memberId !== undefined) patch.insurance_member_id = fields.memberId || null;
  if (fields.groupNumber !== undefined) patch.insurance_group_number = fields.groupNumber || null;
  if (fields.planName !== undefined) patch.insurance_plan_name = fields.planName || null;
  if (fields.rxBin !== undefined) patch.insurance_rx_bin = fields.rxBin || null;
  if (fields.subscriberName !== undefined) patch.insurance_subscriber_name = fields.subscriberName || null;
  if (fields.copay !== undefined) {
    // Strip currency symbols and parse as number
    const raw = (fields.copay || "").replace(/[$,\s]/g, "");
    const num = parseFloat(raw);
    patch.insurance_copay = isNaN(num) ? null : num;
  }
  if (fields.effectiveDate !== undefined) {
    // Normalize date string to YYYY-MM-DD for Postgres date column
    const raw = fields.effectiveDate || "";
    let normalized: string | null = null;
    if (raw) {
      const parts = raw.split(/[\/\-]/);
      if (parts.length === 3) {
        const [a, b, c] = parts;
        if (c.length === 4) {
          // MM/DD/YYYY → YYYY-MM-DD
          normalized = `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
        } else if (a.length === 4) {
          // Already YYYY-MM-DD
          normalized = raw;
        }
      }
    }
    patch.insurance_effective_date = normalized;
  }
  return patch;
}

export default function InsuranceCardCapture({ clientId, onExtracted, onClose }: Props) {
  const [phase, setPhase] = useState<"scanner" | "processing" | "review" | "saving" | "done">("scanner");
  const [preview, setPreview] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<InsuranceFields>>({});
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function handleCapture(file: File, previewUrl: string) {
    setPreview(previewUrl);
    setPhase("processing");
    setError("");

    try {
      // Upload the insurance card image
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patient_id", clientId);
      fd.append("category", "Insurance");
      fd.append("notes", "Insurance card — captured via scanner");

      const uploadRes = await fetch("/api/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const documentId = uploadData.document?.id;
      setDocId(documentId);

      // Run OCR
      const ocrRes = await fetch("/api/documents/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId, cardType: "insurance" }),
      });
      const ocrData = await ocrRes.json();

      if (ocrData.note) setNote(ocrData.note);
      if (ocrData.extractedFields) setFields(ocrData.extractedFields);

      setPhase("review");
    } catch {
      setError("Failed to process the insurance card. Please try again.");
      setPhase("scanner");
    }
  }

  async function handleConfirm() {
    setPhase("saving");
    setError("");
    try {
      const patch = buildClientPatch(fields);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save insurance data");
      }
      if (onExtracted) onExtracted(fields);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setPhase("review");
    }
  }

  if (phase === "scanner") {
    return (
      <DocumentScanner
        title="Capture Insurance Card"
        hint="Place the insurance card flat and ensure all text is visible. Front of card preferred."
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
            <span className="text-xl">🏥</span>
            <span className="font-semibold text-slate-900 text-sm">Insurance Card Capture</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg hover:bg-slate-100">×</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {(phase === "processing" || phase === "saving") && (
            <div className="text-center py-8 space-y-3">
              {preview && (
                <img src={preview} alt="Insurance card" className="w-full max-h-40 object-contain rounded-xl bg-slate-100 mx-auto" />
              )}
              <div className="animate-spin text-3xl">⏳</div>
              {phase === "processing" ? (
                <>
                  <p className="text-sm text-slate-600 font-medium">Processing insurance card…</p>
                  <p className="text-xs text-slate-400">Uploading and running OCR extraction</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 font-medium">Saving insurance data…</p>
                  <p className="text-xs text-slate-400">Updating client record with extracted fields</p>
                </>
              )}
            </div>
          )}

          {phase === "review" && (
            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="Insurance card" className="w-full max-h-36 object-contain rounded-xl bg-slate-100" />
              )}

              {note && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> {note}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Extracted Fields — Review & Edit</p>
                <div className="space-y-3">
                  <FieldInput label="Insurance Provider" value={fields.provider || ""} onChange={v => setFields(f => ({ ...f, provider: v }))} />
                  <FieldInput label="Member ID" value={fields.memberId || ""} onChange={v => setFields(f => ({ ...f, memberId: v }))} />
                  <FieldInput label="Group Number" value={fields.groupNumber || ""} onChange={v => setFields(f => ({ ...f, groupNumber: v }))} />
                  <FieldInput label="Plan Name" value={fields.planName || ""} onChange={v => setFields(f => ({ ...f, planName: v }))} />
                  <FieldInput label="Subscriber Name" value={fields.subscriberName || ""} onChange={v => setFields(f => ({ ...f, subscriberName: v }))} />
                  <FieldInput label="Copay" value={fields.copay || ""} onChange={v => setFields(f => ({ ...f, copay: v }))} />
                  <FieldInput label="RxBIN (Pharmacy)" value={fields.rxBin || ""} onChange={v => setFields(f => ({ ...f, rxBin: v }))} />
                  <FieldInput label="Effective Date" value={fields.effectiveDate || ""} onChange={v => setFields(f => ({ ...f, effectiveDate: v }))} />
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
              <p className="font-semibold text-slate-900">Insurance information captured!</p>
              <p className="text-sm text-slate-500">The card image has been saved to the client&apos;s documents and the extracted data has been applied.</p>
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

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
