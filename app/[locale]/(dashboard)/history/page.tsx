"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";

// Статические стили — без t(), т.к. t() недоступен на уровне модуля
const STATUS_CONFIG: Record<
  string,
  { labelKey: string; bg: string; text: string; dot: string }
> = {
  draft: {
    labelKey: "status.draft",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
  generated: {
    labelKey: "status.generated",
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-400",
  },
  approved: {
    labelKey: "status.approved",
    bg: "bg-blue-50",
    text: "text-blue-600",
    dot: "bg-blue-400",
  },
  scheduled: {
    labelKey: "status.scheduled",
    bg: "bg-purple-50",
    text: "text-purple-600",
    dot: "bg-purple-400",
  },
  published: {
    labelKey: "status.published",
    bg: "bg-[#E1F5EE]",
    text: "text-[#1D9E75]",
    dot: "bg-[#1D9E75]",
  },
  failed: {
    labelKey: "status.failed",
    bg: "bg-red-50",
    text: "text-red-500",
    dot: "bg-red-400",
  },
};

const COLUMNS = [
  "draft",
  "generated",
  "scheduled",
  "published",
  "failed",
] as const;

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

export default function HistoryPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const t = useTranslations("history");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState("");

  // Publish from history
  const [publishAction, setPublishAction] = useState<
    "none" | "now" | "schedule"
  >("none");
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");

  const today = new Date().toISOString().split("T")[0];

  const { data: contents, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("*, projects(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("id, platform, channel_id, channel_name, is_active")
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  // Open item from URL param (coming from dashboard or calendar)
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && contents) {
      const item = contents.find((c: any) => c.id === id);
      if (item) setSelected(item);
    }
  }, [searchParams, contents]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setSelected(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase
        .from("contents")
        .update({ caption })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setEditMode(false);
    },
  });

  const handlePublishNow = async () => {
    if (!selected) return;
    setPublishing(true);
    setPublishError("");
    setPublishSuccess("");
    try {
      const res = await fetch("/api/content/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: selected.id,
          platform: selectedPlatform || selected.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка публикации");
      setPublishSuccess("✓ Опубликовано!");
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setSelected((prev: any) =>
        prev ? { ...prev, status: "published" } : prev,
      );
    } catch (e: any) {
      setPublishError(e.message);
    }
    setPublishing(false);
  };

  const handleSchedule = async () => {
    if (!selected || !scheduleDate) return;
    setPublishing(true);
    setPublishError("");
    setPublishSuccess("");
    try {
      const scheduledAt = new Date(
        scheduleDate + "T" + scheduleTime,
      ).toISOString();
      const { error } = await supabase.from("scheduled_posts").insert({
        content_id: selected.id,
        platform: selectedPlatform || selected.platform,
        scheduled_at: scheduledAt,
        status: "pending",
      });
      if (error) throw error;
      await supabase
        .from("contents")
        .update({ status: "scheduled" })
        .eq("id", selected.id);
      setPublishSuccess("✓ Запланировано!");
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setSelected((prev: any) =>
        prev ? { ...prev, status: "scheduled" } : prev,
      );
      setPublishAction("none");
    } catch (e: any) {
      setPublishError(e.message);
    }
    setPublishing(false);
  };

  const copyCaption = () => {
    if (!selected) return;
    navigator.clipboard.writeText(
      `${selected.caption}\n\n${selected.hashtags?.join(" ")}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Экспорт всей истории в CSV
  const exportCSV = () => {
    if (!contents || contents.length === 0) return;
    const headers = [
      "Дата",
      "Название",
      "Платформа",
      "Тип",
      "Статус",
      "Текст",
      "Хэштеги",
      "Проект",
    ];
    const rows = (contents as any[]).map((c) => [
      new Date(c.created_at).toLocaleDateString("ru-RU"),
      c.title || "",
      c.platform || "",
      c.type || "",
      c.status || "",
      `"${(c.caption || "").replace(/"/g, '""')}"`,
      (c.hashtags || []).join(" "),
      (c.projects as any)?.name || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Дублирование поста под другую платформу
  const duplicateMutation = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from("contents").insert({
        project_id: item.project_id,
        type: item.type,
        platform: item.platform,
        goal: item.goal,
        title: `${item.title} (копия)`,
        idea: item.idea,
        hook: item.hook,
        script: item.script || [],
        voiceover: item.voiceover || "",
        screen_text: item.screen_text || "",
        caption: item.caption,
        hashtags: item.hashtags || [],
        cta: item.cta,
        source_image_url: item.source_image_url || null,
        status: "draft",
        ai_model: item.ai_model,
        ai_tokens: item.ai_tokens,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const dateFnsLocale = locale === "ru" ? ru : undefined;

  const getByStatus = (status: string) =>
    (contents || []).filter((c: any) => c.status === status);

  const inputBase =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!contents || contents.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            u2b07 u042du043au0441u043fu043eu0440u0442 CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col} className="w-64 flex-shrink-0">
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse mb-3" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-white border border-gray-100 rounded-xl animate-pulse mb-2"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-w-max pb-4">
            {COLUMNS.map((status) => {
              const items = getByStatus(status);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="w-64 flex-shrink-0 flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-semibold text-gray-600">
                      {/* ✅ t() вызывается внутри компонента */}
                      {t(cfg.labelKey as any)}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 flex-1">
                    {items.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-300">Пусто</p>
                      </div>
                    ) : (
                      items.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelected(item);
                            setEditMode(false);
                            setEditCaption(item.caption || "");
                            setPublishAction("none");
                            setPublishError("");
                            setPublishSuccess("");
                            setSelectedPlatform(item.platform || "");
                          }}
                          className={`bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm ${selected?.id === item.id ? "border-[#1D9E75] shadow-sm" : "border-gray-100 hover:border-gray-200"}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-semibold text-gray-900 line-clamp-2 flex-1">
                              {item.title || "—"}
                            </p>
                            <span className="text-base flex-shrink-0">
                              {TYPE_ICON[item.type] || "📝"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              {PLATFORM_ICON[item.platform]} {item.platform}
                            </span>
                            <span className="text-gray-200">·</span>
                            <span className="text-[10px] text-gray-400">
                              {(item.projects as any)?.name}
                            </span>
                          </div>
                          <div className="mt-2 text-[10px] text-gray-300">
                            {format(new Date(item.created_at), "d MMM", {
                              locale: dateFnsLocale,
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {selected.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selected.status]?.bg} ${STATUS_CONFIG[selected.status]?.text}`}
                  >
                    {t(`status.${selected.status}` as any)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {PLATFORM_ICON[selected.platform]} {selected.platform}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer flex-shrink-0 p-1"
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
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {editMode ? t("cancel") : t("edit")}
                    </button>
                    <button
                      onClick={copyCaption}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${copied ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}
                    >
                      {copied ? "✓" : t("copy")}
                    </button>
                  </div>
                </div>
                {editMode ? (
                  <div className="space-y-2">
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      rows={6}
                      className={`${inputBase} resize-none text-xs`}
                    />
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: selected.id,
                          caption: editCaption,
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="w-full py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {updateMutation.isPending ? t("saving") : t("save")}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.caption}
                  </p>
                )}
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

            {/* Stats для опубликованных */}
            {selected.status === "published" && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  📊 Статистика
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t("views"),
                      value: selected.views ?? "—",
                      icon: "👁",
                    },
                    {
                      label: t("reactions"),
                      value: selected.reactions ?? "—",
                      icon: "❤️",
                    },
                    {
                      label: t("activity"),
                      value: selected.engagement ?? "—",
                      icon: "📈",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-gray-50 rounded-lg p-2 text-center"
                    >
                      <div className="text-base mb-1">{stat.icon}</div>
                      <div className="text-xs font-bold text-gray-900">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-300 mt-2 text-center">
                  Данные из Telegram Bot API
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            {/* Publish block — shown for generated, failed, draft */}
            {["generated", "failed", "draft"].includes(selected.status) && (
              <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                  🚀 Публикация
                </p>

                {publishSuccess ? (
                  <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-lg px-3 py-2 text-xs text-[#1D9E75] font-medium">
                    {publishSuccess}
                  </div>
                ) : (
                  <>
                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-1">
                      {(["now", "schedule", "none"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setPublishAction(type)}
                          className={`py-1.5 text-[9px] font-semibold rounded-lg border transition-all cursor-pointer ${
                            publishAction === type
                              ? type === "none"
                                ? "bg-gray-100 border-gray-200 text-gray-500"
                                : "bg-[#1D9E75] border-[#1D9E75] text-white"
                              : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {type === "now"
                            ? "Сейчас"
                            : type === "schedule"
                              ? "Запланировать"
                              : "Пропустить"}
                        </button>
                      ))}
                    </div>

                    {/* Platform selector */}
                    {publishAction !== "none" && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
                          Куда публиковать
                        </p>
                        <div className="space-y-1">
                          {(integrations || []).length === 0 ? (
                            <p className="text-[10px] text-gray-300 italic">
                              Нет подключённых каналов
                            </p>
                          ) : (
                            (integrations || []).map((intg: any) => (
                              <button
                                key={intg.id}
                                onClick={() =>
                                  setSelectedPlatform(intg.platform)
                                }
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                                  selectedPlatform === intg.platform
                                    ? "bg-[#E1F5EE] border-[#1D9E75] text-[#1D9E75] font-semibold"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                              >
                                <span className="text-sm">
                                  {PLATFORM_ICON[intg.platform] || "🌐"}
                                </span>
                                <span className="capitalize">
                                  {intg.platform}
                                </span>
                                {intg.channel_name && (
                                  <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[80px]">
                                    {intg.channel_name}
                                  </span>
                                )}
                                {selectedPlatform === intg.platform && (
                                  <span className="ml-auto text-[10px]">✓</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Schedule date/time picker */}
                    {publishAction === "schedule" && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <input
                            type="date"
                            value={scheduleDate}
                            min={today}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#1D9E75] bg-white"
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#1D9E75] bg-white"
                          />
                        </div>
                        <button
                          onClick={handleSchedule}
                          disabled={publishing || !selectedPlatform}
                          className="w-full py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {publishing ? "Сохраняем..." : "Запланировать"}
                        </button>
                      </div>
                    )}

                    {/* Publish now button */}
                    {publishAction === "now" && (
                      <button
                        onClick={handlePublishNow}
                        disabled={publishing || !selectedPlatform}
                        className="w-full py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {publishing ? "Публикуем..." : "Опубликовать сейчас"}
                      </button>
                    )}

                    {/* Error */}
                    {publishError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                        {publishError}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => duplicateMutation.mutate(selected)}
              disabled={duplicateMutation.isPending}
              className="w-full py-2 border border-gray-200 bg-white text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {duplicateMutation.isPending
                ? "Копируем..."
                : "📋 Дублировать как черновик"}
            </button>
            <button
              onClick={() => deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
              className="w-full py-2 border border-red-200 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleteMutation.isPending ? t("deleting") : `🗑 ${t("delete")}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
