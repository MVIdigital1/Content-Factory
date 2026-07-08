"use client";
import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Copy, Check, ExternalLink, Edit3,
  Eye, EyeOff, Zap, Database, CreditCard,
  MessageSquare, Phone, Mail, BarChart2,
} from "lucide-react";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";

// ── Types ─────────────────────────────────────────────────────────────────────
type Settings = {
  brandColor?: string;
  tone?: string;
  autoCloseDays?: number | null;
  routing?: { aiCallback?: boolean; crm?: boolean; payments?: boolean };
  logoUrl?: string | null;
};

type LP = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  template_id: string;
  bg_image: string | null;
  settings: Settings;
  blocks: Block[];
  created_at: string;
  updated_at: string;
};

// ── Template config ───────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "product",     name: "Товар",   icon: "🛒" },
  { id: "form",        name: "Заявка",  icon: "📋" },
  { id: "appointment", name: "Запись",  icon: "📅" },
  { id: "event",       name: "Событие", icon: "🎉" },
  { id: "menu",        name: "Меню",    icon: "🍽️" },
  { id: "callback",    name: "Звонок",  icon: "📞" },
];

// ── Mini chart ────────────────────────────────────────────────────────────────
function MiniChart({ leads }: { leads: { created_at: string }[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map(day =>
    leads.filter(l => new Date(l.created_at).toDateString() === day.toDateString()).length
  );
  const max = Math.max(...counts, 1);
  return (
    <svg width="100%" height={72} viewBox="0 0 260 72" style={{ display: "block" }}>
      {counts.map((n, i) => {
        const barH = Math.max((n / max) * 48, n > 0 ? 4 : 2);
        const x = i * 38;
        return (
          <g key={i}>
            <rect x={x + 2} y={52 - barH} width={30} height={barH} rx={4}
              fill={n > 0 ? "var(--accent)" : "var(--line)"} opacity={n > 0 ? 0.85 : 1} />
            <text x={x + 17} y={68} textAnchor="middle" fontSize={9} fill="var(--tx-3)">
              {days[i].getDate()}
            </text>
            {n > 0 && (
              <text x={x + 17} y={52 - barH - 4} textAnchor="middle" fontSize={9} fill="var(--accent)" fontWeight="600">
                {n}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{ width: 40, height: 23, borderRadius: 12, background: on ? "var(--accent)" : "var(--line)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </div>
  );
}

// ── Detail inner ──────────────────────────────────────────────────────────────
function LandingDetailInner() {
  const params  = useParams();
  const id      = params.id as string;
  const router  = useRouter();
  const locale  = useLocale();
  const qc      = useQueryClient();

  const [copied, setCopied]           = useState(false);
  const [tab, setTab]                 = useState<"leads" | "ai" | "analytics">("leads");
  const [routing, setRouting]         = useState({ aiCallback: true, crm: true, payments: false });
  const [routingInit, setRoutingInit] = useState(false);

  // AI operator local state (demo, not saved to DB)
  const [pipeline, setPipeline]       = useState("mvira-assistant-v1");
  const [workStart, setWorkStart]     = useState("09:00");
  const [workEnd, setWorkEnd]         = useState("18:00");
  const [escalation, setEscalation]   = useState(true);
  const [aiCall, setAiCall]           = useState(true);
  const [aiAssistant, setAiAssistant] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data: landing, isLoading } = useQuery<LP>({
    queryKey: ["landing", id],
    queryFn: async () => {
      const r = await fetch(`/api/landings/${id}`);
      if (!r.ok) throw new Error("Not found");
      return r.json() as Promise<LP>;
    },
  });

  useEffect(() => {
    if (landing && !routingInit) {
      setRouting({
        aiCallback: landing.settings?.routing?.aiCallback ?? true,
        crm:        landing.settings?.routing?.crm ?? true,
        payments:   landing.settings?.routing?.payments ?? false,
      });
      setRoutingInit(true);
    }
  }, [landing, routingInit]);

  // ── Leads ─────────────────────────────────────────────────────────────────
  const { data: leads = [] } = useQuery({
    queryKey: ["landing_leads", id],
    enabled: tab === "leads" || tab === "analytics",
    queryFn: async () => {
      const res = await fetch(`/api/leads?landing_id=${id}`);
      return res.ok ? res.json() : [];
    },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["landing_detail_stats", id],
    enabled: tab === "analytics",
    queryFn: async () => {
      try {
        const res = await fetch(`/api/landings/${id}/stats`);
        return res.ok ? res.json() : { views: 0 };
      } catch {
        return { views: 0 };
      }
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch(`/api/landings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Ошибка");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing", id] });
      qc.invalidateQueries({ queryKey: ["landing_pages"] });
    },
  });

  const saveRouting = (next: typeof routing) => {
    setRouting(next);
    if (!landing) return;
    const content = {
      blocks: landing.blocks,
      settings: { ...landing.settings, routing: next },
      template_id: landing.template_id,
      bg_image: landing.bg_image,
    };
    patchMutation.mutate({ content });
  };

  const togglePublish = () => {
    if (!landing) return;
    patchMutation.mutate({ published: !landing.published });
  };

  const copyUrl = () => {
    if (!landing) return;
    navigator.clipboard.writeText(`https://mvira.uz/l/${landing.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Date helpers ──────────────────────────────────────────────────────────
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const autoCloseDays = landing?.settings?.autoCloseDays ?? null;
  let expiryBadge = { label: "Бессрочно", color: "#64748B", bg: "#F8FAFC" };
  if (autoCloseDays !== null && landing) {
    const expiry = new Date(landing.created_at);
    expiry.setDate(expiry.getDate() + autoCloseDays);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
    if (diffDays < 0) {
      expiryBadge = { label: "Закрыт", color: "#DC2626", bg: "#FEF2F2" };
    } else if (diffDays <= 3) {
      expiryBadge = { label: `Через ${diffDays} дн.`, color: "#D97706", bg: "#FFFBEB" };
    } else {
      expiryBadge = { label: `Через ${diffDays} дн.`, color: "#059669", bg: "#ECFDF5" };
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading || !landing) {
    return (
      <div style={{ padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ height: 20, width: 120, background: "var(--panel-2)", borderRadius: 6, marginBottom: 24 }} />
        <div style={{ height: 500, background: "var(--panel)", borderRadius: 16, border: "1px solid var(--line)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  const tpl      = TEMPLATES.find(t => t.id === landing.template_id) ?? TEMPLATES[1];
  const leadsArr = leads as any[];
  const views    = (stats as any)?.views ?? 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 20px", borderBottom: "1px solid var(--line)", background: "var(--panel)", flexShrink: 0 }}>
        <button
          onClick={() => router.push(`/${locale}/landings`)}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--tx-3)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontFamily: "inherit", borderRadius: 6, flexShrink: 0 }}
        >
          <ChevronLeft size={14} /> Лендинги
        </button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {landing.title}
        </span>
        <button
          onClick={() => router.push(`/${locale}/landings/${id}/edit`)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-2)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <Edit3 size={13} /> Редактировать
        </button>
        <button
          onClick={togglePublish}
          disabled={patchMutation.isPending}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "none", background: landing.published ? "#FEF2F2" : "var(--accent)", color: landing.published ? "#DC2626" : "var(--on-accent)", fontSize: 13, fontWeight: 600, cursor: patchMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: patchMutation.isPending ? 0.7 : 1, flexShrink: 0 }}
        >
          {landing.published ? <><EyeOff size={13} /> Снять</> : <><Eye size={13} /> Опубликовать</>}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left: phone preview ──────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px", gap: 16, background: "var(--bg)" }}>
          <div style={{
            width: 300, flexShrink: 0,
            background: "#1C1C1E",
            borderRadius: 44,
            padding: "14px 8px 20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 2px #3A3A3C",
          }}>
            <div style={{ width: 80, height: 20, background: "#1C1C1E", borderRadius: 10, margin: "0 auto 8px" }} />
            <div style={{ borderRadius: 32, overflow: "hidden", height: 560, overflowY: "auto", background: "#fff" }}>
              {(landing.blocks ?? []).length > 0 ? (
                <LandingRenderer
                  blocks={landing.blocks}
                  bgImage={landing.bg_image ?? undefined}
                  brandColor={landing.settings?.brandColor ?? "#4F46E5"}
                  preview
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 24, textAlign: "center", background: "var(--panel-2)" }}>
                  <EyeOff size={28} style={{ color: "var(--tx-3)", marginBottom: 10 }} />
                  <p style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 12 }}>Контент не загружен. Откройте редактор.</p>
                  <button
                    onClick={() => router.push(`/${locale}/landings/${id}/edit`)}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--tx-2)", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Открыть редактор
                  </button>
                </div>
              )}
            </div>
          </div>

          {landing.settings?.logoUrl ? (
            <img src={landing.settings.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-3)" }}>
              <span style={{ fontSize: 20 }}>{tpl.icon}</span>
              <span>{tpl.name}</span>
            </div>
          )}
        </div>

        {/* ── Right: panel ─────────────────────────────────────────────── */}
        <div style={{ width: 420, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid var(--line)", background: "var(--panel)" }}>

          {/* Block A: Tabs (~55%) */}
          <div style={{ flex: "0 0 55%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
              {([
                { key: "leads" as const, label: "Заявки" },
                { key: "ai" as const, label: "AI-оператор" },
                { key: "analytics" as const, label: "Аналитика" },
              ]).map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: "10px 4px", fontSize: 12, fontWeight: tab === key ? 600 : 400,
                  color: tab === key ? "var(--accent)" : "var(--tx-3)",
                  background: "none", border: "none",
                  borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit", marginBottom: -1,
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

              {/* ── Заявки ─────────────────────────────────────────────── */}
              {tab === "leads" && (
                leadsArr.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "20px 0" }}>
                    <MessageSquare size={28} style={{ color: "var(--tx-3)", marginBottom: 10 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>Нет заявок</p>
                    <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 4 }}>Появятся когда посетители заполнят форму на лендинге</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {leadsArr.map((lead: any) => (
                      <div key={lead.id} style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: "var(--tx-2)" }}>
                            {lead.name ? lead.name[0].toUpperCase() : "?"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}>{lead.name || "Без имени"}</span>
                              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: lead.status === "new" ? "#dbeafe" : "var(--chip)", color: lead.status === "new" ? "#1d4ed8" : "var(--tx-3)", fontWeight: 600 }}>
                                {lead.status === "new" ? "Новая" : lead.status}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              {lead.phone && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--tx-2)" }}><Phone size={10} /> {lead.phone}</span>}
                              {lead.email && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--tx-2)" }}><Mail size={10} /> {lead.email}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--tx-3)", flexShrink: 0 }}>{fmtShort(lead.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── AI-оператор ────────────────────────────────────────── */}
              {tab === "ai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", marginBottom: 12 }}>Настройки оператора</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--tx-3)", display: "block", marginBottom: 4 }}>Pipeline</label>
                        <input
                          value={pipeline}
                          onChange={e => setPipeline(e.target.value)}
                          placeholder="mvira-assistant-v1"
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--tx-3)", display: "block", marginBottom: 4 }}>Часы работы</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none" }} />
                          <span style={{ fontSize: 12, color: "var(--tx-3)" }}>—</span>
                          <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none" }} />
                        </div>
                      </div>
                      {([
                        { state: escalation, setState: setEscalation, label: "Эскалация на человека", sub: "Передать оператору при запросе" },
                        { state: aiCall,     setState: setAiCall,     label: "AI-колл оператор",      sub: "Автоматический звонок за 60 сек" },
                        { state: aiAssistant, setState: setAiAssistant, label: "AI-ассистент",         sub: "Отвечает в чате на сайте" },
                      ] as { state: boolean; setState: (v: boolean) => void; label: string; sub: string }[]).map(({ state, setState, label, sub }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-1)", margin: 0 }}>{label}</p>
                            <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0 }}>{sub}</p>
                          </div>
                          <Toggle on={state} onChange={setState} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>Живой транскрипт</p>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#dcfce7", color: "#16a34a", fontWeight: 600 }}>AI понимает контекст</span>
                    </div>
                    <div style={{ height: 200, overflowY: "auto", background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--line)", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { who: "visitor", time: "14:02", text: "Здравствуйте, интересует ваша услуга, сколько стоит?" },
                        { who: "ai",      time: "14:02", text: "Добрый день! Стоимость зависит от объёма работ. Оставьте номер — позвоню за 1 минуту и всё расскажу 🙌" },
                        { who: "visitor", time: "14:03", text: "Хорошо, +998 90 123 45 67" },
                        { who: "ai",      time: "14:03", text: "Принято! Звоню прямо сейчас..." },
                      ].map((msg, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.who === "ai" ? "flex-end" : "flex-start" }}>
                          <div style={{
                            maxWidth: "85%", padding: "7px 10px", borderRadius: 10, fontSize: 11, lineHeight: 1.4,
                            background: msg.who === "ai" ? "var(--accent)" : "var(--chip)",
                            color: msg.who === "ai" ? "var(--on-accent)" : "var(--tx-1)",
                          }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: 9, color: "var(--tx-3)", marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                            {msg.who === "visitor" ? "Посетитель" : "AI"} {msg.time}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                      <span style={{ fontSize: 11, color: "var(--tx-3)" }}>Live • Подключён</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Аналитика ──────────────────────────────────────────── */}
              {tab === "analytics" && (
                leadsArr.length === 0 && views === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "20px 0" }}>
                    <BarChart2 size={28} style={{ color: "var(--tx-3)", marginBottom: 10 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>Пока нет данных</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { label: "Просмотры", value: views > 0 ? views : "—" },
                        { label: "Заявки",    value: leadsArr.length > 0 ? leadsArr.length : "—" },
                        { label: "Конверсия", value: views > 0 && leadsArr.length > 0 ? `${Math.round(leadsArr.length / views * 100)}%` : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ padding: "10px 8px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, textAlign: "center" }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>{value}</p>
                          <p style={{ fontSize: 10, color: "var(--tx-3)", margin: "2px 0 0" }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    <MiniChart leads={leadsArr} />
                    {leadsArr.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Последние заявки</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {leadsArr.slice(0, 5).map((lead: any) => (
                            <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--panel-2)", borderRadius: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-1)" }}>{lead.name || "—"}</span>
                                {lead.phone && <span style={{ fontSize: 11, color: "var(--tx-3)", marginLeft: 8 }}>{lead.phone}</span>}
                              </div>
                              <span style={{ fontSize: 10, color: "var(--tx-3)", flexShrink: 0 }}>{fmtShort(lead.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Block B: Info cards */}
          <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid var(--line)" }}>

            {/* URL */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Адрес страницы</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px" }}>
                <span style={{ flex: 1, fontSize: 12, color: "var(--tx-1)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  /l/{landing.slug}
                </span>
                <button onClick={copyUrl} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel)", color: copied ? "#059669" : "var(--tx-2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  {copied ? <><Check size={10} /> Скопировано</> : <><Copy size={10} /> Копировать</>}
                </button>
                {landing.published && (
                  <a href={`https://mvira.uz/l/${landing.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tx-3)", display: "flex" }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {/* Template grid */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Шаблон</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                {TEMPLATES.map(t => {
                  const active = landing.template_id === t.id;
                  return (
                    <div key={t.id} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "8px 4px", borderRadius: 8,
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                      background: active ? "rgba(var(--accent-rgb, 99 102 241) / 0.06)" : "transparent",
                    }}>
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? "var(--accent)" : "var(--tx-3)" }}>{t.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lifecycle */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Жизненный цикл</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>{landing.published ? "Опубликован" : "Черновик"}</p>
                  <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>{fmtDate(landing.created_at)}</p>
                  {autoCloseDays !== null && (
                    <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>Авто-закрытие через {autoCloseDays} дней</p>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 16, color: expiryBadge.color, background: expiryBadge.bg, border: `1px solid ${expiryBadge.color}30`, whiteSpace: "nowrap" }}>
                  {expiryBadge.label}
                </span>
              </div>
            </div>

            {/* Routing toggles */}
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Куда идут заявки</p>
              {([
                { key: "aiCallback" as const, Icon: Zap,        label: "AI-оператор обрабатывает", sub: "Звонок + WhatsApp за 1 минуту" },
                { key: "crm"        as const, Icon: Database,   label: "Запись в CRM",              sub: "Автоматически в воронку"       },
                { key: "payments"   as const, Icon: CreditCard, label: "Payme / Click оплата",      sub: "Прямо в форме"                 },
              ] as { key: keyof typeof routing; Icon: any; label: string; sub: string }[]).map(({ key, Icon, label, sub }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={13} style={{ color: "var(--tx-2)" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-1)", margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0 }}>{sub}</p>
                    </div>
                  </div>
                  <Toggle on={routing[key]} onChange={v => saveRouting({ ...routing, [key]: v })} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LandingDetailPage() {
  return <Suspense fallback={null}><LandingDetailInner /></Suspense>;
}
