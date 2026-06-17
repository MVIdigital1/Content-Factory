"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import { ChevronLeft, Copy, Clock } from "lucide-react";

const PLATFORM_META: Record<
  string,
  { color: string; textColor?: string; abbr: string; name: string }
> = {
  yandex: {
    color: "#FFDB4D",
    textColor: "#664400",
    abbr: "Я",
    name: "Яндекс Директ",
  },
  vk: { color: "#0077FF", abbr: "VK", name: "VK Реклама" },
  telegram: { color: "#0088CC", abbr: "TG", name: "Telegram Ads" },
  mytarget: { color: "#FF6600", abbr: "MT", name: "myTarget" },
  google: { color: "#34A853", abbr: "G", name: "Google Ads" },
  meta: { color: "#1877F2", abbr: "M", name: "Meta Ads" },
  tiktok: { color: "#000000", abbr: "TT", name: "TikTok Ads" },
};

function fmt(n: number) {
  if (!n || n <= 0) return "—";
  return `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Активна",
  paused: "Пауза",
  ab_test: "A/B",
  draft: "Черновик",
  completed: "Завершена",
};

type TabKey = "info" | "creatives" | "schedule" | "history";

export default function CampaignDetailPage() {
  // Fix: use useParams() instead of params prop (Next.js 15)
  const params = useParams();
  const id = params?.id as string;
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [creativeModal, setCreativeModal] = useState<any>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [editingCreative, setEditingCreative] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [publishingNow, setPublishingNow] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["ad_campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },
  });

  const { data: creatives = [] } = useQuery({
    queryKey: ["ad_creatives_campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_creatives")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("ad_campaigns")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad_campaign", id] }),
  });

  const cloneCampaign = async () => {
    if (!campaign) return;
    setCloning(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { data } = await supabase
        .from("ad_campaigns")
        .insert({
          user_id: user.id,
          name: `${campaign.name} — копия`,
          goal: campaign.goal,
          description: campaign.description,
          platforms: campaign.platforms,
          status: "draft",
          budget_total: campaign.budget_total,
          budget_spent: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          sales: 0,
          revenue: 0,
          ctr: 0,
          cpl: 0,
          roas: 0,
          project_id: campaign.project_id,
        })
        .select()
        .single();
      if (data) router.push(`/${locale}/campaigns/${data.id}`);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setCloning(false);
    }
  };

  const openCreativeModal = (c: any) => {
    setCreativeModal(c);
    setEditingCreative(false);
    setEditTitle(c.title ?? "");
    setEditCaption(c.caption ?? "");
    setScheduleTime("");
  };

  const handleSchedule = async () => {
    if (!creativeModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await supabase.from("scheduled_posts").insert({
        content_id: creativeModal.id,
        platform: creativeModal.platform,
        scheduled_at: new Date(scheduleTime).toISOString(),
        status: "pending",
        retry_count: 0,
      });
      await supabase
        .from("ad_creatives")
        .update({ status: "active" })
        .eq("id", creativeModal.id);
      qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
      setCreativeModal(null);
      setScheduleTime("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!creativeModal) return;
    await supabase
      .from("ad_creatives")
      .update({ title: editTitle, caption: editCaption })
      .eq("id", creativeModal.id);
    qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
    setEditingCreative(false);
    setCreativeModal({ ...creativeModal, title: editTitle, caption: editCaption });
  };

  const handleDeleteCreative = async () => {
    if (!creativeModal || !confirm("Удалить этот креатив?")) return;
    await supabase.from("ad_creatives").delete().eq("id", creativeModal.id);
    qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
    setCreativeModal(null);
  };

  const handleTogglePause = async () => {
    if (!creativeModal) return;
    const newStatus = creativeModal.status === "paused" ? "draft" : "paused";
    await supabase.from("ad_creatives").update({ status: newStatus }).eq("id", creativeModal.id);
    qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
    setCreativeModal({ ...creativeModal, status: newStatus });
  };

  const handlePublishNow = async () => {
    if (!creativeModal) return;
    setPublishingNow(true);
    try {
      await fetch("/api/content/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: creativeModal.id, platform: creativeModal.platform }),
      });
      qc.invalidateQueries({ queryKey: ["ad_creatives_campaign", id] });
      setCreativeModal(null);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setPublishingNow(false);
    }
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
          <h1 className="text-[20px] font-semibold text-tx-1">
            {campaign.name}
          </h1>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-chip text-tx-2">
            {STATUS_LABEL[campaign.status] ?? campaign.status}
          </span>
        </div>
        {campaign.goal && (
          <p className="text-[12px] text-tx-3 mb-2">{campaign.goal}</p>
        )}
        <div className="flex gap-1.5">
          {(campaign.platforms ?? []).map((pid: string) => {
            const pm = PLATFORM_META[pid];
            return pm ? (
              <div
                key={pid}
                style={{
                  width: 26,
                  height: 18,
                  borderRadius: 4,
                  background: pm.color,
                  color: pm.textColor ?? "#fff",
                  fontSize: 9,
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
      </div>

      {/* KPIs */}
      <div className="px-5 pb-4 grid grid-cols-5 gap-3">
        {[
          { l: "Расход", v: fmt(spent) },
          {
            l: "CTR",
            v: campaign.ctr > 0 ? `${campaign.ctr.toFixed(1)}%` : "—",
          },
          { l: "CPL", v: fmt(campaign.cpl) },
          {
            l: "ROAS",
            v: campaign.roas > 0 ? `${Math.round(campaign.roas)}%` : "—",
          },
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
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-5 border-b border-line">
        {(
          [
            { k: "info", l: "Инфо" },
            { k: "creatives", l: `Креативы · ${creatives.length}` },
            { k: "schedule", l: "Запланировать" },
            { k: "history", l: "История" },
          ] as { k: TabKey; l: string }[]
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer ${activeTab === t.k ? "border-accent text-accent" : "border-transparent text-tx-3 hover:text-tx-1"}`}
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
                <div
                  key={l}
                  className="flex justify-between text-[11px] py-1.5 border-b border-line last:border-0"
                >
                  <span className="text-tx-3">{l}</span>
                  <span className="font-medium text-tx-1 text-right max-w-[200px] truncate">
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="ui-surface p-4">
              <p className="ui-label mb-3">Показатели</p>
              {[
                ["Показов", (campaign.impressions ?? 0).toLocaleString("ru")],
                ["Кликов", (campaign.clicks ?? 0).toLocaleString("ru")],
                ["Заявок", String(campaign.leads ?? 0)],
                ["Продаж", String(campaign.sales ?? 0)],
                ["Доход", fmt(campaign.revenue ?? 0)],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="flex justify-between text-[11px] py-1.5 border-b border-line last:border-0"
                >
                  <span className="text-tx-3">{l}</span>
                  <span className="font-medium text-tx-1">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creatives */}
        {activeTab === "creatives" && (
          <>
            {/* Stats + actions row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4">
                {[
                  { l: "Всего", v: creatives.length },
                  { l: "Активных", v: creatives.filter((c: any) => c.status === "active").length, accent: true },
                  { l: "Черновиков", v: creatives.filter((c: any) => c.status === "draft").length },
                  { l: "На паузе", v: creatives.filter((c: any) => c.status === "paused").length },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <p className={`text-[16px] font-semibold ${s.accent ? "text-pos" : "text-tx-1"}`}>{s.v}</p>
                    <p className="text-[10px] text-tx-3">{s.l}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push(`/${locale}/campaigns?tab=wizard`)}
                className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
              >
                + Создать новый
              </button>
            </div>

            {creatives.length === 0 ? (
              <div className="ui-surface flex flex-col items-center py-14 text-center">
                <p className="text-[32px] mb-3">⬡</p>
                <p className="text-[13px] font-medium text-tx-1 mb-1">Нет креативов</p>
                <p className="text-[11px] text-tx-3 mb-4">Создайте кампанию с AI-генерацией</p>
                <button
                  onClick={() => router.push(`/${locale}/campaigns?tab=wizard`)}
                  className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
                >
                  + Создать кампанию
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {creatives.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => openCreativeModal(c)}
                    className="ui-surface p-3 cursor-pointer hover:border-line-strong transition-colors group"
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
                    <p className="text-[11px] font-medium text-tx-1 truncate mb-0.5">{c.title ?? "Без названия"}</p>
                    <p className="text-[9px] text-tx-3 mb-2">{c.platform} · {c.format}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip ${c.status === "active" ? "text-pos" : c.status === "paused" ? "text-warn" : "text-tx-3"}`}>
                        {({ active: "Активен", draft: "Черновик", paused: "Пауза", winner: "Победитель", failed: "Ошибка" } as Record<string, string>)[c.status] ?? c.status}
                      </span>
                      <span className="text-[9px] text-tx-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        Нажмите →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Schedule */}
        {activeTab === "schedule" && (
          <div className="max-w-[480px]">
            <p className="text-[12px] text-tx-2 mb-4">
              Выберите черновик и запланируйте публикацию
            </p>
            {creatives.filter((c: any) => c.status === "draft").length === 0 ? (
              <div className="ui-surface flex flex-col items-center py-10 text-center">
                <p className="text-[11px] text-tx-3">
                  Нет черновиков для планирования
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {creatives
                  .filter((c: any) => c.status === "draft")
                  .map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => openCreativeModal(c)}
                      className="ui-surface px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-line-strong"
                    >
                      <div
                        style={{
                          width: 22,
                          height: 16,
                          borderRadius: 3,
                          background:
                            PLATFORM_META[c.platform]?.color ?? "#333",
                          color: "#fff",
                          fontSize: 8,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {PLATFORM_META[c.platform]?.abbr ?? "?"}
                      </div>
                      <p className="text-[12px] font-medium text-tx-1 flex-1 truncate">
                        {c.title ?? "Без названия"}
                      </p>
                      <span className="text-[11px] text-accent">
                        📅 Запланировать →
                      </span>
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
              <p className="text-[13px] font-medium text-tx-1 mb-1">
                История изменений
              </p>
              <p className="text-[11px] text-tx-3">
                Все действия с кампанией будут отображаться здесь
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Creative action modal */}
      {creativeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={() => setCreativeModal(null)} />
          <div className="relative w-full max-w-[500px] bg-panel border border-line rounded-[14px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-panel z-10">
              <div>
                <p className="text-[13px] font-semibold text-tx-1">
                  {creativeModal.title ?? "Без названия"}
                </p>
                <p className="text-[10px] text-tx-3 mt-0.5">
                  {creativeModal.platform} · {creativeModal.format} ·{" "}
                  {({ active: "Активен", draft: "Черновик", paused: "Пауза" } as Record<string, string>)[creativeModal.status] ?? creativeModal.status}
                </p>
              </div>
              <button
                onClick={() => setCreativeModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer text-tx-3 text-[14px]"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {creativeModal.image_url && (
                <img src={creativeModal.image_url} alt="" className="w-full h-44 object-cover rounded-[9px]" />
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePublishNow}
                  disabled={publishingNow}
                  className="py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] hover:opacity-90 cursor-pointer disabled:opacity-60"
                >
                  {publishingNow ? "⟳ Публикую..." : "🚀 Опубликовать сейчас"}
                </button>
                <button
                  onClick={handleTogglePause}
                  className="py-2.5 border border-line text-[12px] text-tx-2 rounded-[8px] hover:bg-hover cursor-pointer"
                >
                  {creativeModal.status === "paused" ? "▶ Возобновить" : "⏸ Пауза"}
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
                    className="flex-1 px-3 py-2 rounded-[8px] border border-line text-[12px] outline-none bg-panel text-tx-1"
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
                    onClick={() => setEditingCreative(!editingCreative)}
                    className="text-[11px] text-accent cursor-pointer hover:opacity-80"
                  >
                    {editingCreative ? "Скрыть" : "✎ Изменить"}
                  </button>
                </div>
                {editingCreative && (
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
                      Сохранить
                    </button>
                  </div>
                )}
              </div>

              {/* Caption preview */}
              {!editingCreative && creativeModal.caption && (
                <div className="bg-panel-2 border border-line rounded-[8px] p-3">
                  <p className="ui-label mb-2">Текст</p>
                  <p className="text-[11px] text-tx-2 leading-relaxed whitespace-pre-wrap">
                    {creativeModal.caption}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["CTR", creativeModal.ctr > 0 ? `${creativeModal.ctr.toFixed(1)}%` : "—"],
                  ["Показов", creativeModal.impressions > 0 ? creativeModal.impressions.toLocaleString("ru") : "—"],
                  ["Кликов", creativeModal.clicks > 0 ? creativeModal.clicks.toLocaleString("ru") : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="bg-panel-2 border border-line rounded-[7px] px-3 py-2">
                    <p className="ui-label mb-1">{l}</p>
                    <p className="text-[13px] font-medium text-tx-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Delete */}
              <button
                onClick={handleDeleteCreative}
                className="w-full py-2 border border-neg/30 text-neg text-[12px] rounded-[8px] hover:bg-neg/5 cursor-pointer transition-colors"
              >
                🗑 Удалить креатив
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
