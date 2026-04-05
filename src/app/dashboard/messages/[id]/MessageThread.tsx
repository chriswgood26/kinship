"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender_clerk_id: string;
  sender_name: string | null;
  body: string;
  is_system: boolean;
  created_at: string;
}

interface Props {
  threadId: string;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
}

export default function MessageThread({ threadId, messages: initialMessages, currentUserId, currentUserName }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages/${threadId}`, { credentials: "include" });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    }, 15000);
    return () => clearInterval(interval);
  }, [threadId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, sender_name: currentUserName }),
    });
    setBody("");
    setSending(false);
    router.refresh();
    // Immediately fetch new messages
    const res = await fetch(`/api/messages/${threadId}`, { credentials: "include" });
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8">No messages yet. Start the conversation.</div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_clerk_id === currentUserId;
          const isSystem = msg.is_system;
          return (
            <div key={msg.id} className={`flex ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}>
              {isSystem ? (
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full">{msg.body}</div>
              ) : (
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-xs text-slate-400 px-1">{msg.sender_name || "Unknown"}</span>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm ${
                    isMe ? "bg-teal-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"
                  }`}>
                    {msg.body}
                  </div>
                  <span className="text-xs text-slate-400 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* HIPAA notice */}
      <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-600 text-center">
        ⚕️ Secure internal messaging — reference patients by MRN only, no PHI in message body
      </div>

      {/* Reply box */}
      <form onSubmit={handleSend} className="border-t border-slate-100 p-4 flex gap-3">
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button type="submit" disabled={sending || !body.trim()}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
