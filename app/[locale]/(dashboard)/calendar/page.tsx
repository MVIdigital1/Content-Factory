"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

const BOT_USERNAME = "postcentro_bot";

export default function IntegrationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const t = useTranslations("integrations");
  const [showForm, setShowForm] = useState(false);
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
        .eq("platform", "telegram")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const hasChannels = integrations && integrations.length > 0;

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

  const testChannel = async () => {
    if (!channelId) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getChat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId }),
        },
      );
      const data = await res.json();
      if (data.ok) {
        setTestResult(`✓ Канал найден: ${data.result.title || channelId}`);
        if (!channelName) setChannelName(data.result.title || "");
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
      setShowForm(false);
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
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Telegram</h1>
          <p className="text-sm text-gray-500 mt-0.5">Автопостинг в каналы</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          + Добавить канал
        </button>
      </div>

      {success && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium mb-4">
          ✓ Канал подключён успешно!
        </div>
      )}

      {/* Bot info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D9E75] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
            P
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              @{BOT_USERNAME}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Официальный бот PostCentro для автопостинга
            </p>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Как подключить канал:
              </p>
              <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>
                  Добавьте{" "}
                  <span className="font-mono bg-gray-100 px-1 rounded">
                    @{BOT_USERNAME}
                  </span>{" "}
                  в свой канал как администратора
                </li>
                <li>Дайте боту права на публикацию сообщений</li>
                <li>Нажмите "Добавить канал" и введите ID канала</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Add channel form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Новый канал</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
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
                  onClick={testChannel}
                  disabled={!channelId || testing}
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
              <p className="text-xs text-gray-400 mt-1.5">
                Убедитесь что <span className="font-mono">@{BOT_USERNAME}</span>{" "}
                уже добавлен как администратор
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Название канала
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Сохраняем..." : "Подключить канал"}
            </button>
          </form>
        </div>
      )}

      {/* Connected channels */}
      {hasChannels && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Подключённые каналы ({integrations.length})
          </h3>
          <div className="space-y-2">
            {integrations.map((i: any) => (
              <div
                key={i.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="16"
                    height="16"
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
                    {i.channel_name || i.channel_id}
                  </p>
                  <p className="text-xs text-gray-400">{i.channel_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.is_active ? "bg-[#E1F5EE] text-[#1D9E75]" : "bg-gray-100 text-gray-400"}`}
                  >
                    {i.is_active ? "Активен" : "Отключён"}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(i.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasChannels && !showForm && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="text-3xl mb-3">📡</div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            Нет подключённых каналов
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Добавьте первый канал чтобы начать автопостинг
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer"
          >
            + Добавить канал
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
