import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
