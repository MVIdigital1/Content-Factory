"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";

function ResetForm() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password || !confirm) return;
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }
    if (!token) {
      setError("Недействительная ссылка");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сервера");
        return;
      }
      setDone(true);
      setTimeout(() => router.push(`/${locale}/auth/login`), 2500);
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(45,27,78,0.3)",
    outline: "none",
    fontSize: 15,
    color: "#2d1b4e",
    padding: "8px 0",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  } as React.CSSProperties;

  return (
    <div style={{ width: "100%", maxWidth: 380 }}>
      <div className="md:hidden mb-10 flex justify-center">
        <Logo variant="dark" size={56} horizontal />
      </div>

      {!token ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#c9847a", marginBottom: 24 }}>Ссылка недействительна или устарела.</p>
          <Link href={`/${locale}/auth/forgot-password`} style={{ color: "#2d1b4e", fontWeight: 500, textDecoration: "underline" }}>
            Запросить новую ссылку
          </Link>
        </div>
      ) : done ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(45,27,78,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>
            ✓
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: 32, color: "#2d1b4e", letterSpacing: "0.04em", margin: "0 0 16px" }}>
            Пароль изменён
          </h1>
          <p style={{ fontSize: 14, color: "rgba(45,27,78,0.6)", lineHeight: 1.7 }}>
            Перенаправляем на страницу входа...
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#5a3d7a", marginBottom: 10 }}>
              Новый пароль
            </p>
            <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: 36, color: "#2d1b4e", letterSpacing: "0.04em", margin: 0 }}>
              Сброс пароля
            </h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5a3d7a", marginBottom: 10 }}>
                Новый пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="минимум 6 символов"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#2d1b4e"; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = "rgba(45,27,78,0.3)"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5a3d7a", marginBottom: 10 }}>
                Повторите пароль
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#2d1b4e"; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = "rgba(45,27,78,0.3)"; }}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: "#c9847a", margin: 0 }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", height: 48, background: loading ? "#5a3d7a" : "#2d1b4e", color: "#f0ebe3", border: "none", borderRadius: 2, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s", marginTop: 8 }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#5a3d7a"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#2d1b4e"; }}
            >
              {loading ? "Сохраняем..." : "Сохранить пароль"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(45,27,78,0.5)", marginTop: 32 }}>
            <Link href={`/${locale}/auth/forgot-password`} style={{ color: "#2d1b4e", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Запросить новую ссылку
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div
        className="hidden md:flex"
        style={{ width: "40%", background: "#2d1b4e", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 48px", position: "relative" }}
      >
        <Logo variant="light" size={120} />
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontStyle: "italic", fontWeight: 300, fontSize: 22, color: "#e8c4a0", lineHeight: 1.6, letterSpacing: "0.03em", maxWidth: 280 }}>
            Создайте новый надёжный пароль.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 32, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(240,235,227,0.3)" }}>
          Marketing AI Platform
        </div>
      </div>

      <div style={{ flex: 1, background: "#f0ebe3", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
