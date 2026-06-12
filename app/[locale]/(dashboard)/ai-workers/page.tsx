"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type AgentTab = { id: string; title: string; projectId?: string };
const TABS_KEY = "agent_tabs_v2";
const ACTIVE_KEY = "agent_active_v2";
function loadTabs(): AgentTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [{ id: "all", title: "Все агенты" }];
}
function saveTabs(t: AgentTab[]) {
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

const AGENT_TYPES = [
  {
    value: "smm",
    label: "SMM менеджер",
    icon: "📱",
    desc: "Создаёт и публикует контент",
  },
  {
    value: "copywriter",
    label: "Копирайтер",
    icon: "✍️",
    desc: "Пишет тексты, заголовки",
  },
  {
    value: "analyst",
    label: "Аналитик",
    icon: "📊",
    desc: "Анализирует данные",
  },
  {
    value: "support",
    label: "Поддержка",
    icon: "💬",
    desc: "Отвечает на вопросы",
  },
  {
    value: "ads",
    label: "Рекламщик",
    icon: "📣",
    desc: "Оптимизирует кампании",
  },
  { value: "custom", label: "Свой тип", icon: "⚙️", desc: "Любая задача" },
];
const AGENT_TYPE_LABELS: Record<string, string> = {
  smm: "SMM менеджер",
  copywriter: "Копирайтер",
  analyst: "Аналитик",
  support: "Поддержка",
  ads: "Рекламщик",
  custom: "Свой тип",
};
const COMMANDS_PRESETS: Record<string, string[]> = {
  smm: [
    "Публикуй 3 поста в неделю",
    "Анализируй вовлечённость каждую неделю",
    "Предлагай темы контента по пятницам",
  ],
  copywriter: [
    "Пиши посты в тоне бренда",
    "Оптимизируй тексты под SEO",
    "Создавай варианты заголовков A/B",
  ],
  analyst: [
    "Собирай метрики каждый понедельник",
    "Сравнивай с прошлым периодом",
    "Выявляй аномалии",
  ],
  support: [
    "Отвечай на вопросы в течение 1 часа",
    "Эскалируй сложные вопросы",
    "Собирай обратную связь",
  ],
  ads: [
    "Проверяй CTR каждый день",
    "Приостанавливай кампании с CTR < 1%",
    "Предлагай новые аудитории",
  ],
  custom: [],
};

function ProjectSelector({
  onSelect,
  onClose,
}: {
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const locale = useLocale();
  const router = useRouter();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects_agent"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name,niche,logo_url")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });
  const colors = [
    "#4ABA74",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#0088CC",
  ];
  const colorFor = (id: string) => colors[id.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
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
          maxWidth: 600,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "0.5px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}
            >
              Выберите проект для агента
            </div>
            <div style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 3 }}>
              Агент будет работать в контексте этого проекта
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--tx-3)",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
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
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--tx-1)",
                  marginBottom: 16,
                }}
              >
                Нет проектов
              </p>
              <button
                onClick={() => router.push(`/${locale}/projects`)}
                style={{
                  padding: "10px 20px",
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
                → Создать проект
              </button>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 12,
            }}
          >
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id, p.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  border: "0.5px solid var(--line)",
                  borderRadius: 12,
                  background: "var(--panel)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
              >
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt=""
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: colorFor(p.id),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    {p.name}
                  </div>
                  {p.niche && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--tx-3)",
                        marginTop: 2,
                      }}
                    >
                      {p.niche}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentForm({
  tabId,
  projectId,
  onNameChange,
}: {
  tabId: string;
  projectId?: string;
  onNameChange?: (n: string) => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [agentName, setAgentName] = useState("");
  const [agentType, setAgentType] = useState("smm");
  const [description, setDescription] = useState("");
  const [commands, setCommands] = useState<string[]>([]);
  const [newCommand, setNewCommand] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  // Duplicate check
  const { data: existingNames = [] } = useQuery({
    queryKey: ["agent_names"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ai_agents")
        .select("name")
        .eq("user_id", user.id);
      return (data ?? []).map((a: any) => a.name.toLowerCase().trim());
    },
  });

  useEffect(() => {
    setCommands(COMMANDS_PRESETS[agentType] ?? []);
  }, [agentType]);
  useEffect(() => {
    onNameChange?.(agentName);
  }, [agentName]);

  const handleNameChange = (val: string) => {
    setAgentName(val);
    if (existingNames.includes(val.toLowerCase().trim()))
      setNameError("Агент с таким именем уже существует");
    else setNameError("");
  };

  const addCommand = () => {
    if (!newCommand.trim()) return;
    setCommands((prev) => [...prev, newCommand.trim()]);
    setNewCommand("");
  };

  const handleSave = async () => {
    if (!agentName.trim() || nameError) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      await supabase.from("ai_agents").insert({
        user_id: user.id,
        name: agentName,
        type: agentType,
        description,
        commands,
        is_active: autoMode,
        project_id: projectId ?? null,
        created_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["ai_agents"] });
      qc.invalidateQueries({ queryKey: ["agent_names"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block ui-label mb-2">Тип агента</label>
          <div className="grid grid-cols-2 gap-2">
            {AGENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setAgentType(t.value)}
                className={`flex items-start gap-3 p-3 border rounded-[9px] cursor-pointer text-left transition-colors ${agentType === t.value ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
              >
                <span className="text-[20px] flex-shrink-0">{t.icon}</span>
                <div>
                  <p
                    className={`text-[11px] font-medium ${agentType === t.value ? "text-accent" : "text-tx-1"}`}
                  >
                    {t.label}
                  </p>
                  <p className="text-[9px] text-tx-3 mt-0.5 leading-tight">
                    {t.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block ui-label mb-1">Имя агента *</label>
          <input
            value={agentName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Например: SMM Помощник Влад"
            className={`${inp} ${nameError ? "border-neg" : ""}`}
          />
          {nameError && (
            <p className="text-[10px] text-neg mt-1">{nameError}</p>
          )}
        </div>
        <div>
          <label className="block ui-label mb-1">Описание / роль</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опиши роль агента, его задачи и ограничения..."
            className={`${inp} resize-none h-20`}
          />
        </div>
        <div className="flex items-center justify-between p-3 bg-panel-2 border border-line rounded-[9px]">
          <div>
            <p className="text-[12px] font-medium text-tx-1">
              Автоматический режим
            </p>
            <p className="text-[10px] text-tx-3 mt-0.5">
              Работает без подтверждения каждого действия
            </p>
          </div>
          <button
            onClick={() => setAutoMode((v) => !v)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: autoMode ? "var(--accent)" : "var(--line)",
              position: "relative",
              cursor: "pointer",
              border: "none",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 2,
                left: autoMode ? 20 : 2,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block ui-label mb-2">
            Команды — что должен делать агент
          </label>
          <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
            {commands.map((cmd, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-panel-2 border border-line rounded-[8px]"
              >
                <span className="text-[11px] font-medium text-tx-3 w-5 flex-shrink-0">
                  {i + 1}.
                </span>
                <p className="text-[11px] text-tx-1 flex-1">{cmd}</p>
                <button
                  onClick={() =>
                    setCommands((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="text-tx-3 hover:text-neg cursor-pointer text-[12px]"
                  style={{ background: "none", border: "none" }}
                >
                  ✕
                </button>
              </div>
            ))}
            {commands.length === 0 && (
              <div className="text-center py-5 text-tx-3 text-[11px] border border-dashed border-line rounded-[8px]">
                Нет команд — добавьте ниже
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCommand()}
              placeholder="Добавить команду..."
              className={`${inp} flex-1`}
            />
            <button
              onClick={addCommand}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "var(--accent)",
                color: "var(--on-accent)",
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              +
            </button>
          </div>
        </div>
        <div className="p-4 bg-chip/30 border border-line rounded-[10px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">✦</span>
            <p className="text-[12px] font-semibold text-tx-1">
              Возможности агента
            </p>
          </div>
          {[
            { icon: "📝", l: "Генерация контента", d: "Пишет посты, тексты" },
            { icon: "📊", l: "Аналитика", d: "Читает метрики" },
            { icon: "📅", l: "Планирование", d: "Создаёт расписание" },
            { icon: "🔔", l: "Уведомления", d: "Оповещает о событиях" },
          ].map((c) => (
            <div key={c.l} className="flex items-center gap-3 mb-2">
              <span className="text-[14px]">{c.icon}</span>
              <div>
                <p className="text-[11px] font-medium text-tx-1">{c.l}</p>
                <p className="text-[9px] text-tx-3">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={!agentName.trim() || !!nameError || saving}
          className="w-full py-3 bg-accent text-on-accent text-[13px] font-semibold rounded-[9px] cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving
            ? "⟳ Сохранение..."
            : saved
              ? "✓ Агент создан!"
              : "🤖 Создать агента"}
        </button>
      </div>
    </div>
  );
}

function AIWorkersPageInner() {
  const supabase = createClient();
  const qc = useQueryClient();
  const pendingTabId = { current: null as string | null };
  const [tabs, setTabs] = useState<AgentTab[]>(() => {
    if (typeof window === "undefined")
      return [{ id: "all", title: "Все агенты" }];
    const loaded = loadTabs();
    if (!loaded.find((t) => t.id === "all"))
      return [{ id: "all", title: "Все агенты" }, ...loaded];
    return loaded;
  });
  const [activeId, setActiveId] = useState(() =>
    typeof window !== "undefined" ? loadActiveId() : "all",
  );
  const [showProjectSelector, setShowProjectSelector] = useState(false);
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

  const { data: agents = [] } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("ai_agents")
        .update({ is_active: false })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });

  const addTab = () => {
    const id = String(Date.now());
    setTabs((prev) => [...prev, { id, title: "Новый агент" }]);
    setActiveId(id);
    pendingTabId.current = id;
    setShowProjectSelector(true);
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

  const closeTab = (id: string) => {
    if (id === "all") return;
    const tab = tabs.find((t) => t.id === id);
    if (tab && tab.title !== "Новый агент") {
      setCloseConfirm({ id, title: tab.title });
    } else {
      forceCloseTab(id);
    }
  };

  const handleProjectSelected = (pid: string, pname: string) => {
    const tabId = pendingTabId.current;
    if (tabId)
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, projectId: pid } : t)),
      );
    pendingTabId.current = null;
    setShowProjectSelector(false);
  };

  const updateTitle = (id: string, title: string) =>
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: title || "Новый агент" } : t,
      ),
    );

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
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
            AI-агенты
          </span>
        </p>
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
          + Создать агента
        </button>
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
              {tab.id === "all" && <span style={{ fontSize: 10 }}>🤖</span>}
              {tab.projectId && tab.id !== "all" && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    flexShrink: 0,
                  }}
                />
              )}
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
        {/* All agents */}
        {activeId === "all" && (
          <div>
            {agents.length === 0 ? (
              <div className="ui-surface flex flex-col items-center py-16 text-center">
                <div style={{ fontSize: 48, marginBottom: 14 }}>🤖</div>
                <p className="text-[16px] font-semibold text-tx-1 mb-2">
                  Нет AI-агентов
                </p>
                <p className="text-[12px] text-tx-3 mb-5 max-w-[280px] leading-relaxed">
                  Создайте агента который будет автоматически выполнять задачи
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
                  + Создать первого агента
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 14,
                }}
              >
                {agents.map((a: any) => (
                  <div key={a.id} className="ui-surface p-4">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: "var(--accent-dim)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {AGENT_TYPES.find((t) => t.value === a.type)?.icon ??
                          "🤖"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="text-[13px] font-semibold text-tx-1 truncate">
                          {a.name}
                        </p>
                        <p className="text-[10px] text-tx-3">
                          {AGENT_TYPE_LABELS[a.type] ?? a.type}
                        </p>
                      </div>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: a.is_active
                            ? "var(--pos)"
                            : "var(--line)",
                        }}
                      />
                    </div>
                    {a.description && (
                      <p className="text-[11px] text-tx-2 leading-relaxed mb-3 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                    {a.commands?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p className="ui-label mb-1.5">
                          Команды · {a.commands.length}
                        </p>
                        {a.commands
                          .slice(0, 2)
                          .map((cmd: string, i: number) => (
                            <div
                              key={i}
                              style={{
                                fontSize: 10,
                                color: "var(--tx-3)",
                                padding: "3px 0",
                                borderBottom: "0.5px solid var(--line)",
                              }}
                            >
                              {i + 1}. {cmd}
                            </div>
                          ))}
                        {a.commands.length > 2 && (
                          <p
                            style={{
                              fontSize: 10,
                              color: "var(--tx-3)",
                              marginTop: 3,
                            }}
                          >
                            +{a.commands.length - 2} ещё
                          </p>
                        )}
                      </div>
                    )}
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 10,
                          background: a.is_active
                            ? "var(--pos-dim)"
                            : "var(--chip)",
                          color: a.is_active ? "var(--pos)" : "var(--tx-3)",
                        }}
                      >
                        {a.is_active ? "● Активен" : "○ Не активен"}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить агента «${a.name}»?`))
                            deleteAgent.mutate(a.id);
                        }}
                        style={{
                          marginLeft: "auto",
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "0.5px solid var(--line)",
                          background: "transparent",
                          color: "var(--neg)",
                          fontSize: 10,
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
                  <p className="text-[11px] text-tx-3">Новый агент</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create agent tabs */}
        {activeId !== "all" && (
          <div>
            {tabs
              .filter((t) => t.id !== "all")
              .map((tab) => (
                <div
                  key={tab.id}
                  style={{ display: tab.id === activeId ? "block" : "none" }}
                >
                  <AgentForm
                    key={tab.id}
                    tabId={tab.id}
                    projectId={tab.projectId}
                    onNameChange={(n) => updateTitle(tab.id, n)}
                  />
                </div>
              ))}
          </div>
        )}
      </div>

      {showProjectSelector && (
        <ProjectSelector
          onSelect={handleProjectSelected}
          onClose={() => {
            setShowProjectSelector(false);
            pendingTabId.current = null;
          }}
        />
      )}

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
              🤖
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
              Сохранить агента?
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
              «{closeConfirm.title}» не был сохранён. Вернуться или закрыть?
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

export default function AIWorkersPage() {
  return (
    <Suspense>
      <AIWorkersPageInner />
    </Suspense>
  );
}
