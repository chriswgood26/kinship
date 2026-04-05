import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  // Fetch all timeline events in parallel
  const [
    { data: encounters },
    { data: assessments },
    { data: vitals },
    { data: medications },
    { data: referrals },
    { data: rois },
    { data: incidents },
    { data: treatmentPlans },
    { data: portalMessages },
  ] = await Promise.all([
    supabaseAdmin.from("encounters").select("id, encounter_date, encounter_type, status, chief_complaint").eq("client_id", patientId).order("encounter_date", { ascending: false }).limit(20),
    supabaseAdmin.from("assessments").select("id, assessment_type, assessment_date, status, total_score, level_of_care, severity_label").eq("client_id", patientId).order("assessment_date", { ascending: false }).limit(20),
    supabaseAdmin.from("patient_vitals").select("id, recorded_at, systolic_bp, diastolic_bp, heart_rate, temperature_f, oxygen_saturation, pain_scale, weight_lbs").eq("client_id", patientId).order("recorded_at", { ascending: false }).limit(30),
    supabaseAdmin.from("medication_orders").select("id, medication_name, dosage, frequency, start_date, status").eq("client_id", patientId).order("start_date", { ascending: false }).limit(10),
    supabaseAdmin.from("referrals").select("id, referral_date, referral_type, referred_to, status, reason").eq("client_id", patientId).order("referral_date", { ascending: false }).limit(10),
    supabaseAdmin.from("releases_of_information").select("id, created_at, direction, recipient_name, purpose, status").eq("client_id", patientId).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("incident_reports").select("id, incident_date, incident_type, severity, status").eq("client_id", patientId).order("incident_date", { ascending: false }).limit(10),
    supabaseAdmin.from("treatment_plans").select("id, created_at, status, next_review_date").eq("client_id", patientId).order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("portal_messages").select("id, created_at, direction, subject, body").eq("client_id", patientId).order("created_at", { ascending: false }).limit(10),
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

  for (const v of (vitals || [])) {
    const abnormal = (v.systolic_bp && v.systolic_bp >= 140) || (v.oxygen_saturation && v.oxygen_saturation < 95) || (v.pain_scale && v.pain_scale >= 7);
    timeline.push({
      id: `vital-${v.id}`,
      date: v.recorded_at,
      type: "vitals",
      icon: "🩺",
      title: "Vitals Recorded",
      subtitle: [
        v.systolic_bp && v.diastolic_bp ? `BP ${v.systolic_bp}/${v.diastolic_bp}` : null,
        v.heart_rate ? `HR ${v.heart_rate}` : null,
        v.oxygen_saturation ? `O₂ ${v.oxygen_saturation}%` : null,
        v.pain_scale !== null && v.pain_scale !== undefined ? `Pain ${v.pain_scale}/10` : null,
      ].filter(Boolean).join(" · "),
      badge: abnormal ? "Abnormal" : undefined,
      badgeColor: "red",
      href: `/dashboard/clients/${patientId}/vitals`,
      urgent: !!abnormal,
    });
  }

  for (const m of (medications || [])) {
    timeline.push({
      id: `med-${m.id}`,
      date: m.start_date + "T08:00:00",
      type: "medication",
      icon: "💊",
      title: m.status === "active" ? "Medication Started" : "Medication Order",
      subtitle: `${m.medication_name} ${m.dosage} ${m.frequency}`,
      badge: m.status,
      badgeColor: m.status === "active" ? "emerald" : "slate",
      href: `/dashboard/emar`,
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

  for (const inc of (incidents || [])) {
    timeline.push({
      id: `inc-${inc.id}`,
      date: inc.incident_date + "T12:00:00",
      type: "incident",
      icon: "🚨",
      title: `Incident Report — ${inc.incident_type?.replace(/_/g, " ")}`,
      subtitle: `Severity: ${inc.severity}`,
      badge: inc.severity ?? undefined,
      badgeColor: inc.severity === "critical" || inc.severity === "serious" ? "red" : "amber",
      href: `/dashboard/incidents`,
      urgent: inc.severity === "critical",
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
      title: msg.direction === "inbound" ? "Patient Message" : "Staff Message Sent",
      subtitle: msg.subject || msg.body?.slice(0, 60) + "..." || "",
      href: `/dashboard/clients/${patientId}`,
    });
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ timeline: timeline.slice(0, 100) });
}
