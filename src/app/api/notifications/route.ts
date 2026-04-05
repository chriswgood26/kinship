import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_clerk_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ notifications: data || [], unread: data?.length || 0 });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (id === "all") {
    await supabaseAdmin.from("notifications").update({ is_read: true }).eq("user_clerk_id", userId);
  } else {
    await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", id).eq("user_clerk_id", userId);
  }
  return NextResponse.json({ message: "marked read" });
}
