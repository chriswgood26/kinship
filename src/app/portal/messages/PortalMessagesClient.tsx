"use client";

import { useState, useRef, useEffect } from "react";

interface PortalMessage {
  id: string;
  direction: "inbound" | "outbound";
  subject: string | null;
  body: string;
  sender_name: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  initialMessages: PortalMessage[];
  portalUserId: string;
  clientId: string;
}

export default function PortalMessagesClient({ initialMessages, portalUserId, clientId }: Props) {
  const [messages, setMessages] = useState<PortalMessage[]>(initialMessages);
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark outbound (staff) messages as read on mount
  useEffect(() => {
    fetch(`/api/portal/messages/read?client_id=${clientId}&direction=outbound`, {
      method: "PATCH",
      credentials: "include",
    });
  }, [clientId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: clientId,
        portal_user_id: portalUserId,
        direction: "inbound",
        subject: subject.trim() || null,
        body: body.trim(),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.message) {
        setMessages(prev => [...prev, json.message]);
      }
      setSent(true);
      setSubject("");
      setBody("");
      setShowCompose(false);
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setShowCompose(!showCompose); setSent(false); }}
        className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm"
      >
        ✉️ New Message to Care Team
      </button>

      {sent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          ✅ Message sent! Your care team will respond within 1–2 business days.
        </div>
      )}

      {showCompose && (
        <form onSubmit={sendMessage} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">New Message</h3>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
            ⚠️ For medical emergencies, call 911. This system is not monitored 24/7.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900"
              placeholder="e.g. Question about my appointment"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Message *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900 placeholder-slate-400"
              placeholder="Write your message here..."
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      )}

      {/* Message thread */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Message History</h2>
        </div>
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-3xl mb-2">💬</div>
            <p>No messages yet</p>
            <p className="text-xs mt-1">Use the button above to send a message to your care team</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[560px] overflow-y-auto">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`px-5 py-4 flex gap-3 ${msg.direction === "inbound" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  msg.direction === "outbound" ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {msg.direction === "outbound" ? "C" : "Me"}
                </div>

                {/* Bubble */}
                <div className={`flex-1 max-w-[80%] flex flex-col ${msg.direction === "inbound" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {msg.direction === "outbound" ? (msg.sender_name || "Care Team") : "You"}
                    </span>
                    {!msg.is_read && msg.direction === "outbound" && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">New</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(msg.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  {msg.subject && (
                    <div className="text-xs font-semibold text-slate-600 mb-1">{msg.subject}</div>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.direction === "inbound"
                      ? "bg-teal-500 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`}>
                    {msg.body}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
