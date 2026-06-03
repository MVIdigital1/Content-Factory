"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Target, X } from "lucide-react";

type KpiGoal = {
  id: string;
  metric: "posts_per_week" | "posts_per_month" | "published";
  target: number;
  project_id: string | null;
};

const METRIC_LABELS: Record<string, string> = {
  posts_per_week: "Постов/неделю",
  posts_per_month: "Постов/месяц",
  published: "Опубликовано",
};

export default function KpiWidget() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newMetric, setNewMetric] =
    useState<KpiGoal["metric"]>("posts_per_week");
  const [newTarget, setNewTarget] = useState(3);

  const now = new Date();
  const weekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const monthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: goals } = useQuery({
    queryKey: ["kpi-goals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kpi_goals")
        .select("*")
        .order("created_at");
      return (data || []) as KpiGoal[];
    },
  });

  const { data: actuals } = useQuery({
    queryKey: ["kpi-actuals"],
    queryFn: async () => {
      const [{ count: thisWeek }, { count: thisMonth }, { count: published }] =
        await Promise.all([
          supabase
            .from("contents")
            .select("*", { count: "exact", head: true })
            .gte("created_at", weekAgo),
          supabase
            .from("contents")
            .select("*", { count: "exact", head: true })
            .gte("created_at", monthAgo),
          supabase
            .from("contents")
            .select("*", { count: "exact", head: true })
            .eq("status", "published")
            .gte("created_at", weekAgo),
        ]);
      return {
        posts_per_week: thisWeek ?? 0,
        posts_per_month: thisMonth ?? 0,
        published: published ?? 0,
      };
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("kpi_goals").insert({
        user_id: user.id,
        metric: newMetric,
        target: newTarget,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-goals"] });
      setAdding(false);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("kpi_goals").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kpi-goals"] }),
  });

  const Header = (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[14px] font-semibold text-tx-1 flex items-center gap-2">
        <Target size={15} className="text-accent" strokeWidth={1.8} /> Цели и
        KPI
      </p>
      <button
        onClick={() => setAdding((v) => !v)}
        className="text-[11px] text-accent hover:opacity-80 font-medium cursor-pointer"
      >
        {adding ? "Отмена" : "+ Добавить"}
      </button>
    </div>
  );

  if (!goals || goals.length === 0) {
    return (
      <div className="ui-surface p-4">
        {Header}
        {adding ? (
          <GoalForm
            metric={newMetric}
            target={newTarget}
            setMetric={setNewMetric}
            setTarget={setNewTarget}
            onSave={() => addGoal.mutate()}
            onCancel={() => setAdding(false)}
            isPending={addGoal.isPending}
          />
        ) : (
          <p className="text-[12px] text-tx-3 text-center py-3">
            Нет целей. Добавь первую!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ui-surface p-4">
      {Header}

      {adding && (
        <GoalForm
          metric={newMetric}
          target={newTarget}
          setMetric={setNewMetric}
          setTarget={setNewTarget}
          onSave={() => addGoal.mutate()}
          onCancel={() => setAdding(false)}
          isPending={addGoal.isPending}
        />
      )}

      <div className="space-y-3">
        {goals.map((goal) => {
          const actual = actuals?.[goal.metric] ?? 0;
          const pct = Math.min(Math.round((actual / goal.target) * 100), 100);
          const color =
            pct >= 100
              ? "var(--accent)"
              : pct >= 60
                ? "var(--c-3)"
                : "var(--neg)";
          return (
            <div key={goal.id} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-tx-2">
                  {METRIC_LABELS[goal.metric]}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-semibold ui-num"
                    style={{ color }}
                  >
                    {actual} / {goal.target}
                  </span>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-tx-3 hover:text-neg transition-all cursor-pointer"
                    aria-label="Удалить цель"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-track rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalForm({
  metric,
  target,
  setMetric,
  setTarget,
  onSave,
  onCancel,
  isPending,
}: {
  metric: KpiGoal["metric"];
  target: number;
  setMetric: (v: KpiGoal["metric"]) => void;
  setTarget: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const field =
    "px-2.5 py-1.5 text-[12px] border border-line rounded-lg bg-panel text-tx-1 outline-none focus:border-accent";
  return (
    <div className="bg-panel-2 rounded-lg p-3 mb-3 space-y-2">
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value as KpiGoal["metric"])}
        className={`w-full ${field}`}
      >
        {Object.entries(METRIC_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          min={1}
          max={100}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className={`w-20 ${field}`}
        />
        <span className="text-[12px] text-tx-3">цель</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isPending}
          className="flex-1 py-1.5 bg-accent text-on-accent text-[12px] rounded-lg hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "..." : "Сохранить"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-line text-[12px] text-tx-2 rounded-lg hover:bg-hover cursor-pointer"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
