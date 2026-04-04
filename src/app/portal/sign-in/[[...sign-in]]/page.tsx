import { SignIn } from "@clerk/nextjs";

export default function PortalSignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">K</div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to access your secure health portal</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-slate-200 rounded-2xl",
            },
          }}
          forceRedirectUrl="/portal/dashboard"
        />
      </div>
    </div>
  );
}
