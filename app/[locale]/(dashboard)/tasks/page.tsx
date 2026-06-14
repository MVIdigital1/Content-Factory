"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Check, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  project_id: string | null;
  created_at: string;
};

const PRIORITY_META: Record<
  Task["priority"],
  { label: string; color: string; bg: string }
> = {
  low: { label: "Низкий", color: "#0F6E56", bg: "rgba(29,158,117,0.1)" },
  medium: { label: "Средний", color: "#854F0B", bg: "rgba(239,159,39,0.12)" },
  high: { label: "Высокий", color: "#A32D2D", bg: "rgba(226,75,74,0.1)" },
  urgent: { label: "Срочно", color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TasksPage() {
  const supabase = createClient();
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [createError, setCreateError] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Task[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      title,
      description,
      priority,
    }: {
      title: string;
      description: string;
      priority: Task["priority"];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        status: "todo",
        priority,
        due_date: null,
        project_id: null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      resetModal();
    },
    onError: (e: Error) => setCreateError(e.message || "Ошибка создания"),
  });

  const doneMutation = useMutation({
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const resetModal = () => {
    setShowModal(false);
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setCreateError("");
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      setCreateError("Введите название задачи");
      return;
    }
    createMutation.mutate({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
    });
  };

  const todo = tasks.filter((t) => t.status === "todo");
  const inProg = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "review",
  );
  const done = tasks.filter((t) => t.status === "done");

  // #1 = самая первая созданная задача (самая старая)
  const sortedAscIds = [...tasks]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map((t) => t.id);

  const getIndex = (id: string) => sortedAscIds.indexOf(id) + 1;

  const visibleTasks =
    filter === "todo" ? [...todo, ...inProg] : filter === "done" ? done : tasks;

  const inp =
    "w-full px-3 py-2.5 rounded-[9px] border border-line text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  /* ── Task Card ── */
  const TaskCard = ({ task }: { task: Task }) => {
    const isDone = task.status === "done";
    const pm = PRIORITY_META[task.priority];
    const idx = getIndex(task.id);

    return (
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 12,
          padding: "16px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          opacity: isDone ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* Checkbox */}
        <button
          onClick={() =>
            doneMutation.mutate({
              id: task.id,
              status: isDone ? "todo" : "done",
            })
          }
          style={{
            marginTop: 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: isDone ? "none" : "1.5px solid var(--line-strong)",
            background: isDone ? "var(--accent)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {isDone && (
            <Check
              size={11}
              strokeWidth={3}
              style={{ color: "var(--on-accent)" }}
            />
          )}
        </button>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + порядковый номер */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tx-3)",
                background: "var(--panel-2)",
                border: "0.5px solid var(--line)",
                borderRadius: 5,
                padding: "1px 6px",
                flexShrink: 0,
              }}
            >
              #{idx}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isDone ? "var(--tx-3)" : "var(--tx-1)",
                textDecoration: isDone ? "line-through" : "none",
                lineHeight: 1.3,
              }}
            >
              {task.title}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p
              style={{
                fontSize: 12,
                color: "var(--tx-3)",
                lineHeight: 1.55,
                marginBottom: 10,
              }}
            >
              {task.description}
            </p>
          )}

          {/* Badges + дата и время */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginTop: task.description ? 0 : 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                color: pm.color,
                background: pm.bg,
              }}
            >
              {pm.label}
            </span>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                color: isDone ? "#3B6D11" : "#185FA5",
                background: isDone
                  ? "rgba(99,153,34,0.1)"
                  : "rgba(55,138,221,0.1)",
              }}
            >
              {isDone ? "Выполнено" : "В работе"}
            </span>

            <span style={{ fontSize: 11, color: "var(--tx-3)" }}>
              {formatDateTime(task.created_at)}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteMutation.mutate(task.id)}
          style={{
            marginTop: 2,
            width: 28,
            height: 28,
            borderRadius: 7,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--tx-3)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(226,75,74,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "#A32D2D";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--tx-3)";
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  /* ── Page ── */
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
          padding: "0 16px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
          Инструменты /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>Задачи</span>
        </p>
        <button
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-[12px] font-semibold rounded-[8px] hover:opacity-90 cursor-pointer"
          style={{ border: "none" }}
        >
          <Plus size={13} strokeWidth={2.5} /> Создать задачу
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Создано", value: todo.length, color: "var(--tx-1)" },
            { label: "Запланировано", value: inProg.length, color: "#3B82F6" },
            { label: "Выполнено", value: done.length, color: "var(--pos)" },
          ].map((s) => (
            <div
              key={s.label}
              className="ui-surface"
              style={{ padding: "14px 16px" }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--tx-3)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 6,
                }}
              >
                {s.label}
              </p>
              <p style={{ fontSize: 26, fontWeight: 600, color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["all", "todo", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                borderRadius: 999,
                border: "0.5px solid var(--line)",
                background: filter === f ? "var(--tx-1)" : "transparent",
                color: filter === f ? "var(--panel)" : "var(--tx-3)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f === "all"
                ? `Все (${tasks.length})`
                : f === "todo"
                  ? `В работе (${todo.length + inProg.length})`
                  : `Выполнено (${done.length})`}
            </button>
          ))}
        </div>

        {/* Cards */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 90,
                  background: "var(--panel-2)",
                  borderRadius: 12,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 20px",
              color: "var(--tx-3)",
              fontSize: 13,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>📋</span>
            {filter === "done"
              ? "Выполненных задач нет"
              : filter === "todo"
                ? "Все задачи выполнены! 🎉"
                : "Задач пока нет — создай первую!"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetModal();
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "0.5px solid var(--line)",
              }}
            >
              <p
                style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}
              >
                Новая задача
              </p>
              <button
                onClick={resetModal}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: "0.5px solid var(--line)",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--tx-3)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Title */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--tx-3)",
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Название задачи
                </p>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setCreateError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") resetModal();
                  }}
                  placeholder="Например: Сделать кнопку оплаты"
                  className={inp}
                />
                {createError && (
                  <p
                    style={{ fontSize: 11, color: "var(--neg)", marginTop: 5 }}
                  >
                    {createError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--tx-3)",
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Описание <span style={{ opacity: 0.6 }}>(необязательно)</span>
                </p>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Зачем нужна задача, что именно сделать..."
                  rows={3}
                  className={inp}
                  style={{ resize: "none", lineHeight: 1.55 }}
                />
              </div>

              {/* Priority */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--tx-3)",
                    marginBottom: 8,
                    fontWeight: 500,
                  }}
                >
                  Приоритет
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 6,
                  }}
                >
                  {(
                    ["low", "medium", "high", "urgent"] as Task["priority"][]
                  ).map((p) => {
                    const pm = PRIORITY_META[p];
                    const active = newPriority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        style={{
                          padding: "7px 4px",
                          borderRadius: 8,
                          border: active
                            ? `1.5px solid ${pm.color}`
                            : "0.5px solid var(--line)",
                          background: active ? pm.bg : "transparent",
                          color: active ? pm.color : "var(--tx-3)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          textAlign: "center",
                        }}
                      >
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newTitle.trim()}
                  style={{
                    flex: 1,
                    padding: "11px",
                    borderRadius: 9,
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      createMutation.isPending || !newTitle.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontFamily: "inherit",
                    opacity:
                      createMutation.isPending || !newTitle.trim() ? 0.55 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {createMutation.isPending ? "Создаём..." : "Создать задачу"}
                </button>
                <button
                  onClick={resetModal}
                  style={{
                    padding: "11px 16px",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--tx-2)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
