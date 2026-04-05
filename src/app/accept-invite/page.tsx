// /accept-invite?token=xxx — portal invitation acceptance page
// This page is intentionally OUTSIDE the portal auth layout so unauthenticated users can reach it.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <InviteError message="No invitation token provided." />;
  }

  // Look up the token
  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id, email, first_name, last_name, relationship, invite_expires_at, invite_accepted_at, is_active, client:client_id(first_name, last_name), org:organization_id(name)")
    .eq("invite_token", token)
    .single();

  if (!portalUser) {
    return <InviteError message="This invitation link is invalid or has already been used." />;
  }

  if (!portalUser.is_active) {
    return <InviteError message="This portal account has been deactivated. Please contact your care team." />;
  }

  if (portalUser.invite_accepted_at) {
    return (
      <InviteLayout>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Already accepted</h1>
          <p className="text-slate-500 text-sm">
            Your portal account is already set up. Sign in to access your portal.
          </p>
          <Link
            href="/portal/sign-in"
            className="inline-block bg-teal-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-400 transition-colors"
          >
            Sign In to Portal
          </Link>
        </div>
      </InviteLayout>
    );
  }

  if (portalUser.invite_expires_at && new Date(portalUser.invite_expires_at) < new Date()) {
    return <InviteError message="This invitation link has expired. Please ask your care team to send a new one." />;
  }

  const orgName = (Array.isArray(portalUser.org) ? portalUser.org[0]?.name : (portalUser.org as { name?: string } | null)?.name) || "Your care team";
  const client = Array.isArray(portalUser.client) ? portalUser.client[0] : (portalUser.client as { first_name?: string; last_name?: string } | null);

  // Mark the invite as accepted now that they've opened the link
  await supabaseAdmin
    .from("portal_users")
    .update({ invite_accepted_at: new Date().toISOString() })
    .eq("id", portalUser.id);

  // Build Clerk sign-up URL with email pre-filled
  const signUpUrl = `/portal/sign-in#/sign-up`;

  return (
    <InviteLayout>
      <div className="space-y-6">
        {/* Org branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto text-white text-2xl font-bold shadow-sm">
            K
          </div>
          <h1 className="text-2xl font-bold text-slate-900">You&apos;re invited!</h1>
          <p className="text-slate-500 text-sm">
            <strong>{orgName}</strong> has created a secure patient portal account for you.
          </p>
        </div>

        {/* Account details */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-slate-900">{portalUser.first_name} {portalUser.last_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{portalUser.email}</span>
          </div>
          {client && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Patient</span>
              <span className="font-medium text-slate-900">{client.first_name} {client.last_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Relationship</span>
            <span className="font-medium text-slate-900 capitalize">{portalUser.relationship?.replace("_", " ") || "Patient"}</span>
          </div>
        </div>

        {/* What you can do */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">With your portal you can</p>
          <ul className="space-y-1.5">
            {[
              "💬 Message your care team securely",
              "📅 View upcoming appointments",
              "📄 Access shared documents",
              "📋 Review your care plan",
            ].map(item => (
              <li key={item} className="text-sm text-teal-800">{item}</li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <p className="text-xs text-slate-500 text-center">
            Use the email address <strong>{portalUser.email}</strong> to create your account.
          </p>
          <Link
            href={signUpUrl}
            className="block w-full bg-teal-500 text-white text-center font-semibold py-3.5 rounded-xl hover:bg-teal-400 transition-colors"
          >
            Create My Account →
          </Link>
          <Link
            href="/portal/sign-in"
            className="block w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <p className="text-xs text-slate-400 text-center">
          This is a HIPAA-compliant portal. Your information is protected and encrypted.
        </p>
      </div>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        {children}
      </div>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <InviteLayout>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Invitation Error</h1>
        <p className="text-slate-500 text-sm">{message}</p>
        <Link
          href="/portal/sign-in"
          className="inline-block text-teal-600 text-sm font-medium hover:text-teal-700"
        >
          Go to portal sign-in →
        </Link>
      </div>
    </InviteLayout>
  );
}
