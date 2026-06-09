"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { PLATFORM_META } from "./data";
import {
  useCreateAdCampaign,
  useCreateAdCreative,
} from "@/lib/hooks/useAdsData";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Цель", "Платформы", "Креативы", "Запуск"];

// Fix 8: Content subtypes per platform
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

// Fix 9: Three content modes
const CONTENT_MODES = [
  { value: "text", label: "📝 Текст", desc: "Посты, объявления, копирайт" },
  { value: "image", label: "🖼 Картинка", desc: "Баннеры, изображения" },
  { value: "video", label: "🎬 Видео", desc: "Сценарии, слайдшоу" },
];

// Fix 16: Campaign templates
const CAMPAIGN_TEMPLATES = [
  {
    id: "launch",
    label: "🚀 Запуск продукта",
    goal: "Продажи / заявки",
    desc: "Анонс нового продукта или услуги",
  },
  {
    id: "seasonal",
    label: "🎁 Сезонная акция",
    goal: "Продажи / заявки",
    desc: "Акция к празднику или сезону",
  },
  {
    id: "subs",
    label: "👥 Рост подписчиков",
    goal: "Подписчики",
    desc: "Привлечение новой аудитории",
  },
  {
    id: "traffic",
    label: "🌐 Трафик на сайт",
    goal: "Трафик на сайт",
    desc: "Переходы на сайт или лендинг",
  },
  {
    id: "retarget",
    label: "🎯 Ретаргетинг",
    goal: "Продажи / заявки",
    desc: "Возврат посетителей сайта",
  },
  {
    id: "brand",
    label: "⭐ Брендинг",
    goal: "Охват",
    desc: "Узнаваемость бренда",
  },
];

const CREATIVE_VARIANTS = [
  {
    emoji: "🌙",
    title: "«Праздничный оффер»",
    desc: "Акцент на скидке и дедлайне",
  },
  { emoji: "✨", title: "«Качество + цена»", desc: "Преимущества продукта" },
  { emoji: "🎁", title: "«UGC-стиль»", desc: "Отзыв от лица покупателя" },
  { emoji: "🏠", title: "«Польза / лайфхак»", desc: "Проблема → решение" },
  { emoji: "⭐", title: "«Прямой CTA»", desc: "Короткий и конкретный призыв" },
];

