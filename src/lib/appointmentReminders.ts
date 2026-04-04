// Appointment reminder helpers — sends email/SMS and logs to appointment_reminder_log
// Called from: POST /api/appointments (confirmation) and GET /api/reminders (cron: 24h, 1h, no-show)

import { sendEmail, sendSMS } from "@/lib/communications";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ReminderType = "confirmation" | "reminder_24h" | "reminder_1h" | "no_show_followup";

interface AppointmentInfo {
  id: string;
  organization_id: string;
  appointment_date: string; // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM:SS"
  appointment_type: string | null;
  duration_minutes: number | null;
}

interface ClientInfo {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  email?: string | null;
  phone_primary?: string | null;
}

interface OrgInfo {
  name: string;
  phone?: string | null;
  plan?: string | null;
  addons?: string[] | null;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function clientName(c: ClientInfo): string {
  return c.preferred_name || c.first_name;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function confirmationEmail(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): { subject: string; html: string } {
  const subject = `Your appointment is confirmed — ${formatDate(appt.appointment_date)}`;
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0d9488;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">${org.name}</h1>
  </div>
  <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:16px;margin-top:0">Hi ${clientName(client)},</p>
    <p>Your appointment has been scheduled. Here are the details:</p>
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Date:</strong> ${formatDate(appt.appointment_date)}</p>
      ${appt.start_time ? `<p style="margin:0 0 8px"><strong>Time:</strong> ${formatTime(appt.start_time)}</p>` : ""}
      ${appt.appointment_type ? `<p style="margin:0 0 8px"><strong>Type:</strong> ${appt.appointment_type}</p>` : ""}
      ${appt.duration_minutes ? `<p style="margin:0"><strong>Duration:</strong> ${appt.duration_minutes} minutes</p>` : ""}
    </div>
    <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    ${org.phone ? `<p>📞 <a href="tel:${org.phone}" style="color:#0d9488">${org.phone}</a></p>` : ""}
    <p style="margin-bottom:0;color:#64748b;font-size:13px">— ${org.name} Team</p>
  </div>
</div>`;
  return { subject, html };
}

function reminder24hEmail(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): { subject: string; html: string } {
  const subject = `Reminder: Your appointment is tomorrow — ${formatDate(appt.appointment_date)}`;
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0d9488;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">${org.name}</h1>
  </div>
  <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:16px;margin-top:0">Hi ${clientName(client)},</p>
    <p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p>
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Date:</strong> ${formatDate(appt.appointment_date)}</p>
      ${appt.start_time ? `<p style="margin:0 0 8px"><strong>Time:</strong> ${formatTime(appt.start_time)}</p>` : ""}
      ${appt.appointment_type ? `<p style="margin:0"><strong>Type:</strong> ${appt.appointment_type}</p>` : ""}
    </div>
    <p>Please arrive a few minutes early. If you need to reschedule, please contact us right away.</p>
    ${org.phone ? `<p>📞 <a href="tel:${org.phone}" style="color:#0d9488">${org.phone}</a></p>` : ""}
    <p style="margin-bottom:0;color:#64748b;font-size:13px">— ${org.name} Team</p>
  </div>
</div>`;
  return { subject, html };
}

function reminder1hEmail(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): { subject: string; html: string } {
  const subject = `Your appointment is in 1 hour — ${formatTime(appt.start_time)}`;
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0d9488;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">${org.name}</h1>
  </div>
  <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:16px;margin-top:0">Hi ${clientName(client)},</p>
    <p>Your appointment is coming up <strong>in about 1 hour</strong>.</p>
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin:20px 0">
      ${appt.start_time ? `<p style="margin:0 0 8px"><strong>Time:</strong> ${formatTime(appt.start_time)}</p>` : ""}
      ${appt.appointment_type ? `<p style="margin:0"><strong>Type:</strong> ${appt.appointment_type}</p>` : ""}
    </div>
    <p>We look forward to seeing you soon!</p>
    ${org.phone ? `<p>📞 <a href="tel:${org.phone}" style="color:#0d9488">${org.phone}</a></p>` : ""}
    <p style="margin-bottom:0;color:#64748b;font-size:13px">— ${org.name} Team</p>
  </div>
</div>`;
  return { subject, html };
}

function noShowFollowupEmail(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): { subject: string; html: string } {
  const subject = `We missed you today — ${formatDate(appt.appointment_date)}`;
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0d9488;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">${org.name}</h1>
  </div>
  <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:16px;margin-top:0">Hi ${clientName(client)},</p>
    <p>We noticed you weren't able to make it to your appointment today${appt.start_time ? ` at ${formatTime(appt.start_time)}` : ""}. We hope everything is okay.</p>
    <p>Please contact us to reschedule at your earliest convenience — we want to make sure you get the support you need.</p>
    ${org.phone ? `<p>📞 <a href="tel:${org.phone}" style="color:#0d9488">${org.phone}</a></p>` : ""}
    <p style="margin-bottom:0;color:#64748b;font-size:13px">— ${org.name} Team</p>
  </div>
</div>`;
  return { subject, html };
}

// ─── SMS templates ────────────────────────────────────────────────────────────

function confirmationSMS(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): string {
  return `${org.name}: Hi ${clientName(client)}, your appointment is confirmed for ${formatDate(appt.appointment_date)}${appt.start_time ? ` at ${formatTime(appt.start_time)}` : ""}. Reply STOP to opt out.`;
}

function reminder24hSMS(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): string {
  return `${org.name}: Reminder — you have an appointment TOMORROW, ${formatDate(appt.appointment_date)}${appt.start_time ? ` at ${formatTime(appt.start_time)}` : ""}. Call ${org.phone || "us"} to reschedule. Reply STOP to opt out.`;
}

function reminder1hSMS(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): string {
  return `${org.name}: Reminder — your appointment is in 1 hour${appt.start_time ? ` at ${formatTime(appt.start_time)}` : ""}. See you soon! Reply STOP to opt out.`;
}

function noShowFollowupSMS(appt: AppointmentInfo, client: ClientInfo, org: OrgInfo): string {
  return `${org.name}: Hi ${clientName(client)}, we missed you at your appointment today. Please call ${org.phone || "us"} to reschedule. Reply STOP to opt out.`;
}

// ─── Reminder log helpers ─────────────────────────────────────────────────────

async function hasReminderBeenSent(
  appointmentId: string,
  reminderType: ReminderType,
  channel: "email" | "sms",
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("appointment_reminder_log")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("reminder_type", reminderType)
    .eq("channel", channel)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function logReminder(
  orgId: string,
  appointmentId: string,
  reminderType: ReminderType,
  channel: "email" | "sms",
  recipient: string,
) {
  await supabaseAdmin.from("appointment_reminder_log").insert({
    organization_id: orgId,
    appointment_id: appointmentId,
    reminder_type: reminderType,
    channel,
    recipient,
  });
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function sendAppointmentReminder(
  appt: AppointmentInfo,
  client: ClientInfo,
  org: OrgInfo,
  reminderType: ReminderType,
  options: { skipDuplicateCheck?: boolean } = {},
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  let emailSent = false;
  let smsSent = false;

  // Determine SMS eligibility from org plan/addons
  const addons = org.addons ?? [];
  const smsEnabled =
    org.plan === "custom" ||
    addons.includes("sms");

  // ── Email ──
  if (client.email) {
    const alreadySent =
      !options.skipDuplicateCheck &&
      (await hasReminderBeenSent(appt.id, reminderType, "email"));

    if (!alreadySent) {
      let tmpl: { subject: string; html: string };
      if (reminderType === "confirmation") tmpl = confirmationEmail(appt, client, org);
      else if (reminderType === "reminder_24h") tmpl = reminder24hEmail(appt, client, org);
      else if (reminderType === "reminder_1h") tmpl = reminder1hEmail(appt, client, org);
      else tmpl = noShowFollowupEmail(appt, client, org);

      const result = await sendEmail({ to: client.email, ...tmpl });
      if (result.success) {
        await logReminder(appt.organization_id, appt.id, reminderType, "email", client.email);
        emailSent = true;
      }
    }
  }

  // ── SMS ──
  if (smsEnabled && client.phone_primary) {
    const alreadySent =
      !options.skipDuplicateCheck &&
      (await hasReminderBeenSent(appt.id, reminderType, "sms"));

    if (!alreadySent) {
      let body: string;
      if (reminderType === "confirmation") body = confirmationSMS(appt, client, org);
      else if (reminderType === "reminder_24h") body = reminder24hSMS(appt, client, org);
      else if (reminderType === "reminder_1h") body = reminder1hSMS(appt, client, org);
      else body = noShowFollowupSMS(appt, client, org);

      const result = await sendSMS({ to: client.phone_primary, body });
      if (result.success) {
        await logReminder(appt.organization_id, appt.id, reminderType, "sms", client.phone_primary);
        smsSent = true;
      }
    }
  }

  return { emailSent, smsSent };
}

// ─── Datetime helpers ─────────────────────────────────────────────────────────

/**
 * Combine appointment_date (YYYY-MM-DD) and start_time (HH:MM:SS) into a Date.
 * Falls back to 09:00 if start_time is missing.
 */
export function appointmentDatetime(appt: AppointmentInfo): Date {
  const time = appt.start_time ?? "09:00:00";
  return new Date(`${appt.appointment_date}T${time}`);
}
