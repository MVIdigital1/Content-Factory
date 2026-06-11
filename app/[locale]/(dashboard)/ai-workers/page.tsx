"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

type AgentTab = { id: string; title: string; projectId?: string };
const TABS_KEY = "agent_tabs_v1";
const ACTIVE_KEY = "agent_active_v1";
function loadTabs(): AgentTab[] {
  try {
    const d = localStorage.getItem(TABS_KEY);
    if (d) return JSON.parse(d);
  } catch {}
  return [{ id: "1", title: "Новый агент" }];
}
function saveTabs(t: AgentTab[]) {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(t));
  } catch {}
}
function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "1";
  } catch {
    return "1";
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
    desc: "Создаёт и публикует контент в соцсетях",
  },
  {
    value: "copywriter",
    label: "Копирайтер",
    icon: "✍️",
    desc: "Пишет тексты, заголовки, описания",
  },
  {
    value: "analyst",
    label: "Аналитик",
    icon: "📊",
    desc: "Анализирует данные и даёт рекомендации",
  },
  {
    value: "support",
    label: "Поддержка клиентов",
    icon: "💬",
    desc: "Отвечает на вопросы и обращения",
  },
  {
    value: "ads",
    label: "Рекламщик",
    icon: "📣",
    desc: "Оптимизирует рекламные кампании",
  },
  {
    value: "custom",
    label: "Свой тип",
    icon: "⚙️",
    desc: "Настрой под любую задачу",
  },
];

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
    "Выявляй аномалии в данных",
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
  onClose,
}: {
  tabId: string;
  projectId?: string;
  onNameChange?: (n: string) => void;
  onClose?: () => void;
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

  // Load presets when type changes
  useEffect(() => {
    setCommands(COMMANDS_PRESETS[agentType] ?? []);
  }, [agentType]);

  useEffect(() => {
    onNameChange?.(agentName);
  }, [agentName]);

  const addCommand = () => {
    if (!newCommand.trim()) return;
    setCommands((prev) => [...prev, newCommand.trim()]);
    setNewCommand("");
  };

  const handleSave = async () => {
    if (!agentName.trim()) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      await supabase.from("ai_agents").upsert({
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
        {/* Agent type */}
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

        {/* Name */}
        <div>
          <label className="block ui-label mb-1">Имя агента *</label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Например: SMM Помощник Влад"
            className={inp}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block ui-label mb-1">Описание / роль</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опиши роль агента, его задачи и ограничения..."
            className={`${inp} resize-none h-20`}
          />
        </div>

        {/* Auto mode */}
        <div className="flex items-center justify-between p-3 bg-panel-2 border border-line rounded-[9px]">
          <div>
            <p className="text-[12px] font-medium text-tx-1">
              Автоматический режим
            </p>
            <p className="text-[10px] text-tx-3 mt-0.5">
              Агент работает без подтверждения каждого действия
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
        {/* Commands */}
        <div>
          <label className="block ui-label mb-2">
            Команды — что должен делать агент
          </label>
          <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
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
                  className="text-tx-3 hover:text-neg cursor-pointer text-[12px] flex-shrink-0"
                  style={{ background: "none", border: "none" }}
                >
                  ✕
                </button>
              </div>
            ))}
            {commands.length === 0 && (
              <div className="text-center py-6 text-tx-3 text-[11px] border border-dashed border-line rounded-[8px]">
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

        {/* AI capabilities */}
        <div className="p-4 bg-chip/30 border border-line rounded-[10px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">✦</span>
            <p className="text-[12px] font-semibold text-tx-1">
              Возможности агента
            </p>
          </div>
          <div className="space-y-2">
            {[
              {
                icon: "📝",
                label: "Генерация контента",
                desc: "Пишет посты, тексты, сценарии",
              },
              {
                icon: "📊",
                label: "Аналитика",
                desc: "Читает метрики и делает выводы",
              },
              {
                icon: "📅",
                label: "Планирование",
                desc: "Создаёт расписание публикаций",
              },
              {
                icon: "🔔",
                label: "Уведомления",
                desc: "Оповещает о важных событиях",
              },
            ].map((cap) => (
              <div key={cap.label} className="flex items-center gap-3">
                <span className="text-[14px]">{cap.icon}</span>
                <div>
                  <p className="text-[11px] font-medium text-tx-1">
                    {cap.label}
                  </p>
                  <p className="text-[9px] text-tx-3">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!agentName.trim() || saving}
          className="w-full py-3 bg-accent text-on-accent text-[13px] font-semibold rounded-[9px] cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving
            ? "⟳ Сохранение..."
            : saved
              ? "✓ Сохранено!"
              : "🤖 Создать агента"}
        </button>
      </div>
    </div>
  );
}

function AIWorkersPageInner() {
  const supabase = createClient();
  const pendingTabId = { current: null as string | null };
  const [tabs, setTabs] = useState<AgentTab[]>(() =>
    typeof window !== "undefined"
      ? loadTabs()
      : [{ id: "1", title: "Новый агент" }],
  );
  const [activeId, setActiveId] = useState(() =>
    typeof window !== "undefined" ? loadActiveId() : "1",
  );
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [view, setView] = useState<"list" | "create">("list");

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

  const addTab = () => {
    const id = String(Date.now());
    setTabs((prev) => [...prev, { id, title: "Новый агент" }]);
    setActiveId(id);
    setView("create");
    pendingTabId.current = id;
    setShowProjectSelector(true);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return [{ id: "1", title: "Новый агент" }];
      if (activeId === id) setActiveId(next[next.length - 1].id);
      return next;
    });
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

  const AGENT_TYPE_ICONS: Record<string, string> = {
    smm: "📱",
    copywriter: "✍️",
    analyst: "📊",
    support: "💬",
    ads: "📣",
    custom: "⚙️",
  };
  const AGENT_TYPE_LABELS: Record<string, string> = {
    smm: "SMM менеджер",
    copywriter: "Копирайтер",
    analyst: "Аналитик",
    support: "Поддержка",
    ads: "Рекламщик",
    custom: "Свой тип",
  };

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
            Мои агенты · {agents.length}
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
            + Создать агента
          </button>
        </div>
      </div>

      {/* Browser tabs (only when creating) */}
      {view === "create" && (
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
                {tab.projectId && (
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
                {tabs.length > 1 && (
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
            {agents.length === 0 ? (
              <div className="ui-surface flex flex-col items-center py-16 text-center">
                <div style={{ fontSize: 48, marginBottom: 14 }}>🤖</div>
                <p className="text-[16px] font-semibold text-tx-1 mb-2">
                  Нет AI-агентов
                </p>
                <p className="text-[12px] text-tx-3 mb-5 max-w-[280px] leading-relaxed">
                  Создайте агента который будет автоматически выполнять задачи
                  для вашего проекта
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
                        {AGENT_TYPE_ICONS[a.type] ?? "🤖"}
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
                          flexShrink: 0,
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
                    <div style={{ display: "flex", gap: 6 }}>
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

        {/* Create view */}
        {view === "create" && (
          <div>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                style={{ display: tab.id === activeId ? "block" : "none" }}
              >
                <AgentForm
                  key={tab.id}
                  tabId={tab.id}
                  projectId={tab.projectId}
                  onNameChange={(n) => updateTitle(tab.id, n)}
                  onClose={() => closeTab(tab.id)}
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
