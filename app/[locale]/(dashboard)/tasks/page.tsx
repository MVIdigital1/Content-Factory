"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Check } from "lucide-react";

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

export default function TasksPage() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState("");

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
    mutationFn: async (title: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        description: null,
        status: "todo",
        priority: "medium",
        due_date: null,
        project_id: null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
      setShowModal(false);
      setCreateError("");
    },
    onError: (e: any) => {
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

  const handleCreate = () => {
    if (!newTitle.trim()) {
      setCreateError("Введите название");
      return;
    }
    createMutation.mutate(newTitle);
  };

  const todo = tasks.filter((t) => t.status === "todo");
  const inProg = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "review",
  );
  const done = tasks.filter((t) => t.status === "done");

  const inp =
    "w-full px-3 py-2.5 rounded-[9px] border border-line text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  const TaskRow = ({ task }: { task: Task }) => {
    const isDone = task.status === "done";
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-hover transition-colors group">
        {/* Checkbox */}
        <button
          onClick={() =>
            doneMutation.mutate({
              id: task.id,
              status: isDone ? "todo" : "done",
            })
          }
          className={`w-5 h-5 rounded-[5px] border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${isDone ? "bg-accent border-accent" : "border-line-strong hover:border-accent"}`}
        >
          {isDone && (
            <Check
              size={11}
              strokeWidth={3}
              style={{ color: "var(--on-accent)" }}
            />
          )}
        </button>

        {/* Title */}
        <span
          className={`flex-1 text-[13px] ${isDone ? "line-through text-tx-3" : "text-tx-1"}`}
        >
          {task.title}
        </span>

        {/* Date */}
        <span className="text-[11px] text-tx-3 flex-shrink-0">
          {new Date(task.created_at).toLocaleDateString("ru", {
            day: "numeric",
            month: "short",
          })}
        </span>

        {/* Delete */}
        <button
          onClick={() => deleteMutation.mutate(task.id)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-panel-2 cursor-pointer transition-all flex-shrink-0"
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

  const Section = ({
    label,
    tasks,
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
          {tasks.length}
        </span>
      </div>
      <div className="ui-surface overflow-hidden">
        {tasks.length === 0 ? (
          <div className="px-4 py-5 text-[12px] text-tx-3 text-center">
            {emptyText}
          </div>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
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
            setShowModal(true);
            setNewTitle("");
            setCreateError("");
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
            marginBottom: 24,
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
              style={{ padding: "16px 18px" }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--tx-3)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 8,
                }}
              >
                {s.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 600, color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Task lists */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 44,
                  background: "var(--panel-2)",
                  borderRadius: 10,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
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
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 400,
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
                onClick={() => setShowModal(false)}
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
            <div style={{ padding: "20px" }}>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setCreateError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowModal(false);
                }}
                placeholder="Название задачи..."
                className={inp}
              />
              {createError && (
                <p style={{ fontSize: 11, color: "var(--neg)", marginTop: 6 }}>
                  {createError}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity:
                      createMutation.isPending || !newTitle.trim() ? 0.6 : 1,
                  }}
                >
                  {createMutation.isPending ? "Создаём..." : "Создать"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
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
