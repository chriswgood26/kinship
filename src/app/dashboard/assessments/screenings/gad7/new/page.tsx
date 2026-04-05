import { Suspense } from "react";
import ScreeningForm from "../../../../screenings/ScreeningForm";
import { GAD7 } from "@/lib/screenings";
export default function GAD7Page() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><ScreeningForm tool={GAD7} /></Suspense>;
}
