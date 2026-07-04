"use client";
import { Suspense, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Copy, Check, ExternalLink, Edit3,
  Eye, EyeOff, Zap, Database, CreditCard,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Settings = {
  brandColor?: string;
  tone?: string;
  autoCloseDays?: number | null;
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

// ── Detail inner ──────────────────────────────────────────────────────────────
function LandingDetailInner() {
  const params = useParams();
  const id     = params.id as string;
  const router = useRouter();
  const locale = useLocale();
  const qc     = useQueryClient();

  const [copied, setCopied]     = useState(false);
  const [routing, setRouting] = useState({ aiCallback: true, crm: true, payments: false });
  const [routingInit, setRoutingInit] = useState(false);

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

  // ── Copy URL ──────────────────────────────────────────────────────────────
  const copyUrl = () => {
    if (!landing) return;
    navigator.clipboard.writeText(`https://mvira.uz/l/${landing.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Date helpers ──────────────────────────────────────────────────────────
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

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
      </div>
    );
  }

  const landingUrl = `https://mvira.uz/l/${landing.slug}`;
  const tpl = TEMPLATES.find(t => t.id === landing.template_id) ?? TEMPLATES[1];

  return (
    <div style={{ padding: "28px 32px 64px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Back nav ────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push(`/${locale}/landings`)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-3)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 20, fontFamily: "inherit" }}
      >
        <ChevronLeft size={14} /> Лендинги
      </button>

      {/* ── Title row ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>{landing.title}</h1>
          <p style={{ fontSize: 13, color: "var(--tx-3)", margin: "4px 0 0" }}>
            {tpl.icon} {tpl.name} · {landing.published ? "Опубликован" : "Черновик"}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/landings/${id}/edit`)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--tx-2)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          <Edit3 size={14} /> Редактировать
        </button>
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 28, alignItems: "start" }}>

        {/* ── Left: phone iframe mockup ──────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 20, padding: "32px 24px" }}>
          <div style={{
            width: 320, flexShrink: 0,
            background: "#1C1C1E",
            borderRadius: 44,
            padding: "14px 8px 20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 2px #3A3A3C",
          }}>
            {/* Notch */}
            <div style={{ width: 80, height: 20, background: "#1C1C1E", borderRadius: 10, margin: "0 auto 8px" }} />
            {/* Screen */}
            <div style={{ borderRadius: 32, overflow: "hidden", height: 560, background: "#fff" }}>
              {landing.published ? (
                <iframe
                  src={`/l/${landing.slug}`}
                  style={{ width: "100%", height: "100%", border: "none", transform: "scale(1)", transformOrigin: "top left" }}
                  title="Landing preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 24, textAlign: "center", background: "var(--panel-2)" }}>
                  <EyeOff size={32} style={{ color: "var(--tx-3)", marginBottom: 12 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-2)", margin: 0 }}>Черновик</p>
                  <p style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 6 }}>Опубликуйте лендинг, чтобы увидеть превью</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: config panel ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 1. Header card */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              AI-лендинг
            </p>
            <p style={{ fontSize: 14, color: "var(--tx-2)", lineHeight: 1.55 }}>
              Лендинг создан с помощью AI и привязан к кампании. Настройте маршрутизацию заявок и жизненный цикл страницы.
            </p>
          </div>

          {/* 2. URL */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Адрес страницы
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--tx-1)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                mvira.uz/l/{landing.slug}
              </span>
              <button onClick={copyUrl} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--panel)", color: copied ? "#059669" : "var(--tx-2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Копировать</>}
              </button>
              {landing.published && (
                <a href={landingUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", color: "var(--tx-3)", padding: 4 }}>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          {/* 3. Template grid */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Шаблон
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {TEMPLATES.map(t => {
                const active = landing.template_id === t.id;
                return (
                  <div key={t.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 6px", borderRadius: 10,
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    background: active ? "rgba(var(--accent-rgb, 99 102 241) / 0.06)" : "transparent",
                  }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "var(--accent)" : "var(--tx-3)" }}>
                      {t.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Lifecycle */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Жизненный цикл
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                  {landing.published ? "Опубликован" : "Черновик"}
                </p>
                <p style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 2 }}>
                  {fmtDate(landing.created_at)}
                </p>
                {autoCloseDays !== null && (
                  <p style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 4 }}>
                    Авто-закрытие через {autoCloseDays} дней
                  </p>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: "4px 10px", borderRadius: 20,
                color: expiryBadge.color,
                background: expiryBadge.bg,
                border: `1px solid ${expiryBadge.color}30`,
                whiteSpace: "nowrap",
              }}>
                {expiryBadge.label}
              </span>
            </div>
          </div>

          {/* 5. Routing toggles */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
              Куда идут заявки
            </p>
            {[
              { key: "aiCallback" as const, Icon: Zap,        label: "AI-оператор обрабатывает", sub: "Звонок + WhatsApp за 1 минуту" },
              { key: "crm"        as const, Icon: Database,   label: "Запись в CRM",              sub: "Автоматически в воронку"       },
              { key: "payments"   as const, Icon: CreditCard, label: "Payme / Click оплата",      sub: "Прямо в форме"                  },
            ].map(({ key, Icon, label, sub }) => (
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

          {/* 6. Publish button */}
          <button
            onClick={togglePublish}
            disabled={patchMutation.isPending}
            style={{
              width: "100%", height: 48,
              border: "none", borderRadius: 12,
              background: landing.published ? "#FEF2F2" : "var(--accent)",
              color: landing.published ? "#DC2626" : "var(--on-accent)",
              fontSize: 14, fontWeight: 600, cursor: patchMutation.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
              opacity: patchMutation.isPending ? 0.7 : 1,
            }}
          >
            {landing.published ? <><EyeOff size={16} /> Снять с публикации</> : <><Eye size={16} /> Опубликовать лендинг</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle component ──────────────────────────────────────────────────────────
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

// ── Export ────────────────────────────────────────────────────────────────────
export default function LandingDetailPage() {
  return <Suspense fallback={null}><LandingDetailInner /></Suspense>;
}
