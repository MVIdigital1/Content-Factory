"use client";
import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";

type CreativeKind = "post" | "ad";
type CreativeStatus = "idle" | "generating" | "done" | "error";

type CreativeImage = { id: string; url: string; order: number };

type BaseCreative = {
  id: string;
  platform: string;
  status: CreativeStatus;
  images: CreativeImage[];
  error?: string;
};

type PostCreative = BaseCreative & { kind: "post"; text: string };
type AdCreative = BaseCreative & {
  kind: "ad";
  headline: string;
  primaryText: string;
  description?: string;
  cta: string;
  destinationUrl?: string;
};

type Creative = PostCreative | AdCreative;
type CreativeContentDraft = Partial<PostCreative> & Partial<AdCreative>;

type PlanItem = { kind: CreativeKind; count: number; label: string };
type ContentPlan = Record<string, PlanItem[]>;

export type Props = {
  projectId: string;
  campaignId: string;
  selectedPlatforms: string[];
  onBack: () => void;
  onNext: () => void;
};

// Расширенная мета для всех платформ из data.ts
const PLATFORM_META: Record<string, { label: string; emoji: string; supportsAds: boolean }> = {
  yandex:    { label: "Яндекс Директ", emoji: "🟡", supportsAds: true },
  vk:        { label: "VK Реклама",     emoji: "🔵", supportsAds: true },
  telegram:  { label: "Telegram Ads",   emoji: "✈️", supportsAds: false },
  mytarget:  { label: "myTarget",       emoji: "🎯", supportsAds: true },
  kaspi:     { label: "Kaspi Ads",      emoji: "🔴", supportsAds: true },
  google:    { label: "Google Ads",     emoji: "🟢", supportsAds: true },
  meta:      { label: "Meta Ads",       emoji: "🟦", supportsAds: true },
  tiktok:    { label: "TikTok Ads",     emoji: "⬛", supportsAds: true },
  instagram: { label: "Instagram",      emoji: "📸", supportsAds: true },
};

const CTA_OPTIONS = ["Подробнее", "Купить", "Записаться", "Связаться", "Скачать"];
const MAX_IMAGES = 10;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const fieldStyle: CSSProperties = {
  width: "100%",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 9,
  border: "0.5px solid var(--line)",
  background: "var(--panel-2)",
  color: "var(--tx-1)",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const ghostButtonStyle: CSSProperties = {
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--line)",
  background: "transparent",
  color: "var(--tx-2)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  fontSize: 12,
  padding: "7px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600,
};

