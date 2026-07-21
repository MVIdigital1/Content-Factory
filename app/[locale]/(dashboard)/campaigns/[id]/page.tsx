"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { ChevronLeft, Copy, Clock } from "lucide-react";

const SOCIAL_KEYS = ["instagram", "telegram", "tiktok", "youtube"];
const AD_KEYS = ["meta", "google", "yandex"];

const PLATFORM_META: Record<
  string,
  { color: string; textColor?: string; abbr: string; name: string }
> = {
  yandex:    { color: "#FFDB4D", textColor: "#664400", abbr: "Я",  name: "Яндекс Директ" },
  vk:        { color: "#0077FF", abbr: "VK", name: "VK Реклама" },
  telegram:  { color: "#0088CC", abbr: "TG", name: "Telegram Ads" },
  mytarget:  { color: "#FF6600", abbr: "MT", name: "myTarget" },
  google:    { color: "#34A853", abbr: "G",  name: "Google Ads" },
  meta:      { color: "#1877F2", abbr: "M",  name: "Meta Ads" },
  tiktok:    { color: "#000000", abbr: "TT", name: "TikTok Ads" },
  instagram: { color: "#E1306C", abbr: "IG", name: "Instagram" },
  youtube:   { color: "#FF0000", abbr: "YT", name: "YouTube" },
};

function fmt(n: number) {
  if (!n || n <= 0) return "—";
  return `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`;
}

const STATUS_LABEL: Record<string, string> = {
  active:    "Активна",
  paused:    "Пауза",
  ab_test:   "A/B",
  draft:     "Черновик",
  completed: "Завершена",
};

