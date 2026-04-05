import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  // Fetch all timeline events in parallel
  const [
    { data: encounters },
    { data: assessments },
    { data: screenings },
    { data: referrals },
    { data: rois },
    { data: treatmentPlans },
    { data: portalMessages },
  ] = await Promise.all([
    supabaseAdmin.from("encounters").select("id, encounter_date, encounter_type, status, chief_complaint").eq("organization_id", orgId).eq("client_id", clientId).order("encounter_date", { ascending: false }).limit(20),
    supabaseAdmin.from("assessments").select("id, assessment_type, assessment_date, status, total_score, level_of_care, severity_label").eq("organization_id", orgId).eq("client_id", clientId).order("assessment_date", { ascending: false }).limit(20),
    supabaseAdmin.from("screenings").select("id, tool, administered_at, total_score, severity_label").eq("organization_id", orgId).eq("client_id", clientId).order("administered_at", { ascending: false }).limit(20),
    supabaseAdmin.from("referrals").select("id, referral_date, referral_type, referred_to, status, reason").eq("organization_id", orgId).eq("client_id", clientId).order("referral_date", { ascending: false }).limit(10),
    supabaseAdmin.from("releases_of_information").select("id, created_at, direction, recipient_name, purpose, status").eq("organization_id", orgId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("treatment_plans").select("id, created_at, status, next_review_date").eq("organization_id", orgId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("portal_messages").select("id, created_at, direction, subject, body").eq("organization_id", orgId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
  ]);

  // Build unified timeline
  const timeline: {
    id: string;
    date: string;
    type: string;
    icon: string;
    title: string;
    subtitle: string;
    badge?: string;
    badgeColor?: string;
    href: string;
    urgent?: boolean;
  }[] = [];

  for (const e of (encounters || [])) {
    timeline.push({
      id: `enc-${e.id}`,
      date: e.encounter_date + "T12:00:00",
      type: "encounter",
      icon: "⚕️",
      title: e.encounter_type?.replace(/_/g, " ") || "Encounter",
      subtitle: e.chief_complaint || "No chief complaint",
      badge: e.status === "signed" ? "Signed" : e.status === "in_progress" ? "In Progress" : e.status,
      badgeColor: e.status === "signed" ? "emerald" : "amber",
      href: `/dashboard/encounters/${e.id}`,
    });
  }

  for (const a of (assessments || [])) {
    const isHighRisk = a.severity_label?.includes("High") || a.severity_label?.includes("Imminent");
    timeline.push({
      id: `assess-${a.id}`,
      date: a.assessment_date + "T12:00:00",
      type: "assessment",
      icon: a.assessment_type === "BPS" ? "📋" : a.assessment_type?.includes("CANS") ? "📊" : "📊",
      title: a.assessment_type || "Assessment",
      subtitle: a.severity_label || (a.total_score !== null ? `Score: ${a.total_score}` : "") || a.level_of_care || "",
      badge: a.severity_label || (a.total_score !== null ? `${a.total_score}` : undefined) || undefined,
      badgeColor: isHighRisk ? "red" : "blue",
      href: `/dashboard/assessments`,
      urgent: isHighRisk,
    });
  }

  for (const s of (screenings || [])) {
    const isHighRisk = s.severity_label?.includes("High") || s.severity_label?.includes("Severe") || s.severity_label?.includes("Imminent");
    timeline.push({
      id: `screen-${s.id}`,
      date: s.administered_at,
      type: "screening",
      icon: "📋",
      title: s.tool?.toUpperCase() || "Screening",
      subtitle: s.severity_label || (s.total_score !== null ? `Score: ${s.total_score}` : ""),
      badge: s.severity_label || (s.total_score !== null ? `${s.total_score}` : undefined) || undefined,
      badgeColor: isHighRisk ? "red" : "blue",
      href: `/dashboard/screenings`,
      urgent: !!isHighRisk,
    });
  }

  for (const r of (referrals || [])) {
    timeline.push({
      id: `ref-${r.id}`,
      date: r.referral_date + "T12:00:00",
      type: "referral",
      icon: "🔄",
      title: `${r.referral_type?.charAt(0).toUpperCase()}${r.referral_type?.slice(1)} Referral`,
      subtitle: r.referred_to || r.reason || "",
      badge: r.status,
      badgeColor: r.status === "completed" ? "emerald" : "amber",
      href: `/dashboard/referrals`,
    });
  }

  for (const roi of (rois || [])) {
    timeline.push({
      id: `roi-${roi.id}`,
      date: roi.created_at,
      type: "roi",
      icon: "📄",
      title: `ROI — ${roi.direction}`,
      subtitle: `${roi.recipient_name} · ${roi.purpose}`,
      badge: roi.status?.replace("_", " "),
      badgeColor: roi.status === "active" ? "emerald" : "amber",
      href: `/dashboard/roi/${roi.id}`,
    });
  }

  for (const tp of (treatmentPlans || [])) {
    timeline.push({
      id: `tp-${tp.id}`,
      date: tp.created_at,
      type: "treatment_plan",
      icon: "📋",
      title: "Treatment Plan",
      subtitle: tp.next_review_date ? `Review due: ${new Date(tp.next_review_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "",
      badge: tp.status,
      badgeColor: tp.status === "active" ? "emerald" : "slate",
      href: `/dashboard/treatment-plans/${tp.id}`,
    });
  }

  for (const msg of (portalMessages || [])) {
    timeline.push({
      id: `msg-${msg.id}`,
      date: msg.created_at,
      type: "portal_message",
      icon: msg.direction === "inbound" ? "💬" : "📨",
      title: msg.direction === "inbound" ? "Client Message" : "Staff Message Sent",
      subtitle: msg.subject || msg.body?.slice(0, 60) + "..." || "",
      href: `/dashboard/clients/${clientId}`,
    });
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ timeline: timeline.slice(0, 100) });
}
