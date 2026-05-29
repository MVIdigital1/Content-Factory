"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Tab = "overview" | "content" | "storage" | "brandbook" | "settings";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "Обзор", icon: "📊" },
  { key: "content", label: "Контент", icon: "📝" },
  { key: "storage", label: "Хранилище", icon: "📁" },
  { key: "brandbook", label: "Брендбук", icon: "🎨" },
  { key: "settings", label: "Настройки", icon: "⚙️" },
];

const STATUS_STYLES: Record<string, string> = {
  published: "bg-blue-50 text-blue-600",
  scheduled: "bg-[#F0FDF8] text-[#1D9E75]",
  generated: "bg-amber-50 text-amber-600",
  draft: "bg-gray-100 text-gray-500",
  failed: "bg-red-50 text-red-500",
};

const FILE_ICONS: Record<string, string> = {
  image: "🖼",
  video: "🎬",
  document: "📄",
  brandbook: "📋",
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
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );

  if (!project)
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Проект не найден</p>
        <Link
          href="/projects"
          className="text-[#1D9E75] text-sm mt-2 inline-block"
        >
          ← Назад
        </Link>
      </div>
    );

  const brandColors = (project.brand_colors as any[]) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0 bg-white sticky top-0 z-10">
        <Link
          href="/projects"
          className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
        >
          ←
        </Link>
        <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
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
          <h1 className="text-base font-bold text-gray-900">{project.name}</h1>
          <p className="text-xs text-gray-400">
            {project.niche || "Без ниши"} · {project.language?.toUpperCase()}
          </p>
        </div>
        <Link
          href={`/create?projectId=${projectId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] transition-colors"
        >
          + Создать пост
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6 bg-white flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer -mb-px ${activeTab === tab.key ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <span>{tab.icon}</span>
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
                  color: "text-gray-900",
                },
                {
                  label: "Опубликовано",
                  value: stats?.published || 0,
                  color: "text-blue-600",
                },
                {
                  label: "Запланировано",
                  value: stats?.scheduled || 0,
                  color: "text-amber-600",
                },
                {
                  label: "За эту неделю",
                  value: stats?.thisWeek || 0,
                  color: "text-[#1D9E75]",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white border border-gray-100 rounded-xl p-4"
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Activity heatmap */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">
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
                      background: d.count > 0 ? "#1D9E75" : "#E5E7EB",
                      opacity:
                        d.count > 0 ? 0.5 + (d.count / maxCount) * 0.5 : 1,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-400">30 дней назад</span>
                <span className="text-[9px] text-gray-400">Сегодня</span>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">
                О проекте
              </p>
              <div className="space-y-2 text-sm">
                {project.description && (
                  <p className="text-gray-600">{project.description}</p>
                )}
                {project.audience && (
                  <p className="text-xs text-gray-400">
                    👥 Аудитория: {project.audience}
                  </p>
                )}
                {project.tone && (
                  <p className="text-xs text-gray-400">
                    🎭 Тон: {project.tone}
                  </p>
                )}
                {(project as any).stop_words && (
                  <p className="text-xs text-amber-500">
                    🚫 Стоп-слова: {(project as any).stop_words}
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
              <p className="text-sm font-semibold text-gray-900">
                Весь контент проекта
              </p>
              <Link
                href={`/create?projectId=${projectId}`}
                className="text-xs text-[#1D9E75] hover:underline font-medium"
              >
                + Новый пост
              </Link>
            </div>
            {contents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 text-sm mb-3">Нет контента</p>
                <Link
                  href={`/create?projectId=${projectId}`}
                  className="text-[#1D9E75] text-sm font-medium hover:underline"
                >
                  Создать первый пост →
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {(contents as any[]).map((c: any, i: number) => (
                  <Link
                    key={c.id}
                    href={`/history?id=${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                      {c.type === "video"
                        ? "🎬"
                        : c.type === "stories"
                          ? "📸"
                          : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.title || "Без названия"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.platform} ·{" "}
                        {new Date(c.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] || "bg-gray-100 text-gray-500"}`}
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
              <p className="text-sm font-semibold text-gray-900">
                Хранилище файлов
              </p>
              <div className="flex gap-2">
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none cursor-pointer"
                >
                  <option value="image">Изображение</option>
                  <option value="video">Видео</option>
                  <option value="document">Документ</option>
                  <option value="brandbook">Брендбук</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] cursor-pointer disabled:opacity-60"
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
                className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center cursor-pointer hover:border-[#1D9E75] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-3">📁</div>
                <p className="text-sm text-gray-400">
                  Нажми чтобы загрузить файл
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Изображения, видео, документы, брендбук
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(files as any[]).map((f: any) => (
                  <div
                    key={f.id}
                    className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors group"
                  >
                    {f.file_type === "image" && f.file_url ? (
                      <img
                        src={f.file_url}
                        alt={f.name}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-50 rounded-lg mb-2 flex items-center justify-center text-3xl">
                        {FILE_ICONS[f.file_type] || "📄"}
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {f.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-gray-400">
                        {f.size_bytes
                          ? `${(f.size_bytes / 1024).toFixed(0)} KB`
                          : "—"}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] px-2 py-0.5 bg-[#E1F5EE] text-[#1D9E75] rounded font-medium"
                        >
                          Открыть
                        </a>
                        <button
                          onClick={() => deleteFileMutation.mutate(f.id)}
                          className="text-[9px] px-2 py-0.5 bg-red-50 text-red-400 rounded font-medium cursor-pointer"
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
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">
                🎨 Цвета бренда
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {brandColors.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 group"
                  >
                    <div
                      className="w-5 h-5 rounded-md border border-gray-200 flex-shrink-0"
                      style={{ background: c.hex }}
                    />
                    <span className="text-xs text-gray-700">{c.label}</span>
                    <span className="text-[9px] text-gray-400 font-mono">
                      {c.hex}
                    </span>
                    <button
                      onClick={() => removeColor(i)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 cursor-pointer text-xs"
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
                  className="w-10 h-9 rounded cursor-pointer border border-gray-200"
                />
                <input
                  value={colorLabel}
                  onChange={(e) => setColorLabel(e.target.value)}
                  placeholder="Название цвета"
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1D9E75]"
                />
                <button
                  onClick={addColor}
                  disabled={!colorLabel}
                  className="px-3 py-2 bg-[#1D9E75] text-white text-xs rounded-lg hover:bg-[#0F6E56] disabled:opacity-50 cursor-pointer"
                >
                  + Добавить
                </button>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">
                📋 Правила и гайдлайны
              </p>
              <textarea
                value={
                  guidelinesText || (project.brand_guidelines as string) || ""
                }
                onChange={(e) => setGuidelinesText(e.target.value)}
                placeholder="Tone of voice, правила написания, что запрещено, особенности бренда..."
                rows={6}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1D9E75] resize-none"
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
                className="mt-2 px-4 py-2 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] disabled:opacity-60 cursor-pointer"
              >
                {saveBrandbookMutation.isPending ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-xl">
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">
                Настройки проекта
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Название
                  </label>
                  <input
                    defaultValue={project.name}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75]"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({ name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Описание
                  </label>
                  <textarea
                    defaultValue={project.description || ""}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75] resize-none"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Стоп-слова
                  </label>
                  <input
                    defaultValue={(project as any).stop_words || ""}
                    placeholder="скидка, акция, дешево — через запятую"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75]"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({
                        stop_words: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Логотип (URL)
                  </label>
                  <input
                    defaultValue={project.logo_url || ""}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1D9E75]"
                    onBlur={(e) =>
                      saveBrandbookMutation.mutate({ logo_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-red-600 mb-2">
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
                  className="px-4 py-2 border border-red-200 text-red-500 text-xs rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
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
