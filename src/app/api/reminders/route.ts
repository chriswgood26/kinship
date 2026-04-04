// GET /api/reminders — Vercel Cron endpoint (runs every hour)
// Sends: 24hr reminders, 1hr reminders, no-show follow-ups
// Secured by CRON_SECRET env var (set in Vercel dashboard)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAppointmentReminder, appointmentDatetime } from "@/lib/appointmentReminders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const results = {
    reminder_24h: { checked: 0, sent: 0 },
    reminder_1h: { checked: 0, sent: 0 },
    no_show_followup: { checked: 0, sent: 0 },
  };

  try {
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Fetch upcoming appointments (today + tomorrow)
    const { data: upcoming, error: upcomingErr } = await supabaseAdmin
      .from("appointments")
      .select("id, organization_id, client_id, appointment_date, start_time, appointment_type, duration_minutes, status, client:client_id(first_name, last_name, preferred_name, email, phone_primary), org:organization_id(name, phone, plan, addons)")
      .in("status", ["scheduled", "confirmed"])
      .in("appointment_date", [todayStr, tomorrowStr])
      .order("appointment_date")
      .order("start_time");

    if (upcomingErr) {
      console.error("Reminders: failed to fetch upcoming appointments", upcomingErr);
      return NextResponse.json({ error: upcomingErr.message }, { status: 500 });
    }

    for (const appt of upcoming ?? []) {
      const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
      const org = Array.isArray(appt.org) ? appt.org[0] : appt.org;
      if (!client || !org) continue;

      const apptTime = appointmentDatetime(appt);
      const diffMs = apptTime.getTime() - now.getTime();
      const diffMin = diffMs / 60000;

      // 24hr reminder: appointment is 23-25 hours away
      if (diffMin >= 23 * 60 && diffMin < 25 * 60) {
        results.reminder_24h.checked++;
        const { emailSent, smsSent } = await sendAppointmentReminder(
          appt, client, org, "reminder_24h",
        );
        if (emailSent || smsSent) results.reminder_24h.sent++;
      }

      // 1hr reminder: appointment is 50-70 minutes away
      if (diffMin >= 50 && diffMin < 70) {
        results.reminder_1h.checked++;
        const { emailSent, smsSent } = await sendAppointmentReminder(
          appt, client, org, "reminder_1h",
        );
        if (emailSent || smsSent) results.reminder_1h.sent++;
      }
    }

    // No-show follow-up: today's scheduled/confirmed appointments whose time has passed
    const { data: pastToday, error: pastErr } = await supabaseAdmin
      .from("appointments")
      .select("id, organization_id, client_id, appointment_date, start_time, appointment_type, duration_minutes, status, client:client_id(first_name, last_name, preferred_name, email, phone_primary), org:organization_id(name, phone, plan, addons)")
      .in("status", ["scheduled", "confirmed"])
      .eq("appointment_date", todayStr);

    if (pastErr) {
      console.error("Reminders: failed to fetch past appointments", pastErr);
    } else {
      for (const appt of pastToday ?? []) {
        const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
        const org = Array.isArray(appt.org) ? appt.org[0] : appt.org;
        if (!client || !org) continue;

        const apptTime = appointmentDatetime(appt);
        const endTime = new Date(apptTime.getTime() + ((appt.duration_minutes ?? 60) * 60000));
        const minutesSinceEnd = (now.getTime() - endTime.getTime()) / 60000;

        // 30-180 minutes after scheduled end (missed window)
        if (minutesSinceEnd >= 30 && minutesSinceEnd < 180) {
          results.no_show_followup.checked++;
          const { emailSent, smsSent } = await sendAppointmentReminder(
            appt, client, org, "no_show_followup",
          );
          if (emailSent || smsSent) results.no_show_followup.sent++;
        }
      }
    }
  } catch (e) {
    console.error("Reminders cron error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  console.log("Reminders cron completed:", results);
  return NextResponse.json({ ok: true, results, ran_at: now.toISOString() });
}
