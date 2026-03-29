import ScreeningDetail from "../../ScreeningDetail";
import { GAD7 } from "@/lib/screenings";
export default async function GAD7DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScreeningDetail tool={GAD7} screeningId={id} />;
}
