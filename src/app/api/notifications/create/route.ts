import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { recipient_clerk_id, type, title, message, entity_type, entity_id, link } = body;
  if (!recipient_clerk_id || !title || !message) {
    return NextResponse.json({ error: "recipient_clerk_id, title, message required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("notifications").insert({
    user_clerk_id: recipient_clerk_id,
    type: type || "info",
    title,
    message,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
    link: link || null,
    is_read: false,
    created_by_clerk_id: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data }, { status: 201 });
}