const STORAGE_KEY = "wizard_draft_v1";

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}
function saveDraft(data: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function WizardView({
  onClose,
  projectId: defaultProjectId,
}: {
  onClose?: () => void;
  projectId?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const createCampaign = useCreateAdCampaign();
  const createCreative = useCreateAdCreative();

  // Fix 7: Load from localStorage
  const draft = loadDraft();

  const [step, setStep] = useState(0);
  const [contentMode, setContentMode] = useState<"text" | "image" | "video">(
    "text",
  );
  const [name, setName] = useState(draft?.name ?? "");
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
  const [platformSubtypes, setPlatformSubtypes] = useState<
    Record<string, string>
  >(draft?.subtypes ?? {});
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(
    new Set(draft?.creatives ?? []),
  );
  const [creativePlatformFilter, setCreativePlatformFilter] = useState("all");
  const [launching, setLaunching] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [autoSaved, setAutoSaved] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Fix 5: Projects query
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name,niche,description,audience,tone")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: connectedPlatforms = [] } = useQuery({
    queryKey: ["ad_platforms_wizard"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_platforms")
        .select("platform_key")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return (data ?? []).map((p: any) => p.platform_key);
    },
  });

  // Fix 4,7: Auto-save to localStorage whenever form changes
  useEffect(() => {
    if (!name && !product) return; // don't save empty
    const data = {
      name,
      goal,
      product,
      audience,
      budget,
      projectId,
      platforms: [...selectedPlatforms],
      subtypes: platformSubtypes,
      creatives: [...selectedCreatives],
    };
    saveDraft(data);
    setAutoSaved(true);
    const t = setTimeout(() => setAutoSaved(false), 1500);
    return () => clearTimeout(t);
  }, [
    name,
    goal,
    product,
    audience,
    budget,
    projectId,
    selectedPlatforms,
    platformSubtypes,
    selectedCreatives,
  ]);

  // Fix 6: Auto-fill from project
  const handleProjectSelect = (pid: string) => {
    setProjectId(pid);
    const project = projects.find((p: any) => p.id === pid);
    if (!project) return;
    if (project.description && !product) setProduct(project.description);
    if (project.audience && !audience) setAudience(project.audience);
  };

  // Fix 16: Apply template
  const applyTemplate = (tpl: (typeof CAMPAIGN_TEMPLATES)[0]) => {
    setGoal(tpl.goal);
    if (!name) setName(tpl.label.replace(/^[^\s]+ /, ""));
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleCreative = (id: string) => {
    setSelectedCreatives((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Fix 5: Save draft to Supabase
  const saveToDraft = async () => {
    if (!name.trim()) {
      setError("Введите название");
      return;
    }
    setSavingDraft(true);
    try {
      await createCampaign.mutateAsync({
        name,
        goal,
        description: product,
        platforms: [...selectedPlatforms],
        status: "draft",
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
      clearDraft();
      router.push(`/${locale}/campaigns?tab=campaigns`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingDraft(false);
    }
  };

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
      for (const cId of selectedCreatives) {
        const [platformKey, idx] = cId.split("-");
        const variant = CREATIVE_VARIANTS[Number(idx)];
        if (variant) {
          await createCreative.mutateAsync({
            campaign_id: campaign.id,
            project_id: projectId || undefined,
            platform: platformKey,
            format: platformSubtypes[platformKey] ?? "post",
            title: variant.title,
            caption: variant.desc,
            status: "draft",
            ai_generated: true,
            ctr: 0,
            impressions: 0,
            clicks: 0,
            is_winner: false,
          });
        }
      }
      clearDraft();
      router.push(`/${locale}/campaigns/${campaign.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLaunching(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  // Fix 8: filter creatives by platform
  const filteredPlatformsForCreatives =
    creativePlatformFilter === "all"
      ? [...selectedPlatforms]
      : [creativePlatformFilter];

  return (
    <div>
      {/* Step bar */}
      <div className="flex items-center gap-1 bg-panel-2 border border-line rounded-[9px] p-2.5 mb-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${step === i ? "bg-accent text-on-accent" : step > i ? "bg-chip text-pos" : "bg-panel text-tx-3"}`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${step === i ? "bg-white/20 text-on-accent" : step > i ? "bg-pos text-white" : "border border-line text-tx-3"}`}
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
      </div>

      {error && (
        <p className="text-[11px] text-neg bg-panel-2 border border-line rounded-[8px] px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ── STEP 0: Goal ── */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            {/* Fix 5: Project selector */}
            <div>
              <label className="block ui-label mb-2">Проект</label>
              <div className="space-y-1.5">
                {projects.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleProjectSelect(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[8px] border cursor-pointer text-left transition-colors ${projectId === p.id ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-chip flex items-center justify-center text-[11px] font-semibold text-tx-2 flex-shrink-0">
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-tx-1">
                        {p.name}
                      </p>
                      {p.niche && (
                        <p className="text-[10px] text-tx-3">{p.niche}</p>
                      )}
                    </div>
                    {projectId === p.id && (
                      <span className="text-accent text-[12px]">✓</span>
                    )}
                  </button>
                ))}
                {projects.length === 0 && (
                  <p className="text-[11px] text-tx-3">Нет проектов</p>
                )}
              </div>
            </div>

            <div>
              <label className="block ui-label mb-1">Название *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Ramadan акция 2026"
                className={inp}
              />
            </div>

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

            <div>
              <label className="block ui-label mb-1">О продукте — для AI</label>
              <textarea
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Опишите продукт, преимущества, акции..."
                className={`${inp} resize-none h-16`}
              />
            </div>

            <div>
              <label className="block ui-label mb-1">Целевая аудитория</label>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Возраст, интересы, гео..."
                className={`${inp} resize-none h-14`}
              />
            </div>

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

          <div className="space-y-4">
            {/* Fix 9: Content mode */}
            <div>
              <label className="block ui-label mb-2">Тип генерации</label>
              <div className="space-y-2">
                {CONTENT_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setContentMode(m.value as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border cursor-pointer text-left transition-colors ${contentMode === m.value ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                  >
                    <span className="text-[16px]">{m.label.split(" ")[0]}</span>
                    <div>
                      <p className="text-[12px] font-medium text-tx-1">
                        {m.label.split(" ").slice(1).join(" ")}
                      </p>
                      <p className="text-[10px] text-tx-3">{m.desc}</p>
                    </div>
                    {contentMode === m.value && (
                      <span className="ml-auto text-accent text-[12px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Image mode */}
            {contentMode === "image" && (
              <div>
                <label className="block ui-label mb-2">Фото продукта</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageFile(f);
                    const r = new FileReader();
                    r.onload = (ev) =>
                      setImagePreview(ev.target?.result as string);
                    r.readAsDataURL(f);
                  }}
                  style={{ display: "none" }}
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt=""
                      className="w-full h-32 object-cover rounded-[8px]"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
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
                    <span className="text-[24px]">📸</span>
                    <span className="text-[11px] text-tx-3">
                      Загрузить фото продукта
                    </span>
                    <span className="text-[10px] text-tx-3">
                      или AI опишет по тексту выше
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Video mode */}
            {contentMode === "video" && (
              <div>
                <label className="block ui-label mb-2">
                  Фото для видео (слайдшоу)
                </label>
                <input
                  ref={videoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setVideoFiles(Array.from(e.target.files ?? []))
                  }
                  style={{ display: "none" }}
                />
                {videoFiles.length > 0 ? (
                  <div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {videoFiles.map((f, i) => (
                        <div
                          key={i}
                          className="text-[10px] text-tx-2 bg-chip px-2 py-1 rounded"
                        >
                          📷 {f.name.slice(0, 12)}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setVideoFiles([])}
                      className="text-[10px] text-neg cursor-pointer"
                    >
                      Очистить
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => videoRef.current?.click()}
                    className="w-full py-8 border border-dashed border-line hover:border-line-strong rounded-[8px] flex flex-col items-center gap-2 cursor-pointer hover:bg-hover transition-colors"
                  >
                    <span className="text-[24px]">🎬</span>
                    <span className="text-[11px] text-tx-3">
                      Загрузите фото для слайдшоу
                    </span>
                    <span className="text-[10px] text-tx-3">
                      или AI создаст сценарий по описанию
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Fix 16: Templates */}
            <div>
              <label className="block ui-label mb-2">Шаблоны</label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left px-3 py-2 border border-line rounded-[8px] hover:border-line-strong cursor-pointer hover:bg-hover transition-colors"
                  >
                    <p className="text-[11px] font-medium text-tx-1">
                      {t.label}
                    </p>
                    <p className="text-[9px] text-tx-3 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-2 flex justify-end gap-2">
            <button
              onClick={saveToDraft}
              disabled={savingDraft}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer disabled:opacity-50"
            >
              {savingDraft ? "Сохранение..." : "💾 Черновик"}
            </button>
            <button
              onClick={() => {
                if (!name.trim()) {
                  setError("Введите название");
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

      {/* ── STEP 1: Platforms ── */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[12px] text-tx-2">
            Выберите платформы. Нажмите на подтип чтобы уточнить формат.
          </p>
          {Object.entries(PLATFORM_META).map(([key, meta]) => {
            const sel = selectedPlatforms.has(key);
            const isConnected = connectedPlatforms.includes(key);
            const subtypes = PLATFORM_SUBTYPES[key] ?? [];
            const selectedSubtype = platformSubtypes[key] ?? "";
            return (
              <div
                key={key}
                className={`border rounded-[9px] transition-colors ${sel ? "border-pos/50 bg-chip/30" : "border-line"}`}
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => togglePlatform(key)}
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[9px] flex-shrink-0 transition-colors ${sel ? "bg-accent border-accent text-on-accent" : "border-line-strong"}`}
                  >
                    {sel && "✓"}
                  </div>
                  <PlatformLogo
                    abbr={meta.abbr}
                    color={meta.color}
                    textColor={meta.textColor}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-tx-1">
                        {meta.name}
                      </p>
                      {isConnected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">
                          Подключён
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-tx-3 mt-0.5">
                      {subtypes.length} форматов
                    </p>
                  </div>
                </div>
                {/* Fix 8: Subtypes */}
                {sel && subtypes.length > 0 && (
                  <div className="px-3 pb-3 flex gap-2 flex-wrap">
                    {subtypes.map((st) => (
                      <button
                        key={st.value}
                        onClick={() =>
                          setPlatformSubtypes((prev) => ({
                            ...prev,
                            [key]: st.value,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-full text-[10px] border cursor-pointer transition-colors ${selectedSubtype === st.value ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-between pt-2">
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

      {/* ── STEP 2: Creatives ── */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 p-3 bg-chip/30 rounded-[9px] mb-4">
            <span className="text-[16px]">✦</span>
            <div>
              <p className="text-[11px] font-medium text-tx-1">
                AI генерирует варианты для {selectedPlatforms.size} платформ
              </p>
              <p className="text-[10px] text-tx-3">
                По 5 концептов — выберите лучшие
              </p>
            </div>
          </div>

          {/* Fix 6: Platform filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setCreativePlatformFilter("all")}
              className={`px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${creativePlatformFilter === "all" ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
            >
              Все
            </button>
            {[...selectedPlatforms].map((key) => {
              const pm = PLATFORM_META[key];
              return pm ? (
                <button
                  key={key}
                  onClick={() => setCreativePlatformFilter(key)}
                  style={
                    creativePlatformFilter === key
                      ? {
                          background: pm.color,
                          color: pm.textColor ?? "#fff",
                          borderColor: pm.color,
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
                          : pm.color,
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
                  {pm.name.split(" ")[0]}
                </button>
              ) : null;
            })}
          </div>

          {filteredPlatformsForCreatives.map((platformKey) => {
            const pm = PLATFORM_META[platformKey];
            if (!pm) return null;
            const subtype = platformSubtypes[platformKey];
            return (
              <div key={platformKey} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <PlatformLogo
                    abbr={pm.abbr}
                    color={pm.color}
                    textColor={pm.textColor}
                  />
                  <p className="text-[12px] font-semibold text-tx-1">
                    {pm.name}
                  </p>
                  {subtype && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-chip text-tx-2">
                      {
                        PLATFORM_SUBTYPES[platformKey]?.find(
                          (s) => s.value === subtype,
                        )?.label
                      }
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CREATIVE_VARIANTS.map((v, i) => {
                    const cId = `${platformKey}-${i}`;
                    const sel = selectedCreatives.has(cId);
                    return (
                      <div
                        key={cId}
                        onClick={() => toggleCreative(cId)}
                        className={`p-2 border rounded-[8px] cursor-pointer transition-colors ${sel ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                      >
                        <div
                          className="h-12 rounded-[5px] flex items-center justify-center text-[20px] mb-2 relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${pm.color}, #111)`,
                          }}
                        >
                          {sel && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-accent text-[16px] font-bold">
                              ✓
                            </div>
                          )}
                          {v.emoji}
                        </div>
                        <p className="text-[9px] font-medium text-tx-1 leading-tight mb-0.5">
                          {v.title}
                        </p>
                        <p className="text-[8px] text-tx-3">{v.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ← Назад
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
            >
              Далее: Запуск →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Launch ── */}
      {step === 3 && (
        <div>
          <div className="ui-surface p-4 mb-4 space-y-2">
            {[
              { l: "Название", v: name },
              {
                l: "Проект",
                v: projects.find((p: any) => p.id === projectId)?.name ?? "—",
              },
              { l: "Цель", v: goal },
              {
                l: "Тип генерации",
                v: { text: "Текст", image: "Картинка", video: "Видео" }[
                  contentMode
                ],
              },
              {
                l: "Платформы",
                v:
                  [...selectedPlatforms]
                    .map((k) => PLATFORM_META[k]?.name ?? k)
                    .join(", ") || "—",
              },
              {
                l: "Бюджет",
                v: budget ? `₽${Number(budget).toLocaleString("ru")}` : "—",
              },
              {
                l: "Выбрано креативов",
                v: `${selectedCreatives.size} вариантов`,
              },
            ].map((row) => (
              <div
                key={row.l}
                className="flex gap-3 text-[11px] py-1.5 border-b border-line last:border-0"
              >
                <span className="w-28 text-tx-3 flex-shrink-0">{row.l}</span>
                <span className="font-medium text-tx-1">{row.v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-chip/30 rounded-[9px] mb-4">
            <span>✦</span>
            <p className="text-[11px] text-tx-2">
              После запуска откроется страница кампании — там запланируйте
              публикации
            </p>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ← Назад
            </button>
            <div className="flex gap-2">
              <button
                onClick={saveToDraft}
                disabled={savingDraft}
                className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer disabled:opacity-50"
              >
                {savingDraft ? "Сохранение..." : "💾 Черновик"}
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="px-6 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {launching ? "⟳ Создаю..." : "🚀 Запустить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
