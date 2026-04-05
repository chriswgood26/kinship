import { redirect } from "next/navigation";
// Full ISP edit page - for now redirect back to detail
// TODO: build full edit form
export default async function EditISPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/isp/${id}`);
}
