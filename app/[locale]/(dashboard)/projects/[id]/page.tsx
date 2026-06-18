"use client";

/**
 * Детальная страница проекта — app/projects/[id]/page.tsx
 * Заменяет предыдущую версию (вкладки Обзор/Контент/Хранилище/Брендбук/Настройки)
 * на новый дизайн: Контент / Кампании / Аналитика / Файлы + правая панель.
 *
 * Подключено к реальным таблицам: projects, contents, project_files, integrations.
 *
 * ⚠️ Сделано по аналогии, проверь под свою схему:
 *  - campaigns (project_id, name, status, created_at) → вкладка "Кампании"
 *  - projects.brand_voice (text[]) → тэги в блоке "Голос бренда"
 *  - "Участники" сейчас показывает только текущего пользователя как
 *    владельца — подключи свою таблицу project_members, когда она будет готова.
 * Если что-то называется иначе в твоей схеме — поправь .from(...)/.eq(...),
 * запросы к ещё не существующим таблицам просто вернут пустой список.
 */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  FileText,
  Image as ImageIcon,
  Film,
  ClipboardList,
  FolderOpen,
  Megaphone,
  SquarePen,
  Pencil,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

type Tab = "content" | "campaigns" | "analytics" | "files";
type Filter = "all" | "generated" | "scheduled" | "published";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-chip text-c-2",
  scheduled: "bg-accent-dim text-accent",
  generated: "bg-chip text-c-3",
  draft: "bg-chip text-tx-2",
  failed: "bg-chip text-neg",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Опубликовано",
  scheduled: "Запланировано",
  generated: "Готово",
  draft: "Черновик",
  failed: "Ошибка",
};

const FILE_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  brandbook: ClipboardList,
};

const PLATFORM_META: Record<string, { label: string; badge: string; color: string }> = {
  instagram: { label: "Instagram", badge: "IG", color: "#e1306c" },
  telegram: { label: "Telegram", badge: "TG", color: "#2aabee" },
  vk: { label: "VK", badge: "VK", color: "#0077ff" },
  facebook: { label: "Facebook", badge: "FB", color: "#1877f2" },
};
function platformMeta(key?: string | null) {
  const k = (key || "").toLowerCase();
  return (
    PLATFORM_META[k] || {
      label: key || "Платформа",
      badge: (key || "?").slice(0, 2).toUpperCase(),
      color: "#71717a",
    }
  );
}

// Та же палитра и логика подбора цвета, что на странице списка проектов —
// цвет аватара проекта одинаковый и в карточке, и здесь.
const PROJECT_COLORS = ["#6366f1", "#e11d48", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];
function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"];
const VIDEO_EXTS = ["mp4", "mov", "avi", "webm", "mkv", "m4v"];

