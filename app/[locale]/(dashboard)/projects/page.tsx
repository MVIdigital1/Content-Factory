"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";

type ProjectTab = { id: string; title: string };
const TABS_KEY = "project_tabs_v2";
const ACTIVE_KEY = "project_active_v2";
function loadTabs(): ProjectTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [{ id: "all", title: "Все проекты" }];
}
function saveTabs(t: ProjectTab[]) {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(t));
  } catch {}
}
function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "all";
  } catch {
    return "all";
  }
}
function saveActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

const NICHES = [
  "Товары для дома",
  "Одежда и мода",
  "Еда и напитки",
  "Строительство",
  "IT / Технологии",
  "Красота и уход",
  "Спорт",
  "Образование",
  "Услуги",
  "Другое",
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
const COLORS = [
  "#4ABA74",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#0088CC",
  "#E1306C",
];
const colorFor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

function ProjectForm({
  tabId,
  onSaved,
  onNameChange,
}: {
  tabId: string;
  onSaved?: () => void;
  onNameChange?: (n: string) => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    niche: "",
    description: "",
    audience: "",
    tone: "friendly",
    language: "ru",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Fetch existing names for duplicate check
  const { data: existingNames = [] } = useQuery({
    queryKey: ["project_names"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return (data ?? []).map((p: any) => p.name.toLowerCase().trim());
    },
  });

  useEffect(() => {
    onNameChange?.(form.name);
  }, [form.name]);

  const handleNameChange = (val: string) => {
    setForm((p) => ({ ...p, name: val }));
    if (existingNames.includes(val.toLowerCase().trim())) {
      setNameError("Проект с таким именем уже существует");
    } else {
      setNameError("");
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const r = new FileReader();
    r.onload = (ev) => setLogoPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.name.trim() || nameError) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      let logo_url = "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `logos/${user.id}/${Date.now()}.${ext}`;
        const { data: ud, error: ue } = await supabase.storage
          .from("content-images")
          .upload(path, logoFile, { contentType: logoFile.type });
        if (!ue && ud) {
          const { data: urlD } = supabase.storage
            .from("content-images")
            .getPublicUrl(path);
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
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved?.();
      }, 1500);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";
  const f = (key: keyof typeof form, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block ui-label mb-2">Логотип</label>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            onChange={handleLogoFile}
            style={{ display: "none" }}
          />
          {logoPreview ? (
            <div className="flex items-center gap-4 p-3 bg-panel-2 border border-line rounded-[9px]">
              <img
                src={logoPreview}
                alt=""
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  objectFit: "cover",
                }}
              />
              <div>
                <p className="text-[12px] font-medium text-tx-1 mb-1">
                  Логотип загружен
                </p>
                <button
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                  className="text-[11px] text-neg cursor-pointer"
                  style={{ background: "none", border: "none" }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => logoRef.current?.click()}
              className="w-full py-5 border border-dashed border-line hover:border-line-strong rounded-[9px] flex flex-col items-center gap-2 cursor-pointer hover:bg-hover transition-colors"
            >
              <span style={{ fontSize: 24 }}>📷</span>
              <span className="text-[11px] text-tx-3">Загрузить логотип</span>
            </button>
          )}
        </div>
        <div>
          <label className="block ui-label mb-1">Название *</label>
          <input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Например: Пятый Элемент"
            className={`${inp} ${nameError ? "border-neg" : ""}`}
          />
          {nameError && (
            <p className="text-[10px] text-neg mt-1">{nameError}</p>
          )}
        </div>
        <div>
          <label className="block ui-label mb-2">Ниша</label>
          <div className="flex gap-2 flex-wrap">
            {NICHES.map((n) => (
              <button
                key={n}
                onClick={() => f("niche", n)}
                className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${form.niche === n ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block ui-label mb-2">Тон коммуникации</label>
          <div className="flex gap-2 flex-wrap">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => f("tone", t.value)}
                className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${form.tone === t.value ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block ui-label mb-2">Язык</label>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => f("language", l.value)}
                className={`px-4 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${form.language === l.value ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block ui-label mb-1">Описание бренда</label>
          <textarea
            value={form.description}
            onChange={(e) => f("description", e.target.value)}
            placeholder="Чем занимается компания, что продаёт, какие ценности..."
            className={`${inp} resize-none h-24`}
          />
        </div>
        <div>
          <label className="block ui-label mb-1">Целевая аудитория</label>
          <textarea
            value={form.audience}
            onChange={(e) => f("audience", e.target.value)}
            placeholder="Возраст, интересы, география, боли и желания..."
            className={`${inp} resize-none h-20`}
          />
        </div>
        <div className="p-4 bg-chip/30 rounded-[10px] border border-line">
          <div className="flex items-start gap-2">
            <span style={{ fontSize: 16 }}>✦</span>
            <div>
              <p className="text-[11px] font-semibold text-tx-1 mb-1">
                Чем больше заполнишь — тем лучше AI
              </p>
              <p className="text-[10px] text-tx-3 leading-relaxed">
                Описание и аудитория используются при генерации контента,
                кампаний и рекомендаций агентов
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!form.name.trim() || !!nameError || saving}
          className="w-full py-3 bg-accent text-on-accent text-[13px] font-semibold rounded-[9px] cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving
            ? "⟳ Сохранение..."
            : saved
              ? "✓ Проект создан!"
              : "📁 Создать проект"}
        </button>
      </div>
    </div>
  );
}

function ProjectsPageInner() {
  const supabase = createClient();
  const qc = useQueryClient();
  const locale = useLocale();

  // Persistent tabs - first tab is always "all"
  const [tabs, setTabs] = useState<ProjectTab[]>(() => {
    if (typeof window === "undefined")
      return [{ id: "all", title: "Все проекты" }];
    const loaded = loadTabs();
    if (!loaded.find((t) => t.id === "all"))
      return [{ id: "all", title: "Все проекты" }, ...loaded];
    return loaded;
  });
  const [activeId, setActiveId] = useState(() =>
    typeof window !== "undefined" ? loadActiveId() : "all",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [closeConfirm, setCloseConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);
  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Stats per project
  const { data: projectStats = {} } = useQuery({
    queryKey: ["project_stats"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return {};
      const [camps, contents, agents] = await Promise.all([
        supabase
          .from("ad_campaigns")
          .select("project_id")
          .eq("user_id", user.id),
        supabase.from("contents").select("project_id"),
        supabase
          .from("ai_agents")
          .select("project_id")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);
      const stats: Record<
        string,
        { campaigns: number; contents: number; agents: number }
      > = {};
      (camps.data ?? []).forEach((r: any) => {
        if (!stats[r.project_id])
          stats[r.project_id] = { campaigns: 0, contents: 0, agents: 0 };
        stats[r.project_id].campaigns++;
      });
      (contents.data ?? []).forEach((r: any) => {
        if (!stats[r.project_id])
          stats[r.project_id] = { campaigns: 0, contents: 0, agents: 0 };
        stats[r.project_id].contents++;
      });
      (agents.data ?? []).forEach((r: any) => {
        if (!stats[r.project_id])
          stats[r.project_id] = { campaigns: 0, contents: 0, agents: 0 };
        stats[r.project_id].agents++;
      });
      return stats;
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

  const addTab = () => {
    const id = String(Date.now());
    setTabs((prev) => [...prev, { id, title: "Новый проект" }]);
    setActiveId(id);
  };

  const forceCloseTab = (id: string) => {
    if (id === "all") return;
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) {
        setActiveId("all");
        saveActiveId("all");
      }
      return next;
    });
  };

  const tryCloseTab = (id: string) => {
    if (id === "all") return;
    const tab = tabs.find((t) => t.id === id);
    // Has data if title was changed from default
    if (tab && tab.title !== "Новый проект") {
      setCloseConfirm({ id, title: tab.title });
    } else {
      forceCloseTab(id);
    }
  };

  const closeTab = tryCloseTab;

  const updateTitle = (id: string, title: string) =>
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новый проект" } : t,
      ),
    );

  const filtered = projects.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.niche ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
          Маркетинг /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>Проекты</span>
        </p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {activeId === "all" && (
            <>
              {/* Search */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  border: "0.5px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--panel)",
                }}
              >
                <Search
                  size={13}
                  style={{ color: "var(--tx-3)", flexShrink: 0 }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск проектов..."
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    color: "var(--tx-1)",
                    width: 160,
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {/* View toggle */}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  padding: 2,
                  background: "var(--panel-2)",
                  border: "0.5px solid var(--line)",
                  borderRadius: 8,
                }}
              >
                <button
                  onClick={() => setViewMode("grid")}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background:
                      viewMode === "grid" ? "var(--panel)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: viewMode === "grid" ? "var(--tx-1)" : "var(--tx-3)",
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background:
                      viewMode === "list" ? "var(--panel)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: viewMode === "list" ? "var(--tx-1)" : "var(--tx-3)",
                  }}
                >
                  <List size={14} />
                </button>
              </div>
            </>
          )}
          <button
            onClick={addTab}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Новый проект
          </button>
        </div>
      </div>

      {/* Browser tabs - always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "6px 14px 0",
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px 7px",
                borderRadius: "8px 8px 0 0",
                background: active ? "var(--bg)" : "var(--panel-2)",
                border: `0.5px solid ${active ? "var(--line)" : "transparent"}`,
                borderBottom: active ? "1px solid var(--bg)" : "none",
                cursor: "pointer",
                flexShrink: 0,
                marginBottom: active ? -1 : 0,
              }}
              onClick={() => {
                setActiveId(tab.id);
                saveActiveId(tab.id);
              }}
            >
              {tab.id === "all" && <span style={{ fontSize: 10 }}>📁</span>}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--tx-1)" : "var(--tx-3)",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tab.title}
              </span>
              {tab.id !== "all" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--tx-3)",
                    fontSize: 13,
                    padding: "0 2px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--tx-1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--tx-3)")
                  }
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={addTab}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 7,
            border: "0.5px solid var(--line)",
            background: "transparent",
            cursor: "pointer",
            color: "var(--tx-3)",
            fontSize: 16,
            flexShrink: 0,
            marginLeft: 2,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--tx-1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--tx-3)";
          }}
        >
          +
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* All projects tab */}
        {activeId === "all" && (
          <div>
            {/* Stats bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                { l: "Всего проектов", v: projects.length, icon: "📁" },
                {
                  l: "Активных кампаний",
                  v: Object.values(projectStats as any).reduce(
                    (s: number, st: any) => s + (st.campaigns ?? 0),
                    0,
                  ),
                  icon: "📡",
                },
                {
                  l: "Контент материалов",
                  v: Object.values(projectStats as any).reduce(
                    (s: number, st: any) => s + (st.contents ?? 0),
                    0,
                  ),
                  icon: "📝",
                },
                {
                  l: "AI-агентов",
                  v: Object.values(projectStats as any).reduce(
                    (s: number, st: any) => s + (st.agents ?? 0),
                    0,
                  ),
                  icon: "🤖",
                },
              ].map((k) => (
                <div key={k.l} className="ui-surface px-4 py-3">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{k.icon}</span>
                    <p className="ui-label">{k.l}</p>
                  </div>
                  <p className="text-[22px] font-semibold text-tx-1">{k.v}</p>
                </div>
              ))}
            </div>

            {isLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--tx-3)",
                  fontSize: 12,
                }}
              >
                Загрузка...
              </div>
            )}

            {!isLoading && filtered.length === 0 && search && (
              <div className="ui-surface flex flex-col items-center py-10 text-center">
                <p className="text-[13px] text-tx-2">
                  Нет проектов по запросу «{search}»
                </p>
              </div>
            )}

            {!isLoading && projects.length === 0 && (
              <div className="ui-surface flex flex-col items-center py-16 text-center">
                <div style={{ fontSize: 48, marginBottom: 14 }}>📁</div>
                <p className="text-[16px] font-semibold text-tx-1 mb-2">
                  Нет проектов
                </p>
                <p className="text-[12px] text-tx-3 mb-5 max-w-[280px] leading-relaxed">
                  Создайте первый проект — он станет основой для кампаний и
                  контента
                </p>
                <button
                  onClick={addTab}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 9,
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Создать проект
                </button>
              </div>
            )}

            {/* Grid view */}
            {viewMode === "grid" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 14,
                }}
              >
                {filtered.map((p: any) => {
                  const stats = (projectStats as any)[p.id] ?? {
                    campaigns: 0,
                    contents: 0,
                    agents: 0,
                  };
                  return (
                    <div key={p.id} className="ui-surface p-4">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt=""
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: colorFor(p.id),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 18,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-[14px] font-semibold text-tx-1 truncate">
                            {p.name}
                          </p>
                          {p.niche && (
                            <p className="text-[11px] text-tx-3 mt-0.5">
                              {p.niche}
                            </p>
                          )}
                        </div>
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-tx-2 leading-relaxed mb-3 line-clamp-2">
                          {p.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3,1fr)",
                          gap: 6,
                          marginBottom: 12,
                        }}
                      >
                        {[
                          { l: "Кампаний", v: stats.campaigns, icon: "📡" },
                          { l: "Материалов", v: stats.contents, icon: "📝" },
                          { l: "Агентов", v: stats.agents, icon: "🤖" },
                        ].map((s) => (
                          <div
                            key={s.l}
                            style={{
                              padding: "6px 8px",
                              background: "var(--panel-2)",
                              borderRadius: 7,
                              textAlign: "center",
                            }}
                          >
                            <p style={{ fontSize: 16, marginBottom: 2 }}>
                              {s.icon}
                            </p>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--tx-1)",
                              }}
                            >
                              {s.v}
                            </p>
                            <p style={{ fontSize: 9, color: "var(--tx-3)" }}>
                              {s.l}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/${locale}/projects/${p.id}`}
                          style={{
                            flex: 1,
                            padding: "7px",
                            borderRadius: 7,
                            border: "0.5px solid var(--line)",
                            background: "transparent",
                            color: "var(--tx-2)",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            textAlign: "center",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          Открыть
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить «${p.name}»?`))
                              deleteProject.mutate(p.id);
                          }}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 7,
                            border: "0.5px solid var(--line)",
                            background: "transparent",
                            color: "var(--neg)",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div
                  onClick={addTab}
                  className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px]"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--line)")
                  }
                >
                  <span
                    style={{
                      fontSize: 28,
                      color: "var(--tx-3)",
                      marginBottom: 8,
                    }}
                  >
                    +
                  </span>
                  <p className="text-[11px] text-tx-3">Новый проект</p>
                </div>
              </div>
            )}

            {/* List view */}
            {viewMode === "list" && filtered.length > 0 && (
              <div className="ui-surface overflow-hidden">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                    gap: 0,
                    padding: "8px 16px",
                    borderBottom: "0.5px solid var(--line)",
                    background: "var(--panel-2)",
                  }}
                >
                  {[
                    "Проект",
                    "Кампаний",
                    "Материалов",
                    "Агентов",
                    "Ниша",
                    "",
                  ].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--tx-3)",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {filtered.map((p: any, i: number) => {
                  const stats = (projectStats as any)[p.id] ?? {
                    campaigns: 0,
                    contents: 0,
                    agents: 0,
                  };
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
                        gap: 0,
                        padding: "12px 16px",
                        borderBottom:
                          i < filtered.length - 1
                            ? "0.5px solid var(--line)"
                            : "none",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt=""
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: colorFor(p.id),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--tx-1)",
                          }}
                        >
                          {p.name}
                        </p>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--tx-2)" }}>
                        {stats.campaigns}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--tx-2)" }}>
                        {stats.contents}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--tx-2)" }}>
                        {stats.agents}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
                        {p.niche ?? "—"}
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/${locale}/projects/${p.id}`}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "0.5px solid var(--line)",
                            background: "transparent",
                            color: "var(--tx-2)",
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                            textDecoration: "none",
                          }}
                        >
                          Открыть
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить «${p.name}»?`))
                              deleteProject.mutate(p.id);
                          }}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 6,
                            border: "0.5px solid var(--line)",
                            background: "transparent",
                            color: "var(--neg)",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create project tabs */}
        {activeId !== "all" && (
          <div>
            {tabs
              .filter((t) => t.id !== "all")
              .map((tab) => (
                <div
                  key={tab.id}
                  style={{ display: tab.id === activeId ? "block" : "none" }}
                >
                  <ProjectForm
                    key={tab.id}
                    tabId={tab.id}
                    onNameChange={(n) => updateTitle(tab.id, n)}
                    onSaved={() => {
                      setActiveId("all");
                      saveActiveId("all");
                      forceCloseTab(tab.id);
                    }}
                  />
                </div>
              ))}
          </div>
        )}
      </div>

      {closeConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 380,
              padding: 24,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}
            >
              💾
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--tx-1)",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Сохранить проект?
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--tx-3)",
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              «{closeConfirm.title}» не был сохранён. Продолжить создание или
              закрыть?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => setCloseConfirm(null)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Вернуться к созданию
              </button>
              <button
                onClick={() => {
                  setCloseConfirm(null);
                  forceCloseTab(closeConfirm.id);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: "0.5px solid var(--line)",
                  background: "transparent",
                  color: "var(--neg)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🗑 Закрыть без сохранения
              </button>
            </div>
          </div>
        </div>
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
