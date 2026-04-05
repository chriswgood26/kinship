import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  
  // Generate invoice number
  const { count } = await supabaseAdmin.from("patient_invoices").select("*", { count: "exact", head: true });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, "0")}`;
  
  const { data, error } = await supabaseAdmin.from("patient_invoices").insert({
    organization_id: profile?.organization_id || null,
    client_id: body.client_id,
    invoice_number: invoiceNumber,
    invoice_date: body.invoice_date,
    due_date: body.due_date || null,
    status: "open",
    subtotal: body.subtotal || 0,
    insurance_paid: body.insurance_paid || 0,
    adjustments: body.adjustments || 0,
    patient_responsibility: body.patient_responsibility || 0,
    balance_due: body.balance_due || 0,
    amount_paid: 0,
    notes: body.notes || null,
    created_by: userId,
  }).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  if (body.line_items?.length && data) {
    await supabaseAdmin.from("invoice_line_items").insert(
      body.line_items.map((li: Record<string, unknown>) => ({ ...li, invoice_id: data.id }))
    );
  }
  
  return NextResponse.json({ invoice: data }, { status: 201 });
}
