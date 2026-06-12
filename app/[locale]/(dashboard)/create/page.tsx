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

// ── Main page ──────────────────────────────────────────────────────────────
function CreateContentPageInner() {
  const supabase = createClient();
  const locale = useLocale();

  const [platform, setPlatform] = useState<Platform>("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
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

    // Telegram posts via our API
    for (const ch of tgChannels) {
      try {
        const res = await fetch(
          `/api/telegram/posts?channelId=${ch.channel_id}&limit=20`,
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: Post[] = (data.messages ?? []).map((m: any) => ({
            id: `tg_${m.id}`,
            platform: "telegram" as const,
            text: m.text ?? m.caption ?? "",
            image_url: m.photo_url,
            date: new Date(m.date * 1000).toISOString(),
            views: m.views ?? 0,
            shares: m.forwards ?? 0,
            reactions: m.reactions ?? {},
            url: `https://t.me/${ch.channel_name}/${m.id}`,
          }));
          allPosts.push(...mapped);
        }
      } catch {}
    }

    // Instagram posts via our API
    for (const ig of igChannels) {
      try {
        const res = await fetch(
          `/api/instagram/posts?accountId=${ig.channel_id}&limit=20`,
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: Post[] = (data.data ?? []).map((m: any) => ({
            id: `ig_${m.id}`,
            platform: "instagram" as const,
            text: m.caption ?? "",
            image_url: m.media_url ?? m.thumbnail_url,
            date: m.timestamp,
            likes: m.like_count ?? 0,
            comments: m.comments_count ?? 0,
            views: m.video_view_count ?? undefined,
            saves: m.saved_count ?? undefined,
            reach: m.reach ?? undefined,
            type: m.media_type?.toLowerCase(),
            url: m.permalink,
          }));
          allPosts.push(...mapped);
        }
      } catch {}
    }

    // Sort by date
    allPosts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    if (
      allPosts.length === 0 &&
      (tgChannels.length > 0 || igChannels.length > 0)
    ) {
      setError("Не удалось загрузить посты. Проверьте подключение платформ.");
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
        <p style={{ fontSize: 11, color: "var(--tx-3)" }}>
          Маркетинг /{" "}
          <span style={{ color: "var(--tx-2)", fontWeight: 500 }}>
            Создать контент
          </span>
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
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
                Нет постов
              </p>
              <p style={{ fontSize: 12, color: "var(--tx-3)" }}>
                Посты появятся после публикации в подключённых каналах
              </p>
            </div>
          )}
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
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
