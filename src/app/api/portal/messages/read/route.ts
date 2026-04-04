import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// PATCH /api/portal/messages/read?client_id=...&direction=inbound|outbound
// Marks all unread messages of a given direction as read for a client
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const clientId = req.nextUrl.searchParams.get("client_id");
  const direction = req.nextUrl.searchParams.get("direction") || "inbound";

  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  await supabaseAdmin
    .from("portal_messages")
    .update({ is_read: true })
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .eq("direction", direction)
    .eq("is_read", false);

  return NextResponse.json({ ok: true });
}
