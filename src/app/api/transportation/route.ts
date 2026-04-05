import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const vehicleId = url.searchParams.get("vehicle_id");

  let query = supabaseAdmin
    .from("client_transportation")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("trip_date", { ascending: false })
    .order("pickup_time", { ascending: false })
    .limit(300);

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("trip_date", from);
  if (to) query = query.lte("trip_date", to);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trips: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  if (!body.client_id || !body.trip_date) {
    return NextResponse.json({ error: "client_id and trip_date are required" }, { status: 400 });
  }

  // Compute mileage if odometer values provided
  let mileage: number | null = body.mileage ?? null;
  if (!mileage && body.odometer_start != null && body.odometer_end != null) {
    const diff = parseFloat(body.odometer_end) - parseFloat(body.odometer_start);
    if (diff > 0) mileage = Math.round(diff * 10) / 10;
  }

  const { data, error } = await supabaseAdmin
    .from("client_transportation")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      trip_date: body.trip_date,
      trip_purpose: body.trip_purpose || "day_program",
      vehicle_id: body.vehicle_id || null,
      vehicle_name: body.vehicle_name || null,
      driver_name: body.driver_name || null,
      pickup_time: body.pickup_time ? body.pickup_time + (body.pickup_time.length === 5 ? ":00" : "") : null,
      dropoff_time: body.dropoff_time ? body.dropoff_time + (body.dropoff_time.length === 5 ? ":00" : "") : null,
      pickup_address: body.pickup_address || null,
      dropoff_address: body.dropoff_address || null,
      odometer_start: body.odometer_start ?? null,
      odometer_end: body.odometer_end ?? null,
      mileage,
      status: body.status || "scheduled",
      escort_required: body.escort_required ?? false,
      escort_staff: body.escort_staff || null,
      behavior_notes: body.behavior_notes || null,
      notes: body.notes || null,
      created_by_clerk_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trip: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Recompute mileage if odometer fields updated
  if (patch.odometer_start != null && patch.odometer_end != null && patch.mileage == null) {
    const diff = parseFloat(patch.odometer_end) - parseFloat(patch.odometer_start);
    if (diff > 0) patch.mileage = Math.round(diff * 10) / 10;
  }

  const { data, error } = await supabaseAdmin
    .from("client_transportation")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trip: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("client_transportation")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