function fileKind(name?: string | null): "image" | "video" | "document" {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  return "document";
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const projectId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadType, setUploadType] = useState("image");
  const [voiceEditing, setVoiceEditing] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");

  // optimistic file previews
  const [pendingFiles, setPendingFiles] = useState<{ id: string; name: string; url: string; type: string; size: number }[]>([]);

  // edit project info
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNiche, setEditNiche] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const logoEditRef = useRef<HTMLInputElement>(null);

  // ---- Данные -------------------------------------------------------

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: total }, { count: published }, { count: scheduled }, { count: thisWeek }] = await Promise.all([
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
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
      return { total: total ?? 0, published: published ?? 0, scheduled: scheduled ?? 0, thisWeek: thisWeek ?? 0 };
    },
    enabled: !!projectId,
  });

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

  const { data: campaigns = [] } = useQuery({
    queryKey: ["project-campaigns", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!projectId,
  });

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
    enabled: !!projectId,
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["project-integrations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("integrations").select("*").eq("project_id", projectId);
      if (error) return [];
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: activityData = [] } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("contents")
        .select("created_at")
        .eq("project_id", projectId)
        .gte("created_at", thirtyDaysAgo);
      return data || [];
    },
    enabled: activeTab === "analytics" && !!projectId,
  });

  // ---- Мутации -------------------------------------------------------

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `project-files/${user.id}/${projectId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("content-images").upload(path, file);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("content-images").getPublicUrl(path);
      const { error: dbError } = await supabase.from("project_files").insert({
        project_id: projectId,
        user_id: user.id,
        name: file.name,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
      });
      if (dbError) throw dbError;
    },
    onSuccess: (_data, file) => {
      setPendingFiles((prev) => prev.filter((p) => p.name + p.size !== file.name + file.size));
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    },
    onError: (err: any, file) => {
      setPendingFiles((prev) => prev.filter((p) => p.name + p.size !== file.name + file.size));
      alert("Ошибка загрузки «" + file.name + "»: " + err.message);
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("project_files").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-files", projectId] }),
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  // ---- Производные значения -------------------------------------------

  const days30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split("T")[0];
      const count = (activityData as any[]).filter((a) => a.created_at.startsWith(key)).length;
      return { key, count };
    });
  }, [activityData]);
  const maxCount = Math.max(...days30.map((d) => d.count), 1);

  const filteredContents = useMemo(() => {
    if (filter === "all") return contents as any[];
    return (contents as any[]).filter((c) => c.status === filter);
  }, [contents, filter]);

  // ---- Состояния загрузки / отсутствия проекта -------------------------

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-chip rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-chip rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-tx-2">Проект не найден</p>
        <Link href={`/${locale}/projects`} className="text-accent text-sm mt-2 inline-block">
          ← Назад
        </Link>
      </div>
    );
  }

  const color = hashColor(project.id);
  const brandVoice: string[] = (project.brand_voice as string[]) || [];
  const isActive = project.is_active !== false;
  const ownerName =
    currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email || "Владелец";

  function startEditVoice() {
    setVoiceDraft(brandVoice.join(", "));
    setVoiceEditing(true);
  }
  function saveVoice() {
    const tags = voiceDraft
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateProjectMutation.mutate({ brand_voice: tags });
    setVoiceEditing(false);
  }

  function startEditProject() {
    setEditName(project.name || "");
    setEditNiche((project as any).niche || "");
    setEditDescription(project.description || "");
    setEditLogoUrl(project.logo_url || "");
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setEditingProject(true);
  }

  function handleEditLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEditLogoFile(f);
    const r = new FileReader();
    r.onload = (ev) => setEditLogoPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  }

  async function saveEditProject() {
    setEditSaving(true);
    try {
      let logo_url = editLogoUrl;
      if (editLogoFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const ext = editLogoFile.name.split(".").pop();
        const path = `logos/${user.id}/${Date.now()}.${ext}`;
        const { error: ue } = await supabase.storage
          .from("content-images")
          .upload(path, editLogoFile, { contentType: editLogoFile.type });
        if (ue) throw ue;
        const { data: urlD } = supabase.storage.from("content-images").getPublicUrl(path);
        logo_url = urlD.publicUrl;
      }
      await updateProjectMutation.mutateAsync({
        name: editName.trim(),
        niche: editNiche.trim() || null,
        description: editDescription.trim() || null,
        logo_url: logo_url || null,
      });
      setEditingProject(false);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleArchive() {
    setMenuOpen(false);
    if (!confirm("Архивировать проект? Весь контент сохранится.")) return;
    await supabase.from("projects").update({ is_active: false }).eq("id", projectId);
    router.push(`/${locale}/projects`);
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "content", label: "Контент", count: stats?.total ?? 0 },
    { key: "campaigns", label: "Кампании", count: campaigns.length },
    { key: "analytics", label: "Аналитика" },
    { key: "files", label: "Файлы", count: files.length },
  ];

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "generated", label: "Готово" },
    { key: "scheduled", label: "Запланировано" },
    { key: "published", label: "Опубликовано" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center gap-3 flex-shrink-0 bg-panel sticky top-0 z-10 flex-wrap">
        <Link href={`/${locale}/projects`} className="text-tx-3 hover:text-tx-2 transition-colors">
          ‹
        </Link>
        <Link href={`/${locale}/projects`} className="text-sm text-tx-3 hover:text-tx-2 transition-colors">
          Проекты
        </Link>
        <span className="text-tx-3 text-sm">/</span>
        {project.logo_url ? (
          <img src={project.logo_url} alt={project.name} className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: color }}
          >
            {project.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <h1 className="text-base font-bold text-tx-1">{project.name}</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isActive ? "bg-emerald-50 text-emerald-700" : "bg-chip text-tx-3"
          }`}
        >
          {isActive ? "Активен" : "Архивирован"}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/create?projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <SquarePen size={15} strokeWidth={1.8} />
            Создать контент
          </Link>
          <Link
            href={`/${locale}/campaigns/new?projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-line text-tx-2 text-sm font-medium rounded-lg hover:bg-panel-2 transition-colors whitespace-nowrap"
          >
            <Megaphone size={15} strokeWidth={1.8} />
            Новая кампания
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center border border-line rounded-lg text-tx-2 hover:bg-panel-2 transition-colors cursor-pointer"
            >
              <MoreHorizontal size={16} strokeWidth={1.8} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-panel border border-line rounded-lg shadow-lg z-20 py-1">
                  <Link
                    href={`/${locale}/projects/${projectId}/settings`}
                    className="block px-3 py-2 text-sm text-tx-1 hover:bg-panel-2 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Настройки проекта
                  </Link>
                  <button
                    onClick={handleArchive}
                    className="block w-full text-left px-3 py-2 text-sm text-neg hover:bg-panel-2 transition-colors cursor-pointer"
                  >
                    Архивировать проект
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line px-6 bg-panel flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px whitespace-nowrap ${
              activeTab === tab.key ? "border-tx-1 text-tx-1" : "border-transparent text-tx-3 hover:text-tx-2"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={`text-[11px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-medium ${
                  activeTab === tab.key ? "bg-tx-1 text-panel" : "bg-chip text-tx-3"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {activeTab === "content" && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                          filter === f.key ? "bg-tx-1 text-panel" : "border border-line text-tx-2 hover:bg-panel-2"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <Link
                    href={`/${locale}/create?projectId=${projectId}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    + Создать пост
                  </Link>
                </div>

                {filteredContents.length === 0 ? (
                  <div className="text-center py-20 bg-panel rounded-xl border border-line">
                    <FileText size={32} className="text-tx-3 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-tx-3 text-sm mb-4">Нет материалов</p>
                    <Link
                      href={`/${locale}/create?projectId=${projectId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      + Создать первый пост
                    </Link>
                  </div>
                ) : (
                  <div className="bg-panel rounded-xl border border-line overflow-hidden">
                    {filteredContents.map((c) => (
                      <Link
                        key={c.id}
                        href={`/${locale}/history?id=${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-panel-2 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-chip flex items-center justify-center flex-shrink-0">
                          {c.type === "video" ? (
                            <Film size={16} className="text-tx-2" strokeWidth={1.8} />
                          ) : c.type === "stories" ? (
                            <ImageIcon size={16} className="text-tx-2" strokeWidth={1.8} />
                          ) : (
                            <FileText size={16} className="text-tx-2" strokeWidth={1.8} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-tx-1 truncate">{c.title || "Без названия"}</p>
                          <p className="text-xs text-tx-3">
                            {c.platform} ·{" "}
                            {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            STATUS_STYLES[c.status] || "bg-chip text-tx-2"
                          }`}
                        >
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "campaigns" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-tx-1">Кампании проекта</p>
                  <Link
                    href={`/${locale}/campaigns/new?projectId=${projectId}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    + Новая кампания
                  </Link>
                </div>
                {campaigns.length === 0 ? (
                  <div className="text-center py-20 bg-panel rounded-xl border border-line">
                    <Megaphone size={32} className="text-tx-3 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-tx-3 text-sm mb-4">Нет кампаний</p>
                    <Link
                      href={`/${locale}/campaigns/new?projectId=${projectId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      + Создать кампанию
                    </Link>
                  </div>
                ) : (
                  <div className="bg-panel rounded-xl border border-line overflow-hidden">
                    {(campaigns as any[]).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-chip flex items-center justify-center flex-shrink-0">
                          <Megaphone size={16} className="text-tx-2" strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-tx-1 truncate">{c.name || "Без названия"}</p>
                          <p className="text-xs text-tx-3">
                            {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-chip text-tx-2">
                          {c.status || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Всего постов", value: stats?.total || 0, color: "text-tx-1" },
                    { label: "Опубликовано", value: stats?.published || 0, color: "text-c-2" },
                    { label: "Запланировано", value: stats?.scheduled || 0, color: "text-c-3" },
                    { label: "За эту неделю", value: stats?.thisWeek || 0, color: "text-tx-1" },
                  ].map((s) => (
                    <div key={s.label} className="bg-panel border border-line rounded-xl p-4">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-tx-3 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-panel border border-line rounded-xl p-4">
                  <p className="text-xs font-semibold text-tx-1 mb-3">Активность за 30 дней</p>
                  <div className="flex items-end gap-1 h-12">
                    {days30.map((d) => (
                      <div
                        key={d.key}
                        title={`${d.key}: ${d.count} постов`}
                        className="flex-1 rounded-sm transition-all cursor-default"
                        style={{
                          height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 15 : 4)}%`,
                          background: d.count > 0 ? color : "var(--track)",
                          opacity: d.count > 0 ? 0.5 + (d.count / maxCount) * 0.5 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-tx-3">30 дней назад</span>
                    <span className="text-[9px] text-tx-3">Сегодня</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <p className="text-sm font-semibold text-tx-1">Файлы проекта</p>
                  <div className="flex gap-2">
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-line rounded-lg bg-panel outline-none cursor-pointer"
                    >
                      <option value="image">Изображение</option>
                      <option value="video">Видео</option>
                      <option value="document">Документ</option>
                      <option value="brandbook">Брендбук</option>
                    </select>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-tx-1 text-panel text-xs font-medium rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-60"
                    >
                      {uploadMutation.isPending ? "Загрузка..." : "+ Загрузить"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const ftype = uploadType;
                        if (ftype === "image" || ftype === "video") {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setPendingFiles((prev) => [
                              { id: "pending-" + Date.now(), name: f.name, url: ev.target?.result as string, type: ftype, size: f.size },
                              ...prev,
                            ]);
                          };
                          reader.readAsDataURL(f);
                        } else {
                          setPendingFiles((prev) => [
                            { id: "pending-" + Date.now(), name: f.name, url: "", type: ftype, size: f.size },
                            ...prev,
                          ]);
                        }
                        uploadMutation.mutate(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {files.length === 0 && pendingFiles.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-line-strong rounded-xl py-16 text-center cursor-pointer hover:border-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-3 mx-auto">
                      <FolderOpen size={22} className="text-accent" strokeWidth={1.6} />
                    </div>
                    <p className="text-sm text-tx-3">Нажми чтобы загрузить файл</p>
                    <p className="text-xs text-tx-3 mt-1">Изображения, видео, документы, брендбук</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Optimistic preview — shown immediately after selecting */}
                    {pendingFiles.map((pf) => (
                      <div
                        key={pf.id}
                        className="bg-panel border border-accent/40 rounded-xl p-3 opacity-70 animate-pulse"
                      >
                        {pf.type === "image" && pf.url ? (
                          <img src={pf.url} alt={pf.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                        ) : pf.type === "video" && pf.url ? (
                          <video src={pf.url} className="w-full h-24 object-cover rounded-lg mb-2" muted />
                        ) : (
                          <div className="w-full h-24 bg-panel-2 rounded-lg mb-2 flex items-center justify-center">
                            {(() => { const I = FILE_ICONS[pf.type] || FileText; return <I size={28} className="text-tx-3" strokeWidth={1.5} />; })()}
                          </div>
                        )}
                        <p className="text-xs font-medium text-tx-1 truncate">{pf.name}</p>
                        <p className="text-[9px] text-accent mt-0.5">Загрузка...</p>
                      </div>
                    ))}

                    {/* Real uploaded files */}
                    {(files as any[]).map((f) => (
                      <div
                        key={f.id}
                        className="bg-panel border border-line rounded-xl p-3 hover:border-line-strong transition-colors group"
                      >
                        {fileKind(f.name) === "image" && f.url ? (
                          <img
                            src={f.url}
                            alt={f.name}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : fileKind(f.name) === "video" && f.url ? (
                          <video
                            src={f.url}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                            muted
                            onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                            onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
                          />
                        ) : (
                          <div className="w-full h-24 bg-panel-2 rounded-lg mb-2 flex items-center justify-center">
                            {(() => { const I = FILE_ICONS[fileKind(f.name)] || FileText; return <I size={28} className="text-tx-3" strokeWidth={1.5} />; })()}
                          </div>
                        )}
                        <p className="text-xs font-medium text-tx-1 truncate">{f.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-tx-3">
                            {f.size ? `${(f.size / 1024).toFixed(0)} KB` : "—"}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={f.url}
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
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            <div className="bg-panel border border-line rounded-xl p-4 relative">
              {!editingProject ? (
                <>
                  <button
                    onClick={startEditProject}
                    className="absolute top-4 right-4 text-tx-3 hover:text-tx-1 transition-colors cursor-pointer"
                    title="Редактировать проект"
                  >
                    <Pencil size={15} strokeWidth={1.8} />
                  </button>
                  <div className="flex items-start gap-3">
                    {project.logo_url ? (
                      <img
                        src={project.logo_url}
                        alt={project.name}
                        className="w-12 h-12 rounded-2xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                        style={{ background: color }}
                      >
                        {project.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 pt-0.5">
                      <h2 className="text-[15px] font-semibold text-tx-1">{project.name}</h2>
                      <p className="text-xs text-tx-3 mt-0.5">{(project as any).niche || "Без ниши"}</p>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-[13px] text-tx-2 leading-relaxed mt-3">{project.description}</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-tx-1 mb-1">Редактировать проект</p>

                  {/* Logo upload */}
                  <input ref={logoEditRef} type="file" accept="image/*" className="hidden" onChange={handleEditLogoFile} />
                  {editLogoPreview || editLogoUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={editLogoPreview || editLogoUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs text-tx-1 mb-1">Логотип</p>
                        <button
                          onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); setEditLogoUrl(""); }}
                          className="text-[11px] text-neg cursor-pointer"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoEditRef.current?.click()}
                      className="w-full py-3 border border-dashed border-line hover:border-accent rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="text-lg">📷</span>
                      <span className="text-[11px] text-tx-3">Загрузить логотип</span>
                    </button>
                  )}

                  <div>
                    <label className="text-xs font-medium text-tx-2 block mb-1">Название *</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-line rounded-lg outline-none focus:border-accent bg-panel text-tx-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-tx-2 block mb-1">Ниша</label>
                    <input
                      value={editNiche}
                      onChange={(e) => setEditNiche(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-line rounded-lg outline-none focus:border-accent bg-panel text-tx-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-tx-2 block mb-1">Описание</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-line rounded-lg outline-none focus:border-accent bg-panel text-tx-1 resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEditProject}
                      disabled={!editName.trim() || editSaving}
                      className="flex-1 py-2 bg-tx-1 text-panel text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {editSaving ? "Сохранение..." : "Сохранить"}
                    </button>
                    <button
                      onClick={() => setEditingProject(false)}
                      className="px-4 py-2 border border-line text-tx-2 text-xs rounded-lg hover:bg-panel-2 cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-panel border border-line rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-tx-1">Голос бренда</p>
                {!voiceEditing && (
                  <button
                    onClick={startEditVoice}
                    className="text-xs text-tx-3 hover:text-tx-1 transition-colors cursor-pointer"
                  >
                    Изменить
                  </button>
                )}
              </div>
              {voiceEditing ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={voiceDraft}
                    onChange={(e) => setVoiceDraft(e.target.value)}
                    placeholder="Дружелюбный, Продающий..."
                    className="w-full px-3 py-2 text-xs border border-line rounded-lg outline-none focus:border-accent"
                    onKeyDown={(e) => e.key === "Enter" && saveVoice()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveVoice}
                      className="px-3 py-1.5 bg-tx-1 text-panel text-xs font-medium rounded-lg hover:opacity-90 cursor-pointer"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => setVoiceEditing(false)}
                      className="px-3 py-1.5 border border-line text-tx-2 text-xs rounded-lg hover:bg-panel-2 cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : brandVoice.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {brandVoice.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-panel-2 text-tx-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-tx-3">Тон голоса бренда ещё не задан</p>
              )}
            </div>

            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-sm font-semibold text-tx-1 mb-3">Платформы</p>
              {integrations.length > 0 ? (
                <div className="space-y-1">
                  {(integrations as any[]).map((row) => {
                    const meta = platformMeta(row.platform);
                    const connected = row.is_active === true || row.status === "active" || row.status === "connected";
                    return (
                      <div key={row.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ background: meta.color }}
                          >
                            {meta.badge}
                          </div>
                          <span className="text-sm text-tx-1">{meta.label}</span>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            connected ? "bg-emerald-50 text-emerald-700" : "bg-chip text-tx-3"
                          }`}
                        >
                          {connected ? "Активен" : "Отключен"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-tx-3 mb-2">Платформы пока не подключены</p>
              )}
              <Link
                href={`/${locale}/integrations?projectId=${projectId}`}
                className="text-xs text-tx-3 hover:text-tx-1 transition-colors inline-block mt-2"
              >
                + Добавить платформу
              </Link>
            </div>

            <div className="bg-panel border border-line rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-tx-1">Участники</p>
                <button className="text-xs text-tx-3 hover:text-tx-1 transition-colors cursor-pointer">
                  + Добавить
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-tx-1 text-panel flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                    {getInitials(ownerName)}
                  </div>
                  <span className="text-sm text-tx-1">{ownerName}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-panel-2 text-tx-2 rounded-full">Владелец</span>
              </div>
            </div>

            <Link
              href={`/${locale}/create?projectId=${projectId}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <SquarePen size={15} strokeWidth={1.8} />
              Создать контент
            </Link>
            <Link
              href={`/${locale}/campaigns/new?projectId=${projectId}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-line text-tx-2 text-sm font-medium rounded-lg hover:bg-panel-2 transition-colors"
            >
              <Megaphone size={15} strokeWidth={1.8} />
              Новая кампания
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}