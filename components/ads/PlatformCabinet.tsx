"use client";
import { useState } from "react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PLATFORM_META } from "./data";
import { useAdCampaigns, useAdPlatforms } from "@/lib/hooks/useAdsData";

interface Props {
  platformKey: string;
  projectId?: string;
  onBack: () => void;
}

function fmt(n: number) {
  return n > 0
    ? `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`
    : "—";
}
function getCtrColor(v: number) {
  return v >= 3 ? "var(--success)" : v >= 2 ? "var(--tx-1)" : "var(--danger)";
}

export function PlatformCabinet({ platformKey, projectId, onBack }: Props) {
  const meta = PLATFORM_META[platformKey];
  const { data: allCampaigns = [] } = useAdCampaigns(projectId);
  const { data: platforms = [] } = useAdPlatforms(projectId);

  // Filter campaigns for this platform
  const campaigns = allCampaigns.filter((c) =>
    c.platforms?.includes(platformKey),
  );
  const platform = platforms.find((p) => p.platform_key === platformKey);

  const totalSpend = campaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const avgCtr = campaigns.length
    ? campaigns.reduce((s, c) => s + (c.ctr ?? 0), 0) / campaigns.length
    : 0;
  const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0;

  if (!meta) return null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel-2)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            border: "0.5px solid var(--line)",
            borderRadius: 7,
            background: "var(--panel)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
            color: "var(--tx-2)",
          }}
        >
          ← Назад
        </button>
        <PlatformLogo
          abbr={meta.abbr}
          color={meta.color}
          textColor={meta.textColor}
          size="md"
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{meta.name}</div>
          <div style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 1 }}>
            {platform
              ? `Кабинет: ${platform.account_name ?? platform.account_id ?? "Подключён"}`
              : "Не подключён"}
          </div>
        </div>
        {platform ? (
          <Badge variant="success">Активен</Badge>
        ) : (
          <Badge variant="muted">Не подключён</Badge>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!platform && (
            <Button variant="primary" size="sm">
              ⊕ Подключить кабинет
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onBack}>
            ✕
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Расход", value: fmt(totalSpend) },
            {
              label: "CTR",
              value: avgCtr > 0 ? `${avgCtr.toFixed(1)}%` : "—",
              color: getCtrColor(avgCtr),
            },
            {
              label: "ROAS",
              value: avgRoas > 0 ? `${Math.round(avgRoas)}%` : "—",
              color: avgRoas >= 200 ? "var(--success)" : "var(--tx-1)",
            },
            {
              label: "Заявок",
              value: totalLeads > 0 ? String(totalLeads) : "—",
            },
            { label: "Кампаний", value: String(campaigns.length) },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: "var(--panel)",
                border: "0.5px solid var(--line)",
                borderRadius: 9,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: (k as any).color ?? "var(--tx-1)",
                }}
              >
                {k.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 3 }}>
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Campaigns for this platform */}
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 9 }}>
          Кампании на {meta.name} · {campaigns.length}
        </div>

        {campaigns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 20px",
              color: "var(--tx-2)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>
              <PlatformLogo
                abbr={meta.abbr}
                color={meta.color}
                textColor={meta.textColor}
                size="lg"
              />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--tx-1)",
                marginBottom: 6,
                marginTop: 10,
              }}
            >
              Нет кампаний на {meta.name}
            </div>
            <div style={{ fontSize: 11, marginBottom: 14 }}>
              Создайте кампанию с этой платформой
            </div>
            <Button variant="primary">+ Создать кампанию</Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {campaigns.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  border: "0.5px solid var(--line)",
                  borderRadius: 9,
                  background: "var(--panel)",
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
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background:
                      c.status === "active"
                        ? "var(--success)"
                        : c.status === "paused"
                          ? "var(--tx-3)"
                          : "var(--warning)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 1 }}
                  >
                    {c.description ?? c.goal ?? ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 11, flexShrink: 0 }}>
                  {[
                    { v: fmt(c.budget_spent ?? 0), l: "расход" },
                    {
                      v: c.ctr > 0 ? `${c.ctr.toFixed(1)}%` : "—",
                      l: "CTR",
                      color: getCtrColor(c.ctr),
                    },
                    {
                      v: c.roas > 0 ? `${Math.round(c.roas)}%` : "—",
                      l: "ROAS",
                      color: c.roas >= 200 ? "var(--success)" : "var(--tx-1)",
                    },
                  ].map((m) => (
                    <div key={m.l} style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: (m as any).color ?? "var(--tx-1)",
                        }}
                      >
                        {m.v}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--tx-2)",
                          marginTop: 1,
                        }}
                      >
                        {m.l}
                      </div>
                    </div>
                  ))}
                </div>
                <Badge
                  variant={
                    c.status === "active"
                      ? "success"
                      : c.status === "paused"
                        ? "muted"
                        : "warning"
                  }
                >
                  {{
                    active: "Активна",
                    paused: "Пауза",
                    ab_test: "A/B",
                    draft: "Черновик",
                    completed: "Завершена",
                    warning: "Внимание",
                  }[c.status] ?? c.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Platform info */}
        {platform && (
          <div
            style={{
              marginTop: 14,
              background: "var(--panel)",
              border: "0.5px solid var(--line)",
              borderRadius: 9,
              padding: 13,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 10 }}>
              Информация о кабинете
            </div>
            {[
              ["Название", platform.name],
              ["Аккаунт ID", platform.account_id ?? "—"],
              ["Аккаунт", platform.account_name ?? "—"],
              [
                "Статус токена",
                platform.token_expires_at
                  ? `Истекает ${new Date(platform.token_expires_at).toLocaleDateString("ru")}`
                  : "Без срока",
              ],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "5px 0",
                  borderBottom: "0.5px solid var(--line)",
                }}
              >
                <span style={{ color: "var(--tx-2)" }}>{l}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
