"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export default function IntegrationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const t = useTranslations("integrations");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    token: "",
    channelId: "",
    channelName: "",
    loading: false,
    error: "",
    success: false,
    testing: false,
    testResult: "",
  });

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

  const testBot = async () => {
    if (!form.token) return;
    setForm((p) => ({ ...p, testing: true, testResult: "" }));
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${form.token}/getMe`,
      );
      const data = await res.json();
      setForm((p) => ({
        ...p,
        testing: false,
        testResult: data.ok ? `✓ @${data.result.username}` : "✗ Invalid token",
      }));
    } catch {
      setForm((p) => ({
        ...p,
        testing: false,
        testResult: "✗ Connection error",
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setForm((p) => ({ ...p, loading: true, error: "" }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("integrations")
        .insert({
          user_id: user!.id,
          platform: "telegram",
          token: form.token,
          channel_id: form.channelId,
          channel_name: form.channelName || form.channelId,
          is_active: true,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setForm((p) => ({
        ...p,
        loading: false,
        success: true,
        token: "",
        channelId: "",
        channelName: "",
        testResult: "",
      }));
      setShowForm(false);
      setTimeout(() => setForm((p) => ({ ...p, success: false })), 3000);
    } catch {
      setForm((p) => ({ ...p, loading: false, error: "Ошибка сохранения" }));
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {t("addChannel")}
        </button>
      </div>

      {form.success && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75] border-opacity-30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium mb-4">
          {t("successMsg")}
        </div>
      )}

      {!hasChannels && !showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            {t("howToConnect")}
          </p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>
              Напишите{" "}
              <span className="font-mono bg-blue-100 px-1 rounded">
                @BotFather
              </span>{" "}
              в Telegram
            </li>
            <li>
              Отправьте{" "}
              <span className="font-mono bg-blue-100 px-1 rounded">
                /newbot
              </span>{" "}
              и создайте бота
            </li>
            <li>Скопируйте токен и вставьте ниже</li>
            <li>Добавьте бота в канал как администратора</li>
            <li>
              Вставьте ID канала (например{" "}
              <span className="font-mono bg-blue-100 px-1 rounded">
                @mychannel
              </span>
              )
            </li>
          </ol>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {t("connectBtn")}
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("form.title")}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.token")}
              </label>
              <div className="flex gap-2">
                <input
                  value={form.token}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      token: e.target.value,
                      testResult: "",
                    }))
                  }
                  placeholder="7123456789:AAFxxx..."
                  required
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={testBot}
                  disabled={!form.token || form.testing}
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {form.testing ? "..." : t("form.check")}
                </button>
              </div>
              {form.testResult && (
                <p
                  className={`text-xs mt-1.5 font-medium ${form.testResult.startsWith("✓") ? "text-[#1D9E75]" : "text-red-500"}`}
                >
                  {form.testResult}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.channelId")}
              </label>
              <input
                value={form.channelId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, channelId: e.target.value }))
                }
                placeholder="@mychannel или -1001234567890"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.channelName")}
              </label>
              <input
                value={form.channelName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, channelName: e.target.value }))
                }
                placeholder="Мой канал"
                className={inputClass}
              />
            </div>
            {form.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                {form.error}
              </div>
            )}
            <button
              type="submit"
              disabled={form.loading}
              className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {form.loading ? t("form.saving") : t("form.save")}
            </button>
          </form>
        </div>
      )}

      {hasChannels && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {t("connected")} ({integrations.length})
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
                    {i.is_active ? t("active") : t("inactive")}
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(i.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
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
