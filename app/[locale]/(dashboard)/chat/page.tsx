"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, MessagesSquare } from "lucide-react";

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
};

export default function ChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
      });

    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, content, user_email: user.email });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getInitials = (email: string) => email?.[0]?.toUpperCase() || "?";

  const COLORS = [
    "var(--accent)",
    "var(--c-2)",
    "var(--c-3)",
    "#8B5CF6",
    "#EC4899",
    "var(--neg)",
  ];
  const getColor = (email: string) =>
    COLORS[email.charCodeAt(0) % COLORS.length];

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-line px-6 flex items-center flex-shrink-0 bg-panel">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[13px] font-medium text-tx-1">
            Командный чат
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-3">
              <MessagesSquare
                size={22}
                className="text-accent"
                strokeWidth={1.6}
              />
            </div>
            <p className="text-[14px] font-semibold text-tx-1">
              Чат пока пустой
            </p>
            <p className="text-[12px] text-tx-3 mt-1">
              Напиши первое сообщение команде
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.user_id === user?.id;
            const showAvatar =
              i === 0 || messages[i - 1].user_id !== msg.user_id;
            const email = msg.user_email || msg.user_id;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {showAvatar ? (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: getColor(email) }}
                  >
                    {getInitials(email)}
                  </div>
                ) : (
                  <div className="w-7 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                >
                  {showAvatar && !isMe && (
                    <p className="text-[10px] text-tx-3 px-1">
                      {email.split("@")[0]}
                    </p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] ${
                      isMe
                        ? "bg-accent text-on-accent rounded-br-sm"
                        : "bg-panel-2 text-tx-1 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-tx-3 px-1">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line p-3 flex gap-2 bg-panel">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Написать команде..."
          className="flex-1 px-4 py-2.5 bg-panel-2 rounded-xl text-[13px] text-tx-1 outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-tx-3"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-accent text-on-accent rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
