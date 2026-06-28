"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function LoginPage() {
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setError(data.error || "Неверный email или пароль");
        return;
      }
      window.location.href = `/${locale}/dashboard`;
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3 text-xl">
            ⚡
          </div>
          <h1 className="text-xl font-bold text-gray-900">MVI Content Factory</h1>
          <p className="text-sm text-gray-500 mt-1">Войдите в аккаунт</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Нет аккаунта?{" "}
            <Link href={`/${locale}/auth/register`} className="text-accent font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
