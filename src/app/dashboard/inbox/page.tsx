import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NotificationsPageClient from "./NotificationsPageClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  // Get system notifications
  const { data: notifications } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_clerk_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get unread message threads (show as notifications)
  const { data: participations } = await supabaseAdmin
    .from("message_participants")
    .select("thread_id, last_read_at")
    .eq("clerk_user_id", user.id);

  const threadIds = participations?.map(p => p.thread_id) || [];
  const lastReadMap = Object.fromEntries((participations || []).map(p => [p.thread_id, p.last_read_at]));

  const { data: threads } = threadIds.length > 0
    ? await supabaseAdmin
        .from("message_threads")
        .select("*, messages(id, body, sender_name, sender_clerk_id, created_at)")
        .in("id", threadIds)
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] };

  // Filter to unread threads only
  const unreadThreads = (threads || []).filter(t => {
    const msgs = Array.isArray(t.messages) ? t.messages : [];
    const latest = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastRead = lastReadMap[t.id];
    return latest && (!lastRead || latest.created_at > lastRead);
  });

  // Get portal messages (staff inbox view)
  const { data: portalMessages } = await supabaseAdmin
    .from("portal_messages")
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);

  const unreadPortalCount = portalMessages?.filter(m => !m.is_read && m.direction === "inbound").length || 0;
  const unreadNotifCount = notifications?.filter(n => !n.is_read).length || 0;
  const totalUnread = unreadNotifCount + unreadThreads.length + unreadPortalCount;

  return (
    <NotificationsPageClient
      notifications={notifications || []}
      unreadThreads={unreadThreads}
      portalMessages={portalMessages || []}
      lastReadMap={lastReadMap}
      currentUserId={user.id}
      totalUnread={totalUnread}
    />
  );
}
