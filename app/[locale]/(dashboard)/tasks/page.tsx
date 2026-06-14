"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  List,
  LayoutGrid,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  project_id: string | null;
  tag: string | null;
  created_at: string;
};

const COLUMNS = [
  {
    key: "todo" as const,
    label: "К выполнению",
    color: "#888780",
    bg: "var(--chip)",
  },
  {
    key: "in_progress" as const,
    label: "В работе",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.1)",
  },
  {
    key: "review" as const,
    label: "На проверке",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
  },
  {
    key: "done" as const,
    label: "Готово",
    color: "#1D9E75",
    bg: "var(--accent-dim)",
  },
];

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  low: { bg: "var(--chip)", color: "var(--tx-3)" },
  medium: { bg: "rgba(245,158,11,0.12)", color: "#854F0B" },
  high: { bg: "rgba(239,68,68,0.1)", color: "#B91C1C" },
  urgent: { bg: "rgba(220,38,38,0.15)", color: "#991B1B" },
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочно",
};

const TAGS = [
  "UI",
  "API",
  "Баг",
  "Фича",
  "Дизайн",
  "Обсуждение",
  "Навигация",
  "WizardView",
  "Интеграции",
];

// ── All completed tasks from our work ─────────────────────────────────────
const COMPLETED_TASKS = [
  // Layout / Navigation
  {
    title: "Layout — sidebar сворачивание + кнопка PanelLeft",
    tag: "UI",
    priority: "high" as const,
  },
  {
    title: "TopNavbar — отдельный округлённый блок с отступами",
    tag: "UI",
    priority: "medium" as const,
  },
  {
    title:
      "Sidebar — группа Маркетинг (Кампании, Проекты, Создать контент, AI-агенты)",
    tag: "UI",
    priority: "high" as const,
  },
  {
    title:
      "TopNavbar — Кампании / Проекты / Подключения / AI-агенты слева, поиск + уведомления + профиль справа",
    tag: "UI",
    priority: "medium" as const,
  },
  // Campaigns
  {
    title: "Кампании — вкладка Черновики в фильтре статусов",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Кампании — автосохранение в черновик при вводе названия",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Кампании — браузерные шторки (tabs) с кнопкой +",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title: "Кампании — шторки не пропадают при обновлении (localStorage)",
    tag: "Баг",
    priority: "high" as const,
  },
  {
    title: "Кампании — выбор проекта перед wizard (полноэкранный оверлей)",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title: "Кампании — 3 кнопки на главной: Создать / Отчёты / Креативы",
    tag: "UI",
    priority: "medium" as const,
  },
  {
    title:
      "Кампании — кнопки действий на строках: редактировать / удалить / пауза / продолжить",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Кампании — каждая шторка независима (свой localStorage ключ)",
    tag: "Баг",
    priority: "high" as const,
  },
  {
    title: "Кампании — AI рекомендации при выборе проекта в wizard",
    tag: "Фича",
    priority: "medium" as const,
  },
  // WizardView
  {
    title: "WizardView — подтипы платформ (Пост / Reels / Stories / Реклама)",
    tag: "WizardView",
    priority: "high" as const,
  },
  {
    title: "WizardView — только подключённые платформы в шаге Платформы",
    tag: "WizardView",
    priority: "high" as const,
  },
  {
    title: "WizardView — кнопка Добавить платформу прямо в wizard",
    tag: "WizardView",
    priority: "medium" as const,
  },
  {
    title: "WizardView — AI создаёт реальные тексты через Claude API",
    tag: "WizardView",
    priority: "high" as const,
  },
  {
    title: "WizardView — карточки креативов горизонтальный ряд grid 4 в строку",
    tag: "UI",
    priority: "medium" as const,
  },
  {
    title: "WizardView — убрать галочку выбора с карточек",
    tag: "UI",
    priority: "low" as const,
  },
  {
    title:
      "WizardView — кнопки Запланировать и Опубликовать сейчас на каждом креативе",
    tag: "WizardView",
    priority: "medium" as const,
  },
  {
    title:
      "WizardView — BulkScheduleModal (2 дня / неделя / месяц / свой период)",
    tag: "WizardView",
    priority: "medium" as const,
  },
  {
    title: "WizardView — картинки из проекта вместо загрузки файла",
    tag: "WizardView",
    priority: "medium" as const,
  },
  {
    title: "WizardView — убрать режимы Картинка/Видео из wizard",
    tag: "WizardView",
    priority: "low" as const,
  },
  {
    title: "WizardView — шаг wizard сохраняется в localStorage при уходе",
    tag: "Баг",
    priority: "high" as const,
  },
  {
    title: "WizardView — Instagram OAuth модалка в шаге Платформы",
    tag: "Интеграции",
    priority: "medium" as const,
  },
  {
    title: "WizardView — проверка дублирования названия кампании",
    tag: "WizardView",
    priority: "medium" as const,
  },
  {
    title: "WizardView — шаг Креативы вернуть в wizard (4 шага)",
    tag: "WizardView",
    priority: "high" as const,
  },
  // Projects
  {
    title: "Проекты — шторки + первая шторка Все проекты",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title: "Проекты — поиск по проектам",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Проекты — переключатель Grid / List",
    tag: "UI",
    priority: "low" as const,
  },
  {
    title:
      "Проекты — статистика по каждому проекту (кампании / материалы / агенты)",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Проекты — проверка дублирования имени",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "Проекты — closeConfirm модалка при закрытии шторки с данными",
    tag: "UI",
    priority: "medium" as const,
  },
  // AI Workers
  {
    title: "AI-агенты — шторки + первая шторка Все агенты",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title:
      "AI-агенты — форма создания: тип / имя / описание / команды / автоматический режим",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title: "AI-агенты — проверка дублирования имени агента",
    tag: "Фича",
    priority: "medium" as const,
  },
  {
    title: "AI-агенты — closeConfirm модалка",
    tag: "UI",
    priority: "medium" as const,
  },
  // Integrations
  {
    title:
      "Интеграции — новый стиль + весь старый функционал (Откл/Вкл/Удалить/Статистика)",
    tag: "Интеграции",
    priority: "high" as const,
  },
  {
    title: "Интеграции — можно добавлять несколько Telegram каналов",
    tag: "Интеграции",
    priority: "high" as const,
  },
  {
    title: "data.ts — добавлен instagram в PLATFORM_META",
    tag: "Интеграции",
    priority: "medium" as const,
  },
  // Create content
  {
    title:
      "Создать контент — полностью новая страница: посты + статистика + AI план",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title:
      "Создать контент — кнопка Создать пост с модалкой (AI текст + публикация)",
    tag: "Фича",
    priority: "high" as const,
  },
  {
    title: "API — роут /api/telegram/posts (читает publish_logs + contents)",
    tag: "API",
    priority: "high" as const,
  },
  {
    title: "API — роут /api/instagram/posts (Instagram Graph API)",
    tag: "API",
    priority: "high" as const,
  },
  // Close confirm
  {
    title: "Кампании — closeConfirm модалка при закрытии шторки с данными",
    tag: "UI",
    priority: "medium" as const,
  },
  {
    title: "Создать контент — closeConfirm модалка",
    tag: "UI",
    priority: "medium" as const,
  },
];

