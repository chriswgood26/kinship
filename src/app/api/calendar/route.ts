import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

/** Format a date+time into iCal DTSTART/DTEND format (local, no timezone). */
function icalDateTime(dateStr: string, timeStr: string | null): string {
  if (!timeStr) return dateStr.replace(/-/g, "");
  const [h, m] = timeStr.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** GET /api/calendar?days=30&format=ics — returns iCal feed */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const orgId = await getOrgId(userId);

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const format = searchParams.get("format") || "ics";

  const today = new Date().toISOString().split("T")[0];
  const until = new Date(); until.setDate(until.getDate() + days);
  const untilStr = until.toISOString().split("T")[0];

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name), provider:provider_id(first_name, last_name)")
    .eq("organization_id", orgId || "")
    .gte("appointment_date", today)
    .lte("appointment_date", untilStr)
    .neq("status", "cancelled")
    .order("appointment_date")
    .order("start_time");

  const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId || "").single();

  if (format === "json") {
    return NextResponse.json({ appointments: appointments || [], org: org?.name });
  }

  // Build iCal
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Kinship EHR//EN`,
    `X-WR-CALNAME:${escapeIcal(org?.name || "Kinship Schedule")}`,
    "X-WR-TIMEZONE:America/New_York",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const appt of appointments || []) {
    const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
    const provider = Array.isArray(appt.provider) ? appt.provider[0] : appt.provider;

    const dtstart = icalDateTime(appt.appointment_date, appt.start_time);
    let dtend = dtstart;
    if (appt.end_time) {
      dtend = icalDateTime(appt.appointment_date, appt.end_time);
    } else if (appt.duration_minutes) {
      const [h, m] = (appt.start_time || "09:00").split(":").map(Number);
      const totalMin = h * 60 + m + (appt.duration_minutes || 60);
      const endH = Math.floor(totalMin / 60);
      const endM = totalMin % 60;
      const [y, mo, d] = appt.appointment_date.split("-");
      dtend = `${y}${mo}${d}T${String(endH).padStart(2,"0")}${String(endM).padStart(2,"0")}00`;
    }

    const summary = appt.is_provider_only
      ? escapeIcal(appt.appointment_type || "Block")
      : client
        ? escapeIcal(`${client.last_name}, ${client.first_name} — ${appt.appointment_type || "Appointment"}`)
        : escapeIcal(appt.appointment_type || "Appointment");

    const description = [
      appt.appointment_type ? `Type: ${appt.appointment_type}` : "",
      provider ? `Provider: ${provider.first_name} ${provider.last_name}` : "",
      appt.is_telehealth ? "Telehealth video session" : "",
      appt.notes ? `Notes: ${appt.notes}` : "",
    ].filter(Boolean).join("\\n");

    const uid = `${appt.id}@kinship-ehr`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const vevent = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      appt.start_time ? `DTSTART:${dtstart}` : `DTSTART;VALUE=DATE:${dtstart}`,
      appt.end_time || appt.start_time ? `DTEND:${dtend}` : `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      `STATUS:${appt.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      appt.meeting_url ? `LOCATION:${escapeIcal(appt.meeting_url)}` : "",
      "END:VEVENT",
    ].filter(l => l !== "");
    lines.push(...vevent);
  }

  lines.push("END:VCALENDAR");

  const icsContent = lines.join("\r\n");

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=kinship-schedule.ics",
      "Cache-Control": "no-store",
    },
  });
}
