"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Send,
  Image as ImageIcon,
  Music2,
  FileText,
  Film,
  Megaphone,
  Globe,
  Eye,
  Heart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

// Статические стили — без t(), т.к. t() недоступен на уровне модуля
const STATUS_CONFIG: Record<
  string,
  { labelKey: string; bg: string; text: string; dot: string }
> = {
  draft: {
    labelKey: "status.draft",
    bg: "bg-chip",
    text: "text-tx-2",
    dot: "bg-tx-3",
  },
  generated: {
    labelKey: "status.generated",
    bg: "bg-chip",
    text: "text-c-3",
    dot: "bg-amber-400",
  },
  approved: {
    labelKey: "status.approved",
    bg: "bg-chip",
    text: "text-c-2",
    dot: "bg-blue-400",
  },
  scheduled: {
    labelKey: "status.scheduled",
    bg: "bg-chip",
    text: "text-c-2",
    dot: "bg-purple-400",
  },
  published: {
    labelKey: "status.published",
    bg: "bg-accent-dim",
    text: "text-accent",
    dot: "bg-accent",
  },
  failed: {
    labelKey: "status.failed",
    bg: "bg-chip",
    text: "text-neg",
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

const PLATFORM_ICON: Record<string, LucideIcon> = {
  telegram: Send,
  instagram: ImageIcon,
  tiktok: Music2,
};
const TYPE_ICON: Record<string, LucideIcon> = {
  post: FileText,
  video: Film,
  stories: ImageIcon,
  ad: Megaphone,
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
  const [tagInput, setTagInput] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

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

  const tagMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase
        .from("contents")
        .update({ tags })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const addTag = (tag: string) => {
    if (!selected || !tag.trim()) return;
    const current: string[] = selected.tags || [];
    if (current.includes(tag.trim())) return;
    const newTags = [...current, tag.trim()];
    tagMutation.mutate({ id: selected.id, tags: newTags });
    setSelected((prev: any) => (prev ? { ...prev, tags: newTags } : prev));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!selected) return;
    const newTags = (selected.tags || []).filter((t: string) => t !== tag);
    tagMutation.mutate({ id: selected.id, tags: newTags });
    setSelected((prev: any) => (prev ? { ...prev, tags: newTags } : prev));
  };

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
    "w-full px-3 py-2 rounded-lg border border-line-strong text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-panel";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="ui-label">Контент</div>
            <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
              {t("title")}
            </h1>
            <p className="text-[13px] text-tx-2 mt-1">{t("subtitle")}</p>
            <div className="inline-flex bg-chip rounded-lg p-0.5 gap-0.5 mt-3">
              <span className="px-3 py-1.5 text-xs rounded-md font-medium bg-panel text-tx-1 shadow-sm">
                Статусы
              </span>
              <Link
                href={`/${locale}/pipeline`}
                className="px-3 py-1.5 text-xs rounded-md font-medium text-tx-3 hover:text-tx-1 transition-colors"
              >
                Pipeline
              </Link>
            </div>
          </div>
          <button
            onClick={exportCSV}
            disabled={!contents || contents.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-line-strong rounded-lg text-xs text-tx-2 hover:bg-hover hover:text-tx-1 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download size={14} strokeWidth={1.8} /> Экспорт CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col} className="w-64 flex-shrink-0">
                <div className="h-8 bg-chip rounded-lg animate-pulse mb-3" />
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-panel border border-line rounded-xl animate-pulse mb-2"
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
                    <span className="text-xs font-semibold text-tx-2">
                      {/* t() вызывается внутри компонента */}
                      {t(cfg.labelKey as any)}
                    </span>
                    <span className="ml-auto text-xs text-tx-3 bg-chip px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 flex-1">
                    {items.length === 0 ? (
                      <div className="border-2 border-dashed border-line rounded-xl p-4 text-center">
                        <p className="text-xs text-tx-3">Пусто</p>
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
                          className={`bg-panel border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm ${selected?.id === item.id ? "border-accent shadow-sm" : "border-line hover:border-line-strong"}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-semibold text-tx-1 line-clamp-2 flex-1">
                              {item.title || "—"}
                            </p>
                            <span className="text-base flex-shrink-0">
                              {(() => {
                                const I = TYPE_ICON[item.type] || FileText;
                                return (
                                  <I
                                    size={16}
                                    className="text-tx-2"
                                    strokeWidth={1.8}
                                  />
                                );
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-tx-3">
                              {(() => {
                                const I =
                                  PLATFORM_ICON[item.platform || ""] || Globe;
                                return (
                                  <I
                                    size={12}
                                    strokeWidth={1.8}
                                    className="inline-block align-[-2px]"
                                  />
                                );
                              })()}{" "}
                              {item.platform}
                            </span>
                            <span className="text-tx-3">·</span>
                            <span className="text-[10px] text-tx-3">
                              {(item.projects as any)?.name}
                            </span>
                          </div>
                          <div className="mt-2 text-[10px] text-tx-3">
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
        <div className="w-80 flex-shrink-0 bg-panel border-l border-line flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-line">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-tx-1 truncate">
                  {selected.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selected.status]?.bg} ${STATUS_CONFIG[selected.status]?.text}`}
                  >
                    {t(`status.${selected.status}` as any)}
                  </span>
                  <span className="text-[10px] text-tx-3">
                    {(() => {
                      const I = PLATFORM_ICON[selected.platform || ""] || Globe;
                      return (
                        <I
                          size={14}
                          strokeWidth={1.8}
                          className="inline-block align-[-2px]"
                        />
                      );
                    })()}{" "}
                    {selected.platform}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-tx-3 hover:text-tx-2 transition-colors cursor-pointer flex-shrink-0 p-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selected.hook && (
              <div>
                <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide mb-1.5">
                  Крючок
                </p>
                <p className="text-xs text-tx-1 leading-relaxed">
                  {selected.hook}
                </p>
              </div>
            )}

            {selected.caption && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide">
                    Текст
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="text-[10px] px-2 py-1 rounded-lg border border-line-strong text-tx-3 hover:bg-hover transition-colors cursor-pointer"
                    >
                      {editMode ? t("cancel") : t("edit")}
                    </button>
                    <button
                      onClick={copyCaption}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${copied ? "border-accent bg-accent-dim text-accent" : "border-line-strong text-tx-3 hover:bg-hover"}`}
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
                      className="w-full py-2 bg-accent hover:opacity-90 text-on-accent text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {updateMutation.isPending ? t("saving") : t("save")}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-tx-1 leading-relaxed whitespace-pre-wrap">
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
                    className="text-[10px] px-2 py-0.5 bg-accent-dim text-accent rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {selected.cta && (
              <div>
                <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide mb-1.5">
                  CTA
                </p>
                <p className="text-xs text-tx-1">{selected.cta}</p>
              </div>
            )}

            {/* Теги */}
            <div>
              <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide mb-2">
                Теги
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(selected.tags || []).map((tag: string) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-accent-dim text-accent rounded-full"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-neg transition-colors cursor-pointer leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)}
                  placeholder="Добавить тег..."
                  className="flex-1 px-2 py-1.5 text-xs border border-line-strong rounded-lg outline-none focus:border-accent bg-panel"
                />
                <button
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim()}
                  className="px-2.5 py-1.5 bg-accent text-on-accent text-xs rounded-lg hover:opacity-90 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {selected.script?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide mb-2">
                  Сценарий
                </p>
                <div className="space-y-2">
                  {selected.script.map((s: any) => (
                    <div key={s.scene} className="flex gap-2">
                      <span className="text-[10px] font-bold text-accent bg-accent-dim px-1.5 py-0.5 rounded flex-shrink-0 h-fit">
                        {s.scene}
                      </span>
                      <div>
                        <p className="text-xs text-tx-1">{s.text}</p>
                        <p className="text-[10px] text-tx-3">{s.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats для опубликованных */}
            {selected.status === "published" && (
              <div className="border-t border-line pt-4">
                <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide mb-3">
                  Статистика
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: t("views"),
                      value: selected.views ?? "—",
                      Icon: Eye,
                    },
                    {
                      label: t("reactions"),
                      value: selected.reactions ?? "—",
                      Icon: Heart,
                    },
                    {
                      label: t("activity"),
                      value: selected.engagement ?? "—",
                      Icon: TrendingUp,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-panel-2 rounded-lg p-2 text-center"
                    >
                      <div className="flex justify-center mb-1">
                        <stat.Icon
                          size={15}
                          className="text-tx-3"
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="text-xs font-bold text-tx-1">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-tx-3">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-tx-3 mt-2 text-center">
                  Данные из Telegram Bot API
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 border-t border-line space-y-2">
            {/* Publish block — shown for generated, failed, draft */}
            {["generated", "failed", "draft"].includes(selected.status) && (
              <div className="rounded-xl border border-line p-3 space-y-2">
                <p className="text-[10px] font-bold text-tx-3 uppercase tracking-wide">
                  Публикация
                </p>

                {publishSuccess ? (
                  <div className="bg-accent-dim border border-accent rounded-lg px-3 py-2 text-xs text-accent font-medium">
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
                                ? "bg-chip border-line-strong text-tx-2"
                                : "bg-accent border-accent text-on-accent"
                              : "bg-panel border-line-strong text-tx-3 hover:border-line-strong"
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
                        <p className="text-[10px] text-tx-3 mb-1.5 font-medium">
                          Куда публиковать
                        </p>
                        <div className="space-y-1">
                          {(integrations || []).length === 0 ? (
                            <p className="text-[10px] text-tx-3 italic">
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
                                    ? "bg-accent-dim border-accent text-accent font-semibold"
                                    : "bg-panel border-line-strong text-tx-2 hover:border-line-strong"
                                }`}
                              >
                                <span className="text-sm">
                                  {(() => {
                                    const I =
                                      PLATFORM_ICON[intg.platform] || Globe;
                                    return <I size={14} strokeWidth={1.8} />;
                                  })()}
                                </span>
                                <span className="capitalize">
                                  {intg.platform}
                                </span>
                                {intg.channel_name && (
                                  <span className="ml-auto text-[10px] text-tx-3 truncate max-w-[80px]">
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
                            className="flex-1 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-20 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                          />
                        </div>
                        <button
                          onClick={handleSchedule}
                          disabled={publishing || !selectedPlatform}
                          className="w-full py-2 bg-accent hover:opacity-90 text-on-accent text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
                        className="w-full py-2 bg-accent hover:opacity-90 text-on-accent text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {publishing ? "Публикуем..." : "Опубликовать сейчас"}
                      </button>
                    )}

                    {/* Error */}
                    {publishError && (
                      <div className="bg-chip border border-line rounded-lg px-3 py-2 text-xs text-neg">
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
              className="w-full py-2 border border-line-strong bg-panel text-tx-2 text-xs font-semibold rounded-lg hover:bg-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {duplicateMutation.isPending
                ? "Копируем..."
                : "Дублировать как черновик"}
            </button>
            <button
              onClick={() => deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
              className="w-full py-2 border border-line bg-chip text-neg text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleteMutation.isPending ? t("deleting") : `${t("delete")}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
