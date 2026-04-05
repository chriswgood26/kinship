import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { charge_ids, batch_id } = await req.json();
  if (!charge_ids?.length) return NextResponse.json({ error: "No charges selected" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("charges")
    .update({ status: "submitted", notes: `Batch: ${batch_id} — submitted ${new Date().toISOString()}` })
    .in("id", charge_ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, batch_id, count: charge_ids.length });
}
