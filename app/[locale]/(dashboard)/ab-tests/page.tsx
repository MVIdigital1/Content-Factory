"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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
          `
        *,
        variant_a:variant_a_id(id, title, caption, platform, status),
        variant_b:variant_b_id(id, title, caption, platform, status)
      `,
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

  return (
    <div className="p-6 max-w-4xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">A/B Тесты</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Сравни два варианта поста — выбери лучший
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer transition-colors"
        >
          + Новый тест
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Создать A/B тест
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                Вариант A
              </label>
              <select
                value={variantA}
                onChange={(e) => setVariantA(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] bg-white cursor-pointer"
              >
                <option value="">Выбери пост</option>
                {(contents as any[])
                  .filter((c: any) => c.id !== variantB)
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title || "Без названия"} ({c.platform})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                Вариант B
              </label>
              <select
                value={variantB}
                onChange={(e) => setVariantB(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] bg-white cursor-pointer"
              >
                <option value="">Выбери пост</option>
                {(contents as any[])
                  .filter((c: any) => c.id !== variantA)
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title || "Без названия"} ({c.platform})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!variantA || !variantB || createMutation.isPending}
              className="px-4 py-2 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? "..." : "Создать тест"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Tests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">⚡</div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            Нет A/B тестов
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Создай тест чтобы найти лучший вариант поста
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer"
          >
            + Создать тест
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white border border-gray-100 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${test.status === "running" ? "bg-amber-50 text-amber-600" : "bg-[#E1F5EE] text-[#1D9E75]"}`}
                  >
                    {test.status === "running" ? "🔄 Идёт тест" : "✅ Завершён"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(test.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
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
                      className={`border-2 rounded-xl p-4 transition-all ${isWinner ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-gray-100"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-bold ${isWinner ? "text-[#1D9E75]" : "text-gray-700"}`}
                        >
                          Вариант {label} {isWinner && "🏆"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {content?.platform}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-900 mb-1">
                        {content?.title || "Без названия"}
                      </p>
                      <p className="text-[10px] text-gray-500 line-clamp-3">
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
                          className="mt-3 w-full py-2 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          👑 Выбрать победителем
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
