"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Integration = {
  id: string;
  platform: "telegram" | "instagram" | "tiktok" | "vk";
  channel_id: string;
  channel_name: string;
  is_active: boolean;
};

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot";

function connectInstagram() {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
  const redirectUri =
    process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ??
    "https://content-factory-khaki.vercel.app/api/auth/instagram/callback";
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic,instagram_business_content_publish",
    response_type: "code",
  });
  window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
}

const inp =
  "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

// Platform logo
function PlatformIcon({ platform }: { platform: string }) {
  const configs: Record<string, { bg: string; label: string }> = {
    instagram: {
      bg: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
      label: "IG",
    },
    telegram: { bg: "#0088CC", label: "TG" },
    tiktok: { bg: "#010101", label: "TT" },
    vk: { bg: "#0077FF", label: "VK" },
  };
  const c = configs[platform] ?? { bg: "#888", label: "?" };
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: c.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {c.label}
    </div>
  );
}

function IntegrationsPageInner() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const s = searchParams.get("success");
    const e = searchParams.get("error");
    if (s === "instagram") {
      showToast("✓ Instagram успешно подключён!");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    } else if (e) {
      showToast(`Ошибка: ${decodeURIComponent(e)}`, false);
    }
  }, [searchParams]);

  // Telegram form state
  const [showTgForm, setShowTgForm] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState("");
  const [tgSuccess, setTgSuccess] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Stats
  const [channelStats, setChannelStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);
  const [openStatsId, setOpenStatsId] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Integration[];
    },
  });

  const telegramChannels = integrations.filter(
    (i) => i.platform === "telegram",
  );
  const instagramAccounts = integrations.filter(
    (i) => i.platform === "instagram",
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("integrations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const editMutation = useMutation({
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setEditingId(null);
      showToast("Название обновлено");
    },
  });

  const testChannel = async (cId: string) => {
    if (!cId) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/telegram/check-chanel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: cId }),
      });
      const data = await res.json();
      setTestResult(
        data.ok
          ? `✓ Найден: ${data.result?.title || cId}`
          : `✗ Не найден. Убедитесь что @${BOT_USERNAME} добавлен как администратор`,
      );
    } catch {
      setTestResult("✗ Ошибка проверки");
    }
    setTesting(false);
  };

  const fetchChannelStats = async (cId: string) => {
    setLoadingStats(cId);
    try {
      const res = await fetch("/api/telegram/channel-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: cId }),
      });
      const data = await res.json();
      if (data.ok) {
        setChannelStats((prev) => ({ ...prev, [cId]: data }));
        setOpenStatsId(cId);
      }
    } catch {}
    setLoadingStats(null);
  };

  const handleSaveTg = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgLoading(true);
    setTgError("");
    try {
      const res = await fetch("/api/telegram/add-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channelId,
          channel_name: channelName || channelId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка подключения");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setChannelId("");
      setChannelName("");
      setTestResult("");
      setShowTgForm(false);
      showToast(`✓ Канал «${data.channel_title}» подключён!`);
    } catch (err: any) {
      setTgError(err.message || "Ошибка сохранения");
    }
    setTgLoading(false);
  };

  const btn = {
    base: "px-3 py-1.5 rounded-[7px] text-[11px] font-medium cursor-pointer border transition-colors",
    green: "border-transparent bg-accent text-on-accent hover:opacity-90",
    amber: "border-line text-tx-2 hover:bg-hover",
    red: "border-line text-neg hover:bg-hover",
    ghost: "border-line text-tx-3 hover:bg-hover",
  };

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
          justifyContent: "space-between",
          padding: "0 16px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
          Маркетинг /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
            Подключения
          </span>
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 200,
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
        <div
          style={{
            maxWidth: 680,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* ── Instagram ── */}
          <div className="ui-surface p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <PlatformIcon platform="instagram" />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    Instagram
                  </p>
                  {instagramAccounts.length > 0 && (
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
                      Подключён
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
                  Business или Creator аккаунт
                </p>
              </div>
              <button
                onClick={connectInstagram}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {instagramAccounts.length > 0 ? "Добавить ещё" : "Подключить"}
              </button>
            </div>

            {instagramAccounts.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  borderTop: "0.5px solid var(--line)",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {instagramAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--panel-2)",
                      borderRadius: 9,
                      border: "0.5px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background:
                          "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      IG
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--tx-1)",
                        }}
                      >
                        {acc.channel_name}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--tx-3)" }}>
                        {acc.channel_id}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: acc.is_active
                          ? "var(--pos-dim)"
                          : "var(--chip)",
                        color: acc.is_active ? "var(--pos)" : "var(--tx-3)",
                        fontWeight: 600,
                      }}
                    >
                      {acc.is_active ? "Активен" : "Откл."}
                    </span>
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: acc.id,
                          is_active: !acc.is_active,
                        })
                      }
                      className={`${btn.base} ${acc.is_active ? btn.amber : btn.green}`}
                    >
                      {acc.is_active ? "Откл." : "Вкл."}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Удалить ${acc.channel_name}?`))
                          deleteMutation.mutate(acc.id);
                      }}
                      className={`${btn.base} ${btn.red}`}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Telegram ── */}
          <div className="ui-surface p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <PlatformIcon platform="telegram" />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    Telegram
                  </p>
                  {telegramChannels.length > 0 && (
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
                      {telegramChannels.length} канал
                      {telegramChannels.length > 1 ? "а" : ""}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
                  Автопостинг через @{BOT_USERNAME}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTgForm((v) => !v);
                  setTgError("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + Добавить
              </button>
            </div>

            {/* Add form */}
            {showTgForm && (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  background: "var(--panel-2)",
                  borderRadius: 10,
                  border: "0.5px solid var(--line)",
                }}
              >
                <form
                  onSubmit={handleSaveTg}
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--tx-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      ID канала *
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={channelId}
                        onChange={(e) => {
                          setChannelId(e.target.value);
                          setTestResult("");
                        }}
                        placeholder="@mychannel или -1001234567890"
                        required
                        className={`${inp} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => testChannel(channelId)}
                        disabled={!channelId || testing}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "0.5px solid var(--line)",
                          background: "var(--panel)",
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
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--tx-3)",
                        marginTop: 5,
                      }}
                    >
                      Добавь{" "}
                      <strong style={{ color: "var(--tx-2)" }}>
                        @{BOT_USERNAME}
                      </strong>{" "}
                      как администратора в канал
                    </p>
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
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--tx-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      Название (необязательно)
                    </label>
                    <input
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="Мой канал"
                      className={inp}
                    />
                  </div>
                  {tgError && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(193,18,31,0.08)",
                        border: "0.5px solid var(--neg)",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "var(--neg)",
                      }}
                    >
                      {tgError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      disabled={tgLoading}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--accent)",
                        color: "var(--on-accent)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        opacity: tgLoading ? 0.6 : 1,
                      }}
                    >
                      {tgLoading
                        ? "Проверяем права бота..."
                        : "Подключить канал"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTgForm(false);
                        setTgError("");
                        setTestResult("");
                      }}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
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
            )}

            {/* Channel list */}
            {isLoading ? (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 52,
                      background: "var(--panel-2)",
                      borderRadius: 9,
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                ))}
              </div>
            ) : telegramChannels.length > 0 ? (
              <div
                style={{
                  marginTop: 12,
                  borderTop: "0.5px solid var(--line)",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {telegramChannels.map((ch) => (
                  <div key={ch.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "var(--panel-2)",
                        borderRadius: 9,
                        border: "0.5px solid var(--line)",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "#0088CC",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                        </svg>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingId === ch.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                border: "0.5px solid var(--accent)",
                                borderRadius: 6,
                                fontSize: 11,
                                outline: "none",
                                background: "var(--panel)",
                                color: "var(--tx-1)",
                                fontFamily: "inherit",
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() =>
                                editMutation.mutate({
                                  id: ch.id,
                                  channel_name: editingName,
                                })
                              }
                              disabled={editMutation.isPending}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "none",
                                background: "var(--accent)",
                                color: "var(--on-accent)",
                                fontSize: 10,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {editMutation.isPending ? "..." : "OK"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "0.5px solid var(--line)",
                                background: "transparent",
                                color: "var(--tx-3)",
                                fontSize: 10,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 10,
                          background: ch.is_active
                            ? "var(--pos-dim)"
                            : "var(--chip)",
                          color: ch.is_active ? "var(--pos)" : "var(--tx-3)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {ch.is_active ? "Активен" : "Откл."}
                      </span>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setEditingId(ch.id);
                            setEditingName(ch.channel_name || ch.channel_id);
                          }}
                          className={`${btn.base} ${btn.ghost}`}
                          title="Переименовать"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: ch.id,
                              is_active: !ch.is_active,
                            })
                          }
                          className={`${btn.base} ${ch.is_active ? btn.amber : btn.green}`}
                        >
                          {ch.is_active ? "Откл." : "Вкл."}
                        </button>
                        <button
                          onClick={() => {
                            fetchChannelStats(ch.channel_id);
                          }}
                          disabled={loadingStats === ch.channel_id}
                          className={`${btn.base} ${btn.ghost}`}
                          title="Статистика"
                        >
                          {loadingStats === ch.channel_id ? "..." : "📊"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить канал ${ch.channel_name}?`))
                              deleteMutation.mutate(ch.id);
                          }}
                          className={`${btn.base} ${btn.red}`}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>

                    {/* Stats panel */}
                    {openStatsId === ch.channel_id &&
                      channelStats[ch.channel_id] && (
                        <div
                          style={{
                            padding: "12px 14px",
                            background: "var(--panel-2)",
                            borderRadius: "0 0 9px 9px",
                            border: "0.5px solid var(--line)",
                            borderTop: "none",
                            display: "grid",
                            gridTemplateColumns: "repeat(4,1fr)",
                            gap: 10,
                          }}
                        >
                          {[
                            {
                              l: "Подписчиков",
                              v:
                                channelStats[ch.channel_id].member_count ?? "—",
                            },
                            {
                              l: "Постов за неделю",
                              v:
                                channelStats[ch.channel_id].posts_this_week ??
                                0,
                            },
                            {
                              l: "Последний пост",
                              v: channelStats[ch.channel_id].last_post_at
                                ? new Date(
                                    channelStats[ch.channel_id].last_post_at,
                                  ).toLocaleDateString("ru")
                                : "—",
                            },
                            {
                              l: "Название",
                              v: channelStats[ch.channel_id].title ?? "—",
                            },
                          ].map((s) => (
                            <div key={s.l} style={{ textAlign: "center" }}>
                              <p
                                style={{
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "var(--tx-1)",
                                }}
                              >
                                {s.v}
                              </p>
                              <p
                                style={{
                                  fontSize: 9,
                                  color: "var(--tx-3)",
                                  marginTop: 2,
                                }}
                              >
                                {s.l}
                              </p>
                            </div>
                          ))}
                          <button
                            onClick={() => setOpenStatsId(null)}
                            style={{
                              gridColumn: "1/-1",
                              textAlign: "center",
                              fontSize: 10,
                              color: "var(--tx-3)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              marginTop: 4,
                            }}
                          >
                            Скрыть ▲
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              !showTgForm && (
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    padding: "20px 0",
                    color: "var(--tx-3)",
                    fontSize: 12,
                  }}
                >
                  Нет подключённых каналов
                </div>
              )
            )}
          </div>

          {/* ── TikTok / VK — скоро ── */}
          {[
            { id: "tiktok", name: "TikTok", desc: "Business аккаунт" },
            { id: "vk", name: "ВКонтакте", desc: "Группа или сообщество" },
          ].map((p) => (
            <div key={p.id} className="ui-surface p-4">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <PlatformIcon platform={p.id} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--tx-1)",
                      }}
                    >
                      {p.name}
                    </p>
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
                  </div>
                  <p style={{ fontSize: 11, color: "var(--tx-3)" }}>{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
