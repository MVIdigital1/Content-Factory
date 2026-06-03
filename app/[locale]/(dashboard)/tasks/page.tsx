"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, AlertTriangle } from "lucide-react";

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
  { key: "todo", label: "К выполнению", color: "text-tx-2", bg: "bg-chip" },
  { key: "in_progress", label: "В работе", color: "text-c-2", bg: "bg-chip" },
  { key: "review", label: "На проверке", color: "text-c-3", bg: "bg-chip" },
  { key: "done", label: "Готово", color: "text-accent", bg: "bg-accent-dim" },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-chip text-tx-3",
  medium: "bg-chip text-c-2",
  high: "bg-chip text-c-3",
  urgent: "bg-chip text-neg",
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
    "w-full px-3 py-2.5 rounded-[10px] border border-line text-[13px] outline-none focus:border-accent bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-line px-6 flex items-center justify-between flex-shrink-0 bg-panel">
        <span className="text-[12px] text-tx-3">Задачи</span>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-[12px] font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={13} strokeWidth={2.4} /> Задача
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div>
            <div className="ui-label">Доска</div>
            <h1 className="text-[22px] font-semibold tracking-tight text-tx-1 mt-1">
              Задачи
            </h1>
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "todo", "in_progress", "review", "done"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-[12px] rounded-[9px] transition-colors cursor-pointer ${filterStatus === s ? "bg-accent text-on-accent" : "bg-chip text-tx-2 hover:text-tx-1"}`}
              >
                {s === "all" ? "Все" : COLUMNS.find((c) => c.key === s)?.label}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <div className="ui-surface p-5 mb-5">
            <h3 className="text-[14px] font-semibold text-tx-1 mb-4">
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
                  className="px-4 py-2 bg-accent text-on-accent text-[13px] rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? "..." : "Создать"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-line text-tx-2 text-[13px] rounded-[10px] hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="w-64 flex-shrink-0 space-y-2">
                <div className="h-8 bg-panel-2 rounded animate-pulse" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-panel-2 rounded-xl animate-pulse"
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
                    <span className={`text-[12px] font-semibold ${col.color}`}>
                      {col.label}
                    </span>
                    <span
                      className={`text-[12px] font-medium ${col.color} opacity-70`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-panel border border-line rounded-xl p-3 hover:border-line-strong transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-[13px] font-medium text-tx-1 flex-1">
                            {task.title}
                          </p>
                          <button
                            onClick={() => deleteMutation.mutate(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-tx-3 hover:text-neg transition-all cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        {task.description && (
                          <p className="text-[12px] text-tx-3 mb-2 line-clamp-2">
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
                              className={`text-[10px] ${isOverdue(task.due_date) ? "text-neg" : "text-tx-3"}`}
                            >
                              {isOverdue(task.due_date) && (
                                <AlertTriangle
                                  size={11}
                                  className="inline -mt-0.5 mr-1 text-neg"
                                  strokeWidth={2}
                                />
                              )}
                              {new Date(task.due_date).toLocaleDateString(
                                "ru-RU",
                                { day: "numeric", month: "short" },
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <div className="border-2 border-dashed border-line rounded-xl py-6 text-center">
                        <p className="text-[12px] text-tx-3">Пусто</p>
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
