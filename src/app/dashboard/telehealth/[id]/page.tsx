"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AppointmentTelehealth {
  id: string;
  appointment_date: string;
  start_time: string | null;
  duration_minutes: number;
  appointment_type: string | null;
  client_id: string;
  is_telehealth: boolean;
  telehealth_platform: string | null;
  meeting_url: string | null;
  meeting_id: string | null;
  meeting_password: string | null;
  telehealth_started_at: string | null;
  telehealth_ended_at: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  mrn: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  webex: "Webex",
  jitsi: "Kinship Video (Jitsi)",
  existing: "Video",
};

const PLATFORM_ICONS: Record<string, string> = {
  zoom: "🎥",
  webex: "📡",
  jitsi: "🎬",
};

/** Platforms that support direct iframe embedding */
const EMBEDDABLE_PLATFORMS = new Set(["jitsi"]);

export default function TelehealthRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<AppointmentTelehealth | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const loadAppointment = useCallback(async () => {
    const res = await fetch(`/api/telehealth/session?appointment_id=${params.id}`, { credentials: "include" });
    if (!res.ok) {
      // Try the basic appointment endpoint
      const apptRes = await fetch(`/api/appointments/${params.id}`, { credentials: "include" });
      if (apptRes.ok) {
        const d = await apptRes.json() as { appointment: AppointmentTelehealth };
        setAppt(d.appointment);
        loadClient(d.appointment.client_id);
      } else {
        setError("Appointment not found");
      }
    } else {
      const d = await res.json() as { appointment: AppointmentTelehealth };
      setAppt(d.appointment);
      loadClient(d.appointment.client_id);
      if (d.appointment.telehealth_started_at && !d.appointment.telehealth_ended_at) {
        setSessionStarted(true);
      }
    }
    setLoading(false);
  }, [params.id]);

  async function loadClient(clientId: string) {
    const res = await fetch(`/api/clients/${clientId}`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json() as { client: Client };
      setClient(d.client);
    }
  }

  useEffect(() => { loadAppointment(); }, [loadAppointment]);

  // Elapsed timer when session is active
  useEffect(() => {
    if (!sessionStarted || !appt?.telehealth_started_at) return;
    const startMs = new Date(appt.telehealth_started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionStarted, appt?.telehealth_started_at]);

  async function createSession(platform: "zoom" | "webex" | "jitsi" | "auto" = "auto") {
    setCreating(true);
    setError("");
    const res = await fetch("/api/telehealth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ appointment_id: params.id, platform }),
    });
    const data = await res.json() as { error?: string; appointment?: AppointmentTelehealth };
    if (!res.ok) {
      setError(data.error || "Failed to create session");
    } else {
      setAppt(data.appointment || null);
    }
    setCreating(false);
  }

  async function startSession() {
    const res = await fetch(`/api/appointments/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ telehealth_started_at: new Date().toISOString(), status: "arrived" }),
    });
    if (res.ok) {
      const d = await res.json() as { appointment: AppointmentTelehealth };
      setAppt(d.appointment);
      setSessionStarted(true);
    }
  }

  async function endSession() {
    setEnding(true);
    const res = await fetch(`/api/appointments/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ telehealth_ended_at: new Date().toISOString(), status: "completed" }),
    });
    if (res.ok) {
      router.push(`/dashboard/scheduling?date=${appt?.appointment_date}`);
    }
    setEnding(false);
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function formatApptTime(t: string | null) {
    if (!t) return "—";
    return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading telehealth session...</div>
      </div>
    );
  }

  if (error && !appt) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <p className="text-red-700 font-medium">{error}</p>
        <Link href="/dashboard/scheduling" className="mt-4 inline-block text-sm text-teal-600 hover:text-teal-700 font-medium">← Back to Scheduling</Link>
      </div>
    );
  }

  const platform = appt?.telehealth_platform || null;
  const meetingUrl = appt?.meeting_url || null;
  const canEmbed = platform ? EMBEDDABLE_PLATFORMS.has(platform) : false;
  const clientName = client ? `${client.last_name}, ${client.first_name}${client.preferred_name ? ` "${client.preferred_name}"` : ""}` : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/scheduling?date=${appt?.appointment_date}`} className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🎥 Telehealth Session
              {sessionStarted && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                  Live · {formatTime(elapsed)}
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {appt?.appointment_date && new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {appt?.start_time && ` · ${formatApptTime(appt.start_time)}`}
              {appt?.duration_minutes && ` · ${appt.duration_minutes} min`}
            </p>
          </div>
        </div>

        {sessionStarted && (
          <button onClick={endSession} disabled={ending}
            className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-400 disabled:opacity-50 transition-colors">
            {ending ? "Ending..." : "End Session"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Video panel */}
        <div className="col-span-2 space-y-4">
          {!meetingUrl ? (
            /* No meeting created yet */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-5">
              <div className="text-5xl">🎥</div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Start a Video Session</h2>
                <p className="text-slate-500 text-sm">Choose your preferred video platform or use Kinship Video (free, no account required).</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <button onClick={() => createSession("zoom")} disabled={creating}
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-all disabled:opacity-50">
                  <span className="text-2xl">🎥</span>
                  <span className="text-xs font-semibold text-slate-700">Zoom</span>
                  {!process.env.NEXT_PUBLIC_ZOOM_CONFIGURED && <span className="text-[10px] text-slate-400">Requires API keys</span>}
                </button>
                <button onClick={() => createSession("webex")} disabled={creating}
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-all disabled:opacity-50">
                  <span className="text-2xl">📡</span>
                  <span className="text-xs font-semibold text-slate-700">Webex</span>
                  {!process.env.NEXT_PUBLIC_WEBEX_CONFIGURED && <span className="text-[10px] text-slate-400">Requires API keys</span>}
                </button>
                <button onClick={() => createSession("jitsi")} disabled={creating}
                  className="flex flex-col items-center gap-2 p-4 border border-teal-300 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all disabled:opacity-50">
                  <span className="text-2xl">🎬</span>
                  <span className="text-xs font-semibold text-teal-700">Kinship Video</span>
                  <span className="text-[10px] text-teal-500">Free · No signup</span>
                </button>
              </div>

              <button onClick={() => createSession("auto")} disabled={creating}
                className="bg-teal-500 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-colors">
                {creating ? "Creating session..." : "Launch Session (Auto)"}
              </button>
            </div>
          ) : canEmbed ? (
            /* Embeddable platform (Jitsi) */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  {PLATFORM_ICONS[platform || ""] || "🎥"} {PLATFORM_LABELS[platform || ""] || "Video Session"}
                </span>
                <div className="flex items-center gap-2">
                  <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium">Open in new tab ↗</a>
                  {!sessionStarted && (
                    <button onClick={startSession}
                      className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-400 transition-colors">
                      Mark Started
                    </button>
                  )}
                </div>
              </div>
              <iframe
                src={meetingUrl}
                className="w-full"
                style={{ height: "520px" }}
                allow="camera; microphone; display-capture; fullscreen"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                title="Telehealth Video Session"
              />
            </div>
          ) : (
            /* External platform (Zoom/Webex) — open in new tab */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
              <div className="text-5xl">{PLATFORM_ICONS[platform || ""] || "🎥"}</div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  {PLATFORM_LABELS[platform || ""] || "Video"} Session Ready
                </h2>
                <p className="text-slate-500 text-sm">Click below to launch the {PLATFORM_LABELS[platform || ""] || "video"} meeting in a new window.</p>
              </div>

              {appt?.meeting_id && (
                <div className="bg-slate-50 rounded-xl p-4 text-left space-y-1.5 max-w-xs mx-auto">
                  <div className="text-xs text-slate-500"><span className="font-semibold">Meeting ID:</span> {appt.meeting_id}</div>
                  {appt.meeting_password && <div className="text-xs text-slate-500"><span className="font-semibold">Password:</span> {appt.meeting_password}</div>}
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
                  onClick={!sessionStarted ? startSession : undefined}
                  className="bg-teal-500 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-teal-400 transition-colors inline-flex items-center gap-2">
                  🚀 Join {PLATFORM_LABELS[platform || ""] || "Video"} Meeting
                  <span className="text-xs opacity-75">↗ opens new tab</span>
                </a>
                {!sessionStarted && (
                  <button onClick={startSession} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Mark session as started without opening link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Session details panel */}
        <div className="space-y-4">
          {/* Client info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Client</h3>
            <p className="font-semibold text-slate-900 text-sm">{clientName}</p>
            {client?.mrn && <p className="text-xs text-slate-400 mt-0.5">MRN: {client.mrn}</p>}
            {client && (
              <Link href={`/dashboard/clients/${client.id}`}
                className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium block">
                View client record →
              </Link>
            )}
          </div>

          {/* Session info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900 text-xs">{appt?.appointment_type || "Telehealth"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform</span>
                <span className="font-medium text-slate-900 text-xs">{platform ? PLATFORM_LABELS[platform] || platform : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900 text-xs">{appt?.duration_minutes || 60} min</span>
              </div>
              {appt?.telehealth_started_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Started</span>
                  <span className="font-medium text-slate-900 text-xs">
                    {new Date(appt.telehealth_started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {sessionStarted && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Elapsed</span>
                  <span className="font-semibold text-emerald-600 text-xs">{formatTime(elapsed)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>
            <Link href={`/dashboard/encounters/new?client_id=${appt?.client_id}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-teal-600 py-1.5">
              ⚕️ Start Encounter
            </Link>
            <Link href={`/dashboard/notes?client_id=${appt?.client_id}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-teal-600 py-1.5">
              📝 Clinical Notes
            </Link>
            <Link href={`/dashboard/clients/${appt?.client_id}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-teal-600 py-1.5">
              👤 Client Record
            </Link>
          </div>

          {meetingUrl && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Share Link (Staff)</p>
              <p className="text-xs text-slate-600 break-all font-mono bg-white rounded-lg p-2 border border-slate-200">{meetingUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(meetingUrl)}
                className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
                📋 Copy link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
