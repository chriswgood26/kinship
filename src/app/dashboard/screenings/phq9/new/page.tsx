import { Suspense } from "react";
import ScreeningForm from "../../ScreeningForm";
import { PHQ9 } from "@/lib/screenings";

export default function PHQ9Page() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><ScreeningForm tool={PHQ9} /></Suspense>;
}
