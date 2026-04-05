"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DocumentUploader from "@/components/DocumentUploader";

const InsuranceCardCapture = dynamic(() => import("@/components/InsuranceCardCapture"), { ssr: false });
const IDCardCapture = dynamic(() => import("@/components/IDCardCapture"), { ssr: false });

interface Props {
  clientId: string;
}

export default function ClientDocumentsTab({ clientId }: Props) {
  const [showInsuranceCapture, setShowInsuranceCapture] = useState(false);
  const [showIDCapture, setShowIDCapture] = useState(false);
  const [capturedInsurance, setCapturedInsurance] = useState<Record<string, string> | null>(null);
  const [capturedID, setCapturedID] = useState<Record<string, string> | null>(null);

  function handleInsuranceExtracted(fields: Record<string, string>) {
    setCapturedInsurance(fields);
    setShowInsuranceCapture(false);
  }

  function handleIDExtracted(fields: Record<string, string>) {
    setCapturedID(fields);
    setShowIDCapture(false);
  }

  return (
    <div className="space-y-5">
      {/* Quick capture cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowInsuranceCapture(true)}
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 hover:border-teal-200 transition-colors text-left group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            🏥
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900">Insurance Card</div>
            <div className="text-xs text-slate-500 mt-0.5">Scan &amp; extract insurance info</div>
          </div>
        </button>

        <button
          onClick={() => setShowIDCapture(true)}
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 hover:border-teal-200 transition-colors text-left group"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
            🪪
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900">Government ID</div>
            <div className="text-xs text-slate-500 mt-0.5">Scan driver&apos;s license or state ID</div>
          </div>
        </button>
      </div>

      {/* Captured data previews */}
      {capturedInsurance && Object.values(capturedInsurance).some(Boolean) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
              <span>🏥</span> Captured Insurance Data
            </h3>
            <button onClick={() => setCapturedInsurance(null)} className="text-blue-400 hover:text-blue-600 text-xs">✕ Clear</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(capturedInsurance).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-blue-500 font-medium capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
                <dd className="text-sm text-blue-900 font-semibold">{v}</dd>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600">Review the data above and update the client&apos;s insurance fields in their profile if needed.</p>
        </div>
      )}

      {capturedID && Object.values(capturedID).some(Boolean) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
              <span>🪪</span> Captured ID Data
            </h3>
            <button onClick={() => setCapturedID(null)} className="text-emerald-400 hover:text-emerald-600 text-xs">✕ Clear</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(capturedID).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-emerald-500 font-medium capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
                <dd className="text-sm text-emerald-900 font-semibold">{v}</dd>
              </div>
            ))}
          </div>
          <p className="text-xs text-emerald-600">Review the data above and update the client&apos;s demographics if needed.</p>
        </div>
      )}

      {/* Main document uploader */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span>📁</span> Documents
        </h2>
        <DocumentUploader patientId={clientId} showScanner={true} />
      </div>

      {/* Modals */}
      {showInsuranceCapture && (
        <InsuranceCardCapture
          clientId={clientId}
          onExtracted={handleInsuranceExtracted}
          onClose={() => setShowInsuranceCapture(false)}
        />
      )}

      {showIDCapture && (
        <IDCardCapture
          clientId={clientId}
          onExtracted={handleIDExtracted}
          onClose={() => setShowIDCapture(false)}
        />
      )}
    </div>
  );
}
