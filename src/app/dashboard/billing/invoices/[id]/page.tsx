import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import InvoiceActions from "./InvoiceActions";
import InvoicePrintButton from "./InvoicePrintButton";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const { id } = await params;

  const [{ data: invoice }, { data: lineItems }, { data: payments }, { data: org }] = await Promise.all([
    supabaseAdmin.from("patient_invoices").select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, address_line1, city, state, zip, phone_primary, date_of_birth, insurance_provider, insurance_member_id)").eq("id", id).single(),
    supabaseAdmin.from("invoice_line_items").select("*").eq("invoice_id", id).order("service_date"),
    supabaseAdmin.from("patient_payments").select("*").eq("invoice_id", id).order("payment_date"),
    supabaseAdmin.from("organizations").select("*").eq("id", orgId).single(),
  ]);

  if (!invoice) notFound();
  const patient = Array.isArray(invoice.patient) ? invoice.patient[0] : invoice.patient;
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== "paid";

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing/invoices" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice {invoice.invoice_number}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {patient ? `${patient.last_name}, ${patient.first_name}` : "—"} · {new Date(invoice.invoice_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <InvoicePrintButton />
        </div>
      </div>

      {/* Invoice document */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" id="invoice-doc">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d1b2e] to-[#1a3260] px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-xl mb-0.5">{org?.name || "Beaverton Mental Health"}</div>
              <div className="text-slate-300 text-sm">{org?.address_line1}, {org?.city}, {org?.state} {org?.zip}</div>
              <div className="text-slate-300 text-sm">{org?.phone}</div>
              {org?.npi && <div className="text-slate-400 text-xs mt-1">NPI: {org.npi}</div>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-300">INVOICE</div>
              <div className="text-slate-300 text-sm mt-1"># {invoice.invoice_number}</div>
              <div className="text-slate-300 text-sm">Date: {new Date(invoice.invoice_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              {invoice.due_date && (
                <div className={`text-sm font-semibold mt-1 ${isOverdue ? "text-red-300" : "text-teal-300"}`}>
                  Due: {new Date(invoice.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {isOverdue && " ⚠️ OVERDUE"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="px-8 py-5 grid grid-cols-2 gap-8 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Bill To</div>
            <div className="font-bold text-slate-900">{patient ? `${patient.first_name} ${patient.last_name}` : "—"}</div>
            {patient?.address_line1 && <div className="text-slate-600 text-sm">{patient.address_line1}</div>}
            {patient?.city && <div className="text-slate-600 text-sm">{patient.city}, {patient.state} {patient.zip}</div>}
            {patient?.phone_primary && <div className="text-slate-600 text-sm mt-1">{patient.phone_primary}</div>}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Patient Information</div>
            <div className="text-sm text-slate-600 space-y-0.5">
              <div>MRN: <span className="font-mono font-bold text-slate-900">{patient?.mrn || "—"}</span></div>
              {patient?.date_of_birth && <div>DOB: {new Date(patient.date_of_birth + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
              {patient?.insurance_provider && <div>Insurance: {patient.insurance_provider}</div>}
              {patient?.insurance_member_id && <div>Member ID: {patient.insurance_member_id}</div>}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="px-8 py-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Service</th>
                <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">CPT</th>
                <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Billed</th>
                <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Ins. Paid</th>
                <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Adjustment</th>
                <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Patient Owes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineItems?.map(item => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-slate-600">{item.service_date ? new Date(item.service_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                  <td className="py-3 text-sm text-slate-900">{item.description || "—"}</td>
                  <td className="py-3 text-sm font-mono text-slate-700">{item.cpt_code || "—"}</td>
                  <td className="py-3 text-sm text-right text-slate-700">${Number(item.amount_billed || 0).toFixed(2)}</td>
                  <td className="py-3 text-sm text-right text-emerald-700">${Number(item.insurance_paid || 0).toFixed(2)}</td>
                  <td className="py-3 text-sm text-right text-slate-500">${Number(item.adjustment || 0).toFixed(2)}</td>
                  <td className="py-3 text-sm text-right font-semibold text-slate-900">${Number(item.patient_responsibility || 0).toFixed(2)}</td>
                </tr>
              ))}
              {(!lineItems || lineItems.length === 0) && (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400 text-sm">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 pb-6">
          <div className="ml-auto w-72 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total Billed</span>
              <span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Insurance Paid</span>
              <span>− ${Number(invoice.insurance_paid).toFixed(2)}</span>
            </div>
            {Number(invoice.adjustments) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Adjustments</span>
                <span>− ${Number(invoice.adjustments).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.amount_paid) > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Payments Received</span>
                <span>− ${Number(invoice.amount_paid).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Balance Due</span>
              <span className={Number(invoice.balance_due) > 0 ? "text-red-600" : "text-emerald-600"}>
                ${Number(invoice.balance_due).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {payments && payments.length > 0 && (
          <div className="px-8 pb-6 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 mt-4">Payment History</div>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-50 rounded-lg px-4 py-2">
                  <div className="text-slate-700">{new Date(p.payment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div className="text-slate-500 capitalize">{p.payment_method}{p.reference_number ? ` · #${p.reference_number}` : ""}</div>
                  <div className="font-semibold text-emerald-700">${Number(p.amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">Please make payment by the due date. Contact our billing office with questions.</p>
          {org?.phone && <p className="text-xs text-slate-400 mt-0.5">Billing: {org.phone}</p>}
        </div>
      </div>

      {/* Actions panel */}
      <InvoiceActions invoice={invoice} />
    </div>
  );
}