// ── PlanBanner ──────────────────────────────────────────────────────────────
function PlanBanner({ plan, loading, onRegenerate }: {
  plan: ContentPlan | null;
  loading: boolean;
  onRegenerate: () => void;
}) {
  const summary = plan
    ? Object.entries(plan)
        .filter(([, items]) => items.length > 0)
        .map(([platform, items]) => {
          const meta = PLATFORM_META[platform] ?? { label: platform };
          const parts = items.map((it) => `${it.count} ${it.label}`).join(" + ");
          return `${meta.label} — ${parts}`;
        })
        .join(" · ")
    : "";

  return (
    <div style={{
      background: "var(--accent-dim)",
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <span style={{ fontSize: 13, color: "var(--accent)" }}>
          {loading ? "AI анализирует нишу и аналитику…" : `AI-план: ${summary}`}
        </span>
      </div>
      <button onClick={onRegenerate} disabled={loading} style={{ ...ghostButtonStyle, cursor: loading ? "default" : "pointer" }}>
        {loading ? "..." : "Пересчитать план"}
      </button>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function statusBadge(status: CreativeStatus) {
  switch (status) {
    case "done":       return { label: "Готово",        color: "var(--pos)",    bg: "var(--chip)" };
    case "generating": return { label: "Генерируется",  color: "var(--accent)", bg: "var(--accent-dim)" };
    case "error":      return { label: "Ошибка",        color: "var(--neg)",    bg: "rgba(193,18,31,0.08)" };
    default:           return { label: "Черновик",      color: "var(--tx-3)",   bg: "var(--chip)" };
  }
}

// ── CreativeRow ─────────────────────────────────────────────────────────────
function CreativeRow({ creative, onOpen, onRetry }: {
  creative: Creative;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const badge = statusBadge(creative.status);
  const preview = creative.kind === "post" ? creative.text : creative.headline || creative.primaryText;
  const cover = creative.images[0];
  const isError = creative.status === "error";

  return (
    <div
      onClick={isError ? undefined : onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: 8, borderRadius: 9,
        background: "var(--panel-2)",
        cursor: isError ? "default" : "pointer",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "var(--panel)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
      }}>
        {cover
          ? <img src={cover.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 14 }}>{creative.kind === "ad" ? "🎯" : "📝"}</span>}
      </div>
      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "var(--chip)", color: "var(--tx-3)", flexShrink: 0 }}>
        {creative.kind === "ad" ? "Реклама" : "Пост"}
      </span>
      <span style={{ fontSize: 12, color: "var(--tx-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {preview || "—"}
      </span>
      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: badge.bg, color: badge.color, flexShrink: 0 }}>
        {badge.label}
      </span>
      {isError ? (
        <button onClick={(e) => { e.stopPropagation(); onRetry(); }} aria-label="Повторить"
          style={{ width: 26, height: 26, borderRadius: 8, border: "0.5px solid var(--line)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 13 }}>
          ↻
        </button>
      ) : (
        <span style={{ fontSize: 14, color: "var(--tx-3)", flexShrink: 0 }}>›</span>
      )}
    </div>
  );
}

// ── PlatformSection ─────────────────────────────────────────────────────────
function PlatformSection({ platform, creatives, onAddCreative, onOpenCreative, onRetryCreative }: {
  platform: string;
  creatives: Creative[];
  onAddCreative: () => void;
  onOpenCreative: (id: string) => void;
  onRetryCreative: (id: string) => void;
}) {
  const meta = PLATFORM_META[platform] ?? { label: platform, emoji: "📢", supportsAds: false };
  return (
    <div style={{ background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{meta.emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>{meta.label}</span>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--chip)", color: "var(--tx-3)" }}>
            {creatives.length} {creatives.length === 1 ? "креатив" : "креатива"}
          </span>
        </div>
        <button onClick={onAddCreative} style={ghostButtonStyle}>+ Добавить креатив</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {creatives.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--tx-3)", padding: "8px 0" }}>
            Пока нет креативов — нажмите «Добавить креатив»
          </p>
        )}
        {creatives.map((c) => (
          <CreativeRow key={c.id} creative={c} onOpen={() => onOpenCreative(c.id)} onRetry={() => onRetryCreative(c.id)} />
        ))}
      </div>
    </div>
  );
}

// ── AddCreativeTypeModal ────────────────────────────────────────────────────
function AddCreativeTypeModal({ platform, onChoose, onClose }: {
  platform: string;
  onChoose: (kind: CreativeKind) => void;
  onClose: () => void;
}) {
  const meta = PLATFORM_META[platform] ?? { label: platform, emoji: "📢", supportsAds: false };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 16, width: 320, maxWidth: "100%", padding: 20 }}>
        <p style={{ fontSize: 13, color: "var(--tx-2)", marginBottom: 14 }}>Новый креатив для {meta.label}</p>
        <button onClick={() => onChoose("post")} style={{ width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 9, border: "0.5px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-1)", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>📝 Обычный пост</span>
          <span style={{ fontSize: 11, color: "var(--tx-3)" }}>Текст и картинки, публикуется как есть</span>
        </button>
        {meta.supportsAds && (
          <button onClick={() => onChoose("ad")} style={{ width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 9, border: "0.5px solid var(--line)", background: "var(--panel-2)", color: "var(--tx-1)", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>🎯 Рекламный креатив</span>
            <span style={{ fontSize: 11, color: "var(--tx-3)" }}>Заголовок, CTA и ссылка — для рекламного кабинета</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── ImagePicker ─────────────────────────────────────────────────────────────
function ImagePicker({ images, libraryImages, onUpload, onPickFromLibrary, onRemove }: {
  images: CreativeImage[];
  libraryImages: CreativeImage[];
  onUpload: (files: FileList) => void;
  onPickFromLibrary: (img: CreativeImage) => void;
  onRemove: (id: string) => void;
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--tx-2)" }}>Картинки</span>
        <span style={{ fontSize: 11, color: "var(--tx-3)" }}>{images.length} / {MAX_IMAGES}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: showLibrary ? 12 : 0 }}>
        {images.map((img, i) => (
          <div key={img.id} style={{ position: "relative", width: 64, height: 64, borderRadius: 9, overflow: "hidden", background: "var(--panel-2)" }}>
            <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {i === 0 && (
              <span style={{ position: "absolute", top: 3, left: 3, fontSize: 9, padding: "1px 5px", borderRadius: 6, background: "var(--accent-dim)", color: "var(--accent)" }}>
                Обложка
              </span>
            )}
            <button onClick={() => onRemove(img.id)} aria-label="Удалить"
              style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", border: "0.5px solid var(--line)", background: "var(--panel)", color: "var(--tx-2)", fontSize: 9, lineHeight: "14px", cursor: "pointer", padding: 0 }}>
              ✕
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width: 64, height: 64, borderRadius: 9, border: "1px dashed var(--line)", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: "var(--tx-3)", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16 }}>⬆</span>
              <span style={{ fontSize: 10 }}>Загрузить</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
            <button onClick={() => setShowLibrary((v) => !v)}
              style={{ width: 64, height: 64, borderRadius: 9, border: "1px dashed var(--line)", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: "var(--tx-3)", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16 }}>🗂</span>
              <span style={{ fontSize: 10 }}>Медиатека</span>
            </button>
          </>
        )}
      </div>
      {showLibrary && (
        <div style={{ background: "var(--panel-2)", borderRadius: 9, padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {libraryImages.length === 0
            ? <p style={{ fontSize: 11, color: "var(--tx-3)" }}>В медиатеке проекта пока нет картинок</p>
            : libraryImages.map((img) => (
                <button key={img.id} onClick={() => onPickFromLibrary(img)}
                  style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--line)", padding: 0, cursor: "pointer", background: "none" }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
        </div>
      )}
    </div>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────
function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--panel)", border: "0.5px solid var(--line)", borderRadius: 16, width: 460, maxWidth: "100%", padding: 20, maxHeight: "85vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>{title}</span>
      <button onClick={onClose} aria-label="Закрыть" style={{ width: 28, height: 28, border: "none", background: "transparent", color: "var(--tx-3)", fontSize: 16, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── PostEditorModal ─────────────────────────────────────────────────────────
function PostEditorModal({ creative, libraryImages, onSave, onClose, onRegenerateText, onUploadImages }: {
  creative: PostCreative;
  libraryImages: CreativeImage[];
  onSave: (c: PostCreative) => void;
  onClose: () => void;
  onRegenerateText: () => void;
  onUploadImages: (files: FileList) => Promise<CreativeImage[]>;
}) {
  const [text, setText] = useState(creative.text);
  const [images, setImages] = useState(creative.images);
  const meta = PLATFORM_META[creative.platform] ?? { label: creative.platform, emoji: "📢" };

  const handleUpload = async (files: FileList) => {
    const uploaded = await onUploadImages(files);
    setImages((prev) => [...prev, ...uploaded]);
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={`${meta.emoji} ${meta.label} · пост`} onClose={onClose} />
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--tx-2)" }}>Текст поста</span>
          <button onClick={onRegenerateText} style={{ ...ghostButtonStyle, fontSize: 11, padding: "4px 8px" }}>↻ Переписать с AI</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          style={{ ...fieldStyle, minHeight: 90, lineHeight: 1.5, resize: "vertical" }} />
      </div>
      <ImagePicker images={images} libraryImages={libraryImages}
        onUpload={handleUpload}
        onPickFromLibrary={(img) => setImages((prev) => [...prev, { ...img, id: uid(), order: prev.length }])}
        onRemove={(id) => setImages((prev) => prev.filter((i) => i.id !== id))} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={ghostButtonStyle}>Отмена</button>
        <button onClick={() => onSave({ ...creative, text, images, status: "done" })} style={primaryButtonStyle}>Сохранить</button>
      </div>
    </ModalShell>
  );
}

// ── AdEditorModal ───────────────────────────────────────────────────────────
function AdEditorModal({ creative, libraryImages, onSave, onClose, onRegenerateText, onUploadImages }: {
  creative: AdCreative;
  libraryImages: CreativeImage[];
  onSave: (c: AdCreative) => void;
  onClose: () => void;
  onRegenerateText: () => void;
  onUploadImages: (files: FileList) => Promise<CreativeImage[]>;
}) {
  const [headline, setHeadline] = useState(creative.headline);
  const [primaryText, setPrimaryText] = useState(creative.primaryText);
  const [description, setDescription] = useState(creative.description ?? "");
  const [cta, setCta] = useState(creative.cta);
  const [destinationUrl, setDestinationUrl] = useState(creative.destinationUrl ?? "");
  const [images, setImages] = useState(creative.images);
  const meta = PLATFORM_META[creative.platform] ?? { label: creative.platform, emoji: "📢" };

  const handleUpload = async (files: FileList) => {
    const uploaded = await onUploadImages(files);
    setImages((prev) => [...prev, ...uploaded]);
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={`${meta.emoji} ${meta.label} · рекламный креатив`} onClose={onClose} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--tx-2)" }}>Заголовок</span>
          <span style={{ fontSize: 11, color: "var(--tx-3)" }}>{headline.length}/40</span>
        </div>
        <input value={headline} maxLength={40} onChange={(e) => setHeadline(e.target.value)} style={fieldStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--tx-2)" }}>Основной текст</span>
          <button onClick={onRegenerateText} style={{ ...ghostButtonStyle, fontSize: 11, padding: "4px 8px" }}>↻ Переписать с AI</button>
        </div>
        <textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)}
          style={{ ...fieldStyle, minHeight: 70, lineHeight: 1.5, resize: "vertical" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--tx-2)", display: "block", marginBottom: 6 }}>Описание (опционально)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={fieldStyle} />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: "var(--tx-2)", display: "block", marginBottom: 6 }}>Кнопка CTA</span>
          <select value={cta} onChange={(e) => setCta(e.target.value)} style={fieldStyle}>
            {CTA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: "var(--tx-2)", display: "block", marginBottom: 6 }}>Ссылка</span>
          <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />
        </div>
      </div>
      <ImagePicker images={images} libraryImages={libraryImages}
        onUpload={handleUpload}
        onPickFromLibrary={(img) => setImages((prev) => [...prev, { ...img, id: uid(), order: prev.length }])}
        onRemove={(id) => setImages((prev) => prev.filter((i) => i.id !== id))} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={ghostButtonStyle}>Отмена</button>
        <button onClick={() => onSave({ ...creative, headline, primaryText, description, cta, destinationUrl, images, status: "done" })} style={primaryButtonStyle}>Сохранить</button>
      </div>
    </ModalShell>
  );
}

// ── Главный компонент ───────────────────────────────────────────────────────
export default function CreateCreativesStep({ projectId, campaignId, selectedPlatforms, onBack, onNext }: Props) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [libraryImages, setLibraryImages] = useState<CreativeImage[]>([]);
  const [addModalPlatform, setAddModalPlatform] = useState<string | null>(null);
  const [openCreativeId, setOpenCreativeId] = useState<string | null>(null);

  // Медиатека — таблица project_files (опциональная, не ломает если нет)
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/project-files?project_id=${projectId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (!cancelled) {
          setLibraryImages(
            data
              .filter((f) => f.file_type === "image" || f.file_url?.match(/\.(jpg|jpeg|png|webp|gif)/i))
              .map((f, i) => ({ id: f.id, url: f.file_url, order: i })),
          );
        }
      });
    return () => { cancelled = true; };
  }, [projectId]);

  // TODO: заменить на реальный AI-вызов через /api/campaigns/generate-plan
  const generatePlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      const stubPlan: ContentPlan = {};
      selectedPlatforms.forEach((p) => {
        const supportsAds = PLATFORM_META[p]?.supportsAds ?? false;
        stubPlan[p] = supportsAds
          ? [{ kind: "post", count: 3, label: "поста" }, { kind: "ad", count: 1, label: "реклама" }]
          : [{ kind: "post", count: 2, label: "поста" }];
      });
      setPlan(stubPlan);
    } finally {
      setPlanLoading(false);
    }
  }, [selectedPlatforms]);

  useEffect(() => { generatePlan(); }, [generatePlan]);

  // TODO: заменить на реальную генерацию через /api/ai/generate-creative
  const generateCreativeContent = useCallback(async (kind: CreativeKind): Promise<CreativeContentDraft> => {
    await new Promise((r) => setTimeout(r, 1200));
    if (kind === "post") {
      return { text: "Сгенерированный текст поста появится здесь после подключения AI." };
    }
    return {
      headline: "Заголовок объявления",
      primaryText: "Сгенерированный текст объявления появится здесь после подключения AI.",
      description: "",
      cta: CTA_OPTIONS[0],
      destinationUrl: "",
    };
  }, []);

  const handleAddCreative = useCallback(async (platform: string, kind: CreativeKind) => {
    setAddModalPlatform(null);
    const id = uid();
    const base: BaseCreative = { id, platform, status: "generating", images: [] };
    const draft: Creative = kind === "post"
      ? { ...base, kind: "post", text: "" }
      : { ...base, kind: "ad", headline: "", primaryText: "", cta: CTA_OPTIONS[0] };
    setCreatives((prev) => [...prev, draft]);

    try {
      const generated = await generateCreativeContent(kind);
      setCreatives((prev) => prev.map((c) => c.id === id ? ({ ...c, ...generated, status: "done" } as Creative) : c));
    } catch {
      setCreatives((prev) => prev.map((c) => c.id === id ? { ...c, status: "error", error: "Не удалось сгенерировать" } : c));
    }
  }, [generateCreativeContent]);

  const handleRetry = useCallback((id: string) => {
    const target = creatives.find((c) => c.id === id);
    if (!target) return;
    setCreatives((prev) => prev.filter((c) => c.id !== id));
    handleAddCreative(target.platform, target.kind);
  }, [creatives, handleAddCreative]);

  // TODO: заменить на загрузку в Supabase Storage (bucket: content-images)
  const handleUploadImages = useCallback(async (files: FileList): Promise<CreativeImage[]> => {
    const urls = await Promise.all(
      Array.from(files).map((file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      )
    );
    return urls.map((url, i) => ({ id: uid(), url, order: i }));
  }, []);

  const handleSaveCreative = useCallback((updated: Creative) => {
    setCreatives((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setOpenCreativeId(null);
  }, []);

  const openCreative = creatives.find((c) => c.id === openCreativeId) ?? null;

  return (
    <div className="space-y-0">
      <PlanBanner plan={plan} loading={planLoading} onRegenerate={generatePlan} />

      {selectedPlatforms.map((platform) => (
        <PlatformSection
          key={platform}
          platform={platform}
          creatives={creatives.filter((c) => c.platform === platform)}
          onAddCreative={() => setAddModalPlatform(platform)}
          onOpenCreative={(id) => setOpenCreativeId(id)}
          onRetryCreative={handleRetry}
        />
      ))}

      {selectedPlatforms.length === 0 && (
        <div className="text-center py-12 border border-dashed border-line rounded-[12px]" style={{ background: "var(--panel-2)" }}>
          <p style={{ fontSize: 26 }}>📢</p>
          <p className="text-[12px] text-tx-3 mt-2">Не выбрано ни одной платформы — вернитесь на шаг «Платформы»</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer">
          ← Назад
        </button>
        <button onClick={onNext} className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer">
          Далее: Landing →
        </button>
      </div>

      {addModalPlatform && (
        <AddCreativeTypeModal
          platform={addModalPlatform}
          onChoose={(kind) => handleAddCreative(addModalPlatform, kind)}
          onClose={() => setAddModalPlatform(null)}
        />
      )}

      {openCreative?.kind === "post" && (
        <PostEditorModal
          creative={openCreative}
          libraryImages={libraryImages}
          onSave={handleSaveCreative}
          onClose={() => setOpenCreativeId(null)}
          onRegenerateText={() => {}}
          onUploadImages={handleUploadImages}
        />
      )}

      {openCreative?.kind === "ad" && (
        <AdEditorModal
          creative={openCreative}
          libraryImages={libraryImages}
          onSave={handleSaveCreative}
          onClose={() => setOpenCreativeId(null)}
          onRegenerateText={() => {}}
          onUploadImages={handleUploadImages}
        />
      )}
    </div>
  );
}
