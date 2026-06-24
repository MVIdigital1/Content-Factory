"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Plus,
  Settings,
  Trash2,
  Power,
  BarChart2,
  CheckCircle,
} from "lucide-react";

type Integration = {
  id: string;
  platform: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  token?: string;
};

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot";

// ── All platforms config ──────────────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  {
    key: "telegram",
    name: "Telegram",
    abbr: "TG",
    color: "#0088CC",
    desc: "Каналы и группы",
    canConnect: true,
    howTo: `Добавь @${BOT_USERNAME} как администратора в канал, затем введи username канала`,
  },
  {
    key: "instagram",
    name: "Instagram",
    abbr: "IG",
    color: "#E1306C",
    desc: "Business или Creator аккаунт",
    canConnect: true,
    oauth: true,
    howTo: "Подключается через официальный OAuth Instagram",
  },
  {
    key: "tiktok",
    name: "TikTok",
    abbr: "TT",
    color: "#010101",
    desc: "Business аккаунт",
    canConnect: false,
    soon: true,
  },
  {
    key: "youtube",
    name: "YouTube",
    abbr: "YT",
    color: "#FF0000",
    desc: "YouTube канал",
    canConnect: false,
    soon: true,
  },
  {
    key: "vk",
    name: "ВКонтакте",
    abbr: "VK",
    color: "#0077FF",
    desc: "Группа или сообщество",
    canConnect: false,
    soon: true,
  },
];

const AD_PLATFORMS = [
  {
    key: "yandex",
    name: "Яндекс Директ",
    abbr: "Я",
    color: "#FFDB4D",
    textColor: "#664400",
    canConnect: true,
    desc: "Рекламный кабинет",
  },
  {
    key: "google",
    name: "Google Ads",
    abbr: "G",
    color: "#34A853",
    canConnect: true,
    desc: "Рекламный кабинет",
  },
  {
    key: "meta",
    name: "Meta Ads",
    abbr: "M",
    color: "#1877F2",
    canConnect: true,
    desc: "Facebook/Instagram реклама",
  },
  {
    key: "vk_ads",
    name: "VK Реклама",
    abbr: "VK",
    color: "#0077FF",
    canConnect: false,
    desc: "Рекламный кабинет",
    soon: true,
  },
  {
    key: "mytarget",
    name: "myTarget",
    abbr: "MT",
    color: "#FF6600",
    canConnect: false,
    desc: "Рекламный кабинет",
    soon: true,
  },
  {
    key: "tiktok_ads",
    name: "TikTok Ads",
    abbr: "TT",
    color: "#010101",
    canConnect: false,
    desc: "Рекламный кабинет",
    soon: true,
  },
];

function PlatformIcon({
  color,
  abbr,
  textColor,
  size = 44,
}: {
  color: string;
  abbr: string;
  textColor?: string;
  size?: number;
}) {
  const isGradient = color.includes("gradient") || color.includes("#833");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: textColor ?? "#fff",
        fontSize: size * 0.29,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {abbr}
    </div>
  );
}

