"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { PLATFORM_META } from "./data";
import {
  useCreateAdCampaign,
  useCreateAdCreative,
} from "@/lib/hooks/useAdsData";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

const STEPS = ["Цель", "Платформы", "Креативы", "Запуск"];

const PLATFORM_SUBTYPES: Record<
  string,
  { value: string; label: string; emoji: string }[]
> = {
  telegram: [
    { value: "post", label: "Пост", emoji: "📝" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  instagram: [
    { value: "post", label: "Пост", emoji: "🖼" },
    { value: "reels", label: "Reels", emoji: "🎬" },
    { value: "stories", label: "Stories", emoji: "⭕" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  tiktok: [
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  vk: [
    { value: "post", label: "Пост", emoji: "📝" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  yandex: [
    { value: "search", label: "Поиск", emoji: "🔍" },
    { value: "rsya", label: "РСЯ", emoji: "📊" },
  ],
  google: [
    { value: "search", label: "Поиск", emoji: "🔍" },
    { value: "display", label: "КМС", emoji: "🖼" },
    { value: "video", label: "YouTube", emoji: "▶️" },
  ],
  meta: [
    { value: "feed", label: "Лента", emoji: "📱" },
    { value: "stories", label: "Stories", emoji: "⭕" },
    { value: "reels", label: "Reels", emoji: "🎬" },
    { value: "ad", label: "Реклама", emoji: "📣" },
  ],
  mytarget: [
    { value: "feed", label: "Лента", emoji: "📱" },
    { value: "video", label: "Видео", emoji: "🎬" },
    { value: "banner", label: "Баннер", emoji: "🖼" },
  ],
};

const BASE_STORAGE_KEY = "wizard_draft_v5";
function loadDraft(tabId?: string) {
  try {
    return JSON.parse(
      localStorage.getItem(`${BASE_STORAGE_KEY}_${tabId ?? "0"}`) ?? "null",
    );
  } catch {
    return null;
  }
}
function saveDraft(d: any, tabId?: string) {
  try {
    localStorage.setItem(
      `${BASE_STORAGE_KEY}_${tabId ?? "0"}`,
      JSON.stringify(d),
    );
  } catch {}
}
function clearDraft(tabId?: string) {
  try {
    localStorage.removeItem(`${BASE_STORAGE_KEY}_${tabId ?? "0"}`);
  } catch {}
}

function Dropdown({
  label,
  icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line rounded-[9px] overflow-hidden">
      <button
        onClick={onToggle}
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-panel hover:bg-hover transition-colors cursor-pointer"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-[12px] font-medium text-tx-1 text-left">
          {label}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-tx-3 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-tx-3 flex-shrink-0" />
        )}
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <div className="border-t border-line bg-panel-2 p-3">{children}</div>
      </div>
    </div>
  );
}

// Generate real creative content via Claude API
async function generateCreativeContent(params: {
  platform: string;
  subtype: string;
  product: string;
  goal: string;
  audience: string;
  projectName: string;
}): Promise<{ title: string; caption: string; hook?: string }> {
  const platformNames: Record<string, string> = {
    telegram: "Telegram",
    instagram: "Instagram",
    tiktok: "TikTok",
    vk: "ВКонтакте",
    yandex: "Яндекс Директ",
    google: "Google Ads",
    meta: "Meta Ads",
    mytarget: "myTarget",
  };
  const subtypeNames: Record<string, string> = {
    post: "пост",
    video: "видео-сценарий",
    ad: "рекламное объявление",
    reels: "Reels сценарий",
    stories: "Stories",
    feed: "пост в ленту",
    search: "текстовое объявление",
    rsya: "баннерный текст",
    display: "медийный баннер",
    banner: "баннер",
  };

  const prompt = `Создай ${subtypeNames[params.subtype] ?? params.subtype} для платформы ${platformNames[params.platform] ?? params.platform}.

Продукт/бизнес: ${params.product || params.projectName}
Цель кампании: ${params.goal}
Целевая аудитория: ${params.audience || "широкая аудитория"}

Требования:
- Заголовок (title): короткий, цепляющий, до 10 слов
- Хук (hook): первое предложение которое останавливает прокрутку
- Текст (caption): полный текст поста/объявления с CTA

Отвечай ТОЛЬКО в JSON формате без markdown:
{"title":"...","hook":"...","caption":"..."}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error("API error");
  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { title: "Креатив", caption: text };
  }
}

// ── Project images panel ──────────────────────────────────────────────────
function ProjectImagesPanel({ projectId }: { projectId?: string }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const { data: projectFiles = [] } = useQuery({
    queryKey: ["project-files-wizard", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_files")
        .select("id, name, file_url, file_type")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []).filter(
        (f: any) =>
          f.file_type === "image" ||
          f.file_url?.match(/\.(jpg|jpeg|png|webp|gif)/i),
      );
    },
  });

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) =>
        setLocalPreviews((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none bg-panel text-tx-1";

  return (
    <div>
      <label className="block ui-label mb-2">Фото продукта для AI</label>

      {!projectId ? (
        <div className="p-4 bg-panel-2 border border-line rounded-[9px] text-center">
          <p className="text-[11px] text-tx-3">
            Выберите проект чтобы увидеть картинки
          </p>
        </div>
      ) : (
        <>
          {projectFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {projectFiles.map((f: any) => (
                <div key={f.id} className="relative group">
                  <img
                    src={f.file_url}
                    alt={f.name}
                    className="w-full h-20 object-cover rounded-[7px] cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-[7px] transition-colors" />
                </div>
              ))}
            </div>
          )}

          {localPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {localPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-20 object-cover rounded-[7px]"
                  />
                  <button
                    onClick={() =>
                      setLocalPreviews((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-panel-2 border border-dashed border-line rounded-[8px]">
            <p className="text-[10px] text-tx-3 mb-2 text-center">
              {projectFiles.length === 0
                ? "Нет картинок в проекте — добавьте чтобы проверить как работает"
                : "Хотите добавить другую картинку?"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleLocalFile}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer transition-colors text-center"
            >
              📎 Прикрепить файл
            </button>
          </div>
        </>
      )}

      <div className="mt-3 p-3 bg-chip/40 rounded-[8px] flex items-start gap-2">
        <span className="text-[14px] flex-shrink-0">✦</span>
        <p className="text-[11px] text-tx-2 leading-relaxed">
          <strong>AI готов</strong> — сгенерирует реальный текст для каждого
          типа поста на каждой платформе
        </p>
      </div>
    </div>
  );
}

// ── Bulk schedule modal ───────────────────────────────────────────────────
export function BulkScheduleModal({
  creatives,
  onClose,
  onScheduled,
}: {
  creatives: any[];
  onClose: () => void;
  onScheduled: () => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<"2days" | "week" | "month" | "custom">(
    "week",
  );
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [scheduling, setScheduling] = useState(false);

  const getModeLabel = () =>
    ({
      "2days": "На 2 дня",
      week: "На неделю",
      month: "На месяц",
      custom: "Свой период",
    })[mode];

  const getEndDate = () => {
    const start = new Date(startDate);
    if (mode === "2days") {
      start.setDate(start.getDate() + 2);
      return start;
    }
    if (mode === "week") {
      start.setDate(start.getDate() + 7);
      return start;
    }
    if (mode === "month") {
      start.setMonth(start.getMonth() + 1);
      return start;
    }
    return new Date(endDate);
  };

  const handleBulkSchedule = async () => {
    if (creatives.length === 0) return;
    setScheduling(true);
    try {
      const start = new Date(startDate);
      const end = getEndDate();
      const totalMs = end.getTime() - start.getTime();
      const interval = totalMs / Math.max(creatives.length, 1);

      for (let i = 0; i < creatives.length; i++) {
        const c = creatives[i];
        const scheduledAt = new Date(start.getTime() + interval * i);
        if (c.id) {
          await supabase.from("scheduled_posts").insert({
            content_id: c.id,
            platform: c.platform,
            scheduled_at: scheduledAt.toISOString(),
            status: "pending",
            retry_count: 0,
          });
          await supabase
            .from("ad_creatives")
            .update({ status: "active" })
            .eq("id", c.id);
        }
      }
      onScheduled();
      onClose();
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-tx-1">
            Запланировать все · {creatives.length} постов
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode select */}
          <div>
            <label className="block ui-label mb-2">Период</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "2days", l: "📅 На 2 дня", d: "Быстрый тест" },
                  { v: "week", l: "📅 На неделю", d: "Равномерно 7 дней" },
                  { v: "month", l: "📅 На месяц", d: "Равномерно 30 дней" },
                  { v: "custom", l: "✎ Свой период", d: "Выбрать даты" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setMode(opt.v)}
                  className={`p-3 border rounded-[9px] cursor-pointer text-left transition-colors ${mode === opt.v ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                >
                  <div
                    className={`text-[11px] font-medium ${mode === opt.v ? "text-accent" : "text-tx-1"}`}
                  >
                    {opt.l}
                  </div>
                  <div className="text-[9px] text-tx-3 mt-0.5">{opt.d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="block ui-label mb-1">Начало</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* Custom end date */}
          {mode === "custom" && (
            <div>
              <label className="block ui-label mb-1">Конец</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inp}
              />
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-panel-2 border border-line rounded-[8px]">
            <p className="text-[11px] text-tx-2">
              {creatives.length} постов · {getModeLabel()} · начиная с{" "}
              {new Date(startDate).toLocaleDateString("ru", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-[10px] text-tx-3 mt-1">
              Публикации распределятся равномерно по выбранному периоду
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleBulkSchedule}
              disabled={scheduling}
              className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {scheduling ? "⟳ Планирую..." : "📅 Запланировать всё"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WizardView({
  onClose,
  projectId: defaultProjectId,
  onNameChange,
  tabId,
}: {
  onClose?: () => void;
  projectId?: string;
  onNameChange?: (name: string) => void;
  tabId?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const qc = useQueryClient();
  const createCampaign = useCreateAdCampaign();
  const createCreative = useCreateAdCreative();

  const draft = loadDraft(tabId);

  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  // genMode kept for backward compat but not shown in UI
  const [genMode] = useState<"text" | "image" | "video">("text");
  const [step, setStep] = useState(draft?.step ?? 0);
  const [name, setName] = useState(draft?.name ?? "");

  const [nameError, setNameError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    onNameChange?.(value);
    // Duplicate check against existing campaigns
    const isDuplicate = existingCampaigns.some(
      (c: any) =>
        c.name.toLowerCase().trim() === value.toLowerCase().trim() &&
        c.id !== draftId,
    );
    setNameError(
      isDuplicate ? "Кампания с таким названием уже существует" : "",
    );
  };
  const [goal, setGoal] = useState(draft?.goal ?? "Продажи / заявки");
  const [product, setProduct] = useState(draft?.product ?? "");
  const [audience, setAudience] = useState(draft?.audience ?? "");
  const [budget, setBudget] = useState(draft?.budget ?? "");
  const [projectId, setProjectId] = useState(
    draft?.projectId ?? defaultProjectId ?? "",
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(draft?.platforms ?? []),
  );
  const [selectedSubtypes, setSelectedSubtypes] = useState<
    Record<string, Set<string>>
  >(
    Object.fromEntries(
      Object.entries(draft?.subtypes ?? {}).map(([k, v]: [string, any]) => [
        k,
        new Set(v),
      ]),
    ),
  );
  const [autoSaved, setAutoSaved] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(draft?.draftId ?? null);

  // Launch state
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState<string>("");
  const [error, setError] = useState("");

  // Schedule
  const [scheduleModal, setScheduleModal] = useState<{
    creativeId: string;
    platform: string;
    title: string;
  } | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [publishingNow, setPublishingNow] = useState<string | null>(null);

  // Generated creatives (real content from AI)
  const [generatedCreatives, setGeneratedCreatives] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creativePlatformFilter, setCreativePlatformFilter] = useState("all");

  // Connect platform inline
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [accountIdInput, setAccountIdInput] = useState("");
  const [connectingPlatform, setConnectingPlatform] = useState(false);

  const [projectOpen, setProjectOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectNiche, setNewProjectNiche] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null,
  );
  const imgRef = useRef<HTMLInputElement>(null);
  const productImgRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name,niche,description,audience")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: existingCampaigns = [] } = useQuery({
    queryKey: ["ad_campaigns_clone"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_campaigns")
        .select("id,name,goal,description,platforms,budget_total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: connectedAdPlatforms = [], refetch: refetchPlatforms } =
    useQuery({
      queryKey: ["ad_platforms_real"],
      queryFn: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from("ad_platforms")
          .select("platform_key,name,account_name,account_id,color,abbr")
          .eq("user_id", user.id)
          .eq("is_active", true);
        return data ?? [];
      },
    });

  const { data: connectedIntegrations = [], refetch: refetchIntegrations } =
    useQuery({
      queryKey: ["integrations_real"],
      queryFn: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from("integrations")
          .select("platform,channel_name,channel_id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        return data ?? [];
      },
    });

  // Build real platforms
  type RealPlatform = {
    key: string;
    name: string;
    abbr: string;
    color: string;
    textColor?: string;
    accountInfo: string;
    channels: string[];
  };

  const realPlatforms: RealPlatform[] = (() => {
    const result: RealPlatform[] = [];
    const seen = new Set<string>();
    for (const p of connectedAdPlatforms) {
      if (seen.has(p.platform_key)) continue;
      seen.add(p.platform_key);
      const meta = PLATFORM_META[p.platform_key] ?? {
        color: p.color ?? "#888",
        abbr: p.abbr ?? "?",
        name: p.name,
      };
      result.push({
        key: p.platform_key,
        name: meta.name,
        abbr: meta.abbr,
        color: meta.color,
        textColor: (meta as any).textColor,
        accountInfo: p.account_name ?? p.account_id ?? "Подключён",
        channels: [],
      });
    }
    const integByPlatform: Record<string, string[]> = {};
    for (const i of connectedIntegrations) {
      if (!integByPlatform[i.platform]) integByPlatform[i.platform] = [];
      integByPlatform[i.platform].push(`@${i.channel_name}`);
    }
    for (const [platform, channels] of Object.entries(integByPlatform)) {
      if (seen.has(platform)) {
        const existing = result.find((r) => r.key === platform);
        if (existing) existing.channels = channels;
      } else {
        seen.add(platform);
        const meta = PLATFORM_META[platform];
        if (meta)
          result.push({
            key: platform,
            name: meta.name,
            abbr: meta.abbr,
            color: meta.color,
            textColor: (meta as any).textColor,
            accountInfo: channels.join(", "),
            channels,
          });
      }
    }
    return result;
  })();

  const connectedKeys = new Set(realPlatforms.map((p) => p.key));

  // Autosave draft to localStorage + create draft in DB
  useEffect(() => {
    const subtypesSer = Object.fromEntries(
      Object.entries(selectedSubtypes).map(([k, v]) => [k, [...v]]),
    );
    saveDraft(
      {
        genMode,
        name,
        goal,
        product,
        audience,
        budget,
        projectId,
        platforms: [...selectedPlatforms],
        subtypes: subtypesSer,
        draftId,
        step,
      },
      tabId,
    );
    if (name) {
      setAutoSaved(true);
      const t = setTimeout(() => setAutoSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [
    genMode,
    name,
    goal,
    product,
    audience,
    budget,
    projectId,
    selectedPlatforms,
    selectedSubtypes,
    step,
  ]);

  // Auto-create draft in DB when name is entered
  useEffect(() => {
    if (!name.trim() || draftId) return;
    const timer = setTimeout(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("ad_campaigns")
          .insert({
            user_id: user.id,
            name: name.trim(),
            goal,
            status: "draft",
            budget_spent: 0,
            impressions: 0,
            clicks: 0,
            leads: 0,
            sales: 0,
            revenue: 0,
            ctr: 0,
            cpl: 0,
            roas: 0,
          })
          .select("id")
          .single();
        if (data) {
          setDraftId(data.id);
          qc.invalidateQueries({ queryKey: ["ad_campaigns"] });
        }
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [name]);

  // Update draft in DB when fields change
  useEffect(() => {
    if (!draftId) return;
    const timer = setTimeout(async () => {
      await supabase
        .from("ad_campaigns")
        .update({
          name: name || "Черновик",
          goal,
          description: product,
          platforms: [...selectedPlatforms],
          budget_total: budget ? Number(budget) : null,
          project_id: projectId || null,
        })
        .eq("id", draftId);
      qc.invalidateQueries({ queryKey: ["ad_campaigns"] });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, goal, product, budget, projectId, selectedPlatforms, draftId]);

  const activeProject = projects.find((p: any) => p.id === projectId) as any;

  // AI project recommendations
  const [projectRecs, setProjectRecs] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const generateProjectRecs = async (project: any) => {
    if (!project) return;
    setLoadingRecs(true);
    setProjectRecs([]);
    try {
      const prompt = `Проанализируй проект и дай 3 конкретные краткие рекомендации для рекламной кампании.

Проект: ${project.name}
Ниша: ${project.niche ?? "не указана"}
Описание: ${project.description ?? "не указано"}
Аудитория: ${project.audience ?? "не указана"}

Ответь ТОЛЬКО в JSON формате без markdown:
{"recs":["рекомендация 1","рекомендация 2","рекомендация 3"]}

Каждая рекомендация — одно конкретное действие для кампании, до 15 слов.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setProjectRecs(parsed.recs ?? []);
    } catch {
      setProjectRecs([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleProjectSelect = (pid: string) => {
    setProjectId(pid);
    setProjectOpen(false);
    const p = projects.find((p: any) => p.id === pid) as any;
    if (!p) return;
    // Don't autofill fields — just generate AI recommendations
    // Reset old recs and generate new ones for this project
    setProjectRecs([]);
    generateProjectRecs(p);
  };

  // Reset recs when projectId cleared
  useEffect(() => {
    if (!projectId) setProjectRecs([]);
  }, [projectId]);

  const handleClone = (c: any) => {
    setName(`${c.name} — копия`);
    setGoal(c.goal ?? "Продажи / заявки");
    setProduct(c.description ?? "");
    setBudget(c.budget_total ? String(c.budget_total) : "");
    const clonePlatforms = (c.platforms ?? []).filter((p: string) =>
      connectedKeys.has(p),
    );
    setSelectedPlatforms(new Set(clonePlatforms));
    setCloneOpen(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { data } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: newProjectName.trim(),
          niche: newProjectNiche.trim() || null,
          is_active: true,
          language: "ru",
          tone: "friendly",
          products: [],
        })
        .select()
        .single();
      if (data) {
        await refetchProjects();
        setProjectId(data.id);
        setShowCreateProject(false);
        setNewProjectName("");
        setNewProjectNiche("");
      }
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleConnectPlatform = async () => {
    if (!connectModal) return;
    setConnectingPlatform(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const meta = PLATFORM_META[connectModal];
      await supabase.from("ad_platforms").upsert({
        user_id: user.id,
        platform_key: connectModal,
        name: meta?.name ?? connectModal,
        color: meta?.color ?? "#888",
        abbr: meta?.abbr ?? "?",
        access_token: tokenInput || null,
        account_id: accountIdInput || null,
        is_active: true,
        status: "active",
        updated_at: new Date().toISOString(),
      });
      await refetchPlatforms();
      setConnectModal(null);
      setTokenInput("");
      setAccountIdInput("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setConnectingPlatform(false);
    }
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
        setSelectedSubtypes((s) => {
          const ns = { ...s };
          delete ns[key];
          return ns;
        });
      } else {
        n.add(key);
        const subs = PLATFORM_SUBTYPES[key] ?? [];
        setSelectedSubtypes((s) => ({
          ...s,
          [key]: new Set(subs.map((st) => st.value)),
        }));
      }
      return n;
    });
  };

  const toggleSubtype = (platformKey: string, subtype: string) => {
    setSelectedSubtypes((prev) => {
      const current = new Set(prev[platformKey] ?? []);
      current.has(subtype) ? current.delete(subtype) : current.add(subtype);
      if (current.size === 0) return prev;
      return { ...prev, [platformKey]: current };
    });
  };

  // Generate ALL creatives via Claude API then save to DB
  const handleLaunch = async () => {
    if (!name.trim()) {
      setError("Введите название");
      return;
    }
    if (selectedPlatforms.size === 0) {
      setError("Выберите платформу");
      return;
    }
    setLaunching(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Update or create campaign
      let campaignId = draftId;
      if (campaignId) {
        await supabase
          .from("ad_campaigns")
          .update({
            name,
            goal,
            description: product,
            platforms: [...selectedPlatforms],
            status: "active",
            budget_total: budget ? Number(budget) : null,
            project_id: projectId || null,
          })
          .eq("id", campaignId);
      } else {
        const campaign = await createCampaign.mutateAsync({
          name,
          goal,
          description: product,
          platforms: [...selectedPlatforms],
          status: "active",
          budget_total: budget ? Number(budget) : undefined,
          budget_spent: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          sales: 0,
          revenue: 0,
          ctr: 0,
          cpl: 0,
          roas: 0,
          project_id: projectId || undefined,
        });
        campaignId = campaign.id;
      }

      qc.invalidateQueries({ queryKey: ["ad_campaigns"] });

      // Save already generated creatives to DB (don't regenerate)
      const allCreatives: any[] = [];
      setLaunchProgress(`Сохраняю ${generatedCreatives.length} креативов...`);
      for (const c of generatedCreatives) {
        try {
          const { data: creative } = await supabase
            .from("ad_creatives")
            .insert({
              user_id: user.id,
              campaign_id: campaignId,
              project_id: projectId || null,
              platform: c.platform,
              format: c.subtype,
              title: c.title,
              caption: c.caption,
              status: "draft",
              ai_generated: true,
              ctr: 0,
              impressions: 0,
              clicks: 0,
              is_winner: false,
            })
            .select()
            .single();
          if (creative) allCreatives.push(creative);
        } catch (e) {
          console.error("Save creative error:", e);
        }
      }

      qc.invalidateQueries({ queryKey: ["ad_creatives"] });
      setGeneratedCreatives(allCreatives);
      clearDraft(tabId);
      setDraftId(null);
      setLaunchProgress("");

      // Go to campaign page
      router.push(`/${locale}/campaigns/${campaignId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLaunching(false);
      setLaunchProgress("");
    }
  };

  const handleScheduleCreative = async () => {
    if (!scheduleModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await supabase.from("scheduled_posts").insert({
        content_id: scheduleModal.creativeId,
        platform: scheduleModal.platform,
        scheduled_at: new Date(scheduleTime).toISOString(),
        status: "pending",
        retry_count: 0,
      });
      await supabase
        .from("ad_creatives")
        .update({ status: "active" })
        .eq("id", scheduleModal.creativeId);
      setScheduleModal(null);
      setScheduleTime("");
      alert("Запланировано!");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  return (
    <div>
      {/* Step bar - now 3 steps */}
      <div className="flex items-center gap-1 bg-panel-2 border border-line rounded-[9px] p-2.5 mb-5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${step === i ? "bg-accent text-on-accent" : step > i ? "bg-chip text-pos cursor-pointer" : "bg-panel text-tx-3"}`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${step === i ? "bg-white/20" : step > i ? "bg-pos text-white" : "border border-line text-tx-3"}`}
              >
                {step > i ? "✓" : i + 1}
              </div>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <span className="text-tx-3 text-[10px]">›</span>
            )}
          </div>
        ))}
        {autoSaved && (
          <span className="ml-auto text-[10px] text-pos">
            ✓ Черновик сохранён
          </span>
        )}
        {draftId && !autoSaved && (
          <span className="ml-auto text-[10px] text-tx-3">Черновик</span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-neg bg-panel-2 border border-line rounded-[8px] px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ══ STEP 0: Goal ══ */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block ui-label mb-1">Название *</label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Ramadan акция 2026"
                className={`${inp} ${nameError ? "border-neg" : ""}`}
              />
              {nameError && (
                <p className="text-[10px] text-neg mt-1">{nameError}</p>
              )}
            </div>

            {/* Clone campaign */}
            <div>
              <label className="block ui-label mb-1">
                Клонировать кампанию
              </label>
              <Dropdown
                label="Выбрать существующую..."
                icon={<span>📋</span>}
                open={cloneOpen}
                onToggle={() => {
                  setCloneOpen(!cloneOpen);
                  setProjectOpen(false);
                }}
              >
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {existingCampaigns.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleClone(c)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-[7px] cursor-pointer hover:bg-hover text-left"
                    >
                      <div className="flex gap-1 flex-shrink-0">
                        {(c.platforms ?? []).slice(0, 2).map((pid: string) => {
                          const pm = PLATFORM_META[pid];
                          return pm ? (
                            <div
                              key={pid}
                              style={{
                                width: 18,
                                height: 13,
                                borderRadius: 2,
                                background: pm.color,
                                color: (pm as any).textColor ?? "#fff",
                                fontSize: 7,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {pm.abbr}
                            </div>
                          ) : null;
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-tx-1 truncate">
                          {c.name}
                        </p>
                        {c.goal && (
                          <p className="text-[10px] text-tx-3">{c.goal}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {existingCampaigns.length === 0 && (
                    <p className="text-[11px] text-tx-3 px-2 py-1">
                      Нет кампаний
                    </p>
                  )}
                </div>
              </Dropdown>
            </div>

            {/* Goal */}
            <div>
              <label className="block ui-label mb-2">Цель</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  "Продажи / заявки",
                  "Трафик на сайт",
                  "Охват",
                  "Подписчики",
                ].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer transition-colors ${goal === g ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <label className="block ui-label mb-1">О продукте — для AI</label>
              <textarea
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Опишите продукт, преимущества, акции..."
                className={`${inp} resize-none h-16`}
              />
            </div>

            {/* Audience */}
            <div>
              <label className="block ui-label mb-1">Целевая аудитория</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Возраст, интересы, гео..."
                className={`${inp} resize-none h-12`}
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block ui-label mb-1">Бюджет (₽)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="150000"
                className={inp}
              />
            </div>
          </div>

          {/* Right: project images */}
          <div>
            <ProjectImagesPanel projectId={projectId} />
          </div>

          {/* AI project recommendations */}
          {(projectRecs.length > 0 || loadingRecs) && (
            <div className="col-span-2 border border-line rounded-[10px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-panel-2 border-b border-line">
                <span className="text-[13px]">✦</span>
                <span className="text-[11px] font-semibold text-tx-1">
                  AI рекомендации для {activeProject?.name}
                </span>
                {loadingRecs && (
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin ml-auto" />
                )}
              </div>
              {!loadingRecs && (
                <div className="grid grid-cols-3 gap-0 divide-x divide-line">
                  {projectRecs.map((rec, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: ["var(--accent)", "#8B5CF6", "#F59E0B"][
                              i
                            ],
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-[11px] text-tx-2 leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loadingRecs && (
                <div className="grid grid-cols-3 gap-0 divide-x divide-line">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="h-3 bg-panel-2 rounded animate-pulse mb-1.5 w-full" />
                      <div className="h-3 bg-panel-2 rounded animate-pulse w-3/4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-line">
            <button
              onClick={() => {
                if (!name.trim()) {
                  setError("Введите название");
                  return;
                }
                if (nameError) {
                  setError(nameError);
                  return;
                }
                setError("");
                setStep(1);
              }}
              className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
            >
              Далее: Платформы →
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 1: Platforms ══ */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[12px] text-tx-2 mb-3">
            Выберите платформы. AI создаст по 1-2 реальных креатива для каждого
            типа.
          </p>

          {/* Connected platforms */}
          {realPlatforms.length > 0 && (
            <>
              <p className="ui-label">Подключённые платформы</p>
              {realPlatforms.map((rp) => {
                const sel = selectedPlatforms.has(rp.key);
                const subtypes = PLATFORM_SUBTYPES[rp.key] ?? [];
                const selSubs = selectedSubtypes[rp.key] ?? new Set();
                return (
                  <div
                    key={rp.key}
                    className={`border rounded-[9px] overflow-hidden transition-colors ${sel ? "border-pos/40" : "border-line"}`}
                  >
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-hover"
                      onClick={() => togglePlatform(rp.key)}
                    >
                      <div
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[9px] flex-shrink-0 ${sel ? "bg-accent border-accent text-on-accent" : "border-line-strong"}`}
                      >
                        {sel && "✓"}
                      </div>
                      <PlatformLogo
                        abbr={rp.abbr}
                        color={rp.color}
                        textColor={rp.textColor}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-medium text-tx-1">
                            {rp.name}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">
                            Подключён
                          </span>
                        </div>
                        <p className="text-[10px] text-tx-3">
                          {rp.accountInfo}
                          {rp.channels.length > 0
                            ? ` · ${rp.channels.join(", ")}`
                            : ""}
                        </p>
                        {sel && (
                          <p className="text-[10px] text-pos mt-0.5">
                            {selSubs.size} типов ·{" "}
                            {[...selSubs].reduce(
                              (s, st) =>
                                s +
                                (PLATFORM_SUBTYPES[rp.key]?.find(
                                  (p) => p.value === st,
                                )
                                  ? st === "post" ||
                                    st === "video" ||
                                    st === "ad" ||
                                    st === "reels" ||
                                    st === "stories" ||
                                    st === "feed" ||
                                    st === "search" ||
                                    st === "rsya" ||
                                    st === "display" ||
                                    st === "banner"
                                    ? 2
                                    : 1
                                  : 0),
                              0,
                            )}{" "}
                            креативов
                          </p>
                        )}
                      </div>
                    </div>
                    {sel && subtypes.length > 0 && (
                      <div className="px-4 pb-3 pt-2 border-t border-line bg-panel-2">
                        <p className="text-[10px] text-tx-3 mb-2">
                          Типы контента:
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {subtypes.map((st) => {
                            const isSel = selSubs.has(st.value);
                            return (
                              <button
                                key={st.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubtype(rp.key, st.value);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border cursor-pointer transition-colors ${isSel ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
                              >
                                <span>{st.emoji}</span>
                                {st.label}
                                <span className="text-[8px] opacity-70">
                                  ×2
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Other platforms - add button */}
          <div>
            <p className="ui-label mt-4 mb-2">Добавить платформу</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PLATFORM_META)
                .filter(([key]) => !connectedKeys.has(key))
                .map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setConnectModal(key)}
                    className="flex items-center gap-2 p-3 border border-line rounded-[9px] hover:border-line-strong cursor-pointer transition-colors hover:bg-hover text-left"
                  >
                    <PlatformLogo
                      abbr={meta.abbr}
                      color={meta.color}
                      textColor={(meta as any).textColor}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-tx-1 truncate">
                        {meta.name}
                      </p>
                      <p className="text-[9px] text-accent">+ Подключить</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ← Назад
            </button>
            <button
              onClick={() => {
                if (selectedPlatforms.size === 0) {
                  setError("Выберите платформу");
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
            >
              Далее: Креативы →
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Creatives ══ */}
      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 p-3 bg-chip/30 rounded-[9px] flex-1 mr-3">
              <span className="text-[16px]">✦</span>
              <div>
                <p className="text-[11px] font-medium text-tx-1">
                  AI генерирует реальные тексты для каждого типа
                </p>
                <p className="text-[10px] text-tx-3">
                  Удалите что не нравится — остальное попадёт в кампанию
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                setGenerating(true);
                const creatives: any[] = [];
                for (const platformKey of selectedPlatforms) {
                  const rp = realPlatforms.find((p) => p.key === platformKey);
                  const subs = selectedSubtypes[platformKey] ?? new Set();
                  for (const subtype of subs) {
                    for (let i = 0; i < 2; i++) {
                      try {
                        const content = await generateCreativeContent({
                          platform: platformKey,
                          subtype,
                          product:
                            product ||
                            (activeProject as any)?.description ||
                            "",
                          goal,
                          audience,
                          projectName: (activeProject as any)?.name ?? name,
                        });
                        creatives.push({
                          id: `${platformKey}__${subtype}__${Date.now()}__${i}`,
                          platform: platformKey,
                          subtype,
                          ...content,
                          rp,
                        });
                      } catch {}
                    }
                  }
                }
                setGeneratedCreatives(creatives);
                setGenerating(false);
              }}
              disabled={generating}
              className="px-4 py-2.5 bg-accent text-on-accent text-[11px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
            >
              {generating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Генерирую...
                </>
              ) : (
                <>
                  ✦{" "}
                  {generatedCreatives.length > 0
                    ? "Перегенерировать"
                    : "Сгенерировать"}
                </>
              )}
            </button>
          </div>

          {/* Platform filter */}
          {generatedCreatives.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setCreativePlatformFilter("all")}
                className={`px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${creativePlatformFilter === "all" ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
              >
                Все · {generatedCreatives.length}
              </button>
              {[...selectedPlatforms].map((key) => {
                const rp = realPlatforms.find((p) => p.key === key);
                const count = generatedCreatives.filter(
                  (c) => c.platform === key,
                ).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setCreativePlatformFilter(key)}
                    style={
                      creativePlatformFilter === key
                        ? {
                            background: rp?.color,
                            color: rp?.textColor ?? "#fff",
                            borderColor: rp?.color,
                          }
                        : {}
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${creativePlatformFilter !== key ? "border-line text-tx-3 hover:bg-hover" : ""}`}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 10,
                        borderRadius: 2,
                        background:
                          creativePlatformFilter === key
                            ? "rgba(255,255,255,0.3)"
                            : (rp?.color ?? "#888"),
                        color: "#fff",
                        fontSize: 7,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {rp?.abbr ?? "?"}
                    </div>
                    {rp?.name.split(" ")[0] ?? key} · {count}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!generating && generatedCreatives.length === 0 && (
            <div className="ui-surface flex flex-col items-center py-16 text-center">
              <span className="text-[40px] mb-3">✦</span>
              <p className="text-[13px] font-medium text-tx-1 mb-2">
                Нажмите «Сгенерировать»
              </p>
              <p className="text-[11px] text-tx-3 max-w-[280px] leading-relaxed">
                AI создаст реальные тексты постов для каждого типа и платформы
              </p>
            </div>
          )}

          {/* Loading */}
          {generating && (
            <div className="ui-surface flex flex-col items-center py-16 text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[13px] font-medium text-tx-1 mb-2">
                AI создаёт креативы...
              </p>
              <p className="text-[11px] text-tx-3">
                Генерирую тексты для {[...selectedPlatforms].length} платформ
              </p>
            </div>
          )}

          {/* Grid - horizontal 4 columns */}
          {!generating && generatedCreatives.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {generatedCreatives
                .filter(
                  (c) =>
                    creativePlatformFilter === "all" ||
                    c.platform === creativePlatformFilter,
                )
                .map((c, idx) => {
                  const rp = realPlatforms.find((p) => p.key === c.platform);
                  const meta = PLATFORM_META[c.platform];
                  const color = rp?.color ?? meta?.color ?? "#333";
                  const abbr = rp?.abbr ?? meta?.abbr ?? "?";
                  const emojiMap: Record<string, string> = {
                    post: "📝",
                    video: "🎬",
                    ad: "📣",
                    reels: "🎬",
                    stories: "⭕",
                    feed: "📱",
                    search: "🔍",
                    rsya: "📊",
                    display: "🖼",
                    banner: "🖼",
                  };
                  return (
                    <div
                      key={c.id}
                      className="ui-surface overflow-hidden flex flex-col"
                    >
                      <div
                        className="h-14 flex items-center justify-center relative flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${color}, #111)`,
                        }}
                      >
                        <span className="text-[24px]">
                          {emojiMap[c.subtype] ?? "📝"}
                        </span>
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <div
                            style={{
                              width: 18,
                              height: 13,
                              borderRadius: 2,
                              background: color,
                              color: "#fff",
                              fontSize: 7,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0.85,
                            }}
                          >
                            {abbr}
                          </div>
                          <span className="text-[8px] text-white/70">
                            {c.subtype}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setGeneratedCreatives((prev) =>
                              prev.filter((cr) => cr.id !== c.id),
                            )
                          }
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-3 flex-1 flex flex-col min-h-0">
                        <p className="text-[11px] font-semibold text-tx-1 mb-1 leading-tight">
                          {c.title}
                        </p>
                        {c.hook && (
                          <p className="text-[10px] text-accent mb-1.5 italic leading-snug">
                            {c.hook}
                          </p>
                        )}
                        <p className="text-[10px] text-tx-2 leading-relaxed line-clamp-3">
                          {c.caption}
                        </p>
                      </div>
                      <div className="border-t border-line flex flex-shrink-0">
                        <button
                          onClick={() =>
                            setScheduleModal({
                              creativeId: c.id,
                              platform: c.platform,
                              title: c.title,
                            })
                          }
                          className="flex-1 py-1.5 text-[9px] text-tx-2 hover:bg-hover cursor-pointer border-r border-line text-center"
                        >
                          📅 Запланировать
                        </button>
                        <button className="flex-1 py-1.5 text-[9px] text-tx-2 hover:bg-hover cursor-pointer text-center">
                          🚀 Сейчас
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ← Назад
            </button>
            <div className="flex gap-2">
              {generatedCreatives.length > 0 && (
                <button
                  onClick={() => setShowBulkSchedule(true)}
                  className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer flex items-center gap-1.5"
                >
                  📅 Запланировать всё
                </button>
              )}
              <button
                onClick={() => {
                  if (generatedCreatives.length === 0) {
                    setError("Сначала сгенерируйте креативы");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
              >
                Далее: Запуск →
              </button>
            </div>
          </div>

          {showBulkSchedule && (
            <BulkScheduleModal
              creatives={generatedCreatives}
              onClose={() => setShowBulkSchedule(false)}
              onScheduled={() => setShowBulkSchedule(false)}
            />
          )}
        </div>
      )}

      {/* ══ STEP 3: Launch ══ */}
      {step === 3 && (
        <div>
          <div className="ui-surface p-4 mb-4 space-y-2">
            {[
              { l: "Название", v: name },
              { l: "Проект", v: (activeProject as any)?.name ?? "—" },
              { l: "Цель", v: goal },
              {
                l: "Платформы",
                v:
                  [...selectedPlatforms]
                    .map(
                      (k) =>
                        realPlatforms.find((p) => p.key === k)?.name ??
                        PLATFORM_META[k]?.name ??
                        k,
                    )
                    .join(", ") || "—",
              },
              {
                l: "Бюджет",
                v: budget ? `₽${Number(budget).toLocaleString("ru")}` : "—",
              },
              { l: "Креативов", v: `${generatedCreatives.length} штук готово` },
            ].map((row) => (
              <div
                key={row.l}
                className="flex gap-3 text-[11px] py-1.5 border-b border-line last:border-0"
              >
                <span className="w-24 text-tx-3 flex-shrink-0">{row.l}</span>
                <span className="font-medium text-tx-1">{row.v}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-chip/30 rounded-[9px] mb-5 flex items-start gap-2">
            <span>✦</span>
            <p className="text-[11px] text-tx-2">
              После запуска кампания станет активной, а{" "}
              {generatedCreatives.length} креативов сохранятся в библиотеке. На
              странице кампании можно запланировать публикации.
            </p>
          </div>

          {launchProgress && (
            <div className="flex items-center gap-3 p-3 bg-accent-dim border border-accent/20 rounded-[9px] mb-4">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-[11px] text-accent">{launchProgress}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ← Назад
            </button>
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-6 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-60"
            >
              {launching ? "⟳ Генерирую..." : "🚀 Запустить и сгенерировать"}
            </button>
          </div>
        </div>
      )}

      {/* Connect platform modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setConnectModal(null)}
          />
          <div className="relative w-full max-w-[400px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Подключить {PLATFORM_META[connectModal]?.name}
              </h2>
              <button
                onClick={() => setConnectModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
              >
                ✕
              </button>
            </div>
            {connectModal === "instagram" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-tx-3 bg-panel-2 border border-line rounded-[8px] p-3 leading-relaxed">
                  Instagram подключается через официальный OAuth. Нужен Business
                  или Creator аккаунт.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      const appId =
                        process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
                      const redirectUri =
                        process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ?? "";
                      const params = new URLSearchParams({
                        client_id: appId,
                        redirect_uri: redirectUri,
                        scope:
                          "instagram_business_basic,instagram_business_content_publish",
                        response_type: "code",
                      });
                      window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
                    }}
                    style={{ background: "#E1306C" }}
                    className="flex-1 py-2.5 text-white text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer border-none"
                  >
                    Подключить через Instagram
                  </button>
                </div>
              </div>
            ) : connectModal === "telegram" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-tx-3 bg-panel-2 border border-line rounded-[8px] p-3 leading-relaxed">
                  Добавь бота{" "}
                  <strong className="text-tx-1">
                    @{process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot"}
                  </strong>{" "}
                  как администратора канала, затем введи username
                </p>
                <div>
                  <label className="block ui-label mb-1">Username канала</label>
                  <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="@mychannel"
                    className={inp}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      if (!tokenInput.trim()) return;
                      setConnectingPlatform(true);
                      try {
                        const res = await fetch("/api/telegram/add-channel", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            channelUsername: tokenInput.replace("@", ""),
                          }),
                        });
                        if (res.ok) {
                          await refetchPlatforms();
                          setConnectModal(null);
                          setTokenInput("");
                        }
                      } finally {
                        setConnectingPlatform(false);
                      }
                    }}
                    disabled={connectingPlatform}
                    className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] cursor-pointer disabled:opacity-50"
                  >
                    {connectingPlatform ? "..." : "Добавить"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-tx-3 bg-panel-2 border border-line rounded-[8px] p-3 leading-relaxed">
                  Введите токен доступа от рекламного кабинета. Токен можно
                  получить в настройках API платформы.
                </p>
                <div>
                  <label className="block ui-label mb-1">Access Token</label>
                  <input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Вставьте токен..."
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block ui-label mb-1">
                    ID кабинета (необязательно)
                  </label>
                  <input
                    value={accountIdInput}
                    onChange={(e) => setAccountIdInput(e.target.value)}
                    placeholder="account_12345"
                    className={inp}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectModal(null)}
                    className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConnectPlatform}
                    disabled={connectingPlatform}
                    className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {connectingPlatform ? "Подключение..." : "Подключить"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setScheduleModal(null)}
          />
          <div className="relative w-full max-w-[380px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Запланировать
              </h2>
              <button
                onClick={() => setScheduleModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-tx-3 mb-4">
              {scheduleModal.title} · {scheduleModal.platform}
            </p>
            <div className="mb-4">
              <label className="block ui-label mb-1">Дата и время</label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className={inp}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleModal(null)}
                className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleScheduleCreative}
                disabled={!scheduleTime || scheduling}
                className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {scheduling ? "..." : "📅 Запланировать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
