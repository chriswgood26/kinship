import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TerminologyTitle from "@/components/TerminologyTitle";
import EditPatientForm from "./EditPatientForm";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const { data: patient } = await supabaseAdmin.from("clients").select("*").eq("id", id).single();
  if (!patient) notFound();
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${id}`} className="text-slate-400 hover:text-slate-700">←</Link>
        <TerminologyTitle prefix="Edit" />
      </div>
      <EditPatientForm patient={patient} />
    </div>
  );
}
