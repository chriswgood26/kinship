import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAppointmentReminder } from "@/lib/appointmentReminders";
import { getOrgId } from "@/lib/getOrgId";
import { triggerCommEvent } from "@/lib/commEngine";

/** Expand a recurrence rule into future dates (max 52 occurrences). */
function expandRecurrence(startDate: string, rule: string, endDate: string | null | undefined): string[] {
  const dates: string[] = [];
  const ruleUpper = rule.toUpperCase();
  const freqMatch = ruleUpper.match(/FREQ=(\w+)/);
  const byDayMatch = ruleUpper.match(/BYDAY=([\w,]+)/);
  const countMatch = ruleUpper.match(/COUNT=(\d+)/);
  const intervalMatch = ruleUpper.match(/INTERVAL=(\d+)/);

  if (!freqMatch) return dates;
  const freq = freqMatch[1]; // DAILY | WEEKLY | MONTHLY
  const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1;
  const maxCount = countMatch ? parseInt(countMatch[1]) : 52;
  const limitDate = endDate ? new Date(endDate + "T12:00:00") : null;

  const DAY_ABBR: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byDays = byDayMatch ? byDayMatch[1].split(",").map(d => DAY_ABBR[d]).filter(n => n !== undefined) : [];

  let current = new Date(startDate + "T12:00:00");
  // Skip start date — caller already created the parent
  let count = 0;

  for (let i = 0; i < 500 && count < maxCount; i++) {
    if (freq === "DAILY") {
      current = new Date(current); current.setDate(current.getDate() + interval);
    } else if (freq === "WEEKLY") {
      if (byDays.length > 0) {
        // Advance one day at a time, collect matching days within weekly interval windows
        current = new Date(current); current.setDate(current.getDate() + 1);
        if (!byDays.includes(current.getDay())) continue;
      } else {
        current = new Date(current); current.setDate(current.getDate() + (7 * interval));
      }
    } else if (freq === "MONTHLY") {
      current = new Date(current); current.setMonth(current.getMonth() + interval);
    } else break;

    if (limitDate && current > limitDate) break;
    const iso = current.toISOString().split("T")[0];
    if (!dates.includes(iso)) {
      dates.push(iso);
      count++;
    }
  }
  return dates;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const orgId = await getOrgId(userId);

  const isProviderOnly = body.is_provider_only || (!body.client_id);
  const basePayload = {
    organization_id: orgId,
    client_id: body.client_id || null,
    provider_id: body.provider_id || null,
    is_provider_only: isProviderOnly,
    appointment_date: body.appointment_date,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    duration_minutes: body.duration_minutes || 60,
    appointment_type: body.appointment_type || null,
    status: body.status || "scheduled",
    notes: body.notes || null,
    is_telehealth: body.is_telehealth || false,
    telehealth_platform: body.telehealth_platform || null,
    meeting_url: body.meeting_url || null,
    recurrence_rule: body.recurrence_rule || null,
    recurrence_end_date: body.recurrence_end_date || null,
  };

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert(basePayload)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create recurring instances if rule provided
  let instanceCount = 0;
  if (body.recurrence_rule && data) {
    const futureDates = expandRecurrence(body.appointment_date, body.recurrence_rule, body.recurrence_end_date);
    if (futureDates.length > 0) {
      const instances = futureDates.map(d => ({
        ...basePayload,
        appointment_date: d,
        recurrence_rule: null, // instances don't carry the rule
        parent_appointment_id: data.id,
        is_recurring_instance: true,
      }));
      const { error: instErr } = await supabaseAdmin.from("appointments").insert(instances);
      if (!instErr) instanceCount = futureDates.length;
    }
  }

  // Send confirmation email/SMS (fire-and-forget — don't block response)
  if (orgId && data && data.client_id) {
    (async () => {
      try {
        const [clientRes, orgRes] = await Promise.all([
          supabaseAdmin
            .from("clients")
            .select("first_name, last_name, preferred_name, email, phone_primary")
            .eq("id", data.client_id)
            .single(),
          supabaseAdmin
            .from("organizations")
            .select("name, phone, plan, addons")
            .eq("id", orgId)
            .single(),
        ]);
        if (clientRes.data && orgRes.data) {
          const engineResult = await triggerCommEvent({
            orgId,
            eventTrigger: "appointment_scheduled",
            clientId: data.client_id,
            templateVars: {
              appointment_date: data.appointment_date,
              appointment_time: data.start_time || "",
              appointment_type: data.appointment_type || "",
            },
          });
          if (engineResult.sent === 0) {
            await sendAppointmentReminder(data, clientRes.data, orgRes.data, "confirmation");
          }
        }
      } catch (e) {
        console.error("Failed to send appointment confirmation:", e);
      }
    })();
  }

  return NextResponse.json({ appointment: data, recurring_instances_created: instanceCount }, { status: 201 });
}
