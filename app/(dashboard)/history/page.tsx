"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  draft: { label: "Черновик", class: "bg-gray-100 text-gray-500" },
  generated: { label: "Сгенерировано", class: "bg-amber-50 text-amber-600" },
  approved: { label: "Одобрено", class: "bg-blue-50 text-blue-600" },
  scheduled: { label: "Запланировано", class: "bg-purple-50 text-purple-600" },
  published: { label: "Опубликовано", class: "bg-[#E1F5EE] text-[#1D9E75]" },
  failed: { label: "Ошибка", class: "bg-red-50 text-red-500" },
};

const PLATFORM_ICON: Record<string, string> = {
  telegram: "✈️",
  instagram: "📸",
  tiktok: "🎵",
};

const TYPE_ICON: Record<string, string> = {
  post: "📝",
  video: "🎬",
  stories: "📸",
  ad: "📢",
};

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "generated", label: "Сгенерировано" },
  { value: "scheduled", label: "Запланировано" },
  { value: "published", label: "Опубликовано" },
  { value: "draft", label: "Черновики" },
];

export default function HistoryPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { data: contents, isLoading } = useQuery({
    queryKey: ["history", filter],
    queryFn: async () => {
      let query = supabase
        .from("contents")
        .select("*, projects(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      if (selected) setSelected(null);
    },
  });

  const copyCaption = () => {
    if (!selected) return;
    const text = `${selected.caption}\n\n${selected.hashtags?.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 flex gap-5 max-w-5xl w-full h-[calc(100vh-0px)]">
      {/* List */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">История</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Все сгенерированные материалы
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.value
                  ? "bg-[#1D9E75] text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : contents && contents.length > 0 ? (
            contents.map((item: any) => (
              <div
                key={item.id}
                onClick={() =>
                  setSelected(selected?.id === item.id ? null : item)
                }
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                  selected?.id === item.id
                    ? "border-[#1D9E75] shadow-sm"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-base flex-shrink-0">
                    {TYPE_ICON[item.type] || "📝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.title || "Без названия"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {(item.projects as any)?.name}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {PLATFORM_ICON[item.platform]} {item.platform}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(item.created_at), "d MMM", {
                          locale: ru,
                        })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CONFIG[item.status]?.class}`}
                  >
                    {STATUS_CONFIG[item.status]?.label}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <div className="text-4xl mb-3">🕐</div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Нет истории
              </p>
              <p className="text-sm text-gray-400">
                Сгенерированный контент появится здесь
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {selected.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {PLATFORM_ICON[selected.platform]} {selected.platform} ·{" "}
                  {TYPE_ICON[selected.type]} {selected.type}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selected.hook && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  🎣 Крючок
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {selected.hook}
                </p>
              </div>
            )}

            {selected.caption && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    📝 Текст
                  </p>
                  <button
                    onClick={copyCaption}
                    className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                      copied
                        ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]"
                        : "border-gray-200 text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {copied ? "✓" : "Копировать"}
                  </button>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selected.caption}
                </p>
              </div>
            )}

            {selected.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.hashtags.map((h: string) => (
                  <span
                    key={h}
                    className="text-[10px] px-2 py-0.5 bg-[#E1F5EE] text-[#1D9E75] rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {selected.cta && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  🎯 CTA
                </p>
                <p className="text-xs text-gray-700">{selected.cta}</p>
              </div>
            )}

            {selected.script?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                  🎬 Сценарий
                </p>
                <div className="space-y-2">
                  {selected.script.map((s: any) => (
                    <div key={s.scene} className="flex gap-2">
                      <span className="text-[10px] font-bold text-[#1D9E75] bg-[#E1F5EE] px-1.5 py-0.5 rounded flex-shrink-0 h-fit">
                        {s.scene}
                      </span>
                      <div>
                        <p className="text-xs text-gray-700">{s.text}</p>
                        <p className="text-[10px] text-gray-400">
                          {s.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
              className="w-full py-2 border border-red-200 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Удаляем..." : "🗑 Удалить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
