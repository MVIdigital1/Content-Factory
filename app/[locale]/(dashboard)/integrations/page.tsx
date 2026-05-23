"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const BOT_USERNAME = "postcentro_bot";

type Integration = {
  id: string;
  platform: "telegram" | "instagram";
  channel_id: string;
  channel_name: string;
  is_active: boolean;
};

function connectInstagram() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!,
    scope: "instagram_basic,instagram_content_publish,pages_read_engagement",
    response_type: "code",
  });
  window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

export default function IntegrationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
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

  const telegramIntegrations =
    integrations?.filter((i) => i.platform === "telegram") || [];
  const instagramIntegration = integrations?.find(
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      if (editingId) setEditingId(null);
    },
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

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      channel_id,
      channel_name,
    }: {
      id: string;
      channel_id: string;
      channel_name: string;
    }) => {
      const { error } = await supabase
        .from("integrations")
        .update({ channel_id, channel_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setEditingId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const testChannel = async (cId: string, setCb: (v: string) => void) => {
    if (!cId) return;
    setTesting(true);
    setCb("");
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
        setCb(`✓ Канал найден: ${data.result.title || cId}`);
      } else {
        setCb(
          "✗ Канал не найден. Убедитесь что бот добавлен как администратор",
        );
      }
    } catch {
      setCb("✗ Ошибка проверки");
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

  const EditPanel = ({ item }: { item: Integration }) => {
    const [editCId, setEditCId] = useState(item.channel_id);
    const [editCName, setEditCName] = useState(item.channel_name);
    const [editTestResult, setEditTestResult] = useState("");

    return (
      <div className="border-t border-gray-100 mt-3 pt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            ID канала
          </label>
          <div className="flex gap-2">
            <input
              value={editCId}
              onChange={(e) => {
                setEditCId(e.target.value);
                setEditTestResult("");
              }}
              className={`${inputClass} flex-1`}
              placeholder="@mychannel"
            />
            <button
              type="button"
              onClick={() => testChannel(editCId, setEditTestResult)}
              disabled={!editCId || testing}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {testing ? "..." : "Проверить"}
            </button>
          </div>
          {editTestResult && (
            <p
              className={`text-xs mt-1.5 font-medium ${editTestResult.startsWith("✓") ? "text-[#1D9E75]" : "text-red-500"}`}
            >
              {editTestResult}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Название канала
          </label>
          <input
            value={editCName}
            onChange={(e) => setEditCName(e.target.value)}
            className={inputClass}
            placeholder="Мой канал"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              updateMutation.mutate({
                id: item.id,
                channel_id: editCId,
                channel_name: editCName || editCId,
              })
            }
            disabled={updateMutation.isPending}
            className="flex-1 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {updateMutation.isPending ? "Сохраняем..." : "Сохранить"}
          </button>
          <button
            onClick={() =>
              toggleMutation.mutate({ id: item.id, is_active: !item.is_active })
            }
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${item.is_active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"}`}
          >
            {item.is_active ? "Отключить" : "Включить"}
          </button>
          <button
            onClick={() => deleteMutation.mutate(item.id)}
            className="px-3 py-2 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            🗑
          </button>
        </div>
        <button
          onClick={() => setEditingId(null)}
          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 cursor-pointer"
        >
          Отмена
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Интеграции</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Подключите соцсети для автопостинга
        </p>
      </div>

      {success && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
          ✓ Сохранено успешно!
        </div>
      )}

      {/* ───── INSTAGRAM ───── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Instagram</p>
              <p className="text-xs text-gray-400">
                Business или Creator аккаунт
              </p>
            </div>
          </div>
          {instagramIntegration ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#E1F5EE] text-[#1D9E75]">
              Подключён
            </span>
          ) : null}
        </div>

        {instagramIntegration ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {instagramIntegration.channel_name}
                </p>
                <p className="text-xs text-gray-400">
                  ID: {instagramIntegration.channel_id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: instagramIntegration.id,
                      is_active: !instagramIntegration.is_active,
                    })
                  }
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors ${instagramIntegration.is_active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]"}`}
                >
                  {instagramIntegration.is_active ? "Отключить" : "Включить"}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(instagramIntegration.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={connectInstagram}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-pink-300 hover:text-pink-500 hover:bg-pink-50 transition-all cursor-pointer font-medium"
          >
            + Подключить Instagram
          </button>
        )}
      </section>

      {/* ───── TELEGRAM ───── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2AABEE] flex items-center justify-center">
              <svg
                width="16"
                height="16"
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
            <div>
              <p className="text-sm font-semibold text-gray-900">Telegram</p>
              <p className="text-xs text-gray-400">Автопостинг в каналы</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingId(null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            + Добавить канал
          </button>
        </div>

        {/* Bot info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Добавьте{" "}
            <span className="font-mono bg-white px-1 rounded">
              @{BOT_USERNAME}
            </span>{" "}
            в канал как администратора, затем укажите ID канала ниже.
          </p>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-3 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Новый канал
              </h3>
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
                    onClick={() => testChannel(channelId, setTestResult)}
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

        {/* Channels list */}
        {telegramIntegrations.length > 0 && (
          <div className="space-y-2">
            {telegramIntegrations.map((i) => (
              <div
                key={i.id}
                className={`bg-white rounded-xl border p-4 transition-all ${editingId === i.id ? "border-[#1D9E75] shadow-sm" : "border-gray-100 hover:border-gray-200"}`}
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setEditingId(editingId === i.id ? null : i.id)}
                >
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
                    <span className="text-gray-300 text-sm">
                      {editingId === i.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
                {editingId === i.id && <EditPanel item={i} />}
              </div>
            ))}
          </div>
        )}

        {telegramIntegrations.length === 0 && !showForm && !isLoading && (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
            <p className="text-sm text-gray-400">Нет подключённых каналов</p>
          </div>
        )}
      </section>
    </div>
  );
}
