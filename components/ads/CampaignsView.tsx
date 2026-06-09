"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import {
  useAdCampaigns,
  useAdKPIs,
  useUpdateAdCampaign,
  useDeleteAdCampaign,
} from "@/lib/hooks/useAdsData";
import { PLATFORM_META } from "./data";
import type { AdCampaign } from "@/lib/supabase/types";

type FilterKey = "all" | "active" | "paused" | "ab_test" | "draft";

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "success",
  paused: "muted",
  ab_test: "warning",
  warning: "danger",
  draft: "muted",
  completed: "info",
};
const STATUS_DOT: Record<string, string> = {
  active: "var(--success)",
  paused: "var(--tx-3)",
  ab_test: "var(--warning)",
  warning: "var(--danger)",
  draft: "var(--tx-3)",
  completed: "var(--info)",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Активна",
  paused: "Пауза",
  ab_test: "A/B тест",
  warning: "Внимание",
  draft: "Черновик",
  completed: "Завершена",
};

function getCtrColor(v: number) {
  return v >= 3 ? "var(--success)" : v >= 2 ? "var(--tx-1)" : "var(--danger)";
}
function getRoasColor(v: number) {
  return v >= 300
    ? "var(--success)"
    : v >= 200
      ? "var(--tx-1)"
      : "var(--danger)";
}
function fmt(n: number, prefix = "₽") {
  return n > 0
    ? `${prefix}${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`
    : "—";
}

