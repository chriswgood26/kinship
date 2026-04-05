import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, ensureBucket } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");
  const referralId = searchParams.get("referral_id");
  const userProfileId = searchParams.get("user_profile_id");
  const tag = searchParams.get("tag");
  let query = supabaseAdmin.from("documents").select("*").order("created_at", { ascending: false });
  if (patientId) query = query.eq("client_id", patientId);
  if (referralId) query = query.eq("referral_id", referralId);
  if (userProfileId) query = query.eq("user_profile_id", userProfileId);
  if (tag) query = query.eq("tag", tag);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const patientId = formData.get("patient_id") as string | null;
  const referralId = formData.get("referral_id") as string | null;
  const userProfileId = formData.get("user_profile_id") as string | null;
  const category = formData.get("category") as string || "general";
  const notes = formData.get("notes") as string || "";
  const tag = formData.get("tag") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Server-side file type validation via magic bytes
  const ALLOWED_TYPES: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG image",
    "image/png": "PNG image",
    "image/gif": "GIF image",
    "image/webp": "WebP image",
    "application/msword": "Word document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word document",
    "text/plain": "Text file",
  };

  const MAGIC_BYTES: Array<{ bytes: number[]; mime: string }> = [
    { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" }, // %PDF
    { bytes: [0xFF, 0xD8, 0xFF], mime: "image/jpeg" },            // JPEG
    { bytes: [0x89, 0x50, 0x4E, 0x47], mime: "image/png" },       // PNG
    { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },       // GIF
    { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },      // RIFF (WebP)
    { bytes: [0xD0, 0xCF, 0x11, 0xE0], mime: "application/msword" }, // DOC
    { bytes: [0x50, 0x4B, 0x03, 0x04], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, // DOCX (ZIP)
  ];

  // Read first 8 bytes and check magic bytes
  const buffer = await file.arrayBuffer();
  const firstBytes = Array.from(new Uint8Array(buffer.slice(0, 8)));
  
  const detectedType = MAGIC_BYTES.find(m =>
    m.bytes.every((byte, i) => firstBytes[i] === byte)
  )?.mime;

  // Fall back to declared MIME if magic bytes don't match (text files have no magic bytes)
  const effectiveMime = detectedType || (file.type === "text/plain" ? "text/plain" : null);

  if (!effectiveMime || !ALLOWED_TYPES[effectiveMime]) {
    return NextResponse.json({
      error: `File type not allowed. Accepted types: PDF, JPEG, PNG, GIF, WebP, Word documents, plain text. Detected: ${file.type || "unknown"}`
    }, { status: 400 });
  }

  // File size check (25MB server-side)
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum size is 25MB." }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();

  const ext = file.name.split(".").pop();
  const storagePath = `${profile?.organization_id || "default"}/${patientId || referralId || userProfileId || "misc"}/${Date.now()}-${file.name}`;

  await ensureBucket("documents");

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("documents")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await supabaseAdmin.from("documents").insert({
    organization_id: profile?.organization_id || null,
    client_id: patientId || null,
    referral_id: referralId || null,
    user_profile_id: userProfileId || null,
    uploaded_by: userId,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    storage_path: storagePath,
    category,
    notes: notes || null,
    tag: tag || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, storage_path } = await req.json();
  await supabaseAdmin.storage.from("documents").remove([storage_path]);
  await supabaseAdmin.from("documents").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
