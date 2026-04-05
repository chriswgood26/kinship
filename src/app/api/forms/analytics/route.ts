import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/forms/analytics — completion rates and average scores by template and program
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") || new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const to = sp.get("to") || new Date().toISOString().split("T")[0];
  const programId = sp.get("program_id");

  // Fetch all submissions in date range
  let query = supabaseAdmin
    .from("form_submissions")
    .select("id, template_id, template_name, template_category, program_id, status, total_score, max_score, completed_at, created_at")
    .eq("organization_id", orgId)
    .gte("created_at", from + "T00:00:00")
    .lte("created_at", to + "T23:59:59");

  if (programId) query = query.eq("program_id", programId);

  const { data: submissions, error } = await query;

  if (error && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = submissions || [];

  // ── By-template analytics ────────────────────────────────────────────────
  const byTemplate: Record<string, {
    template_id: string;
    template_name: string;
    template_category: string | null;
    total: number;
    completed: number;
    in_progress: number;
    abandoned: number;
    completion_rate: number;
    scores: number[];
    avg_score: number | null;
    avg_score_pct: number | null;
  }> = {};

  for (const row of rows) {
    const key = row.template_id;
    if (!byTemplate[key]) {
      byTemplate[key] = {
        template_id: row.template_id,
        template_name: row.template_name,
        template_category: row.template_category,
        total: 0,
        completed: 0,
        in_progress: 0,
        abandoned: 0,
        completion_rate: 0,
        scores: [],
        avg_score: null,
        avg_score_pct: null,
      };
    }
    const t = byTemplate[key];
    t.total++;
    if (row.status === "completed") {
      t.completed++;
      if (row.total_score != null) t.scores.push(row.total_score);
    } else if (row.status === "in_progress") {
      t.in_progress++;
    } else {
      t.abandoned++;
    }
  }

  // Compute derived stats
  for (const t of Object.values(byTemplate)) {
    t.completion_rate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
    if (t.scores.length > 0) {
      const sum = t.scores.reduce((a, b) => a + b, 0);
      t.avg_score = Math.round((sum / t.scores.length) * 10) / 10;
    }
  }

  // ── By-program analytics ────────────────────────────────────────────────
  // Fetch program names for any program_id in results
  const programIds = [...new Set(rows.filter(r => r.program_id).map(r => r.program_id as string))];
  let programNames: Record<string, string> = {};

  if (programIds.length > 0) {
    const { data: programs } = await supabaseAdmin
      .from("programs")
      .select("id, name")
      .in("id", programIds);
    programNames = Object.fromEntries((programs || []).map(p => [p.id, p.name]));
  }

  const byProgram: Record<string, {
    program_id: string | null;
    program_name: string;
    total: number;
    completed: number;
    completion_rate: number;
    scores: number[];
    avg_score: number | null;
    avg_score_pct: number | null;
  }> = {};

  for (const row of rows) {
    const key = row.program_id ?? "__none__";
    if (!byProgram[key]) {
      byProgram[key] = {
        program_id: row.program_id ?? null,
        program_name: row.program_id ? (programNames[row.program_id] ?? "Unknown Program") : "No Program",
        total: 0,
        completed: 0,
        completion_rate: 0,
        scores: [],
        avg_score: null,
        avg_score_pct: null,
      };
    }
    const p = byProgram[key];
    p.total++;
    if (row.status === "completed") {
      p.completed++;
      if (row.total_score != null) p.scores.push(row.total_score);
    }
  }

  for (const p of Object.values(byProgram)) {
    p.completion_rate = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
    if (p.scores.length > 0) {
      p.avg_score = Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 10) / 10;
    }
  }

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const totalSubmissions = rows.length;
  const totalCompleted = rows.filter(r => r.status === "completed").length;
  const totalInProgress = rows.filter(r => r.status === "in_progress").length;
  const overallCompletionRate = totalSubmissions > 0 ? Math.round((totalCompleted / totalSubmissions) * 100) : 0;
  const scoredRows = rows.filter(r => r.total_score != null);
  const overallAvgScore = scoredRows.length > 0
    ? Math.round((scoredRows.reduce((s, r) => s + (r.total_score ?? 0), 0) / scoredRows.length) * 10) / 10
    : null;

  return NextResponse.json({
    summary: {
      total: totalSubmissions,
      completed: totalCompleted,
      in_progress: totalInProgress,
      abandoned: totalSubmissions - totalCompleted - totalInProgress,
      completion_rate: overallCompletionRate,
      avg_score: overallAvgScore,
      unique_templates: Object.keys(byTemplate).length,
    },
    by_template: Object.values(byTemplate).sort((a, b) => b.total - a.total),
    by_program: Object.values(byProgram).sort((a, b) => b.total - a.total),
  });
}
