"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";

const COLORS = ["#4ABA74","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#0088CC","#E1306C"];
const colorFor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

const PLATFORM_META: Record<string, { color: string; abbr: string; name: string }> = {
  telegram:  { color: "#0088CC", abbr: "TG", name: "Telegram" },
  instagram: { color: "#E1306C", abbr: "IG", name: "Instagram" },
  tiktok:    { color: "#010101", abbr: "TT", name: "TikTok" },
  vk:        { color: "#0077FF", abbr: "VK", name: "ВКонтакте" },
  yandex:    { color: "#FF0000", abbr: "YD", name: "Яндекс" },
  google:    { color: "#4285F4", abbr: "GA", name: "Google Ads" },
  meta:      { color: "#0866FF", abbr: "FB", name: "Meta Ads" },
  mytarget:  { color: "#FF6600", abbr: "MT", name: "myTarget" },
};

// Maps creative formats to display groups
const FORMAT_GROUP: Record<string, string> = {
  post: "posts", feed: "posts",
  video: "video", reels: "video",
  ad: "ads", search: "ads", rsya: "ads", display: "ads", banner: "ads",
  stories: "stories",
};

const FORMAT_ICON: Record<string, string> = {
  post: "📝", feed: "📝", video: "🎬", reels: "🎬", ad: "📣",
  search: "🔍", rsya: "📊", display: "🖼", banner: "🖼", stories: "⭕",
};

