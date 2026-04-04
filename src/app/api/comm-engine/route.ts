// POST /api/comm-engine — manually trigger a comm event (for testing or on-demand sends)
// GET  /api/comm-engine — fetch delivery report

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { triggerCommEvent } from "@/lib/commEngine";
import type { CommEventTrigger } from "@/lib/commConstants";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { event_trigger, client_id, template_vars } = body;

  if (!event_trigger) {
    return NextResponse.json({ error: "event_trigger required" }, { status: 400 });
  }

  const result = await triggerCommEvent({
    orgId,
    eventTrigger: event_trigger as CommEventTrigger,
    clientId: client_id,
    templateVars: template_vars || {},
  });

  return NextResponse.json(result, { status: 200 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const clientId = req.nextUrl.searchParams.get("client_id");
  const trigger = req.nextUrl.searchParams.get("trigger");
  const status = req.nextUrl.searchParams.get("status");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

  let query = supabaseAdmin
    .from("comm_delivery_log")
    .select("*, clients(first_name, last_name)")
    .eq("organization_id", orgId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (clientId) query = query.eq("client_id", clientId);
  if (trigger) query = query.eq("event_trigger", trigger);
  if (status) query = query.eq("delivery_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate stats
  const allLogs = data || [];
  const stats = {
    total: allLogs.length,
    sent: allLogs.filter(l => l.delivery_status === "sent").length,
    failed: allLogs.filter(l => l.delivery_status === "failed").length,
    opted_out: allLogs.filter(l => l.delivery_status === "opted_out").length,
  };

  return NextResponse.json({ logs: allLogs, stats });
}
