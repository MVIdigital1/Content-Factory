"use client";
import { Suspense, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Search, X } from "lucide-react";

const NICHES = [
  "Товары для дома", "Одежда и мода", "Еда и напитки", "Строительство",
  "IT / Технологии", "Красота и уход", "Спорт", "Образование", "Услуги", "Другое",
];
const TONES = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "professional", label: "Профессиональный" },
  { value: "humorous", label: "Юмористический" },
  { value: "formal", label: "Официальный" },
];
const LANGS = [
  { value: "ru", label: "Русский" },
  { value: "uz", label: "Узбекский" },
  { value: "en", label: "English" },
];
const COLORS = ["#4ABA74","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#0088CC","#E1306C"];
const colorFor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

const PLATFORM_META: Record<string, { color: string; abbr: string }> = {
  telegram: { color: "#0088CC", abbr: "TG" },
  instagram: { color: "#E1306C", abbr: "IG" },
  tiktok: { color: "#010101", abbr: "TT" },
  vk: { color: "#0077FF", abbr: "VK" },
  yandex: { color: "#FF0000", abbr: "YD" },
  google: { color: "#4285F4", abbr: "GA" },
  meta: { color: "#0866FF", abbr: "FB" },
  mytarget: { color: "#FF6600", abbr: "MT" },
};