type TabKey = "info" | "creatives" | "schedule" | "history" | "landing" | "content";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Landing tab
  const [landingId, setLandingId] = useState<string | null>(null);
  const [landingUpdating, setLandingUpdating] = useState(false);

  // Content tab
  const [socialPlan, setSocialPlan] = useState<any>(null);
  const [socialPlanLoading, setSocialPlanLoading] = useState(false);
  const [socialPlanError, setSocialPlanError] = useState("");
  const [socialPlanApproved, setSocialPlanApproved] = useState(false);
  const [adsPlan, setAdsPlan] = useState<any>(null);
  const [adsPlanLoading, setAdsPlanLoading] = useState(false);
  const [adsPlanError, setAdsPlanError] = useState("");
  const [adsPlanApproved, setAdsPlanApproved] = useState(false);
  const [activeContentSection, setActiveContentSection] = useState<"social" | "ads">("social");
  const [generatedCreatives, setGeneratedCreatives] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creativeFilter, setCreativeFilter] = useState<string>("all");
  const [publishingNow, setPublishingNow] = useState<string | null>(null);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["ad_campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      return res.ok ? res.json() : null;
    },
  });

  useEffect(() => {
    if (campaign?.landing_id && !landingId) {
      setLandingId(campaign.landing_id);
    }
  }, [campaign]);

  const { data: creatives = [], refetch: refetchCreatives } = useQuery({
    queryKey: ["ad_creatives_campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/creatives`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: landings = [] } = useQuery({
    queryKey: ["landings_for_campaign"],
    queryFn: async () => {
      const res = await fetch("/api/landings");
      return res.ok ? res.json() : [];
    },
  });

  // Restore AI-generated content from DB on page load
  useEffect(() => {
    const saved = creatives as any[];
    const aiItems = saved.filter((c: any) => c.content);
    if (aiItems.length > 0) {
      const mapped = aiItems.map((c: any) => {
        const content = typeof c.content === "string" ? JSON.parse(c.content) : (c.content ?? {});
        return { ...content, id: c.id, platform: c.platform || content.platform, subtype: c.format || content.subtype };
      });
      setGeneratedCreatives(mapped);
      if (mapped.some((c: any) => SOCIAL_KEYS.includes(c.platform))) setSocialPlanApproved(true);
      if (mapped.some((c: any) => AD_KEYS.includes(c.platform))) setAdsPlanApproved(true);
    }
  }, [creatives]);

  const updateCampaign = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Ошибка обновления");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad_campaign", id] }),
  });

  const cloneCampaign = async () => {
    if (!campaign) return;
    setCloning(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaign.name} — копия`,
          goal: campaign.goal,
          description: campaign.description,
          platforms: campaign.platforms,
          status: "draft",
          budget: campaign.budget_total,
          project_id: campaign.project_id,
        }),
      });
      const data = await res.json();
      if (data?.id) router.push(`/${locale}/campaigns/${data.id}`);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setCloning(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: scheduleModal.id,
          platform: scheduleModal.platform,
          scheduled_at: new Date(scheduleTime).toISOString(),
        }),
      });
      await fetch(`/api/campaigns/${id}/creatives?creativeId=${scheduleModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
      setScheduleModal(null);
      setScheduleTime("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const selectLanding = async (lid: string | null) => {
    setLandingUpdating(true);
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing_id: lid }),
      });
      setLandingId(lid);
      qc.invalidateQueries({ queryKey: ["ad_campaign", id] });
    } finally {
      setLandingUpdating(false);
    }
  };

  const generateCreativeContent = async (p: any): Promise<any> => {
    const res = await fetch("/api/ai/generate-creative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error("generation failed");
    return res.json();
  };

  const generateSocialPlan = async () => {
    if (!campaign) return;
    const platforms = (campaign.platforms ?? []).filter((p: string) => SOCIAL_KEYS.includes(p));
    setSocialPlanLoading(true);
    setSocialPlanError("");
    setSocialPlan(null);
    setSocialPlanApproved(false);
    try {
      const res = await fetch("/api/ai/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: (campaign as any).niche ?? "",
          goal: campaign.goal ?? "",
          product: campaign.description ?? "",
          audience: (campaign as any).audience ?? "",
          budget: campaign.budget_total ?? "",
          dateFrom: campaign.starts_at ?? "",
          dateTo: campaign.ends_at ?? "",
          platforms,
        }),
      });
      if (!res.ok) throw new Error("Ошибка сервера");
      setSocialPlan(await res.json());
    } catch (e: any) {
      setSocialPlanError(e.message || "Не удалось создать план");
    } finally {
      setSocialPlanLoading(false);
    }
  };

  const generateAdsPlan = async () => {
    if (!campaign) return;
    const platforms = (campaign.platforms ?? []).filter((p: string) => AD_KEYS.includes(p));
    setAdsPlanLoading(true);
    setAdsPlanError("");
    setAdsPlan(null);
    setAdsPlanApproved(false);
    try {
      const res = await fetch("/api/ai/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: (campaign as any).niche ?? "",
          goal: campaign.goal ?? "",
          product: campaign.description ?? "",
          audience: (campaign as any).audience ?? "",
          budget: campaign.budget_total ?? "",
          dateFrom: campaign.starts_at ?? "",
          dateTo: campaign.ends_at ?? "",
          platforms,
        }),
      });
      if (!res.ok) throw new Error("Ошибка сервера");
      setAdsPlan(await res.json());
    } catch (e: any) {
      setAdsPlanError(e.message || "Не удалось создать план");
    } finally {
      setAdsPlanLoading(false);
    }
  };

  const generateFromSocialPlan = async () => {
    if (!socialPlan || !campaign) return;
    setGenerating(true);
    const tasks: Promise<any>[] = [];
    let vi = 0;
    for (const [platformKey, data] of Object.entries(socialPlan.socialMedia ?? {})) {
      const formats = Object.entries(data as Record<string, any>).filter(
        ([k, v]) => k !== "reasoning" && typeof v === "number"
      );
      for (const [subtype, count] of formats) {
        for (let i = 0; i < (count as number); i++) {
          const currentVi = vi++;
          const localId = `${platformKey}__${subtype}__${currentVi}`;
          tasks.push(
            generateCreativeContent({
              platform: platformKey, subtype,
              product: campaign.description ?? "",
              goal: campaign.goal ?? "",
              audience: (campaign as any).audience ?? "",
              projectName: campaign.name,
              niche: (campaign as any).niche ?? "",
              tone: "", keywords: "",
              budget: campaign.budget_total ?? "",
              variationIndex: currentVi,
            })
              .then((content: any) => ({ id: localId, platform: platformKey, subtype, ...content }))
              .catch(() => null)
          );
        }
      }
    }
    const results = (await Promise.all(tasks)).filter(Boolean);
    try {
      await fetch(`/api/campaigns/${id}/creatives`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "social" }),
      });
      const postRes = await fetch(`/api/campaigns/${id}/creatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatives: results }),
      });
      if (postRes.ok) {
        const saved = await postRes.json();
        const mapped = (saved as any[]).map((c: any) => {
          const content = typeof c.content === "string" ? JSON.parse(c.content) : (c.content ?? {});
          return { ...content, id: c.id, platform: c.platform, subtype: c.format };
        });
        setGeneratedCreatives((prev: any[]) => [
          ...prev.filter((c: any) => !SOCIAL_KEYS.includes(c.platform)),
          ...mapped,
        ]);
        refetchCreatives();
      } else {
        setGeneratedCreatives((prev: any[]) => [
          ...prev.filter((c: any) => !SOCIAL_KEYS.includes(c.platform)),
          ...results,
        ]);
      }
    } catch {
      setGeneratedCreatives((prev: any[]) => [
        ...prev.filter((c: any) => !SOCIAL_KEYS.includes(c.platform)),
        ...results,
      ]);
    }
    setGenerating(false);
  };

  const generateFromAdsPlan = async () => {
    if (!adsPlan || !campaign) return;
    setGenerating(true);
    const tasks: Promise<any>[] = [];
    let vi = 0;
    for (const [platformKey, data] of Object.entries(adsPlan.adPlatforms ?? {})) {
      const formats = Object.entries(data as Record<string, any>).filter(
        ([k, v]) => k !== "reasoning" && typeof v === "number"
      );
      for (const [subtype, count] of formats) {
        for (let i = 0; i < (count as number); i++) {
          const currentVi = vi++;
          const localId = `${platformKey}__${subtype}__${currentVi}`;
          tasks.push(
            generateCreativeContent({
              platform: platformKey, subtype,
              product: campaign.description ?? "",
              goal: campaign.goal ?? "",
              audience: (campaign as any).audience ?? "",
              projectName: campaign.name,
              niche: (campaign as any).niche ?? "",
              tone: "", keywords: "",
              budget: campaign.budget_total ?? "",
              variationIndex: currentVi,
            })
              .then((content: any) => ({ id: localId, platform: platformKey, subtype, ...content }))
              .catch(() => null)
          );
        }
      }
    }
    const results = (await Promise.all(tasks)).filter(Boolean);
    try {
      await fetch(`/api/campaigns/${id}/creatives`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "ads" }),
      });
      const postRes = await fetch(`/api/campaigns/${id}/creatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatives: results }),
      });
      if (postRes.ok) {
        const saved = await postRes.json();
        const mapped = (saved as any[]).map((c: any) => {
          const content = typeof c.content === "string" ? JSON.parse(c.content) : (c.content ?? {});
          return { ...content, id: c.id, platform: c.platform, subtype: c.format };
        });
        setGeneratedCreatives((prev: any[]) => [
          ...prev.filter((c: any) => !AD_KEYS.includes(c.platform)),
          ...mapped,
        ]);
        refetchCreatives();
      } else {
        setGeneratedCreatives((prev: any[]) => [
          ...prev.filter((c: any) => !AD_KEYS.includes(c.platform)),
          ...results,
        ]);
      }
    } catch {
      setGeneratedCreatives((prev: any[]) => [
        ...prev.filter((c: any) => !AD_KEYS.includes(c.platform)),
        ...results,
      ]);
    }
    setGenerating(false);
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-[32px] mb-3 animate-spin">✦</div>
          <p className="text-[12px] text-tx-3">Загрузка кампании...</p>
        </div>
      </div>
    );

  if (!campaign)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-[13px] text-tx-2">Кампания не найдена</p>
        <button
          onClick={() => router.back()}
          className="text-[12px] text-accent hover:opacity-80 cursor-pointer"
        >
          ← Назад
        </button>
      </div>
    );

  const spent = campaign.budget_spent ?? 0;
  const total = campaign.budget_total ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  const campaignPlatforms: string[] = campaign.platforms ?? [];
  const socialPlatforms = campaignPlatforms.filter((p) => SOCIAL_KEYS.includes(p));
  const adsPlatforms = campaignPlatforms.filter((p) => AD_KEYS.includes(p));

  const renderPlanSection = (
    section: "social" | "ads",
    plan: any,
    planLoading: boolean,
    planError: string,
    planApproved: boolean,
    setPlan: (p: any) => void,
    setPlanApproved: (v: boolean) => void,
    doGeneratePlan: () => void,
    doGenerateFromPlan: () => void
  ) => {
    const sectionPlatforms = section === "social" ? socialPlatforms : adsPlatforms;
    const planData = section === "social" ? (plan?.socialMedia ?? {}) : (plan?.adPlatforms ?? {});

    if (sectionPlatforms.length === 0)
      return (
        <div className="ui-surface flex flex-col items-center py-12 text-center">
          <p className="text-[13px] font-medium text-tx-1 mb-1">Нет платформ</p>
          <p className="text-[11px] text-tx-3 max-w-[300px]">
            {section === "social"
              ? "Добавьте соцсети (Instagram, Telegram, TikTok, YouTube) в кампанию"
              : "Добавьте рекламные кабинеты (Meta, Google, Яндекс) в кампанию"}
          </p>
        </div>
      );

    return (
      <div className="space-y-4">
        {/* Platform badges */}
        <div className="flex flex-wrap gap-2">
          {sectionPlatforms.map((p) => {
            const meta = PLATFORM_META[p];
            return meta ? (
              <div
                key={p}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-line text-[11px] text-tx-1"
              >
                <span
                  className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                  style={{ background: meta.color }}
                >
                  {meta.abbr}
                </span>
                {meta.name}
              </div>
            ) : null;
          })}
        </div>

        {/* Plan area */}
        <div className="ui-surface p-4">
          {planApproved ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[12px] text-green-500 font-medium">✓ План утверждён</span>
                <button
                  onClick={() => { setPlan(null); setPlanApproved(false); }}
                  className="ml-auto text-[11px] text-tx-3 hover:text-accent cursor-pointer"
                >
                  ← Изменить
                </button>
              </div>
              <button
                onClick={doGenerateFromPlan}
                disabled={generating}
                className="w-full py-3 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {generating ? "⟳ Генерирую контент..." : "🎨 Создать контент по плану"}
              </button>
            </div>
          ) : plan ? (
            <div>
              <p className="text-[11px] font-semibold text-tx-2 mb-3 uppercase tracking-wider">Контент-план</p>
              {Object.entries(planData).map(([platform, data]: [string, any]) => (
                <div key={platform} className="mb-3 pb-3 border-b border-line last:border-0 last:pb-0 last:mb-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                      style={{ background: PLATFORM_META[platform]?.color ?? "#888" }}
                    >
                      {PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-[11px] font-medium text-tx-1">
                      {PLATFORM_META[platform]?.name ?? platform}
                    </span>
                  </div>
                  {Object.entries(data)
                    .filter(([k, v]) => k !== "reasoning" && typeof v === "number")
                    .map(([subtype, count]) => (
                      <div key={subtype} className="flex justify-between text-[11px] py-0.5 pl-6">
                        <span className="text-tx-3">{subtype}</span>
                        <span className="font-medium text-tx-2">{String(count)} шт.</span>
                      </div>
                    ))}
                  {data.reasoning && (
                    <p className="text-[10px] text-tx-3 pl-6 mt-1 italic leading-relaxed">{data.reasoning}</p>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-3 border-t border-line mt-3">
                <button
                  onClick={() => { setPlan(null); setPlanApproved(false); }}
                  className="flex-1 py-2 border border-line rounded-[7px] text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отклонить
                </button>
                <button
                  onClick={() => setPlanApproved(true)}
                  className="flex-1 py-2 bg-accent text-on-accent text-[11px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                >
                  Утвердить план
                </button>
              </div>
            </div>
          ) : (
            <div>
              {planError && <p className="text-[11px] text-red-500 mb-2">{planError}</p>}
              <button
                onClick={doGeneratePlan}
                disabled={planLoading}
                className="w-full py-3 border border-dashed border-accent/40 rounded-[8px] text-[12px] text-accent hover:bg-accent/5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {planLoading ? "⟳ Создаю план..." : "✦ Создать контент-план"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="h-11 border-b border-line px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/campaigns`)}
            className="flex items-center gap-1.5 text-[11px] text-tx-3 hover:text-tx-1 cursor-pointer"
          >
            <ChevronLeft size={14} /> Кампании
          </button>
          <span className="text-tx-3 text-[11px]">/</span>
          <span className="text-[11px] text-tx-2 font-medium truncate max-w-[280px]">
            {campaign.name}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cloneCampaign}
            disabled={cloning}
            className="inline-flex items-center gap-1.5 border border-line rounded-[7px] px-3 py-1.5 text-[11px] text-tx-2 hover:bg-hover cursor-pointer disabled:opacity-50"
          >
            <Copy size={12} /> {cloning ? "Клонирую..." : "Клонировать"}
          </button>
          {campaign.status === "active" && (
            <button
              onClick={() => updateCampaign.mutate({ status: "paused" })}
              className="inline-flex items-center gap-1.5 border border-line rounded-[7px] px-3 py-1.5 text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
            >
              ⏸ Пауза
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => updateCampaign.mutate({ status: "active" })}
              className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
            >
              ▶ Возобновить
            </button>
          )}
        </div>
      </div>

      {/* Title + meta */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[20px] font-semibold text-tx-1">{campaign.name}</h1>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-chip text-tx-2">
            {STATUS_LABEL[campaign.status] ?? campaign.status}
          </span>
        </div>
        {campaign.goal && (
          <p className="text-[12px] text-tx-3 mb-2">{campaign.goal}</p>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {campaignPlatforms.map((pid: string) => {
            const pm = PLATFORM_META[pid];
            return pm ? (
              <div
                key={pid}
                style={{
                  width: 26, height: 18, borderRadius: 4,
                  background: pm.color, color: pm.textColor ?? "#fff",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {pm.abbr}
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="px-5 pb-4 grid grid-cols-5 gap-3">
        {[
          { l: "Расход", v: fmt(spent) },
          { l: "CTR", v: campaign.ctr > 0 ? `${campaign.ctr.toFixed(1)}%` : "—" },
          { l: "CPL", v: fmt(campaign.cpl) },
          { l: "ROAS", v: campaign.roas > 0 ? `${Math.round(campaign.roas)}%` : "—" },
          { l: "Заявок", v: campaign.leads > 0 ? String(campaign.leads) : "—" },
        ].map((k) => (
          <div key={k.l} className="ui-surface px-4 py-3">
            <p className="ui-label mb-1">{k.l}</p>
            <p className="text-[18px] font-semibold text-tx-1">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      {total > 0 && (
        <div className="px-5 pb-3">
          <div className="ui-surface px-4 py-3">
            <div className="flex justify-between text-[11px] mb-2">
              <span className="font-medium text-tx-1">Бюджет</span>
              <span className="text-tx-3">
                {fmt(spent)} из {fmt(total)} · {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-track rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-5 border-b border-line flex-wrap">
        {(
          [
            { k: "info",      l: "Инфо" },
            { k: "creatives", l: `Креативы · ${(creatives as any[]).length}` },
            { k: "schedule",  l: "Запланировать" },
            { k: "history",   l: "История" },
            { k: "landing",   l: "Лендинг" },
            { k: "content",   l: "Контент ✦" },
          ] as { k: TabKey; l: string }[]
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === t.k
                ? "border-accent text-accent"
                : "border-transparent text-tx-3 hover:text-tx-1"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 p-5">
        {/* Info */}
        {activeTab === "info" && (
          <div className="grid grid-cols-2 gap-4 max-w-[680px]">
            <div className="ui-surface p-4">
              <p className="ui-label mb-3">Основное</p>
              {[
                ["Название", campaign.name],
                ["Цель", campaign.goal ?? "—"],
                ["Описание", campaign.description ?? "—"],
                ["Статус", STATUS_LABEL[campaign.status] ?? campaign.status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-[11px] py-1.5 border-b border-line last:border-0">
                  <span className="text-tx-3">{l}</span>
                  <span className="font-medium text-tx-1 text-right max-w-[200px] truncate">{v}</span>
                </div>
              ))}
            </div>
            <div className="ui-surface p-4">
              <p className="ui-label mb-3">Показатели</p>
              {[
                ["Показов",  (campaign.impressions ?? 0).toLocaleString("ru")],
                ["Кликов",   (campaign.clicks ?? 0).toLocaleString("ru")],
                ["Заявок",   String(campaign.leads ?? 0)],
                ["Продаж",   String(campaign.sales ?? 0)],
                ["Доход",    fmt(campaign.revenue ?? 0)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-[11px] py-1.5 border-b border-line last:border-0">
                  <span className="text-tx-3">{l}</span>
                  <span className="font-medium text-tx-1">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creatives */}
        {activeTab === "creatives" &&
          ((creatives as any[]).length === 0 ? (
            <div className="ui-surface flex flex-col items-center py-14 text-center">
              <p className="text-[32px] mb-3">⬡</p>
              <p className="text-[13px] font-medium text-tx-1 mb-1">Нет креативов</p>
              <p className="text-[11px] text-tx-3">Создайте контент во вкладке «Контент ✦»</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {(creatives as any[]).map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => setScheduleModal(c)}
                  className="ui-surface p-3 cursor-pointer hover:border-line-strong transition-colors"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="w-full h-24 object-cover rounded-[6px] mb-2" />
                  ) : (
                    <div
                      className="w-full h-24 rounded-[6px] mb-2 flex items-center justify-center text-[22px]"
                      style={{ background: `linear-gradient(135deg, ${PLATFORM_META[c.platform]?.color ?? "#333"}, #111)` }}
                    >
                      {c.platform?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="text-[11px] font-medium text-tx-1 truncate mb-0.5">
                    {c.title ?? "Без названия"}
                  </p>
                  <p className="text-[9px] text-tx-3 mb-2">
                    {c.platform} · {c.format ?? c.type}
                  </p>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip ${c.status === "active" ? "text-pos" : "text-tx-3"}`}>
                    {({ active: "Активен", draft: "Черновик", paused: "Пауза", winner: "Победитель", failed: "Ошибка" } as Record<string, string>)[c.status] ?? c.status}
                  </span>
                </div>
              ))}
            </div>
          ))}

        {/* Schedule */}
        {activeTab === "schedule" && (
          <div className="max-w-[480px]">
            <p className="text-[12px] text-tx-2 mb-4">Выберите черновик и запланируйте публикацию</p>
            {(creatives as any[]).filter((c: any) => c.status === "draft").length === 0 ? (
              <div className="ui-surface flex flex-col items-center py-10 text-center">
                <p className="text-[11px] text-tx-3">Нет черновиков для планирования</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(creatives as any[]).filter((c: any) => c.status === "draft").map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setScheduleModal(c)}
                    className="ui-surface px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-line-strong"
                  >
                    <div
                      style={{
                        width: 22, height: 16, borderRadius: 3,
                        background: PLATFORM_META[c.platform]?.color ?? "#333",
                        color: "#fff", fontSize: 8, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      {PLATFORM_META[c.platform]?.abbr ?? "?"}
                    </div>
                    <p className="text-[12px] font-medium text-tx-1 flex-1 truncate">{c.title ?? "Без названия"}</p>
                    <span className="text-[11px] text-accent">📅 Запланировать →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="max-w-[560px]">
            <div className="ui-surface flex flex-col items-center py-14 text-center">
              <Clock size={28} className="text-tx-3 mb-3" strokeWidth={1.2} />
              <p className="text-[13px] font-medium text-tx-1 mb-1">История изменений</p>
              <p className="text-[11px] text-tx-3">Все действия с кампанией будут отображаться здесь</p>
            </div>
          </div>
        )}

        {/* Landing */}
        {activeTab === "landing" && (() => {
          const publishedLandings = (landings as any[]).filter((l: any) => l.published);
          const selectedLanding = (landings as any[]).find((l: any) => l.id === landingId) ?? null;

          return (
            <div className="max-w-[680px]">
              {selectedLanding && (
                <div className="ui-surface p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="ui-label">Текущий лендинг</p>
                    <button
                      onClick={() => selectLanding(null)}
                      disabled={landingUpdating}
                      className="text-[11px] text-tx-3 hover:text-neg cursor-pointer disabled:opacity-50"
                    >
                      Отвязать
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center text-lg">
                      🌐
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-tx-1 truncate">{selectedLanding.title}</p>
                      {selectedLanding.slug && (
                        <p className="text-[10px] text-tx-3">/l/{selectedLanding.slug}</p>
                      )}
                    </div>
                    <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-green-500 flex-shrink-0">
                      Привязан
                    </span>
                  </div>
                </div>
              )}

              <p className="ui-label mb-3">{selectedLanding ? "Изменить лендинг" : "Выбрать лендинг"}</p>
              {publishedLandings.length === 0 ? (
                <div className="ui-surface flex flex-col items-center py-12 text-center">
                  <p className="text-[13px] font-medium text-tx-1 mb-1">Нет опубликованных лендингов</p>
                  <p className="text-[11px] text-tx-3 mb-4">Создайте и опубликуйте лендинг, чтобы привязать его к кампании</p>
                  <button
                    onClick={() => router.push(`/${locale}/landings/create`)}
                    className="px-4 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                  >
                    + Создать лендинг
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {publishedLandings.map((lp: any) => {
                    const isSelected = landingId === lp.id;
                    return (
                      <button
                        key={lp.id}
                        onClick={() => selectLanding(lp.id)}
                        disabled={landingUpdating}
                        className={`flex flex-col gap-2 p-3 border rounded-[10px] text-left transition-colors cursor-pointer disabled:opacity-50 hover:border-line-strong ${
                          isSelected ? "border-accent bg-accent/5" : "border-line bg-panel-2"
                        }`}
                      >
                        <div className="w-full h-16 rounded-[6px] bg-bg flex items-center justify-center text-2xl">
                          🌐
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-tx-1 truncate">{lp.title}</p>
                          {lp.slug && <p className="text-[10px] text-tx-3 truncate">/l/{lp.slug}</p>}
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-medium text-accent">✓ Выбран</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Content ✦ */}
        {activeTab === "content" && (() => {
          const filteredCreatives = generatedCreatives.filter((c: any) =>
            creativeFilter === "all" || c.platform === creativeFilter
          );
          const uniquePlatforms = Array.from(
            new Set(generatedCreatives.map((c: any) => c.platform))
          ) as string[];

          return (
            <div>
              {/* Section tabs */}
              <div className="flex gap-2 mb-5">
                {(
                  [
                    { k: "social" as const, l: "Соцсети",             platforms: socialPlatforms, approved: socialPlanApproved },
                    { k: "ads" as const,    l: "Рекламные кабинеты",   platforms: adsPlatforms,   approved: adsPlanApproved },
                  ]
                ).map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setActiveContentSection(s.k)}
                    className={`px-4 py-2 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer ${
                      activeContentSection === s.k
                        ? "bg-accent text-on-accent"
                        : "border border-line text-tx-2 hover:bg-hover"
                    }`}
                  >
                    {s.l}
                    {s.platforms.length > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">({s.platforms.length})</span>
                    )}
                    {activeContentSection !== s.k && s.approved && (
                      <span className="ml-1 text-[9px] text-green-500">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active section plan area */}
              <div className="max-w-[680px] mb-6">
                {activeContentSection === "social"
                  ? renderPlanSection(
                      "social", socialPlan, socialPlanLoading, socialPlanError, socialPlanApproved,
                      setSocialPlan, setSocialPlanApproved, generateSocialPlan, generateFromSocialPlan
                    )
                  : renderPlanSection(
                      "ads", adsPlan, adsPlanLoading, adsPlanError, adsPlanApproved,
                      setAdsPlan, setAdsPlanApproved, generateAdsPlan, generateFromAdsPlan
                    )}
              </div>

              {/* Generated content cards */}
              {generatedCreatives.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-medium text-tx-2">
                      Сгенерированный контент · {generatedCreatives.length}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        ["all", "Все"],
                        ...uniquePlatforms.map((p) => [p, PLATFORM_META[p]?.name ?? p]),
                      ].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setCreativeFilter(val as string)}
                          className={`px-2.5 py-1 rounded-[6px] text-[10px] cursor-pointer ${
                            creativeFilter === val
                              ? "bg-accent text-on-accent"
                              : "border border-line text-tx-3 hover:bg-hover"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {filteredCreatives.map((c: any) => {
                      const meta = PLATFORM_META[c.platform];
                      const title =
                        c.caption?.slice(0, 80) ??
                        c.headline ??
                        c.hook?.slice(0, 80) ??
                        c.text?.slice(0, 80) ??
                        c.subtype ??
                        "—";
                      return (
                        <div key={c.id} className="ui-surface p-3 flex flex-col gap-2">
                          {/* Platform header */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ background: meta?.color ?? "#888" }}
                            >
                              {meta?.abbr ?? c.platform?.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-tx-3">{meta?.name ?? c.platform}</span>
                            {c.subtype && (
                              <span className="ml-auto text-[9px] text-tx-3 bg-chip px-1.5 py-0.5 rounded-full">
                                {c.subtype}
                              </span>
                            )}
                          </div>

                          {/* Text preview */}
                          <p className="text-[11px] text-tx-1 leading-relaxed line-clamp-3 flex-1">{title}</p>

                          {/* Extras */}
                          {c.headlines && (
                            <div>
                              {(c.headlines as string[]).slice(0, 2).map((h: string, i: number) => (
                                <p key={i} className="text-[10px] text-tx-2">· {h}</p>
                              ))}
                            </div>
                          )}
                          {c.hashtags && (
                            <p className="text-[10px] text-accent truncate">
                              {(c.hashtags as string[]).join(" ")}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1.5 pt-2 border-t border-line">
                            <button
                              onClick={() =>
                                setScheduleModal({ id: c.id, platform: c.platform, title })
                              }
                              className="flex-1 py-1.5 border border-line rounded-[6px] text-[10px] text-tx-2 hover:bg-hover cursor-pointer"
                            >
                              📅 Запланировать
                            </button>
                            <button
                              onClick={async () => {
                                if (!c.id || publishingNow === c.id) return;
                                setPublishingNow(c.id);
                                try {
                                  await fetch(
                                    `/api/campaigns/${id}/creatives?creativeId=${c.id}`,
                                    {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "active" }),
                                    }
                                  );
                                  refetchCreatives();
                                } catch {
                                  // silent
                                } finally {
                                  setPublishingNow(null);
                                }
                              }}
                              disabled={publishingNow === c.id}
                              className="flex-1 py-1.5 bg-accent text-on-accent rounded-[6px] text-[10px] font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
                            >
                              {publishingNow === c.id ? "..." : "▶ Опубликовать"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {generatedCreatives.length === 0 && !generating && (
                <div className="ui-surface flex flex-col items-center py-14 text-center mt-4">
                  <p className="text-[32px] mb-3">✦</p>
                  <p className="text-[13px] font-medium text-tx-1 mb-1">Нет сгенерированного контента</p>
                  <p className="text-[11px] text-tx-3">
                    Создайте контент-план и утвердите его — контент будет сгенерирован автоматически
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setScheduleModal(null)}
          />
          <div className="relative w-full max-w-[380px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">Запланировать</h2>
              <button
                onClick={() => setScheduleModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-tx-3 mb-4">
              {scheduleModal.title ?? "Без названия"} · {scheduleModal.platform}
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
                onClick={handleSchedule}
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
