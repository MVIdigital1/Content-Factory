"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import {
  Megaphone,
  Plus,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react";

// ── типы/хелперы ──────────────────────────────────────────────
type Campaign = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: "generating" | "ready" | "running" | "completed";
  budget_total: number | null;
  budget_spent: number | null;
  leads: number | null;
  customers: number | null;
  revenue: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  project?: { name: string } | null;
};

function roiOf(c: Campaign) {
  const spent = c.budget_spent || 0;
  if (spent <= 0) return null;
  return Math.round((((c.revenue || 0) - spent) / spent) * 100);
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + " млн";
  }
  if (n >= 1_000) return Math.round(n / 1_000) + " тыс";
  return Math.round(n).toString();
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  running: { label: "Активна", cls: "bg-accent-dim text-accent" },
  ready: { label: "Запланирована", cls: "bg-chip text-tx-2" },
  generating: { label: "Генерируется", cls: "bg-chip text-tx-2" },
  completed: { label: "Завершена", cls: "bg-chip text-tx-3" },
};

const STATUS_OPTIONS = [
  { value: "ready", label: "Запланирована" },
  { value: "running", label: "Активна" },
  { value: "completed", label: "Завершена" },
];

const EMPTY = {
  name: "",
  project_id: "",
  goal: "",
  status: "ready",
  budget_total: "",
  starts_at: "",
  ends_at: "",
};
type FormValues = typeof EMPTY;