// ── Create Project Modal ──────────────────────────────────────────────────
function CreateProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", niche: "", description: "", audience: "", tone: "friendly", language: "ru",
  });
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const { data: existingNames = [] } = useQuery({
    queryKey: ["project_names"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("projects").select("name").eq("user_id", user.id).eq("is_active", true);
      return (data ?? []).map((p: any) => p.name.toLowerCase().trim());
    },
  });

  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleNameChange = (val: string) => {
    f("name", val);
    setNameError(existingNames.includes(val.toLowerCase().trim()) ? "Проект с таким именем уже существует" : "");
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const r = new FileReader();
    r.onload = (ev) => setLogoPreview(ev.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim() || nameError) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      let logo_url = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `logos/${user.id}/${Date.now()}.${ext}`;
        const { data: ud, error: ue } = await supabase.storage.from("content-images").upload(path, logoFile, { contentType: logoFile.type });
        if (!ue && ud) {
          const { data: urlD } = supabase.storage.from("content-images").getPublicUrl(path);
          logo_url = urlD.publicUrl;
        }
      }
      await supabase.from("projects").insert({
        user_id: user.id,
        name: form.name.trim(),
        niche: form.niche || null,
        description: form.description || null,
        audience: form.audience || null,
        tone: form.tone,
        language: form.language,
        logo_url: logo_url || null,
        is_active: true,
        products: [],
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project_names"] });
      qc.invalidateQueries({ queryKey: ["projects_selector"] });
      onSaved();
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 520, height: "100%",
        background: "var(--panel)", borderLeft: "0.5px solid var(--line)",
        display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>Новый проект</p>
            <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>Заполните данные — AI будет генерировать контент на их основе</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 18, padding: 4 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Logo */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Логотип</label>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
            {logoPreview ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--panel-2)", border: "0.5px solid var(--line)", borderRadius: 10 }}>
                <img src={logoPreview} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)", marginBottom: 4 }}>Логотип загружен</p>
                  <button onClick={() => { setLogoFile(null); setLogoPreview(null); }} style={{ fontSize: 11, color: "var(--neg)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Удалить</button>
                </div>
              </div>
            ) : (
              <button onClick={() => logoRef.current?.click()} style={{ width: "100%", padding: "20px 0", border: "1.5px dashed var(--line)", borderRadius: 10, cursor: "pointer", background: "var(--panel-2)", color: "var(--tx-3)", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 22 }}>📷</span>
                <span style={{ fontSize: 11 }}>Загрузить логотип</span>
              </button>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Название *</label>
            <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Например: Пятый Элемент" className={`${inp} ${nameError ? "border-neg" : ""}`} />
            {nameError && <p style={{ fontSize: 10, color: "var(--neg)", marginTop: 4 }}>{nameError}</p>}
          </div>

          {/* Niche */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Ниша</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {NICHES.map((n) => (
                <button key={n} onClick={() => f("niche", n)} style={{ padding: "5px 10px", borderRadius: 7, border: `0.5px solid ${form.niche === n ? "var(--accent)" : "var(--line)"}`, background: form.niche === n ? "var(--accent)" : "transparent", color: form.niche === n ? "var(--on-accent)" : "var(--tx-2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Описание бренда</label>
            <textarea value={form.description} onChange={(e) => f("description", e.target.value)} placeholder="Чем занимается компания, что продаёт, какие ценности..." className={`${inp} resize-none`} style={{ height: 80 }} />
          </div>

          {/* Audience */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Целевая аудитория</label>
            <textarea value={form.audience} onChange={(e) => f("audience", e.target.value)} placeholder="Возраст, интересы, география, боли и желания..." className={`${inp} resize-none`} style={{ height: 64 }} />
          </div>

          {/* Tone */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Тон коммуникации</label>
            <div style={{ display: "flex", gap: 6 }}>
              {TONES.map((t) => (
                <button key={t.value} onClick={() => f("tone", t.value)} style={{ padding: "5px 10px", borderRadius: 7, border: `0.5px solid ${form.tone === t.value ? "var(--accent)" : "var(--line)"}`, background: form.tone === t.value ? "var(--accent)" : "transparent", color: form.tone === t.value ? "var(--on-accent)" : "var(--tx-2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Язык</label>
            <div style={{ display: "flex", gap: 6 }}>
              {LANGS.map((l) => (
                <button key={l.value} onClick={() => f("language", l.value)} style={{ padding: "5px 14px", borderRadius: 7, border: `0.5px solid ${form.language === l.value ? "var(--accent)" : "var(--line)"}`, background: form.language === l.value ? "var(--accent)" : "transparent", color: form.language === l.value ? "var(--on-accent)" : "var(--tx-2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{l.label}</button>
              ))}
            </div>
          </div>

          {/* AI hint */}
          <div style={{ padding: "12px 14px", background: "var(--chip)", borderRadius: 10, marginBottom: 24, display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>✦</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-1)", marginBottom: 2 }}>Чем больше заполнишь — тем лучше AI</p>
              <p style={{ fontSize: 10, color: "var(--tx-3)", lineHeight: 1.5 }}>Описание и аудитория используются при генерации контента, кампаний и рекомендаций</p>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || !!nameError || saving}
            style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!form.name.trim() || !!nameError || saving) ? 0.5 : 1 }}
          >
            {saving ? "⟳ Создаём проект..." : "📁 Создать проект"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────
function ProjectCard({ p, stats, platforms, onDelete, locale }: { p: any; stats: any; platforms: string[]; onDelete: () => void; locale: string }) {
  const color = colorFor(p.id);
  const date = p.created_at
    ? new Date(p.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.15s", cursor: "default" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: color, flexShrink: 0 }} />

      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top: logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {p.logo_url ? (
            <img src={p.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {p.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{p.name}</p>
            {p.niche && <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginTop: 2 }}>{p.niche}</p>}
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p style={{ fontSize: 11, color: "var(--tx-2)", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", margin: "0 0 12px 0" }}>
            {p.description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12, marginTop: "auto" }}>
          {[
            { icon: "📡", v: stats?.campaigns ?? 0, label: "кампаний" },
            { icon: "📝", v: stats?.contents ?? 0, label: "материалов" },
            { icon: "🤖", v: stats?.agents ?? 0, label: "агентов" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-1)" }}>{s.v}</span>
              <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Platform icons */}
        {platforms.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {platforms.slice(0, 5).map((pk) => {
              const meta = PLATFORM_META[pk];
              if (!meta) return null;
              return (
                <div key={pk} style={{ width: 20, height: 14, borderRadius: 3, background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 7, fontWeight: 700 }}>{meta.abbr}</div>
              );
            })}
          </div>
        )}

        {/* Bottom: date + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "0.5px solid var(--line)", marginTop: "auto" }}>
          <span style={{ fontSize: 10, color: "var(--tx-3)" }}>{date}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onDelete} style={{ padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--line)", background: "transparent", color: "var(--neg)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
            <Link
              href={`/${locale}/projects/${p.id}`}
              style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--accent)", background: "var(--accent)", color: "var(--on-accent)", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Открыть →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
function ProjectsPageInner() {
  const supabase = createClient();
  const qc = useQueryClient();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: projectStats = {} } = useQuery({
    queryKey: ["project_stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const [camps, contents, creatives, agents] = await Promise.all([
        supabase.from("ad_campaigns").select("project_id").eq("user_id", user.id),
        supabase.from("contents").select("project_id"),
        supabase.from("ad_creatives").select("project_id").eq("user_id", user.id),
        supabase.from("ai_agents").select("project_id").eq("user_id", user.id).eq("is_active", true),
      ]);
      const stats: Record<string, { campaigns: number; contents: number; agents: number }> = {};
      const inc = (row: any, key: "campaigns" | "contents" | "agents") => {
        const pid = row.project_id;
        if (!pid) return;
        if (!stats[pid]) stats[pid] = { campaigns: 0, contents: 0, agents: 0 };
        stats[pid][key]++;
      };
      (camps.data ?? []).forEach((r: any) => inc(r, "campaigns"));
      (contents.data ?? []).forEach((r: any) => inc(r, "contents"));
      (creatives.data ?? []).forEach((r: any) => inc(r, "contents"));
      (agents.data ?? []).forEach((r: any) => inc(r, "agents"));
      return stats;
    },
  });

  // Get connected platforms per project (via campaigns)
  const { data: projectPlatforms = {} } = useQuery({
    queryKey: ["project_platforms"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data } = await supabase.from("ad_campaigns").select("project_id, platforms").eq("user_id", user.id);
      const result: Record<string, Set<string>> = {};
      (data ?? []).forEach((c: any) => {
        if (!c.project_id || !c.platforms) return;
        if (!result[c.project_id]) result[c.project_id] = new Set();
        (c.platforms as string[]).forEach((p) => result[c.project_id].add(p));
      });
      return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, [...v]]));
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("projects").update({ is_active: false }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project_names"] });
    },
  });

  const filtered = projects.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.niche ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalContents = Object.values(projectStats as any).reduce((s: number, st: any) => s + (st.contents ?? 0), 0);
  const totalCampaigns = Object.values(projectStats as any).reduce((s: number, st: any) => s + (st.campaigns ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 44, borderBottom: "0.5px solid var(--line)", background: "var(--panel)", flexShrink: 0, gap: 10 }}>
        <p style={{ fontSize: 11, color: "var(--tx-3)", flexShrink: 0 }}>Маркетинг / <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>Проекты</span></p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: "0.5px solid var(--line)", borderRadius: 8, background: "var(--panel)" }}>
            <Search size={12} style={{ color: "var(--tx-3)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск проектов..."
              style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: "var(--tx-1)", width: 150, fontFamily: "inherit" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", fontSize: 11, padding: 0 }}>✕</button>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--pos)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            + Новый проект
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "📁", value: projects.length, label: "Всего проектов", color: "#3B82F6" },
            { icon: "📡", value: totalCampaigns, label: "Кампаний", color: "#4ABA74" },
            { icon: "📝", value: totalContents, label: "Материалов", color: "#8B5CF6" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "14px 18px", background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--tx-1)", margin: 0, lineHeight: 1.1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--tx-3)", fontSize: 12 }}>Загрузка проектов...</div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 80, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", marginBottom: 8 }}>Нет проектов</p>
            <p style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>Создайте первый проект — он станет основой для кампаний и контента</p>
            <button onClick={() => setShowCreate(true)} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Создать проект</button>
          </div>
        )}

        {/* Search empty */}
        {!isLoading && projects.length > 0 && filtered.length === 0 && search && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 13, color: "var(--tx-2)" }}>Нет проектов по запросу «{search}»</p>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map((p: any) => (
              <ProjectCard
                key={p.id}
                p={p}
                stats={(projectStats as any)[p.id] ?? { campaigns: 0, contents: 0, agents: 0 }}
                platforms={(projectPlatforms as any)[p.id] ?? []}
                locale={locale}
                onDelete={() => { if (confirm(`Удалить «${p.name}»?`)) deleteProject.mutate(p.id); }}
              />
            ))}

            {/* New project card */}
            <div
              onClick={() => setShowCreate(true)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--panel)", border: "1.5px dashed var(--line)", borderRadius: 12, minHeight: 180, cursor: "pointer", gap: 8, transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            >
              <span style={{ fontSize: 28, color: "var(--tx-3)" }}>+</span>
              <p style={{ fontSize: 12, color: "var(--tx-3)", margin: 0 }}>Новый проект</p>
            </div>
          </div>
        )}
      </div>

      {/* Create modal (slide-in drawer) */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  );
}
