"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  FileText,
  Film,
  Image as ImageIcon,
  ChevronLeft,
  Copy,
  Archive,
  Pencil,
  X,
  FolderOpen,
  Upload,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";

type Tab = "overview" | "content" | "campaigns" | "integrations" | "tasks" | "history" | "storage";

type TaskStatus   = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low:    { label: "Низкий",  color: "#0F6E56", bg: "rgba(29,158,117,0.1)" },
  medium: { label: "Средний", color: "#854F0B", bg: "rgba(239,159,39,0.12)" },
  high:   { label: "Высокий", color: "#A32D2D", bg: "rgba(226,75,74,0.1)" },
  urgent: { label: "Срочно",  color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
};

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",     label: "Обзор" },
  { key: "content",      label: "Контент" },
  { key: "campaigns",    label: "Кампании" },
  { key: "integrations", label: "Интеграции" },
  { key: "tasks",        label: "Задачи" },
  { key: "history",      label: "История" },
  { key: "storage",      label: "Хранилище" },
];

const STATUS_STYLES: Record<string, string> = {
  published: "bg-chip text-c-2",
  scheduled: "bg-accent-dim text-accent",
  generated:  "bg-chip text-c-3",
  draft:      "bg-chip text-tx-2",
  failed:     "bg-chip text-neg",
};

const PLATFORM_ICONS: Record<string, string> = {
  telegram:  "ti ti-brand-telegram",
  instagram: "ti ti-brand-instagram",
  tiktok:    "ti ti-brand-tiktok",
  vk:        "ti ti-brand-vk",
};