// ── токен-селект ──────────────────────────────────────────────
function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-[10px] border border-line text-[13px] text-left flex items-center justify-between bg-panel hover:border-line-strong outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-tx-1" : "text-tx-3"}>
          {selected?.label || placeholder || "Выберите…"}
        </span>
        <ChevronDown
          size={14}
          className={`text-tx-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-panel border border-line rounded-[10px] shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-[13px] text-left hover:bg-hover transition-colors ${
                value === o.value
                  ? "bg-accent-dim text-accent font-medium"
                  : "text-tx-1"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── страница ──────────────────────────────────────────────────
export default function CampaignsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const locale = useLocale();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [err, setErr] = useState("");

  const inputClass =
    "w-full px-3 py-2.5 rounded-[10px] border border-line text-[13px] outline-none focus:border-accent transition-colors bg-panel text-tx-1 placeholder:text-tx-3";

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, project:projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campaign[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data || []) as { id: string; name: string }[];
    },
  });

  const buildPayload = (v: FormValues) => ({
    name: v.name.trim(),
    project_id: v.project_id,
    goal: v.goal.trim() || null,
    status: v.status,
    budget_total: v.budget_total ? Number(v.budget_total) : 0,
    starts_at: v.starts_at || null,
    ends_at: v.ends_at || null,
  });

  const createMutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase
        .from("campaigns")
        .insert({ ...buildPayload(v), total_posts: 0 });
      if (error) throw new Error(`${error.code}: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeForm();
    },
    onError: (e: any) => setErr(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: FormValues }) => {
      const { error } = await supabase
        .from("campaigns")
        .update(buildPayload(v))
        .eq("id", id);
      if (error) throw new Error(`${error.code}: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeForm();
    },
    onError: (e: any) => setErr(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
  };

  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setErr("");
    setShowForm(true);
  };

  const startEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      project_id: c.project_id,
      goal: c.goal || "",
      status: c.status,
      budget_total: c.budget_total ? String(c.budget_total) : "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 10) : "",
    });
    setEditingId(c.id);
    setErr("");
    setShowForm(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.project_id) {
      setErr("Укажите название и проект");
      return;
    }
    if (editingId) updateMutation.mutate({ id: editingId, v: form });
    else createMutation.mutate(form);
  };

  // агрегаты
  const list = campaigns || [];
  const totalBudget = list.reduce((s, c) => s + (c.budget_total || 0), 0);
  const totalSpent = list.reduce((s, c) => s + (c.budget_spent || 0), 0);
  const rois = list.map(roiOf).filter((r): r is number => r != null);
  const avgRoi = rois.length
    ? Math.round(rois.reduce((s, r) => s + r, 0) / rois.length)
    : null;
  const activeCount = list.filter((c) => c.status === "running").length;

  const projectOptions = (projects || []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-7 md:p-8">
      {/* Заголовок */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="ui-label">Маркетинг</div>
          <h1 className="text-[28px] font-semibold tracking-tight text-tx-1 mt-2">
            Кампании
          </h1>
          <p className="text-[13.5px] text-tx-2 mt-2 max-w-[460px] leading-relaxed">
            Объединяй контент под одной целью, бюджетом и сроком — и сразу видь
            ROI по каждой кампании.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-[10px] bg-accent text-on-accent hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.2} />
          Новая кампания
        </button>
      </div>

      {/* Агрегаты */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          {[
            {
              label: "Кампаний",
              val: String(list.length),
              sub: `${activeCount} активных`,
            },
            { label: "Бюджет", val: fmtMoney(totalBudget), sub: "сум" },
            { label: "Освоено", val: fmtMoney(totalSpent), sub: "сум" },
            {
              label: "Средний ROI",
              val: avgRoi != null ? `${avgRoi}%` : "—",
              sub: "по кампаниям",
              accent: true,
            },
          ].map((k) => (
            <div key={k.label} className="ui-surface p-4">
              <div className="ui-label">{k.label}</div>
              <div
                className={`ui-num text-[24px] font-semibold mt-2 ${
                  k.accent ? "text-accent" : "text-tx-1"
                }`}
              >
                {k.val}
              </div>
              <div className="text-[11px] text-tx-3 mt-1">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Список / пусто */}
      {isLoading ? (
        <div className="ui-surface py-16 text-center text-[13px] text-tx-3">
          Загрузка…
        </div>
      ) : list.length === 0 ? (
        <div className="ui-surface flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
            <Megaphone size={22} className="text-accent" strokeWidth={1.6} />
          </div>
          <div className="text-[15px] font-semibold text-tx-1">
            Пока нет кампаний
          </div>
          <p className="text-[12.5px] text-tx-3 mt-1.5 max-w-[340px] leading-relaxed">
            Создай первую кампанию — задай цель, бюджет и срок, привяжи к ней
            контент.
          </p>
          <button
            onClick={startCreate}
            className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-[10px] bg-accent text-on-accent hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.2} />
            Новая кампания
          </button>
        </div>
      ) : (
        <div className="ui-surface divide-y divide-line">
          {list.map((c) => {
            const roi = roiOf(c);
            const spent = c.budget_spent || 0;
            const total = c.budget_total || 0;
            const pct =
              total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
            const st = STATUS_META[c.status] || STATUS_META.ready;
            return (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[2.4fr_1.6fr_1fr_auto] items-center gap-4 px-5 py-4 group"
              >
                {/* имя + проект */}
                <Link href={`/${locale}/campaigns/${c.id}`} className="min-w-0">
                  <div className="text-[14px] font-medium text-tx-1 truncate hover:text-accent transition-colors">
                    {c.name}
                  </div>
                  <div className="text-[11.5px] text-tx-3 mt-1 flex items-center gap-2 truncate">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${st.cls}`}
                    >
                      {st.label}
                    </span>
                    {c.project?.name && (
                      <span className="truncate">{c.project.name}</span>
                    )}
                    <span>
                      · {fmtDate(c.starts_at)}
                      {c.ends_at ? `—${fmtDate(c.ends_at)}` : ""}
                    </span>
                  </div>
                </Link>

                {/* бюджет */}
                <div className="hidden md:block">
                  <div className="h-[5px] rounded-full bg-track overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="ui-num text-[11.5px] text-tx-2 mt-1.5">
                    {fmtMoney(spent)} / {fmtMoney(total)} сум
                  </div>
                </div>

                {/* ROI */}
                <div className="hidden md:block">
                  <div
                    className={`ui-num text-[18px] font-semibold ${
                      roi != null ? "text-accent" : "text-tx-3"
                    }`}
                  >
                    {roi != null ? `${roi}%` : "—"}
                  </div>
                  <div className="text-[10.5px] text-tx-3 flex items-center gap-1">
                    <TrendingUp size={11} /> ROI
                  </div>
                </div>

                {/* действия */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(c)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-tx-3 hover:text-tx-1 hover:bg-hover transition-colors cursor-pointer"
                    aria-label="Редактировать"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить кампанию «${c.name}»?`))
                        deleteMutation.mutate(c.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-tx-3 hover:text-neg hover:bg-hover transition-colors cursor-pointer"
                    aria-label="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка создания/редактирования */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative w-full max-w-[480px] bg-panel border border-line rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-semibold text-tx-1">
                {editingId ? "Редактировать кампанию" : "Новая кампания"}
              </h2>
              <button
                onClick={closeForm}
                className="text-tx-3 hover:text-tx-1 cursor-pointer"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                  Название
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Например: Рамадан 2026"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                    Проект
                  </label>
                  <Select
                    value={form.project_id}
                    onChange={(v) => setForm((p) => ({ ...p, project_id: v }))}
                    options={projectOptions}
                    placeholder="Выберите проект"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                    Статус
                  </label>
                  <Select
                    value={form.status}
                    onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                    options={STATUS_OPTIONS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                  Цель
                </label>
                <input
                  value={form.goal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, goal: e.target.value }))
                  }
                  placeholder="Что хотим получить от кампании"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                  Бюджет, сум
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_total}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budget_total: e.target.value }))
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                    Начало
                  </label>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, starts_at: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                    Конец
                  </label>
                  <input
                    type="date"
                    value={form.ends_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ends_at: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {err && <div className="text-[12px] text-neg">{err}</div>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-[10px] border border-line text-[13px] text-tx-2 hover:bg-hover transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-[10px] bg-accent text-on-accent text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Сохранение…" : editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
