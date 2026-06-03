"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  FolderOpen,
  Palette,
  Settings,
  Image as ImageIcon,
  Film,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

type Tab = "overview" | "content" | "storage" | "brandbook" | "settings";

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: "overview", label: "Обзор", Icon: BarChart3 },
  { key: "content", label: "Контент", Icon: FileText },
  { key: "storage", label: "Хранилище", Icon: FolderOpen },
  { key: "brandbook", label: "Брендбук", Icon: Palette },
  { key: "settings", label: "Настройки", Icon: Settings },
];

const STATUS_STYLES: Record<string, string> = {
  published: "bg-chip text-c-2",
  scheduled: "bg-accent-dim text-accent",
  generated: "bg-chip text-c-3",
  draft: "bg-chip text-tx-2",
  failed: "bg-chip text-neg",
};

const FILE_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  brandbook: ClipboardList,
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const projectId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [uploadType, setUploadType] = useState("image");
  const [newColor, setNewColor] = useState("#1D9E75");
  const [colorLabel, setColorLabel] = useState("");
  const [guidelinesText, setGuidelinesText] = useState("");

  // Проект
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  // Статистика
  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [
        { count: total },
        { count: published },
        { count: scheduled },
        { count: thisWeek },
      ] = await Promise.all([
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "published"),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "scheduled"),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("created_at", weekAgo),
      ]);
      return {
        total: total ?? 0,
        published: published ?? 0,
        scheduled: scheduled ?? 0,
        thisWeek: thisWeek ?? 0,
      };
    },
    enabled: !!projectId,
  });

  // Контент
  const { data: contents = [] } = useQuery({
    queryKey: ["project-contents", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, type, platform, status, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: activeTab === "content" && !!projectId,
  });

  // Файлы
  const { data: files = [] } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "storage" && !!projectId,
  });

  // Активность по дням (последние 30 дней)
  const { data: activityData = [] } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(
        Date.now() - 29 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data } = await supabase
        .from("contents")
        .select("created_at")
        .eq("project_id", projectId)
        .gte("created_at", thirtyDaysAgo);
      return data || [];
    },
    enabled: activeTab === "overview" && !!projectId,
  });

  // Загрузка файла
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${projectId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("project-files").getPublicUrl(path);

      const { error: dbError } = await supabase.from("project_files").insert({
        project_id: projectId,
        user_id: user.id,
        name: file.name,
        file_url: publicUrl,
        file_type: uploadType,
        size_bytes: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("project_files").delete().eq("id", id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });

  const saveBrandbookMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const addColor = () => {
    if (!newColor || !colorLabel) return;
    const current = (project?.brand_colors as any[]) || [];
    saveBrandbookMutation.mutate({
      brand_colors: [...current, { hex: newColor, label: colorLabel }],
    });
    setColorLabel("");
  };

  const removeColor = (idx: number) => {
    const current = (project?.brand_colors as any[]) || [];
    saveBrandbookMutation.mutate({
      brand_colors: current.filter((_: any, i: number) => i !== idx),
    });
  };

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    const count = activityData.filter((a: any) =>
      a.created_at.startsWith(key),
    ).length;
    return { key, count };
  });
  const maxCount = Math.max(...days30.map((d) => d.count), 1);

  if (isLoading)
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-chip rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-chip rounded animate-pulse" />
      </div>
    );

  if (!project)
    return (
      <div className="p-6 text-center">
        <p className="text-tx-2">Проект не найден</p>
        <Link
          href="/projects"
          className="text-accent text-sm mt-2 inline-block"
        >
          ← Назад
        </Link>
      </div>
    );

  const brandColors = (project.brand_colors as any[]) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center gap-4 flex-shrink-0 bg-panel sticky top-0 z-10">
        <Link
          href="/projects"
          className="text-tx-3 hover:text-tx-2 transition-colors text-sm"
        >
          ←
        </Link>
        <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
          {project.logo_url ? (
            <img
              src={project.logo_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            project.name[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-tx-1">{project.name}</h1>
          <p className="text-xs text-tx-3">
            {project.niche || "Без ниши"} · {project.language?.toUpperCase()}
          </p>
        </div>
        <Link
          href={`/create?projectId=${projectId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 transition-colors"
        >
          + Создать пост
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line px-6 bg-panel flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer -mb-px ${activeTab === tab.key ? "border-accent text-accent" : "border-transparent text-tx-3 hover:text-tx-2"}`}
          >
            <tab.Icon size={14} strokeWidth={1.8} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5 max-w-3xl">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Всего постов",
                  value: stats?.total || 0,
                  color: "text-tx-1",
                },
                {
                  label: "Опубликовано",
                  value: stats?.published || 0,
                  color: "text-c-2",
                },
                {
                  label: "Запланировано",
                  value: stats?.scheduled || 0,
                  color: "text-c-3",
                },
                {
                  label: "За эту неделю",
                  value: stats?.thisWeek || 0,
                  color: "text-accent",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-panel border border-line rounded-xl p-4"
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-tx-3 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Activity heatmap */}
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-xs font-semibold text-tx-1 mb-3">
                Активность за 30 дней
              </p>
              <div className="flex items-end gap-1 h-12">
                {days30.map((d) => (
                  <div
                    key={d.key}
                    title={`${d.key}: ${d.count} постов`}
                    className="flex-1 rounded-sm transition-all cursor-default"
                    style={{
                      height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 15 : 4)}%`,
                      background:
                        d.count > 0 ? "var(--accent)" : "var(--track)",
                      opacity:
                        d.count > 0 ? 0.5 + (d.count / maxCount) * 0.5 : 1,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-tx-3">30 дней назад</span>
                <span className="text-[9px] text-tx-3">Сегодня</span>
              </div>
            </div>

            {/* Info */}
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-xs font-semibold text-tx-1 mb-3">О проекте</p>
              <div className="space-y-2 text-sm">
                {project.description && (
                  <p className="text-tx-2">{project.description}</p>
                )}
                {project.audience && (
                  <p className="text-xs text-tx-3">
                    Аудитория: {project.audience}
                  </p>
                )}
                {project.tone && (
                  <p className="text-xs text-tx-3">Тон: {project.tone}</p>
                )}
                {(project as any).stop_words && (
                  <p className="text-xs text-c-3">
                    Стоп-слова: {(project as any).stop_words}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {activeTab === "content" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-tx-1">
                Весь контент проекта
              </p>
              <Link
                href={`/create?projectId=${projectId}`}
                className="text-xs text-accent hover:underline font-medium"
              >
                + Новый пост
              </Link>
            </div>
            {contents.length === 0 ? (
              <div className="text-center py-12 bg-panel rounded-xl border border-line">
                <p className="text-tx-3 text-sm mb-3">Нет контента</p>
                <Link
                  href={`/create?projectId=${projectId}`}
                  className="text-accent text-sm font-medium hover:underline"
                >
                  Создать первый пост →
                </Link>
              </div>
            ) : (
              <div className="bg-panel rounded-xl border border-line overflow-hidden">
                {(contents as any[]).map((c: any, i: number) => (
                  <Link
                    key={c.id}
                    href={`/history?id=${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-hover transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-chip flex items-center justify-center text-sm flex-shrink-0">
                      {c.type === "video" ? (
                        <Film
                          size={16}
                          className="text-tx-2"
                          strokeWidth={1.8}
                        />
                      ) : c.type === "stories" ? (
                        <ImageIcon
                          size={16}
                          className="text-tx-2"
                          strokeWidth={1.8}
                        />
                      ) : (
                        <FileText
                          size={16}
                          className="text-tx-2"
                          strokeWidth={1.8}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tx-1 truncate">
                        {c.title || "Без названия"}
                      </p>
                      <p className="text-xs text-tx-3">
                        {c.platform} ·{" "}
                        {new Date(c.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] || "bg-chip text-tx-2"}`}
                    >
                      {c.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STORAGE */}
        {activeTab === "storage" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-tx-1">
                Хранилище файлов
              </p>
              <div className="flex gap-2">
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-line-strong rounded-lg bg-panel outline-none cursor-pointer"
                >
                  <option value="image">Изображение</option>
                  <option value="video">Видео</option>
                  <option value="document">Документ</option>
                  <option value="brandbook">Брендбук</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-60"
                >
                  {uploadMutation.isPending ? "Загрузка..." : "+ Загрузить"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMutation.mutate(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {files.length === 0 ? (
              <div
                className="border-2 border-dashed border-line-strong rounded-xl py-16 text-center cursor-pointer hover:border-accent transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-3 mx-auto">
                  <FolderOpen
                    size={22}
                    className="text-accent"
                    strokeWidth={1.6}
                  />
                </div>
                <p className="text-sm text-tx-3">Нажми чтобы загрузить файл</p>
                <p className="text-xs text-tx-3 mt-1">
                  Изображения, видео, документы, брендбук
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(files as any[]).map((f: any) => (
                  <div
                    key={f.id}
                    className="bg-panel border border-line rounded-xl p-3 hover:border-line-strong transition-colors group"
                  >
                    {f.file_type === "image" && f.file_url ? (
                      <img
                        src={f.file_url}
                        alt={f.name}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-panel-2 rounded-lg mb-2 flex items-center justify-center text-3xl">
                        {(() => {
                          const I = FILE_ICONS[f.file_type] || FileText;
                          return (
                            <I
                              size={28}
                              className="text-tx-3"
                              strokeWidth={1.5}
                            />
                          );
                        })()}
                      </div>
                    )}
                    <p className="text-xs font-medium text-tx-1 truncate">
                      {f.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-tx-3">
                        {f.size_bytes
                          ? `${(f.size_bytes / 1024).toFixed(0)} KB`
                          : "—"}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] px-2 py-0.5 bg-accent-dim text-accent rounded font-medium"
                        >
                          Открыть
                        </a>
                        <button
                          onClick={() => deleteFileMutation.mutate(f.id)}
                          className="text-[9px] px-2 py-0.5 bg-chip text-neg rounded font-medium cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BRANDBOOK */}
        {activeTab === "brandbook" && (
          <div className="max-w-2xl space-y-5">
            {/* Цвета бренда */}
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-xs font-semibold text-tx-1 mb-3">
                Цвета бренда
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {brandColors.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-panel-2 border border-line-strong rounded-lg px-2.5 py-1.5 group"
                  >
                    <div
                      className="w-5 h-5 rounded-md border border-line-strong flex-shrink-0"
                      style={{ background: c.hex }}
                    />
                    <span className="text-xs text-tx-1">{c.label}</span>
                    <span className="text-[9px] text-tx-3 font-mono">
                      {c.hex}
                    </span>
                    <button
                      onClick={() => removeColor(i)}
                      className="opacity-0 group-hover:opacity-100 text-tx-3 hover:text-neg cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer border border-line-strong"
                />
                <input
                  value={colorLabel}
                  onChange={(e) => setColorLabel(e.target.value)}
                  placeholder="Название цвета"
                  className="flex-1 px-3 py-2 text-xs border border-line-strong rounded-lg outline-none focus:border-accent"
                />
                <button
                  onClick={addColor}
                  disabled={!colorLabel}
                  className="px-3 py-2 bg-accent text-on-accent text-xs rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  + Добавить
                </button>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-xs font-semibold text-tx-1 mb-3">
                Правила и гайдлайны
              </p>
              <textarea
                value={
                  guidelinesText || (project.brand_guidelines as string) || ""
                }
                onChange={(e) => setGuidelinesText(e.target.value)}
                placeholder="Tone of voice, правила написания, что запрещено, особенности бренда..."
                rows={6}
                className="w-full px-3 py-2.5 text-sm border border-line-strong rounded-lg outline-none focus:border-accent resize-none"
              />
              <button
                onClick={() =>
                  saveBrandbookMutation.mutate({
                    brand_guidelines:
                      guidelinesText ||
                      (project.brand_guidelines as string) ||
                      "",
                  })
                }
                disabled={saveBrandbookMutation.isPending}
                className="mt-2 px-4 py-2 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {saveBrandbookMutation.isPending ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-xl">
            <div className="bg-panel border border-line rounded-xl p-5">
              <p className="text-sm font-semibold text-tx-1 mb-4">
                Настройки проекта
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-tx-2 block mb-1.5">
                    Название
                  </label>
                  <input
                    defaultValue={project.name}
                    className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({ name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-tx-2 block mb-1.5">
                    Описание
                  </label>
                  <textarea
                    defaultValue={project.description || ""}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent resize-none"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-tx-2 block mb-1.5">
                    Стоп-слова
                  </label>
                  <input
                    defaultValue={(project as any).stop_words || ""}
                    placeholder="скидка, акция, дешево — через запятую"
                    className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({
                        stop_words: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-tx-2 block mb-1.5">
                    Логотип (URL)
                  </label>
                  <input
                    defaultValue={project.logo_url || ""}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({ logo_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-line">
                <p className="text-xs font-medium text-neg mb-2">
                  Опасная зона
                </p>
                <button
                  onClick={async () => {
                    if (
                      !confirm("Архивировать проект? Весь контент сохранится.")
                    )
                      return;
                    await supabase
                      .from("projects")
                      .update({ is_active: false })
                      .eq("id", projectId);
                    router.push("/projects");
                  }}
                  className="px-4 py-2 border border-line text-neg text-xs rounded-lg hover:bg-chip cursor-pointer transition-colors"
                >
                  Архивировать проект
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
