"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

type GeneratedContent = {
  title: string;
  idea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  script: { scene: number; text: string; duration: string }[];
  voiceover: string;
  screen_text: string;
  source_image_url?: string;
  id?: string;
};
type Integration = {
  id: string;
  platform: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
};

const PLATFORMS = [
  { value: "telegram", label: "Telegram", color: "#0088CC", abbr: "TG" },
  { value: "instagram", label: "Instagram", color: "#E1306C", abbr: "IG" },
  { value: "tiktok", label: "TikTok", color: "#000", abbr: "TT" },
  { value: "vk", label: "VK", color: "#0077FF", abbr: "VK" },
];
const CONTENT_TYPES = [
  { value: "post", label: "Пост" },
  { value: "stories", label: "Сторис" },
  { value: "video", label: "Reels" },
  { value: "ad", label: "Реклама" },
];
const CONTENT_GOALS = [
  "Продажи",
  "Вовлечённость",
  "Охват",
  "Лайфхак",
  "UGC-стиль",
  "Анонс",
];
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot";

function IntegrationsTab() {
  const supabase = createClient();
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelInput, setChannelInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { data: integrations = [], refetch } = useQuery<Integration[]>({
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
  const connectInstagram = () => {
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ?? "";
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "instagram_business_basic,instagram_business_content_publish",
      response_type: "code",
    });
    window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
  };
  const connectTelegram = async () => {
    if (!channelInput.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/telegram/add-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUsername: channelInput.replace("@", ""),
        }),
      });
      if (res.ok) {
        setChannelInput("");
        setAddingChannel(false);
        refetch();
      }
    } finally {
      setConnecting(false);
    }
  };
  const tgChannels = integrations.filter((i) => i.platform === "telegram");
  const igChannels = integrations.filter((i) => i.platform === "instagram");
  const card = (
    title: string,
    color: string,
    abbr: string,
    desc: string,
    body: React.ReactNode,
  ) => (
    <div
      style={{
        background: "var(--bg-card)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "0.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {abbr}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {desc}
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>{body}</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>
          Подключённые платформы
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Подключи каналы и аккаунты для публикации
        </div>
      </div>
      {card(
        "Telegram",
        "#0088CC",
        "TG",
        "Каналы и группы",
        <div>
          {tgChannels.map((ch) => (
            <div
              key={ch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 11px",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--success)",
                }}
              />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>
                @{ch.channel_name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "var(--success-bg)",
                  color: "var(--success-text)",
                  padding: "2px 7px",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                Активен
              </span>
            </div>
          ))}
          {addingChannel ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@channel_name"
                onKeyDown={(e) => e.key === "Enter" && connectTelegram()}
                style={{
                  flex: 1,
                  padding: "8px 11px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  border: "0.5px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <button
                onClick={connectTelegram}
                disabled={connecting}
                style={{
                  padding: "8px 14px",
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {connecting ? "..." : "Добавить"}
              </button>
              <button
                onClick={() => setAddingChannel(false)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                Добавь бота{" "}
                <strong style={{ color: "var(--primary)" }}>
                  @{BOT_USERNAME}
                </strong>{" "}
                как администратора, затем введи username канала
              </div>
              <button
                onClick={() => setAddingChannel(true)}
                style={{
                  padding: "7px 14px",
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  border: "none",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                + Добавить канал
              </button>
            </div>
          )}
        </div>,
      )}
      {card(
        "Instagram",
        "#E1306C",
        "IG",
        "Business или Creator аккаунт",
        <div>
          {igChannels.map((ch) => (
            <div
              key={ch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 11px",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--success)",
                }}
              />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>
                @{ch.channel_name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "var(--success-bg)",
                  color: "var(--success-text)",
                  padding: "2px 7px",
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                Активен
              </span>
            </div>
          ))}
          <button
            onClick={connectInstagram}
            style={{
              padding: "7px 14px",
              background: "#E1306C",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Подключить Instagram
          </button>
        </div>,
      )}
      {card(
        "TikTok",
        "#000",
        "TT",
        "Business аккаунт",
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Скоро
          </span>
          <span
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-muted)",
              padding: "2px 7px",
              borderRadius: 10,
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            Q3 2026
          </span>
        </div>,
      )}
      {card(
        "ВКонтакте",
        "#0077FF",
        "VK",
        "Группа или сообщество",
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Скоро
          </span>
          <span
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-muted)",
              padding: "2px 7px",
              borderRadius: 10,
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            Скоро
          </span>
        </div>,
      )}
    </div>
  );
}

function CreateTab() {
  const supabase = createClient();
  const [platform, setPlatform] = useState("telegram");
  const [contentType, setContentType] = useState("post");
  const [goal, setGoal] = useState(CONTENT_GOALS[0]);
  const [topic, setTopic] = useState("");
  const [projectId, setProjectId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id,name")
        .eq("user_id", user.id)
        .eq("is_active", true);
      return data ?? [];
    },
  });
  useEffect(() => {
    if (projects.length > 0 && !projectId) setProjectId(projects[0].id);
  }, [projects]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const generate = async () => {
    if (!topic.trim() || !projectId) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, platform, contentType, goal, topic }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setGenerating(false);
    }
  };
  const publishNow = async () => {
    if (!result?.id) return;
    setPublishing(true);
    try {
      await fetch("/api/content/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: result.id, platform }),
      });
    } finally {
      setPublishing(false);
    }
  };
  const schedule = async () => {
    if (!result?.id || !scheduleTime) return;
    setScheduling(true);
    try {
      await supabase
        .from("scheduled_posts")
        .insert({
          content_id: result.id,
          platform,
          scheduled_at: new Date(scheduleTime).toISOString(),
          status: "pending",
          retry_count: 0,
        });
      setScheduleTime("");
    } finally {
      setScheduling(false);
    }
  };

  const fi: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 12,
    fontFamily: "inherit",
    border: "0.5px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg)",
    color: "var(--text-primary)",
    outline: "none",
  };

  return (
    <div
      style={{ display: "flex", gap: 24, height: "100%", overflow: "hidden" }}
    >
      {/* Left */}
      <div
        style={{
          width: 290,
          flexShrink: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 5,
            }}
          >
            Проект
          </label>
          <select
            style={fi}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Выберите проект</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 7,
            }}
          >
            Платформа
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 11px",
                  border: `0.5px solid ${platform === p.value ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background:
                    platform === p.value ? "var(--bg-tertiary)" : "var(--bg)",
                  fontSize: 11,
                  fontWeight: platform === p.value ? 500 : 400,
                  color: "var(--text-primary)",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 14,
                    borderRadius: 3,
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 7,
                    fontWeight: 700,
                  }}
                >
                  {p.abbr}
                </div>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 5,
            }}
          >
            Тип
          </label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setContentType(t.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  background:
                    contentType === t.value
                      ? "var(--primary)"
                      : "var(--bg-tertiary)",
                  color:
                    contentType === t.value
                      ? "var(--on-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 5,
            }}
          >
            Цель
          </label>
          <select
            style={fi}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            {CONTENT_GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 5,
            }}
          >
            Тема *
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="О чём должен быть пост..."
            style={{ ...fi, height: 80, resize: "none" }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 5,
            }}
          >
            Фото (необязательно)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            style={{ display: "none" }}
          />
          {imagePreview ? (
            <div style={{ position: "relative" }}>
              <img
                src={imagePreview}
                alt=""
                style={{
                  width: "100%",
                  height: 110,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100%",
                padding: "18px",
                border: "1.5px dashed var(--border-strong)",
                borderRadius: 8,
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 18 }}>📸</span>Загрузить
            </button>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating || !topic.trim()}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: 9,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            cursor: generating || !topic.trim() ? "not-allowed" : "pointer",
            background:
              generating || !topic.trim()
                ? "var(--bg-tertiary)"
                : "var(--primary)",
            color:
              generating || !topic.trim()
                ? "var(--text-muted)"
                : "var(--on-primary)",
          }}
        >
          {generating ? "⟳ Генерирую..." : "✦ Сгенерировать"}
        </button>
      </div>

      {/* Right */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!result && !generating && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontSize: 48 }}>✦</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Готов создать контент
            </div>
            <div
              style={{
                fontSize: 12,
                textAlign: "center",
                maxWidth: 320,
                lineHeight: 1.6,
                color: "var(--text-secondary)",
              }}
            >
              Выберите платформу, введите тему и нажмите «Сгенерировать»
            </div>
          </div>
        )}
        {generating && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 36 }}>✦</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              AI создаёт контент...
            </div>
          </div>
        )}
        {result && !generating && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Готово ✓</div>
              <button
                onClick={generate}
                style={{
                  padding: "5px 12px",
                  border: "0.5px solid var(--border)",
                  borderRadius: 7,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ↻ Ещё вариант
              </button>
            </div>
            {result.title && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 9,
                  padding: 13,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: 5,
                  }}
                >
                  Заголовок
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {result.title}
                </div>
              </div>
            )}
            {result.hook && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 9,
                  padding: 13,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: 5,
                  }}
                >
                  Хук
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  {result.hook}
                </div>
              </div>
            )}
            {result.caption && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 9,
                  padding: 13,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: 5,
                  }}
                >
                  Текст поста
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {result.caption}
                </div>
                {result.hashtags?.length > 0 && (
                  <div
                    style={{
                      marginTop: 9,
                      fontSize: 11,
                      color: "var(--info-text)",
                    }}
                  >
                    {result.hashtags.join(" ")}
                  </div>
                )}
                {result.cta && (
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--primary)",
                    }}
                  >
                    {result.cta}
                  </div>
                )}
              </div>
            )}
            {result.script?.length > 0 && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 9,
                  padding: 13,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Сценарий
                </div>
                {result.script.map((s) => (
                  <div
                    key={s.scene}
                    style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: 8,
                      paddingBottom: 8,
                      borderBottom: "0.5px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        color: "var(--on-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {s.scene}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        {s.text}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        ⏱ {s.duration}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 9,
                padding: 13,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 10 }}>
                Публикация
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button
                  onClick={publishNow}
                  disabled={publishing || !result.id}
                  style={{
                    padding: "10px",
                    border: "none",
                    borderRadius: 8,
                    background: !result.id
                      ? "var(--bg-tertiary)"
                      : "var(--primary)",
                    color: !result.id
                      ? "var(--text-muted)"
                      : "var(--on-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: !result.id ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🚀 Опубликовать сейчас
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "9px 9px",
                      fontSize: 11,
                      fontFamily: "inherit",
                      border: "0.5px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--bg)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={schedule}
                    disabled={scheduling || !scheduleTime || !result.id}
                    style={{
                      padding: "9px 13px",
                      border: "0.5px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      cursor: !scheduleTime ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    📅
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentPageInner() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab =
    (searchParams.get("tab") as "create" | "integrations") ?? "create";
  const setTab = (t: string) =>
    router.push(`/${locale}/content?tab=${t}`, { scroll: false });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 20px",
          borderBottom: "0.5px solid var(--border)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href={`/${locale}/ads`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "5px 10px",
              borderRadius: 7,
              border: "0.5px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            ← Назад
          </Link>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Создать контент</div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                marginTop: 1,
              }}
            >
              Генерация постов и публикация в соцсети
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--bg-tertiary)",
            borderRadius: 9,
            padding: 3,
          }}
        >
          {[
            { key: "create", label: "✦ Создать" },
            { key: "integrations", label: "🔌 Интеграции" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 16px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 500,
                background: tab === t.key ? "var(--bg-card)" : "transparent",
                color:
                  tab === t.key
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                boxShadow:
                  tab === t.key ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {tab === "create" && <CreateTab />}
        {tab === "integrations" && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            <IntegrationsTab />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
          }}
        >
          ...
        </div>
      }
    >
      <ContentPageInner />
    </Suspense>
  );
}
