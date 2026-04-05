import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: notifications } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_clerk_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unread = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up"} · {notifications?.length || 0} total
          </p>
          </div>
        </div>
      </div>

      <NotificationsClient notifications={notifications || []} userId={user.id} />
    </div>
  );
}
