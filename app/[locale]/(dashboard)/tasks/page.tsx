"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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

const COLUMNS: {
  key: Task["status"];
  label: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "todo",
    label: "К выполнению",
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
  {
    key: "in_progress",
    label: "В работе",
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    key: "review",
    label: "На проверке",
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  { key: "done", label: "Готово", color: "text-[#1D9E75]", bg: "bg-[#E1F5EE]" },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-amber-50 text-amber-600",
  urgent: "bg-red-50 text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочно",
};

const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "medium" as const,
  due_date: "",
  project_id: "",
};

export default function TasksPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  const getByStatus = (status: Task["status"]) =>
    tasks.filter((t) => t.status === status);

  const isOverdue = (dueDate: string | null) =>
    dueDate && new Date(dueDate) < new Date();

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] bg-white";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-11 border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Задачи</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer"
        >
          + Задача
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-gray-900">Задачи</h1>
          <div className="flex gap-1">
            {["all", "todo", "in_progress", "review", "done"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${filterStatus === s ? "bg-[#1D9E75] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                {s === "all" ? "Все" : COLUMNS.find((c) => c.key === s)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Форма создания */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Новая задача
            </h3>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Название задачи"
                className={inputClass}
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Описание (необязательно)"
                rows={2}
                className={`${inputClass} resize-none`}
              />
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priority: e.target.value as any }))
                  }
                  className={inputClass}
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.project_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, project_id: e.target.value }))
                  }
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title || createMutation.isPending}
                  className="px-4 py-2 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? "..." : "Создать"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban */}
        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="w-64 flex-shrink-0 space-y-2">
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 pb-4">
            {COLUMNS.filter(
              (col) => filterStatus === "all" || col.key === filterStatus,
            ).map((col) => {
              const colTasks = getByStatus(col.key);
              return (
                <div key={col.key} className="w-72 flex-shrink-0">
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 ${col.bg}`}
                  >
                    <span className={`text-xs font-semibold ${col.color}`}>
                      {col.label}
                    </span>
                    <span
                      className={`text-xs font-medium ${col.color} opacity-70`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-900 flex-1">
                            {task.title}
                          </p>
                          <button
                            onClick={() => deleteMutation.mutate(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all cursor-pointer text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.due_date && (
                            <span
                              className={`text-[10px] ${isOverdue(task.due_date) ? "text-red-500" : "text-gray-400"}`}
                            >
                              {isOverdue(task.due_date) ? "⚠ " : ""}
                              {new Date(task.due_date).toLocaleDateString(
                                "ru-RU",
                                { day: "numeric", month: "short" },
                              )}
                            </span>
                          )}
                        </div>
                        {/* Кнопки перемещения */}
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                            <button
                              key={c.key}
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: task.id,
                                  status: c.key,
                                })
                              }
                              className={`text-[9px] px-2 py-0.5 rounded ${c.bg} ${c.color} cursor-pointer font-medium`}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl py-6 text-center">
                        <p className="text-xs text-gray-300">Пусто</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
