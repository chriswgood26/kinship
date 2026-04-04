"use client";

import { useState, useEffect, useRef } from "react";

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
  clientId: string;
}

export default function ClientMessagesPanel({ clientId }: Props) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    setLoading(true);
    const res = await fetch(`/api/portal/messages?client_id=${clientId}`, {
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      setMessages(json.messages || []);
    }
    setLoading(false);
    // Mark inbound (patient) messages as read
    await fetch(`/api/portal/messages/read?client_id=${clientId}&direction=inbound`, {
      method: "PATCH",
      credentials: "include",
    });
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: clientId,
        direction: "outbound",
        subject: replySubject.trim() || null,
        body: replyBody.trim(),
      }),
    });
    setSending(false);
    setReplyBody("");
    setReplySubject("");
    setShowCompose(false);
    await loadMessages();
  }

  const unreadCount = messages.filter(m => !m.is_read && m.direction === "inbound").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Portal Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + Reply to Client
        </button>
      </div>

      {/* Compose panel */}
      {showCompose && (
        <form onSubmit={sendReply} className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Send Message to Client</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Subject</label>
            <input
              value={replySubject}
              onChange={e => setReplySubject(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900"
              placeholder="Optional subject line"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Message *</label>
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
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
              disabled={sending || !replyBody.trim()}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      )}

      {/* Message thread */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-900 text-sm">Message History</span>
          <button onClick={loadMessages} className="text-xs text-teal-600 hover:text-teal-700 font-medium">↻ Refresh</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-3xl mb-2">💬</div>
            <p>No portal messages yet</p>
            <p className="text-xs mt-1">Messages sent through the patient portal will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`px-5 py-4 flex gap-3 ${msg.direction === "outbound" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  msg.direction === "inbound" ? "bg-slate-200 text-slate-600" : "bg-teal-100 text-teal-700"
                }`}>
                  {msg.direction === "inbound" ? "P" : "S"}
                </div>

                {/* Bubble */}
                <div className={`flex-1 max-w-[80%] ${msg.direction === "outbound" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {msg.direction === "inbound"
                        ? (msg.sender_name || "Client")
                        : (msg.sender_name || "Care Team")}
                    </span>
                    {!msg.is_read && msg.direction === "inbound" && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">New</span>
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
                    msg.direction === "outbound"
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
