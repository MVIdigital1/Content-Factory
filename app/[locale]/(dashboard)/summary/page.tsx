import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp, Users, Wallet, Coins, Target,
  Megaphone, ArrowRight, FileText, CalendarClock,
} from "lucide-react";

type Campaign = {
  id: string; name: string;
  status: "generating" | "ready" | "running" | "completed";
  budget_total: number | null; budget_spent: number | null;
  customers: number | null; leads: number | null; revenue: number | null;
  project_name?: string | null;
};

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) { const v = n / 1_000_000; return (Number.isInteger(v) ? v : v.toFixed(1)) + " млн"; }
  if (n >= 1_000) return Math.round(n / 1_000) + " тыс";
  return Math.round(n).toString();
}

function roiOf(c: Campaign) {
  const spent = c.budget_spent || 0;
  if (spent <= 0) return null;
  return Math.round((((c.revenue || 0) - spent) / spent) * 100);
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  running: { label: "Активна", cls: "bg-accent-dim text-accent" },
  ready: { label: "Запланирована", cls: "bg-chip text-tx-2" },
  generating: { label: "Генерируется", cls: "bg-chip text-tx-2" },
  completed: { label: "Завершена", cls: "bg-chip text-tx-3" },
};

export default async function SummaryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ru/auth/login");

  const locale = await getLocale();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    campaignsRaw,
    publishedRows,
    scheduledRows,
    totalRows,
    contentDates,
  ] = await Promise.all([
    query(`SELECT id, name, status, budget_total, budget_spent, customers, leads, revenue,
            (SELECT name FROM projects WHERE id = ac.project_id) as project_name
            FROM ad_campaigns ac WHERE user_id = $1`, [user.id]),
    query(`SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'published'`, [user.id]),
    query(`SELECT COUNT(*) as count FROM contents WHERE user_id = $1 AND status = 'scheduled'`, [user.id]),
    query(`SELECT COUNT(*) as count FROM contents WHERE user_id = $1`, [user.id]),
    query(`SELECT created_at FROM contents WHERE user_id = $1 AND created_at >= $2`, [user.id, sixMonthsAgo.toISOString()]),
  ]);

  const campaigns = campaignsRaw as Campaign[];
  const publishedCount = Number((publishedRows[0] as any)?.count ?? 0);
  const scheduledCount = Number((scheduledRows[0] as any)?.count ?? 0);
  const totalContent = Number((totalRows[0] as any)?.count ?? 0);

  const totalBudget = campaigns.reduce((s, c) => s + (c.budget_total || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.budget_spent || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalCustomers = campaigns.reduce((s, c) => s + (c.customers || 0), 0);

  const roi = totalSpent > 0 ? Math.round(((totalRevenue - totalSpent) / totalSpent) * 100) : null;
  const cac = totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : null;
  const ltv = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : null;
  const ratio = cac && cac > 0 && ltv != null ? (ltv / cac).toFixed(1) : null;
  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const activeCount = campaigns.filter((c) => c.status === "running").length;

  const topCampaigns = [...campaigns].sort((a, b) => (roiOf(b) ?? -1) - (roiOf(a) ?? -1)).slice(0, 4);

  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("ru-RU", { month: "short" }), count: 0 };
  });
  (contentDates as { created_at: string }[]).forEach((c) => {
    const d = new Date(c.created_at);
    const b = buckets.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) b.count++;
  });
  const maxCount = Math.max(1, ...buckets.map((m) => m.count));
  const xs = buckets.map((_, i) => 40 + i * ((560 - 40) / 5));
  const ys = buckets.map((m) => 160 - (m.count / maxCount) * 140);
  let lineD = `M ${xs[0]},${ys[0].toFixed(1)}`;
  for (let i = 1; i < 6; i++) lineD += ` L ${xs[i]},${ys[i].toFixed(1)}`;
  const areaD = `${lineD} L ${xs[5]},160 L ${xs[0]},160 Z`;

  const monthTitle = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (s) => s.toUpperCase());

  const metrics = [
    { label: "ROI контента", val: roi != null ? `${roi}%` : "—", Icon: TrendingUp, accent: true },
    { label: "CAC · стоимость клиента", val: cac != null ? `${fmtMoney(cac)} сум` : "—", Icon: Users },
    { label: "LTV · ценность клиента", val: ltv != null ? `${fmtMoney(ltv)} сум` : "—", Icon: Wallet },
    { label: "Выручка с кампаний", val: totalRevenue > 0 ? `${fmtMoney(totalRevenue)} сум` : "—", Icon: Coins },
  ];

  const hasData = campaigns.length > 0;

  return (
    <div className="p-7 md:p-8">
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="ui-label">Сводка для руководителя</div>
          <h1 className="text-[30px] font-semibold tracking-tight text-tx-1 mt-2">{monthTitle}</h1>
          <p className="text-[13.5px] text-tx-2 mt-2 max-w-[460px] leading-relaxed">
            Экономика всех кампаний, бюджет и выпуск контента — на одном экране.
          </p>
        </div>
        <Link href={`/${locale}/campaigns`} className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-[10px] border border-line text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors">
          <Megaphone size={15} strokeWidth={1.8} /> Все кампании
        </Link>
      </div>

      {!hasData && (
        <div className="ui-surface flex flex-col items-center justify-center text-center py-16 px-6 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
            <Target size={22} className="text-accent" strokeWidth={1.6} />
          </div>
          <div className="text-[15px] font-semibold text-tx-1">Пока нет данных по экономике</div>
          <p className="text-[12.5px] text-tx-3 mt-1.5 max-w-[360px] leading-relaxed">
            Создай кампанию и внеси бюджет и результаты — здесь появятся ROI, CAC и LTV по всему бизнесу.
          </p>
          <Link href={`/${locale}/campaigns`} className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-[10px] bg-accent text-on-accent hover:opacity-90 transition-opacity">
            Перейти к кампаниям <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-4">
        {metrics.map((m) => (
          <div key={m.label} className="ui-surface p-4">
            <div className="flex items-center mb-4">
              <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center ${m.accent ? "bg-accent-dim" : "bg-panel-2"}`}>
                <m.Icon size={15} className={m.accent ? "text-accent" : "text-tx-2"} strokeWidth={1.6} />
              </div>
            </div>
            <div className={`ui-num text-[24px] font-semibold leading-none ${m.accent ? "text-accent" : "text-tx-1"}`}>{m.val}</div>
            <div className="text-[11px] text-tx-3 mt-2">{m.label}</div>
          </div>
        ))}
        <div className="ui-surface p-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-[9px] bg-panel-2 flex items-center justify-center">
              <Wallet size={15} className="text-tx-2" strokeWidth={1.6} />
            </div>
          </div>
          <div className="ui-num text-[24px] font-semibold leading-none text-tx-1">
            {fmtMoney(totalSpent)}<span className="text-[14px] text-tx-2 font-medium"> / {fmtMoney(totalBudget)}</span>
          </div>
          <div className="text-[11px] text-tx-3 mt-2 mb-2">Бюджет кампаний</div>
          <div className="h-[4px] rounded-full bg-track overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${budgetPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <div className="ui-surface p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[14.5px] font-semibold text-tx-1">Выпуск контента по месяцам</h2>
            <span className="ui-label">6 месяцев</span>
          </div>
          <svg viewBox="0 0 600 200" style={{ width: "100%", height: "auto", marginTop: 8 }}>
            <line x1="40" y1="160" x2="560" y2="160" style={{ stroke: "var(--line-strong)" }} />
            <line x1="40" y1="120" x2="560" y2="120" style={{ stroke: "var(--line)" }} />
            <line x1="40" y1="80" x2="560" y2="80" style={{ stroke: "var(--line)" }} />
            <line x1="40" y1="40" x2="560" y2="40" style={{ stroke: "var(--line)" }} />
            <path d={areaD} style={{ fill: "var(--accent-dim)" }} />
            <path d={lineD} fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--accent)" }} />
            <circle cx={xs[5]} cy={ys[5]} r="3.5" style={{ fill: "var(--accent)" }} />
            {buckets.map((m, i) => (
              <text key={m.key} x={xs[i]} y="184" textAnchor="middle" style={{ fill: "var(--tx-3)", fontSize: 10.5, letterSpacing: 1 }}>{m.label}</text>
            ))}
          </svg>
        </div>

        <div className="ui-surface p-5">
          <h2 className="text-[14.5px] font-semibold text-tx-1 mb-3">Юнит-экономика</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="ui-num text-[34px] font-semibold text-accent">{ratio != null ? `${ratio}×` : "—"}</span>
            <span className="text-[13px] text-tx-2">LTV к CAC</span>
          </div>
          <p className="text-[11.5px] text-tx-3 leading-relaxed mb-4">
            Здоровый показатель — выше 3×.{" "}
            {ratio != null && Number(ratio) >= 3 ? "Контент окупается с запасом." : "Появится, когда внесёшь результаты кампаний."}
          </p>
          <div className="ui-label mb-1">Контент</div>
          <div className="flex items-center justify-between py-2.5 border-b border-line">
            <span className="flex items-center gap-2 text-[13px] text-tx-1"><FileText size={14} className="text-tx-3" /> Опубликовано</span>
            <span className="ui-num text-[14px] font-semibold text-tx-1">{publishedCount}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-line">
            <span className="flex items-center gap-2 text-[13px] text-tx-1"><CalendarClock size={14} className="text-tx-3" /> Запланировано</span>
            <span className="ui-num text-[14px] font-semibold text-tx-1">{scheduledCount}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-[13px] text-tx-1"><Coins size={14} className="text-tx-3" /> Всего создано</span>
            <span className="ui-num text-[14px] font-semibold text-tx-1">{totalContent}</span>
          </div>
        </div>
      </div>

      {hasData && (
        <div className="ui-surface p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[14.5px] font-semibold text-tx-1">Кампании · {activeCount} активных</h2>
            <Link href={`/${locale}/campaigns`} className="text-[12px] text-tx-2 hover:text-accent transition-colors inline-flex items-center gap-1">
              Все <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {topCampaigns.map((c, i) => {
              const r = roiOf(c);
              const spent = c.budget_spent || 0;
              const total = c.budget_total || 0;
              const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
              const st = STATUS_META[c.status] || STATUS_META.ready;
              return (
                <Link key={c.id} href={`/${locale}/campaigns/${c.id}`} className="grid grid-cols-[24px_2.2fr_1.6fr_1fr_100px] items-center gap-4 py-3.5 group">
                  <div className="ui-num text-[12px] text-tx-3">{String(i + 1).padStart(2, "0")}</div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-tx-1 truncate group-hover:text-accent transition-colors">{c.name}</div>
                    {c.project_name && <div className="text-[11.5px] text-tx-3 truncate mt-0.5">{c.project_name}</div>}
                  </div>
                  <div className="hidden md:block">
                    <div className="h-[5px] rounded-full bg-track overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="ui-num text-[11.5px] text-tx-2 mt-1.5">{fmtMoney(spent)} / {fmtMoney(total)} сум</div>
                  </div>
                  <div className="hidden md:block">
                    <div className={`ui-num text-[17px] font-semibold ${r != null ? "text-accent" : "text-tx-3"}`}>{r != null ? `${r}%` : "—"}</div>
                    <div className="text-[10.5px] text-tx-3">ROI</div>
                  </div>
                  <div><span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${st.cls}`}>{st.label}</span></div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
