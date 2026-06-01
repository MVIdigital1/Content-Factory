"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  created_at: string;
};

const STATUS_CONFIG = {
  open: { label: "Открыт", color: "bg-blue-50 text-blue-600" },
  in_progress: { label: "В работе", color: "bg-amber-50 text-amber-600" },
  resolved: { label: "Решён", color: "bg-[#E1F5EE] text-[#1D9E75]" },
};

const PRIORITY_CONFIG = {
  low: { label: "Низкий", color: "text-gray-500" },
  medium: { label: "Средний", color: "text-amber-500" },
  high: { label: "Высокий", color: "text-red-500" },
};

export default function TicketsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Ticket[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("tickets")
        .insert({ ...values, user_id: user.id, status: "open" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowForm(false);
      setForm({ title: "", description: "", priority: "medium" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Ticket["status"];
    }) => {
      await supabase.from("tickets").update({ status }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] bg-white";

  return (
    <div className="p-6 max-w-3xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Поддержка / Тикеты
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Обращения клиентов и внутренние задачи
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer transition-colors"
        >
          + Новый тикет
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Новый тикет
          </h3>
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Тема обращения"
              className={inputClass}
            />
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Опишите проблему или задачу..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <select
              value={form.priority}
              onChange={(e) =>
                setForm((p) => ({ ...p, priority: e.target.value as any }))
              }
              className={inputClass}
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} приоритет
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || createMutation.isPending}
                className="flex-1 py-2.5 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending ? "..." : "Создать тикет"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 border border-gray-200 text-gray-500 text-sm rounded-lg cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-xl animate-pulse"
            />
          ))
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="text-4xl mb-3">🎫</div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Нет тикетов
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Создай первое обращение
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer"
            >
              + Создать
            </button>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold ${PRIORITY_CONFIG[t.priority].color}`}
                    >
                      ●
                    </span>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {t.description}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(t.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <select
                  value={t.status}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: t.id,
                      status: e.target.value as any,
                    })
                  }
                  className={`text-[10px] px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${STATUS_CONFIG[t.status].color}`}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
