import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();
  const orgId = profile?.organization_id;

  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "active";

  let query = supabaseAdmin
    .from("clients")
    .select("id, mrn, first_name, last_name, preferred_name, pronouns, date_of_birth, phone_primary, email, status, insurance_provider, primary_clinician_name", { count: "exact" })
    .eq("organization_id", orgId || "")
    .order("last_name");

  if (q) query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%,mrn.ilike.%${q}%,preferred_name.ilike.%${q}%`);
  if (status !== "all") query = query.eq("status", status);

  const { data: clients, count } = await query.limit(50);

  function calcAge(dob: string | null) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    discharged: "bg-slate-100 text-slate-500",
    waitlist: "bg-blue-100 text-blue-700",
    transferred: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{count ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/clients/merge" className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm">
            🔀 Merge Duplicates
          </Link>
          <Link href="/dashboard/clients/new" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
            + New Client
          </Link>
        </div>
      </div>

      {/* Search + filter */}
      <form method="GET" className="flex gap-3">
        <input type="text" name="q" defaultValue={q} placeholder="Search by name or MRN..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <select name="status" defaultValue={status}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="discharged">Discharged</option>
          <option value="waitlist">Waitlist</option>
        </select>
        <button type="submit" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Search</button>
        {q && <Link href="/dashboard/clients" className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Clear</Link>}
      </form>

      {/* Client table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!clients?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="font-semibold text-slate-900 mb-1">{q ? `No clients matching "${q}"` : "No clients yet"}</p>
            {!q && <Link href="/dashboard/clients/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-3">+ Add First Client</Link>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">MRN</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Age / DOB</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurance</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map(client => {
                const age = calcAge(client.date_of_birth);
                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 no-underline group">
                        <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-teal-600 transition-colors">
                            {client.last_name}, {client.first_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {client.preferred_name && <span className="text-xs text-slate-400">"{client.preferred_name}"</span>}
                            {client.pronouns && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{client.pronouns}</span>}
                            {!client.preferred_name && !client.pronouns && <span className="text-xs text-slate-400">{client.email || ""}</span>}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-600">{client.mrn || "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div>{age !== null ? `${age} yrs` : "—"}</div>
                      <div className="text-xs text-slate-400">{client.date_of_birth || ""}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{client.phone_primary || "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{client.insurance_provider || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[client.status || "active"] || STATUS_COLORS.active}`}>
                        {client.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/clients/${client.id}`} className="text-teal-600 text-xs font-medium hover:text-teal-700">View</Link>
                        <span className="text-slate-200">|</span>
                        <Link href={`/dashboard/scheduling/new?client_id=${client.id}`} className="text-slate-500 text-xs font-medium hover:text-teal-600">📅 Schedule</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
