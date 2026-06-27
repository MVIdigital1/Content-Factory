"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Contact } from "lucide-react";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "lead" | "active" | "paused" | "lost";
  budget: number | null;
  notes: string | null;
  created_at: string;
};

const STATUS_CONFIG = {
  lead: { label: "Лид", color: "bg-chip text-c-2" },
  active: { label: "Активный", color: "bg-accent-dim text-accent" },
  paused: { label: "На паузе", color: "bg-chip text-c-3" },
  lost: { label: "Потерян", color: "bg-chip text-neg" },
};

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "lead" as const,
  budget: "",
  notes: "",
};

export default function CrmPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["crm-clients"],
    queryFn: async () => { const res = await fetch("/api/crm/clients"); return res.ok ? res.json() : []; },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof EMPTY) => {
      const res = await fetch("/api/crm/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, budget: values.budget ? Number(values.budget) : null }) });
      if (!res.ok) throw new Error("Ошибка создания");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm-clients"] }); setShowForm(false); setForm(EMPTY); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Client["status"] }) => {
      await fetch(`/api/crm/clients/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-clients"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/crm/clients/${id}`, { method: "DELETE" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["crm-clients"] }); setSelected(null); },
  });

  const filtered = clients.filter((c: any) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const inputClass =
    "w-full px-3 py-2.5 border border-line rounded-[10px] text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-72 flex-shrink-0 border-r border-line flex flex-col bg-sidebar">
        <div className="p-3 border-b border-line">
          <div className="flex gap-2 mb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск клиентов..."
              className="flex-1 px-3 py-2 text-[12px] border border-line rounded-lg outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3"
            />
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-2 bg-accent text-on-accent rounded-lg hover:opacity-90 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.4} />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", ...Object.keys(STATUS_CONFIG)].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[9.5px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${filterStatus === s ? "bg-accent text-on-accent" : "bg-chip text-tx-2"}`}
              >
                {s === "all"
                  ? "Все"
                  : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-panel-2 rounded animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[12px] text-tx-3">Нет клиентов</p>
            </div>
          ) : (
            filtered.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full px-4 py-3 text-left border-b border-line hover:bg-panel transition-colors cursor-pointer ${selected?.id === c.id ? "bg-panel border-l-2 border-l-accent" : ""}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[12px] font-semibold text-tx-1 truncate">
                    {c.name}
                  </p>
                  <span
                    className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${(STATUS_CONFIG as any)[c.status].color}`}
                  >
                    {(STATUS_CONFIG as any)[c.status].label}
                  </span>
                </div>
                {c.company && (
                  <p className="text-[10.5px] text-tx-3">{c.company}</p>
                )}
                {c.budget && (
                  <p className="text-[10.5px] text-accent font-medium ui-num">
                    {c.budget.toLocaleString("ru-RU")} сум
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail / Form */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        {showForm ? (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-semibold text-tx-1">
                Новый клиент
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-tx-3 hover:text-tx-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Имя / ФИО *"
                className={inputClass}
              />
              <input
                value={form.company}
                onChange={(e) =>
                  setForm((p) => ({ ...p, company: e.target.value }))
                }
                placeholder="Компания"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                  className={inputClass}
                />
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="Телефон"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as any }))
                  }
                  className={inputClass}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <input
                  value={form.budget}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budget: e.target.value }))
                  }
                  placeholder="Бюджет (сум)"
                  type="number"
                  className={inputClass}
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Заметки..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.name || createMutation.isPending}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? "..." : "Сохранить"}
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
        ) : selected ? (
          <div className="max-w-lg">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[20px] font-semibold text-tx-1">
                  {selected.name}
                </h2>
                {selected.company && (
                  <p className="text-[13px] text-tx-3">{selected.company}</p>
                )}
              </div>
              <select
                value={selected.status}
                onChange={(e) => {
                  updateStatusMutation.mutate({
                    id: selected.id,
                    status: e.target.value as any,
                  });
                  setSelected({ ...selected, status: e.target.value as any });
                }}
                className={`text-[12px] px-2.5 py-1.5 rounded-lg border-0 outline-none font-medium cursor-pointer ${STATUS_CONFIG[selected.status].color}`}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="ui-surface p-4 space-y-3 mb-4">
              {selected.email && (
                <div>
                  <p className="text-[10px] text-tx-3 mb-0.5">Email</p>
                  <p className="text-[13px] text-tx-1">{selected.email}</p>
                </div>
              )}
              {selected.phone && (
                <div>
                  <p className="text-[10px] text-tx-3 mb-0.5">Телефон</p>
                  <p className="text-[13px] text-tx-1">{selected.phone}</p>
                </div>
              )}
              {selected.budget && (
                <div>
                  <p className="text-[10px] text-tx-3 mb-0.5">Бюджет</p>
                  <p className="text-[13px] font-semibold text-accent ui-num">
                    {selected.budget.toLocaleString("ru-RU")} сум
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-tx-3 mb-0.5">Добавлен</p>
                <p className="text-[13px] text-tx-1">
                  {new Date(selected.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
            {selected.notes && (
              <div className="bg-chip rounded-xl p-4 mb-4">
                <p className="text-[10px] font-medium text-c-3 mb-1">Заметки</p>
                <p className="text-[13px] text-tx-2">{selected.notes}</p>
              </div>
            )}
            <button
              onClick={() => deleteMutation.mutate(selected.id)}
              className="text-[12px] text-neg hover:opacity-80 cursor-pointer"
            >
              Удалить клиента
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
              <Contact size={22} className="text-accent" strokeWidth={1.6} />
            </div>
            <h2 className="text-[15px] font-semibold text-tx-1 mb-1">
              CRM клиентов
            </h2>
            <p className="text-[12.5px] text-tx-3 mb-4">
              Управляй базой клиентов агентства
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.2} /> Добавить клиента
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
