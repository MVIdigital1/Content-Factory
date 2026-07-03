"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";
import { ChevronLeft, ExternalLink, Plus, X } from "lucide-react";

type LandingPage = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[];
  bg_image: string | null;
  settings: {
    brandColor?: string;
    tone?: string;
    autoCloseDays?: number | null;
    routing?: { aiCallback?: boolean; crm?: boolean; payments?: boolean };
  };
  template_id: string;
  created_at?: string;
  updated_at?: string;
};

const TEMPLATE_TYPES = [
  { id: "product",     name: "Товар",   icon: "🛒" },
  { id: "form",        name: "Заявка",  icon: "📋" },
  { id: "appointment", name: "Запись",  icon: "📅" },
  { id: "event",       name: "Событие", icon: "🎉" },
  { id: "menu",        name: "Меню",    icon: "🍽️" },
  { id: "callback",    name: "Звонок",  icon: "📞" },
];

const LIFECYCLE_OPTIONS = [
  { value: 1,   label: "24 часа" },
  { value: 3,   label: "3 дня" },
  { value: 7,   label: "7 дней" },
  { value: 30,  label: "30 дней" },
  { value: null, label: "Бессрочно" },
];

export default function LandingEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [templateType, setTemplateType] = useState("product");
  const [autoCloseDays, setAutoCloseDays] = useState<number | null>(null);
  const [routing, setRouting] = useState({ aiCallback: true, crm: true, payments: false });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: landing, isLoading } = useQuery({
    queryKey: ["landing", id],
    queryFn: async () => {
      const res = await fetch(`/api/landings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<LandingPage>;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["landing_stats", id],
    queryFn: async () => {
      const [leadsRes, viewsRes] = await Promise.all([
        fetch(`/api/leads?landing_id=${id}`),
        fetch(`/api/landings/${id}/stats`),
      ]);
      const leads = leadsRes.ok ? (await leadsRes.json() as any[]) : [];
      const viewData = viewsRes.ok ? await viewsRes.json() : { views: 0 };
      return { leadCount: leads.length, views: viewData.views ?? 0 };
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!landing) return;
    setBlocks(landing.blocks ?? []);
    setTemplateType(landing.template_id || "product");
    setAutoCloseDays(landing.settings?.autoCloseDays ?? null);
    setRouting({
      aiCallback: landing.settings?.routing?.aiCallback ?? true,
      crm: landing.settings?.routing?.crm ?? true,
      payments: landing.settings?.routing?.payments ?? false,
    });
  }, [landing]);

  const brandColor = landing?.settings?.brandColor || "#6366f1";

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      setSaving(true);
      const content = {
        blocks,
        template_id: templateType,
        bg_image: landing?.bg_image ?? null,
        settings: {
          brandColor,
          tone: landing?.settings?.tone,
          autoCloseDays,
          routing,
        },
      };
      const body: Record<string, unknown> = { content };
      if (publish !== undefined) body.published = publish;
      const res = await fetch(`/api/landings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
    },
    onSuccess: () => {
      setSaving(false);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["landing", id] });
      qc.invalidateQueries({ queryKey: ["landing_pages"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => setSaving(false),
  });

  const updateBlock = (field: string, value: string | boolean) => {
    if (selectedIndex === null) return;
    setBlocks((prev) => {
      const next = [...prev];
      next[selectedIndex] = { ...next[selectedIndex], [field]: value } as Block;
      return next;
    });
  };

  const updateFeatureItem = (itemIndex: number, field: string, value: string) => {
    if (selectedIndex === null) return;
    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...(next[selectedIndex] as any) };
      const items = [...(block.items || [])];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      block.items = items;
      next[selectedIndex] = block;
      return next;
    });
  };

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--tx-3)", fontSize: 14 }}>
        Загрузка...
      </div>
    );
  }

  if (!landing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--tx-3)", fontSize: 14 }}>
        Лендинг не найден
      </div>
    );
  }

  const publishedAt = new Date(landing.updated_at || landing.id);
  const minutesSince = Math.round((Date.now() - publishedAt.getTime()) / 60000);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Left: Phone preview ──────────────────────────────────────── */}
      <div style={{ flex: 1, background: "#f0f0ef", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, overflow: "hidden" }}>
        {/* Top controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, alignSelf: "stretch" }}>
          <button
            onClick={() => router.push(`/${locale}/landings`)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#555", cursor: "pointer" }}
          >
            <ChevronLeft size={15} /> Назад
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#333", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {landing.title}
          </span>
          {landing.published && (
            <a
              href={`/l/${landing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#555", textDecoration: "none" }}
            >
              <ExternalLink size={13} /> Открыть
            </a>
          )}
        </div>

        {/* Phone frame */}
        <div style={{ width: 320, height: 620, background: "#1a1a18", borderRadius: 44, padding: "14px 10px", boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 2px #333", flexShrink: 0 }}>
          {/* Notch */}
          <div style={{ width: 80, height: 20, background: "#1a1a18", borderRadius: 10, margin: "0 auto 8px", position: "relative", zIndex: 2 }} />
          <div style={{ height: "calc(100% - 28px)", borderRadius: 34, overflow: "auto", background: "#fff", scrollbarWidth: "none" }}>
            <LandingRenderer
              blocks={blocks}
              bgImage={landing.bg_image || undefined}
              brandColor={brandColor}
              preview
              onSelectBlock={(i) => setSelectedIndex(selectedIndex === i ? null : i)}
              selectedIndex={selectedIndex}
            />
          </div>
        </div>

        {selectedIndex !== null && (
          <p style={{ fontSize: 12, color: "#888" }}>
            Кликните на блок чтобы выбрать · нажмите ✕ чтобы закрыть редактор
          </p>
        )}
      </div>

      {/* ── Right: Settings panel ─────────────────────────────────────── */}
      <div style={{ width: 340, borderLeft: "1px solid var(--line)", background: "var(--panel)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)" }}>AI Лендинг</span>
            <button
              onClick={() => router.push(`/${locale}/landings/create`)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--chip)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 12, color: "var(--tx-2)", cursor: "pointer" }}
            >
              <Plus size={13} /> Создать ещё
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>
            AI генерирует лендинг под кампанию · настройте параметры ниже
          </p>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Результаты</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "Просмотры", value: stats?.views ?? "—", icon: "👁️" },
                { label: "Заявки", value: stats?.leadCount ?? "—", icon: "📩" },
                { label: "Конверсия", value: stats && stats.views > 0 ? `${((stats.leadCount / stats.views) * 100).toFixed(1)}%` : "—", icon: "📈" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--chip)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--tx-3)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Template type */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Тип лендинга</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {TEMPLATE_TYPES.map((t) => {
                const active = templateType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTemplateType(t.id)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 6px", borderRadius: 10, border: active ? `2px solid var(--accent)` : "1.5px solid var(--line)", background: active ? "color-mix(in srgb, var(--accent) 10%, var(--panel))" : "var(--chip)", cursor: "pointer", transition: "all 0.15s" }}
                  >
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "var(--accent)" : "var(--tx-2)" }}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Lifecycle */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Жизненный цикл</p>
            <div style={{ background: "var(--chip)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {landing.published && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--tx-3)" }}>Опубликован</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>{minutesSince} мин назад</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--tx-3)" }}>Авто-закрытие</span>
                <select
                  value={autoCloseDays === null ? "null" : String(autoCloseDays)}
                  onChange={(e) => setAutoCloseDays(e.target.value === "null" ? null : Number(e.target.value))}
                  style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", background: "transparent", border: "none", outline: "none", cursor: "pointer" }}
                >
                  {LIFECYCLE_OPTIONS.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Lead routing */}
          <section>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Куда идут лиды</p>
            <div style={{ background: "var(--chip)", borderRadius: 10, overflow: "hidden" }}>
              {[
                { key: "aiCallback" as const, label: "AI-менеджер обрабатывает", icon: "🤖" },
                { key: "crm" as const,        label: "Заявки в CRM",             icon: "📊" },
                { key: "payments" as const,   label: "PayMall платёжи",          icon: "💳" },
              ].map((item, i) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < 2 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--tx-1)" }}>{item.label}</span>
                  <div
                    onClick={() => setRouting((p) => ({ ...p, [item.key]: !p[item.key] }))}
                    style={{ width: 36, height: 20, borderRadius: 10, background: routing[item.key] ? "var(--accent)" : "var(--line)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                  >
                    <div style={{ position: "absolute", top: 2, left: routing[item.key] ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Block editor — shown when a block is selected */}
          {selectedBlock && (
            <section style={{ background: "var(--chip)", borderRadius: 12, padding: "14px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tx-1)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Редактировать блок
                </span>
                <button onClick={() => setSelectedIndex(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 2 }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {selectedBlock.type === "hero" && (
                  <>
                    <SideField label="Метка (badge)">
                      <input value={(selectedBlock as any).badge || ""} onChange={(e) => updateBlock("badge", e.target.value)} style={inp} placeholder="напр. Скидка 30% сейчас" />
                    </SideField>
                    <SideField label="Заголовок">
                      <textarea value={(selectedBlock as any).headline || ""} onChange={(e) => updateBlock("headline", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
                    </SideField>
                    <SideField label="Подзаголовок">
                      <textarea value={(selectedBlock as any).subheadline || ""} onChange={(e) => updateBlock("subheadline", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
                    </SideField>
                    <SideField label="Кнопка">
                      <input value={(selectedBlock as any).cta || ""} onChange={(e) => updateBlock("cta", e.target.value)} style={inp} />
                    </SideField>
                  </>
                )}

                {selectedBlock.type === "price" && (
                  <>
                    <SideField label="Эмодзи">
                      <input value={(selectedBlock as any).emoji || ""} onChange={(e) => updateBlock("emoji", e.target.value)} style={inp} placeholder="🛒" />
                    </SideField>
                    <SideField label="Старая цена">
                      <input value={(selectedBlock as any).oldPrice || ""} onChange={(e) => updateBlock("oldPrice", e.target.value)} style={inp} placeholder="150 000 сум" />
                    </SideField>
                    <SideField label="Новая цена">
                      <input value={(selectedBlock as any).newPrice || ""} onChange={(e) => updateBlock("newPrice", e.target.value)} style={inp} placeholder="99 000 сум" />
                    </SideField>
                    <SideField label="Кнопка">
                      <input value={(selectedBlock as any).cta || ""} onChange={(e) => updateBlock("cta", e.target.value)} style={inp} placeholder="Заказать сейчас" />
                    </SideField>
                  </>
                )}

                {selectedBlock.type === "form" && (
                  <>
                    <SideField label="Заголовок">
                      <input value={(selectedBlock as any).title || ""} onChange={(e) => updateBlock("title", e.target.value)} style={inp} />
                    </SideField>
                    <SideField label="Подзаголовок">
                      <input value={(selectedBlock as any).subtitle || ""} onChange={(e) => updateBlock("subtitle", e.target.value)} style={inp} />
                    </SideField>
                    <SideField label="Кнопка">
                      <input value={(selectedBlock as any).button || ""} onChange={(e) => updateBlock("button", e.target.value)} style={inp} />
                    </SideField>
                    <SideField label="Примечание">
                      <input value={(selectedBlock as any).note || ""} onChange={(e) => updateBlock("note", e.target.value)} style={inp} placeholder="AI перезвонит за 1 минуту" />
                    </SideField>
                    <SideField label="Тёмный фон">
                      <div
                        onClick={() => updateBlock("dark", !(selectedBlock as any).dark)}
                        style={{ width: 36, height: 20, borderRadius: 10, background: (selectedBlock as any).dark ? "var(--accent)" : "var(--line)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                      >
                        <div style={{ position: "absolute", top: 2, left: (selectedBlock as any).dark ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                    </SideField>
                  </>
                )}

                {selectedBlock.type === "features" && (
                  <>
                    <SideField label="Заголовок секции">
                      <input value={(selectedBlock as any).title || ""} onChange={(e) => updateBlock("title", e.target.value)} style={inp} />
                    </SideField>
                    {((selectedBlock as any).items || []).map((item: any, idx: number) => (
                      <div key={idx} style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                        <p style={{ fontSize: 10, color: "var(--tx-3)", marginBottom: 6 }}>Пункт {idx + 1}</p>
                        <input value={item.icon || ""} onChange={(e) => updateFeatureItem(idx, "icon", e.target.value)} style={{ ...inp, marginBottom: 5 }} placeholder="Иконка" />
                        <input value={item.title} onChange={(e) => updateFeatureItem(idx, "title", e.target.value)} style={{ ...inp, marginBottom: 5 }} placeholder="Заголовок" />
                        <textarea value={item.desc || ""} onChange={(e) => updateFeatureItem(idx, "desc", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Описание" />
                      </div>
                    ))}
                  </>
                )}

                {selectedBlock.type === "text" && (
                  <>
                    <SideField label="Заголовок">
                      <input value={(selectedBlock as any).title || ""} onChange={(e) => updateBlock("title", e.target.value)} style={inp} />
                    </SideField>
                    <SideField label="Текст">
                      <textarea value={(selectedBlock as any).body || ""} onChange={(e) => updateBlock("body", e.target.value)} rows={4} style={{ ...inp, resize: "vertical" }} />
                    </SideField>
                  </>
                )}

                <button
                  onClick={() => { saveMutation.mutate(undefined); setSelectedIndex(null); }}
                  style={{ width: "100%", background: "var(--accent)", color: "var(--on-accent)", border: "none", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                >
                  Сохранить блок
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Bottom: save + publish */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => saveMutation.mutate(undefined)}
            disabled={saving}
            style={{ width: "100%", background: "var(--chip)", color: saved ? "#16a34a" : "var(--tx-1)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saved ? "✓ Сохранено" : saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
          <button
            onClick={() => saveMutation.mutate(!landing.published)}
            disabled={saving}
            style={{ width: "100%", background: landing.published ? "#fee2e2" : "var(--accent)", color: landing.published ? "#dc2626" : "var(--on-accent)", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {landing.published ? "Снять с публикации" : "Опубликовать лендинг"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "var(--tx-3)" }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 7,
  fontSize: 12,
  color: "var(--tx-1)",
  outline: "none",
  boxSizing: "border-box",
};
