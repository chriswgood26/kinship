import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("*, client:client_id(first_name, last_name, preferred_name, date_of_birth, phone_primary)")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!portalUser) redirect("/dashboard");

  const client = Array.isArray(portalUser.client) ? portalUser.client[0] : portalUser.client;

  const { count: unreadCount } = await supabaseAdmin
    .from("portal_messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", portalUser.client_id)
    .eq("direction", "outbound")
    .eq("is_read", false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user.firstName || client?.first_name || "there"}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Your secure health portal</p>
      </div>

      {/* Unread messages banner */}
      {(unreadCount ?? 0) > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-800 text-sm">
              💬 You have {unreadCount} new {unreadCount === 1 ? "message" : "messages"} from your care team
            </p>
            <p className="text-teal-700 text-xs mt-0.5">Tap below to read and reply</p>
          </div>
          <Link
            href="/portal/messages"
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 flex-shrink-0"
          >
            View Messages
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/portal/messages" className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow no-underline">
          <div className="text-3xl mb-2">💬</div>
          <div className="font-semibold text-slate-900 text-sm">Messages</div>
          <div className="text-xs text-slate-400 mt-0.5">Secure messaging with your care team</div>
          {(unreadCount ?? 0) > 0 && (
            <div className="mt-2">
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            </div>
          )}
        </Link>

        <Link href="/portal/assessments" className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow no-underline">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-semibold text-slate-900 text-sm">Questionnaires</div>
          <div className="text-xs text-slate-400 mt-0.5">Complete health questionnaires before your appointment</div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl mb-2">👤</div>
          <div className="font-semibold text-slate-900 text-sm">My Information</div>
          {client && (
            <dl className="mt-2 space-y-1">
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{client.first_name} {client.last_name}</span>
              </div>
              {client.phone_primary && (
                <div className="text-xs text-slate-500">{client.phone_primary}</div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
