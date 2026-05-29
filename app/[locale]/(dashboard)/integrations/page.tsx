"use client";

import { useState, useEffect } from "react";
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
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri:
      redirectUri ||
      "https://content-factory-khaki.vercel.app/api/auth/instagram/callback",
    scope:
      "instagram_business_basic,instagram_business_content_publish,instagram_manage_comments,instagram_business_manage_messages",
    response_type: "code",
  });

  window.location.href = `https://api.instagram.com/oauth/authorize?${params}`;
}

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Business или Creator аккаунт",
    gradient: "from-purple-500 via-pink-500 to-orange-400",
    oauth: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Business аккаунт",
    gradient: "from-gray-800 to-gray-900",
    comingSoon: true,
  },
  {
    id: "vk",
    name: "ВКонтакте",
    description: "Группа или сообщество",
    gradient: "from-blue-500 to-blue-600",
    comingSoon: true,
  },
] as const;

export default function IntegrationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const s = searchParams.get("success");
    const e = searchParams.get("error");
    if (s === "instagram") {
      showToast("✅ Instagram успешно подключён!");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    } else if (e) {
      showToast(`❌ Ошибка: ${decodeURIComponent(e)}`);
    }
  }, [searchParams]);

  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [channelStats, setChannelStats] = useState<Record<string, any>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Integration[];
    },
  });

  const telegramChannels =
    integrations?.filter((i) => i.platform === "telegram") || [];
  const instagramAccounts =
    integrations?.filter((i) => i.platform === "instagram") || [];

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
      setSuccess("Название обновлено");
      setTimeout(() => setSuccess(""), 2000);
    },
  });

  const testChannel = async (cId: string) => {
    if (!cId) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/telegram/check-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: cId }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult(`✓ Канал найден: ${data.result?.title || cId}`);
      } else {
        setTestResult(
          `✗ Канал не найден. Убедитесь что @${BOT_USERNAME} добавлен как администратор`,
        );
      }
    } catch {
      setTestResult("✗ Ошибка проверки");
    }
    setTesting(false);
  };

  const fetchChannelStats = async (channelId: string) => {
    setLoadingStats(channelId);
    try {
      const res = await fetch("/api/telegram/channel-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
      const data = await res.json();
      if (data.ok) setChannelStats((prev) => ({ ...prev, [channelId]: data }));
    } catch {
      /* silent */
    }
    setLoadingStats(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Используем серверный API — токен никогда не попадает в браузер
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
      setShowTelegramForm(false);
      setSuccess(`✓ Канал «${data.channel_title}» подключён!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Интеграции</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Подключите соцсети для автопостинга
        </p>
      </div>

      {success && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
          {success}
        </div>
      )}

      {/* Другие платформы */}
      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const accounts = platform.id === "instagram" ? instagramAccounts : [];
          const isConnected = accounts.length > 0;
          return (
            <div
              key={platform.id}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-xs font-bold">
                    {platform.name[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {platform.name}
                    </p>
                    {(platform as any).comingSoon && (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full font-medium">
                        Скоро
                      </span>
                    )}
                    {isConnected && (
                      <span className="text-[10px] px-2 py-0.5 bg-[#E1F5EE] text-[#1D9E75] rounded-full font-medium">
                        Подключён
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {platform.description}
                  </p>
                </div>
                {!(platform as any).comingSoon && (
                  <button
                    onClick={
                      (platform as any).oauth ? connectInstagram : undefined
                    }
                    className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {isConnected ? "Добавить ещё" : "Подключить"}
                  </button>
                )}
              </div>
              {accounts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">
                          {acc.channel_name}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: acc.id,
                              is_active: !acc.is_active,
                            })
                          }
                          className={`text-[10px] px-2 py-1 rounded border font-medium cursor-pointer transition-colors ${acc.is_active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"}`}
                        >
                          {acc.is_active ? "Откл." : "Вкл."}
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(acc.id)}
                          className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-400 hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Telegram */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#2AABEE] flex items-center justify-center flex-shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Telegram</p>
              {telegramChannels.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-[#E1F5EE] text-[#1D9E75] rounded-full font-medium">
                  {telegramChannels.length} канал
                  {telegramChannels.length > 1 ? "а" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Автопостинг через @{BOT_USERNAME}
            </p>
          </div>
          <button
            onClick={() => {
              setShowTelegramForm((v) => !v);
              setError("");
            }}
            className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            + Добавить
          </button>
        </div>

        {/* Форма добавления */}
        {showTelegramForm && (
          <div className="border border-gray-100 rounded-xl p-4 mb-3 bg-gray-50">
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ID канала *
                </label>
                <div className="flex gap-2">
                  <input
                    value={channelId}
                    onChange={(e) => {
                      setChannelId(e.target.value);
                      setTestResult("");
                    }}
                    placeholder="@mychannel или -1001234567890"
                    required
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => testChannel(channelId)}
                    disabled={!channelId || testing}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer whitespace-nowrap bg-white"
                  >
                    {testing ? "..." : "Проверить"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Добавьте{" "}
                  <span className="font-semibold text-gray-600">
                    @{BOT_USERNAME}
                  </span>{" "}
                  как администратора в ваш канал
                </p>
                {testResult && (
                  <p
                    className={`text-xs mt-1.5 font-medium ${testResult.startsWith("✓") ? "text-[#1D9E75]" : "text-red-500"}`}
                  >
                    {testResult}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Название (необязательно)
                </label>
                <input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Мой канал"
                  className={inputClass}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {loading ? "Проверяем права бота..." : "Подключить канал"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTelegramForm(false);
                    setError("");
                    setTestResult("");
                  }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список каналов */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : telegramChannels.length > 0 ? (
          <div className="space-y-2">
            {telegramChannels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2AABEE"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === ch.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-[#1D9E75] rounded outline-none"
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
                        className="text-[10px] px-2 py-1 bg-[#1D9E75] text-white rounded cursor-pointer"
                      >
                        {editMutation.isPending ? "..." : "OK"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[10px] px-2 py-1 border border-gray-200 text-gray-500 rounded cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {ch.channel_name || ch.channel_id}
                      </p>
                      <p className="text-xs text-gray-400">{ch.channel_id}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ch.is_active ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-gray-100 text-gray-400"}`}
                  >
                    {ch.is_active ? "Активен" : "Откл."}
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(ch.id);
                      setEditingName(ch.channel_name || ch.channel_id);
                    }}
                    className="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
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
                    className={`text-[10px] px-2 py-1 rounded border font-medium cursor-pointer transition-colors ${ch.is_active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"}`}
                  >
                    {ch.is_active ? "Откл." : "Вкл."}
                  </button>
                  <button
                    onClick={() => fetchChannelStats(ch.channel_id)}
                    disabled={loadingStats === ch.channel_id}
                    className="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
                    title="Статистика"
                  >
                    {loadingStats === ch.channel_id ? "..." : "📊"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(ch.id)}
                    className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-400 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400">
            Нет подключённых каналов
          </div>
        )}
      </div>
    </div>
  );
}