const FORMAT_LABEL: Record<string, string> = {
  post: "Пост", feed: "Пост", video: "Видео", reels: "Reels",
  ad: "Реклама", search: "Поиск", rsya: "РСЯ", display: "КМС", banner: "Баннер", stories: "Stories",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: "Активен",      color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  draft:      { label: "Черновик",     color: "var(--tx-3)", bg: "var(--chip)" },
  published:  { label: "Опубликовано", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  scheduled:  { label: "Запланировано",color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
  generated:  { label: "Готово",       color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  paused:     { label: "Пауза",        color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  failed:     { label: "Ошибка",       color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

const LEFT_NAV = [
  { section: "КРЕАТИВЫ", key: "all",     label: "Все" },
  { section: "КРЕАТИВЫ", key: "posts",   label: "Посты" },
  { section: "КРЕАТИВЫ", key: "video",   label: "Видео" },
  { section: "КРЕАТИВЫ", key: "stories", label: "Stories" },
  { section: "КРЕАТИВЫ", key: "ads",     label: "Объявления" },
  { section: "КАМПАНИИ", key: "_campaigns", label: "Кампании" },
  { section: "АНАЛИТИКА", key: "_analytics", label: "Аналитика" },
  { section: "НАСТРОЙКИ", key: "_settings", label: "Настройки" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const projectId = params?.id as string;

  const [filter, setFilter] = useState("all");

  // ── Project data ──
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
      return data;
    },
    enabled: !!projectId,
  });

  // ── Ad creatives for this project (primary content) ──
  const { data: creatives = [] } = useQuery({
    queryKey: ["project-creatives", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_creatives")
        .select("id, title, caption, platform, format, status, created_at, campaign_id, ai_generated")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!projectId,
  });

  // ── Campaigns for this project ──
  const { data: campaigns = [] } = useQuery({
    queryKey: ["project-campaigns", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_campaigns")
        .select("id, name, status, platforms, created_at, budget_total, budget_spent")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!projectId,
  });

  // ── Connected platforms (user's real connections) ──
  const { data: connectedPlatforms = [] } = useQuery({
    queryKey: ["connected-platforms", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const [adPlatformsRes, integrationsRes] = await Promise.all([
        supabase.from("ad_platforms").select("platform_key, name, account_id").eq("user_id", user.id).eq("is_active", true),
        supabase.from("integrations").select("platform, channel_name").eq("user_id", user.id).eq("is_active", true),
      ]);
      const seen = new Set<string>();
      const result: { key: string; label: string }[] = [];
      (adPlatformsRes.data ?? []).forEach((p: any) => {
        if (!seen.has(p.platform_key)) {
          seen.add(p.platform_key);
          result.push({ key: p.platform_key, label: p.account_id ?? p.name });
        }
      });
      (integrationsRes.data ?? []).forEach((i: any) => {
        if (!seen.has(i.platform)) {
          seen.add(i.platform);
          result.push({ key: i.platform, label: i.channel_name ? `@${i.channel_name}` : i.platform });
        }
      });
      return result;
    },
    enabled: !!projectId,
  });

  // ── AI agents (user's active agents) ──
  const { data: agents = [] } = useQuery({
    queryKey: ["project-agents"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ai_agents")
        .select("id, name, type, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(8);
      return data ?? [];
    },
    enabled: !!projectId,
  });

  // ── Update project settings ──
  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  if (isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--tx-3)", fontSize: 12 }}>Загрузка...</div>;
  }
  if (!project) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--tx-2)", marginBottom: 12 }}>Проект не найден</p>
        <Link href={`/${locale}/projects`} style={{ color: "var(--accent)", fontSize: 12, textDecoration: "none" }}>← К проектам</Link>
      </div>
    );
  }

  const color = colorFor(project.id);

  // Filter creatives by group
  const filteredCreatives = (creatives as any[]).filter((c) => {
    if (filter === "all") return true;
    if (filter.startsWith("_")) return false;
    return FORMAT_GROUP[c.format] === filter;
  });

  // Count per group for left nav badges
  const countByGroup = (creatives as any[]).reduce((acc: Record<string, number>, c: any) => {
    const g = FORMAT_GROUP[c.format] ?? "ads";
    acc[g] = (acc[g] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, {});

  const sections = Array.from(new Set(LEFT_NAV.map((n) => n.section)));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 44, borderBottom: "0.5px solid var(--line)", background: "var(--panel)", flexShrink: 0 }}>
        <Link href={`/${locale}/projects`} style={{ fontSize: 11, color: "var(--tx-3)", textDecoration: "none" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--tx-1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--tx-3)")}
        >← Проекты</Link>
        <span style={{ fontSize: 11, color: "var(--tx-3)" }}>›</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-1)" }}>{project.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href={`/${locale}/campaigns?tab=wizard`}
            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--pos)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
          >+ Новая кампания</Link>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT nav */}
        <div style={{ width: 176, flexShrink: 0, borderRight: "0.5px solid var(--line)", background: "var(--panel)", overflowY: "auto", padding: "12px 8px" }}>
          {sections.map((section) => {
            const items = LEFT_NAV.filter((n) => n.section === section);
            return (
              <div key={section} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", margin: "0 0 4px 0" }}>{section}</p>
                {items.map((item) => {
                  const active = filter === item.key;
                  const count = !item.key.startsWith("_")
                    ? (item.key === "all" ? (creatives as any[]).length : (countByGroup[item.key] ?? 0))
                    : item.key === "_campaigns" ? (campaigns as any[]).length : undefined;
                  return (
                    <button key={item.key} onClick={() => setFilter(item.key)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "6px 8px", borderRadius: 7, border: "none",
                      background: active ? "var(--chip)" : "transparent",
                      color: active ? "var(--accent)" : "var(--tx-2)",
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--hover)"; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span>{item.label}</span>
                      {count !== undefined && count > 0 && (
                        <span style={{ fontSize: 10, color: "var(--tx-3)", background: "var(--panel-2)", padding: "1px 6px", borderRadius: 8 }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* CENTER: content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* ── Creatives table ── */}
          {!filter.startsWith("_") && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 90px", gap: 0, padding: "10px 16px 8px", borderBottom: "0.5px solid var(--line)", background: "var(--panel-2)", flexShrink: 0 }}>
                {["Заголовок", "Платформа", "Статус", "Дата"].map((h) => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--tx-3)" }}>{h}</span>
                ))}
              </div>

              {filteredCreatives.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 48, textAlign: "center" }}>
                  <span style={{ fontSize: 40 }}>✦</span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
                    {filter === "all" ? "Нет AI-креативов" : `Нет креативов типа «${LEFT_NAV.find(n => n.key === filter)?.label ?? filter}»`}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--tx-3)", maxWidth: 260, lineHeight: 1.6, margin: 0 }}>
                    Создайте кампанию с этим проектом — AI автоматически сгенерирует тексты для каждой платформы
                  </p>
                  <Link href={`/${locale}/campaigns?tab=wizard`} style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                    + Создать кампанию
                  </Link>
                </div>
              )}

              {filteredCreatives.length > 0 && (
                <div>
                  {filteredCreatives.map((c: any) => {
                    const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
                    const pm = PLATFORM_META[c.platform];
                    const date = c.created_at ? new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—";
                    return (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 90px", gap: 0, padding: "10px 16px", borderBottom: "0.5px solid var(--line)", alignItems: "center", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{FORMAT_ICON[c.format] ?? "📄"}</span>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                              {c.title || "Без заголовка"}
                            </p>
                            {c.caption && (
                              <p style={{ fontSize: 10, color: "var(--tx-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0 0" }}>
                                {c.caption.slice(0, 80)}{c.caption.length > 80 ? "..." : ""}
                              </p>
                            )}
                          </div>
                          {c.ai_generated && <span style={{ fontSize: 9, color: "var(--accent)", background: "var(--chip)", padding: "1px 6px", borderRadius: 8, flexShrink: 0 }}>AI</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {pm && <div style={{ width: 22, height: 15, borderRadius: 3, background: pm.color, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 7, fontWeight: 700 }}>{pm.abbr}</div>}
                          <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{FORMAT_LABEL[c.format] ?? c.format}</span>
                        </div>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                        <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{date}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Campaigns list ── */}
          {filter === "_campaigns" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 90px", gap: 0, padding: "10px 16px 8px", borderBottom: "0.5px solid var(--line)", background: "var(--panel-2)", flexShrink: 0 }}>
                {["Кампания", "Платформы", "Статус", "Дата"].map((h) => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--tx-3)" }}>{h}</span>
                ))}
              </div>
              {(campaigns as any[]).length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 48, textAlign: "center" }}>
                  <span style={{ fontSize: 40 }}>📡</span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>Нет кампаний</p>
                  <Link href={`/${locale}/campaigns?tab=wizard`} style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "var(--on-accent)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>+ Создать кампанию</Link>
                </div>
              )}
              {(campaigns as any[]).map((c: any) => {
                const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
                const date = c.created_at ? new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—";
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 110px 90px", gap: 0, padding: "10px 16px", borderBottom: "0.5px solid var(--line)", alignItems: "center", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, flexShrink: 0 }}>📡</span>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{c.name}</p>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {(c.platforms ?? []).slice(0, 3).map((pk: string) => {
                        const meta = PLATFORM_META[pk];
                        return meta ? <div key={pk} style={{ width: 20, height: 14, borderRadius: 2, background: meta.color, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 7, fontWeight: 700 }}>{meta.abbr}</div> : null;
                      })}
                    </div>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, color: status.color, background: status.bg }}>{status.label}</span>
                    <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>{date}</p>
                  </div>
                );
              })}
            </>
          )}

          {/* ── Analytics / Settings placeholder ── */}
          {(filter === "_analytics" || filter === "_settings") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 48, textAlign: "center" }}>
              <span style={{ fontSize: 40 }}>{filter === "_analytics" ? "📊" : "⚙"}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
                {filter === "_analytics" ? "Аналитика" : "Настройки проекта"}
              </p>
              {filter === "_settings" && (
                <div style={{ maxWidth: 360, width: "100%", textAlign: "left" }}>
                  <div style={{ background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 12, padding: 20, marginTop: 16 }}>
                    {[
                      { label: "Название", key: "name", type: "input", value: project.name },
                      { label: "Описание", key: "description", type: "textarea", value: project.description ?? "" },
                      { label: "Целевая аудитория", key: "audience", type: "textarea", value: project.audience ?? "" },
                    ].map((f) => (
                      <div key={f.key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", marginBottom: 6 }}>{f.label}</label>
                        {f.type === "textarea" ? (
                          <textarea defaultValue={f.value} rows={3}
                            style={{ width: "100%", padding: "8px 10px", border: "0.5px solid var(--line)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--bg)", color: "var(--tx-1)", outline: "none", resize: "none", boxSizing: "border-box" }}
                            onBlur={(e) => saveMutation.mutate({ [f.key]: e.target.value })}
                          />
                        ) : (
                          <input defaultValue={f.value}
                            style={{ width: "100%", padding: "8px 10px", border: "0.5px solid var(--line)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--bg)", color: "var(--tx-1)", outline: "none", boxSizing: "border-box" }}
                            onBlur={(e) => saveMutation.mutate({ [f.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filter === "_analytics" && (
                <p style={{ fontSize: 12, color: "var(--tx-3)", maxWidth: 240, lineHeight: 1.6, margin: 0 }}>
                  Аналитика появится после запуска первой кампании с этим проектом
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT panel */}
        <div style={{ width: 216, flexShrink: 0, borderLeft: "0.5px solid var(--line)", background: "var(--panel)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ flex: 1, padding: "16px 14px" }}>
            {/* Project avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 18, paddingBottom: 16, borderBottom: "0.5px solid var(--line)" }}>
              {project.logo_url ? (
                <img src={project.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", marginBottom: 10 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 14, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                  {project.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>{project.name}</p>
              {project.niche && <p style={{ fontSize: 10, color: "var(--tx-3)", margin: "4px 0 0 0" }}>{project.niche}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>{(creatives as any[]).length}</p>
                  <p style={{ fontSize: 9, color: "var(--tx-3)", margin: 0 }}>креативов</p>
                </div>
                <div style={{ width: 1, background: "var(--line)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>{(campaigns as any[]).length}</p>
                  <p style={{ fontSize: 9, color: "var(--tx-3)", margin: 0 }}>кампаний</p>
                </div>
              </div>
            </div>

            {/* Connected platforms */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px 0" }}>Платформы</p>
              {(connectedPlatforms as any[]).length === 0 ? (
                <Link href={`/${locale}/integrations`} style={{ display: "block", fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>+ Подключить платформу</Link>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {(connectedPlatforms as any[]).map((p: any) => {
                    const meta = PLATFORM_META[p.key];
                    return (
                      <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, background: "var(--panel-2)", border: "0.5px solid var(--line)" }}>
                        {meta && <div style={{ width: 22, height: 15, borderRadius: 3, background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 7, fontWeight: 700, flexShrink: 0 }}>{meta.abbr}</div>}
                        <p style={{ fontSize: 11, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{p.label}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI agents / team */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px 0" }}>Сотрудники</p>
              {(agents as any[]).length === 0 ? (
                <Link href={`/${locale}/ai-workers`} style={{ display: "block", fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>+ Добавить агента</Link>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(agents as any[]).map((a: any) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-accent)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {a.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{a.name}</p>
                        {a.type && <p style={{ fontSize: 9, color: "var(--tx-3)", margin: 0 }}>{a.type}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* About project */}
            {project.description && (
              <div style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: 9, border: "0.5px solid var(--line)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 0" }}>О проекте</p>
                <p style={{ fontSize: 11, color: "var(--tx-2)", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{project.description}</p>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: "12px 14px", borderTop: "0.5px solid var(--line)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <Link href={`/${locale}/campaigns?tab=wizard`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "9px", borderRadius: 9, background: "var(--pos)", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", boxSizing: "border-box" }}
            >+ Создать кампанию</Link>
            <button onClick={() => setFilter("_settings")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "8px", borderRadius: 9, background: "transparent", border: "none", color: "var(--tx-3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--tx-1)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--tx-3)")}
            >⚙ Настройки проекта</button>
          </div>
        </div>
      </div>
    </div>
  );
}
