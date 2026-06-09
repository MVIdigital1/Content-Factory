"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAdCreatives, useCreateAdCreative } from "@/lib/hooks/useAdsData";
import type { AdCreative } from "@/lib/supabase/types";

const PLATFORM_META: Record<
  string,
  { color: string; textColor?: string; abbr: string; name: string }
> = {
  telegram: { color: "#0088CC", abbr: "TG", name: "Telegram" },
  instagram: { color: "#E1306C", abbr: "IG", name: "Instagram" },
  tiktok: { color: "#000000", abbr: "TT", name: "TikTok" },
  vk: { color: "#0077FF", abbr: "VK", name: "VK" },
  yandex: { color: "#FFDB4D", textColor: "#664400", abbr: "Я", name: "Яндекс" },
  google: { color: "#34A853", abbr: "G", name: "Google" },
  meta: { color: "#1877F2", abbr: "M", name: "Meta" },
  mytarget: { color: "#FF6600", abbr: "MT", name: "myTarget" },
};

// Fix 8: Subtypes per platform
const PLATFORM_SUBTYPES: Record<string, { value: string; label: string }[]> = {
  telegram: [
    { value: "post", label: "Пост" },
    { value: "video", label: "Видео" },
    { value: "ad", label: "Реклама" },
  ],
  instagram: [
    { value: "post", label: "Пост" },
    { value: "reels", label: "Reels" },
    { value: "stories", label: "Stories" },
    { value: "ad", label: "Реклама" },
  ],
  tiktok: [
    { value: "video", label: "Видео" },
    { value: "ad", label: "Реклама" },
  ],
  vk: [
    { value: "post", label: "Пост" },
    { value: "video", label: "Видео" },
    { value: "ad", label: "Реклама" },
  ],
  yandex: [
    { value: "search", label: "Поиск" },
    { value: "rsya", label: "РСЯ" },
  ],
  google: [
    { value: "search", label: "Поиск" },
    { value: "display", label: "КМС" },
    { value: "video", label: "YouTube" },
  ],
  meta: [
    { value: "feed", label: "Лента" },
    { value: "stories", label: "Stories" },
    { value: "reels", label: "Reels" },
    { value: "ad", label: "Реклама" },
  ],
  mytarget: [
    { value: "feed", label: "Лента" },
    { value: "video", label: "Видео" },
    { value: "banner", label: "Баннер" },
  ],
};

const STATUS_LABEL: Record<string, string> = {
  active: "Активен",
  draft: "Черновик",
  paused: "Пауза",
  winner: "Победитель",
  failed: "Ошибка",
};

