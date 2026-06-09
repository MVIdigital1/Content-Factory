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

const STORAGE_KEY = "wizard_draft_v2";
function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}
function saveDraft(d: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── Animated Dropdown ────────────────────────────────────────────────────────
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
    <div className="border border-line rounded-[9px] overflow-hidden transition-all">
      <button
        onClick={onToggle}
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-panel hover:bg-hover transition-colors cursor-pointer text-left"
      >
        {icon && <span>{icon}</span>}
        <span className="flex-1 text-[12px] font-medium text-tx-1">
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
  const qc = useQueryClient();
  const createCampaign = useCreateAdCampaign();
  const createCreative = useCreateAdCreative();

  const draft = loadDraft();

  // Generation mode
  const [genMode, setGenMode] = useState<"text" | "image" | "video">("text");

  // Form state
  const [step, setStep] = useState(0);
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

  // Dropdowns
  const [projectOpen, setProjectOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  // Image/video uploads
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const imgRef = useRef<HTMLInputElement>(null);
  const productImgRef = useRef<HTMLInputElement>(null);

  // Create project inline
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectNiche, setNewProjectNiche] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const { data: projects = [], refetch: refetchProjects } = useQuery({
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

  const { data: existingCampaigns = [] } = useQuery({
    queryKey: ["ad_campaigns_for_clone"],
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

  const { data: connectedPlatforms = [] } = useQuery({
    queryKey: ["ad_platforms_keys"],
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

  // Autosave
  useEffect(() => {
    if (!name && !product) return;
    saveDraft({
      name,
      goal,
      product,
      audience,
      budget,
      projectId,
      platforms: [...selectedPlatforms],
      subtypes: platformSubtypes,
      creatives: [...selectedCreatives],
    });
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

  const handleProjectSelect = (pid: string) => {
    setProjectId(pid);
    setProjectOpen(false);
    const p = projects.find((p: any) => p.id === pid) as any;
    if (!p) return;
    if (p.description && !product) setProduct(p.description);
    if (p.audience && !audience) setAudience(p.audience);
  };

  const handleCloneCampaign = (c: any) => {
    setName(`${c.name} — копия`);
    setGoal(c.goal ?? "Продажи / заявки");
    setProduct(c.description ?? "");
    setBudget(c.budget_total ? String(c.budget_total) : "");
    setSelectedPlatforms(new Set(c.platforms ?? []));
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

  const handleImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImageFiles((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) =>
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const handleProductImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProductImage(f);
    const r = new FileReader();
    r.onload = (ev) => setProductImagePreview(ev.target?.result as string);
    r.readAsDataURL(f);
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

  const activeProject = projects.find((p: any) => p.id === projectId) as any;

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  return (
    <div>
      {/* Step bar */}
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
      </div>

      {error && (
        <p className="text-[11px] text-neg bg-panel-2 border border-line rounded-[8px] px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ══ STEP 0: Goal ══ */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-4">
            {/* Generation mode - FIRST */}
            <div>
              <label className="block ui-label mb-2">Тип генерации</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "text",
                      icon: "📝",
                      label: "Текст",
                      desc: "Посты, объявления",
                    },
                    {
                      value: "image",
                      icon: "🖼",
                      label: "Картинка",
                      desc: "Баннеры, изображения",
                    },
                    {
                      value: "video",
                      icon: "🎬",
                      label: "Видео",
                      desc: "Сценарии, слайдшоу",
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setGenMode(m.value)}
                    className={`flex flex-col items-center gap-1 p-3 border rounded-[9px] cursor-pointer transition-colors ${genMode === m.value ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                  >
                    <span className="text-[20px]">{m.icon}</span>
                    <span
                      className={`text-[11px] font-medium ${genMode === m.value ? "text-accent" : "text-tx-1"}`}
                    >
                      {m.label}
                    </span>
                    <span className="text-[9px] text-tx-3 text-center leading-tight">
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Show form only for text mode */}
            {genMode === "text" && (
              <>
                {/* Name */}
                <div>
                  <label className="block ui-label mb-1">Название *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Ramadan акция 2026"
                    className={inp}
                  />
                </div>

                {/* Project dropdown */}
                <div>
                  <label className="block ui-label mb-1">Проект</label>
                  <Dropdown
                    label={
                      activeProject ? activeProject.name : "Выберите проект"
                    }
                    icon={
                      activeProject ? (
                        <div className="w-5 h-5 rounded-full bg-chip flex items-center justify-center text-[10px] font-semibold text-tx-2">
                          {activeProject.name.slice(0, 1).toUpperCase()}
                        </div>
                      ) : (
                        "📁"
                      )
                    }
                    open={projectOpen}
                    onToggle={() => {
                      setProjectOpen(!projectOpen);
                      setCloneOpen(false);
                    }}
                  >
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {projects.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => handleProjectSelect(p.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-[7px] cursor-pointer transition-colors text-left ${projectId === p.id ? "bg-accent-dim" : "hover:bg-hover"}`}
                        >
                          <div className="w-6 h-6 rounded-full bg-chip flex items-center justify-center text-[10px] font-semibold text-tx-2 flex-shrink-0">
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
                        <p className="text-[11px] text-tx-3 px-2 py-1">
                          Нет проектов
                        </p>
                      )}
                    </div>

                    {/* Create project inline */}
                    <div className="border-t border-line mt-2 pt-2">
                      {showCreateProject ? (
                        <div className="space-y-2">
                          <input
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Название проекта"
                            className={inp}
                          />
                          <input
                            value={newProjectNiche}
                            onChange={(e) => setNewProjectNiche(e.target.value)}
                            placeholder="Ниша (необязательно)"
                            className={inp}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowCreateProject(false)}
                              className="flex-1 py-1.5 border border-line rounded-[7px] text-[11px] text-tx-3 hover:bg-hover cursor-pointer"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={handleCreateProject}
                              disabled={
                                creatingProject || !newProjectName.trim()
                              }
                              className="flex-1 py-1.5 bg-accent text-on-accent rounded-[7px] text-[11px] font-medium cursor-pointer disabled:opacity-50 hover:opacity-90"
                            >
                              {creatingProject ? "..." : "Создать"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCreateProject(true)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[7px] text-[11px] text-accent hover:bg-hover cursor-pointer transition-colors"
                        >
                          <Plus size={13} /> Создать новый проект
                        </button>
                      )}
                    </div>
                  </Dropdown>
                </div>

                {/* Clone campaign dropdown */}
                <div>
                  <label className="block ui-label mb-1">
                    Клонировать кампанию
                  </label>
                  <Dropdown
                    label="Выбрать существующую..."
                    icon="📋"
                    open={cloneOpen}
                    onToggle={() => {
                      setCloneOpen(!cloneOpen);
                      setProjectOpen(false);
                    }}
                  >
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {existingCampaigns.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => handleCloneCampaign(c)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-[7px] cursor-pointer hover:bg-hover transition-colors text-left"
                        >
                          <div className="flex gap-1 flex-shrink-0">
                            {(c.platforms ?? [])
                              .slice(0, 2)
                              .map((pid: string) => {
                                const pm = PLATFORM_META[pid];
                                return pm ? (
                                  <div
                                    key={pid}
                                    style={{
                                      width: 18,
                                      height: 13,
                                      borderRadius: 2,
                                      background: pm.color,
                                      color: pm.textColor ?? "#fff",
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
                          Нет созданных кампаний
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
                  <label className="block ui-label mb-1">
                    О продукте — для AI
                  </label>
                  <textarea
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Опишите продукт, преимущества, акции..."
                    className={`${inp} resize-none h-16`}
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="block ui-label mb-1">
                    Целевая аудитория
                  </label>
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
              </>
            )}

            {/* Image mode */}
            {genMode === "image" && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-[14px] font-semibold text-tx-1 mb-2">
                    Генерация картинок
                  </p>
                  <p className="text-[12px] text-tx-2 leading-relaxed">
                    Вставьте фото продуктов и получите сгенерированные баннеры,
                    <br />
                    или опишите продукт — AI создаст картинку на основе
                    бренд-информации
                  </p>
                </div>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFiles}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => imgRef.current?.click()}
                  className="w-full py-10 border border-dashed border-line hover:border-line-strong rounded-[9px] flex flex-col items-center gap-3 cursor-pointer hover:bg-hover transition-colors"
                >
                  <span className="text-[36px]">📸</span>
                  <span className="text-[12px] font-medium text-tx-1">
                    Загрузите фото продукта
                  </span>
                  <span className="text-[10px] text-tx-3">
                    JPG, PNG до 10MB каждый
                  </span>
                </button>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt=""
                          className="w-full h-20 object-cover rounded-[7px]"
                        />
                        <button
                          onClick={() => {
                            setImageFiles((f) => f.filter((_, j) => j !== i));
                            setImagePreviews((p) =>
                              p.filter((_, j) => j !== i),
                            );
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block ui-label mb-1">
                    Или опишите продукт
                  </label>
                  <textarea
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Опишите продукт для генерации картинки..."
                    className={`${inp} resize-none h-16`}
                  />
                </div>
              </div>
            )}

            {/* Video mode */}
            {genMode === "video" && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-[14px] font-semibold text-tx-1 mb-2">
                    Генерация видео
                  </p>
                  <p className="text-[12px] text-tx-2 leading-relaxed">
                    Загрузите несколько фото — AI создаст слайдшоу-видео,
                    <br />
                    или опишите идею — AI напишет сценарий для съёмки
                  </p>
                </div>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFiles}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => imgRef.current?.click()}
                  className="w-full py-10 border border-dashed border-line hover:border-line-strong rounded-[9px] flex flex-col items-center gap-3 cursor-pointer hover:bg-hover transition-colors"
                >
                  <span className="text-[36px]">🎬</span>
                  <span className="text-[12px] font-medium text-tx-1">
                    Загрузите фото для слайдшоу
                  </span>
                  <span className="text-[10px] text-tx-3">
                    Несколько фото → видео с переходами
                  </span>
                </button>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt=""
                          className="w-full h-16 object-cover rounded-[6px]"
                        />
                        <div className="absolute bottom-1 left-1 w-4 h-4 bg-black/60 text-white rounded flex items-center justify-center text-[8px]">
                          {i + 1}
                        </div>
                        <button
                          onClick={() => {
                            setImageFiles((f) => f.filter((_, j) => j !== i));
                            setImagePreviews((p) =>
                              p.filter((_, j) => j !== i),
                            );
                          }}
                          className="absolute top-1 right-1 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center text-[8px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block ui-label mb-1">
                    Или опишите идею видео
                  </label>
                  <textarea
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Опишите о чём должно быть видео..."
                    className={`${inp} resize-none h-16`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {genMode === "text" && (
              <div>
                <label className="block ui-label mb-2">
                  Фото продукта (для AI)
                </label>
                <input
                  ref={productImgRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductImage}
                  style={{ display: "none" }}
                />
                {productImagePreview ? (
                  <div className="relative">
                    <img
                      src={productImagePreview}
                      alt=""
                      className="w-full h-48 object-cover rounded-[9px]"
                    />
                    <button
                      onClick={() => {
                        setProductImage(null);
                        setProductImagePreview(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-[12px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => productImgRef.current?.click()}
                    className="w-full h-48 border border-dashed border-line hover:border-line-strong rounded-[9px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-hover transition-colors"
                  >
                    <span className="text-[36px]">📸</span>
                    <span className="text-[12px] font-medium text-tx-1">
                      Загрузите фото продукта
                    </span>
                    <span className="text-[10px] text-tx-3">
                      AI создаст все форматы креативов
                    </span>
                  </button>
                )}
                <div className="mt-3 p-3 bg-chip/40 rounded-[8px] flex items-start gap-2">
                  <span className="text-[14px] flex-shrink-0">✦</span>
                  <p className="text-[11px] text-tx-2 leading-relaxed">
                    <strong>AI готов</strong> — получит контекст и сгенерирует
                    3-5 вариантов на каждую платформу
                  </p>
                </div>
              </div>
            )}

            {/* Image/video: generated results */}
            {(genMode === "image" || genMode === "video") &&
              generatedImages.length > 0 && (
                <div>
                  <label className="block ui-label mb-3">Результат</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {generatedImages.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="w-full h-32 object-cover rounded-[7px]"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer">
                      ↓ Скачать ZIP
                    </button>
                    <button className="flex-1 py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer">
                      ↓ По одному
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Bottom buttons */}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            {genMode === "text" && (
              <>
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
              </>
            )}
            {(genMode === "image" || genMode === "video") && (
              <button
                disabled={generating}
                className="px-6 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {generating
                  ? "⟳ Генерирую..."
                  : `✦ Сгенерировать ${genMode === "image" ? "картинки" : "видео"}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ STEP 1: Platforms ══ */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[12px] text-tx-2 mb-4">
            Выберите платформы. Нажмите на подтип чтобы уточнить формат.
          </p>
          {Object.entries(PLATFORM_META).map(([key, meta]) => {
            const sel = selectedPlatforms.has(key);
            const isConn = connectedPlatforms.includes(key);
            const subtypes = PLATFORM_SUBTYPES[key] ?? [];
            const selSub = platformSubtypes[key] ?? "";
            return (
              <div
                key={key}
                className={`border rounded-[9px] transition-colors overflow-hidden ${sel ? "border-pos/40" : "border-line"}`}
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-hover transition-colors"
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
                      {isConn && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chip text-pos">
                          Подключён
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-tx-3">
                      {subtypes.length} форматов
                    </p>
                  </div>
                </div>
                {sel && subtypes.length > 0 && (
                  <div className="px-3 pb-3 pt-1 flex gap-2 flex-wrap border-t border-line bg-panel-2">
                    {subtypes.map((st) => (
                      <button
                        key={st.value}
                        onClick={() =>
                          setPlatformSubtypes((prev) => ({
                            ...prev,
                            [key]: st.value,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-full text-[10px] border cursor-pointer transition-colors ${selSub === st.value ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
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

      {/* ══ STEP 2: Creatives ══ */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 p-3 bg-chip/30 rounded-[9px] mb-4">
            <span className="text-[16px]">✦</span>
            <div>
              <p className="text-[11px] font-medium text-tx-1">
                AI генерирует варианты для {selectedPlatforms.size} платформ
              </p>
              <p className="text-[10px] text-tx-3">
                По 5 концептов на каждую — выберите лучшие
              </p>
            </div>
          </div>

          {/* Platform filter */}
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

          {(creativePlatformFilter === "all"
            ? [...selectedPlatforms]
            : [creativePlatformFilter]
          ).map((platformKey) => {
            const pm = PLATFORM_META[platformKey];
            if (!pm) return null;
            const sub = platformSubtypes[platformKey];
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
                  {sub && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-chip text-tx-2">
                      {
                        PLATFORM_SUBTYPES[platformKey]?.find(
                          (s) => s.value === sub,
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

      {/* ══ STEP 3: Launch ══ */}
      {step === 3 && (
        <div>
          <div className="ui-surface p-4 mb-4 space-y-2">
            {[
              { l: "Название", v: name },
              { l: "Проект", v: activeProject?.name ?? "—" },
              {
                l: "Тип",
                v: { text: "Текст", image: "Картинка", video: "Видео" }[
                  genMode
                ],
              },
              { l: "Цель", v: goal },
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
              { l: "Креативов", v: `${selectedCreatives.size} вариантов` },
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
          <div className="flex items-center gap-2 p-3 bg-chip/30 rounded-[9px] mb-5">
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
