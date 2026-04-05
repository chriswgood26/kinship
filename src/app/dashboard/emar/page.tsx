import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EMARPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const today = new Date().toISOString().split("T")[0];

  // Get all patients with active medication orders
  const { data: orders } = await supabaseAdmin
    .from("medication_orders")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("client_id");

  // Group by patient
  const patientMap = new Map<string, { patient: Record<string, string>; orders: typeof orders }>();
  orders?.forEach(order => {
    const patient = Array.isArray(order.patient) ? order.patient[0] : order.patient;
    if (!patient) return;
    if (!patientMap.has(patient.id)) {
      patientMap.set(patient.id, { patient, orders: [] });
    }
    patientMap.get(patient.id)!.orders!.push(order);
  });

  // Get today's administrations
  const { data: todayAdmins } = await supabaseAdmin
    .from("medication_administrations")
    .select("*")
    .eq("organization_id" as string, orgId as string)
    .gte("scheduled_time", today + "T00:00:00")
    .lte("scheduled_time", today + "T23:59:59");

  const givenToday = todayAdmins?.filter(a => a.status === "given").length || 0;
  const pendingToday = todayAdmins?.filter(a => a.status === "pending").length || 0;
  const missedToday = todayAdmins?.filter(a => a.status === "missed").length || 0;

  const totalPatients = patientMap.size;
  const totalActiveOrders = orders?.length || 0;
  const controlledOrders = orders?.filter(o => o.is_controlled).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">eMAR</h1>
          <p className="text-slate-500 text-sm mt-0.5">Electronic Medication Administration Records — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/dashboard/emar/orders/new" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
+ New Order
        </Link>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Patients on Meds", value: totalPatients, color: "bg-slate-50 border-slate-200" },
          { label: "Active Orders", value: totalActiveOrders, color: "bg-blue-50 border-blue-100" },
          { label: "Given Today", value: givenToday, color: "bg-emerald-50 border-emerald-100" },
          { label: "Pending", value: pendingToday, color: pendingToday > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Missed", value: missedToday, color: missedToday > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {missedToday > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-red-800 font-medium">{missedToday} medication dose{missedToday > 1 ? "s were" : " was"} missed today — document reason and notify prescriber if required</span>
        </div>
      )}

      {controlledOrders > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">💊</span>
          <span className="text-sm text-amber-800 font-medium">{controlledOrders} controlled substance order{controlledOrders > 1 ? "s" : ""} active — narcotic count required each shift</span>
        </div>
      )}

      {/* Patient medication panels */}
      {patientMap.size === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">💊</div>
          <p className="font-semibold text-slate-900 mb-1">No active medication orders</p>
          <p className="text-slate-500 text-sm mb-4">Add medication orders for clients who need medication tracking</p>
          <Link href="/dashboard/emar/orders/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            + New Medication Order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(patientMap.values()).map(({ patient, orders: patOrders }) => (
            <div key={patient.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
                    {patient.first_name?.[0]}{patient.last_name?.[0]}
                  </div>
                  <div>
                    <Link href={`/dashboard/emar/${patient.id}`} className="font-semibold text-slate-900 hover:text-teal-600 no-underline">
                      {patient.last_name}, {patient.first_name}
                      {patient.preferred_name && <span className="text-slate-400 font-normal ml-1.5 text-sm">"{patient.preferred_name}"</span>}
                    </Link>
                    <div className="text-xs text-slate-400">MRN: {patient.mrn || "—"} · {patOrders?.length} medication{patOrders?.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <Link href={`/dashboard/emar/${patient.id}`}
                  className="bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-teal-400">
                  Administer →
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {patOrders?.map(order => (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{order.medication_name}</span>
                        <span className="text-slate-500 text-sm">{order.dosage}</span>
                        {order.is_controlled && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">C-II</span>}
                        {order.is_prn && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">PRN</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {order.route} · {order.frequency}
                        {order.scheduled_times?.length > 0 && ` · ${order.scheduled_times.join(", ")}`}
                        {order.indication && ` · For: ${order.indication}`}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {order.prescriber && <div>Rx: {order.prescriber}</div>}
                      {order.end_date && <div>Until: {new Date(order.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
