"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import Logo from "@/components/ui/Logo";

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
      try { data = await res.json(); } catch { /* non-JSON */ }
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Left column — brand panel */}
      <div
        style={{
          width: "40%",
          background: "#2d1b4e",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 48px",
          position: "relative",
        }}
        className="hidden md:flex"
      >
        <Logo variant="light" size={120} />
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 22,
              color: "#e8c4a0",
              lineHeight: 1.6,
              letterSpacing: "0.03em",
              maxWidth: 280,
            }}
          >
            Контент, который продаёт. Автоматически.
          </p>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(240,235,227,0.3)",
          }}
        >
          Marketing AI Platform
        </div>
      </div>

      {/* Right column — form */}
      <div
        style={{
          flex: 1,
          background: "#f0ebe3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Mobile logo */}
          <div className="md:hidden mb-10 flex justify-center">
            <Logo variant="dark" size={56} horizontal />
          </div>

          <div style={{ marginBottom: 40 }}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#5a3d7a",
                marginBottom: 10,
              }}
            >
              Добро пожаловать
            </p>
            <h1
              style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 300,
                fontSize: 36,
                color: "#2d1b4e",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              Войти в аккаунт
            </h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#5a3d7a",
                  marginBottom: 10,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                style={{
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
                }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#2d1b4e"; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = "rgba(45,27,78,0.3)"; }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#5a3d7a",
                  marginBottom: 10,
                }}
              >
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                style={{
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
                }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#2d1b4e"; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = "rgba(45,27,78,0.3)"; }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#c9847a", margin: 0 }}>{error}</p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                background: loading ? "#5a3d7a" : "#2d1b4e",
                color: "#f0ebe3",
                border: "none",
                borderRadius: 2,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
                marginTop: 8,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#5a3d7a"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#2d1b4e"; }}
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(45,27,78,0.5)", marginTop: 32 }}>
            Нет аккаунта?{" "}
            <Link
              href={`/${locale}/auth/register`}
              style={{ color: "#2d1b4e", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