// ── Channel detail modal ──────────────────────────────────────────────────
function ChannelModal({
  integration,
  platform,
  onClose,
  onDelete,
  onToggle,
  onRename,
}: {
  integration: Integration;
  platform: (typeof SOCIAL_PLATFORMS)[0] | (typeof AD_PLATFORMS)[0];
  onClose: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRename: (name: string) => void;
}) {
  const supabase = createClient();
  const [editName, setEditName] = useState(integration.channel_name);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      if (platform.key === "telegram") {
        const res = await fetch("/api/telegram/channel-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel_id: integration.channel_id }),
        });
        const d = await res.json();
        if (d.ok) setStats(d);
      }
    } catch {}
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const inp = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "0.5px solid var(--line)",
    background: "var(--panel)",
    color: "var(--tx-1)",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
          }}
        >
          <PlatformIcon
            color={(platform as any).color}
            abbr={platform.abbr}
            textColor={(platform as any).textColor}
            size={36}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>
              {integration.channel_name || integration.channel_id}
            </p>
            <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
              {integration.channel_id}
            </p>
          </div>
          <span
            style={{
              fontSize: 10,
              padding: "3px 9px",
              borderRadius: 10,
              background: integration.is_active
                ? "var(--pos-dim)"
                : "var(--chip)",
              color: integration.is_active ? "var(--pos)" : "var(--tx-3)",
              fontWeight: 600,
            }}
          >
            {integration.is_active ? "Активен" : "Остановлен"}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--tx-3)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Stats */}
          {loadingStats && (
            <p
              style={{
                fontSize: 11,
                color: "var(--tx-3)",
                textAlign: "center",
              }}
            >
              Загрузка статистики...
            </p>
          )}
          {stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {[
                { l: "Подписчиков", v: stats.member_count ?? "—" },
                { l: "Постов/неделя", v: stats.posts_this_week ?? 0 },
                {
                  l: "Последний пост",
                  v: stats.last_post_at
                    ? new Date(stats.last_post_at).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—",
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    padding: "10px",
                    background: "var(--panel-2)",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    {s.v}
                  </p>
                  <p
                    style={{ fontSize: 9, color: "var(--tx-3)", marginTop: 2 }}
                  >
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Rename */}
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tx-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Название
            </p>
            {editing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={inp}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onRename(editName);
                      setEditing(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    onRename(editName);
                    setEditing(false);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  OK
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "0.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--tx-3)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 13, color: "var(--tx-1)", flex: 1 }}>
                  {integration.channel_name || "—"}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: "0.5px solid var(--line)",
                    background: "transparent",
                    color: "var(--tx-2)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Settings size={12} /> Переименовать
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 8,
              paddingTop: 4,
              borderTop: "0.5px solid var(--line)",
            }}
          >
            <button
              onClick={onToggle}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px",
                borderRadius: 9,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: integration.is_active ? "var(--warn)" : "var(--pos)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Power size={14} />{" "}
              {integration.is_active ? "Остановить" : "Запустить"}
            </button>
            <button
              onClick={fetchStats}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px",
                borderRadius: 9,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: "var(--tx-2)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <BarChart2 size={14} /> Обновить статистику
            </button>
            <button
              onClick={() => {
                if (confirm(`Удалить ${integration.channel_name}?`)) {
                  onDelete();
                  onClose();
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 9,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: "var(--neg)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Telegram modal ────────────────────────────────────────────────────
function AddTelegramModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "0.5px solid var(--line)",
    background: "var(--panel)",
    color: "var(--tx-1)",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  const testChannel = async () => {
    if (!channelId) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/telegram/check-chanel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
      const d = await res.json();
      setTestResult(
        d.ok
          ? `✓ Найден: ${d.result?.title || channelId}`
          : `✗ Не найден. Добавьте @${BOT_USERNAME} как администратора`,
      );
    } catch {
      setTestResult("✗ Ошибка проверки");
    }
    setTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/add-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channelId,
          channel_name: channelName || channelId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Ошибка подключения");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PlatformIcon color="#0088CC" abbr="TG" size={32} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>
              Добавить Telegram канал
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--tx-3)",
            }}
          >
            <X size={14} />
          </button>
        </div>
        <form
          onSubmit={handleSave}
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              background: "var(--panel-2)",
              border: "0.5px solid var(--line)",
              borderRadius: 9,
              fontSize: 11,
              color: "var(--tx-2)",
              lineHeight: 1.6,
            }}
          >
            Добавь бота{" "}
            <strong style={{ color: "var(--tx-1)" }}>@{BOT_USERNAME}</strong>{" "}
            как администратора в свой канал, затем введи его username или ID
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tx-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              ID канала *
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={channelId}
                onChange={(e) => {
                  setChannelId(e.target.value);
                  setTestResult("");
                }}
                placeholder="@mychannel или -1001234567890"
                required
                style={{ ...inp, flex: 1 }}
              />
              <button
                type="button"
                onClick={testChannel}
                disabled={!channelId || testing}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "0.5px solid var(--line)",
                  background: "transparent",
                  color: "var(--tx-2)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  opacity: !channelId || testing ? 0.5 : 1,
                }}
              >
                {testing ? "..." : "Проверить"}
              </button>
            </div>
            {testResult && (
              <p
                style={{
                  fontSize: 11,
                  marginTop: 5,
                  fontWeight: 500,
                  color: testResult.startsWith("✓")
                    ? "var(--pos)"
                    : "var(--neg)",
                }}
              >
                {testResult}
              </p>
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tx-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Название (необязательно)
            </p>
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Мой канал"
              style={inp}
            />
          </div>
          {error && (
            <p
              style={{
                fontSize: 11,
                color: "var(--neg)",
                padding: "8px 12px",
                background: "rgba(220,38,38,0.08)",
                borderRadius: 7,
              }}
            >
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button
              type="submit"
              disabled={loading || !channelId}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 9,
                border: "none",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: loading || !channelId ? 0.6 : 1,
              }}
            >
              {loading ? "Подключаем..." : "Подключить канал"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                borderRadius: 9,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: "var(--tx-2)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Ad Platform modal ─────────────────────────────────────────────────
function AdPlatformDrawer({
  platform,
  record,
  onClose,
  onDisconnect,
  onRefresh,
}: {
  platform: (typeof AD_PLATFORMS)[0];
  record: any;
  onClose: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();

  const connectedDate = record.updated_at
    ? new Date(record.updated_at).toLocaleDateString("ru", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 150,
          background: "rgba(0,0,0,0.18)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 151,
          width: 320,
          background: "var(--panel)",
          borderLeft: "0.5px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.14)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <PlatformIcon
            color={platform.color}
            abbr={platform.abbr}
            textColor={(platform as any).textColor}
            size={40}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
              {platform.name}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--tx-3)",
                margin: 0,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {record.ad_account_id ?? record.account_name ?? "Подключён"}
            </p>
          </div>
          <span
            style={{
              fontSize: 9,
              padding: "3px 8px",
              borderRadius: 8,
              background: "var(--pos-dim)",
              color: "var(--pos)",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Активен
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--tx-3)",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Metrics 2×2 */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--tx-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Метрики за месяц
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {[
              { label: "Расход", value: "₽0" },
              { label: "Клики", value: "0" },
              { label: "Лиды", value: "0" },
              { label: "CTR", value: "0%" },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  padding: "10px 12px",
                  background: "var(--panel-2)",
                  border: "0.5px solid var(--line)",
                  borderRadius: 9,
                }}
              >
                <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginBottom: 4 }}>
                  {m.label}
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "0.5px solid var(--line)",
          }}
        >
          {[
            { label: "Статус", value: record.status ?? "active" },
            { label: "ID кабинета", value: record.ad_account_id ?? "—" },
            { label: "Подключён", value: connectedDate },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 0",
                borderBottom: "0.5px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>{row.label}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-1)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: "auto",
          }}
        >
          <button
            onClick={() => {
              onClose();
              router.push(`/${locale}/campaigns`);
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 9,
              border: "none",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            → Кампании
          </button>
          <button
            onClick={() => {
              onRefresh();
              onClose();
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 9,
              border: "0.5px solid var(--line)",
              background: "transparent",
              color: "var(--tx-2)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ↻ Обновить данные
          </button>
          <button
            onClick={onDisconnect}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 9,
              border: "0.5px solid var(--neg)",
              background: "transparent",
              color: "var(--neg)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Отключить
          </button>
        </div>
      </div>
    </>
  );
}

// ── Platform row component ────────────────────────────────────────────────
function PlatformRow({
  platformConfig,
  integrations,
  onAdd,
  onChannelClick,
}: {
  platformConfig: any;
  integrations: Integration[];
  onAdd: () => void;
  onChannelClick: (i: Integration) => void;
}) {
  const connected = integrations.filter(
    (i) => i.platform === platformConfig.key,
  );
  const isConnected = connected.length > 0;

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "0.5px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
        }}
      >
        <PlatformIcon
          color={platformConfig.color}
          abbr={platformConfig.abbr}
          textColor={platformConfig.textColor}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 3,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>
              {platformConfig.name}
            </p>
            {platformConfig.soon && (
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--chip)",
                  color: "var(--tx-3)",
                  fontWeight: 600,
                }}
              >
                Скоро
              </span>
            )}
            {isConnected && !platformConfig.soon && (
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--pos-dim)",
                  color: "var(--pos)",
                  fontWeight: 600,
                }}
              >
                {connected.length > 1
                  ? `${connected.length} подключено`
                  : "Подключён"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
            {platformConfig.desc}
          </p>
        </div>
        {!platformConfig.soon && (
          <button
            onClick={onAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: isConnected ? "var(--chip)" : "var(--accent)",
              color: isConnected ? "var(--tx-2)" : "var(--on-accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            {isConnected ? "Добавить ещё" : "Подключить"}
          </button>
        )}
      </div>

      {/* Connected channels list */}
      {connected.length > 0 && (
        <div
          style={{
            borderTop: "0.5px solid var(--line)",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {connected.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onChannelClick(ch)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--panel-2)",
                borderRadius: 9,
                border: "0.5px solid var(--line)",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--line)")
              }
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: platformConfig.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {platformConfig.abbr}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--tx-1)",
                  }}
                >
                  {ch.channel_name || ch.channel_id}
                </p>
                <p style={{ fontSize: 10, color: "var(--tx-3)" }}>
                  {ch.channel_id}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: ch.is_active ? "var(--pos-dim)" : "var(--chip)",
                  color: ch.is_active ? "var(--pos)" : "var(--tx-3)",
                  fontWeight: 600,
                }}
              >
                {ch.is_active ? "Активен" : "Остановлен"}
              </span>
              <Settings
                size={13}
                style={{ color: "var(--tx-3)", flexShrink: 0 }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
function IntegrationsPageInner() {
  const supabase = createClient();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"social" | "ads">("social");

  // Modals / drawers
  const [addTgModal, setAddTgModal] = useState(false);
  const [adDrawer, setAdDrawer] = useState<{
    platform: (typeof AD_PLATFORMS)[0];
    record: any;
  } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<{
    platform: (typeof AD_PLATFORMS)[0];
    record: any;
  } | null>(null);
  const [channelModal, setChannelModal] = useState<{
    integration: Integration;
    platform: any;
  } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const s = searchParams.get("success");
    const e = searchParams.get("error");
    if (s === "instagram") {
      showToast("✓ Instagram успешно подключён!");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    } else if (s === "meta") {
      showToast("✓ Meta Ads подключён!");
      qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
    } else if (s === "google") {
      showToast("✓ Google Ads подключён!");
      qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
    } else if (s === "yandex") {
      showToast("✓ Яндекс Директ подключён!");
      qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
    } else if (e) showToast(`Ошибка: ${decodeURIComponent(e)}`, false);
  }, [searchParams]);

  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Integration[];
    },
  });

  const { data: adPlatforms = [] } = useQuery({
    queryKey: ["ad_platforms_real"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_platforms")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return (data || []) as Integration[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
      table,
    }: {
      id: string;
      is_active: boolean;
      table: "integrations" | "ad_platforms";
    }) => {
      await supabase.from(table).update({ is_active }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      table,
    }: {
      id: string;
      table: "integrations" | "ad_platforms";
    }) => {
      await supabase.from(table).delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      id,
      channel_name,
    }: {
      id: string;
      channel_name: string;
    }) => {
      const res = await fetch("/api/telegram/add-channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, channel_name }),
      });
      if (!res.ok) throw new Error("Ошибка переименования");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      showToast("Название обновлено");
    },
  });

  const connectInstagram = () => {
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ?? "";
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "instagram_business_basic,instagram_business_content_publish",
      response_type: "code",
    });
    window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
  };

  const connectMetaAds = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_META_REDIRECT_URI ?? "",
      scope: "ads_read,ads_management,leads_retrieval,business_management,instagram_business_basic,instagram_business_content_publish",
      response_type: "code",
      state: "meta_ads",
    });
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  };

  const connectGoogleAds = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? "",
      scope: "https://www.googleapis.com/auth/adwords",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`;
  };

  const connectYandexAds = () => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_YANDEX_REDIRECT_URI ?? "",
    });
    window.location.href = `https://oauth.yandex.ru/authorize?${params}`;
  };

  const totalConnected = integrations.length + adPlatforms.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)", flex: 1 }}>
          Маркетинг /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
            Подключения
          </span>
        </p>
        {totalConnected > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 10,
              background: "var(--pos-dim)",
              color: "var(--pos)",
              fontWeight: 600,
            }}
          >
            {totalConnected} подключено
          </span>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 999,
            padding: "10px 16px",
            borderRadius: 10,
            background: toast.ok ? "var(--pos)" : "var(--neg)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            background: "var(--panel-2)",
            border: "0.5px solid var(--line)",
            borderRadius: 10,
            width: "fit-content",
            marginBottom: 20,
          }}
        >
          {[
            { key: "social", label: "Соцсети" },
            { key: "ads", label: "Рекламные кабинеты" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === t.key ? "var(--panel)" : "transparent",
                color: activeTab === t.key ? "var(--tx-1)" : "var(--tx-3)",
                fontSize: 12,
                fontWeight: activeTab === t.key ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Social platforms */}
        {activeTab === "social" && (
          <div
            style={{
              maxWidth: 680,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <PlatformRow
                key={p.key}
                platformConfig={p}
                integrations={integrations}
                onAdd={() => {
                  if (p.key === "telegram") setAddTgModal(true);
                  else if (p.key === "instagram") connectInstagram();
                }}
                onChannelClick={(ch) =>
                  setChannelModal({ integration: ch, platform: p })
                }
              />
            ))}
          </div>
        )}

        {/* Ad platforms */}
        {activeTab === "ads" && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

            {/* ── Left column ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Три метрики вверху */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  { label: "Подключено", value: adPlatforms.length, unit: "кабинетов" },
                  { label: "Расход за месяц", value: "₽0", unit: "" },
                  { label: "Лидов за месяц", value: "0", unit: "" },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: "14px 16px",
                      background: "var(--panel)",
                      border: "0.5px solid var(--line)",
                      borderRadius: 12,
                    }}
                  >
                    <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginBottom: 6 }}>
                      {m.label}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "var(--tx-1)", margin: 0 }}>
                      {m.value}
                    </p>
                    {m.unit && (
                      <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0, marginTop: 2 }}>
                        {m.unit}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Карточки платформ */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {AD_PLATFORMS.map((p) => {
                  const record = (adPlatforms as any[]).find(
                    (a) => (a.platform_key ?? a.platform) === p.key,
                  );
                  const isConnected = !!record;
                  const isSelected = selectedPlatform?.platform.key === p.key;

                  return (
                    <div
                      key={p.key}
                      onClick={() => {
                        if (isConnected) setSelectedPlatform({ platform: p, record });
                      }}
                      style={{
                        background: isSelected ? "var(--hover)" : "var(--panel)",
                        border: `0.5px solid ${
                          isSelected
                            ? "var(--accent)"
                            : isConnected
                            ? "color-mix(in srgb, var(--pos) 30%, transparent)"
                            : "var(--line)"
                        }`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        cursor: isConnected ? "pointer" : "default",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (isConnected && !isSelected)
                          (e.currentTarget as HTMLElement).style.background = "var(--hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                      }}
                    >
                      <PlatformIcon
                        color={p.color}
                        abbr={p.abbr}
                        textColor={(p as any).textColor}
                        size={44}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                            {p.name}
                          </p>
                          {isConnected && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 7px",
                                borderRadius: 7,
                                background: "var(--pos-dim)",
                                color: "var(--pos)",
                                fontWeight: 700,
                              }}
                            >
                              Активен
                            </span>
                          )}
                          {(p as any).soon && !isConnected && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 7px",
                                borderRadius: 7,
                                background: "var(--chip)",
                                color: "var(--tx-3)",
                                fontWeight: 600,
                              }}
                            >
                              Скоро
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--tx-3)", margin: 0 }}>
                          {isConnected
                            ? record.ad_account_id ?? record.account_name ?? p.desc
                            : p.desc}
                        </p>
                      </div>

                      {isConnected ? (
                        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0 }}>Расход</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                              ₽0
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 10, color: "var(--tx-3)", margin: 0 }}>Лиды</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)", margin: 0 }}>
                              0
                            </p>
                          </div>
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "var(--pos)",
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if ((p as any).soon) return;
                            if (p.key === "meta") connectMetaAds();
                            else if (p.key === "google") connectGoogleAds();
                            else if (p.key === "yandex") connectYandexAds();
                          }}
                          disabled={!!(p as any).soon}
                          style={{
                            padding: "7px 16px",
                            borderRadius: 8,
                            border: "0.5px solid var(--accent)",
                            background: "transparent",
                            color: "var(--accent)",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: (p as any).soon ? "default" : "pointer",
                            fontFamily: "inherit",
                            opacity: (p as any).soon ? 0.35 : 1,
                            flexShrink: 0,
                            transition: "opacity 0.15s",
                          }}
                        >
                          {(p as any).soon ? "Скоро" : "Подключить"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right panel ── */}
            {selectedPlatform && (
              <div
                style={{
                  width: 280,
                  flexShrink: 0,
                  background: "var(--panel)",
                  border: "0.5px solid var(--line)",
                  borderRadius: 14,
                  padding: "20px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  position: "sticky",
                  top: 16,
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <PlatformIcon
                    color={selectedPlatform.platform.color}
                    abbr={selectedPlatform.platform.abbr}
                    textColor={(selectedPlatform.platform as any).textColor}
                    size={40}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--tx-1)" }}>
                      {selectedPlatform.platform.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>
                      {selectedPlatform.record.ad_account_id ?? "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlatform(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--tx-3)",
                      padding: 4,
                      lineHeight: 1,
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--pos) 12%, transparent)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--pos)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--pos)", fontWeight: 600 }}>
                    Активен
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Расход", value: "₽0" },
                    { label: "Клики", value: "0" },
                    { label: "Лиды", value: "0" },
                    { label: "CTR", value: "0%" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      style={{
                        padding: "10px 12px",
                        background: "var(--panel-2)",
                        borderRadius: 10,
                        border: "0.5px solid var(--line)",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 10, color: "var(--tx-3)" }}>{m.label}</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)", marginTop: 3 }}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Connected date */}
                {selectedPlatform.record.updated_at && (
                  <p style={{ margin: 0, fontSize: 11, color: "var(--tx-3)" }}>
                    Подключён:{" "}
                    {new Date(selectedPlatform.record.updated_at).toLocaleDateString("ru-RU")}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() =>
                      router.push(`/${locale}/integrations/${selectedPlatform.platform.key}`)
                    }
                    style={{
                      padding: "9px 0",
                      borderRadius: 9,
                      background: "var(--accent)",
                      color: "var(--on-accent)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  >
                    Подробная статистика →
                  </button>
                  <button
                    onClick={() => {
                      deleteMutation.mutate({
                        id: selectedPlatform.record.id,
                        table: "ad_platforms",
                      });
                      setSelectedPlatform(null);
                      showToast(`${selectedPlatform.platform.name} отключён`);
                    }}
                    style={{
                      padding: "9px 0",
                      borderRadius: 9,
                      background: "transparent",
                      color: "var(--neg)",
                      border: "0.5px solid color-mix(in srgb, var(--neg) 40%, transparent)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  >
                    Отключить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Telegram modal */}
      {addTgModal && (
        <AddTelegramModal
          onClose={() => setAddTgModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["integrations"] });
            showToast("✓ Канал подключён!");
          }}
        />
      )}

      {/* Ad platform drawer */}
      {adDrawer && (
        <AdPlatformDrawer
          platform={adDrawer.platform}
          record={adDrawer.record}
          onClose={() => setAdDrawer(null)}
          onDisconnect={() => {
            deleteMutation.mutate({ id: adDrawer.record.id, table: "ad_platforms" });
            setAdDrawer(null);
            showToast(`${adDrawer.platform.name} отключён`);
          }}
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ["ad_platforms_real"] });
            showToast("Данные обновлены");
          }}
        />
      )}

      {/* Channel detail modal */}
      {channelModal && (
        <ChannelModal
          integration={channelModal.integration}
          platform={channelModal.platform}
          onClose={() => setChannelModal(null)}
          onDelete={() =>
            deleteMutation.mutate({
              id: channelModal.integration.id,
              table:
                channelModal.platform.key === "telegram" ||
                channelModal.platform.key === "instagram"
                  ? "integrations"
                  : "ad_platforms",
            })
          }
          onToggle={() =>
            toggleMutation.mutate({
              id: channelModal.integration.id,
              is_active: !channelModal.integration.is_active,
              table:
                channelModal.platform.key === "telegram" ||
                channelModal.platform.key === "instagram"
                  ? "integrations"
                  : "ad_platforms",
            })
          }
          onRename={(name) =>
            renameMutation.mutate({
              id: channelModal.integration.id,
              channel_name: name,
            })
          }
        />
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsPageInner />
    </Suspense>
  );
}
