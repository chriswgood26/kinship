import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAppointmentReminder } from "@/lib/appointmentReminders";
import { getOrgId } from "@/lib/getOrgId";
import { triggerCommEvent } from "@/lib/commEngine";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const orgId = await getOrgId(userId);
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
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
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email/SMS (fire-and-forget — don't block response)
  if (orgId && data) {
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
          // Try comm engine rules first; fall back to legacy reminder if no rules configured
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
            // No rules fired — use legacy appointment reminder
            await sendAppointmentReminder(data, clientRes.data, orgRes.data, "confirmation");
          }
        }
      } catch (e) {
        console.error("Failed to send appointment confirmation:", e);
      }
    })();
  }

  return NextResponse.json({ appointment: data }, { status: 201 });
}
