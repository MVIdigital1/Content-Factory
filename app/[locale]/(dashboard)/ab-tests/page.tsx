"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, FlaskConical, Trophy } from "lucide-react";

type AbTest = {
  id: string;
  variant_a_id: string;
  variant_b_id: string;
  winner_id: string | null;
  status: "running" | "completed";
  created_at: string;
  variant_a?: any;
  variant_b?: any;
};

export default function AbTestsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["ab-tests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ab_tests")
        .select(
          `*, variant_a:variant_a_id(id, title, caption, platform, status), variant_b:variant_b_id(id, title, caption, platform, status)`,
        )
        .order("created_at", { ascending: false });
      return (data || []) as AbTest[];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["contents-for-ab"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, platform, status")
        .in("status", ["generated", "draft"])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ab_tests").insert({
        variant_a_id: variantA,
        variant_b_id: variantB,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      setShowCreate(false);
      setVariantA("");
      setVariantB("");
    },
  });

  const pickWinnerMutation = useMutation({
    mutationFn: async ({
      testId,
      winnerId,
    }: {
      testId: string;
      winnerId: string;
    }) => {
      const { error } = await supabase
        .from("ab_tests")
        .update({ winner_id: winnerId, status: "completed" })
        .eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ab-tests"] }),
  });

  const selectClass =
    "w-full px-3 py-2.5 border border-line rounded-[10px] text-[13px] outline-none focus:border-accent bg-panel text-tx-1 cursor-pointer";

  return (
    <div className="p-6 md:p-8 max-w-4xl w-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="ui-label">Оптимизация</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            A/B тесты
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">
            Сравни два варианта поста — выбери лучший
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer transition-opacity"
        >
          <Plus size={15} strokeWidth={2.2} /> Новый тест
        </button>
      </div>

      {showCreate && (
        <div className="ui-surface p-5 mb-5">
          <h3 className="text-[14px] font-semibold text-tx-1 mb-4">
            Создать A/B тест
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              {
                label: "Вариант A",
                val: variantA,
                set: setVariantA,
                other: variantB,
              },
              {
                label: "Вариант B",
                val: variantB,
                set: setVariantB,
                other: variantA,
              },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[12px] font-medium text-tx-2 block mb-1.5">
                  {f.label}
                </label>
                <select
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Выбери пост</option>
                  {(contents as any[])
                    .filter((c: any) => c.id !== f.other)
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title || "Без названия"} ({c.platform})
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!variantA || !variantB || createMutation.isPending}
              className="px-4 py-2.5 bg-accent text-on-accent text-[13px] rounded-[10px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? "..." : "Создать тест"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 border border-line text-tx-2 text-[13px] rounded-[10px] hover:bg-hover cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-panel-2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="ui-surface flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-4">
            <FlaskConical size={22} className="text-accent" strokeWidth={1.6} />
          </div>
          <p className="text-[15px] font-semibold text-tx-1 mb-1">
            Нет A/B тестов
          </p>
          <p className="text-[12.5px] text-tx-3 mb-4">
            Создай тест чтобы найти лучший вариант поста
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-accent text-on-accent text-[13px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.2} /> Создать тест
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="ui-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`text-[10.5px] px-2.5 py-1 rounded-full font-medium ${test.status === "running" ? "bg-chip text-c-3" : "bg-accent-dim text-accent"}`}
                >
                  {test.status === "running" ? "Идёт тест" : "Завершён"}
                </span>
                <span className="text-[12px] text-tx-3">
                  {new Date(test.created_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "A",
                    content: test.variant_a,
                    id: test.variant_a_id,
                  },
                  {
                    label: "B",
                    content: test.variant_b,
                    id: test.variant_b_id,
                  },
                ].map(({ label, content, id }) => {
                  const isWinner = test.winner_id === id;
                  return (
                    <div
                      key={label}
                      className={`border rounded-xl p-4 transition-all ${isWinner ? "border-accent bg-accent-dim" : "border-line"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[13px] font-semibold flex items-center gap-1.5 ${isWinner ? "text-accent" : "text-tx-1"}`}
                        >
                          Вариант {label} {isWinner && <Trophy size={13} />}
                        </span>
                        <span className="text-[10.5px] text-tx-3 capitalize">
                          {content?.platform}
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-tx-1 mb-1">
                        {content?.title || "Без названия"}
                      </p>
                      <p className="text-[10.5px] text-tx-2 line-clamp-3">
                        {content?.caption || "—"}
                      </p>
                      {test.status === "running" && (
                        <button
                          onClick={() =>
                            pickWinnerMutation.mutate({
                              testId: test.id,
                              winnerId: id,
                            })
                          }
                          disabled={pickWinnerMutation.isPending}
                          className="mt-3 w-full py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[10px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
                        >
                          Выбрать победителем
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
