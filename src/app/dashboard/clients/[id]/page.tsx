import Link from "next/link";
import CareTeam from "@/components/CareTeam";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import ClientMessagesPanel from "./ClientMessagesPanel";
import ClientTabNav from "./ClientTabNav";

export const dynamic = "force-dynamic";

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</dt>
    <dd className="text-sm text-slate-900 mt-0.5 font-medium">{value || <span className="text-slate-300 font-normal">—</span>}</dd>
  </div>
);

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || "overview";

  const [{ data: client }, { data: appointments }, { data: encounters }, { data: unreadMsgs }] = await Promise.all([
    supabaseAdmin.from("clients").select("*, primary_clinician:primary_clinician_id(id, first_name, last_name, credentials)").eq("id", id).single(),
    supabaseAdmin.from("appointments").select("*").eq("client_id", id).gte("appointment_date", new Date().toISOString().split("T")[0]).order("appointment_date").limit(3),
    supabaseAdmin.from("encounters").select("*").eq("client_id", id).order("encounter_date", { ascending: false }).limit(5),
    supabaseAdmin.from("portal_messages").select("id").eq("client_id", id).eq("direction", "inbound").eq("is_read", false),
  ]);

  if (!client) notFound();
  const unreadMessageCount = unreadMsgs?.length ?? 0;

  const age = calcAge(client.date_of_birth);
  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    discharged: "bg-slate-100 text-slate-500",
    waitlist: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients" className="text-slate-400 hover:text-slate-700 mt-1">←</Link>
          <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl flex-shrink-0">
            {client.first_name?.[0]}{client.last_name?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{client.last_name}, {client.first_name}
                {client.preferred_name && <span className="text-slate-400 font-normal text-base ml-2">"{client.preferred_name}"</span>}
              </h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[client.status || "active"]}`}>{client.status || "active"}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
              <span className="font-mono font-bold text-slate-700">MRN: {client.mrn || "—"}</span>
              {age !== null && <span>Age {age}</span>}
              {client.date_of_birth && <span>{new Date(client.date_of_birth + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
              {client.pronouns && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">{client.pronouns}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/dashboard/scheduling/new?client_id=${client.id}`} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">+ Schedule</Link>
          <Link href={`/dashboard/encounters/new?client_id=${client.id}`} className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">+ Encounter</Link>
        </div>
      </div>

      {/* Tab navigation */}
      <ClientTabNav clientId={id} activeTab={activeTab} unreadMessageCount={unreadMessageCount} />

      {/* Messages tab */}
      {activeTab === "messages" && (
        <ClientMessagesPanel clientId={id} />
      )}

      {/* Overview tab */}
      {activeTab === "overview" && <div className="grid grid-cols-3 gap-5">
        {/* Left col */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Demographics</h2>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
              <InfoRow label="First Name" value={client.first_name} />
              <InfoRow label="Last Name" value={client.last_name} />
              <InfoRow label="Preferred Name" value={client.preferred_name} />
              <InfoRow label="Date of Birth" value={client.date_of_birth} />
              <InfoRow label="Gender" value={client.gender} />
              <InfoRow label="Pronouns" value={client.pronouns} />
              <InfoRow label="Race" value={client.race} />
              <InfoRow label="Ethnicity" value={client.ethnicity} />
              <InfoRow label="Language" value={client.primary_language} />
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Contact</h2>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
              <InfoRow label="Phone" value={client.phone_primary} />
              <InfoRow label="Email" value={client.email} />
              <div className="col-span-3"><InfoRow label="Address" value={[client.address_line1, client.city && `${client.city}, ${client.state} ${client.zip}`].filter(Boolean).join(", ")} /></div>
            </dl>
          </div>

          {/* Recent encounters */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Recent Encounters</h2>
              <Link href={`/dashboard/encounters/new?client_id=${client.id}`} className="text-xs text-teal-600 font-medium hover:text-teal-700">+ New</Link>
            </div>
            {!encounters?.length ? (
              <div className="p-6 text-center text-slate-400 text-sm">No encounters yet</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {encounters.map(enc => (
                  <Link key={enc.id} href={`/dashboard/encounters/${enc.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 no-underline">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">{enc.encounter_type || "Encounter"}</div>
                      <div className="text-xs text-slate-400">{enc.encounter_date}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enc.status === "signed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{enc.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Upcoming Appointments</h2>
            {!appointments?.length ? (
              <div className="text-xs text-slate-400">No upcoming appointments</div>
            ) : (
              <div className="space-y-2">
                {appointments.map(appt => (
                  <div key={appt.id} className="text-sm">
                    <div className="font-medium text-slate-900">{appt.appointment_type}</div>
                    <div className="text-xs text-slate-400">{appt.appointment_date}{appt.start_time && ` · ${appt.start_time.slice(0,5)}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Insurance</h2>
            <dl className="space-y-2">
              <InfoRow label="Provider" value={client.insurance_provider} />
              <InfoRow label="Member ID" value={client.insurance_member_id} />
              <InfoRow label="Group #" value={client.insurance_group_number} />
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-3">Emergency Contact</h2>
            <dl className="space-y-2">
              <InfoRow label="Name" value={client.emergency_contact_name} />
              <InfoRow label="Phone" value={client.emergency_contact_phone} />
              <InfoRow label="Relationship" value={client.emergency_contact_relationship} />
            </dl>
          </div>
        </div>
      </div>}
    </div>
  );
}