const FILE_TYPE_LABELS: Record<string, string> = {
  image:    "Изображение",
  video:    "Видео",
  document: "Документ",
  other:    "Другое",
};

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const params      = useParams();
  const router      = useRouter();
  const supabase    = createClient();
  const queryClient = useQueryClient();
  const locale      = useLocale();
  const projectId   = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab,        setActiveTab]       = useState<Tab>("overview");
  const [isEditOpen,       setIsEditOpen]      = useState(false);
  const [editName,         setEditName]        = useState("");
  const [editNiche,        setEditNiche]       = useState("");
  const [editDescription,  setEditDescription] = useState("");
  const [editAudience,     setEditAudience]    = useState("");
  const [editStopWords,    setEditStopWords]   = useState("");
  const [uploadType,       setUploadType]      = useState<"image"|"video"|"document"|"other">("image");
  const [fileFilter,       setFileFilter]      = useState<"all"|"image"|"video"|"document"|"other">("all");
  const [isDragging,       setIsDragging]      = useState(false);
  const [showTaskModal,    setShowTaskModal]   = useState(false);
  const [newTaskTitle,     setNewTaskTitle]    = useState("");
  const [newTaskDesc,      setNewTaskDesc]     = useState("");
  const [newTaskPriority,  setNewTaskPriority] = useState<TaskPriority>("medium");
  const [taskError,        setTaskError]       = useState("");
  const [taskFilter,       setTaskFilter]      = useState<"all"|"todo"|"done">("all");

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      const [{ count: published }, { count: scheduled }, { count: total }] = await Promise.all([
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "published"),
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "scheduled"),
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      ]);
      return { published: published ?? 0, scheduled: scheduled ?? 0, total: total ?? 0 };
    },
    enabled: !!projectId,
  });

  const { data: channelsCount = 0 } = useQuery({
    queryKey: ["project-channels-count", projectId],
    queryFn: async () => {
      const { count } = await supabase.from("integrations").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!projectId,
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["project-integrations", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "integrations" || activeTab === "overview",
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["project-contents", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("contents").select("id, title, type, platform, status, created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: (activeTab === "content" || activeTab === "history") && !!projectId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["project-campaigns", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "campaigns" && !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return (data || []) as Task[];
    },
    enabled: activeTab === "tasks" && !!projectId,
  });

  const { data: activityData = [] } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const ago30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("contents").select("created_at").eq("project_id", projectId).gte("created_at", ago30);
      return data || [];
    },
    enabled: activeTab === "overview" && !!projectId,
  });

  const { data: files = [] } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: activeTab === "storage" && !!projectId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setIsEditOpen(false);
    },
  });

  const duplicateProjectMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !project) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("projects").insert({
        user_id: user.id,
        name: `${project.name} (копия)`,
        niche: project.niche,
        description: project.description,
        audience: project.audience,
        tone: project.tone,
        language: project.language,
        products: project.products,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/${locale}/projects/${data.id}`);
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").update({ is_active: false }).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/${locale}/projects`);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ title, description, priority }: { title: string; description: string; priority: TaskPriority }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase.from("tasks").insert({
        title:       title.trim(),
        description: description.trim() || null,
        status:      "todo",
        priority,
        project_id:  projectId,
        created_by:  user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setShowTaskModal(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("medium");
      setTaskError("");
    },
    onError: (e: Error) => setTaskError(e.message),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext  = file.name.split(".").pop();
      const path = `${user.id}/${projectId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(path);

      // Определяем тип автоматически если не выбран вручную
      let detectedType = uploadType;
      if (file.type.startsWith("image/"))  detectedType = "image";
      if (file.type.startsWith("video/"))  detectedType = "video";
      if (file.type.includes("pdf") || file.type.includes("document")) detectedType = "document";

      const { error: dbError } = await supabase.from("project_files").insert({
        project_id: projectId,
        user_id:    user.id,
        name:       file.name,
        file_url:   publicUrl,
        file_type:  detectedType,
        size_bytes: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ id, file_url }: { id: string; file_url: string }) => {
      const storageKey = file_url.split("/project-files/")[1];
      if (storageKey) await supabase.storage.from("project-files").remove([storageKey]);
      await supabase.from("project_files").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (project && isEditOpen) {
      setEditName(project.name || "");
      setEditNiche(project.niche || "");
      setEditDescription(project.description || "");
      setEditAudience(project.audience || "");
      setEditStopWords((project as any).stop_words || "");
    }
  }, [project, isEditOpen]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key   = d.toISOString().split("T")[0];
    const count = activityData.filter((a: any) => a.created_at.startsWith(key)).length;
    return { key, count };
  });
  const maxCount = Math.max(...days30.map((d) => d.count), 1);

  // Шаги настройки проекта
  const setupSteps = project
    ? [
        {
          key:    "niche",
          label:  "Укажи нишу проекта",
          done:   !!project.niche,
          action: () => setIsEditOpen(true),
        },
        {
          key:    "description",
          label:  "Добавь описание бренда",
          done:   !!project.description,
          action: () => setIsEditOpen(true),
        },
        {
          key:    "audience",
          label:  "Опиши целевую аудиторию",
          done:   !!project.audience,
          action: () => setIsEditOpen(true),
        },
        {
          key:    "integration",
          label:  "Подключи канал (Telegram / Instagram)",
          done:   (channelsCount as number) > 0,
          action: () => router.push(`/${locale}/integrations`),
        },
        {
          key:    "content",
          label:  "Создай первый контент",
          done:   (stats?.total ?? 0) > 0,
          action: () => router.push(`/${locale}/create?projectId=${projectId}`),
        },
      ]
    : [];

  const doneCount      = setupSteps.filter((s) => s.done).length;
  const isSetupDone    = doneCount === setupSteps.length;
  const setupPct       = setupSteps.length > 0 ? Math.round((doneCount / setupSteps.length) * 100) : 100;

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) { setTaskError("Введите название задачи"); return; }
    createTaskMutation.mutate({ title: newTaskTitle, description: newTaskDesc, priority: newTaskPriority });
  };

  const filteredFiles  = fileFilter === "all"
    ? (files as any[])
    : (files as any[]).filter((f: any) => f.file_type === fileFilter);

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading)
    return (
      <div className="p-6 space-y-3">
        <div className="h-4 w-48 bg-chip rounded animate-pulse" />
        <div className="h-6 w-32 bg-chip rounded animate-pulse" />
        <div className="h-3 w-64 bg-chip rounded animate-pulse" />
      </div>
    );

  if (!project)
    return (
      <div className="p-6 text-center">
        <p className="text-tx-2 text-sm">Проект не найден</p>
        <Link href={`/${locale}/projects`} className="text-accent text-xs mt-2 inline-block">← Назад</Link>
      </div>
    );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Breadcrumb + actions ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-panel flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-tx-3">
          <Link href={`/${locale}/projects`} className="flex items-center gap-0.5 hover:text-tx-2 transition-colors">
            <ChevronLeft size={13} strokeWidth={2} />
            <span>Проекты</span>
          </Link>
          <span>/</span>
          <span className="text-tx-1 font-medium">{project.name}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1 text-xs h-7 px-2.5 border border-line rounded-lg hover:bg-hover transition-colors cursor-pointer text-tx-2"
          >
            <Pencil size={11} strokeWidth={2} />
            Редактировать
          </button>
          <button
            onClick={() => { if (confirm("Дублировать проект?")) duplicateProjectMutation.mutate(); }}
            disabled={duplicateProjectMutation.isPending}
            className="flex items-center gap-1 text-xs h-7 px-2.5 border border-line rounded-lg hover:bg-hover transition-colors cursor-pointer text-tx-2 disabled:opacity-50"
          >
            <Copy size={11} strokeWidth={2} />
            Дублировать
          </button>
          <button
            onClick={() => { if (confirm("Архивировать проект? Весь контент сохранится.")) archiveProjectMutation.mutate(); }}
            disabled={archiveProjectMutation.isPending}
            className="flex items-center gap-1 text-xs h-7 px-2.5 border border-line rounded-lg hover:bg-hover transition-colors cursor-pointer text-tx-2 disabled:opacity-50"
          >
            <Archive size={11} strokeWidth={2} />
            Архивировать
          </button>
        </div>
      </div>

      {/* ── Project title + status ── */}
      <div className="px-4 pt-3 pb-2 border-b border-line bg-panel flex-shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base font-semibold text-tx-1">{project.name}</span>

          {/* Активен */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${project.is_active ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-chip text-tx-3"}`}>
            {project.is_active ? "Активен" : "Архив"}
          </span>

          {/* В процессе — показывается пока настройка не завершена */}
          {!isSetupDone && (
            <button
              onClick={() => setActiveTab("overview")}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20 transition-colors"
            >
              <AlertCircle size={10} strokeWidth={2} />
              В процессе · {setupPct}%
            </button>
          )}
        </div>
        <p className="text-xs text-tx-3">
          {[project.niche, project.description].filter(Boolean).join(" · ") || "Нет описания — нажми Редактировать"}
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-line bg-panel flex-shrink-0">
        {[
          { label: "Каналов",      value: channelsCount },
          { label: "Опубликовано", value: stats?.published ?? 0 },
          { label: "Запланировано",value: stats?.scheduled ?? 0 },
          { label: "Всего",        value: stats?.total ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-panel-2 rounded-lg px-3 py-2">
            <p className="text-[10px] text-tx-3 mb-1">{s.label}</p>
            <p className="text-base font-semibold text-tx-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-line px-4 bg-panel flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer -mb-px ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-tx-3 hover:text-tx-2"
            }`}
          >
            {tab.label}
            {/* Хранилище: показываем счётчик файлов */}
            {tab.key === "storage" && (files as any[]).length > 0 && (
              <span className="ml-1 text-[9px] bg-chip text-tx-3 px-1.5 py-0.5 rounded-full">
                {(files as any[]).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-4">

        {/* ──── OVERVIEW ──── */}
        {activeTab === "overview" && (
          <div className="space-y-3 max-w-2xl">

            {/* Чеклист настройки — показываем пока не завершено */}
            {!isSetupDone && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0" strokeWidth={2} />
                  <p className="text-xs font-semibold text-tx-1">Завершите настройку проекта</p>
                  <span className="ml-auto text-[10px] text-tx-3">{doneCount}/{setupSteps.length}</span>
                </div>
                {/* Прогресс-бар */}
                <div className="h-1 bg-panel-2 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${setupPct}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {setupSteps.map((step) => (
                    <button
                      key={step.key}
                      onClick={step.action}
                      className="w-full flex items-center gap-2 text-left group"
                    >
                      {step.done
                        ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" strokeWidth={2} />
                        : <Circle       size={14} className="text-tx-3 flex-shrink-0 group-hover:text-amber-500 transition-colors" strokeWidth={2} />
                      }
                      <span className={`text-xs ${step.done ? "text-tx-3 line-through" : "text-tx-2 group-hover:text-tx-1 transition-colors"}`}>
                        {step.label}
                      </span>
                      {!step.done && (
                        <span className="ml-auto text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Заполнить →
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Основное */}
              <div className="border border-line rounded-xl p-3">
                <p className="text-[10px] text-tx-3 mb-2">Основное</p>
                {[
                  { label: "Ниша",    value: project.niche || "—" },
                  { label: "Создан",  value: new Date(project.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) },
                  { label: "Язык",    value: project.language?.toUpperCase() || "—" },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex justify-between text-xs py-1.5 ${i < arr.length - 1 ? "border-b border-line" : ""}`}>
                    <span className="text-tx-3">{row.label}</span>
                    <span className="text-tx-1 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Интеграции */}
              <div className="border border-line rounded-xl p-3">
                <p className="text-[10px] text-tx-3 mb-2">Интеграции</p>
                {(integrations as any[]).length === 0 ? (
                  <p className="text-xs text-tx-3 py-2">Нет подключений</p>
                ) : (
                  (integrations as any[]).map((intg: any, i: number, arr: any[]) => (
                    <div key={intg.id} className={`flex items-center gap-2 text-xs py-1.5 ${i < arr.length - 1 ? "border-b border-line" : ""}`}>
                      <i className={`${PLATFORM_ICONS[intg.platform] || "ti ti-plug"} text-tx-3`} style={{ fontSize: 13 }} />
                      <span className="flex-1 text-tx-1 capitalize">{intg.channel_name || intg.platform}</span>
                      <span className={`text-[10px] ${intg.is_active ? "text-green-500" : "text-tx-3"}`}>
                        {intg.is_active ? "подключен" : "отключен"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Активность */}
            <div className="border border-line rounded-xl p-3">
              <p className="text-[10px] text-tx-3 mb-2">Активность за 30 дней</p>
              <div className="flex items-end gap-0.5 h-10">
                {days30.map((d) => (
                  <div
                    key={d.key}
                    title={`${d.key}: ${d.count} постов`}
                    className="flex-1 rounded-sm cursor-default transition-all"
                    style={{
                      height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 15 : 4)}%`,
                      background: d.count > 0 ? "var(--accent)" : "var(--track)",
                      opacity:    d.count > 0 ? 0.5 + (d.count / maxCount) * 0.5 : 1,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-tx-3">30 дней назад</span>
                <span className="text-[9px] text-tx-3">Сегодня</span>
              </div>
            </div>

            {/* О проекте */}
            {(project.description || project.audience || project.tone) && (
              <div className="border border-line rounded-xl p-3">
                <p className="text-[10px] text-tx-3 mb-2">О проекте</p>
                <div className="space-y-1 text-xs">
                  {project.description && <p className="text-tx-2">{project.description}</p>}
                  {project.audience   && <p className="text-tx-3">Аудитория: {project.audience}</p>}
                  {project.tone       && <p className="text-tx-3">Тон: {project.tone}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── CONTENT ──── */}
        {activeTab === "content" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-tx-1">Весь контент</p>
              <Link href={`/${locale}/create?projectId=${projectId}`} className="text-xs text-accent hover:underline font-medium">
                + Новый пост
              </Link>
            </div>
            {(contents as any[]).length === 0 ? (
              <div className="text-center py-10 border border-line rounded-xl">
                <p className="text-tx-3 text-xs mb-3">Нет контента</p>
                <Link href={`/${locale}/create?projectId=${projectId}`} className="text-accent text-xs font-medium hover:underline">
                  Создать первый пост →
                </Link>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden">
                {(contents as any[]).map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/history?id=${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0 hover:bg-hover transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-chip flex items-center justify-center flex-shrink-0">
                      {c.type === "video"   ? <Film      size={13} className="text-tx-2" strokeWidth={1.8} />
                       : c.type === "stories" ? <ImageIcon size={13} className="text-tx-2" strokeWidth={1.8} />
                       :                        <FileText  size={13} className="text-tx-2" strokeWidth={1.8} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-tx-1 truncate">{c.title || "Без названия"}</p>
                      <p className="text-[10px] text-tx-3">
                        {c.platform} · {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] || "bg-chip text-tx-2"}`}>
                      {c.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── CAMPAIGNS ──── */}
        {activeTab === "campaigns" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-tx-1">Кампании</p>
              <Link href={`/${locale}/campaigns?projectId=${projectId}`} className="text-xs text-accent hover:underline font-medium">
                + Новая кампания
              </Link>
            </div>
            {(campaigns as any[]).length === 0 ? (
              <div className="text-center py-10 border border-line rounded-xl">
                <p className="text-tx-3 text-xs mb-3">Нет кампаний</p>
                <Link href={`/${locale}/campaigns?projectId=${projectId}`} className="text-accent text-xs font-medium hover:underline">
                  Создать кампанию →
                </Link>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden">
                {(campaigns as any[]).map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/campaigns/${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0 hover:bg-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-tx-1 truncate">{c.name || "Без названия"}</p>
                      <p className="text-[10px] text-tx-3">
                        {c.total_posts} постов · {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      c.status === "ready"      ? "bg-chip text-c-2"
                      : c.status === "running"  ? "bg-accent-dim text-accent"
                      : c.status === "completed"? "bg-chip text-tx-2"
                      :                           "bg-chip text-tx-3"
                    }`}>
                      {c.status === "generating" ? "⏳ генерация" : c.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── INTEGRATIONS ──── */}
        {activeTab === "integrations" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-tx-1">Подключённые каналы</p>
              <Link href={`/${locale}/integrations`} className="text-xs text-accent hover:underline font-medium">
                Управление →
              </Link>
            </div>
            {(integrations as any[]).length === 0 ? (
              <div className="text-center py-10 border border-line rounded-xl">
                <p className="text-tx-3 text-xs mb-3">Нет подключений</p>
                <Link href={`/${locale}/integrations`} className="text-accent text-xs font-medium hover:underline">
                  Подключить канал →
                </Link>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden">
                {(integrations as any[]).map((intg: any) => (
                  <div key={intg.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0">
                    <i className={`${PLATFORM_ICONS[intg.platform] || "ti ti-plug"} text-tx-2`} style={{ fontSize: 16 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-tx-1">{intg.channel_name || intg.channel_id || intg.platform}</p>
                      <p className="text-[10px] text-tx-3 capitalize">{intg.platform}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intg.is_active ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-chip text-tx-3"}`}>
                      {intg.is_active ? "подключен" : "отключен"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── TASKS ──── */}
        {activeTab === "tasks" && (() => {
          const todoTasks  = tasks.filter((t) => t.status === "todo");
          const inProgTasks= tasks.filter((t) => t.status === "in_progress" || t.status === "review");
          const doneTasks  = tasks.filter((t) => t.status === "done");
          const visible    = taskFilter === "todo" ? [...todoTasks, ...inProgTasks]
                           : taskFilter === "done" ? doneTasks
                           : tasks;

          return (
            <div className="max-w-2xl">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex gap-1.5">
                  {([
                    { key: "all",  label: `Все (${tasks.length})` },
                    { key: "todo", label: `В работе (${todoTasks.length + inProgTasks.length})` },
                    { key: "done", label: `Готово (${doneTasks.length})` },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setTaskFilter(f.key)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors cursor-pointer ${
                        taskFilter === f.key
                          ? "bg-tx-1 text-panel border-tx-1"
                          : "border-line text-tx-3 hover:text-tx-2"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setTaskError(""); setShowTaskModal(true); }}
                  className="flex items-center gap-1 text-xs h-7 px-2.5 bg-accent text-on-accent rounded-lg hover:opacity-90 cursor-pointer font-medium"
                >
                  + Задача
                </button>
              </div>

              {/* Stats mini */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Создано",   value: todoTasks.length,   color: "text-tx-1" },
                  { label: "В работе",  value: inProgTasks.length, color: "text-accent" },
                  { label: "Выполнено", value: doneTasks.length,   color: "text-green-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-panel-2 rounded-lg px-3 py-2 text-center">
                    <p className={`text-base font-semibold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-tx-3">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Task list */}
              {visible.length === 0 ? (
                <div className="text-center py-10 border border-line rounded-xl">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-tx-3 text-xs">
                    {taskFilter === "done" ? "Выполненных задач нет"
                     : taskFilter === "todo" ? "Все задачи выполнены! 🎉"
                     : "Задач нет — создай первую"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visible.map((task) => {
                    const isDone = task.status === "done";
                    const pm     = PRIORITY_META[task.priority];
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 border border-line rounded-xl px-3 py-2.5 bg-panel transition-opacity ${isDone ? "opacity-50" : ""}`}
                      >
                        {/* Чекбокс */}
                        <button
                          onClick={() => toggleTaskMutation.mutate({
                            id: task.id,
                            status: isDone ? "todo" : "done",
                          })}
                          className="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
                          style={{
                            border:     isDone ? "none"                       : "1.5px solid var(--line-strong)",
                            background: isDone ? "var(--accent)"              : "transparent",
                          }}
                        >
                          {isDone && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>

                        {/* Контент */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${isDone ? "line-through text-tx-3" : "text-tx-1"}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-tx-3 mt-0.5 leading-relaxed">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ color: pm.color, background: pm.bg }}
                            >
                              {pm.label}
                            </span>
                            <span className="text-[10px] text-tx-3">
                              {new Date(task.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>

                        {/* Удалить */}
                        <button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-tx-3 hover:text-neg hover:bg-neg/10 cursor-pointer transition-colors flex-shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M1.5 3h9M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1m1.5 0-.5 7a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5L3 3"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ──── HISTORY ──── */}
        {activeTab === "history" && (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-tx-1 mb-3">История публикаций</p>
            {(contents as any[]).filter((c: any) => c.status === "published").length === 0 ? (
              <div className="text-center py-10 border border-line rounded-xl">
                <p className="text-tx-3 text-xs">Нет опубликованных постов</p>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden">
                {(contents as any[]).filter((c: any) => c.status === "published").map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/history?id=${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0 hover:bg-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-tx-1 truncate">{c.title || "Без названия"}</p>
                      <p className="text-[10px] text-tx-3">
                        {c.platform} · {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-chip text-c-2">опубликовано</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── STORAGE ──── */}
        {activeTab === "storage" && (
          <div className="max-w-3xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              {/* Фильтр по типу */}
              <div className="flex gap-1.5">
                {(["all", "image", "video", "document", "other"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFileFilter(t)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                      fileFilter === t ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"
                    }`}
                  >
                    {t === "all" ? "Все" : FILE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Загрузить */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-60 transition-opacity"
              >
                <Upload size={13} strokeWidth={2} />
                {uploadMutation.isPending ? "Загрузка..." : "Загрузить файл"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach((f) => uploadMutation.mutate(f));
                  e.target.value = "";
                }}
              />
            </div>

            {/* Drag-and-drop zone (пустое состояние) */}
            {filteredFiles.length === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  Array.from(e.dataTransfer.files).forEach((f) => uploadMutation.mutate(f));
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl py-16 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging ? "border-accent bg-accent/5" : "border-line hover:border-line-strong"
                }`}
              >
                <FolderOpen size={36} className={isDragging ? "text-accent" : "text-tx-3"} strokeWidth={1.4} />
                <p className="text-sm text-tx-3 mt-3 font-medium">
                  {isDragging ? "Отпусти файлы" : "Перетащи или нажми для загрузки"}
                </p>
                <p className="text-xs text-tx-3 mt-1">Изображения, видео, PDF, документы</p>
              </div>
            )}

            {/* Drag overlay когда файлы уже есть */}
            {filteredFiles.length > 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  Array.from(e.dataTransfer.files).forEach((f) => uploadMutation.mutate(f));
                }}
                className="relative"
              >
                {isDragging && (
                  <div className="absolute inset-0 z-10 border-2 border-accent border-dashed rounded-xl bg-accent/5 flex items-center justify-center pointer-events-none">
                    <p className="text-sm font-medium text-accent">Отпусти для загрузки</p>
                  </div>
                )}

                {/* File grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredFiles.map((f: any) => (
                    <div
                      key={f.id}
                      className="group border border-line rounded-xl overflow-hidden hover:border-line-strong transition-colors bg-panel"
                    >
                      {/* Превью */}
                      {f.file_type === "image" && f.file_url ? (
                        <div className="relative">
                          <img src={f.file_url} alt={f.name} className="w-full h-28 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </div>
                      ) : f.file_type === "video" ? (
                        <div className="w-full h-28 bg-panel-2 flex items-center justify-center">
                          <Film size={28} className="text-tx-3" strokeWidth={1.4} />
                        </div>
                      ) : (
                        <div className="w-full h-28 bg-panel-2 flex items-center justify-center">
                          <FileText size={28} className="text-tx-3" strokeWidth={1.4} />
                        </div>
                      )}

                      {/* Мета */}
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-tx-1 truncate" title={f.name}>{f.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-tx-3">{formatBytes(f.size_bytes)}</span>
                          <span className="text-[9px] text-tx-3 capitalize">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
                        </div>
                        {/* Действия */}
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={f.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center text-[10px] py-1 bg-accent/10 text-accent rounded-md font-medium hover:bg-accent/20 transition-colors"
                          >
                            Открыть
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`Удалить «${f.name}»?`)) {
                                deleteFileMutation.mutate({ id: f.id, file_url: f.file_url });
                              }
                            }}
                            disabled={deleteFileMutation.isPending}
                            className="w-7 flex items-center justify-center bg-chip hover:bg-neg/10 text-tx-3 hover:text-neg rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={11} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add more tile */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-line hover:border-accent rounded-xl h-full min-h-[160px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group"
                  >
                    <Upload size={20} className="text-tx-3 group-hover:text-accent transition-colors" strokeWidth={1.5} />
                    <span className="text-[11px] text-tx-3 group-hover:text-accent transition-colors">Добавить</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ошибка загрузки */}
            {uploadMutation.isError && (
              <p className="text-xs text-neg mt-3">Ошибка загрузки: {(uploadMutation.error as any)?.message}</p>
            )}
          </div>
        )}

      </div>

      {/* ── Task modal ── */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTaskModal(false); }}
        >
          <div className="bg-panel border border-line rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-sm font-semibold text-tx-1">Новая задача</p>
              <button onClick={() => setShowTaskModal(false)} className="text-tx-3 hover:text-tx-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-medium text-tx-3 block mb-1">Название задачи</label>
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => { setNewTaskTitle(e.target.value); setTaskError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateTask(); }}
                  placeholder="Например: Написать пост для Instagram"
                  className="w-full px-3 py-2 border border-line-strong rounded-lg text-xs outline-none focus:border-accent"
                />
                {taskError && <p className="text-[10px] text-neg mt-1">{taskError}</p>}
              </div>
              <div>
                <label className="text-[10px] font-medium text-tx-3 block mb-1">Описание <span className="opacity-50">(необязательно)</span></label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Детали, что именно нужно сделать..."
                  rows={3}
                  className="w-full px-3 py-2 border border-line-strong rounded-lg text-xs outline-none focus:border-accent resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-tx-3 block mb-2">Приоритет</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => {
                    const pm     = PRIORITY_META[p];
                    const active = newTaskPriority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setNewTaskPriority(p)}
                        className="py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all text-center border"
                        style={{
                          border:     active ? `1.5px solid ${pm.color}` : "0.5px solid var(--line)",
                          background: active ? pm.bg                      : "transparent",
                          color:      active ? pm.color                   : "var(--tx-3)",
                        }}
                      >
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-line">
              <button onClick={() => setShowTaskModal(false)} className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-hover cursor-pointer text-tx-2">
                Отмена
              </button>
              <button
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
                className="px-3 py-1.5 text-xs bg-accent text-on-accent rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer font-medium"
              >
                {createTaskMutation.isPending ? "Создаём..." : "Создать задачу"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-panel border border-line rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-sm font-semibold text-tx-1">Редактировать проект</p>
              <button onClick={() => setIsEditOpen(false)} className="text-tx-3 hover:text-tx-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {[
                { label: "Название",   value: editName,        set: setEditName,        placeholder: "" },
                { label: "Ниша",       value: editNiche,       set: setEditNiche,       placeholder: "например: Кофейня" },
                { label: "Аудитория",  value: editAudience,    set: setEditAudience,    placeholder: "возраст, интересы, география..." },
                { label: "Стоп-слова", value: editStopWords,   set: setEditStopWords,   placeholder: "скидка, акция — через запятую" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="text-[10px] font-medium text-tx-3 block mb-1">{label}</label>
                  <input
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-line-strong rounded-lg text-xs outline-none focus:border-accent"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-medium text-tx-3 block mb-1">Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="чем занимается компания, что продаёт..."
                  className="w-full px-3 py-2 border border-line-strong rounded-lg text-xs outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-line">
              <button onClick={() => setIsEditOpen(false)} className="px-3 py-1.5 text-xs border border-line rounded-lg hover:bg-hover cursor-pointer text-tx-2">
                Отмена
              </button>
              <button
                onClick={() => updateProjectMutation.mutate({
                  name:        editName,
                  niche:       editNiche,
                  description: editDescription,
                  audience:    editAudience,
                  stop_words:  editStopWords,
                })}
                disabled={updateProjectMutation.isPending || !editName}
                className="px-3 py-1.5 text-xs bg-accent text-on-accent rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer font-medium"
              >
                {updateProjectMutation.isPending ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