export function CreativesView({ projectId }: { projectId?: string }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const {
    data: creatives = [],
    isLoading,
    refetch,
  } = useAdCreatives(projectId);
  const createCreative = useCreateAdCreative();

  // Fix 6: Platform + subtype filter
  const [platformFilter, setPlatformFilter] = useState("all");
  const [subtypeFilter, setSubtypeFilter] = useState("all");

  // Fix 11: Creative action modal
  const [actionModal, setActionModal] = useState<AdCreative | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");

  // Upload
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadPlatform, setUploadPlatform] = useState("instagram");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  const allPlatforms = [...new Set(creatives.map((c) => c.platform))].filter(
    Boolean,
  );

  // Fix 6: Filter logic
  const filtered = creatives.filter((c) => {
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    if (subtypeFilter !== "all" && c.format !== subtypeFilter) return false;
    return true;
  });

  const handlePlatformFilter = (p: string) => {
    setPlatformFilter(p);
    setSubtypeFilter("all");
  };

  // Fix 11: Schedule
  const handleSchedule = async () => {
    if (!actionModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await supabase.from("scheduled_posts").insert({
        content_id: actionModal.id,
        platform: actionModal.platform,
        scheduled_at: new Date(scheduleTime).toISOString(),
        status: "pending",
        retry_count: 0,
      });
      await supabase
        .from("ad_creatives")
        .update({ status: "active" })
        .eq("id", actionModal.id);
      refetch();
      setActionModal(null);
      setScheduleTime("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const handlePublishNow = async () => {
    if (!actionModal) return;
    try {
      await fetch("/api/content/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: actionModal.id,
          platform: actionModal.platform,
        }),
      });
      refetch();
      setActionModal(null);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
  };

  const handleDelete = async () => {
    if (!actionModal || !confirm("Удалить креатив?")) return;
    await supabase
      .from("ad_creatives")
      .update({ status: "failed" })
      .eq("id", actionModal.id);
    refetch();
    setActionModal(null);
  };

  const handleToDraft = async () => {
    if (!actionModal) return;
    await supabase
      .from("ad_creatives")
      .update({ status: "draft" })
      .eq("id", actionModal.id);
    refetch();
    setActionModal(null);
  };

  const handleSaveEdit = async () => {
    if (!actionModal) return;
    await supabase
      .from("ad_creatives")
      .update({ title: editTitle, caption: editCaption })
      .eq("id", actionModal.id);
    refetch();
    setEditing(false);
    setActionModal({ ...actionModal, title: editTitle, caption: editCaption });
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const ext = uploadFile.name.split(".").pop();
      const path = `creatives/${user.id}/${Date.now()}.${ext}`;
      let imageUrl: string | undefined;
      const { data: ud, error: ue } = await supabase.storage
        .from("content-images")
        .upload(path, uploadFile, { contentType: uploadFile.type });
      if (!ue && ud) {
        const { data: urlD } = supabase.storage
          .from("content-images")
          .getPublicUrl(path);
        imageUrl = urlD.publicUrl;
      }
      await createCreative.mutateAsync({
        platform: uploadPlatform,
        format: "image",
        title: uploadTitle || uploadFile.name.split(".")[0],
        image_url: imageUrl,
        status: "draft",
        ai_generated: false,
        project_id: projectId,
        ctr: 0,
        impressions: 0,
        clicks: 0,
        is_winner: false,
      });
      setUploadModal(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadTitle("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[13px] font-semibold text-tx-1">
            Креативы проекта
          </p>
          <p className="text-[11px] text-tx-3 mt-0.5">
            {filtered.length} из {creatives.length} креативов
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={uploadFileRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploadFile(f);
              const r = new FileReader();
              r.onload = (ev) => setUploadPreview(ev.target?.result as string);
              r.readAsDataURL(f);
            }}
            style={{ display: "none" }}
          />
          <button
            onClick={() => setUploadModal(true)}
            className="inline-flex items-center gap-1.5 border border-line rounded-[7px] px-3 py-1.5 text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
          >
            ↑ Загрузить
          </button>
          <button className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer">
            ✦ AI сгенерировать
          </button>
        </div>
      </div>

      {/* Fix 6: Platform filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => handlePlatformFilter("all")}
          className={`px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${platformFilter === "all" ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
        >
          Все · {creatives.length}
        </button>
        {allPlatforms.map((p) => {
          const pm = PLATFORM_META[p];
          const count = creatives.filter((c) => c.platform === p).length;
          return pm ? (
            <button
              key={p}
              onClick={() => handlePlatformFilter(p)}
              style={
                platformFilter === p
                  ? {
                      background: pm.color,
                      color: pm.textColor ?? "#fff",
                      borderColor: pm.color,
                    }
                  : {}
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${platformFilter !== p ? "border-line text-tx-3 hover:bg-hover" : ""}`}
            >
              <div
                style={{
                  width: 14,
                  height: 10,
                  borderRadius: 2,
                  background:
                    platformFilter === p ? "rgba(255,255,255,0.3)" : pm.color,
                  color: "#fff",
                  fontSize: 7,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {pm.abbr}
              </div>
              {pm.name} · {count}
            </button>
          ) : null;
        })}
      </div>

      {/* Fix 8: Subtype filter */}
      {platformFilter !== "all" && PLATFORM_SUBTYPES[platformFilter] && (
        <div className="flex gap-2 mb-4 flex-wrap pl-2">
          <button
            onClick={() => setSubtypeFilter("all")}
            className={`px-2.5 py-1 rounded-full text-[10px] border cursor-pointer ${subtypeFilter === "all" ? "bg-chip text-tx-1 border-line-strong" : "border-line text-tx-3 hover:bg-hover"}`}
          >
            Все форматы
          </button>
          {PLATFORM_SUBTYPES[platformFilter].map((st) => (
            <button
              key={st.value}
              onClick={() => setSubtypeFilter(st.value)}
              className={`px-2.5 py-1 rounded-full text-[10px] border cursor-pointer transition-colors ${subtypeFilter === st.value ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-10 text-tx-3 text-[12px]">
          Загрузка...
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-4 gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setActionModal(c);
                setEditing(false);
                setEditTitle(c.title ?? "");
                setEditCaption(c.caption ?? "");
              }}
              className="ui-surface p-3 cursor-pointer hover:border-line-strong transition-colors group"
            >
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.title ?? ""}
                  className="w-full h-24 object-cover rounded-[6px] mb-2"
                />
              ) : (
                <div
                  className="w-full h-24 rounded-[6px] mb-2 flex items-center justify-center text-[22px]"
                  style={{
                    background: `linear-gradient(135deg, ${PLATFORM_META[c.platform]?.color ?? "#333"}, #111)`,
                  }}
                >
                  {c.platform?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-[11px] font-medium text-tx-1 truncate mb-0.5">
                {c.title ?? "Без названия"}
              </p>
              <p className="text-[9px] text-tx-3 mb-2">
                {c.platform} · {c.format}
              </p>
              <div className="flex gap-1 flex-wrap">
                <span
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip ${c.status === "active" ? "text-pos" : "text-tx-3"}`}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                {c.ctr > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">
                    CTR {c.ctr.toFixed(1)}%
                  </span>
                )}
                {c.ai_generated && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-tx-3">
                    AI
                  </span>
                )}
              </div>
            </div>
          ))}

          <div
            onClick={() => setUploadModal(true)}
            className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[160px]"
          >
            <span className="text-[28px] text-tx-3 mb-2">+</span>
            <p className="text-[11px] text-tx-3">Загрузить</p>
          </div>
        </div>
      )}

      {!isLoading && creatives.length === 0 && (
        <div className="ui-surface flex flex-col items-center py-14 text-center mt-4">
          <p className="text-[32px] mb-3">⬡</p>
          <p className="text-[13px] font-medium text-tx-1 mb-1">
            Нет креативов
          </p>
          <p className="text-[11px] text-tx-3 mb-4">
            Создайте кампанию или загрузите вручную
          </p>
          <button
            onClick={() => setUploadModal(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
          >
            ↑ Загрузить первый
          </button>
        </div>
      )}

      {/* Fix 11: Creative action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setActionModal(null)}
          />
          <div className="relative w-full max-w-[520px] bg-panel border border-line rounded-[14px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-panel z-10">
              <div>
                <p className="text-[14px] font-semibold text-tx-1">
                  {actionModal.title ?? "Без названия"}
                </p>
                <p className="text-[10px] text-tx-3 mt-0.5">
                  {actionModal.platform} · {actionModal.format} ·{" "}
                  {STATUS_LABEL[actionModal.status]}
                </p>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {actionModal.image_url && (
                <img
                  src={actionModal.image_url}
                  alt=""
                  className="w-full h-48 object-cover rounded-[9px]"
                />
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePublishNow}
                  className="py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer"
                >
                  🚀 Опубликовать сейчас
                </button>
                <button
                  onClick={handleToDraft}
                  className="py-2.5 border border-line text-[12px] text-tx-2 rounded-[8px] hover:bg-hover cursor-pointer"
                >
                  💾 В черновик
                </button>
              </div>

              {/* Schedule */}
              <div>
                <p className="ui-label mb-2">Запланировать</p>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1"
                  />
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleTime || scheduling}
                    className="px-4 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {scheduling ? "..." : "📅"}
                  </button>
                </div>
              </div>

              {/* Edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="ui-label">Редактировать</p>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="text-[11px] text-accent cursor-pointer hover:opacity-80"
                  >
                    {editing ? "Скрыть" : "✎ Изменить"}
                  </button>
                </div>
                {editing && (
                  <div className="space-y-2">
                    <div>
                      <label className="block ui-label mb-1">Заголовок</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="block ui-label mb-1">Текст</label>
                      <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className={`${inp} resize-none h-20`}
                      />
                    </div>
                    <button
                      onClick={handleSaveEdit}
                      className="w-full py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer"
                    >
                      Сохранить изменения
                    </button>
                  </div>
                )}
              </div>

              {/* Caption preview */}
              {!editing && actionModal.caption && (
                <div className="bg-panel-2 border border-line rounded-[8px] p-3">
                  <p className="ui-label mb-2">Текст</p>
                  <p className="text-[11px] text-tx-2 leading-relaxed whitespace-pre-wrap">
                    {actionModal.caption}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  [
                    "CTR",
                    actionModal.ctr > 0
                      ? `${actionModal.ctr.toFixed(1)}%`
                      : "—",
                  ],
                  [
                    "Показов",
                    actionModal.impressions > 0
                      ? actionModal.impressions.toLocaleString("ru")
                      : "—",
                  ],
                  [
                    "Кликов",
                    actionModal.clicks > 0
                      ? actionModal.clicks.toLocaleString("ru")
                      : "—",
                  ],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="bg-panel-2 border border-line rounded-[7px] px-3 py-2"
                  >
                    <p className="ui-label mb-1">{l}</p>
                    <p className="text-[13px] font-medium text-tx-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                className="w-full py-2 border border-neg/30 text-neg text-[12px] rounded-[8px] hover:bg-neg/5 cursor-pointer transition-colors"
              >
                🗑 Удалить креатив
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setUploadModal(false)}
          />
          <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Загрузить креатив
              </h2>
              <button
                onClick={() => setUploadModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block ui-label mb-2">Платформа</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(PLATFORM_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setUploadPlatform(key)}
                      className={`px-2 py-1 rounded-[6px] text-[10px] border cursor-pointer transition-colors ${uploadPlatform === key ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
                    >
                      {meta.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block ui-label mb-1">Название</label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Название..."
                  className={inp}
                />
              </div>
              <div>
                <label className="block ui-label mb-1">Файл *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadFile(f);
                    const r = new FileReader();
                    r.onload = (ev) =>
                      setUploadPreview(ev.target?.result as string);
                    r.readAsDataURL(f);
                  }}
                  style={{ display: "none" }}
                />
                {uploadPreview ? (
                  <div className="relative">
                    <img
                      src={uploadPreview}
                      alt=""
                      className="w-full h-36 object-cover rounded-[8px]"
                    />
                    <button
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-[11px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-8 border border-dashed border-line hover:border-line-strong rounded-[8px] flex flex-col items-center gap-2 cursor-pointer hover:bg-hover transition-colors"
                  >
                    <span className="text-[20px]">📁</span>
                    <span className="text-[11px] text-tx-3">
                      Нажмите чтобы выбрать
                    </span>
                    <span className="text-[9px] text-tx-3">
                      JPG, PNG, MP4 до 50MB
                    </span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadModal(false)}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Загрузка..." : "↑ Загрузить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
