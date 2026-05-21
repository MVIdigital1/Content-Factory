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
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setScheduleSuccess(true);
      setShowSchedule(false);
    },
  });

  const handleGenerate = async () => {
    if (!form.projectId || !form.topic || !form.goal) {
      setError(t("form.fillAll"));
      return;
    }
    setError("");
    setGenerating(true);
    setStep(2);
    setProgress(0);

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
        body: JSON.stringify({ ...form, imageUrl }),
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
    <div className="p-4 md:p-6 max-w-2xl w-full">
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
            <select
              value={form.projectId}
              onChange={(e) =>
                setForm((p) => ({ ...p, projectId: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">{t("form.projectDefault")}</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {t("form.platform")}
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setForm((f) => ({ ...f, platform: p.value }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.platform === p.value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
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
            <select
              value={form.goal}
              onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
              className={inputClass}
            >
              <option value="">{t("form.goalDefault")}</option>
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
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
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xs"
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
                <div className="text-xl mb-1">🖼️</div>
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
            className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("form.generateBtn")}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">⚡</div>
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
          {imagePreview && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <img
                src={imagePreview}
                alt="Post image"
                className="w-full max-h-48 object-cover"
              />
            </div>
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t("result.hook")}
            </p>
            <p className="text-sm text-gray-700">{result.hook}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t("result.caption")}
              </p>
              <button
                onClick={copyCaption}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${copied ? "border-[#1D9E75] bg-[#E1F5EE] text-[#1D9E75]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t("result.cta")}
            </p>
            <p className="text-sm text-gray-700">{result.cta}</p>
          </div>

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

          {scheduleSuccess && (
            <div className="bg-[#E1F5EE] border border-[#1D9E75] border-opacity-30 rounded-xl px-4 py-3 text-sm text-[#1D9E75] font-medium">
              {t("result.scheduleSuccess")}
            </div>
          )}

          {showSchedule && (
            <div className="bg-white rounded-xl border border-[#1D9E75] border-opacity-30 p-5 space-y-3">
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
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white"
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
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => scheduleMutation.mutate()}
                  disabled={!scheduleDate || scheduleMutation.isPending}
                  className="flex-1 py-2.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {scheduleMutation.isPending
                    ? t("result.scheduleSaving")
                    : t("result.scheduleBtn")}
                </button>
                <button
                  onClick={() => setShowSchedule(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("result.scheduleCancel")}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep(1);
                setResult(null);
                setShowSchedule(false);
                setScheduleSuccess(false);
                setImageFile(null);
                setImagePreview(null);
                setForm((p) => ({ ...p, topic: "" }));
              }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t("result.createMore")}
            </button>
            {!scheduleSuccess && (
              <button
                onClick={() => setShowSchedule((v) => !v)}
                className="flex-1 py-2.5 border border-[#1D9E75] text-[#1D9E75] text-sm font-semibold rounded-lg hover:bg-[#E1F5EE] transition-colors"
              >
                {t("result.schedulePost")}
              </button>
            )}
            <button
              onClick={() => router.push(`/${locale}/history`)}
              className="flex-1 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors"
            >
              {t("result.history")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
