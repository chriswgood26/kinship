import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const SUPERADMIN_IDS = process.env.SUPERADMIN_USER_IDS?.split(",") || [];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user || !SUPERADMIN_IDS.includes(user.id)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin top bar */}
      <div className="bg-slate-900 text-white px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-teal-400 tracking-widest uppercase text-[10px]">Kinship Admin</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Internal dashboard — restricted access</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          {user.emailAddresses[0]?.emailAddress || user.id}
        </div>
      </div>
      {children}
    </div>
  );
}