export function CampaignsView({
  onCreateCampaign,
  projectId,
}: {
  onCreateCampaign?: () => void;
  projectId?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { data: campaigns = [], isLoading } = useAdCampaigns(projectId);
  const kpis = useAdKPIs(projectId);
  const updateCampaign = useUpdateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();

  const [kpiModal, setKpiModal] = useState<number | null>(null);
  const [campaignModal, setCampaignModal] = useState<AdCampaign | null>(null);
  const [funnelModal, setFunnelModal] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState("default");

  const filtered = campaigns
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => {
      if (sortBy === "ctr") return (b.ctr ?? 0) - (a.ctr ?? 0);
      if (sortBy === "roas") return (b.roas ?? 0) - (a.roas ?? 0);
      if (sortBy === "spend")
        return (b.budget_spent ?? 0) - (a.budget_spent ?? 0);
      return 0;
    });

  const totalImpressions = campaigns.reduce(
    (s, c) => s + (c.impressions ?? 0),
    0,
  );
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalSales = campaigns.reduce((s, c) => s + (c.sales ?? 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);

  return (
    <div>
      {/* KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            onClick={() => setKpiModal(i)}
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 9,
              padding: "10px 12px",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--line)")
            }
          >
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}>
              {kpi.label}
            </div>
            {kpi.delta && (
              <div
                style={{
                  fontSize: 10,
                  color: kpi.positive ? "var(--success)" : "var(--danger)",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {kpi.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 9,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "active", "paused", "ab_test", "draft"] as FilterKey[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 10,
                  fontWeight: 500,
                  background: filter === f ? "var(--chip)" : "transparent",
                  color: filter === f ? "var(--tx-1)" : "var(--tx-2)",
                }}
              >
                {
                  {
                    all: "Все",
                    active: "Активные",
                    paused: "Пауза",
                    ab_test: "A/B",
                    draft: "Черновики",
                  }[f]
                }
                {f === "all" && ` · ${campaigns.length}`}
                {f === "draft" &&
                  campaigns.filter((c) => c.status === "draft").length > 0 &&
                  ` · ${campaigns.filter((c) => c.status === "draft").length}`}
              </button>
            ),
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "4px 9px",
              fontSize: 10,
              fontFamily: "inherit",
              border: "0.5px solid var(--line)",
              borderRadius: 6,
              background: "var(--bg)",
              color: "var(--tx-2)",
              cursor: "pointer",
            }}
          >
            <option value="default">По дате</option>
            <option value="ctr">По CTR</option>
            <option value="roas">По ROAS</option>
            <option value="spend">По расходу</option>
          </select>
          <Button variant="primary" size="sm" onClick={onCreateCampaign}>
            + Создать
          </Button>
        </div>
      </div>

      {/* Campaigns */}
      {isLoading && (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--tx-2)",
            fontSize: 12,
          }}
        >
          Загрузка кампаний...
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 20px",
            color: "var(--tx-2)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--tx-1)",
              marginBottom: 6,
            }}
          >
            Нет кампаний
          </div>
          <div style={{ fontSize: 11, marginBottom: 14 }}>
            Создайте первую рекламную кампанию
          </div>
          <Button variant="primary" onClick={onCreateCampaign}>
            + Создать кампанию
          </Button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          marginBottom: 14,
        }}
      >
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "10px 12px",
              border: `0.5px solid ${c.status === "ab_test" ? "var(--warning)" : "var(--line)"}`,
              borderRadius: 9,
              cursor: "pointer",
              background:
                c.status === "ab_test"
                  ? "rgba(245,158,11,0.04)"
                  : "var(--panel)",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (c.status !== "ab_test")
                e.currentTarget.style.borderColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              if (c.status !== "ab_test")
                e.currentTarget.style.borderColor = "var(--line)";
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: STATUS_DOT[c.status] ?? "var(--tx-3)",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {(c.platforms ?? []).slice(0, 3).map((pid: string) => {
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 2,
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--tx-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.description ?? c.goal ?? ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 11, flexShrink: 0 }}>
              {[
                {
                  v: fmt(c.budget_spent ?? 0),
                  l: "расход",
                  color: "var(--tx-1)",
                },
                {
                  v: c.ctr > 0 ? `${c.ctr.toFixed(1)}%` : "—",
                  l: "CTR",
                  color: getCtrColor(c.ctr),
                },
                {
                  v: c.cpl > 0 ? fmt(c.cpl) : "—",
                  l: "CPL",
                  color: "var(--tx-1)",
                },
                {
                  v: c.roas > 0 ? `${Math.round(c.roas)}%` : "—",
                  l: "ROAS",
                  color: getRoasColor(c.roas),
                },
              ].map((m) => (
                <div key={m.l} style={{ textAlign: "right" }}>
                  <div
                    style={{ fontSize: 11, fontWeight: 500, color: m.color }}
                  >
                    {m.v}
                  </div>
                  <div
                    style={{ fontSize: 9, color: "var(--tx-2)", marginTop: 1 }}
                  >
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
            <Badge variant={STATUS_BADGE[c.status] ?? "muted"}>
              {STATUS_LABEL[c.status] ?? c.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Funnel */}
      {campaigns.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
            Воронка по всем кампаниям
          </div>
          <div
            onClick={() => setFunnelModal(true)}
            style={{
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 9,
              padding: "11px 13px",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--line)")
            }
          >
            {[
              {
                label: "Показы",
                value:
                  totalImpressions > 0
                    ? totalImpressions.toLocaleString("ru")
                    : "—",
                color: "#3B82F6",
                w: 100,
              },
              {
                label: "Клики",
                value: totalClicks > 0 ? totalClicks.toLocaleString("ru") : "—",
                color: "#3A8D5C",
                w:
                  totalImpressions > 0
                    ? Math.round((totalClicks / totalImpressions) * 100 * 5)
                    : 0,
              },
              {
                label: "Заявки",
                value: totalLeads > 0 ? String(totalLeads) : "—",
                color: "#F59E0B",
                w:
                  totalClicks > 0
                    ? Math.round((totalLeads / totalClicks) * 100 * 10)
                    : 0,
              },
              {
                label: "Продажи",
                value: totalSales > 0 ? String(totalSales) : "—",
                color: "#EF4444",
                w:
                  totalLeads > 0
                    ? Math.round((totalSales / totalLeads) * 100 * 2)
                    : 0,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "5px 0",
                }}
              >
                <div
                  style={{
                    width: 80,
                    fontSize: 10,
                    color: "var(--tx-2)",
                    flexShrink: 0,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 20,
                    background: "var(--panel-2)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(2, s.w))}%`,
                      height: "100%",
                      background: s.color,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                    }}
                  >
                    <span
                      style={{ fontSize: 10, fontWeight: 500, color: "#fff" }}
                    >
                      {s.value}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div
              style={{
                borderTop: "0.5px solid var(--line)",
                marginTop: 8,
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--success)",
                }}
              >
                {fmt(totalRevenue)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--success)",
                  fontWeight: 500,
                }}
              >
                {campaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0) > 0
                  ? `×${(totalRevenue / campaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0)).toFixed(1)} ROAS`
                  : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Modal */}
      <Modal
        open={kpiModal !== null}
        onClose={() => setKpiModal(null)}
        title={
          kpiModal !== null ? `${kpis[kpiModal]?.label} — детализация` : ""
        }
        size="lg"
      >
        {kpiModal !== null && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: "11px 13px",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {kpis[kpiModal]?.value}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}
                >
                  Текущее значение
                </div>
              </div>
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: "11px 13px",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {campaigns.filter((c) => c.status === "active").length}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}
                >
                  Активных кампаний
                </div>
              </div>
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: "11px 13px",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {campaigns.length}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}
                >
                  Всего кампаний
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
              По кампаниям
            </div>
            {campaigns.slice(0, 5).map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {fmt(c.budget_spent ?? 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Campaign Modal */}
      <Modal
        open={!!campaignModal}
        onClose={() => setCampaignModal(null)}
        title={campaignModal?.name ?? ""}
        size="lg"
      >
        {campaignModal && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                {
                  label: "Расход",
                  value: fmt(campaignModal.budget_spent ?? 0),
                },
                {
                  label: "CTR",
                  value:
                    campaignModal.ctr > 0
                      ? `${campaignModal.ctr.toFixed(1)}%`
                      : "—",
                  color: getCtrColor(campaignModal.ctr),
                },
                {
                  label: "CPL",
                  value: campaignModal.cpl > 0 ? fmt(campaignModal.cpl) : "—",
                },
                {
                  label: "ROAS",
                  value:
                    campaignModal.roas > 0
                      ? `${Math.round(campaignModal.roas)}%`
                      : "—",
                  color: getRoasColor(campaignModal.roas),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--panel-2)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: (s as any).color || "var(--tx-1)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {campaignModal.description && (
              <div
                style={{ fontSize: 11, color: "var(--tx-2)", marginBottom: 12 }}
              >
                {campaignModal.description}
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                  Показатели
                </div>
                {[
                  [
                    "Показов",
                    campaignModal.impressions?.toLocaleString("ru") ?? "—",
                  ],
                  ["Кликов", campaignModal.clicks?.toLocaleString("ru") ?? "—"],
                  ["Заявок", String(campaignModal.leads ?? "—")],
                  ["Продаж", String(campaignModal.sales ?? "—")],
                  ["Доход", fmt(campaignModal.revenue ?? 0)],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      padding: "4px 0",
                      borderBottom: "0.5px solid var(--line)",
                    }}
                  >
                    <span style={{ color: "var(--tx-2)" }}>{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                  Бюджет
                </div>
                {[
                  ["Выделено", fmt(campaignModal.budget_total ?? 0)],
                  ["Потрачено", fmt(campaignModal.budget_spent ?? 0)],
                  [
                    "Остаток",
                    fmt(
                      (campaignModal.budget_total ?? 0) -
                        (campaignModal.budget_spent ?? 0),
                    ),
                  ],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      padding: "4px 0",
                      borderBottom: "0.5px solid var(--line)",
                    }}
                  >
                    <span style={{ color: "var(--tx-2)" }}>{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {campaignModal.budget_total &&
                  campaignModal.budget_total > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          height: 4,
                          background: "var(--chip)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.round(((campaignModal.budget_spent ?? 0) / campaignModal.budget_total) * 100))}%`,
                            height: "100%",
                            background: "var(--primary)",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--tx-3)",
                          marginTop: 3,
                        }}
                      >
                        {Math.round(
                          ((campaignModal.budget_spent ?? 0) /
                            campaignModal.budget_total) *
                            100,
                        )}
                        % использовано
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              {campaignModal.status === "active" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateCampaign.mutate({
                      id: campaignModal.id,
                      status: "paused",
                    });
                    setCampaignModal(null);
                  }}
                >
                  ⏸ Поставить на паузу
                </Button>
              )}
              {campaignModal.status === "paused" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    updateCampaign.mutate({
                      id: campaignModal.id,
                      status: "active",
                    });
                    setCampaignModal(null);
                  }}
                >
                  ▶ Возобновить
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm("Удалить кампанию?")) {
                    deleteCampaign.mutate(campaignModal.id);
                    setCampaignModal(null);
                  }
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Funnel Modal */}
      <Modal
        open={funnelModal}
        onClose={() => setFunnelModal(false)}
        title="Воронка — все кампании"
        size="xl"
      >
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {[
              { l: "Показы", v: totalImpressions },
              { l: "Клики", v: totalClicks },
              { l: "Заявки", v: totalLeads },
              { l: "Продажи", v: totalSales },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {s.v > 0 ? s.v.toLocaleString("ru") : "—"}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
            По кампаниям
          </div>
          {campaigns.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 12px",
                background: "var(--panel-2)",
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 120,
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </div>
              {[
                { v: c.impressions ?? 0, l: "Показы" },
                { v: c.clicks ?? 0, l: "Клики" },
                { v: c.leads ?? 0, l: "Заявки" },
                { v: c.roas ?? 0, l: "ROAS", suffix: "%" },
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {m.v > 0
                      ? m.v > 999
                        ? `${Math.round(m.v / 1000)}k`
                        : m.v
                      : "—"}
                    {(m as any).suffix ?? ""}
                  </div>
                  <div
                    style={{ fontSize: 9, color: "var(--tx-2)", marginTop: 1 }}
                  >
                    {m.l}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
