import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  
  const { data: payment, error } = await supabaseAdmin.from("patient_payments").insert({
    organization_id: profile?.organization_id || null,
    client_id: body.client_id,
    invoice_id: body.invoice_id,
    payment_date: body.payment_date,
    amount: body.amount,
    payment_method: body.payment_method?.toLowerCase().replace(" / ", "_").replace(" ", "_") || "cash",
    reference_number: body.reference_number || null,
    notes: body.notes || null,
    recorded_by: userId,
  }).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Update invoice amount_paid and balance_due
  const { data: inv } = await supabaseAdmin.from("patient_invoices").select("amount_paid, balance_due").eq("id", body.invoice_id).single();
  if (inv) {
    const newAmountPaid = Number(inv.amount_paid) + Number(body.amount);
    const newBalance = Number(inv.balance_due) - Number(body.amount);
    await supabaseAdmin.from("patient_invoices").update({
      amount_paid: newAmountPaid,
      balance_due: Math.max(0, newBalance),
      status: newBalance <= 0 ? "paid" : "sent",
      updated_at: new Date().toISOString(),
    }).eq("id", body.invoice_id);
  }
  
  return NextResponse.json({ payment }, { status: 201 });
}
