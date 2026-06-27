"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Ticket } from "lucide-react";

type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  created_at: string;
};

const STATUS_CONFIG = {
  open: { label: "Открыт", color: "bg-chip text-c-2" },
  in_progress: { label: "В работе", color: "bg-chip text-c-3" },
  resolved: { label: "Решён", color: "bg-pos-dim text-pos" },
};

const PRIORITY_CONFIG = {
  low: { label: "Низкий", color: "text-tx-3" },
  medium: { label: "Средний", color: "text-c-3" },
  high: { label: "Высокий", color: "text-neg" },
};

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as const });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => { const res = await fetch("/api/tickets"); return res.ok ? res.json() : []; },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const res = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error("Ошибка создания");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); setShowForm(false); setForm({ title: "", description: "", priority: "medium" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketRow["status"] }) => {
      await fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const inputClass =
    "w-full px-3 py-2.5 border border-line rounded-[10px] text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div className="p-6 md:p-8 max-w-3xl w-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="ui-label">Поддержка</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            Тикеты
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">
            Обращения клиентов и внутренние задачи
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer transition-opacity"
        >
          <Plus size={15} strokeWidth={2.2} /> Новый тикет
        </button>
      </div>

      {showForm && (
        <div className="ui-surface p-5 mb-5">
          <h3 className="text-[14px] font-semibold text-tx-1 mb-4">
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
                className="flex-1 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {createMutation.isPending ? "..." : "Создать тикет"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 border border-line text-tx-2 text-[13px] rounded-[10px] hover:bg-hover cursor-pointer"
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
            <div key={i} className="h-16 bg-panel-2 rounded-xl animate-pulse" />
          ))
        ) : tickets.length === 0 ? (
          <div className="ui-surface flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
              <Ticket size={22} className="text-accent" strokeWidth={1.6} />
            </div>
            <p className="text-[15px] font-semibold text-tx-1 mb-1">
              Нет тикетов
            </p>
            <p className="text-[12.5px] text-tx-3 mb-4">
              Создай первое обращение
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.2} /> Создать
            </button>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="ui-surface p-4 hover:border-line-strong transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] ${PRIORITY_CONFIG[t.priority].color}`}
                    >
                      ●
                    </span>
                    <p className="text-[13px] font-semibold text-tx-1 truncate">
                      {t.title}
                    </p>
                  </div>
                  <p className="text-[12px] text-tx-2 line-clamp-1">
                    {t.description}
                  </p>
                  <p className="text-[10.5px] text-tx-3 mt-1">
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
                  className={`text-[10.5px] px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${STATUS_CONFIG[t.status].color}`}
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
