import ScreeningDetail from "../../ScreeningDetail";
import { PHQ9 } from "@/lib/screenings";
export default async function PHQ9DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScreeningDetail tool={PHQ9} screeningId={id} />;
}
