"use client";
import { useState } from "react";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { Modal } from "@/components/ui/Modal";
import { PLATFORM_META } from "./data";
import {
  useAdPlatforms,
  useAdAudiences,
  useBudgetSummary,
} from "@/lib/hooks/useAdsData";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

interface LeftPanelProps {
  activePlatform?: string;
  onPlatformClick?: (key: string) => void;
  projectId?: string;
}

const CIS_KEYS = ["yandex", "vk", "telegram", "mytarget", "kaspi"];
const GLOBAL_KEYS = ["google", "meta", "tiktok"];

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
        color: "var(--text-muted)",
        marginBottom: 7,
        padding: "0 4px",
      }}
    >
      {children}
    </div>
  );
}

const AUD_ICONS: Record<string, string> = {
  custom: "👥",
  lookalike: "🎯",
  retargeting: "🔄",
  geo: "📍",
};
function fmtSize(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function LeftPanel({
  activePlatform = "all",
  onPlatformClick,
  projectId,
}: LeftPanelProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const { data: dbPlatforms = [] } = useAdPlatforms(projectId);
  const { data: audiences = [] } = useAdAudiences(projectId);
  const budget = useBudgetSummary(projectId);
  const [audienceModal, setAudienceModal] = useState<any>(null);

  const isConnected = (key: string) =>
    dbPlatforms.some((p) => p.platform_key === key && p.is_active);

  const renderPlatform = (key: string) => {
    const meta = PLATFORM_META[key];
    if (!meta) return null;
    const active = activePlatform === key;
    const connected = isConnected(key);
    return (
      <button
        key={key}
        onClick={() => onPlatformClick?.(key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 8px",
          borderRadius: 7,
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          marginBottom: 1,
          background: active ? "var(--bg-card)" : "transparent",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: active ? 500 : 400,
        }}
      >
        <PlatformLogo
          abbr={meta.abbr}
          color={meta.color}
          textColor={meta.textColor}
        />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {meta.name}
        </span>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flexShrink: 0,
            background: connected ? "var(--success)" : "var(--text-muted)",
          }}
        />
      </button>
    );
  };

  const navItem = (href: string, icon: string, label: string) => {
    const active = pathname.includes(href);
    return (
      <Link
        key={href}
        href={`/${locale}${href}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 7,
          fontSize: 11,
          textDecoration: "none",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          background: active ? "var(--bg-card)" : "transparent",
          fontWeight: active ? 500 : 400,
          marginBottom: 1,
        }}
      >
        <span style={{ fontSize: 12 }}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          borderRight: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 11px" }}>
          <SLabel>🇺🇿🇷🇺 СНГ</SLabel>
          {CIS_KEYS.map(renderPlatform)}

          <div
            style={{ borderTop: "0.5px solid var(--border)", margin: "8px 0" }}
          />
          <SLabel>🌍 Глобальные</SLabel>
          {GLOBAL_KEYS.map(renderPlatform)}

          <div
            style={{ borderTop: "0.5px solid var(--border)", margin: "8px 0" }}
          />
          <SLabel>Бюджет / месяц</SLabel>
          <div
            style={{
              background: "var(--bg-card)",
              border: "0.5px solid var(--border)",
              borderRadius: 8,
              padding: "9px 10px",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                marginBottom: 5,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Использовано
              </span>
              <span style={{ fontWeight: 600 }}>{budget.pct}%</span>
            </div>
            <div
              style={{
                height: 4,
                background: "var(--bg-tertiary)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, budget.pct)}%`,
                  height: "100%",
                  background:
                    budget.pct > 90
                      ? "var(--danger)"
                      : budget.pct > 70
                        ? "var(--warning)"
                        : "var(--success)",
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}
            >
              {budget.pct > 0
                ? `${budget.spentLabel} / ${budget.totalLabel}`
                : "Нет данных"}
            </div>
          </div>

          <div
            style={{ borderTop: "0.5px solid var(--border)", margin: "8px 0" }}
          />
          <SLabel>Аудитории</SLabel>
          {audiences.length === 0 ? (
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                padding: "4px 8px",
              }}
            >
              Нет аудиторий
            </div>
          ) : (
            audiences.map((a) => (
              <div
                key={a.id}
                onClick={() => setAudienceModal(a)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 8px",
                  cursor: "pointer",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-card)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span>{AUD_ICONS[a.type] ?? "👥"}</span>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.name}
                </span>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {fmtSize(a.size)}
                </span>
              </div>
            ))
          )}

          <div
            style={{ borderTop: "0.5px solid var(--border)", margin: "8px 0" }}
          />
          {navItem("/calendar", "📅", "Календарь")}
        </div>

        <div
          style={{
            borderTop: "0.5px solid var(--border)",
            padding: "8px 11px",
          }}
        >
          {navItem("/settings", "⚙️", "Настройки")}
        </div>
      </div>

      {/* Audience Modal */}
      <Modal
        open={!!audienceModal}
        onClose={() => setAudienceModal(null)}
        title={audienceModal?.name ?? "Аудитория"}
        size="sm"
      >
        {audienceModal && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                {
                  l: "Тип",
                  v:
                    (
                      {
                        custom: "Кастомная",
                        lookalike: "Look-alike",
                        retargeting: "Ретаргетинг",
                        geo: "Гео",
                      } as Record<string, string>
                    )[audienceModal.type] ?? audienceModal.type,
                },
                { l: "Размер", v: fmtSize(audienceModal.size) },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{s.v}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
            {audienceModal.description && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {audienceModal.description}
              </div>
            )}
            {audienceModal.platforms?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 7 }}>
                  Платформы
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {audienceModal.platforms.map((p: string) => {
                    const meta = PLATFORM_META[p];
                    return meta ? (
                      <div
                        key={p}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 9px",
                          background: "var(--bg-tertiary)",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        <PlatformLogo
                          abbr={meta.abbr}
                          color={meta.color}
                          textColor={meta.textColor}
                        />
                        {meta.name}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
