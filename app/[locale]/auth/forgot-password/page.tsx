"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import Logo from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сервера");
        return;
      }
      setSent(true);
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Left panel */}
      <div
        className="hidden md:flex"
        style={{ width: "40%", background: "#2d1b4e", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 48px", position: "relative" }}
      >
        <Logo variant="light" size={120} />
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontStyle: "italic", fontWeight: 300, fontSize: 22, color: "#e8c4a0", lineHeight: 1.6, letterSpacing: "0.03em", maxWidth: 280 }}>
            Восстановим доступ к вашему аккаунту.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 32, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(240,235,227,0.3)" }}>
          Marketing AI Platform
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: "#f0ebe3", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div className="md:hidden mb-10 flex justify-center">
            <Logo variant="dark" size={56} horizontal />
          </div>

          {sent ? (
            /* Success state */
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(45,27,78,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>
                ✉️
              </div>
              <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: 32, color: "#2d1b4e", letterSpacing: "0.04em", margin: "0 0 16px" }}>
                Письмо отправлено
              </h1>
              <p style={{ fontSize: 14, color: "rgba(45,27,78,0.6)", lineHeight: 1.7, margin: "0 0 32px" }}>
                Если аккаунт с адресом <strong>{email}</strong> существует — письмо со ссылкой для сброса пароля уже в пути. Проверьте папку «Спам» если не видите письма.
              </p>
              <Link
                href={`/${locale}/auth/login`}
                style={{ display: "block", width: "100%", height: 48, background: "#2d1b4e", color: "#f0ebe3", textDecoration: "none", textAlign: "center", lineHeight: "48px", borderRadius: 2, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}
              >
                Вернуться к входу
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div style={{ marginBottom: 40 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#5a3d7a", marginBottom: 10 }}>
                  Восстановление доступа
                </p>
                <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: 36, color: "#2d1b4e", letterSpacing: "0.04em", margin: 0 }}>
                  Забыли пароль?
                </h1>
                <p style={{ fontSize: 13, color: "rgba(45,27,78,0.5)", marginTop: 12, lineHeight: 1.6 }}>
                  Введите email вашего аккаунта — пришлём ссылку для создания нового пароля.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5a3d7a", marginBottom: 10 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="you@example.com"
                    style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(45,27,78,0.3)", outline: "none", fontSize: 15, color: "#2d1b4e", padding: "8px 0", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#2d1b4e"; }}
                    onBlur={(e) => { e.currentTarget.style.borderBottomColor = "rgba(45,27,78,0.3)"; }}
                  />
                </div>

                {error && <p style={{ fontSize: 13, color: "#c9847a", margin: 0 }}>{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !email}
                  style={{ width: "100%", height: 48, background: loading || !email ? "#5a3d7a" : "#2d1b4e", color: "#f0ebe3", border: "none", borderRadius: 2, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", cursor: loading || !email ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { if (!loading && email) (e.currentTarget as HTMLElement).style.background = "#5a3d7a"; }}
                  onMouseLeave={(e) => { if (!loading && email) (e.currentTarget as HTMLElement).style.background = "#2d1b4e"; }}
                >
                  {loading ? "Отправляем..." : "Отправить ссылку"}
                </button>
              </div>

              <p style={{ textAlign: "center", fontSize: 13, color: "rgba(45,27,78,0.5)", marginTop: 32 }}>
                Вспомнили пароль?{" "}
                <Link href={`/${locale}/auth/login`} style={{ color: "#2d1b4e", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Войти
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
