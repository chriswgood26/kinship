"use client";

import { useRef, useState, useCallback } from "react";

interface ScannedFile {
  file: File;
  preview: string;
}

interface Props {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
}

export default function DocumentScanner({ onCapture, onClose, title = "Scan Document", hint }: Props) {
  const [scanned, setScanned] = useState<ScannedFile | null>(null);
  const [mode, setMode] = useState<"choose" | "camera" | "review">("choose");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  async function startCamera() {
    setCameraError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      setMode("camera");
      // Attach stream after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setCameraError("Camera access denied or unavailable. Use the file upload option instead.");
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      const preview = canvas.toDataURL("image/jpeg", 0.9);
      stopCamera();
      setScanned({ file, preview });
      setMode("review");
    }, "image/jpeg", 0.9);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const preview = ev.target?.result as string;
      setScanned({ file, preview });
      setMode("review");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function confirmCapture() {
    if (!scanned) return;
    onCapture(scanned.file, scanned.preview);
    stopCamera();
  }

  function retake() {
    setScanned(null);
    setMode("choose");
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <span className="font-semibold text-slate-900 text-sm">{title}</span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-1 rounded-lg hover:bg-slate-100">×</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {hint && <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">{hint}</p>}

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={startCamera}
                className="w-full flex items-center gap-3 bg-teal-500 hover:bg-teal-400 text-white px-5 py-4 rounded-xl font-semibold text-sm transition-colors"
              >
                <span className="text-2xl">📷</span>
                <div className="text-left">
                  <div>Use Camera</div>
                  <div className="text-xs font-normal opacity-80">Capture using your webcam or phone camera</div>
                </div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-4 rounded-xl font-semibold text-sm transition-colors"
              >
                <span className="text-2xl">📁</span>
                <div className="text-left">
                  <div>Upload File</div>
                  <div className="text-xs font-normal text-slate-500">Select an existing photo or PDF</div>
                </div>
              </button>
              {/* Mobile camera capture */}
              <label className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-5 py-4 rounded-xl font-semibold text-sm transition-colors cursor-pointer">
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div>Take Photo (Mobile)</div>
                  <div className="text-xs font-normal text-slate-500">Opens camera directly on mobile devices</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              {cameraError && <p className="text-xs text-red-500 text-center">{cameraError}</p>}
            </div>
          )}

          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/50 rounded-xl" />
                  <div className="absolute bottom-3 left-0 right-0 text-center text-white text-xs opacity-70">
                    Position document within the frame
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={capturePhoto}
                className="w-full bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-xl font-semibold text-sm"
              >
                📸 Capture
              </button>
              <button
                onClick={() => { stopCamera(); setMode("choose"); }}
                className="w-full text-slate-500 hover:text-slate-700 text-sm"
              >
                ← Back
              </button>
            </div>
          )}

          {mode === "review" && scanned && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
              <img
                src={scanned.preview}
                alt="Scanned document"
                className="w-full rounded-xl object-contain max-h-64 bg-slate-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={retake}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50"
                >
                  ↺ Retake
                </button>
                <button
                  onClick={confirmCapture}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-2.5 rounded-xl text-sm font-semibold"
                >
                  ✓ Use This Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input for upload option */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
}
