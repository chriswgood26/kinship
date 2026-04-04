import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import {
  suggestFromPHQ9,
  suggestFromGAD7,
  suggestFromCSSRS,
  suggestFromIMCANS,
  deduplicateSuggestions,
  type ICD10Suggestion,
} from "@/lib/icd10Suggestions";
import { getCSSRSRisk } from "@/lib/cssrs";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const clientId = new URL(req.url).searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const allSuggestions: ICD10Suggestion[] = [];

  // ── Fetch latest screenings (PHQ-9, GAD-7, C-SSRS) ─────────────────────────
  const { data: screenings } = await supabaseAdmin
    .from("screenings")
    .select("tool, total_score, severity_label, answers, administered_at")
    .eq("client_id", clientId)
    .eq("organization_id", orgId)
    .order("administered_at", { ascending: false })
    .limit(50);

  if (screenings) {
    // Find most recent of each tool type
    const latestPHQ9 = screenings.find(s => s.tool === "phq9");
    const latestGAD7 = screenings.find(s => s.tool === "gad7");
    const latestCSSRS = screenings.find(s => s.tool === "cssrs");

    if (latestPHQ9) {
      const suggestions = suggestFromPHQ9(latestPHQ9.total_score || 0, latestPHQ9.severity_label || "");
      allSuggestions.push(...suggestions);
    }

    if (latestGAD7) {
      const suggestions = suggestFromGAD7(latestGAD7.total_score || 0, latestGAD7.severity_label || "");
      allSuggestions.push(...suggestions);
    }

    if (latestCSSRS) {
      const answers = latestCSSRS.answers as Record<string, boolean | number> || {};
      // Separate ideation vs behavior answers
      const ideationAnswers: Record<string, boolean> = {};
      const behaviorAnswers: Record<string, boolean> = {};
      Object.entries(answers).forEach(([k, v]) => {
        if (k.startsWith("i")) ideationAnswers[k] = Boolean(v);
        if (k.startsWith("b")) behaviorAnswers[k] = Boolean(v);
      });
      const riskResult = getCSSRSRisk(ideationAnswers, behaviorAnswers);
      const suggestions = suggestFromCSSRS(riskResult.level, ideationAnswers, behaviorAnswers);
      allSuggestions.push(...suggestions);
    }
  }

  // ── Fetch latest IM+CANS assessment ─────────────────────────────────────────
  const { data: assessments } = await supabaseAdmin
    .from("assessments")
    .select("assessment_type, scores, total_score, assessment_date")
    .eq("client_id", clientId)
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .order("assessment_date", { ascending: false })
    .limit(10);

  if (assessments) {
    const latestIMCANS = assessments.find(a => a.assessment_type === "IM+CANS");
    if (latestIMCANS && latestIMCANS.scores) {
      const suggestions = suggestFromIMCANS(latestIMCANS.scores as Record<string, number>);
      allSuggestions.push(...suggestions);
    }
  }

  const suggestions = deduplicateSuggestions(allSuggestions);

  return NextResponse.json({
    suggestions,
    sources: {
      phq9: screenings?.find(s => s.tool === "phq9") ? {
        score: screenings.find(s => s.tool === "phq9")!.total_score,
        severity: screenings.find(s => s.tool === "phq9")!.severity_label,
        date: screenings.find(s => s.tool === "phq9")!.administered_at,
      } : null,
      gad7: screenings?.find(s => s.tool === "gad7") ? {
        score: screenings.find(s => s.tool === "gad7")!.total_score,
        severity: screenings.find(s => s.tool === "gad7")!.severity_label,
        date: screenings.find(s => s.tool === "gad7")!.administered_at,
      } : null,
      cssrs: screenings?.find(s => s.tool === "cssrs") ? {
        date: screenings.find(s => s.tool === "cssrs")!.administered_at,
      } : null,
      imcans: assessments?.find(a => a.assessment_type === "IM+CANS") ? {
        score: assessments.find(a => a.assessment_type === "IM+CANS")!.total_score,
        date: assessments.find(a => a.assessment_type === "IM+CANS")!.assessment_date,
      } : null,
    },
  });
}
