"use client";
import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Copy, Check, ExternalLink, Edit3,
  Eye, EyeOff, Zap, Database, CreditCard,
  MessageSquare, BarChart2, Users, MousePointer, TrendingUp, Bot,
  Phone, Mail,
} from "lucide-react";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";

// ── Types ─────────────────────────────────────────────────────────────────────
type Settings = {
  brandColor?: string;
  tone?: string;
  autoCloseDays?: number | null;
  logoUrl?: string | null;
  routing?: { aiCallback?: boolean; crm?: boolean; payments?: boolean };
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

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  status: string;
  created_at: string;
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

  const [copied, setCopied]             = useState(false);
  const [activeTab, setActiveTab]       = useState<"leads" | "ai" | "analytics">("leads");
  const [routing, setRouting]           = useState({ aiCallback: true, crm: true, payments: false });
  const [routingInit, setRoutingInit]   = useState(false);

  // AI-оператор демо-состояния (не сохраняются в БД)
  const [pipeline, setPipeline]         = useState("mvira-assistant-v1");
  const [workStart, setWorkStart]       = useState("09:00");
  const [workEnd, setWorkEnd]           = useState("18:00");
  const [escalation, setEscalation]     = useState(true);
  const [aiCall, setAiCall]             = useState(true);
  const [aiAssistant, setAiAssistant]   = useState(false);

  // ── Fetch landing ─────────────────────────────────────────────────────────
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

  // ── Fetch leads ───────────────────────────────────────────────────────────
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["landing_leads", id],
    queryFn: async () => {
      const r = await fetch(`/api/leads?landing_id=${id}`);
      return r.ok ? r.json() : [];
    },
  });

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ["landing_stats", id],
    queryFn: async () => {
      const r = await fetch(`/api/landings/${id}/stats`);
      const { views = 0 } = r.ok ? await r.json() : {};
      return { views };
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
    patchMutation.mutate({
      content: {
        blocks: landing.blocks,
        settings: { ...landing.settings, routing: next },
        template_id: landing.template_id,
        bg_image: landing.bg_image,
      },
    });
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

  const autoCloseDays = landing.settings?.autoCloseDays ?? null;
  let expiryBadge = { label: "Бессрочно", color: "#64748B", bg: "#F8FAFC" };
  if (autoCloseDays !== null) {
    const expiry = new Date(landing.created_at);
    expiry.setDate(expiry.getDate() + autoCloseDays);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
    if (diffDays < 0)        expiryBadge = { label: "Закрыт",              color: "#DC2626", bg: "#FEF2F2" };
    else if (diffDays <= 3)  expiryBadge = { label: `Через ${diffDays} дн.`, color: "#D97706", bg: "#FFFBEB" };
    else                     expiryBadge = { label: `Через ${diffDays} дн.`, color: "#059669", bg: "#ECFDF5" };
  }

  const views      = statsData?.views ?? 0;
  const leadCount  = leads.length;
  const cvr        = views > 0 ? ((leadCount / views) * 100).toFixed(1) + "%" : "—";
  const landingUrl = `https://mvira.uz/l/${landing.slug}`;
  const tpl        = TEMPLATES.find(t => t.id === landing.template_id) ?? TEMPLATES[1];

  // suppress unused-var warnings for kept helpers
  void fmtDate; void autoCloseDays; void expiryBadge;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Шапка ───────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0, borderBottom: "1px solid var(--line)",
        background: "var(--panel)", display: "flex", alignItems: "center",
        gap: 12, padding: "0 20px", zIndex: 10,
      }}>
        <button
          onClick={() => router.push(`/${locale}/landings`)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: "var(--tx-3)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <ChevronLeft size={14} /> Лендинги
        </button>

        <div style={{ width: 1, height: 20, background: "var(--line)" }} />

        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {landing.title}
        </span>

        <button
          onClick={() => router.push(`/${locale}/landings/${id}/edit`)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: "var(--tx-2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Edit3 size={13} /> Редактировать
        </button>

        <button
          onClick={togglePublish}
          disabled={patchMutation.isPending}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 7, border: "none", background: landing.published ? "#FEE2E2" : "var(--accent)", color: landing.published ? "#DC2626" : "var(--on-accent)", fontSize: 13, fontWeight: 600, cursor: patchMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: patchMutation.isPending ? 0.7 : 1 }}
        >
          {landing.published ? <><EyeOff size={13} /> Снять</> : <><Eye size={13} /> Опубликовать</>}
        </button>
      </header>

      {/* ── Тело ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", paddingLeft: 70, paddingTop: 28, paddingBottom: 28, paddingRight: 28, gap: 28 }}>

        {/* ── Левая колонка — телефон ──────────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column" }}>

          {/* URL над телефоном */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "7px 10px", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map(c => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span style={{ flex: 1, fontSize: 11, color: "var(--tx-3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              mvira.uz/l/{landing.slug}
            </span>
            <button
              onClick={copyUrl}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, border: "1px solid var(--line)", background: "var(--panel)", color: copied ? "#059669" : "var(--tx-3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              {copied ? <><Check size={10} /> OK</> : <><Copy size={10} /> Копировать</>}
            </button>
            {landing.published && (
              <a href={landingUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", color: "var(--tx-3)", flexShrink: 0 }}>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Телефонный фрейм */}
          <div style={{
            background: "#1C1C1E", borderRadius: 44,
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
                  <p style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 12 }}>Контент не загружен</p>
                  <button
                    onClick={() => router.push(`/${locale}/landings/${id}/edit`)}
                    style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
                  >
                    Открыть редактор
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Логотип / тип под телефоном */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
            {landing.settings?.logoUrl ? (
              <img src={landing.settings.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 20 }}>{tpl.icon}</span>
            )}
            <span style={{ fontSize: 12, color: "var(--tx-3)", fontWeight: 500 }}>{tpl.name}</span>
          </div>
        </div>

        {/* ── Правая колонка — только вкладки ────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16 }}>

          {/* Таббар */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)", padding: "0 20px", flexShrink: 0 }}>
            {([
              { key: "leads"     as const, label: "Заявки",      Icon: MessageSquare },
              { key: "ai"        as const, label: "AI-оператор", Icon: Bot           },
              { key: "analytics" as const, label: "Аналитика",   Icon: BarChart2     },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "14px 4px", marginRight: 24,
                  background: "none", border: "none",
                  borderBottom: activeTab === key ? "2px solid var(--accent)" : "2px solid transparent",
                  color: activeTab === key ? "var(--accent)" : "var(--tx-3)",
                  fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Содержимое вкладок */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

            {/* ── Заявки ──────────────────────────────────────────────── */}
            {activeTab === "leads" && (
              leads.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 24px", textAlign: "center" }}>
                  <MessageSquare size={32} style={{ color: "var(--tx-3)" }} />
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>Нет заявок</p>
                  <p style={{ fontSize: 13, color: "var(--tx-3)", margin: 0 }}>Появятся когда посетители заполнят форму на лендинге</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leads.map(lead => (
                    <div key={lead.id} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>
                        {lead.name ? lead.name[0].toUpperCase() : "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}>{lead.name || "Без имени"}</span>
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: lead.status === "new" ? "#dbeafe" : "var(--chip)", color: lead.status === "new" ? "#1d4ed8" : "var(--tx-3)", fontWeight: 600 }}>
                            {lead.status === "new" ? "Новая" : lead.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          {lead.phone && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--tx-2)" }}>
                              <Phone size={11} /> {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--tx-2)" }}>
                              <Mail size={11} /> {lead.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--tx-3)", flexShrink: 0, whiteSpace: "nowrap" }}>
                        {new Date(lead.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── AI-оператор ─────────────────────────────────────────── */}
            {activeTab === "ai" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Настройки оператора */}
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Настройки оператора</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-2)", display: "block", marginBottom: 5 }}>Pipeline</label>
                      <input
                        value={pipeline}
                        onChange={e => setPipeline(e.target.value)}
                        placeholder="mvira-assistant-v1"
                        style={{ width: "100%", padding: "8px 11px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--tx-2)", display: "block", marginBottom: 5 }}>Часы работы</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none", fontFamily: "inherit" }} />
                        <span style={{ fontSize: 13, color: "var(--tx-3)" }}>—</span>
                        <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, color: "var(--tx-1)", background: "var(--panel-2)", outline: "none", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    {[
                      { label: "Эскалация на человека", sub: "Передать живому оператору по запросу", value: escalation,  set: setEscalation  },
                      { label: "AI-колл оператор",      sub: "Автоматический звонок за 60 секунд",  value: aiCall,      set: setAiCall      },
                      { label: "AI-ассистент",           sub: "Отвечает в чате на сайте",            value: aiAssistant, set: setAiAssistant },
                    ].map(({ label, sub, value, set }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-1)", margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{sub}</p>
                        </div>
                        <Toggle on={value} onChange={v => set(v)} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Куда идут заявки */}
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Куда идут заявки</p>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {([
                      { key: "aiCallback" as const, Icon: Zap,        label: "AI-оператор обрабатывает", sub: "Звонок + WhatsApp за 1 минуту" },
                      { key: "crm"        as const, Icon: Database,   label: "Запись в CRM",              sub: "Автоматически в воронку"       },
                      { key: "payments"   as const, Icon: CreditCard, label: "Payme / Click оплата",      sub: "Прямо в форме"                  },
                    ]).map(({ key, Icon, label, sub }) => (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon size={15} style={{ color: "var(--tx-2)" }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-1)", margin: 0 }}>{label}</p>
                            <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{sub}</p>
                          </div>
                        </div>
                        <Toggle on={routing[key]} onChange={v => saveRouting({ ...routing, [key]: v })} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Живой транскрипт */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Живой транскрипт</p>
                    <span style={{ fontSize: 10, fontWeight: 600, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 20 }}>AI понимает контекст</span>
                  </div>
                  <div style={{ background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" }}>
                    {[
                      { from: "visitor", text: "Здравствуйте, интересует ваша услуга, сколько стоит?", time: "14:02" },
                      { from: "ai",      text: "Добрый день! Стоимость зависит от объёма работ. Оставьте номер — позвоню за 1 минуту 🙌", time: "14:02" },
                      { from: "visitor", text: "Хорошо, +998 90 123 45 67", time: "14:03" },
                      { from: "ai",      text: "Принято! Звоню прямо сейчас...", time: "14:03" },
                    ].map((msg, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "ai" ? "flex-end" : "flex-start", gap: 2 }}>
                        <div style={{
                          maxWidth: "80%", padding: "8px 11px",
                          borderRadius: msg.from === "ai" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                          background: msg.from === "ai" ? "var(--accent)" : "var(--chip)",
                          color: msg.from === "ai" ? "var(--on-accent)" : "var(--tx-1)",
                          fontSize: 12, lineHeight: 1.5,
                        }}>
                          {msg.text}
                        </div>
                        <span style={{ fontSize: 10, color: "var(--tx-3)" }}>
                          {msg.from === "ai" ? "AI" : "Посетитель"} · {msg.time}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>Live · Подключён</span>
                  </div>
                </section>
              </div>
            )}

            {/* ── Аналитика ───────────────────────────────────────────── */}
            {activeTab === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Три карточки */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {[
                    { Icon: MousePointer, label: "Просмотры", value: views,     color: "#4F46E5" },
                    { Icon: Users,        label: "Заявки",    value: leadCount,  color: "#10B981" },
                    { Icon: TrendingUp,   label: "Конверсия", value: cvr,        color: "#F59E0B" },
                  ].map(({ Icon, label, value, color }) => (
                    <div key={label} style={{ padding: "14px 12px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Icon size={13} style={{ color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)" }}>{label}</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "var(--tx-1)", margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Мини-бар чарт */}
                {leadCount > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Заявки за 7 дней</p>
                    <MiniChart leads={leads} />
                  </div>
                )}

                {/* Последние заявки */}
                {leads.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Последние заявки</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {leads.slice(0, 5).map(l => (
                        <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--panel-2)", borderRadius: 9, border: "1px solid var(--line)" }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>{l.name || "—"}</p>
                            <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{l.phone || "—"}</p>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#10B981", background: "#F0FDF4", padding: "2px 7px", borderRadius: 10 }}>
                            {l.status === "new" ? "Новый" : l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {leadCount === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--tx-3)" }}>
                    <BarChart2 size={32} style={{ margin: "0 auto 12px", opacity: 0.3, display: "block" }} />
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Пока нет данных</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Появятся после первых визитов</p>
                  </div>
                )}
              </div>
            )}

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
