"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  clientId: string;
  firstName?: string;
  lastName?: string;
  /** Size in pixels for the avatar circle */
  size?: number;
}

export default function PatientPhotoUpload({ clientId, firstName, lastName, size = 56 }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhoto();
  }, [clientId]);

  async function loadPhoto() {
    try {
      const res = await fetch(`/api/documents?patient_id=${clientId}&tag=patient_photo`, {
        credentials: "include",
      });
      const data = await res.json();
      const photos: Array<{ storage_path: string }> = data.documents || [];
      if (photos.length === 0) return;
      // Use the most recent photo
      const latest = photos[0];
      const thumbRes = await fetch(
        `/api/documents/thumbnail?path=${encodeURIComponent(latest.storage_path)}`,
        { credentials: "include" }
      );
      const thumbData = await thumbRes.json();
      if (thumbData.url) setPhotoUrl(thumbData.url);
    } catch {
      // fail silently — show initials fallback
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed for patient photos.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patient_id", clientId);
      fd.append("category", "Patient Photo");
      fd.append("tag", "patient_photo");
      fd.append("notes", "Patient profile photo");

      const res = await fetch("/api/documents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }

      // Reload the photo
      await loadPhoto();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative group flex-shrink-0" style={{ width: size, height: size }}>
      {/* Avatar */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-teal-100 text-teal-700 font-bold select-none border-2 border-transparent group-hover:border-teal-300 transition-all"
        style={{ fontSize: size * 0.32 }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${firstName} ${lastName}`}
            className="w-full h-full object-cover"
            onError={() => setPhotoUrl(null)}
          />
        ) : uploading ? (
          <span className="animate-spin text-base">⏳</span>
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Upload overlay — shown on hover */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        title="Upload patient photo"
      >
        <span className="text-white text-base">📷</span>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error tooltip */}
      {error && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-red-600 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-20 shadow-lg">
          {error}
          <button onClick={() => setError("")} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