const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "medium" as const,
  due_date: "",
  project_id: "",
  tag: "",
};

export default function TasksPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("list");
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Task[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("is_active", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_TASK) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tasks").insert({
        ...values,
        created_by: user.id,
        due_date: values.due_date || null,
        project_id: values.project_id || null,
        tag: values.tag || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm(EMPTY_TASK);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Task["status"];
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const isOverdue = (d: string | null) => d && new Date(d) < new Date();

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterTag && t.tag !== filterTag) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status !== "done").length,
    done: tasks.filter((t) => t.status === "done").length,
    urgent: tasks.filter((t) => t.priority === "urgent" && t.status !== "done")
      .length,
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[9px] border border-line text-[12px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="ui-surface p-3 hover:border-line-strong transition-colors group">
      <div className="flex items-start gap-2.5">
        <button
          onClick={() =>
            updateStatusMutation.mutate({
              id: task.id,
              status: task.status === "done" ? "todo" : "done",
            })
          }
          className="flex-shrink-0 mt-0.5 cursor-pointer"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: task.status === "done" ? "var(--accent)" : "var(--tx-3)",
          }}
        >
          <CheckCircle size={16} strokeWidth={1.6} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[13px] font-medium ${task.status === "done" ? "line-through text-tx-3" : "text-tx-1"}`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-[11px] text-tx-3 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-6 mt-2 flex-wrap">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={PRIORITY_COLOR[task.priority]}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.tag && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-chip text-tx-2">
                {task.tag}
              </span>
            )}
            {task.due_date && (
              <span
                className={`text-[10px] flex items-center gap-1 ${isOverdue(task.due_date) && task.status !== "done" ? "text-neg" : "text-tx-3"}`}
              >
                {isOverdue(task.due_date) && task.status !== "done" && (
                  <AlertTriangle size={10} strokeWidth={2} />
                )}
                {new Date(task.due_date).toLocaleDateString("ru", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {/* Status buttons on hover */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                <button
                  key={c.key}
                  onClick={() =>
                    updateStatusMutation.mutate({ id: task.id, status: c.key })
                  }
                  className="text-[9px] px-2 py-0.5 rounded-full cursor-pointer border border-line text-tx-3 hover:text-tx-1 hover:bg-hover"
                >
                  {c.label}
                </button>
              ))}
              <button
                onClick={() => deleteMutation.mutate(task.id)}
                className="text-[9px] px-2 py-0.5 rounded-full cursor-pointer border border-line text-neg hover:bg-hover ml-1"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
          gap: 10,
          padding: "0 16px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)", flex: 1 }}>
          Инструменты /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>Задачи</span>
        </p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() =>
              setViewMode((v) => (v === "list" ? "board" : "list"))
            }
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "0.5px solid var(--line)",
              background: "transparent",
              color: "var(--tx-2)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {viewMode === "list" ? (
              <LayoutGrid size={13} />
            ) : (
              <List size={13} />
            )}
            {viewMode === "list" ? "Доска" : "Список"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
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
            <Plus size={13} strokeWidth={2.5} /> Задача
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            {
              l: "Всего на сайте",
              v: stats.total + COMPLETED_TASKS.length,
              icon: "📋",
            },
            { l: "Открытых", v: stats.open, icon: "⏳" },
            {
              l: "Выполнено",
              v: stats.done + COMPLETED_TASKS.length,
              icon: "✅",
            },
            { l: "Срочных", v: stats.urgent, icon: "🔴" },
          ].map((s) => (
            <div
              key={s.l}
              className="ui-surface"
              style={{ padding: "12px 14px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--tx-3)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.l}
                </span>
              </div>
              <p
                style={{ fontSize: 24, fontWeight: 600, color: "var(--tx-1)" }}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="ui-surface p-4 mb-4">
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--tx-1)",
                marginBottom: 12,
              }}
            >
              Новая задача
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.title.trim())
                    createMutation.mutate(form);
                }}
                placeholder="Название задачи *"
                className={inp}
                autoFocus
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Описание (необязательно)"
                rows={2}
                className={`${inp} resize-none`}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 8,
                }}
              >
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priority: e.target.value as any }))
                  }
                  className={inp}
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.tag}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tag: e.target.value }))
                  }
                  className={inp}
                >
                  <option value="">— тег —</option>
                  {TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={form.project_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, project_id: e.target.value }))
                  }
                  className={inp}
                >
                  <option value="">Без проекта</option>
                  {(projects as any[]).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, due_date: e.target.value }))
                  }
                  className={inp}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title.trim() || createMutation.isPending}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: !form.title.trim() ? 0.5 : 1,
                  }}
                >
                  {createMutation.isPending ? "..." : "Создать"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "0.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--tx-2)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {["all", "todo", "in_progress", "review", "done"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-[11px] rounded-full cursor-pointer border transition-colors ${filterStatus === s ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
            >
              {s === "all"
                ? `Все · ${tasks.length}`
                : COLUMNS.find((c) => c.key === s)?.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: "0.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--tx-2)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              <option value="">Все теги</option>
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: "0.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--tx-1)",
                fontSize: 11,
                outline: "none",
                fontFamily: "inherit",
                width: 140,
              }}
            />
          </div>
        </div>

        {/* Tasks */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 56,
                  background: "var(--panel-2)",
                  borderRadius: 10,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : viewMode === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredTasks.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--tx-3)",
                  fontSize: 13,
                }}
              >
                Нет задач. Нажмите «+ Задача» чтобы добавить.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        ) : (
          // Board view
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            {COLUMNS.filter(
              (col) => filterStatus === "all" || col.key === filterStatus,
            ).map((col) => {
              const colTasks = filteredTasks.filter(
                (t) => t.status === col.key,
              );
              return (
                <div key={col.key} style={{ width: 280, flexShrink: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 8,
                      marginBottom: 8,
                      background: col.bg,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: col.color,
                      }}
                    >
                      {col.label}
                    </span>
                    <span
                      style={{ fontSize: 12, color: col.color, opacity: 0.7 }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                    {colTasks.length === 0 && (
                      <div
                        style={{
                          border: "1px dashed var(--line)",
                          borderRadius: 10,
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--tx-3)",
                          fontSize: 12,
                        }}
                      >
                        Пусто
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed tasks from our work history */}
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--tx-3)",
              }}
            >
              История выполненных задач PostCentro
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 10,
                background: "var(--accent-dim)",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              {COMPLETED_TASKS.length} задач
            </span>
            <span
              style={{ fontSize: 10, color: "var(--tx-3)", marginLeft: "auto" }}
            >
              {showCompleted ? "▲ Скрыть" : "▼ Показать"}
            </span>
          </button>

          {showCompleted && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginTop: 8,
              }}
            >
              {COMPLETED_TASKS.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "var(--panel)",
                    border: "0.5px solid var(--line)",
                    borderRadius: 9,
                    opacity: 0.65,
                  }}
                >
                  <CheckCircle
                    size={14}
                    strokeWidth={1.6}
                    style={{ color: "var(--accent)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--tx-2)",
                      flex: 1,
                      textDecoration: "line-through",
                    }}
                  >
                    {t.title}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: "var(--chip)",
                      color: "var(--tx-3)",
                    }}
                  >
                    {t.tag}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={PRIORITY_COLOR[t.priority]}
                  >
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
