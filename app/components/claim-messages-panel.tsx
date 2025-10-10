"use client";

import { useEffect, useMemo, useState } from "react";

type Author = {
  id?: string;
  first_name?: string;
  last_name?: string;
};

type Participant = {
  id?: string;
  role?: string;
  user?: Author;
};

type Message = {
  id: string;
  claim: string;
  body: string;
  parent_message?: string | null;
  thread_root?: string | null;
  date_created?: string | null;
  author_participant?: Participant;
  attachments?: Array<{ id: string; filename_download: string }>;
};

export function ClaimMessagesPanel({ claimId }: { claimId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadMessages() {
    try {
      const r = await fetch(`/api/claims/${claimId}/messages`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Load failed: ${r.status}`);
      const j = await r.json();
      setMessages(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(parent: string | null = null) {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/claims/${claimId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage.trim(), parent_message: parent }),
      });
      if (!r.ok) throw new Error(`Send failed: ${r.status}`);
      setNewMessage("");
      await loadMessages();
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  }

  // initial + auto refresh
  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 8000);
    return () => clearInterval(t);
  }, [claimId]);

  const threads = useMemo(() => {
    const roots = messages.filter((m) => !m.parent_message);
    const byParent: Record<string, Message[]> = {};
    for (const m of messages) {
      const root = m.thread_root || m.id;
      if (!byParent[root]) byParent[root] = [];
      if (m.parent_message) byParent[root].push(m);
    }
    // sort replies ascending by date
    Object.values(byParent).forEach((arr) =>
      arr.sort((a, b) => (a.date_created || "").localeCompare(b.date_created || ""))
    );
    // newest roots first
    roots.sort((a, b) => (b.date_created || "").localeCompare(a.date_created || ""));
    return { roots, children: byParent };
  }, [messages]);

  const authorName = (p?: Participant | null) => {
    const fn = p?.user?.first_name?.trim() || "";
    const ln = p?.user?.last_name?.trim() || "";
    return (fn + " " + ln).trim() || "Participant";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        {!loading && (
          <span className="text-xs text-gray-500">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading messages…</div>
      ) : threads.roots.length === 0 ? (
        <div className="text-gray-500 text-sm">No messages yet.</div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {threads.roots.map((root) => (
            <div key={root.id} className="border border-gray-100 rounded-md p-3">
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{root.body}</div>
              <div className="mt-1 text-xs text-gray-500">
                {authorName(root.author_participant)} ·{" "}
                {new Date(root.date_created || "").toLocaleString()}
              </div>

              {/* Replies */}
              {(threads.children[root.thread_root || root.id] || []).map((rep) => (
                <div key={rep.id} className="mt-3 ml-4 pl-3 border-l border-gray-100">
                  <div className="text-sm whitespace-pre-wrap">{rep.body}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {authorName(rep.author_participant)} ·{" "}
                    {new Date(rep.date_created || "").toLocaleString()}
                  </div>
                </div>
              ))}

              {/* Quick reply */}
              <div className="mt-3 ml-4">
                <button
                  onClick={() => {
                    const msg = prompt("Reply to this message:");
                    if (msg && msg.trim()) {
                      fetch(`/api/claims/${claimId}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ body: msg.trim(), parent_message: root.id }),
                      })
                        .then(loadMessages)
                        .catch(console.error);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="border-t pt-3">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={3}
          placeholder="Write a message to all claim participants..."
          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => sendMessage(null)}
            disabled={!newMessage.trim() || sending}
            className="bg-sky-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-sky-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
