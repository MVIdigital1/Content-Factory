"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Integration = {
  id: string;
  platform: "telegram" | "instagram" | "tiktok" | "vk";
  channel_id: string;
  channel_name: string;
  is_active: boolean;
};

const BOT_USERNAME = "postcentro_bot";

function connectInstagram() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!,
    scope:
      "instagram_business_basic,instagram_content_publish,instagram_manage_comments,instagram_business_manage_messages",
    response_type: "code",
  });
  window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
}

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Business или Creator аккаунт",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    gradient: "from-purple-500 via-pink-500 to-orange-400",
    oauth: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Business аккаунт",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    gradient: "from-gray-800 to-gray-900",
    oauth: false,
    comingSoon: true,
  },
  {
    id: "vk",
    name: "ВКонтакте",
    description: "Группа или сообщество",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.054 11.01 4.37 8.926 4.37 8.502c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
      </svg>
    ),
    gradient: "from-blue-500 to-blue-600",
    oauth: false,
    comingSoon: true,
  },
];

export default function IntegrationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

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

  const testChannel = async (cId: string) => {
    if (!cId) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getChat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: cId }),
        },
      );
      const data = await res.json();
      if (data.ok) {
        setTestResult(`✓ Канал найден: ${data.result.title || cId}`);
      } else {
        setTestResult(
          "✗ Канал не найден. Убедитесь что бот добавлен как администратор",
        );
      }
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("integrations").insert({
        user_id: user!.id,
        platform: "telegram",
        token: process.env.NEXT_PUBLIC_BOT_TOKEN || "",
        channel_id: channelId,
        channel_name: channelName || channelId,
        is_active: true,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setChannelId("");
      setChannelName("");
      setTestResult("");
      setShowTelegramForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Ошибка сохранения. Попробуйте ещё раз.");
    }
    setLoading(false);
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Интеграции</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Подключите соцсети для автопостинга
        </p>
      </div>

      {success && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
          ✓ Канал подключён успешно!
        </div>
      )}

      {/* Соцсети — карточки */}
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
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {platform.name}
                    </p>
                    {platform.comingSoon && (
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
                {!platform.comingSoon && (
                  <button
                    onClick={platform.oauth ? connectInstagram : undefined}
                    disabled={platform.comingSoon}
                    className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isConnected ? "Добавить ещё" : "Подключить"}
                  </button>
                )}
              </div>

              {/* Подключённые аккаунты */}
              {accounts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3 py-1">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xs flex-shrink-0">
                        📷
                      </div>
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

      {/* Telegram — отдельный блок */}
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
              Автопостинг в каналы через @{BOT_USERNAME}
            </p>
          </div>
          <button
            onClick={() => setShowTelegramForm((v) => !v)}
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
                  Название
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
                  {loading ? "Сохраняем..." : "Подключить канал"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTelegramForm(false)}
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
                  <p className="text-sm font-semibold text-gray-900">
                    {ch.channel_name || ch.channel_id}
                  </p>
                  <p className="text-xs text-gray-400">{ch.channel_id}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ch.is_active ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-gray-100 text-gray-400"}`}
                  >
                    {ch.is_active ? "Активен" : "Откл."}
                  </span>
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
