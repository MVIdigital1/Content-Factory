"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";

// ── Types ──────────────────────────────────────────────────────────────────
type Platform = "telegram" | "instagram" | "all";
type Post = {
  id: string;
  platform: "telegram" | "instagram";
  text: string;
  image_url?: string;
  date: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  reactions?: Record<string, number>;
  url?: string;
  type?: "post" | "reel" | "story" | "video";
};

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function fmtNum(n?: number): string {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

// ── Post card ──────────────────────────────────────────────────────────────
function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const isTg = post.platform === "telegram";
  const platformColor = isTg ? "#0088CC" : "#E1306C";
  const platformAbbr = isTg ? "TG" : "IG";

  return (
    <div
      onClick={onClick}
      className="ui-surface overflow-hidden cursor-pointer group"
      style={{ transition: "transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image */}
      {post.image_url && (
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            overflow: "hidden",
          }}
        >
          <img
            src={post.image_url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              width: 24,
              height: 16,
              borderRadius: 4,
              background: platformColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 8,
              fontWeight: 700,
            }}
          >
            {platformAbbr}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 12px" }}>
        {/* Platform badge if no image */}
        {!post.image_url && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 14,
                borderRadius: 3,
                background: platformColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 7,
                fontWeight: 700,
              }}
            >
              {platformAbbr}
            </div>
            {post.type && (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--tx-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {post.type}
              </span>
            )}
          </div>
        )}

        {/* Text */}
        <p
          style={{
            fontSize: 12,
            color: "var(--tx-1)",
            lineHeight: 1.5,
            marginBottom: 8,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical" as any,
          }}
        >
          {post.text || "—"}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {post.views !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>👁</span>
              <span
                style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-2)" }}
              >
                {fmtNum(post.views)}
              </span>
            </div>
          )}
          {post.likes !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>❤️</span>
              <span
                style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-2)" }}
              >
                {fmtNum(post.likes)}
              </span>
            </div>
          )}
          {post.comments !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>💬</span>
              <span
                style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-2)" }}
              >
                {fmtNum(post.comments)}
              </span>
            </div>
          )}
          {post.shares !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "var(--tx-3)" }}>🔄</span>
              <span
                style={{ fontSize: 11, fontWeight: 500, color: "var(--tx-2)" }}
              >
                {fmtNum(post.shares)}
              </span>
            </div>
          )}
          <span
            style={{ marginLeft: "auto", fontSize: 10, color: "var(--tx-3)" }}
          >
            {timeAgo(post.date)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Post detail modal ──────────────────────────────────────────────────────
function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const isTg = post.platform === "telegram";
  const platformColor = isTg ? "#0088CC" : "#E1306C";
  const platformName = isTg ? "Telegram" : "Instagram";

  const engagementRate =
    post.views && post.likes
      ? (
          ((post.likes + (post.comments ?? 0) + (post.shares ?? 0)) /
            post.views) *
          100
        ).toFixed(1)
      : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 20,
                borderRadius: 5,
                background: platformColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {isTg ? "TG" : "IG"}
            </div>
            <div>
              <p
                style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}
              >
                {platformName}
              </p>
              <p style={{ fontSize: 10, color: "var(--tx-3)", marginTop: 1 }}>
                {new Date(post.date).toLocaleDateString("ru", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--tx-3)",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Image */}
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              style={{ width: "100%", maxHeight: 340, objectFit: "cover" }}
            />
          )}

          {/* Text */}
          <div style={{ padding: "16px 20px" }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--tx-1)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                marginBottom: 20,
              }}
            >
              {post.text}
            </p>

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Просмотры",
                  value: fmtNum(post.views),
                  icon: "👁",
                  color: "#3B82F6",
                },
                {
                  label: "Лайки",
                  value: fmtNum(post.likes),
                  icon: "❤️",
                  color: "#E1306C",
                },
                {
                  label: "Комментарии",
                  value: fmtNum(post.comments),
                  icon: "💬",
                  color: "#F59E0B",
                },
                {
                  label: "Репосты",
                  value: fmtNum(post.shares),
                  icon: "🔄",
                  color: "#10B981",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "12px",
                    background: "var(--panel-2)",
                    borderRadius: 10,
                    textAlign: "center",
                    border: "0.5px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--tx-1)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{ fontSize: 9, color: "var(--tx-3)", marginTop: 2 }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Extra stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 10,
              }}
            >
              {post.saves !== undefined && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--panel-2)",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--tx-3)",
                      marginBottom: 3,
                    }}
                  >
                    Сохранения
                  </p>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    {fmtNum(post.saves)}
                  </p>
                </div>
              )}
              {post.reach !== undefined && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--panel-2)",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--tx-3)",
                      marginBottom: 3,
                    }}
                  >
                    Охват
                  </p>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--tx-1)",
                    }}
                  >
                    {fmtNum(post.reach)}
                  </p>
                </div>
              )}
              {engagementRate && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--panel-2)",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--tx-3)",
                      marginBottom: 3,
                    }}
                  >
                    Вовлечённость
                  </p>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--pos)",
                    }}
                  >
                    {engagementRate}%
                  </p>
                </div>
              )}
            </div>

            {/* Reactions (Telegram) */}
            {post.reactions && Object.keys(post.reactions).length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "var(--panel-2)",
                  borderRadius: 9,
                  border: "0.5px solid var(--line)",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--tx-3)",
                    marginBottom: 8,
                  }}
                >
                  Реакции
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(post.reactions).map(([emoji, count]) => (
                    <div
                      key={emoji}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: "var(--panel)",
                        borderRadius: 20,
                        border: "0.5px solid var(--line)",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{emoji}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--tx-1)",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "0.5px solid var(--line)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 8,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: "var(--tx-2)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              🔗 Открыть оригинал
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Analysis modal ──────────────────────────────────────────────────────
function AnalysisModal({
  posts,
  project,
  onClose,
  onPlanCreated,
}: {
  posts: Post[];
  project: any;
  onClose: () => void;
  onPlanCreated: (plan: any[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [contentPlan, setContentPlan] = useState<any[]>([]);
  const [step, setStep] = useState<"choose" | "analyzing" | "done">("choose");
  const [period, setPeriod] = useState<"week" | "2weeks" | "month">("week");

  const analyze = async () => {
    setStep("analyzing");
    setLoading(true);

    const postsData = posts.slice(0, 20).map((p) => ({
      platform: p.platform,
      text: p.text?.slice(0, 200),
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      date: p.date,
    }));

    const periodDays = period === "week" ? 7 : period === "2weeks" ? 14 : 30;

    const prompt = `Ты эксперт по контент-маркетингу. Проанализируй эти посты и создай контент-план.

Проект: ${project?.name ?? "неизвестен"}
Ниша: ${project?.niche ?? "не указана"}
Описание: ${project?.description ?? "не указано"}
Аудитория: ${project?.audience ?? "не указана"}
Период планирования: ${periodDays} дней

Последние посты (статистика):
${JSON.stringify(postsData, null, 2)}

Задача:
1. Проанализируй что работает лучше всего (по просмотрам и вовлечённости)
2. Определи лучшее время публикации
3. Создай конкретный контент-план на ${periodDays} дней

Ответь ТОЛЬКО в JSON без markdown:
{
  "analysis": "краткий анализ что работает лучше всего (2-3 предложения)",
  "best_time": "лучшее время публикации",
  "best_format": "лучший формат контента",
  "plan": [
    {
      "day": 1,
      "date": "дата публикации",
      "platform": "telegram или instagram",
      "type": "пост/видео/reels/stories",
      "topic": "тема поста",
      "hook": "первое предложение-хук",
      "time": "время публикации"
    }
  ]
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text =
        data.content?.find((c: any) => c.type === "text")?.text ?? "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed.analysis ?? "");
      setContentPlan(parsed.plan ?? []);
      onPlanCreated(parsed.plan ?? []);
      setStep("done");
    } catch (e) {
      setResult("Ошибка анализа. Попробуйте ещё раз.");
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-1)" }}>
              ✦ AI Аналитика и планирование
            </p>
            <p style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 2 }}>
              {project?.name ?? "Проект"} · {posts.length} постов
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--tx-3)",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {step === "choose" && (
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--tx-2)",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                AI проанализирует твои посты, определит что работает лучше всего
                и создаст контент-план с темами, хуками и временем публикации.
              </p>
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--tx-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Период планирования
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 10,
                  }}
                >
                  {[
                    { v: "week", l: "Неделя", d: "7 постов" },
                    { v: "2weeks", l: "2 недели", d: "14 постов" },
                    { v: "month", l: "Месяц", d: "~20 постов" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setPeriod(opt.v as any)}
                      style={{
                        padding: "14px",
                        borderRadius: 10,
                        border: `0.5px solid ${period === opt.v ? "var(--accent)" : "var(--line)"}`,
                        background:
                          period === opt.v
                            ? "var(--accent-dim)"
                            : "var(--panel)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.12s",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color:
                            period === opt.v ? "var(--accent)" : "var(--tx-1)",
                        }}
                      >
                        {opt.l}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--tx-3)",
                          marginTop: 3,
                        }}
                      >
                        {opt.d}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  background: "var(--panel-2)",
                  borderRadius: 9,
                  border: "0.5px solid var(--line)",
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--tx-2)",
                    lineHeight: 1.6,
                  }}
                >
                  ✦ AI изучит твои <strong>{posts.length} постов</strong>,
                  найдёт паттерны успешного контента и предложит конкретные темы
                  и хуки для новых публикаций
                </p>
              </div>
              <button
                onClick={analyze}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✦ Начать анализ
              </button>
            </div>
          )}

          {step === "analyzing" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                  animation: "spin 2s linear infinite",
                }}
              >
                ✦
              </div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--tx-1)",
                  marginBottom: 8,
                }}
              >
                AI анализирует контент...
              </p>
              <p
                style={{ fontSize: 12, color: "var(--tx-3)", lineHeight: 1.6 }}
              >
                Изучаю статистику постов,
                <br />
                определяю что работает лучше,
                <br />
                составляю контент-план
              </p>
              <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {step === "done" && (
            <div>
              {result && (
                <div
                  style={{
                    padding: "14px",
                    background: "var(--accent-dim)",
                    borderRadius: 10,
                    border: "0.5px solid var(--accent)",
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent)",
                      marginBottom: 6,
                    }}
                  >
                    ✦ Вывод AI
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--tx-1)",
                      lineHeight: 1.6,
                    }}
                  >
                    {result}
                  </p>
                </div>
              )}

              {contentPlan.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--tx-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    Контент-план · {contentPlan.length} публикаций
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {contentPlan.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 14px",
                          background: "var(--panel-2)",
                          borderRadius: 10,
                          border: "0.5px solid var(--line)",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--on-accent)",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {item.day}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--tx-1)",
                              }}
                            >
                              {item.topic}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 10,
                                background:
                                  item.platform === "telegram"
                                    ? "rgba(0,136,204,0.15)"
                                    : "rgba(225,48,108,0.15)",
                                color:
                                  item.platform === "telegram"
                                    ? "#0088CC"
                                    : "#E1306C",
                                fontWeight: 600,
                              }}
                            >
                              {item.platform === "telegram" ? "TG" : "IG"}
                            </span>
                            <span style={{ fontSize: 9, color: "var(--tx-3)" }}>
                              {item.type}
                            </span>
                          </div>
                          {item.hook && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--tx-2)",
                                fontStyle: "italic",
                                marginBottom: 3,
                              }}
                            >
                              «{item.hook}»
                            </p>
                          )}
                          <div style={{ display: "flex", gap: 10 }}>
                            {item.date && (
                              <span
                                style={{ fontSize: 10, color: "var(--tx-3)" }}
                              >
                                📅 {item.date}
                              </span>
                            )}
                            {item.time && (
                              <span
                                style={{ fontSize: 10, color: "var(--tx-3)" }}
                              >
                                🕐 {item.time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === "done" && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "0.5px solid var(--line)",
              display: "flex",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setStep("choose")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "0.5px solid var(--line)",
                background: "transparent",
                color: "var(--tx-2)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ↺ Перепланировать
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✓ Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create post modal ─────────────────────────────────────────────────────
function CreatePostModal({
  projectId,
  projects,
  integrations,
  onClose,
  onPublished,
}: {
  projectId: string;
  projects: any[];
  integrations: any[];
  onClose: () => void;
  onPublished: () => void;
}) {
  const [text, setText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("telegram");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [topic, setTopic] = useState("");
  const supabase = createClient();

  const tgChannels = integrations.filter(
    (i: any) => i.platform === "telegram" && i.is_active,
  );
  const igChannels = integrations.filter(
    (i: any) => i.platform === "instagram" && i.is_active,
  );
  const activeProject = projects.find((p: any) => p.id === projectId) as any;

  useEffect(() => {
    if (tgChannels.length > 0) setSelectedChannel(tgChannels[0].channel_id);
  }, []);

  // Generate text via Claude API
  const generateText = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Напиши пост для ${selectedPlatform === "telegram" ? "Telegram" : "Instagram"} канала.

Проект: ${activeProject?.name ?? ""}
Ниша: ${activeProject?.niche ?? ""}
Описание: ${activeProject?.description ?? ""}
Аудитория: ${activeProject?.audience ?? ""}
Тема поста: ${topic}

Требования:
- Начни с цепляющего хука
- Используй эмодзи умеренно
- В конце добавь призыв к действию
- Длина: 150-300 слов
- Пиши на русском

Напиши только текст поста без каких-либо пояснений.`,
            },
          ],
        }),
      });
      const data = await res.json();
      setText(data.content?.[0]?.text ?? "");
    } catch (e) {
      console.error("Generate error:", e);
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!text.trim()) return;
    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Save content to DB
      const { data: content } = await supabase
        .from("contents")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          platform: selectedPlatform,
          body: text,
          caption: text,
          title: topic || text.slice(0, 50),
          content_type: "post",
          status: publishMode === "now" ? "published" : "scheduled",
          language: "ru",
        })
        .select()
        .single();

      if (!content) throw new Error("Ошибка сохранения");

      if (publishMode === "now") {
        // Publish immediately
        const res = await fetch("/api/content/publish-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId: content.id,
            platform: selectedPlatform,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Ошибка публикации");
        }
      } else if (publishMode === "schedule" && scheduleTime) {
        // Schedule
        await supabase.from("scheduled_posts").insert({
          content_id: content.id,
          platform: selectedPlatform,
          scheduled_at: new Date(scheduleTime).toISOString(),
          status: "pending",
          retry_count: 0,
        });
      }

      onPublished();
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
    setPublishing(false);
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3 transition-colors";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "0.5px solid var(--line)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-1)" }}>
            ✏️ Создать пост
          </p>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--tx-3)",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Platform */}
          <div>
            <label className="block ui-label mb-2">Платформа</label>
            <div style={{ display: "flex", gap: 8 }}>
              {tgChannels.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedPlatform("telegram");
                    setSelectedChannel(tgChannels[0].channel_id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: `0.5px solid ${selectedPlatform === "telegram" ? "var(--accent)" : "var(--line)"}`,
                    background:
                      selectedPlatform === "telegram"
                        ? "var(--accent-dim)"
                        : "transparent",
                    color:
                      selectedPlatform === "telegram"
                        ? "var(--accent)"
                        : "var(--tx-2)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      borderRadius: 3,
                      background: "#0088CC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 7,
                      fontWeight: 700,
                    }}
                  >
                    TG
                  </div>
                  Telegram
                </button>
              )}
              {igChannels.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedPlatform("instagram");
                    setSelectedChannel(igChannels[0].channel_id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: `0.5px solid ${selectedPlatform === "instagram" ? "var(--accent)" : "var(--line)"}`,
                    background:
                      selectedPlatform === "instagram"
                        ? "var(--accent-dim)"
                        : "transparent",
                    color:
                      selectedPlatform === "instagram"
                        ? "var(--accent)"
                        : "var(--tx-2)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      borderRadius: 3,
                      background: "#E1306C",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 7,
                      fontWeight: 700,
                    }}
                  >
                    IG
                  </div>
                  Instagram
                </button>
              )}
            </div>
            {/* Channel selector for Telegram */}
            {selectedPlatform === "telegram" && tgChannels.length > 1 && (
              <div style={{ marginTop: 8 }}>
                <label className="block ui-label mb-1">Канал</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className={inp}
                >
                  {tgChannels.map((ch: any) => (
                    <option key={ch.id} value={ch.channel_id}>
                      {ch.channel_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* AI Generate */}
          <div>
            <label className="block ui-label mb-1">Тема поста (для AI)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateText()}
                placeholder="Например: акция на выходные, новый продукт..."
                className={`${inp} flex-1`}
              />
              <button
                onClick={generateText}
                disabled={!topic.trim() || generating}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  opacity: !topic.trim() || generating ? 0.6 : 1,
                }}
              >
                {generating ? "⟳" : "✦ AI"}
              </button>
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block ui-label mb-1">Текст поста *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напишите текст поста или используйте AI выше..."
              className={`${inp} resize-none`}
              style={{ height: 180, fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <p style={{ fontSize: 10, color: "var(--tx-3)", marginTop: 4 }}>
              {text.length} символов
            </p>
          </div>

          {/* Publish mode */}
          <div>
            <label className="block ui-label mb-2">Публикация</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPublishMode("now")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 9,
                  border: `0.5px solid ${publishMode === "now" ? "var(--accent)" : "var(--line)"}`,
                  background:
                    publishMode === "now" ? "var(--accent-dim)" : "transparent",
                  color:
                    publishMode === "now" ? "var(--accent)" : "var(--tx-2)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🚀 Опубликовать сейчас
              </button>
              <button
                onClick={() => setPublishMode("schedule")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 9,
                  border: `0.5px solid ${publishMode === "schedule" ? "var(--accent)" : "var(--line)"}`,
                  background:
                    publishMode === "schedule"
                      ? "var(--accent-dim)"
                      : "transparent",
                  color:
                    publishMode === "schedule"
                      ? "var(--accent)"
                      : "var(--tx-2)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📅 Запланировать
              </button>
            </div>
            {publishMode === "schedule" && (
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className={inp}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "0.5px solid var(--line)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "transparent",
              color: "var(--tx-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Отмена
          </button>
          <button
            onClick={handlePublish}
            disabled={
              !text.trim() ||
              publishing ||
              (publishMode === "schedule" && !scheduleTime)
            }
            style={{
              flex: 2,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: !text.trim() || publishing ? 0.6 : 1,
            }}
          >
            {publishing
              ? "⟳ Публикую..."
              : publishMode === "now"
                ? "🚀 Опубликовать"
                : "📅 Запланировать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
// ── Landing Tab ───────────────────────────────────────────────────────────────
function LandingTab({ projectId, projects }: { projectId: string; projects: any[] }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const locale = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", slogan: "", description: "", services: "",
    contact_email: "", contact_phone: "", contact_link: "",
    template: "1", color: "#6366f1",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: pages = [], refetch } = useQuery({
    queryKey: ["landing_pages", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("landing_pages")
        .select("*, landing_leads(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const activeProject = projects.find((p: any) => p.id === projectId);

  const fillWithAI = async () => {
    if (!activeProject) return;
    setAiLoading(true);
    try {
      const prompt = `Создай контент для лендинга компании "${activeProject.name}"${activeProject.niche ? ` в нише "${activeProject.niche}"` : ""}.
${activeProject.description ? `Описание: ${activeProject.description}` : ""}
Верни ТОЛЬКО JSON без пояснений:
{"title":"название компании","slogan":"короткий слоган 5-8 слов","description":"описание компании 2-3 предложения","services":"список услуг через запятую (5-7 пунктов)"}`;
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_tokens: 400 }),
      });
      const { text } = await res.json();
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const d = JSON.parse(m[0]);
        setForm(f => ({ ...f, title: d.title || f.title, slogan: d.slogan || f.slogan, description: d.description || f.description, services: d.services || f.services }));
      }
    } catch {}
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const slug = `${form.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, "-").replace(/-+/g, "-").slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
      await supabase.from("landing_pages").insert({
        user_id: user.id,
        project_id: projectId || null,
        slug,
        title: form.title.trim(),
        slogan: form.slogan || null,
        description: form.description || null,
        services: form.services || null,
        logo_url: activeProject?.logo_url || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_link: form.contact_link || null,
        template: form.template,
        color: form.color,
        is_published: true,
      });
      await refetch();
      setShowForm(false);
      setForm({ title: "", slogan: "", description: "", services: "", contact_email: "", contact_phone: "", contact_link: "", template: "1", color: "#6366f1" });
    } catch (e: any) { alert("Ошибка: " + e.message); }
    setSaving(false);
  };

  const copyLink = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deletePage = async (id: string) => {
    if (!confirm("Удалить лендинг?")) return;
    await supabase.from("landing_pages").delete().eq("id", id);
    refetch();
  };

  const inp = "w-full px-3 py-2 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";
  const TEMPLATES = [
    { key: "1", label: "Минимал", preview: "bg-white border" },
    { key: "2", label: "Тёмный", preview: "bg-gray-900" },
    { key: "3", label: "Градиент", preview: "bg-gradient-to-r from-purple-500 to-blue-500" },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-semibold text-tx-1">Лендинги</h2>
          <p className="text-[11px] text-tx-3 mt-0.5">Быстрые сайты для приёма заявок от клиентов</p>
        </div>
        <button
          onClick={() => {
            if (activeProject) setForm(f => ({ ...f, title: activeProject.name || "" }));
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)", color: "var(--on-accent)", border: "none" }}
        >
          + Создать лендинг
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-[14px] border border-line" style={{ background: "var(--panel-2)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-tx-1">Новый лендинг</h3>
            <button
              onClick={fillWithAI}
              disabled={aiLoading || !activeProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium cursor-pointer disabled:opacity-50 hover:opacity-80 transition-opacity"
              style={{ background: "var(--chip)", color: "var(--tx-1)", border: "none" }}
            >
              {aiLoading ? "⟳ Заполняю..." : "✦ Заполнить AI"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Название компании *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nike Uzbekistan" className={inp} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Слоган</label>
                <input value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))} placeholder="Просто сделай это" className={inp} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">О компании</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Чем занимается компания..." className={`${inp} resize-none`} rows={3} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Услуги / товары</label>
                <textarea value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} placeholder="Кроссовки, одежда, аксессуары..." className={`${inp} resize-none`} rows={2} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Телефон</label>
                <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+998 90 000 00 00" className={inp} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Email</label>
                <input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="info@company.uz" className={inp} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Telegram / WhatsApp ссылка</label>
                <input value={form.contact_link} onChange={e => setForm(f => ({ ...f, contact_link: e.target.value }))} placeholder="https://t.me/username" className={inp} />
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-1">Цвет акцента</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-line" />
                  <span className="text-[11px] text-tx-3">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-tx-3 mb-2">Шаблон</label>
                <div className="flex gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, template: t.key }))}
                      className={`flex-1 py-3 rounded-[8px] text-[10px] font-medium cursor-pointer border-2 transition-all ${form.template === t.key ? "border-accent" : "border-line"}`}
                      style={{ background: t.key === "2" ? "#1a1a1a" : t.key === "3" ? "linear-gradient(135deg,#6366f1,#3b82f6)" : "var(--panel)", color: t.key !== "1" ? "#fff" : "var(--tx-1)" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-line">
            <button onClick={handleSave} disabled={!form.title.trim() || saving}
              className="px-5 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--on-accent)", border: "none" }}>
              {saving ? "⟳ Создаю..." : "🚀 Опубликовать"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-[8px] text-[12px] cursor-pointer hover:bg-hover"
              style={{ border: "0.5px solid var(--line)", background: "none", color: "var(--tx-2)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Pages list */}
      {pages.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-line rounded-[14px]">
          <span style={{ fontSize: 36 }}>🌐</span>
          <p className="text-[13px] font-medium text-tx-1 mt-3">Нет лендингов</p>
          <p className="text-[11px] text-tx-3 mt-1">Создай первый лендинг для приёма заявок</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {pages.map((page: any) => {
            const leadsCount = page.landing_leads?.[0]?.count ?? 0;
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/l/${page.slug}`;
            return (
              <div key={page.id} className="p-4 rounded-[12px] border border-line" style={{ background: "var(--panel-2)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: page.color }} />
                      <span className="text-[13px] font-semibold text-tx-1">{page.title}</span>
                    </div>
                    {page.slogan && <p className="text-[11px] text-tx-3 mt-0.5">{page.slogan}</p>}
                  </div>
                  <button onClick={() => deletePage(page.id)} className="text-[12px] text-tx-3 hover:text-neg cursor-pointer" style={{ background: "none", border: "none" }}>✕</button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]" style={{ background: "var(--chip)" }}>
                    <span className="text-[11px] font-semibold text-tx-1">{leadsCount}</span>
                    <span className="text-[10px] text-tx-3">заявок</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]" style={{ background: "var(--chip)" }}>
                    <span className="text-[11px] font-semibold text-tx-1">{page.views}</span>
                    <span className="text-[10px] text-tx-3">просмотров</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 px-2.5 py-1.5 rounded-[6px] text-[10px] text-tx-3 truncate" style={{ background: "var(--panel)", border: "0.5px solid var(--line)" }}>
                    /l/{page.slug}
                  </div>
                  <button onClick={() => copyLink(page.slug, page.id)}
                    className="px-3 py-1.5 rounded-[6px] text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: copiedId === page.id ? "var(--pos)" : "var(--accent)", color: "var(--on-accent)", border: "none" }}>
                    {copiedId === page.id ? "✓" : "Копировать"}
                  </button>
                  <a href={`/l/${page.slug}`} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 rounded-[6px] text-[10px] font-medium cursor-pointer hover:opacity-80"
                    style={{ background: "var(--chip)", color: "var(--tx-1)", textDecoration: "none" }}>
                    ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateContentPageInner() {
  const supabase = createClient();
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<"content" | "landing">("content");
  const [platform, setPlatform] = useState<Platform>("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [contentPlan, setContentPlan] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string>("");

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name,niche,description,audience,logo_url")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  // Fetch integrations
  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const activeProject = projects.find((p: any) => p.id === projectId) as any;
  const tgChannels = integrations.filter((i: any) => i.platform === "telegram");
  const igChannels = integrations.filter(
    (i: any) => i.platform === "instagram",
  );

  useEffect(() => {
    if (projects.length > 0 && !projectId)
      setProjectId((projects[0] as any).id);
  }, [projects]);

  // Load posts from connected platforms
  const loadPosts = async () => {
    setLoadingPosts(true);
    setError("");
    const allPosts: Post[] = [];

    // Telegram — our new route that reads from publish_logs + real stats
    if (tgChannels.length > 0) {
      try {
        const res = await fetch(`/api/telegram/posts?limit=30`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Post[] = (data.messages ?? []).map((m: any) => ({
            id: `tg_${m.id}`,
            platform: "telegram" as const,
            text: m.text ?? "",
            image_url: m.image_url ?? null,
            date: m.date,
            views: m.views ?? 0,
            shares: m.shares ?? 0,
            reactions: m.reactions ?? {},
            url: m.url ?? null,
            type: "post" as const,
          }));
          allPosts.push(...mapped);
        }
      } catch (e) {
        console.error("Telegram posts error:", e);
      }
    }

    // Instagram — our new route that reads from Instagram Graph API
    if (igChannels.length > 0) {
      try {
        const res = await fetch(`/api/instagram/posts?limit=30`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Post[] = (data.data ?? []).map((m: any) => ({
            id: `ig_${m.id}`,
            platform: "instagram" as const,
            text: m.text ?? "",
            image_url: m.image_url ?? null,
            date: m.date,
            likes: m.likes ?? 0,
            comments: m.comments ?? 0,
            saves: m.saves ?? 0,
            reach: m.reach ?? 0,
            type: (m.type ?? "post") as any,
            url: m.url ?? null,
          }));
          allPosts.push(...mapped);
        }
      } catch (e) {
        console.error("Instagram posts error:", e);
      }
    }

    // Sort by date newest first
    allPosts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    if (
      allPosts.length === 0 &&
      (tgChannels.length > 0 || igChannels.length > 0)
    ) {
      setError(
        "Постов не найдено. Опубликуйте хотя бы один пост через PostCentro чтобы он появился здесь.",
      );
    }

    setPosts(allPosts);
    setLoadingPosts(false);
  };

  useEffect(() => {
    if (integrations.length > 0) loadPosts();
  }, [integrations]);

  const filteredPosts = posts.filter(
    (p) => platform === "all" || p.platform === platform,
  );
  const hasConnected = tgChannels.length > 0 || igChannels.length > 0;

  // Stats summary
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0);
  const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

  const COLORS = ["#4ABA74", "#3B82F6", "#8B5CF6", "#F59E0B"];
  const colorFor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 44,
          borderBottom: "0.5px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
            Маркетинг /{" "}
            <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
              Создать контент
            </span>
          </p>
          <div style={{ display: "flex", gap: 2, background: "var(--panel-2)", borderRadius: 8, padding: 2, border: "0.5px solid var(--line)" }}>
            {([["content", "Контент"], ["landing", "Landing"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  padding: "3px 12px", borderRadius: 6, fontSize: 11, fontWeight: activeTab === key ? 600 : 400,
                  background: activeTab === key ? "var(--panel)" : "transparent",
                  color: activeTab === key ? "var(--tx-1)" : "var(--tx-3)",
                  border: activeTab === key ? "0.5px solid var(--line)" : "none",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasConnected && (
            <button
              onClick={() => setShowCreatePost(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                border: "0.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--tx-2)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✏️ Создать пост
            </button>
          )}
          {hasConnected && posts.length > 0 && (
            <button
              onClick={() => setShowAnalysis(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✦ AI Анализ и план
            </button>
          )}
          <button
            onClick={loadPosts}
            disabled={loadingPosts}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "0.5px solid var(--line)",
              background: "transparent",
              color: "var(--tx-2)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: loadingPosts ? 0.6 : 1,
            }}
          >
            {loadingPosts ? "⟳" : "↻"} Обновить
          </button>
        </div>
      </div>

      {activeTab === "landing" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <LandingTab projectId={projectId} projects={projects} />
        </div>
      )}

      {activeTab === "content" && <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* Project selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 500 }}>
            Проект:
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setProjectId(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: `0.5px solid ${projectId === p.id ? "var(--accent)" : "var(--line)"}`,
                  background:
                    projectId === p.id ? "var(--accent-dim)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: projectId === p.id ? 600 : 400,
                  color: projectId === p.id ? "var(--accent)" : "var(--tx-2)",
                }}
              >
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt=""
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: colorFor(p.id),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        {posts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              { l: "Всего постов", v: posts.length, icon: "📝" },
              { l: "Средние просмотры", v: fmtNum(avgViews), icon: "👁" },
              { l: "Суммарные лайки", v: fmtNum(totalLikes), icon: "❤️" },
              { l: "Комментарии", v: fmtNum(totalComments), icon: "💬" },
            ].map((k) => (
              <div
                key={k.l}
                className="ui-surface"
                style={{ padding: "14px 16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{k.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--tx-3)",
                      fontWeight: 500,
                    }}
                  >
                    {k.l}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--tx-1)",
                  }}
                >
                  {k.v}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Content plan if generated */}
        {contentPlan.length > 0 && (
          <div
            style={{
              marginBottom: 20,
              padding: "14px 16px",
              background: "var(--accent-dim)",
              borderRadius: 12,
              border: "0.5px solid var(--accent)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                ✦ Контент-план · {contentPlan.length} публикаций
              </p>
              <button
                onClick={() => setContentPlan([])}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--tx-3)",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {contentPlan.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 12px",
                    background: "var(--panel)",
                    borderRadius: 9,
                    border: "0.5px solid var(--line)",
                    minWidth: 160,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--on-accent)",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      Д{item.day}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 5px",
                        borderRadius: 8,
                        background:
                          item.platform === "telegram"
                            ? "rgba(0,136,204,0.15)"
                            : "rgba(225,48,108,0.15)",
                        color:
                          item.platform === "telegram" ? "#0088CC" : "#E1306C",
                        fontWeight: 600,
                      }}
                    >
                      {item.platform === "telegram" ? "TG" : "IG"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--tx-1)",
                      marginBottom: 3,
                    }}
                  >
                    {item.topic}
                  </p>
                  {item.time && (
                    <p style={{ fontSize: 10, color: "var(--tx-3)" }}>
                      🕐 {item.time}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform filter */}
        {hasConnected && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[
              { v: "all", l: "Все платформы", count: posts.length },
              ...(tgChannels.length > 0
                ? [
                    {
                      v: "telegram",
                      l: "Telegram",
                      count: posts.filter((p) => p.platform === "telegram")
                        .length,
                    },
                  ]
                : []),
              ...(igChannels.length > 0
                ? [
                    {
                      v: "instagram",
                      l: "Instagram",
                      count: posts.filter((p) => p.platform === "instagram")
                        .length,
                    },
                  ]
                : []),
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setPlatform(opt.v as Platform)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `0.5px solid ${platform === opt.v ? "var(--accent)" : "var(--line)"}`,
                  background:
                    platform === opt.v ? "var(--accent-dim)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: platform === opt.v ? 600 : 400,
                  color: platform === opt.v ? "var(--accent)" : "var(--tx-2)",
                }}
              >
                {opt.v === "telegram" && (
                  <span style={{ fontSize: 10 }}>✈️</span>
                )}
                {opt.v === "instagram" && (
                  <span style={{ fontSize: 10 }}>📸</span>
                )}
                {opt.l} · {opt.count}
              </button>
            ))}
          </div>
        )}

        {/* No platforms connected */}
        {!hasConnected && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔌</div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--tx-1)",
                marginBottom: 8,
              }}
            >
              Нет подключённых платформ
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--tx-3)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Подключите Telegram или Instagram чтобы видеть посты и аналитику
            </p>
            <a
              href={`/${locale}/integrations`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: 9,
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              → Перейти в Подключения
            </a>
          </div>
        )}

        {/* Loading */}
        {loadingPosts && (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div
              style={{ fontSize: 40, animation: "spin 1.5s linear infinite" }}
            >
              ✦
            </div>
            <p style={{ fontSize: 13, color: "var(--tx-3)", marginTop: 16 }}>
              Загрузка постов...
            </p>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loadingPosts && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(193,18,31,0.08)",
              border: "0.5px solid var(--neg)",
              borderRadius: 9,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, color: "var(--neg)" }}>⚠ {error}</p>
          </div>
        )}

        {/* Posts grid */}
        {!loadingPosts && filteredPosts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )}

        {/* Empty state - connected but no posts */}
        {!loadingPosts &&
          hasConnected &&
          filteredPosts.length === 0 &&
          !error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--tx-1)",
                  marginBottom: 6,
                }}
              >
                Нет опубликованных постов
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--tx-3)",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Здесь будут посты опубликованные через PostCentro.
                <br />
                Нажмите «✏️ Создать пост» чтобы написать и опубликовать первый.
              </p>
              <button
                onClick={() => setShowCreatePost(true)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 9,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✏️ Создать первый пост
              </button>
            </div>
          )}
      </div>}
      {activeTab === "content" && selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
      {showCreatePost && (
        <CreatePostModal
          projectId={projectId}
          projects={projects}
          integrations={integrations}
          onClose={() => setShowCreatePost(false)}
          onPublished={() => {
            setShowCreatePost(false);
            loadPosts();
          }}
        />
      )}
      {showAnalysis && (
        <AnalysisModal
          posts={posts}
          project={activeProject}
          onClose={() => setShowAnalysis(false)}
          onPlanCreated={(plan) => {
            setContentPlan(plan);
            setShowAnalysis(false);
          }}
        />
      )}
    </div>
  );
}

export default function CreateContentPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--tx-3)",
            fontSize: 12,
          }}
        >
          ...
        </div>
      }
    >
      <CreateContentPageInner />
    </Suspense>
  );
}
