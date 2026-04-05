// Public self-registration page — /register/[orgSlug]
// Patients submit a request; staff review and approve in the portal management dashboard.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SelfRegistrationForm from "./SelfRegistrationForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function RegisterPage({ params }: PageProps) {
  const { orgSlug } = await params;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, is_active, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org || !org.is_active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Registration Unavailable</h1>
          <p className="text-slate-500 text-sm">
            This registration link is invalid or the organization is not currently accepting new registrations.
          </p>
          <Link href="/portal/sign-in" className="inline-block text-teal-600 text-sm font-medium hover:text-teal-700">
            Go to portal sign-in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">K</div>
          <h1 className="text-2xl font-bold text-slate-900">Request Portal Access</h1>
          <p className="text-slate-500 text-sm mt-1">
            <strong>{org.name}</strong> · Secure Patient Portal
          </p>
        </div>
        <SelfRegistrationForm orgSlug={orgSlug} orgName={org.name} />
        <p className="text-xs text-slate-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/portal/sign-in" className="text-teal-600 hover:text-teal-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
