"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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
  lead: { label: "Лид", color: "bg-blue-50 text-blue-600" },
  active: { label: "Активный", color: "bg-[#E1F5EE] text-[#1D9E75]" },
  paused: { label: "На паузе", color: "bg-amber-50 text-amber-600" },
  lost: { label: "Потерян", color: "bg-red-50 text-red-400" },
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
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["crm-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_clients")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Client[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof EMPTY) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("crm_clients").insert({
        ...values,
        budget: values.budget ? Number(values.budget) : null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      setShowForm(false);
      setForm(EMPTY);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Client["status"];
    }) => {
      await supabase.from("crm_clients").update({ status }).eq("id", id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("crm_clients").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      setSelected(null);
    },
  });

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] bg-white";

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-3 border-b border-gray-100">
          <div className="flex gap-2 mb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск клиентов..."
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1D9E75] bg-white"
            />
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-2 bg-[#1D9E75] text-white text-xs rounded-lg hover:bg-[#0F6E56] cursor-pointer"
            >
              +
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", ...Object.keys(STATUS_CONFIG)].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[9px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${filterStatus === s ? "bg-[#1D9E75] text-white" : "bg-gray-100 text-gray-500"}`}
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
                  className="h-14 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-gray-400">Нет клиентов</p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-white transition-colors cursor-pointer ${selected?.id === c.id ? "bg-white border-l-2 border-l-[#1D9E75]" : ""}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {c.name}
                  </p>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CONFIG[c.status].color}`}
                  >
                    {STATUS_CONFIG[c.status].label}
                  </span>
                </div>
                {c.company && (
                  <p className="text-[10px] text-gray-400">{c.company}</p>
                )}
                {c.budget && (
                  <p className="text-[10px] text-[#1D9E75] font-medium">
                    {c.budget.toLocaleString("ru-RU")} сум
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail / Form */}
      <div className="flex-1 overflow-auto p-6">
        {showForm ? (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">
                Новый клиент
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg"
              >
                ×
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
                  className="flex-1 py-2.5 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? "..." : "Сохранить"}
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
        ) : selected ? (
          <div className="max-w-lg">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selected.name}
                </h2>
                {selected.company && (
                  <p className="text-sm text-gray-400">{selected.company}</p>
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
                className={`text-xs px-2.5 py-1.5 rounded-lg border-0 outline-none font-medium cursor-pointer ${STATUS_CONFIG[selected.status].color}`}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 mb-4">
              {selected.email && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Email</p>
                  <p className="text-sm text-gray-900">{selected.email}</p>
                </div>
              )}
              {selected.phone && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Телефон</p>
                  <p className="text-sm text-gray-900">{selected.phone}</p>
                </div>
              )}
              {selected.budget && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Бюджет</p>
                  <p className="text-sm font-semibold text-[#1D9E75]">
                    {selected.budget.toLocaleString("ru-RU")} сум
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Добавлен</p>
                <p className="text-sm text-gray-900">
                  {new Date(selected.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
            {selected.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-medium text-amber-600 mb-1">
                  📝 Заметки
                </p>
                <p className="text-sm text-gray-700">{selected.notes}</p>
              </div>
            )}
            <button
              onClick={() => deleteMutation.mutate(selected.id)}
              className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
            >
              Удалить клиента
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              CRM клиентов
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Управляй базой клиентов агентства
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer"
            >
              + Добавить клиента
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
