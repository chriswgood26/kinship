"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignaturePad({ roiId }: { roiId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0d1b2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasSignature(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() { setDrawing(false); }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    setSaving(true);
    const signatureData = canvas.toDataURL("image/png");
    const res = await fetch(`/api/roi/${roiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patient_signed_at: new Date().toISOString(),
        status: "active",
        patient_signature_method: "electronic",
        signature_data: signatureData,
      }),
    });
    setSaving(false);
    if (res.ok) { setDone(true); router.refresh(); }
  }

  if (done) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
      <div className="text-2xl mb-2">✅</div>
      <div className="font-semibold text-emerald-800">Signature captured — ROI is now Active</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient Electronic Signature</div>
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <div className="absolute bottom-2 left-4 text-xs text-slate-300 pointer-events-none select-none">Sign here</div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-100 mx-4" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear}
          className="flex-1 border border-slate-200 text-slate-500 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
          Clear
        </button>
        <button type="button" onClick={saveSignature} disabled={!hasSignature || saving}
          className="flex-2 bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
          {saving ? "Saving..." : "✓ Capture Signature & Activate ROI"}
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center">Patient signs above using mouse or finger. This constitutes a legally binding electronic signature.</p>
    </div>
  );
}
