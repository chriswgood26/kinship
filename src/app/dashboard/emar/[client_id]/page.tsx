import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import EMARAdminClient from "./EMARAdminClient";

export const dynamic = "force-dynamic";

export default async function PatientEMARPage({ params }: { params: Promise<{ client_id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { client_id } = await params;

  const [{ data: patient }, { data: orders }] = await Promise.all([
    supabaseAdmin.from("clients").select("*").eq("id", client_id).single(),
    supabaseAdmin.from("medication_orders").select("*").eq("client_id", client_id).eq("status", "active").order("medication_name"),
  ]);

  if (!patient) notFound();

  const today = new Date().toISOString().split("T")[0];
  const { data: todayAdmins } = await supabaseAdmin
    .from("medication_administrations")
    .select("*")
    .eq("client_id", client_id)
    .gte("scheduled_time", today + "T00:00:00")
    .lte("scheduled_time", today + "T23:59:59");

  const adminsByOrder: Record<string, typeof todayAdmins> = {};
  todayAdmins?.forEach(a => {
    if (!adminsByOrder[a.order_id]) adminsByOrder[a.order_id] = [];
    adminsByOrder[a.order_id]!.push(a);
  });

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Staff";

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/emar" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">eMAR — {patient.last_name}, {patient.first_name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            MRN: {patient.mrn || "—"} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {orders?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">💊</div>
          <p className="font-semibold text-slate-900 mb-1">No active medication orders</p>
          <Link href={`/dashboard/emar/orders/new?client_id=${client_id}`}
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-2">
            + Add Medication Order
          </Link>
        </div>
      ) : (
        <EMARAdminClient
          orders={orders || []}
          adminsByOrder={adminsByOrder}
          clientId={client_id}
          today={today}
          staffName={userName}
        />
      )}

      <div className="flex justify-end">
        <Link href={`/dashboard/emar/orders/new?client_id=${client_id}`}
          className="border border-teal-200 text-teal-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-50">
          + Add Medication Order
        </Link>
      </div>
    </div>
  );
}
