import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function MfaSetupPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // If MFA is already enabled, send them to the dashboard
  if (user.twoFactorEnabled) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
          <span className="text-2xl flex-shrink-0">🔐</span>
          <div>
            <h1 className="text-lg font-bold text-amber-900">
              Multi-Factor Authentication Required
            </h1>
            <p className="text-sm text-amber-800 mt-1">
              To protect patient data and comply with HIPAA security requirements,{" "}
              <strong>all staff accounts must enable multi-factor authentication (MFA)</strong>{" "}
              before accessing the Kinship EHR dashboard.
            </p>
            <p className="text-sm text-amber-700 mt-2">
              Please set up an authenticator app or SMS verification below, then refresh
              this page to continue.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">How to set up MFA</h2>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-teal-600 flex-shrink-0">1.</span>
              Click <strong>&quot;Security&quot;</strong> in the account panel below.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-600 flex-shrink-0">2.</span>
              Under <strong>&quot;Two-step verification&quot;</strong>, click{" "}
              <strong>&quot;Add authenticator app&quot;</strong> or{" "}
              <strong>&quot;Add phone number&quot;</strong>.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-600 flex-shrink-0">3.</span>
              Follow the on-screen instructions to complete enrollment.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-600 flex-shrink-0">4.</span>
              Once saved, you will be automatically redirected to the dashboard.
            </li>
          </ol>
        </div>

        {/* Clerk UserProfile embedded */}
        <div className="flex justify-center">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-slate-200 rounded-2xl",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
