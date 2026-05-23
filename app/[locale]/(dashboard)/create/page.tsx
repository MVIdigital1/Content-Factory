"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { useTranslations, useLocale } from "next-intl";

const PLATFORMS = [
  { value: "telegram", label: "Telegram" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "vk", label: "VK" },
];

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
  id?: string;
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-left flex items-center justify-between bg-white hover:border-[#1D9E75] focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder || "Выберите..."}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform flex-shrink-0 text-gray-400 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-sm text-left text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                {placeholder}
              </button>
            )}
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer ${value === o.value ? "bg-[#E1F5EE] text-[#1D9E75] font-medium" : "text-gray-700 hover:bg-[#E1F5EE] hover:text-[#1D9E75]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Post preview component
function PostPreview({
  platform,
  result,
  imagePreview,
}: {
  platform: string;
  result: GeneratedContent;
  imagePreview: string | null;
}) {
  const text = `${result.caption}\n\n${result.hashtags?.join(" ")}`.trim();

  if (platform === "telegram") {
    return (
      <div className="bg-[#E6EBF0] rounded-xl p-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Предпросмотр — Telegram
        </p>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
          <div className="bg-[#2AABEE] px-3 py-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-white">Ваш канал</span>
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Post"
              className="w-full max-h-48 object-cover"
            />
          )}
          <div className="p-3">
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-400">Сейчас</span>
              <div className="flex items-center gap-1">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="text-[10px] text-gray-400">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Предпросмотр — Instagram
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden max-w-sm mx-auto">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-700">
                ВК
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              your_account
            </span>
          </div>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Post"
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D1D5DB"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <div className="px-3 py-2">
            <div className="flex gap-3 mb-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-800 line-clamp-3 leading-relaxed">
              <span className="font-semibold">your_account</span>{" "}
              {result.caption}
            </p>
            <p className="text-xs text-[#3897f0] mt-1">
              {result.hashtags?.join(" ")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "vk") {
    return (
      <div className="bg-[#EDEEF0] rounded-xl p-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Предпросмотр — VK
        </p>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
              VK
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">
                Ваше сообщество
              </p>
              <p className="text-[10px] text-gray-400">Сейчас</p>
            </div>
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Post"
              className="w-full max-h-48 object-cover"
            />
          )}
          <div className="px-4 py-3">
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {result.caption}
            </p>
            <p className="text-xs text-[#4986CC] mt-1">
              {result.hashtags?.join(" ")}
            </p>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              <button className="flex items-center gap-1 text-[10px] text-gray-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                Нравится
              </button>
              <button className="flex items-center gap-1 text-[10px] text-gray-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Комментировать
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "tiktok") {
    return (
      <div className="bg-black rounded-xl p-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Предпросмотр — TikTok
        </p>
        <div
          className="relative max-w-[200px] mx-auto bg-gray-900 rounded-xl overflow-hidden"
          style={{ aspectRatio: "9/16" }}
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Post"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4D4D4D"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-[10px] text-white font-semibold mb-1">
              @your_account
            </p>
            <p className="text-[9px] text-white/80 line-clamp-2 leading-relaxed">
              {result.caption}
            </p>
            <p className="text-[9px] text-white/60 mt-1">
              {result.hashtags?.slice(0, 3).join(" ")}
            </p>
          </div>
          <div className="absolute right-2 bottom-16 flex flex-col gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="white"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-[8px] text-white">0</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[8px] text-white">0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("create");
  const locale = useLocale();

  const CONTENT_TYPES = [
    { value: "post", label: "Пост" },
    { value: "video", label: "Видео" },
    { value: "stories", label: "Stories" },
    {
      value: "ad",
      label:
        t("form.fillAll") === "Заполните все поля"
          ? "Реклама"
          : locale === "uz"
            ? "Reklama"
            : "Ad",
    },
  ];

  const GOALS = [
    { value: t("goals.sales"), label: t("goals.sales") },
    { value: t("goals.awareness"), label: t("goals.awareness") },
    { value: t("goals.engagement"), label: t("goals.engagement") },
    { value: t("goals.traffic"), label: t("goals.traffic") },
    { value: t("goals.promo"), label: t("goals.promo") },
  ];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    projectId: "",
    platform: "telegram",
    contentType: "post",
    goal: "",
    topic: "",
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [showChannelSidebar, setShowChannelSidebar] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [channelForSchedule, setChannelForSchedule] = useState<string>("");
  const [publishError, setPublishError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data as Project[];
    },
  });

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("platform", "telegram")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: allChannels } = useQuery({
    queryKey: ["channels", form.platform],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("platform", form.platform)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!form.platform,
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("content-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("content-images")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!result?.id || !scheduleDate) throw new Error("Выберите дату");
      const scheduledAt = new Date(
        `${scheduleDate}T${scheduleTime}`,
      ).toISOString();
      const { error } = await supabase.from("scheduled_posts").insert({
        content_id: result.id,
        platform: form.platform,
        scheduled_at: scheduledAt,
        status: "pending",
        channel_id: channelForSchedule || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setScheduleSuccess(true);
      setShowSchedule(false);
    },
  });

  // Publish now — direct Telegram publish
  const handlePublishNow = async () => {
    if (!result?.id) return;
    setPublishing(true);
    setPublishError("");
    try {
      const res = await fetch("/api/content/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: result.id, platform: form.platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка публикации");
      setPublishSuccess(true);
    } catch (e: any) {
      setPublishError(e.message);
    }
    setPublishing(false);
  };

  const handleGenerate = async () => {
    if (!form.projectId || !form.topic || !form.goal) {
      setError(t("form.fillAll"));
      return;
    }
    setError("");
    setGenerating(true);
    setStep(2);
    setProgress(0);
    setPublishSuccess(false);
    setPublishError("");

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 10;
      });
    }, 400);

    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile);
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageUrl,
          channelId: selectedChannelId,
        }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (!res.ok) throw new Error(data.error || "Ошибка генерации");
      setProgress(100);
      setTimeout(() => {
        setResult({ ...data.content, id: data.content.id });
        setStep(3);
        setGenerating(false);
      }, 500);
    } catch (e: any) {
      clearInterval(interval);
      setError(e.message || "Ошибка генерации");
      setGenerating(false);
      setStep(1);
    }
  };

  const copyCaption = () => {
    if (!result) return;
    navigator.clipboard.writeText(
      `${result.caption}\n\n${result.hashtags.join(" ")}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="flex gap-0 min-h-screen">
      <div className="p-4 md:p-6 max-w-2xl w-full flex-1">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= s ? "bg-[#1D9E75] text-white" : "bg-gray-100 text-gray-400"}`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-px ${step > s ? "bg-[#1D9E75]" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
          <div className="ml-2 text-xs text-gray-400">
            {step === 1
              ? t("steps.settings")
              : step === 2
                ? t("steps.generating")
                : t("steps.result")}
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.project")}
              </label>
              <CustomSelect
                value={form.projectId}
                onChange={(v) => setForm((p) => ({ ...p, projectId: v }))}
                options={(projects || []).map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder={t("form.projectDefault")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.platform")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setForm((f) => ({ ...f, platform: p.value }));
                      setSelectedChannelId("");
                      setShowChannelSidebar(true);
                    }}
                    className={`py-2 rounded-lg border text-sm font-medium transition-colors ${form.platform === p.value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.contentType")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() =>
                      setForm((f) => ({ ...f, contentType: ct.value }))
                    }
                    className={`py-2 rounded-lg border text-xs font-medium transition-colors ${form.contentType === ct.value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.goal")}
              </label>
              <CustomSelect
                value={form.goal}
                onChange={(v) => setForm((p) => ({ ...p, goal: v }))}
                options={GOALS}
                placeholder={t("form.goalDefault")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.topic")}
              </label>
              <textarea
                value={form.topic}
                onChange={(e) =>
                  setForm((p) => ({ ...p, topic: e.target.value }))
                }
                placeholder={t("form.topicPlaceholder")}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t("form.image")}{" "}
                <span className="text-gray-400 font-normal">
                  {t("form.imageOptional")}
                </span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                    {imageFile?.name}
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileSelect(f);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-gray-200 hover:border-[#1D9E75] hover:bg-gray-50"}`}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-xs text-gray-500 font-medium">
                    {t("form.imageHint")}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("form.imageFormats")}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleFileSelect(e.target.files[0])
                    }
                  />
                </div>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!form.projectId || !form.topic || !form.goal}
              className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t("form.generateBtn")}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-[#E1F5EE] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1D9E75"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {t("generating.title")}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t("generating.subtitle")}
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-[#1D9E75] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && result && (
          <div className="space-y-4">
            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview((v) => !v)}
              className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${showPreview ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {showPreview
                ? "Скрыть предпросмотр"
                : `Предпросмотр в ${PLATFORMS.find((p) => p.value === form.platform)?.label}`}
            </button>

            {/* Post preview */}
            {showPreview && (
              <PostPreview
                platform={form.platform}
                result={result}
                imagePreview={imagePreview}
              />
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {result.title}
                  </h3>
                  <p className="text-sm text-gray-500">{result.idea}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-[#E1F5EE] text-[#1D9E75] rounded-full font-medium flex-shrink-0">
                  {t("result.generated")}
                </span>
              </div>
            </div>

            {result.hook && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t("result.hook")}
                </p>
                <p className="text-sm text-gray-700">{result.hook}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {t("result.caption")}
                </p>
                <button
                  onClick={copyCaption}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${copied ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  {copied ? t("result.copied") : t("result.copy")}
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {result.caption}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.hashtags?.map((h) => (
                  <span
                    key={h}
                    className="text-xs text-[#1D9E75] bg-[#E1F5EE] px-2 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {result.cta && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t("result.cta")}
                </p>
                <p className="text-sm text-gray-700">{result.cta}</p>
              </div>
            )}

            {result.script && result.script.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {t("result.script")}
                </p>
                <div className="space-y-2">
                  {result.script.map((s) => (
                    <div key={s.scene} className="flex gap-3">
                      <span className="text-xs font-bold text-[#1D9E75] bg-[#E1F5EE] px-2 py-0.5 rounded flex-shrink-0 h-fit">
                        {s.scene}
                      </span>
                      <div>
                        <p className="text-sm text-gray-700">{s.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publish now success/error */}
            {publishSuccess && (
              <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
                ✓ Пост опубликован в{" "}
                {PLATFORMS.find((p) => p.value === form.platform)?.label}!
              </div>
            )}
            {publishError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {publishError}
              </div>
            )}

            {scheduleSuccess && (
              <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
                {t("result.scheduleSuccess")}
              </div>
            )}

            {showSchedule && (
              <div className="bg-white rounded-xl border border-[#1D9E75]/30 p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  {t("result.scheduleTitle")}
                </h4>
                {integrations && integrations.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    {t("result.noChannels")}{" "}
                    <a
                      href={`/${locale}/integrations`}
                      className="font-semibold underline"
                    >
                      {t("result.connectTelegram")}
                    </a>
                  </div>
                )}
                {/* Channel selector */}
                {allChannels && allChannels.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Канал для публикации
                    </label>
                    <div className="space-y-1.5">
                      {allChannels.map((ch: any) => (
                        <div
                          key={ch.id}
                          onClick={() => setChannelForSchedule(ch.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${channelForSchedule === ch.id ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2AABEE"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold truncate ${channelForSchedule === ch.id ? "text-[#1D9E75]" : "text-gray-900"}`}
                            >
                              {ch.channel_name || ch.channel_id}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {ch.channel_id}
                            </p>
                          </div>
                          {channelForSchedule === ch.id && (
                            <span className="text-[#1D9E75] text-sm">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {t("result.scheduleDate")}
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {t("result.scheduleTime")}
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => scheduleMutation.mutate()}
                    disabled={!scheduleDate || scheduleMutation.isPending}
                    className="flex-1 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {scheduleMutation.isPending
                      ? t("result.scheduleSaving")
                      : t("result.scheduleBtn")}
                  </button>
                  <button
                    onClick={() => setShowSchedule(false)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {t("result.scheduleCancel")}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setStep(1);
                  setResult(null);
                  setShowSchedule(false);
                  setScheduleSuccess(false);
                  setPublishSuccess(false);
                  setPublishError("");
                  setImageFile(null);
                  setImagePreview(null);
                  setShowPreview(false);
                  setForm((p) => ({ ...p, topic: "" }));
                }}
                className="py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t("result.createMore")}
              </button>
              {!publishSuccess && !scheduleSuccess && (
                <button
                  onClick={handlePublishNow}
                  disabled={publishing}
                  className="py-2.5 bg-[#2AABEE] hover:bg-[#1a95d5] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                  {publishing ? "Публикуем..." : "Опубликовать сейчас"}
                </button>
              )}
              {!scheduleSuccess && (
                <button
                  onClick={() => setShowSchedule((v) => !v)}
                  className="py-2.5 border border-[#1D9E75] text-[#1D9E75] text-sm font-semibold rounded-lg hover:bg-[#E1F5EE] transition-colors cursor-pointer"
                >
                  {t("result.schedulePost")}
                </button>
              )}
              <button
                onClick={() => router.push(`/${locale}/history`)}
                className="py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer"
              >
                {t("result.history")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel Sidebar */}
      {showChannelSidebar && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden h-screen sticky top-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {PLATFORMS.find((p) => p.value === form.platform)?.label} каналы
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Выберите канал для публикации
              </p>
            </div>
            <button
              onClick={() => setShowChannelSidebar(false)}
              className="text-gray-300 hover:text-gray-500 cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!allChannels || allChannels.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D1D5DB"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-3"
                >
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
                <p className="text-xs font-medium text-gray-700 mb-1">
                  Нет подключённых каналов
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Подключите канал чтобы публиковать посты
                </p>
                <a
                  href={`/${locale}/integrations`}
                  className="text-xs text-[#1D9E75] font-semibold hover:underline cursor-pointer"
                >
                  Подключить →
                </a>
              </div>
            ) : (
              allChannels.map((ch: any) => (
                <div
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannelId(ch.id);
                    setShowChannelSidebar(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedChannelId === ch.id ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2AABEE"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${selectedChannelId === ch.id ? "text-[#1D9E75]" : "text-gray-900"}`}
                    >
                      {ch.channel_name || ch.channel_id}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {ch.channel_id}
                    </p>
                  </div>
                  {selectedChannelId === ch.id && (
                    <span className="text-[#1D9E75] text-sm flex-shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          {selectedChannelId && (
            <div className="p-3 border-t border-gray-100">
              <div className="bg-[#E1F5EE] rounded-lg px-3 py-2">
                <p className="text-xs text-[#1D9E75] font-medium">
                  ✓{" "}
                  {allChannels?.find((c: any) => c.id === selectedChannelId)
                    ?.channel_name || ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
