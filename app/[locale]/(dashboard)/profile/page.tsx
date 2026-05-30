"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

type Stats = {
  projects: number;
  contents: number;
  published: number;
  scheduled: number;
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    contents: 0,
    published: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "danger">(
    "profile",
  );

  // Profile form
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password form
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // Danger
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      setProfile({
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || "",
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
      });
      setName(user.user_metadata?.full_name || "");
      setAvatarPreview(user.user_metadata?.avatar_url || null);

      // Stats
      const [
        { count: projects },
        { count: contents },
        { count: published },
        { count: scheduled },
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase.from("contents").select("*", { count: "exact", head: true }),
        supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("scheduled_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      setStats({
        projects: projects ?? 0,
        contents: contents ?? 0,
        published: published ?? 0,
        scheduled: scheduled ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (file: File) => {
    if (!profile) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const ext = file.name.split(".").pop();
    const fileName = `avatars/${profile.id}.${ext}`;
    const { data, error } = await supabase.storage
      .from("content-images")
      .upload(fileName, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from("content-images")
        .getPublicUrl(data.path);
      await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
      });
    }
    setAvatarUploading(false);
  };

  const handleChangePassword = async () => {
    if (passwords.next !== passwords.confirm) {
      setPwdError("Пароли не совпадают");
      return;
    }
    if (passwords.next.length < 6) {
      setPwdError("Минимум 6 символов");
      return;
    }
    setPwdSaving(true);
    setPwdError("");
    setPwdSuccess(false);
    const { error } = await supabase.auth.updateUser({
      password: passwords.next,
    });
    if (error) {
      setPwdError(error.message);
    } else {
      setPwdSuccess(true);
      setPasswords({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdSuccess(false), 3000);
    }
    setPwdSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== profile?.email) return;
    setDeleting(true);
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/auth/login`);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.email[0].toUpperCase();
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Личный кабинет</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Управление аккаунтом и настройками
          </p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer group relative"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1D9E75] flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {avatarUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleAvatarChange(e.target.files[0])
              }
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {name || "—"}
            </p>
            <p className="text-sm text-gray-400 truncate">{profile?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              С нами с {joinedDate}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer flex-shrink-0"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Выйти
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Проекты",
              value: stats.projects,
              color: "text-[#1D9E75]",
              bg: "bg-[#E1F5EE]",
            },
            {
              label: "Контент",
              value: stats.contents,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Опубликовано",
              value: stats.published,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              label: "Запланировано",
              value: stats.scheduled,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-200 p-3 text-center"
            >
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { key: "profile", label: "Профиль" },
              { key: "password", label: "Пароль" },
              { key: "danger", label: "Опасная зона" },
              { key: "telegram", label: "🔔 Telegram" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? tab.key === "danger"
                      ? "text-red-500 border-b-2 border-red-400"
                      : "text-[#1D9E75] border-b-2 border-[#1D9E75]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Profile tab */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Полное имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Email нельзя изменить
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Аватарка
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 cursor-pointer hover:border-[#1D9E75] hover:bg-[#F8FDFB] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">
                          {initials}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {avatarUploading
                        ? "Загружаем..."
                        : "Нажмите чтобы изменить фото"}
                    </span>
                  </div>
                </div>

                {saveError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="bg-[#E1F5EE] border border-[#1D9E75]/20 rounded-lg px-3 py-2 text-xs text-[#1D9E75] font-medium">
                    ✓ Сохранено
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Сохраняем..." : "Сохранить изменения"}
                </button>
              </div>
            )}

            {/* Password tab */}
            {activeTab === "password" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  Для смены пароля введите новый пароль дважды. Минимум 6
                  символов.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={passwords.next}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, next: e.target.value }))
                    }
                    placeholder="Минимум 6 символов"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Подтвердите пароль
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, confirm: e.target.value }))
                    }
                    placeholder="Повторите пароль"
                    className={inputClass}
                  />
                </div>

                {pwdError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                    {pwdError}
                  </div>
                )}
                {pwdSuccess && (
                  <div className="bg-[#E1F5EE] border border-[#1D9E75]/20 rounded-lg px-3 py-2 text-xs text-[#1D9E75] font-medium">
                    ✓ Пароль изменён
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwdSaving || !passwords.next || !passwords.confirm}
                  className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {pwdSaving ? "Меняем..." : "Изменить пароль"}
                </button>
              </div>
            )}

            {/* Danger tab */}
            {activeTab === "telegram" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Уведомления в Telegram
                  </h3>
                  <p className="text-xs text-gray-400">
                    Получай уведомления о публикациях и еженедельный отчёт
                  </p>
                </div>

                {telegramLinked ? (
                  <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl p-4">
                    <p className="text-sm font-medium text-[#1D9E75] mb-1">
                      ✅ Telegram подключён
                    </p>
                    <p className="text-xs text-[#1D9E75]/70 mb-3">
                      Уведомления будут приходить в ваш Telegram
                    </p>
                    <button
                      onClick={async () => {
                        await fetch("/api/telegram/link-profile", {
                          method: "DELETE",
                        });
                        setTelegramLinked(false);
                        setTelegramToken(null);
                      }}
                      className="text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Отвязать Telegram
                    </button>
                  </div>
                ) : telegramToken ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-medium text-blue-700 mb-2">
                      Отправь боту эту команду:
                    </p>
                    <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-900 mb-3 select-all">
                      /link {telegramToken}
                    </div>
                    <a
                      href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot"}?start=link_${telegramToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2AABEE] text-white text-xs font-medium rounded-lg hover:bg-[#1a9bde] transition-colors"
                    >
                      Открыть @postcentro_bot
                    </a>
                    <p className="text-[10px] text-blue-500 mt-2">
                      Код действителен 10 минут
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setTelegramLoading(true);
                      const res = await fetch("/api/telegram/link-profile", {
                        method: "POST",
                      });
                      const data = await res.json();
                      if (data.token) setTelegramToken(data.token);
                      setTelegramLoading(false);
                    }}
                    disabled={telegramLoading}
                    className="flex items-center gap-2 px-4 py-3 bg-[#2AABEE] text-white text-sm font-medium rounded-xl hover:bg-[#1a9bde] cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {telegramLoading
                      ? "Генерирую код..."
                      : "🔗 Привязать Telegram"}
                  </button>
                )}

                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Что ты будешь получать:
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "✅ Уведомление после каждой публикации",
                      "📊 Еженедельный отчёт каждый понедельник",
                      "❌ Уведомление об ошибках публикации",
                    ].map((item) => (
                      <li key={item} className="text-xs text-gray-500">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "danger" && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-600 mb-1">
                    Удаление аккаунта
                  </p>
                  <p className="text-xs text-red-400 mb-3">
                    Это действие необратимо. Все ваши проекты, контент и
                    интеграции будут удалены.
                  </p>
                  <label className="block text-xs font-medium text-red-500 mb-1.5">
                    Введите ваш email для подтверждения:
                  </label>
                  <input
                    type="email"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={profile?.email}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm outline-none focus:border-red-400 bg-white mb-3"
                  />
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== profile?.email || deleting}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {deleting ? "Удаляем..." : "Удалить аккаунт навсегда"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
