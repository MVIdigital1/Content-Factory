"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { useTranslations, useLocale } from "next-intl";
import PostTemplates from "@/components/features/PostTemplates";
import { Rocket, CalendarClock } from "lucide-react";

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
  source_image_url?: string;
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
        className="w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm text-left flex items-center justify-between bg-panel hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-tx-1" : "text-tx-3"}>
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
          className={`transition-transform flex-shrink-0 text-tx-3 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-panel border border-line-strong rounded-lg shadow-lg overflow-hidden">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-sm text-left text-tx-3 hover:bg-hover cursor-pointer"
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
                className={`w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer ${value === o.value ? "bg-accent-dim text-accent font-medium" : "text-tx-1 hover:bg-accent-dim hover:text-accent"}`}
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
        <p className="text-[10px] font-semibold text-tx-3 uppercase tracking-wide mb-3">
          Предпросмотр — Telegram
        </p>
        <div className="bg-panel rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
          <div className="bg-[#2AABEE] px-3 py-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-panel/20 flex items-center justify-center">
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
            <span className="text-xs font-medium text-on-accent">
              Ваш канал
            </span>
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
              <span className="text-[10px] text-tx-3">Сейчас</span>
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
                <span className="text-[10px] text-tx-3">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="bg-panel rounded-xl p-4 border border-line">
        <p className="text-[10px] font-semibold text-tx-3 uppercase tracking-wide mb-3">
          Предпросмотр — Instagram
        </p>
        <div className="border border-line-strong rounded-xl overflow-hidden max-w-sm mx-auto">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-panel flex items-center justify-center text-[10px] font-bold text-tx-1">
                ВК
              </div>
            </div>
            <span className="text-xs font-semibold text-tx-1">
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
            <div className="w-full aspect-square bg-chip flex items-center justify-center">
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
        <p className="text-[10px] font-semibold text-tx-3 uppercase tracking-wide mb-3">
          Предпросмотр — VK
        </p>
        <div className="bg-panel rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-line">
            <div className="w-8 h-8 rounded-full bg-chip0 flex items-center justify-center text-on-accent text-xs font-bold">
              VK
            </div>
            <div>
              <p className="text-xs font-semibold text-tx-1">Ваше сообщество</p>
              <p className="text-[10px] text-tx-3">Сейчас</p>
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
            <div className="flex gap-4 mt-3 pt-3 border-t border-line">
              <button className="flex items-center gap-1 text-[10px] text-tx-3">
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
              <button className="flex items-center gap-1 text-[10px] text-tx-3">
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
        <p className="text-[10px] font-semibold text-tx-3 uppercase tracking-wide mb-3">
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
            <p className="text-[10px] text-on-accent font-semibold mb-1">
              @your_account
            </p>
            <p className="text-[9px] text-on-accent/80 line-clamp-2 leading-relaxed">
              {result.caption}
            </p>
            <p className="text-[9px] text-on-accent/60 mt-1">
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
              <span className="text-[8px] text-on-accent">0</span>
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
              <span className="text-[8px] text-on-accent">0</span>
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
    campaignId: "",
    platform: "telegram",
    contentType: "post",
    goal: "",
    topic: "",
  });
  const [generating, setGenerating] = useState(false);
  const [threeVariants, setThreeVariants] = useState(false);
  const [variants, setVariants] = useState<
    (GeneratedContent & { toneLabel: string })[]
  >([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [regenField, setRegenField] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<
    "caption" | "hook" | "cta" | null
  >(null);
  const [inlineValue, setInlineValue] = useState("");
  const [useStreaming, setUseStreaming] = useState(true);
  const [scheduleLeftover, setScheduleLeftover] = useState(false);
  const [leftoverDates, setLeftoverDates] = useState<Record<number, string>>(
    {},
  );
  const [schedulingLeftover, setSchedulingLeftover] = useState(false);
  const [leftoverScheduled, setLeftoverScheduled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [showChannelSidebar, setShowChannelSidebar] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [channelForSchedule, setChannelForSchedule] = useState<string>("");
  const [publishError, setPublishError] = useState("");
  const [accountActions, setAccountActions] = useState<Record<string, any>>({});
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Plan modal state
  const [planModal, setPlanModal] = useState<{
    open: boolean;
    channelId: string;
    channelName: string;
  }>({ open: false, channelId: "", channelName: "" });
  const [planConfig, setPlanConfig] = useState({
    dateFrom: today,
    dateTo: nextWeek,
    frequency: 1,
    times: ["12:00"],
    topicMode: "auto" as "auto" | "manual",
    topics: [""],
  });
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planProgress, setPlanProgress] = useState(0);
  const [planDone, setPlanDone] = useState(false);

  const handleApplyActions = async () => {
    if (!result?.id) return;
    setPublishing(true);
    setPublishError("");
    let anyPublished = false;
    let anyScheduled = false;

    for (const ch of allChannels || []) {
      const act = accountActions[ch.id];
      if (!act || act.action === "none") continue;

      if (act.action === "now") {
        try {
          const applyEndpoint =
            (ch.platform || "telegram") === "instagram"
              ? "/api/content/publish-instagram"
              : "/api/content/publish-now";
          const res = await fetch(applyEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentId: result.id,
              platform: ch.platform || "telegram",
              channelId: ch.id,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          anyPublished = true;
        } catch (e: any) {
          setPublishError(e.message);
        }
      } else if (act.action === "schedule") {
        const slots =
          act.slots.length > 0
            ? act.slots
            : [{ date: act.date, time: act.time }];
        for (const slot of slots) {
          try {
            const scheduledAt = new Date(
              slot.date + "T" + slot.time,
            ).toISOString();
            const { error } = await supabase.from("scheduled_posts").insert({
              content_id: result.id,
              platform: ch.platform || "telegram",
              scheduled_at: scheduledAt,
              status: "pending",
              channel_id: ch.id,
            });
            if (error) throw error;
            anyScheduled = true;
          } catch (e: any) {
            setPublishError(e.message);
          }
        }
      }
    }

    if (anyPublished) setPublishSuccess(true);
    if (anyScheduled) setScheduleSuccess(true);
    setPublishing(false);
  };

  const [showPreview, setShowPreview] = useState(false);

  // Generate date slots between two dates with given times
  const buildPlanSlots = (
    dateFrom: string,
    dateTo: string,
    times: string[],
  ) => {
    const slots: { date: string; time: string }[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      for (const time of times) {
        slots.push({ date: dateStr, time });
      }
    }
    return slots;
  };

  const handleOpenPlan = (channelId: string, channelName: string) => {
    setPlanConfig({
      dateFrom: today,
      dateTo: nextWeek,
      frequency: 1,
      times: ["12:00"],
      topicMode: "auto",
      topics: [""],
    });
    setPlanDone(false);
    setPlanProgress(0);
    setPlanModal({ open: true, channelId, channelName });
  };

  const handlePlanFrequencyChange = (freq: number) => {
    const defaultTimes = ["09:00", "14:00", "19:00"];
    const times = Array.from(
      { length: freq },
      (_, i) => defaultTimes[i] || "12:00",
    );
    setPlanConfig((p) => ({ ...p, frequency: freq, times }));
  };

  const handleGeneratePlan = async () => {
    if (!form.projectId || !form.topic) return;
    setPlanGenerating(true);
    setPlanProgress(0);
    setPlanDone(false);

    const slots = buildPlanSlots(
      planConfig.dateFrom,
      planConfig.dateTo,
      planConfig.times,
    );
    const project = projects?.find((p) => p.id === form.projectId);
    let done = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const topic =
        planConfig.topicMode === "manual" && planConfig.topics[i]
          ? planConfig.topics[i]
          : form.topic;
      try {
        const res = await fetch("/api/content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: form.projectId,
            platform: form.platform,
            contentType: form.contentType,
            goal: form.goal,
            topic,
            language: (project as any)?.language || "ru",
          }),
        });
        const data = await res.json();
        if (res.ok && data.content?.id) {
          const scheduledAt = new Date(
            slot.date + "T" + slot.time,
          ).toISOString();
          await supabase.from("scheduled_posts").insert({
            content_id: data.content.id,
            platform: form.platform,
            scheduled_at: scheduledAt,
            status: "pending",
            channel_id: planModal.channelId,
          });
        }
      } catch (e) {
        console.error("Plan slot error:", e);
      }
      done++;
      setPlanProgress(Math.round((done / slots.length) * 100));
    }

    setPlanGenerating(false);
    setPlanDone(true);
  };

  // Файлы из хранилища проекта
  const { data: projectFiles = [] } = useQuery({
    queryKey: ["project-files-picker", form.projectId],
    queryFn: async () => {
      if (!form.projectId) return [];
      const { data } = await supabase
        .from("project_files")
        .select("id, name, file_url, file_type")
        .eq("project_id", form.projectId)
        .in("file_type", ["image"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!form.projectId && showStoragePicker,
  });

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

  const { data: campaignsForProject } = useQuery({
    queryKey: ["campaigns-for-project", form.projectId],
    queryFn: async () => {
      if (!form.projectId) return [];
      const { data } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("project_id", form.projectId)
        .order("created_at", { ascending: false });
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!form.projectId,
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
    // SVG не поддерживается Telegram — блокируем
    if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
      console.error("SVG не поддерживается для публикации");
      return null;
    }
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
    const publicUrl = urlData.publicUrl;

    // Автоматически сохранить в хранилище проекта
    if (form.projectId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("project_files").insert({
          project_id: form.projectId,
          user_id: user.id,
          name: file.name,
          file_url: publicUrl,
          file_type: "image",
          size_bytes: file.size,
        });
      }
    }

    return publicUrl;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
      alert("SVG не поддерживается. Используйте PNG, JPG или WEBP.");
      return;
    }
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
      const publishEndpoint =
        form.platform === "instagram"
          ? "/api/content/publish-instagram"
          : "/api/content/publish-now";
      const res = await fetch(publishEndpoint, {
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
    setVariants([]);
    setSelectedVariantIdx(0);
    setPublishSuccess(false);
    setPublishError("");

    // Реальные статусы прогресса
    const STEPS = [
      { msg: "Анализирую проект и бренд...", pct: 15 },
      { msg: "Изучаю прошлые посты...", pct: 30 },
      { msg: "Пишу хук...", pct: 50 },
      { msg: "Создаю текст и хэштеги...", pct: 70 },
      { msg: "Финализирую контент...", pct: 85 },
    ];
    let stepIdx = 0;
    setProgressMsg(STEPS[0].msg);
    setProgress(STEPS[0].pct);

    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1);
      setProgressMsg(STEPS[stepIdx].msg);
      setProgress(STEPS[stepIdx].pct);
    }, 1800);

    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      let endpoint = "/api/content/generate";
      if (threeVariants) endpoint = "/api/content/generate-variants";
      else if (useStreaming) endpoint = "/api/content/generate-stream";

      if (useStreaming && !threeVariants) {
        // Стриминг через SSE
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, imageUrl }),
        });
        clearInterval(interval);
        if (!res.ok) throw new Error("Ошибка генерации");
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("event: status")) continue;
            if (line.startsWith("data: ")) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.message) {
                  setProgressMsg(d.message);
                  setProgress((p) => Math.min(p + 12, 95));
                }
                if (d.content) {
                  setProgress(100);
                  setResult(d.content);
                  setStep(3);
                  setGenerating(false);
                }
                if (d.error) throw new Error(d.error);
              } catch (parseErr) {
                /* skip */
              }
            }
          }
        }
      } else {
        const res = await fetch(endpoint, {
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
        setProgressMsg("Готово!");
        setProgress(100);
        setTimeout(() => {
          if (threeVariants && data.variants) {
            setVariants(
              data.variants.map((v: any) => ({
                ...v.content,
                toneLabel: v.toneLabel,
              })),
            );
            setResult({ ...data.variants[0].content });
          } else {
            setResult({ ...data.content, id: data.content.id });
          }
          setStep(3);
          setGenerating(false);
        }, 500);
      }
    } catch (e: any) {
      clearInterval(interval);
      setError(e?.message || "Ошибка генерации");
      setGenerating(false);
      setStep(1);
    }
  };

  // Частичная регенерация одного поля
  const handleRegenPart = async (
    field: "hook" | "caption" | "hashtags" | "cta",
  ) => {
    if (!result?.id) return;
    setRegenField(field);
    try {
      const res = await fetch("/api/content/regenerate-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: result.id, field }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult((prev) => (prev ? { ...prev, [field]: data.value } : prev));
    } catch (e: any) {
      setError(e.message);
    }
    setRegenField(null);
  };

  // Сохранить inline-редактирование
  const saveInlineEdit = async () => {
    if (!inlineEdit || !result?.id) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      await sb
        .from("contents")
        .update({ [inlineEdit]: inlineValue })
        .eq("id", result.id);
      setResult((prev) =>
        prev ? { ...prev, [inlineEdit!]: inlineValue } : prev,
      );
    } catch (e) {
      /* silent */
    }
    setInlineEdit(null);
  };

  // Запланировать оставшиеся варианты на выбранные даты
  const scheduleLeftoverVariants = async () => {
    if (!variants.length) return;
    setSchedulingLeftover(true);
    const leftovers = variants
      .map((v, i) => ({ ...v, idx: i }))
      .filter((_, i) => i !== selectedVariantIdx);

    for (const v of leftovers) {
      const date = leftoverDates[v.idx];
      if (!date || !v.id) continue;
      await supabase.from("scheduled_posts").insert({
        content_id: v.id,
        platform: form.platform,
        scheduled_at: new Date(date).toISOString(),
        status: "pending",
      });
      await supabase
        .from("contents")
        .update({ status: "scheduled" })
        .eq("id", v.id);
    }
    setSchedulingLeftover(false);
    setLeftoverScheduled(true);
    setScheduleLeftover(false);
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
    "w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-panel";

  return (
    <div className="flex gap-0 min-h-screen">
      <div className="p-4 md:p-6 w-full flex-1 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="ui-label">Создать</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            {t("title")}
          </h1>
          <p className="text-sm text-tx-2 mt-0.5">{t("subtitle")}</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= s ? "bg-accent text-on-accent" : "bg-chip text-tx-3"}`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-px ${step > s ? "bg-accent" : "bg-track"}`}
                />
              )}
            </div>
          ))}
          <div className="ml-2 text-xs text-tx-3">
            {step === 1
              ? t("steps.settings")
              : step === 2
                ? t("steps.generating")
                : t("steps.result")}
          </div>
        </div>

        {/* Calendar link — shown on step 1 */}
        {step === 1 && (
          <div className="flex items-center justify-end mb-4">
            <a
              href={`/${locale}/calendar`}
              className="flex items-center gap-1.5 text-xs text-tx-3 hover:text-accent transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Запланировать в календаре →
            </a>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-panel rounded-xl border border-line-strong p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">
                {t("form.project")}
              </label>
              <CustomSelect
                value={form.projectId}
                onChange={(v) =>
                  setForm((p) => ({ ...p, projectId: v, campaignId: "" }))
                }
                options={(projects || []).map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder={t("form.projectDefault")}
              />
            </div>
            {form.projectId && (
              <div>
                <label className="block text-xs font-medium text-tx-2 mb-1.5">
                  Кампания (необязательно)
                </label>
                <CustomSelect
                  value={form.campaignId}
                  onChange={(v) => setForm((p) => ({ ...p, campaignId: v }))}
                  options={[
                    { value: "", label: "Без кампании" },
                    ...(
                      (campaignsForProject || []) as {
                        id: string;
                        name: string;
                      }[]
                    ).map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">
                {t("form.contentType")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() =>
                      setForm((f) => ({ ...f, contentType: ct.value }))
                    }
                    className={`py-2 rounded-lg border text-xs font-medium transition-colors ${form.contentType === ct.value ? "border-accent bg-accent-dim text-accent" : "border-line-strong text-tx-2 hover:bg-hover"}`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
              <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
              <PostTemplates
                onSelect={(topic) => setForm((p) => ({ ...p, topic }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-tx-2 mb-1.5">
                {t("form.image")}{" "}
                <span className="text-tx-3 font-normal">
                  {t("form.imageOptional")}
                </span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-line-strong">
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
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-on-accent rounded-full flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-on-accent text-xs px-2 py-0.5 rounded">
                    {imageFile?.name}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
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
                    className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${dragOver ? "border-accent bg-accent-dim" : "border-line-strong hover:border-accent hover:bg-hover"}`}
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
                    <p className="text-xs text-tx-2 font-medium">
                      {t("form.imageHint")}
                    </p>
                    <p className="text-xs text-tx-3 mt-0.5">
                      {t("form.imageFormats")}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileSelect(e.target.files[0])
                      }
                    />
                  </div>

                  {/* Кнопка "Из хранилища" */}
                  {form.projectId && (
                    <button
                      type="button"
                      onClick={() => setShowStoragePicker((v) => !v)}
                      className="w-full py-2 border border-line-strong rounded-lg text-xs text-tx-2 hover:bg-hover hover:text-accent hover:border-accent transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Выбрать из хранилища проекта
                    </button>
                  )}

                  {/* Пикер файлов из хранилища */}
                  {showStoragePicker && form.projectId && (
                    <div className="border border-line-strong rounded-xl p-3 bg-panel-2">
                      {(projectFiles as any[]).length === 0 ? (
                        <p className="text-xs text-tx-3 text-center py-3">
                          Нет изображений в хранилище
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {(projectFiles as any[]).map((f: any) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setImagePreview(f.file_url);
                                setImageFile(null);
                                setShowStoragePicker(false);
                                setForm(
                                  (p) =>
                                    ({ ...p, imageUrl: f.file_url }) as any,
                                );
                              }}
                              className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-colors cursor-pointer"
                            >
                              <img
                                src={f.file_url}
                                alt={f.name}
                                className="w-full h-16 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {error && (
              <div className="bg-chip border border-line rounded-lg px-3 py-2 text-sm text-neg">
                {error}
              </div>
            )}
            {/* 3 варианта */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setThreeVariants((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${threeVariants ? "bg-accent" : "bg-track"}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-panel rounded-full shadow transition-transform ${threeVariants ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-tx-1">
                  Сгенерировать 3 варианта
                  <span className="ml-1.5 text-[10px] font-normal text-c-3 bg-chip px-1.5 py-0.5 rounded">
                    ×3 лимита
                  </span>
                </p>
                <p className="text-[10px] text-tx-3">
                  Дружелюбный · Вирусный · Экспертный — выберешь лучший
                </p>
              </div>
            </label>
            <button
              onClick={handleGenerate}
              disabled={!form.projectId || !form.topic || !form.goal}
              className="w-full py-2.5 bg-accent hover:opacity-90 text-on-accent text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {threeVariants
                ? "Сгенерировать 3 варианта ✦"
                : t("form.generateBtn")}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-panel rounded-xl border border-line-strong p-8 text-center">
            <div className="w-12 h-12 bg-accent-dim rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-tx-1 mb-2">
              {t("generating.title")}
            </h3>
            <p className="text-sm text-tx-3 mb-6">{t("generating.subtitle")}</p>
            <div className="w-full bg-chip rounded-full h-2 mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-tx-3">{progressMsg || `${progress}%`}</p>
            {threeVariants && (
              <p className="text-[10px] text-tx-3 mt-1">
                Генерирую 3 варианта параллельно...
              </p>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && result && (
          <div className="flex gap-6 items-start">
            {/* Левая часть */}
            <div className="flex-1 min-w-0 space-y-4 min-w-[420px]">
              {/* Табы вариантов */}
              {variants.length > 1 && (
                <div className="space-y-2">
                  <div className="flex gap-2 bg-panel-2 p-1 rounded-xl">
                    {variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedVariantIdx(i);
                          setResult(v);
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${selectedVariantIdx === i ? "bg-panel text-accent shadow-sm" : "text-tx-3 hover:text-tx-2"}`}
                      >
                        {(v as any).toneLabel || `Вариант ${i + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Запланировать оставшиеся */}
                  {!leftoverScheduled ? (
                    <div className="border border-dashed border-accent/40 rounded-xl p-3 bg-accent-dim">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-accent">
                          {variants.length - 1} других вариант
                          {variants.length - 1 > 1 ? "а" : ""} — запланировать?
                        </p>
                        <button
                          onClick={() => setScheduleLeftover((v) => !v)}
                          className="text-[10px] px-2.5 py-1 bg-accent text-on-accent rounded-lg cursor-pointer hover:opacity-90 transition-colors"
                        >
                          {scheduleLeftover ? "Скрыть" : "Выбрать дату"}
                        </button>
                      </div>

                      {scheduleLeftover && (
                        <div className="space-y-2">
                          {variants
                            .map((v, i) => ({ ...v, idx: i }))
                            .filter((_, i) => i !== selectedVariantIdx)
                            .map((v) => (
                              <div
                                key={v.idx}
                                className="flex items-center gap-2 bg-panel rounded-lg p-2 border border-line"
                              >
                                <span className="text-[10px] text-tx-2 flex-1 truncate">
                                  {(v as any).toneLabel ||
                                    `Вариант ${v.idx + 1}`}
                                  : {(v as any).title || "—"}
                                </span>
                                <input
                                  type="datetime-local"
                                  value={leftoverDates[v.idx] || ""}
                                  onChange={(e) =>
                                    setLeftoverDates((prev) => ({
                                      ...prev,
                                      [v.idx]: e.target.value,
                                    }))
                                  }
                                  className="text-[10px] px-2 py-1 border border-line-strong rounded outline-none focus:border-accent cursor-pointer"
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                              </div>
                            ))}
                          <button
                            onClick={scheduleLeftoverVariants}
                            disabled={
                              schedulingLeftover ||
                              Object.keys(leftoverDates).length === 0
                            }
                            className="w-full py-2 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors"
                          >
                            {schedulingLeftover
                              ? "Планируем..."
                              : "✓ Запланировать"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-accent-dim rounded-xl px-3 py-2">
                      <span className="text-xs text-accent font-medium">
                        Остальные варианты запланированы
                      </span>
                      <a
                        href="/calendar"
                        className="ml-auto text-[10px] text-accent underline cursor-pointer"
                      >
                        Открыть календарь →
                      </a>
                    </div>
                  )}
                </div>
              )}
              {result.source_image_url && (
                <div className="bg-panel rounded-xl border border-line-strong overflow-hidden">
                  <img
                    src={result.source_image_url}
                    alt="preview"
                    className="w-full object-cover max-h-72"
                  />
                </div>
              )}
              <div className="bg-panel rounded-xl border border-line-strong p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-tx-3 uppercase tracking-wide">
                    {t("result.caption")}
                  </p>
                  <button
                    onClick={() => handleRegenPart("caption")}
                    disabled={regenField === "caption"}
                    className="text-[10px] px-2 py-1 border border-line-strong rounded-lg text-tx-3 hover:text-accent hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {regenField === "caption" ? "..." : "↺ Переписать"}
                  </button>
                </div>
                {inlineEdit === "caption" ? (
                  <div className="space-y-2">
                    <textarea
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm border border-accent rounded-lg outline-none resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveInlineEdit}
                        className="px-3 py-1.5 bg-accent text-on-accent text-xs rounded-lg hover:opacity-90 cursor-pointer"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => setInlineEdit(null)}
                        className="px-3 py-1.5 border border-line-strong text-xs text-tx-2 rounded-lg cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-tx-1 whitespace-pre-wrap leading-relaxed cursor-text hover:bg-hover rounded-lg p-1 -m-1 transition-colors"
                    onClick={() => {
                      setInlineEdit("caption");
                      setInlineValue(result.caption);
                    }}
                    title="Нажми чтобы редактировать"
                  >
                    {result.caption}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-4 items-center">
                  {result.hashtags?.map((h) => (
                    <span
                      key={h}
                      className="text-xs text-accent bg-accent-dim px-2.5 py-0.5 rounded-full"
                    >
                      {h}
                    </span>
                  ))}
                  <button
                    onClick={() => handleRegenPart("hashtags")}
                    disabled={regenField === "hashtags"}
                    className="ml-auto text-[10px] px-2 py-1 border border-line-strong rounded-lg text-tx-3 hover:text-accent hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {regenField === "hashtags" ? "..." : "↺ Хэштеги"}
                  </button>
                </div>
              </div>
            </div>

            {/* Правая часть — сайдбар */}
            <div className="w-72 flex-shrink-0 space-y-3 sticky top-4">
              <div className="bg-panel rounded-xl border border-line-strong p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">
                    {publishMode === "now" ? (
                      <Rocket
                        size={15}
                        className="text-accent"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <CalendarClock
                        size={15}
                        className="text-c-2"
                        strokeWidth={1.8}
                      />
                    )}
                  </span>
                  <p className="text-xs font-semibold text-tx-1">
                    {publishMode === "now"
                      ? "Опубликовать сейчас"
                      : "Запланировать"}
                  </p>
                  <button
                    onClick={() =>
                      setPublishMode(publishMode === "now" ? "schedule" : "now")
                    }
                    className="ml-auto text-[10px] text-accent hover:underline cursor-pointer font-medium"
                  >
                    Изменить
                  </button>
                </div>
                <div className="space-y-3">
                  {publishMode === "schedule" && (
                    <div className="flex gap-1.5 mb-3">
                      <input
                        type="date"
                        value={today}
                        min={today}
                        onChange={(e) => {
                          // apply date to all channels
                          setAccountActions((prev) => {
                            const next: Record<string, any> = { ...prev };
                            (allChannels || []).forEach((ch: any) => {
                              next[ch.id] = {
                                ...(next[ch.id] || {
                                  action: "schedule",
                                  slots: [],
                                }),
                                date: e.target.value,
                                action: "schedule",
                              };
                            });
                            return next;
                          });
                        }}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                      />
                      <input
                        type="time"
                        defaultValue="12:00"
                        onChange={(e) => {
                          setAccountActions((prev) => {
                            const next: Record<string, any> = { ...prev };
                            (allChannels || []).forEach((ch: any) => {
                              next[ch.id] = {
                                ...(next[ch.id] || {
                                  action: "schedule",
                                  slots: [],
                                }),
                                time: e.target.value,
                                action: "schedule",
                              };
                            });
                            return next;
                          });
                        }}
                        className="w-20 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                      />
                    </div>
                  )}

                  {(allChannels || []).length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-tx-2 mb-2">
                        Нет подключённых каналов
                      </p>
                      <a
                        href={`/${locale}/integrations`}
                        className="text-xs text-accent font-semibold hover:underline"
                      >
                        Подключить →
                      </a>
                    </div>
                  ) : (
                    (allChannels || []).map((ch: any) => {
                      const act = accountActions[ch.id] || {
                        action: publishMode,
                        date: today,
                        time: "12:00",
                        slots: [],
                      };
                      return (
                        <div
                          key={ch.id}
                          className={`rounded-xl border p-3 transition-all ${act.action !== "none" ? "border-accent bg-accent-dim" : "border-line"}`}
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg bg-chip flex items-center justify-center flex-shrink-0">
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
                              <p className="text-xs font-semibold text-tx-1 truncate">
                                {ch.channel_name || ch.channel_id}
                              </p>
                              <p className="text-[10px] text-tx-3">
                                {ch.channel_id}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {(["now", "schedule", "plan", "none"] as const).map(
                              (type) => (
                                <button
                                  key={type}
                                  onClick={() => {
                                    if (type === "plan") {
                                      handleOpenPlan(
                                        ch.id,
                                        ch.channel_name || ch.channel_id,
                                      );
                                    } else {
                                      setAccountActions((prev) => ({
                                        ...prev,
                                        [ch.id]: { ...act, action: type },
                                      }));
                                    }
                                  }}
                                  className={`py-1.5 text-[9px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                    act.action === type
                                      ? type === "none"
                                        ? "bg-chip border-line-strong text-tx-2"
                                        : type === "plan"
                                          ? "bg-purple-600 border-purple-600 text-on-accent"
                                          : "bg-accent border-accent text-on-accent"
                                      : type === "plan"
                                        ? "bg-panel border-purple-200 text-purple-400 hover:border-purple-400"
                                        : "bg-panel border-line-strong text-tx-3 hover:border-line-strong"
                                  }`}
                                >
                                  {type === "now"
                                    ? "Сейчас"
                                    : type === "schedule"
                                      ? "Запланировать"
                                      : type === "plan"
                                        ? "План"
                                        : "Пропустить"}
                                </button>
                              ),
                            )}
                          </div>
                          {act.action === "schedule" && (
                            <div className="mt-2 space-y-1.5">
                              {act.slots.length === 0 ? (
                                <div className="space-y-1.5">
                                  <div className="flex gap-1.5">
                                    <input
                                      type="date"
                                      value={act.date}
                                      min={today}
                                      onChange={(e) =>
                                        setAccountActions((prev) => ({
                                          ...prev,
                                          [ch.id]: {
                                            ...act,
                                            date: e.target.value,
                                          },
                                        }))
                                      }
                                      className="flex-1 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                                    />
                                    <input
                                      type="time"
                                      value={act.time}
                                      onChange={(e) =>
                                        setAccountActions((prev) => ({
                                          ...prev,
                                          [ch.id]: {
                                            ...act,
                                            time: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-20 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                                    />
                                  </div>
                                  <button
                                    onClick={() =>
                                      setAccountActions((prev) => ({
                                        ...prev,
                                        [ch.id]: {
                                          ...act,
                                          slots: [
                                            { date: act.date, time: act.time },
                                            { date: today, time: "18:00" },
                                          ],
                                        },
                                      }))
                                    }
                                    className="text-[10px] text-accent cursor-pointer"
                                  >
                                    + Добавить ещё дату
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {act.slots.map((slot: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-1"
                                    >
                                      <input
                                        type="date"
                                        value={slot.date}
                                        min={today}
                                        onChange={(e) => {
                                          const s = [...act.slots];
                                          s[i] = {
                                            ...s[i],
                                            date: e.target.value,
                                          };
                                          setAccountActions((prev) => ({
                                            ...prev,
                                            [ch.id]: { ...act, slots: s },
                                          }));
                                        }}
                                        className="flex-1 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                                      />
                                      <input
                                        type="time"
                                        value={slot.time}
                                        onChange={(e) => {
                                          const s = [...act.slots];
                                          s[i] = {
                                            ...s[i],
                                            time: e.target.value,
                                          };
                                          setAccountActions((prev) => ({
                                            ...prev,
                                            [ch.id]: { ...act, slots: s },
                                          }));
                                        }}
                                        className="w-20 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                                      />
                                      <button
                                        onClick={() =>
                                          setAccountActions((prev) => ({
                                            ...prev,
                                            [ch.id]: {
                                              ...act,
                                              slots: act.slots.filter(
                                                (_: any, idx: number) =>
                                                  idx !== i,
                                              ),
                                            },
                                          }))
                                        }
                                        className="text-tx-3 hover:text-neg cursor-pointer text-sm"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() =>
                                      setAccountActions((prev) => ({
                                        ...prev,
                                        [ch.id]: {
                                          ...act,
                                          slots: [
                                            ...act.slots,
                                            { date: today, time: "12:00" },
                                          ],
                                        },
                                      }))
                                    }
                                    className="text-[10px] text-accent cursor-pointer"
                                  >
                                    + Ещё дату
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {publishError && (
                <div className="bg-chip border border-line rounded-xl px-4 py-3 text-sm text-neg">
                  {publishError}
                </div>
              )}
              {publishSuccess && (
                <div className="bg-accent-dim border border-accent rounded-xl px-4 py-3 text-sm text-accent font-medium">
                  ✓ Опубликовано!
                </div>
              )}
              {scheduleSuccess && (
                <div className="bg-accent-dim border border-accent rounded-xl px-4 py-3 text-sm text-accent font-medium">
                  ✓ Запланировано!
                </div>
              )}

              <button
                onClick={handleApplyActions}
                disabled={
                  !(allChannels || []).some(
                    (ch: any) =>
                      accountActions[ch.id]?.action &&
                      accountActions[ch.id].action !== "none",
                  ) || publishing
                }
                className="w-full py-3 bg-accent hover:opacity-90 text-on-accent text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? "Публикуем..." : "Применить"}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Plan Modal */}
      {planModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() =>
              !planGenerating &&
              setPlanModal({ open: false, channelId: "", channelName: "" })
            }
          />
          <div className="relative bg-panel rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-tx-1">Контент-план</h3>
                <p className="text-[11px] text-tx-3 mt-0.5">
                  {planModal.channelName}
                </p>
              </div>
              {!planGenerating && (
                <button
                  onClick={() =>
                    setPlanModal({
                      open: false,
                      channelId: "",
                      channelName: "",
                    })
                  }
                  className="w-7 h-7 rounded-full bg-chip hover:bg-hover flex items-center justify-center text-tx-3 cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {planDone ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-accent-dim rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✓</span>
                  </div>
                  <p className="text-sm font-semibold text-tx-1 mb-1">
                    План создан!
                  </p>
                  <p className="text-xs text-tx-3 mb-4">
                    Посты запланированы и сохранены в очередь публикаций.
                  </p>
                  <button
                    onClick={() =>
                      setPlanModal({
                        open: false,
                        channelId: "",
                        channelName: "",
                      })
                    }
                    className="px-5 py-2 bg-accent text-on-accent text-sm font-semibold rounded-xl cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              ) : planGenerating ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-chip rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-tx-1 mb-1">
                    Генерируем посты...
                  </p>
                  <p className="text-xs text-tx-3 mb-4">
                    Claude создаёт уникальный контент для каждого слота
                  </p>
                  <div className="w-full bg-chip rounded-full h-2 mb-1">
                    <div
                      className="bg-chip0 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${planProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-tx-3">{planProgress}%</p>
                </div>
              ) : (
                <>
                  {/* Date range */}
                  <div>
                    <label className="block text-xs font-semibold text-tx-2 mb-2">
                      Период публикаций
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={planConfig.dateFrom}
                        min={today}
                        onChange={(e) =>
                          setPlanConfig((p) => ({
                            ...p,
                            dateFrom: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                      />
                      <span className="text-tx-3 text-xs">→</span>
                      <input
                        type="date"
                        value={planConfig.dateTo}
                        min={planConfig.dateFrom}
                        onChange={(e) =>
                          setPlanConfig((p) => ({
                            ...p,
                            dateTo: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                      />
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-xs font-semibold text-tx-2 mb-2">
                      Частота публикаций
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((f) => (
                        <button
                          key={f}
                          onClick={() => handlePlanFrequencyChange(f)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            planConfig.frequency === f
                              ? "bg-purple-600 border-purple-600 text-on-accent"
                              : "bg-panel border-line-strong text-tx-3 hover:border-purple-300"
                          }`}
                        >
                          {f}x в день
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div>
                    <label className="block text-xs font-semibold text-tx-2 mb-2">
                      Время публикации
                    </label>
                    <div className="space-y-2">
                      {planConfig.times.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-tx-3 w-10">
                            Слот {i + 1}
                          </span>
                          <input
                            type="time"
                            value={t}
                            onChange={(e) => {
                              const times = [...planConfig.times];
                              times[i] = e.target.value;
                              setPlanConfig((p) => ({ ...p, times }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topic mode */}
                  <div>
                    <label className="block text-xs font-semibold text-tx-2 mb-2">
                      Темы постов
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(["auto", "manual"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setPlanConfig((p) => ({ ...p, topicMode: mode }))
                          }
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            planConfig.topicMode === mode
                              ? "bg-accent border-accent text-on-accent"
                              : "bg-panel border-line-strong text-tx-3 hover:border-accent"
                          }`}
                        >
                          {mode === "auto" ? "Авто (Claude)" : "Вручную"}
                        </button>
                      ))}
                    </div>

                    {planConfig.topicMode === "manual" &&
                      (() => {
                        const slots = buildPlanSlots(
                          planConfig.dateFrom,
                          planConfig.dateTo,
                          planConfig.times,
                        );
                        return (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {slots.map((slot, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[9px] text-tx-3 whitespace-nowrap">
                                  {slot.date.slice(5)} {slot.time}
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Тема ${i + 1}...`}
                                  value={planConfig.topics[i] || ""}
                                  onChange={(e) => {
                                    const topics = [...planConfig.topics];
                                    topics[i] = e.target.value;
                                    setPlanConfig((p) => ({ ...p, topics }));
                                  }}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-line-strong text-xs outline-none focus:border-accent bg-panel"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                    {planConfig.topicMode === "auto" && (
                      <p className="text-[11px] text-tx-3 bg-panel-2 rounded-lg px-3 py-2">
                        Claude будет использовать тему «{form.topic}» и
                        генерировать уникальный контент для каждого слота.
                      </p>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-chip rounded-xl px-4 py-3">
                    <p className="text-[11px] text-c-2 font-semibold mb-1">
                      Итого постов:
                    </p>
                    <p className="text-lg font-bold text-c-2">
                      {
                        buildPlanSlots(
                          planConfig.dateFrom,
                          planConfig.dateTo,
                          planConfig.times,
                        ).length
                      }
                    </p>
                    <p className="text-[10px] text-purple-400 mt-0.5">
                      {planConfig.frequency}x в день · с{" "}
                      {planConfig.dateFrom.slice(5)} по{" "}
                      {planConfig.dateTo.slice(5)}
                    </p>
                  </div>

                  <button
                    onClick={handleGeneratePlan}
                    disabled={
                      !planConfig.dateFrom ||
                      !planConfig.dateTo ||
                      planConfig.dateFrom > planConfig.dateTo
                    }
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-on-accent text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Создать план
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
