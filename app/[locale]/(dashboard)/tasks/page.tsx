"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Check, Flame, Minus, ChevronDown } from "lucide-react";

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
    onError: (e: Error) => {
      setCreateError(e.message || "Ошибка создания");
    },
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

  const openModal = () => {
    resetModal();
    setShowModal(true);
  };

  const todo = tasks.filter((t) => t.status === "todo");
  const inProg = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "review",
  );
  const done = tasks.filter((t) => t.status === "done");

  const visibleTasks =
    filter === "todo" ? [...todo, ...inProg] : filter === "done" ? done : tasks;

  const inp =
    "w-full px-3 py-2.5 rounded-[9px] border border-line text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  /* ── Task row ── */
  const TaskRow = ({ task }: { task: Task }) => {
    const isDone = task.status === "done";
    const pm = PRIORITY_META[task.priority];
    return (
      <div className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-hover transition-colors group">
        {/* Checkbox */}
        <button
          onClick={() =>
            doneMutation.mutate({
              id: task.id,
              status: isDone ? "todo" : "done",
            })
          }
          className={`mt-0.5 w-5 h-5 rounded-[5px] border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
            isDone
              ? "bg-accent border-accent"
              : "border-line-strong hover:border-accent"
          }`}
        >
          {isDone && (
            <Check
              size={11}
              strokeWidth={3}
              style={{ color: "var(--on-accent)" }}
            />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-[13px] leading-snug block ${
              isDone ? "line-through text-tx-3" : "text-tx-1"
            }`}
          >
            {task.title}
          </span>
          {task.description && (
            <p className="text-[12px] text-tx-3 mt-0.5 leading-snug line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 999,
                color: pm.color,
                background: pm.bg,
                letterSpacing: "0.02em",
              }}
            >
              {pm.label}
            </span>
            {/* Date */}
            <span className="text-[11px] text-tx-3">
              {new Date(task.created_at).toLocaleDateString("ru", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteMutation.mutate(task.id)}
          className="opacity-0 group-hover:opacity-100 mt-0.5 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-panel-2 cursor-pointer transition-all flex-shrink-0"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--tx-3)",
          }}
        >
          <X size={13} />
        </button>
      </div>
    );
  };

  /* ── Section ── */
  const Section = ({
    label,
    tasks: sectionTasks,
    emptyText,
  }: {
    label: string;
    tasks: Task[];
    emptyText: string;
  }) => (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[10px] font-semibold text-tx-3 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-chip text-tx-3">
          {sectionTasks.length}
        </span>
      </div>
      <div className="ui-surface overflow-hidden">
        {sectionTasks.length === 0 ? (
          <div className="px-4 py-5 text-[12px] text-tx-3 text-center">
            {emptyText}
          </div>
        ) : (
          sectionTasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </div>
    </div>
  );

  /* ── Render ── */
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
          onClick={openModal}
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
              {f === "all" ? "Все" : f === "todo" ? "В работе" : "Выполнено"}
            </button>
          ))}
        </div>

        {/* Task lists */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  background: "var(--panel-2)",
                  borderRadius: 10,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : filter !== "all" ? (
          <div className="ui-surface overflow-hidden">
            {visibleTasks.length === 0 ? (
              <div className="px-4 py-8 text-[12px] text-tx-3 text-center">
                {filter === "done"
                  ? "Выполненных задач нет"
                  : "Все задачи выполнены! 🎉"}
              </div>
            ) : (
              visibleTasks.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
        ) : (
          <>
            <Section label="Создано" tasks={todo} emptyText="Нет новых задач" />
            <Section
              label="Запланировано"
              tasks={inProg}
              emptyText="Нет запланированных задач"
            />
            <Section
              label="Выполнено"
              tasks={done}
              emptyText="Нет выполненных задач"
            />
          </>
        )}
      </div>

      {/* Create modal */}
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
                gap: 12,
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
                    marginBottom: 6,
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
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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
