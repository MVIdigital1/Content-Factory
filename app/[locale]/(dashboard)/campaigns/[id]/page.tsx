"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Wallet,
  Target,
  Save,
  FileText,
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  running: { label: "Активна", cls: "bg-accent-dim text-accent" },
  ready: { label: "Запланирована", cls: "bg-chip text-tx-2" },
  generating: { label: "Генерируется", cls: "bg-chip text-tx-2" },
  completed: { label: "Завершена", cls: "bg-chip text-tx-3" },
};

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
    year: "numeric",
  });
}

export default function CampaignDetailPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const params = useParams();
  const id = params.id as string;

  const inputClass =
    "w-full px-3 py-2.5 rounded-[10px] border border-line text-[13px] outline-none focus:border-accent transition-colors bg-panel text-tx-1 ui-num placeholder:text-tx-3";

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, project:projects(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
  });

  const { data: contents } = useQuery({
    queryKey: ["campaign-contents", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, status, platform, created_at")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });
      return (data || []) as LinkedContent[];
    },
  });

  // редактируемые результаты
  const [res, setRes] = useState({
    budget_spent: "",
    leads: "",
    customers: "",
    revenue: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (campaign) {
      setRes({
        budget_spent: campaign.budget_spent
          ? String(campaign.budget_spent)
          : "",
        leads: campaign.leads ? String(campaign.leads) : "",
        customers: campaign.customers ? String(campaign.customers) : "",
        revenue: campaign.revenue ? String(campaign.revenue) : "",
      });
    }
  }, [campaign]);

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
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    },
  });

  if (isLoading || !campaign) {
    return (
      <div className="p-7 md:p-8">
        <div className="ui-surface py-16 text-center text-[13px] text-tx-3">
          Загрузка…
        </div>
      </div>
    );
  }

  const spent = Number(res.budget_spent) || 0;
  const total = campaign.budget_total || 0;
  const customers = Number(res.customers) || 0;
  const revenue = Number(res.revenue) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  const roi = spent > 0 ? Math.round(((revenue - spent) / spent) * 100) : null;
  const cac = customers > 0 ? Math.round(spent / customers) : null;
  const ltv = customers > 0 ? Math.round(revenue / customers) : null;
  const ratio = cac && cac > 0 && ltv != null ? (ltv / cac).toFixed(1) : null;

  const st = STATUS_META[campaign.status] || STATUS_META.ready;

  const metrics = [
    {
      label: "ROI кампании",
      val: roi != null ? `${roi}%` : "—",
      Icon: TrendingUp,
      accent: true,
    },
    {
      label: "CAC · стоимость клиента",
      val: cac != null ? `${fmtMoney(cac)} сум` : "—",
      Icon: Users,
    },
    {
      label: "LTV · ценность клиента",
      val: ltv != null ? `${fmtMoney(ltv)} сум` : "—",
      Icon: Wallet,
    },
    {
      label: "LTV : CAC",
      val: ratio != null ? `${ratio}×` : "—",
      Icon: Target,
    },
  ];

  return (
    <div className="p-7 md:p-8">
      {/* назад */}
      <Link
        href={`/${locale}/campaigns`}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-tx-2 hover:text-tx-1 transition-colors mb-5"
      >
        <ArrowLeft size={14} /> Все кампании
      </Link>

      {/* заголовок */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="ui-label">{campaign.project?.name || "Кампания"}</div>
          <h1 className="text-[28px] font-semibold tracking-tight text-tx-1 mt-2 flex items-center gap-3">
            {campaign.name}
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${st.cls}`}
            >
              {st.label}
            </span>
          </h1>
          {campaign.goal && (
            <p className="text-[13.5px] text-tx-2 mt-2 max-w-[480px] leading-relaxed">
              {campaign.goal}
            </p>
          )}
          <div className="text-[12px] text-tx-3 mt-2">
            {fmtDate(campaign.starts_at)}
            {campaign.ends_at ? ` — ${fmtDate(campaign.ends_at)}` : ""}
          </div>
        </div>
      </div>

      {/* метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
        {metrics.map((m) => (
          <div key={m.label} className="ui-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-8 h-8 rounded-[9px] flex items-center justify-center ${
                  m.accent ? "bg-accent-dim" : "bg-panel-2"
                }`}
              >
                <m.Icon
                  size={15}
                  className={m.accent ? "text-accent" : "text-tx-2"}
                  strokeWidth={1.6}
                />
              </div>
            </div>
            <div
              className={`ui-num text-[22px] font-semibold leading-none ${
                m.accent ? "text-accent" : "text-tx-1"
              }`}
            >
              {m.val}
            </div>
            <div className="text-[11px] text-tx-3 mt-2">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* бюджет + результаты (редактируемо) */}
        <div className="ui-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14.5px] font-semibold text-tx-1">
              Бюджет и результаты
            </h2>
            {savedFlash && (
              <span className="text-[11.5px] text-pos">Сохранено</span>
            )}
          </div>

          {/* бюджет-бар */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-[12px] mb-2">
              <span className="text-tx-3">Освоено бюджета</span>
              <span className="ui-num text-tx-2">
                {fmtMoney(spent)} / {fmtMoney(total)} сум
              </span>
            </div>
            <div className="h-[6px] rounded-full bg-track overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* инпуты результатов */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                Потрачено, сум
              </label>
              <input
                type="number"
                min="0"
                value={res.budget_spent}
                onChange={(e) =>
                  setRes((p) => ({ ...p, budget_spent: e.target.value }))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                Выручка, сум
              </label>
              <input
                type="number"
                min="0"
                value={res.revenue}
                onChange={(e) =>
                  setRes((p) => ({ ...p, revenue: e.target.value }))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                Лиды
              </label>
              <input
                type="number"
                min="0"
                value={res.leads}
                onChange={(e) =>
                  setRes((p) => ({ ...p, leads: e.target.value }))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-tx-2 mb-1.5">
                Клиенты
              </label>
              <input
                type="number"
                min="0"
                value={res.customers}
                onChange={(e) =>
                  setRes((p) => ({ ...p, customers: e.target.value }))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={() => saveResults.mutate()}
            disabled={saveResults.isPending}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-accent text-on-accent text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {saveResults.isPending ? "Сохранение…" : "Сохранить результаты"}
          </button>

          <p className="text-[11px] text-tx-3 mt-3 leading-relaxed">
            Пока эти цифры вводятся вручную. Позже их можно подтягивать
            автоматически из рекламных кабинетов и CRM.
          </p>
        </div>

        {/* привязанный контент */}
        <div className="ui-surface p-5">
          <h2 className="text-[14.5px] font-semibold text-tx-1 mb-4">
            Контент кампании
            {contents && contents.length > 0 && (
              <span className="ui-num text-tx-3 font-normal ml-2">
                {contents.length}
              </span>
            )}
          </h2>

          {!contents || contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-10 h-10 rounded-xl bg-panel-2 flex items-center justify-center mb-3">
                <FileText size={18} className="text-tx-3" strokeWidth={1.6} />
              </div>
              <div className="text-[13px] text-tx-2">Пока нет контента</div>
              <p className="text-[11.5px] text-tx-3 mt-1 max-w-[240px] leading-relaxed">
                Привяжи посты к этой кампании при создании контента.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line -my-2">
              {contents.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-panel-2 flex items-center justify-center flex-shrink-0">
                    <FileText
                      size={13}
                      className="text-tx-3"
                      strokeWidth={1.6}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-tx-1 truncate">
                      {c.title || "Без названия"}
                    </div>
                    <div className="text-[11px] text-tx-3 capitalize">
                      {c.platform} · {c.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
