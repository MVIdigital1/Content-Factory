"use client";

import { useState, useEffect } from "react";
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
  FileText,
  Send,
  Image as ImageIcon,
  Music2,
  Save,
  Users,
  Wallet,
  Target,
} from "lucide-react";

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

type LinkedContent = {
  id: string;
  title: string;
  status: string;
  platform: string;
  created_at: string;
};

const PLATFORM_ICON: Record<string, any> = {
  telegram: Send,
  instagram: ImageIcon,
  tiktok: Music2,
};

function roiOf(c: Campaign) {
  const spent = c.budget_spent || 0;
  if (spent <= 0) return null;
  return Math.round((((c.revenue || 0) - spent) / spent) * 100);
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " млн";
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

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> =
  {
    running: { label: "Активна", cls: "bg-chip text-pos", dot: "bg-pos" },
    ready: { label: "Запланирована", cls: "bg-chip text-tx-2", dot: "bg-tx-3" },
    generating: {
      label: "Генерируется",
      cls: "bg-chip text-tx-2",
      dot: "bg-tx-3",
    },
    completed: { label: "Завершена", cls: "bg-chip text-tx-3", dot: "bg-tx-3" },
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

function SelectField({
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
        className="w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] text-left flex items-center justify-between bg-panel hover:border-line-strong outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-tx-1" : "text-tx-3"}>
          {selected?.label || placeholder || "Выберите…"}
        </span>
        <ChevronDown
          size={13}
          className={`text-tx-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-panel border border-line rounded-[8px] shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-[12px] text-left hover:bg-hover transition-colors ${value === o.value ? "bg-accent-dim text-accent font-medium" : "text-tx-1"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const locale = useLocale();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [err, setErr] = useState("");
  const [detailCamp, setDetailCamp] = useState<Campaign | null>(null);
  const [res, setRes] = useState({
    budget_spent: "",
    leads: "",
    customers: "",
    revenue: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong transition-colors bg-panel text-tx-1 placeholder:text-tx-3";

  const { data: campaigns = [], isLoading } = useQuery({
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

  const { data: projects = [] } = useQuery({
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

  const { data: detailContents = [] } = useQuery({
    queryKey: ["campaign-contents", detailCamp?.id],
    enabled: !!detailCamp,
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, status, platform, created_at")
        .eq("campaign_id", detailCamp!.id)
        .order("created_at", { ascending: false });
      return (data || []) as LinkedContent[];
    },
  });

  useEffect(() => {
    if (detailCamp) {
      setRes({
        budget_spent: detailCamp.budget_spent
          ? String(detailCamp.budget_spent)
          : "",
        leads: detailCamp.leads ? String(detailCamp.leads) : "",
        customers: detailCamp.customers ? String(detailCamp.customers) : "",
        revenue: detailCamp.revenue ? String(detailCamp.revenue) : "",
      });
    }
  }, [detailCamp?.id]);

  const createMutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("campaigns").insert({
        name: v.name.trim(),
        project_id: v.project_id,
        goal: v.goal.trim() || null,
        status: v.status,
        budget_total: v.budget_total ? Number(v.budget_total) : 0,
        starts_at: v.starts_at || null,
        ends_at: v.ends_at || null,
        total_posts: 0,
      });
      if (error) throw new Error(error.message);
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
        .update({
          name: v.name.trim(),
          project_id: v.project_id,
          goal: v.goal.trim() || null,
          status: v.status,
          budget_total: v.budget_total ? Number(v.budget_total) : 0,
          starts_at: v.starts_at || null,
          ends_at: v.ends_at || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeForm();
    },
    onError: (e: any) => setErr(e.message),
  });

  const saveResults = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          budget_spent: res.budget_spent ? Number(res.budget_spent) : 0,
          leads: res.leads ? Number(res.leads) : 0,
          customers: res.customers ? Number(res.customers) : 0,
          revenue: res.revenue ? Number(res.revenue) : 0,
        })
        .eq("id", detailCamp!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    },
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

  const list = campaigns;
  const activeCount = list.filter((c) => c.status === "running").length;
  const totalBudget = list.reduce((s, c) => s + (c.budget_total || 0), 0);
  const rois = list.map(roiOf).filter((r): r is number => r != null);
  const avgRoi = rois.length
    ? Math.round(rois.reduce((s, r) => s + r, 0) / rois.length)
    : null;

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const saving = createMutation.isPending || updateMutation.isPending;

  // Detail modal computed
  const dSpent = Number(res.budget_spent) || 0;
  const dTotal = detailCamp?.budget_total || 0;
  const dPct =
    dTotal > 0 ? Math.min(100, Math.round((dSpent / dTotal) * 100)) : 0;
  const dRev = Number(res.revenue) || 0;
  const dCust = Number(res.customers) || 0;
  const dRoi = dSpent > 0 ? Math.round(((dRev - dSpent) / dSpent) * 100) : null;
  const dCac = dCust > 0 ? Math.round(dSpent / dCust) : null;
  const dLtv = dCust > 0 ? Math.round(dRev / dCust) : null;
  const dRatio =
    dCac && dCac > 0 && dLtv != null ? (dLtv / dCac).toFixed(1) : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="h-11 border-b border-line px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <p className="text-[11px] text-tx-3">
          Маркетинг / <span className="text-tx-2 font-medium">Кампании</span>
        </p>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={12} strokeWidth={2.4} /> Новая кампания
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h1 className="text-[20px] font-semibold text-tx-1">Кампании</h1>
          <p className="text-[12px] text-tx-2 mt-0.5">
            Объединяй контент под одной целью и отслеживай результат
          </p>
        </div>

        {/* Объяснение */}
        <div className="ui-surface px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-chip flex items-center justify-center flex-shrink-0 mt-0.5">
            <Megaphone size={15} className="text-tx-2" strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-tx-1 mb-1">
              Что такое кампания?
            </p>
            <p className="text-[11px] text-tx-2 leading-relaxed">
              Группа постов под одну цель и срок. Например: "Запуск продукта"
              или "Рост подписчиков за месяц".
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["Создай с целью и датами", "Добавь посты", "Смотри ROI"].map(
                (s, i) => (
                  <div
                    key={s}
                    className="flex items-center gap-1.5 text-[10px] text-tx-3 bg-chip rounded-[5px] px-2 py-1"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-accent text-on-accent flex items-center justify-center text-[8px] font-semibold flex-shrink-0">
                      {i + 1}
                    </div>
                    {s}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Статистика (только если есть кампании) */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                l: "Кампаний",
                v: String(list.length),
                s: `${activeCount} активных`,
              },
              { l: "Активных", v: String(activeCount), s: "прямо сейчас" },
              { l: "Бюджет", v: `$${fmtMoney(totalBudget)}`, s: "суммарно" },
              {
                l: "Средний ROI",
                v: avgRoi != null ? `${avgRoi}%` : "—",
                s: "по кампаниям",
                accent: true,
              },
            ].map((k) => (
              <div key={k.l} className="ui-surface px-4 py-3">
                <p className="ui-label mb-2">{k.l}</p>
                <p
                  className={`ui-num text-[22px] font-semibold leading-none ${(k as any).accent ? "text-pos" : "text-tx-1"}`}
                >
                  {k.v}
                </p>
                <p className="text-[10px] text-tx-3 mt-1">{k.s}</p>
              </div>
            ))}
          </div>
        )}

        {/* Список */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 ui-surface animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="ui-surface flex flex-col items-center text-center py-14 px-6">
            <div className="w-10 h-10 rounded-[10px] bg-chip flex items-center justify-center mb-3">
              <Megaphone size={18} className="text-tx-3" strokeWidth={1.6} />
            </div>
            <p className="text-[13px] font-medium text-tx-1 mb-1">
              Пока нет кампаний
            </p>
            <p className="text-[11px] text-tx-3 max-w-[280px] leading-relaxed mb-4">
              Создай первую кампанию — задай цель, добавь посты и отслеживай ROI
            </p>
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
            >
              <Plus size={13} /> Создать первую кампанию
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((c) => {
              const roi = roiOf(c);
              const spent = c.budget_spent || 0;
              const total = c.budget_total || 0;
              const pct =
                total > 0
                  ? Math.min(100, Math.round((spent / total) * 100))
                  : 0;
              const st = STATUS_META[c.status] || STATUS_META.ready;
              return (
                <div
                  key={c.id}
                  onClick={() => setDetailCamp(c)}
                  className="ui-surface overflow-hidden cursor-pointer hover:border-line-strong transition-colors group"
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[13px] font-medium text-tx-1">
                        {c.name}
                      </p>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                          />
                          {st.label}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(c);
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-hover cursor-pointer transition-all"
                        >
                          <Pencil size={11} className="text-tx-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Удалить «${c.name}»?`))
                              deleteMutation.mutate(c.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-hover cursor-pointer transition-all"
                        >
                          <Trash2 size={11} className="text-tx-3" />
                        </button>
                      </div>
                    </div>
                    {c.goal && (
                      <p className="text-[11px] text-tx-3 leading-relaxed mb-2">
                        {c.goal}
                      </p>
                    )}
                  </div>
                  <div className="px-4 pb-3 border-t border-line pt-3">
                    <div className="flex justify-between text-[10px] text-tx-3 mb-1.5">
                      <span>Прогресс постов</span>
                      <span className="font-medium text-tx-1">{pct}%</span>
                    </div>
                    <div className="h-1 bg-track rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="ui-label mb-0.5">Бюджет</p>
                        <p className="text-[13px] font-medium text-tx-1">
                          ${fmtMoney(total)}
                        </p>
                      </div>
                      <div>
                        <p className="ui-label mb-0.5">Срок</p>
                        <p className="text-[13px] font-medium text-tx-1">
                          {c.ends_at ? fmtDate(c.ends_at) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="ui-label mb-0.5">ROI</p>
                        <p
                          className={`text-[13px] font-medium ${roi != null ? "text-pos" : "text-tx-3"}`}
                        >
                          {roi != null ? `+${roi}%` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Пустая карточка — создать новую */}
            <div
              onClick={startCreate}
              className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-colors min-h-[160px]"
            >
              <div className="w-8 h-8 rounded-[8px] bg-chip flex items-center justify-center mb-2">
                <Plus size={16} className="text-tx-3" />
              </div>
              <p className="text-[12px] font-medium text-tx-1 mb-1">
                Создать кампанию
              </p>
              <p className="text-[10px] text-tx-3">Задай цель, бюджет и срок</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== МОДАЛКА ДЕТАЛЕЙ ===== */}
      {detailCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setDetailCamp(null)}
          />
          <div className="relative w-full max-w-[600px] bg-panel border border-line rounded-[14px] flex flex-col max-h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            {/* Шапка */}
            <div className="px-5 py-4 border-b border-line flex items-start justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[15px] font-semibold text-tx-1">
                    {detailCamp.name}
                  </p>
                  <span
                    className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[detailCamp.status]?.cls || "bg-chip text-tx-2"}`}
                  >
                    {STATUS_META[detailCamp.status]?.label}
                  </span>
                </div>
                <p className="text-[11px] text-tx-3">
                  {detailCamp.project?.name}
                  {detailCamp.ends_at
                    ? ` · до ${fmtDate(detailCamp.ends_at)}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setDetailCamp(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer flex-shrink-0"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 4 метрики */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    l: "ROI",
                    v: dRoi != null ? `+${dRoi}%` : "—",
                    s: "прогноз",
                    green: dRoi != null,
                  },
                  {
                    l: "CAC",
                    v: dCac != null ? `$${fmtMoney(dCac)}` : "—",
                    s: "стоимость клиента",
                  },
                  {
                    l: "LTV",
                    v: dLtv != null ? `$${fmtMoney(dLtv)}` : "—",
                    s: "ценность клиента",
                  },
                  {
                    l: "LTV:CAC",
                    v: dRatio != null ? `${dRatio}×` : "—",
                    s: "хорошо ≥ 3×",
                  },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5"
                  >
                    <p className="ui-label mb-1.5">{m.l}</p>
                    <p
                      className={`text-[17px] font-semibold leading-none ${(m as any).green ? "text-pos" : "text-tx-1"}`}
                    >
                      {m.v}
                    </p>
                    <p className="text-[9px] text-tx-3 mt-1">{m.s}</p>
                  </div>
                ))}
              </div>

              {/* Бюджет */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-medium text-tx-1">Бюджет освоен</span>
                  <span className="text-tx-3">
                    ${fmtMoney(dSpent)} из ${fmtMoney(dTotal)}
                  </span>
                </div>
                <div className="h-1.5 bg-track rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${dPct}%` }}
                  />
                </div>
              </div>

              {/* Редактируемые результаты */}
              <div>
                <p className="ui-label mb-2">Результаты</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "budget_spent", label: "Потрачено ($)" },
                    { k: "revenue", label: "Выручка ($)" },
                    { k: "leads", label: "Лиды" },
                    { k: "customers", label: "Клиенты" },
                  ].map((f) => (
                    <div key={f.k}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                        {f.label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={(res as any)[f.k]}
                        onChange={(e) =>
                          setRes((p) => ({ ...p, [f.k]: e.target.value }))
                        }
                        placeholder="0"
                        className={inp}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Посты */}
              <div>
                <p className="ui-label mb-2">
                  Посты кампании{" "}
                  {detailContents.length > 0 && `· ${detailContents.length}`}
                </p>
                {detailContents.length === 0 ? (
                  <div className="bg-panel-2 border border-line rounded-[8px] py-6 flex flex-col items-center text-center">
                    <FileText
                      size={18}
                      className="text-tx-3 mb-2"
                      strokeWidth={1.2}
                    />
                    <p className="text-[11px] text-tx-2 mb-1">
                      Пока нет постов
                    </p>
                    <p className="text-[10px] text-tx-3">
                      При создании поста выбери эту кампанию
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {detailContents.map((c) => {
                      const Icon = PLATFORM_ICON[c.platform] || FileText;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 bg-panel-2 border border-line rounded-[7px] px-3 py-2"
                        >
                          <div className="w-6 h-6 rounded-[5px] bg-chip flex items-center justify-center flex-shrink-0">
                            <Icon
                              size={12}
                              className="text-tx-3"
                              strokeWidth={1.6}
                            />
                          </div>
                          <p className="text-[11px] font-medium text-tx-1 flex-1 truncate">
                            {c.title || "Без названия"}
                          </p>
                          <span className="text-[9.5px] text-tx-3 capitalize flex-shrink-0">
                            {c.platform}
                          </span>
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              c.status === "published"
                                ? "bg-chip text-pos"
                                : "bg-chip text-tx-3"
                            }`}
                          >
                            {c.status === "published" ? "Опубл." : "Готово"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Футер */}
            <div className="px-5 py-3.5 border-t border-line flex items-center gap-2 flex-shrink-0">
              {savedFlash && (
                <span className="text-[11px] text-pos mr-auto">Сохранено!</span>
              )}
              <button
                onClick={() => setDetailCamp(null)}
                className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                Закрыть
              </button>
              <button
                onClick={() => saveResults.mutate()}
                disabled={saveResults.isPending}
                className="flex-1 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Save size={13} strokeWidth={1.6} />
                {saveResults.isPending ? "Сохранение…" : "Сохранить результаты"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={closeForm}
          />
          <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                {editingId ? "Редактировать кампанию" : "Новая кампания"}
              </h2>
              <button
                onClick={closeForm}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Название
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Например: Запуск продукта июнь 2026"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Проект
                  </label>
                  <SelectField
                    value={form.project_id}
                    onChange={(v) => setForm((p) => ({ ...p, project_id: v }))}
                    options={projectOptions}
                    placeholder="Выберите проект"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Статус
                  </label>
                  <SelectField
                    value={form.status}
                    onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                    options={STATUS_OPTIONS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Цель
                </label>
                <input
                  value={form.goal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, goal: e.target.value }))
                  }
                  placeholder="Что хотим получить от кампании"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Бюджет ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_total}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budget_total: e.target.value }))
                  }
                  placeholder="0"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Начало
                  </label>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, starts_at: e.target.value }))
                    }
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Конец
                  </label>
                  <input
                    type="date"
                    value={form.ends_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ends_at: e.target.value }))
                    }
                    className={inp}
                  />
                </div>
              </div>
              {err && <p className="text-[11px] text-neg">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
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
