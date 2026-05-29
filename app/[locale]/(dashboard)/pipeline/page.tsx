"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Content = {
  id: string;
  title: string | null;
  type: string | null;
  platform: string | null;
  pipeline_status: string;
  created_at: string;
  projects: { name: string } | null;
};

const PIPELINE: {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "idea",
    label: "Идея",
    icon: "💡",
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
  {
    key: "generated",
    label: "AI Готово",
    icon: "✦",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    key: "design",
    label: "Дизайн",
    icon: "🎨",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    key: "review",
    label: "Проверка",
    icon: "👁",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "approved",
    label: "Одобрено",
    icon: "✅",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "scheduled",
    label: "Запланировано",
    icon: "📅",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    key: "published",
    label: "Опубликовано",
    icon: "🚀",
    color: "text-[#1D9E75]",
    bg: "bg-[#E1F5EE]",
  },
];

const PLATFORM_EMOJI: Record<string, string> = {
  telegram: "✈️",
  instagram: "📸",
  tiktok: "🎵",
  vk: "💙",
};

export default function PipelinePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ["pipeline-contents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select(
          "id, title, type, platform, pipeline_status, created_at, projects(name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as unknown as Content[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contents")
        .update({ pipeline_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pipeline-contents"] }),
  });

  const getByStage = (key: string) =>
    contents.filter((c) => (c.pipeline_status || "generated") === key);

  const getNextStage = (currentKey: string) => {
    const idx = PIPELINE.findIndex((p) => p.key === currentKey);
    return idx < PIPELINE.length - 1 ? PIPELINE[idx + 1] : null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
        <div className="text-xs text-gray-400">Контент pipeline</div>
        <Link
          href="/create"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] transition-colors"
        >
          + Создать
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto p-5">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-900">Контент pipeline</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Ведите контент от идеи до публикации
          </p>
        </div>

        {/* Pipeline progress bar */}
        <div className="flex items-center gap-0 mb-6 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {PIPELINE.map((stage, i) => {
            const count = getByStage(stage.key).length;
            return (
              <div
                key={stage.key}
                className={`flex-1 px-3 py-2.5 text-center border-r border-gray-100 last:border-0 ${stage.bg}`}
              >
                <p className={`text-sm font-bold ${stage.color}`}>{count}</p>
                <p
                  className={`text-[9px] font-medium ${stage.color} opacity-70`}
                >
                  {stage.icon} {stage.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Kanban columns */}
        {isLoading ? (
          <div className="flex gap-4">
            {PIPELINE.map((s) => (
              <div
                key={s.key}
                className="w-52 flex-shrink-0 h-32 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 pb-4">
            {PIPELINE.map((stage) => {
              const stagePosts = getByStage(stage.key);
              const next = getNextStage(stage.key);
              return (
                <div key={stage.key} className="w-52 flex-shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg mb-2 ${stage.bg}`}
                  >
                    <span className="text-sm">{stage.icon}</span>
                    <span className={`text-xs font-semibold ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span
                      className={`ml-auto text-xs font-medium ${stage.color} opacity-60`}
                    >
                      {stagePosts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stagePosts.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors group"
                      >
                        <div className="flex items-start gap-1.5 mb-2">
                          <span className="text-sm flex-shrink-0">
                            {PLATFORM_EMOJI[c.platform || ""] || "📄"}
                          </span>
                          <p className="text-xs font-medium text-gray-900 line-clamp-2 flex-1">
                            {c.title || "Без названия"}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">
                          {(c.projects as any)?.name || "—"} ·{" "}
                          {new Date(c.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {next && (
                            <button
                              onClick={() =>
                                moveMutation.mutate({
                                  id: c.id,
                                  status: next.key,
                                })
                              }
                              className={`text-[9px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${next.bg} ${next.color}`}
                            >
                              → {next.label}
                            </button>
                          )}
                          <Link
                            href={`/history?id=${c.id}`}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                          >
                            Открыть
                          </Link>
                        </div>
                      </div>
                    ))}
                    {stagePosts.length === 0 && (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl py-5 text-center">
                        <p className="text-[10px] text-gray-300">Пусто</p>
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
