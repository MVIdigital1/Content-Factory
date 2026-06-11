"use client";
import { Suspense, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";

type ProjectTab = { id: string; title: string };
const TABS_KEY = "project_tabs_v1";
const ACTIVE_KEY = "project_active_v1";
function loadTabs(): ProjectTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [];
}
function saveTabs(t: ProjectTab[]) {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(t));
  } catch {}
}
function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "";
  } catch {
    return "";
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

const EMPTY_FORM = {
  name: "",
  niche: "",
  description: "",
  audience: "",
  tone: "friendly",
  language: "ru",
  logo_url: "",
};

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
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = { current: null as HTMLInputElement | null };

  useEffect(() => {
    onNameChange?.(form.name);
  }, [form.name]);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const r = new FileReader();
    r.onload = (ev) => setLogoPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      let logo_url = form.logo_url;
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
        {/* Logo */}
        <div>
          <label className="block ui-label mb-2">Логотип проекта</label>
          <input
            ref={(el) => {
              logoRef.current = el;
            }}
            type="file"
            accept="image/*"
            onChange={handleLogoFile}
            style={{ display: "none" }}
          />
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <img
                src={logoPreview}
                alt=""
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  objectFit: "cover",
                }}
              />
              <div>
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
              className="w-full py-6 border border-dashed border-line hover:border-line-strong rounded-[9px] flex flex-col items-center gap-2 cursor-pointer hover:bg-hover transition-colors"
            >
              <span style={{ fontSize: 28 }}>📷</span>
              <span className="text-[11px] text-tx-3">Загрузить логотип</span>
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block ui-label mb-1">Название *</label>
          <input
            value={form.name}
            onChange={(e) => f("name", e.target.value)}
            placeholder="Например: Пятый Элемент"
            className={inp}
          />
        </div>

        {/* Niche */}
        <div>
          <label className="block ui-label mb-2">Ниша</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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

        {/* Tone */}
        <div>
          <label className="block ui-label mb-2">Тон коммуникации</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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

        {/* Language */}
        <div>
          <label className="block ui-label mb-2">Язык</label>
          <div style={{ display: "flex", gap: 6 }}>
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
        {/* Description */}
        <div>
          <label className="block ui-label mb-1">
            Описание бренда / продукта
          </label>
          <textarea
            value={form.description}
            onChange={(e) => f("description", e.target.value)}
            placeholder="Чем занимается компания, что продаёт, какие ценности..."
            className={`${inp} resize-none h-24`}
          />
        </div>

        {/* Audience */}
        <div>
          <label className="block ui-label mb-1">Целевая аудитория</label>
          <textarea
            value={form.audience}
            onChange={(e) => f("audience", e.target.value)}
            placeholder="Возраст, интересы, география, боли и желания..."
            className={`${inp} resize-none h-20`}
          />
        </div>

        {/* AI tip */}
        <div className="p-4 bg-chip/30 rounded-[10px] border border-line">
          <div className="flex items-start gap-2">
            <span style={{ fontSize: 16, flexShrink: 0 }}>✦</span>
            <div>
              <p className="text-[11px] font-semibold text-tx-1 mb-1">
                Чем больше заполнишь — тем лучше AI
              </p>
              <p className="text-[10px] text-tx-3 leading-relaxed">
                Описание и аудитория используются при генерации контента,
                рекламных кампаний и рекомендаций агентов
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!form.name.trim() || saving}
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
  const [tabs, setTabs] = useState<ProjectTab[]>(() =>
    typeof window !== "undefined" ? loadTabs() : [],
  );
  const [activeId, setActiveId] = useState(() =>
    typeof window !== "undefined" ? loadActiveId() : "",
  );
  const [view, setView] = useState<"list" | "create">("list");

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

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("projects").update({ is_active: false }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const addTab = () => {
    const id = String(Date.now());
    setTabs((prev) => [...prev, { id, title: "Новый проект" }]);
    setActiveId(id);
    setView("create");
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) {
        setActiveId(next[next.length - 1]?.id ?? "");
        if (next.length === 0) setView("list");
      }
      return next;
    });
  };

  const updateTitle = (id: string, title: string) =>
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новый проект" } : t,
      ),
    );

  const colors = [
    "#4ABA74",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#0088CC",
    "#E1306C",
  ];
  const colorFor = (id: string) => colors[id.charCodeAt(0) % colors.length];

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
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: view === "list" ? "var(--chip)" : "transparent",
              color: "var(--tx-2)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Все проекты · {projects.length}
          </button>
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

      {/* Browser tabs (create mode) */}
      {view === "create" && tabs.length > 0 && (
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
                >
                  ✕
                </button>
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
          >
            +
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* List view */}
        {view === "list" && (
          <div>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 14,
              }}
            >
              {projects.map((p: any) => (
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
                  {p.audience && (
                    <div
                      style={{
                        padding: "6px 10px",
                        background: "var(--panel-2)",
                        borderRadius: 7,
                        marginBottom: 10,
                      }}
                    >
                      <p className="ui-label mb-1">Аудитория</p>
                      <p className="text-[11px] text-tx-2 line-clamp-1">
                        {p.audience}
                      </p>
                    </div>
                  )}
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
              ))}
              <div
                onClick={addTab}
                className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[180px]"
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
          </div>
        )}

        {/* Create view */}
        {view === "create" && (
          <div>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                style={{ display: tab.id === activeId ? "block" : "none" }}
              >
                <ProjectForm
                  key={tab.id}
                  tabId={tab.id}
                  onNameChange={(n) => updateTitle(tab.id, n)}
                  onSaved={() => {
                    setView("list");
                    closeTab(tab.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
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
