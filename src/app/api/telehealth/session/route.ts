import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { hasFeature } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Telehealth platform helpers
// ---------------------------------------------------------------------------

/** Generate a Jitsi Meet room URL (free, open-source — no credentials needed) */
function generateJitsiRoom(appointmentId: string): { platform: string; meeting_url: string; meeting_id: string; meeting_password: string | null } {
  // Use a deterministic but non-guessable room name derived from the appointment id
  const roomName = `kinship-${appointmentId.replace(/-/g, "").slice(0, 20)}`;
  return {
    platform: "jitsi",
    meeting_url: `https://meet.jit.si/${roomName}`,
    meeting_id: roomName,
    meeting_password: null,
  };
}

/** Create a Zoom meeting via Zoom Server-to-Server OAuth */
async function createZoomMeeting(topic: string, startTime: string, durationMin: number): Promise<{ platform: string; meeting_url: string; meeting_id: string; meeting_password: string | null } | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;

  try {
    // Get access token
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json() as { access_token: string };

    // Create meeting
    const meetRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration: durationMin,
        settings: {
          waiting_room: true,
          join_before_host: false,
          mute_upon_entry: true,
          auto_recording: "none",
        },
      }),
    });
    if (!meetRes.ok) return null;
    const meeting = await meetRes.json() as { join_url: string; id: number; password?: string };
    return {
      platform: "zoom",
      meeting_url: meeting.join_url,
      meeting_id: String(meeting.id),
      meeting_password: meeting.password || null,
    };
  } catch {
    return null;
  }
}

/** Create a Webex meeting via Webex REST API */
async function createWebexMeeting(title: string, startTime: string, durationMin: number): Promise<{ platform: string; meeting_url: string; meeting_id: string; meeting_password: string | null } | null> {
  const accessToken = process.env.WEBEX_ACCESS_TOKEN;
  if (!accessToken) return null;

  try {
    const endTime = new Date(new Date(startTime).getTime() + durationMin * 60000).toISOString();
    const res = await fetch("https://webexapis.com/v1/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        start: startTime,
        end: endTime,
        enabledAutoRecordMeeting: false,
        enableConnectAudioBeforeHost: false,
        joinBeforeHostMinutes: 0,
      }),
    });
    if (!res.ok) return null;
    const meeting = await res.json() as { webLink: string; id: string; password?: string };
    return {
      platform: "webex",
      meeting_url: meeting.webLink,
      meeting_id: meeting.id,
      meeting_password: meeting.password || null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/telehealth/session  — Create / assign a meeting to an appointment
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json() as {
    appointment_id: string;
    platform?: "zoom" | "webex" | "jitsi" | "auto";
  };

  if (!body.appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  // Verify appointment belongs to org
  const { data: appt, error: apptErr } = await supabaseAdmin
    .from("appointments")
    .select("id, organization_id, appointment_date, start_time, duration_minutes, appointment_type, client_id, meeting_url")
    .eq("id", body.appointment_id)
    .eq("organization_id", orgId)
    .single();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Check plan feature
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan, addons")
    .eq("id", orgId)
    .single();

  if (!hasFeature(org?.plan, "telehealth", org?.addons)) {
    return NextResponse.json({ error: "Telehealth not available on your current plan. Upgrade to Growth or higher." }, { status: 403 });
  }

  // If meeting already exists, return it
  if (appt.meeting_url) {
    return NextResponse.json({ meeting_url: appt.meeting_url, platform: "existing", appointment: appt });
  }

  // Determine platform preference
  const preferredPlatform = body.platform || "auto";
  const startIso = appt.appointment_date && appt.start_time
    ? `${appt.appointment_date}T${appt.start_time}`
    : new Date().toISOString();
  const durationMin: number = (appt.duration_minutes as number) || 60;
  const topic = `Kinship Telehealth - ${appt.appointment_date}`;

  let meetingInfo: { platform: string; meeting_url: string; meeting_id: string; meeting_password: string | null } | null = null;

  if (preferredPlatform === "zoom" || preferredPlatform === "auto") {
    meetingInfo = await createZoomMeeting(topic, startIso, durationMin);
  }
  if (!meetingInfo && (preferredPlatform === "webex" || preferredPlatform === "auto")) {
    meetingInfo = await createWebexMeeting(topic, startIso, durationMin);
  }
  if (!meetingInfo) {
    // Fall back to Jitsi (always available, no credentials required)
    meetingInfo = generateJitsiRoom(body.appointment_id);
  }

  // Save meeting info to appointment
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("appointments")
    .update({
      is_telehealth: true,
      telehealth_platform: meetingInfo.platform,
      meeting_url: meetingInfo.meeting_url,
      meeting_id: meetingInfo.meeting_id,
      meeting_password: meetingInfo.meeting_password,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.appointment_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    meeting_url: meetingInfo.meeting_url,
    meeting_id: meetingInfo.meeting_id,
    meeting_password: meetingInfo.meeting_password,
    platform: meetingInfo.platform,
    appointment: updated,
  }, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/telehealth/session?appointment_id=xxx  — Retrieve session info
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const apptId = req.nextUrl.searchParams.get("appointment_id");

  if (!apptId) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  const { data: appt, error } = await supabaseAdmin
    .from("appointments")
    .select("id, organization_id, appointment_date, start_time, duration_minutes, appointment_type, client_id, is_telehealth, telehealth_platform, meeting_url, meeting_id, meeting_password, telehealth_started_at, telehealth_ended_at")
    .eq("id", apptId)
    .eq("organization_id", orgId)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ appointment: appt });
}
