"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("auth.register");
  const locale = useLocale();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    loading: false,
    googleLoading: false,
    error: "",
    success: false,
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setForm((prev) => ({ ...prev, loading: true, error: "" }));
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    });
    if (error) {
      setForm((prev) => ({ ...prev, loading: false, error: error.message }));
      return;
    }
    setForm((prev) => ({ ...prev, loading: false, success: true }));
  };

  const handleGoogle = async () => {
    setForm((prev) => ({ ...prev, googleLoading: true, error: "" }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
    if (error)
      setForm((prev) => ({
        ...prev,
        googleLoading: false,
        error: "Ошибка входа через Google",
      }));
  };

  if (form.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-[#E1F5EE] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✉️
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Подтвердите email
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Мы отправили письмо на{" "}
            <span className="font-medium text-gray-700">{form.email}</span>.
          </p>
          <Link
            href={`/${locale}/auth/login`}
            className="text-sm text-[#1D9E75] font-semibold hover:underline"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 bg-[#1D9E75] rounded-xl flex items-center justify-center mx-auto mb-3 text-xl">
            ⚡
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            MVI Content Factory
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("title")}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
          <button
            onClick={handleGoogle}
            disabled={form.googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
              />
              <path
                fill="#34A853"
                d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"
              />
              <path
                fill="#FBBC05"
                d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"
              />
              <path
                fill="#EA4335"
                d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"
              />
            </svg>
            {form.googleLoading ? "..." : "Google"}
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">или</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("name")}
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
                placeholder="Jahongir Salimov"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("password")}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors"
              />
            </div>
            {form.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {form.error}
              </div>
            )}
            <button
              type="submit"
              disabled={form.loading}
              className="w-full py-2.5 rounded-lg bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {form.loading ? t("loading") : t("btn")}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-5">
          {t("hasAccount")}{" "}
          <Link
            href={`/${locale}/auth/login`}
            className="text-[#1D9E75] font-semibold hover:underline"
          >
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
