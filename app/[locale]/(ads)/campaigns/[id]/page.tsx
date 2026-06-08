"use client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { PLATFORM_META } from "@/components/ads/data";
import { useLocale } from "next-intl";
import Link from "next/link";

function fmt(n: number) {
  return n > 0
    ? `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`
    : "—";
}

const PLATFORM_COLORS: Record<string, string> = {
  telegram: "#0088CC",
  instagram: "#E1306C",
  tiktok: "#000",
  vk: "#0077FF",
  yandex: "#FFDB4D",
  google: "#34A853",
  meta: "#1877F2",
};

export default function CampaignPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"info" | "creatives" | "schedule">(
    "creatives",
  );
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(
    new Set(),
  );

  const { data: campaign, isLoading: campLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
  });

  const { data: creatives = [], refetch: refetchCreatives } = useQuery({
    queryKey: ["ad_creatives", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_creatives")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["scheduled_posts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, contents(title, caption, platform)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at");
      return data ?? [];
    },
  });

  const handleSchedule = async () => {
    if (!scheduleModal || !scheduleTime) return;
    setScheduling(true);
    try {
      await supabase.from("scheduled_posts").insert({
        content_id: scheduleModal.id,
        platform: scheduleModal.platform,
        scheduled_at: new Date(scheduleTime).toISOString(),
        status: "pending",
        retry_count: 0,
      });
      await supabase
        .from("ad_creatives")
        .update({
          status: "active",
          scheduled_at: new Date(scheduleTime).toISOString(),
        })
        .eq("id", scheduleModal.id);
      refetchCreatives();
      setScheduleModal(null);
      setScheduleTime("");
    } finally {
      setScheduling(false);
    }
  };

  const toggleCreative = (id: string) => {
    setSelectedCreatives((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const STATUS_BADGE: Record<string, any> = {
    draft: "muted",
    active: "success",
    paused: "muted",
    winner: "accent",
    failed: "danger",
  };
  const STATUS_LABEL: Record<string, string> = {
    draft: "Черновик",
    active: "Активен",
    paused: "Пауза",
    winner: "Победитель",
    failed: "Ошибка",
  };

  if (campLoading)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--text-secondary)",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Загрузка...
      </div>
    );

  if (!campaign)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          fontFamily: "'Space Grotesk', sans-serif",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Кампания не найдена
        </div>
        <Link
          href={`/${locale}/ads`}
          style={{
            fontSize: 12,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          ← Назад
        </Link>
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "11px 20px",
          borderBottom: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <Link
          href={`/${locale}/ads`}
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "5px 10px",
            border: "0.5px solid var(--border)",
            borderRadius: 7,
            background: "var(--bg-card)",
          }}
        >
          ← Назад
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{campaign.name}</div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {campaign.goal ?? "Рекламная кампания"}
          </div>
        </div>
        <Badge
          variant={
            campaign.status === "active"
              ? "success"
              : campaign.status === "paused"
                ? "muted"
                : "warning"
          }
        >
          {(
            {
              active: "Активна",
              paused: "Пауза",
              ab_test: "A/B",
              draft: "Черновик",
            } as Record<string, string>
          )[campaign.status] ?? campaign.status}
        </Badge>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {(campaign.platforms ?? []).map((pid: string) => {
            const p = PLATFORM_META[pid];
            return p ? (
              <PlatformLogo
                key={pid}
                abbr={p.abbr}
                color={p.color}
                textColor={p.textColor}
              />
            ) : null;
          })}
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 8,
          padding: "12px 20px",
          borderBottom: "0.5px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {[
          { l: "Расход", v: fmt(campaign.budget_spent ?? 0) },
          {
            l: "CTR",
            v: campaign.ctr > 0 ? `${campaign.ctr.toFixed(1)}%` : "—",
            c:
              campaign.ctr >= 3
                ? "var(--success)"
                : campaign.ctr >= 2
                  ? undefined
                  : "var(--danger)",
          },
          { l: "CPL", v: campaign.cpl > 0 ? fmt(campaign.cpl) : "—" },
          {
            l: "ROAS",
            v: campaign.roas > 0 ? `${Math.round(campaign.roas)}%` : "—",
            c: campaign.roas >= 200 ? "var(--success)" : undefined,
          },
          { l: "Заявок", v: campaign.leads > 0 ? String(campaign.leads) : "—" },
        ].map((k) => (
          <div
            key={k.l}
            style={{
              background: "var(--bg-card)",
              border: "0.5px solid var(--border)",
              borderRadius: 9,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: (k as any).c ?? "var(--text-primary)",
              }}
            >
              {k.v}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                marginTop: 3,
              }}
            >
              {k.l}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "8px 20px",
          borderBottom: "0.5px solid var(--border)",
          flexShrink: 0,
          background: "var(--bg-secondary)",
        }}
      >
        {[
          { k: "info", l: "Инфо" },
          { k: "creatives", l: `Креативы · ${creatives.length}` },
          { k: "schedule", l: `Запланировано · ${scheduledPosts.length}` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k as any)}
            style={{
              padding: "6px 13px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              fontWeight: 500,
              background: activeTab === t.k ? "var(--primary)" : "transparent",
              color:
                activeTab === t.k
                  ? "var(--on-primary)"
                  : "var(--text-secondary)",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Info tab */}
        {activeTab === "info" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid var(--border)",
                borderRadius: 9,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
                Основное
              </div>
              {[
                ["Название", campaign.name],
                ["Цель", campaign.goal ?? "—"],
                ["Описание", campaign.description ?? "—"],
                [
                  "Начало",
                  campaign.starts_at
                    ? new Date(campaign.starts_at).toLocaleDateString("ru")
                    : "—",
                ],
                [
                  "Конец",
                  campaign.ends_at
                    ? new Date(campaign.ends_at).toLocaleDateString("ru")
                    : "—",
                ],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    padding: "5px 0",
                    borderBottom: "0.5px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>{l}</span>
                  <span
                    style={{
                      fontWeight: 500,
                      maxWidth: 200,
                      textAlign: "right",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid var(--border)",
                borderRadius: 9,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
                Бюджет
              </div>
              {[
                ["Выделено", fmt(campaign.budget_total ?? 0)],
                ["Потрачено", fmt(campaign.budget_spent ?? 0)],
                [
                  "Остаток",
                  fmt(
                    (campaign.budget_total ?? 0) - (campaign.budget_spent ?? 0),
                  ),
                ],
                ["Показов", (campaign.impressions ?? 0).toLocaleString("ru")],
                ["Кликов", (campaign.clicks ?? 0).toLocaleString("ru")],
                ["Продаж", String(campaign.sales ?? 0)],
                ["Доход", fmt(campaign.revenue ?? 0)],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    padding: "5px 0",
                    borderBottom: "0.5px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creatives tab */}
        {activeTab === "creatives" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  Креативы кампании
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  Выберите и запланируйте публикацию
                </div>
              </div>
              {selectedCreatives.size > 0 && (
                <Button variant="primary" size="sm">
                  📅 Запланировать выбранные ({selectedCreatives.size})
                </Button>
              )}
            </div>

            {creatives.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>⬡</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  Нет креативов
                </div>
                <div style={{ fontSize: 12, marginBottom: 16 }}>
                  AI сгенерирует креативы после запуска кампании
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 10,
                }}
              >
                {creatives.map((c) => {
                  const sel = selectedCreatives.has(c.id);
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: sel
                          ? "var(--bg-tertiary)"
                          : "var(--bg-card)",
                        border: `0.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 9,
                        padding: 10,
                        cursor: "pointer",
                      }}
                      onClick={() => toggleCreative(c.id)}
                    >
                      <div
                        style={{
                          height: 80,
                          borderRadius: 7,
                          background: `linear-gradient(135deg, ${PLATFORM_COLORS[c.platform] ?? "#333"}, #111)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          marginBottom: 8,
                          position: "relative",
                        }}
                      >
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: 7,
                              position: "absolute",
                              inset: 0,
                            }}
                          />
                        ) : (
                          (c.platform?.slice(0, 2).toUpperCase() ?? "?")
                        )}
                        {sel && (
                          <div
                            style={{
                              position: "absolute",
                              top: 5,
                              right: 5,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              color: "var(--on-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          marginBottom: 3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.title ?? "Без названия"}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--text-secondary)",
                          marginBottom: 7,
                        }}
                      >
                        {c.platform} · {c.format}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 5,
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Badge variant={STATUS_BADGE[c.status] ?? "muted"}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleModal(c);
                            setScheduleTime("");
                          }}
                          style={{
                            fontSize: 9,
                            padding: "3px 8px",
                            background: "var(--primary)",
                            color: "var(--on-primary)",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: 600,
                          }}
                        >
                          📅 Запланировать
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Schedule tab */}
        {activeTab === "schedule" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
              Запланированные публикации
            </div>
            {scheduledPosts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  Нет запланированных постов
                </div>
                <div style={{ fontSize: 12 }}>
                  Выберите креативы и запланируйте публикацию
                </div>
              </div>
            ) : (
              scheduledPosts.map((p: any) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 13px",
                    background: "var(--bg-card)",
                    border: "0.5px solid var(--border)",
                    borderRadius: 9,
                    marginBottom: 7,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        p.status === "published"
                          ? "var(--success)"
                          : p.status === "failed"
                            ? "var(--danger)"
                            : "var(--warning)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {p.contents?.title ??
                        p.contents?.caption?.slice(0, 40) ??
                        "Пост"}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {p.platform} ·{" "}
                      {new Date(p.scheduled_at).toLocaleString("ru")}
                    </div>
                  </div>
                  <Badge
                    variant={
                      p.status === "published"
                        ? "success"
                        : p.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {(
                      {
                        published: "Опубликован",
                        pending: "Запланирован",
                        failed: "Ошибка",
                        processing: "В процессе",
                      } as Record<string, string>
                    )[p.status] ?? p.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Schedule modal */}
      <Modal
        open={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
        title="Запланировать публикацию"
        size="sm"
      >
        {scheduleModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 8,
                padding: 11,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Платформа: <strong>{scheduleModal.platform}</strong> ·{" "}
              {scheduleModal.title ?? "Без названия"}
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                  fontWeight: 500,
                }}
              >
                Дата и время публикации
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 11px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <Button variant="ghost" onClick={() => setScheduleModal(null)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleSchedule}
                style={{ opacity: !scheduleTime || scheduling ? 0.7 : 1 }}
              >
                {scheduling ? "Сохранение..." : "📅 Запланировать"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
