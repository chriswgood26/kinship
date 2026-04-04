// Patient Communications Automation Engine
// Event-triggered notifications with configurable rules, templates, opt-out tracking, and delivery reporting

import { sendEmail, sendSMS } from "@/lib/communications";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export type { CommEventTrigger } from "@/lib/commConstants";
export { TRIGGER_LABELS, TEMPLATE_VARIABLES } from "@/lib/commConstants";
import type { CommEventTrigger } from "@/lib/commConstants";

export interface TemplateVars {
  client_first_name?: string;
  client_last_name?: string;
  client_full_name?: string;
  client_preferred_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
  org_name?: string;
  org_phone?: string;
  clinician_name?: string;
  opt_out_text?: string;
  [key: string]: string | undefined;
}

// ─── Template interpolation ───────────────────────────────────────────────────

export function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Opt-out check ────────────────────────────────────────────────────────────

export async function isOptedOut(orgId: string, clientId: string, channel: "email" | "sms"): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("comm_opt_outs")
    .select("id")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .eq("is_active", true)
    .or(`channel.eq.${channel},channel.eq.all`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ─── Delivery logging ─────────────────────────────────────────────────────────

export async function logDelivery({
  orgId,
  ruleId,
  templateId,
  clientId,
  eventTrigger,
  channel,
  recipient,
  subject,
  body,
  status,
  error,
  externalId,
}: {
  orgId: string;
  ruleId?: string | null;
  templateId?: string | null;
  clientId?: string | null;
  eventTrigger: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  body?: string | null;
  status: "sent" | "failed" | "opted_out" | "pending";
  error?: string | null;
  externalId?: string | null;
}) {
  await supabaseAdmin.from("comm_delivery_log").insert({
    organization_id: orgId,
    rule_id: ruleId || null,
    template_id: templateId || null,
    client_id: clientId || null,
    event_trigger: eventTrigger,
    channel,
    recipient,
    subject: subject || null,
    body: body || null,
    delivery_status: status,
    delivery_error: error || null,
    external_id: externalId || null,
    sent_at: new Date().toISOString(),
  });
}

// ─── Main trigger function ────────────────────────────────────────────────────

export interface TriggerEventOptions {
  orgId: string;
  eventTrigger: CommEventTrigger;
  clientId?: string;
  templateVars?: TemplateVars;
}

export async function triggerCommEvent(opts: TriggerEventOptions): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const { orgId, eventTrigger, clientId, templateVars = {} } = opts;
  const stats = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] };

  // Fetch active rules for this trigger
  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from("comm_rules")
    .select("*, comm_templates(*)")
    .eq("organization_id", orgId)
    .eq("event_trigger", eventTrigger)
    .eq("is_active", true);

  if (rulesErr) {
    stats.errors.push(rulesErr.message);
    return stats;
  }

  if (!rules || rules.length === 0) return stats;

  // Fetch client info if clientId provided
  let client: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string | null;
    email?: string | null;
    phone_primary?: string | null;
  } | null = null;

  if (clientId) {
    const { data } = await supabaseAdmin
      .from("clients")
      .select("id, first_name, last_name, preferred_name, email, phone_primary")
      .eq("id", clientId)
      .single();
    client = data;
  }

  // Fetch org info for SMS eligibility
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name, phone, plan, addons")
    .eq("id", orgId)
    .single();

  const smsEnabled = org?.plan === "custom" || (org?.addons ?? []).includes("sms");

  // Build vars
  const resolvedVars: TemplateVars = {
    org_name: org?.name ?? "",
    org_phone: org?.phone ?? "",
    opt_out_text: "Reply STOP to opt out.",
    ...templateVars,
  };

  if (client) {
    resolvedVars.client_first_name = client.first_name;
    resolvedVars.client_last_name = client.last_name;
    resolvedVars.client_full_name = `${client.first_name} ${client.last_name}`;
    resolvedVars.client_preferred_name = client.preferred_name || client.first_name;
  }

  for (const rule of rules) {
    stats.processed++;
    const template = rule.comm_templates;
    if (!template) {
      stats.skipped++;
      continue;
    }

    const channels: Array<"email" | "sms"> =
      rule.channel === "both" ? ["email", "sms"] : [rule.channel as "email" | "sms"];

    for (const ch of channels) {
      if (ch === "sms" && !smsEnabled) {
        stats.skipped++;
        continue;
      }

      // Opt-out check
      if (clientId) {
        const optedOut = await isOptedOut(orgId, clientId, ch);
        if (optedOut) {
          await logDelivery({
            orgId,
            ruleId: rule.id,
            templateId: template.id,
            clientId,
            eventTrigger,
            channel: ch,
            recipient: ch === "email" ? (client?.email ?? "unknown") : (client?.phone_primary ?? "unknown"),
            subject: template.subject ? interpolate(template.subject, resolvedVars) : null,
            body: null,
            status: "opted_out",
          });
          stats.skipped++;
          continue;
        }
      }

      if (ch === "email") {
        if (!client?.email) { stats.skipped++; continue; }
        const subject = template.subject ? interpolate(template.subject, resolvedVars) : "Message from your care team";
        const bodyText = interpolate(template.body, resolvedVars);
        const html = template.channel === "email" || template.channel === "both"
          ? bodyText
          : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><p style="color:#1e293b;font-size:16px;line-height:1.6;">${bodyText.replace(/\n/g, "<br/>")}</p></div>`;

        const result = await sendEmail({ to: client.email, subject, html });
        await logDelivery({
          orgId,
          ruleId: rule.id,
          templateId: template.id,
          clientId: client.id,
          eventTrigger,
          channel: "email",
          recipient: client.email,
          subject,
          body: bodyText,
          status: result.success ? "sent" : "failed",
          error: result.error,
          externalId: result.id,
        });
        if (result.success) stats.sent++; else stats.errors.push(`Email to ${client.email}: ${result.error}`);

      } else if (ch === "sms") {
        if (!client?.phone_primary) { stats.skipped++; continue; }
        const smsBodyTemplate = (rule.channel === "both" && template.sms_body) ? template.sms_body : template.body;
        const body = interpolate(smsBodyTemplate, resolvedVars);

        const result = await sendSMS({ to: client.phone_primary, body });
        await logDelivery({
          orgId,
          ruleId: rule.id,
          templateId: template.id,
          clientId: client.id,
          eventTrigger,
          channel: "sms",
          recipient: client.phone_primary,
          body,
          status: result.success ? "sent" : "failed",
          error: result.error,
          externalId: result.sid,
        });
        if (result.success) stats.sent++; else stats.errors.push(`SMS to ${client.phone_primary}: ${result.error}`);
      }
    }
  }

  return stats;
}
