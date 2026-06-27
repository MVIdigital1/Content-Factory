"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  Plus,
  Lightbulb,
  Sparkles,
  Palette,
  Eye,
  CheckCircle2,
  CalendarClock,
  Rocket,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

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
  Icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    key: "idea",
    label: "Идея",
    Icon: Lightbulb,
    color: "text-tx-2",
    bg: "bg-chip",
  },
  {
    key: "generated",
    label: "AI готово",
    Icon: Sparkles,
    color: "text-c-2",
    bg: "bg-chip",
  },
  {
    key: "design",
    label: "Дизайн",
    Icon: Palette,
    color: "text-c-3",
    bg: "bg-chip",
  },
  {
    key: "review",
    label: "Проверка",
    Icon: Eye,
    color: "text-c-3",
    bg: "bg-chip",
  },
  {
    key: "approved",
    label: "Одобрено",
    Icon: CheckCircle2,
    color: "text-c-2",
    bg: "bg-chip",
  },
  {
    key: "scheduled",
    label: "Запланировано",
    Icon: CalendarClock,
    color: "text-c-2",
    bg: "bg-chip",
  },
  {
    key: "published",
    label: "Опубликовано",
    Icon: Rocket,
    color: "text-accent",
    bg: "bg-accent-dim",
  },
];

const PLATFORM_DOT: Record<string, string> = {
  telegram: "var(--accent)",
  instagram: "var(--c-2)",
  tiktok: "var(--c-3)",
  vk: "var(--c-2)",
};

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const locale = useLocale();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ["pipeline-contents"],
    queryFn: async () => {
      const res = await fetch("/api/contents?limit=100");
      return res.ok ? (res.json() as Promise<Content[]>) : [];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/contents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: status }),
      });
      if (!res.ok) throw new Error("Ошибка обновления");
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
      <div className="h-12 border-b border-line px-6 flex items-center justify-between flex-shrink-0 bg-panel">
        <span className="text-xs text-tx-3">Контент · Pipeline</span>
        <Link
          href={`/${locale}/create`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={13} strokeWidth={2.4} /> Создать
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="mb-5">
          <div className="ui-label">Контент</div>
          <h1 className="text-[24px] font-semibold tracking-tight text-tx-1 mt-1.5">
            Pipeline
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">
            Ведите контент от идеи до публикации
          </p>
          <div className="inline-flex bg-chip rounded-lg p-0.5 gap-0.5 mt-3">
            <Link
              href={`/${locale}/history`}
              className="px-3 py-1.5 text-xs rounded-md font-medium text-tx-3 hover:text-tx-1 transition-colors"
            >
              Статусы
            </Link>
            <span className="px-3 py-1.5 text-xs rounded-md font-medium bg-panel text-tx-1 shadow-sm">
              Pipeline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0 mb-6 bg-panel rounded-xl border border-line overflow-hidden">
          {PIPELINE.map((stage) => {
            const count = getByStage(stage.key).length;
            return (
              <div
                key={stage.key}
                className="flex-1 px-3 py-2.5 text-center border-r border-line last:border-0"
              >
                <p className={`ui-num text-sm font-bold ${stage.color}`}>
                  {count}
                </p>
                <p className="text-[9px] font-medium text-tx-3 mt-0.5 flex items-center justify-center gap-1">
                  <stage.Icon size={10} strokeWidth={1.8} /> {stage.label}
                </p>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex gap-3">
            {PIPELINE.map((s) => (
              <div
                key={s.key}
                className="w-52 flex-shrink-0 h-32 bg-panel-2 rounded-xl animate-pulse"
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
                    <stage.Icon
                      size={13}
                      className={stage.color}
                      strokeWidth={1.8}
                    />
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
                        className="bg-panel border border-line rounded-xl p-3 hover:border-line-strong transition-colors group"
                      >
                        <div className="flex items-start gap-1.5 mb-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                            style={{
                              background:
                                PLATFORM_DOT[c.platform || ""] || "var(--tx-3)",
                            }}
                          />
                          <p className="text-[12px] font-medium text-tx-1 line-clamp-2 flex-1">
                            {c.title || "Без названия"}
                          </p>
                        </div>
                        <p className="text-[10px] text-tx-3 mb-2">
                          {(c.projects as any)?.name || "—"} ·{" "}
                          {new Date(c.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <div className="flex gap-1 flex-wrap items-center">
                          {next && (
                            <button
                              onClick={() =>
                                moveMutation.mutate({
                                  id: c.id,
                                  status: next.key,
                                })
                              }
                              className={`inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors bg-chip ${next.color}`}
                            >
                              <ArrowRight size={9} /> {next.label}
                            </button>
                          )}
                          <Link
                            href={`/${locale}/history?id=${c.id}`}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-chip text-tx-2 hover:bg-hover"
                          >
                            Открыть
                          </Link>
                        </div>
                      </div>
                    ))}
                    {stagePosts.length === 0 && (
                      <div className="border-2 border-dashed border-line rounded-xl py-5 text-center">
                        <p className="text-[10px] text-tx-3">Пусто</p>
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
