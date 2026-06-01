"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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

    // Загрузить историю
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
      });

    // Realtime подписка
    const channel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
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
    "#1D9E75",
    "#3B82F6",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#EF4444",
  ];
  const getColor = (email: string) =>
    COLORS[email.charCodeAt(0) % COLORS.length];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
          <span className="text-xs font-medium text-gray-700">
            Командный чат
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-medium text-gray-900">Чат пока пустой</p>
            <p className="text-xs text-gray-400 mt-1">
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
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
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
                    <p className="text-[9px] text-gray-400 px-1">
                      {email.split("@")[0]}
                    </p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-[#1D9E75] text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"}`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-[9px] text-gray-400 px-1">
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
      <div className="border-t border-gray-100 p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Написать команде..."
          className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-1 focus:ring-[#1D9E75] transition-all"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-[#1D9E75] text-white rounded-xl hover:bg-[#0F6E56] disabled:opacity-40 cursor-pointer transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
