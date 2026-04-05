import { redirect } from "next/navigation";
export default async function EditTreatmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/treatment-plans/${id}`);
}
