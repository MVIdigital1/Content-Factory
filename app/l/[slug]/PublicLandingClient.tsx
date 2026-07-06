"use client";
import { useState, useEffect } from "react";
import LandingRenderer, { Block } from "@/components/landing/LandingRenderer";

type Props = {
  landingId: string;
  createdAt: string;
  blocks: Block[];
  bgImage?: string;
  brandColor?: string;
  autoCloseDays?: number | null;
  widgets?: { chat?: boolean; quickCall?: boolean };
};

function useCountdown(deadline: Date | null) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ h: 0, m: 0, s: 0 }); return; }
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({ h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return timeLeft;
}

export default function PublicLandingClient({ landingId, createdAt, blocks, bgImage, brandColor, autoCloseDays, widgets }: Props) {
  const deadline = autoCloseDays != null
    ? (() => { const d = new Date(createdAt); d.setDate(d.getDate() + autoCloseDays); return d; })()
    : null;

  const isExpired = deadline !== null && deadline.getTime() < Date.now();
  const daysUntil = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000) : null;
  const showCountdown = daysUntil !== null && daysUntil <= 3 && !isExpired;

  const countdown = useCountdown(showCountdown ? deadline : null);

  const handleLeadSubmit = async (data: { name: string; phone: string }) => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landing_id: landingId, name: data.name, phone: data.phone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Ошибка сервера");
    }
  };

  if (isExpired) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F0F0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⏰</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 8, textAlign: "center" }}>Акция завершена</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0 }}>
          Предложение действовало до {deadline!.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div style={{ position: "relative" }}>
      {/* Deadline banner */}
      {deadline && !isExpired && (
        <div style={{ background: "#1A1A18", color: "#fff", textAlign: "center", padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>
          Предложение действует до {deadline.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          {showCountdown && countdown && (
            <span style={{ marginLeft: 12, fontFamily: "monospace", fontWeight: 700, color: countdown.h === 0 && countdown.m < 10 ? "#EF4444" : "#4ABA74" }}>
              {countdown.h === 0 && countdown.m === 0 && countdown.s === 0
                ? "Завершено"
                : `Осталось: ${pad(countdown.h)}:${pad(countdown.m)}:${pad(countdown.s)}`}
            </span>
          )}
        </div>
      )}

      <LandingRenderer
        blocks={blocks}
        bgImage={bgImage}
        brandColor={brandColor}
        onLeadSubmit={handleLeadSubmit}
      />

      {/* Chat widget */}
      {widgets?.chat && (
        <button
          onClick={() => alert("Чат скоро будет доступен!")}
          style={{ position: "fixed", bottom: widgets?.quickCall ? 88 : 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#25D366", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,211,102,0.4)", zIndex: 999 }}
          title="Открыть чат"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.656 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#fff"/>
          </svg>
        </button>
      )}

      {/* Quick call widget */}
      {widgets?.quickCall && (
        <button
          onClick={() => alert("AI перезвонит в течение 1 минуты! Функция скоро будет доступна.")}
          style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#3B82F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(59,130,246,0.4)", zIndex: 999 }}
          title="Быстрый звонок"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#fff"/>
          </svg>
        </button>
      )}
    </div>
  );
}
