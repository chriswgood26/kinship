import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ codes: [] });

  // Search code (prefix match), description (any position), and category (any position)
  const { data } = await supabaseAdmin
    .from("icd10_codes")
    .select("code, description, category")
    .or(`code.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .eq("billable", true)
    .order("code")
    .limit(20);

  if (!data) return NextResponse.json({ codes: [] });

  // Sort: exact code match first, then code starts-with, then description matches
  const ql = q.toLowerCase();
  const sorted = [...data].sort((a, b) => {
    const aCode = a.code.toLowerCase();
    const bCode = b.code.toLowerCase();
    const aExact = aCode === ql ? 0 : aCode.startsWith(ql) ? 1 : 2;
    const bExact = bCode === ql ? 0 : bCode.startsWith(ql) ? 1 : 2;
    if (aExact !== bExact) return aExact - bExact;
    return a.code.localeCompare(b.code);
  });

  return NextResponse.json({ codes: sorted.slice(0, 12) });
}
