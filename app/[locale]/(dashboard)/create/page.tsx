"use client";

import CampaignPicker from "@/components/features/CampaignPicker";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { useTranslations, useLocale } from "next-intl";
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
        className="w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm text-left flex items-center justify-between bg-panel hover:border-accent focus:border-accent outline-none transition-colors cursor-pointer"
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
          className={`transition-transform duration-200 flex-shrink-0 text-tx-3 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1.5 bg-panel border border-line-strong rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden ui-rise">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-sm text-left text-tx-3 hover:bg-hover cursor-pointer border-b border-line"
              >
                {placeholder}
              </button>
            )}
            <div className="max-h-[200px] overflow-y-auto">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${value === o.value ? "bg-accent-dim text-accent font-medium" : "text-tx-1 hover:bg-hover"}`}
                >
                  <span>{o.label}</span>
                  {value === o.value && (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
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
  const [useStreaming, setUseStreaming] = useState(false);
  const [showPicker, setShowPicker] = useState(true);
  const [pickerDone, setPickerDone] = useState(false); // streaming disabled — Vercel timeout
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

  const { data: generationsCount } = useQuery({
    queryKey: ["create-gen-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contents")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: publishedCount } = useQuery({
    queryKey: ["create-pub-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contents")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");
      return count ?? 0;
    },
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

    // Save draft state to Supabase so user can return to the page
    try {
      await supabase.from("content_drafts").upsert(
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          form_data: JSON.stringify(form),
          status: "generating",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch {
      /* non-critical */
    }

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
        // Clear draft from Supabase
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user)
            supabase
              .from("content_drafts")
              .delete()
              .eq("user_id", user.id)
              .then(() => {});
        });
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

  // Restore generating state if user left page during generation
  useEffect(() => {
    const restoreDraft = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: draft } = await supabase
        .from("content_drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "generating")
        .maybeSingle();
      if (draft?.form_data) {
        try {
          const savedForm = JSON.parse(draft.form_data);
          setForm(savedForm);
          // Clean up stale draft
          await supabase.from("content_drafts").delete().eq("user_id", user.id);
        } catch {
          /* ignore */
        }
      }
    };
    restoreDraft();
  }, []);

  const copyCaption = () => {
    if (!result) return;
    navigator.clipboard.writeText(
      `${result.caption}\n\n${result.hashtags.join(" ")}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm outline-none focus:border-accent transition-colors bg-panel";

  // Handle campaign picker result
  const handlePickerSelect = (campaignId: string | null) => {
    if (campaignId) {
      setForm((p) => ({ ...p, campaignId }));
    }
    setShowPicker(false);
    setPickerDone(true);
  };

  const RUBRICS = [
    { value: "behind", label: "Закулисье", icon: "ti-eye" },
    { value: "review", label: "Отзыв", icon: "ti-star" },
    { value: "secret", label: "Секрет", icon: "ti-lock" },
    { value: "fact", label: "Факт", icon: "ti-chart-bar" },
    { value: "question", label: "Вопрос", icon: "ti-help-circle" },
    { value: "tip", label: "Совет", icon: "ti-bulb" },
    { value: "result", label: "Результат", icon: "ti-trophy" },
    { value: "trend", label: "Тренд", icon: "ti-flame" },
  ];

  const TONES = [
    { value: "professional", label: "Профессиональный" },
    { value: "friendly", label: "Дружелюбный" },
    { value: "expert", label: "Экспертный" },
    { value: "selling", label: "Продающий" },
  ];

  const GOAL_CHIPS = [
    { value: t("goals.awareness"), label: "Охват" },
    { value: t("goals.sales"), label: "Продажи" },
    { value: t("goals.engagement"), label: "Вовлечение" },
    { value: t("goals.traffic"), label: "Доверие" },
  ];

  const RUBRIC_EXAMPLES: Record<string, string[]> = {
    behind: [
      "Как мы работаем удалённо",
      "Наш рабочий процесс",
      "День нового сотрудника",
    ],
    review: [
      "Отзыв клиента о продукте",
      "История успеха партнёра",
      "Что говорят пользователи",
    ],
    secret: [
      "Секрет нашего роста",
      "То, о чём не говорят конкуренты",
      "Закрытая информация",
    ],
    fact: [
      "Интересный факт о нише",
      "Цифры которые удивят",
      "Статистика рынка",
    ],
    question: [
      "Что важнее для вас?",
      "Как вы решаете эту проблему?",
      "Ваш опыт с этим",
    ],
    tip: ["Лайфхак для SMM", "Как сэкономить время", "Совет по продуктивности"],
    result: [
      "Наш результат за месяц",
      "Кейс клиента",
      "До и после работы с нами",
    ],
    trend: [
      "Тренд который меняет рынок",
      "Что сейчас в топе",
      "Новинка недели",
    ],
  };

  const RUBRIC_PREVIEWS: Record<string, string> = {
    behind:
      '"Показываем как выглядит наш рабочий процесс изнутри. Спойлер: стикеры и Notion — наше всё..."',
    review:
      '"Клиент пришёл с нулём подписчиков. За 3 месяца — 12к живой аудитории. Вот как это было..."',
    secret:
      '"Расскажем то, о чём молчат конкуренты. Этот приём увеличил наши продажи на 40%..."',
    fact: '"78% SMM-специалистов тратят на создание контента более 3 часов в день. Мы это меняем..."',
    question:
      '"Как вы обычно находите идеи для постов? Минуты вдохновения или планирование заранее?"',
    tip: '"Один простой лайфхак который сэкономит вам 2 часа в неделю на создании контента..."',
    result:
      '"Запустили рекламу в пятницу вечером. К понедельнику — 847 новых подписчиков..."',
    trend:
      '"AI-контент захватывает соцсети. Вот что это значит для вашего бренда прямо сейчас..."',
  };

  const [rubric, setRubric] = useState("behind");
  const [tone, setTone] = useState("professional");

  const tokenBalance = Math.max(0, 50 - (generationsCount ?? 0));
  const selectedProject = (projects || []).find(
    (p: any) => p.id === form.projectId,
  ) as any;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="h-11 border-b border-line px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <p className="text-[11px] text-tx-3">
          Создать / <span className="text-tx-2 font-medium">Новый пост</span>
        </p>
        <div className="flex items-center gap-4">
          {[
            { n: 1, label: "Настройка" },
            { n: 2, label: "Генерация" },
            { n: 3, label: "Публикация" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-track mr-1" />}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${step >= n ? "bg-accent text-on-accent" : "bg-chip text-tx-3"}`}
              >
                {step > n ? "✓" : n}
              </div>
              <span
                className={`text-[11px] ${step === n ? "text-tx-1 font-medium" : "text-tx-3"}`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TWO-COLUMN */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ borderRight: "0.5px solid var(--line)" }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* HERO */}
            {step === 1 && (
              <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-4 bg-panel">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[9px] font-semibold tracking-widest uppercase text-accent">
                      AI генерация контента
                    </span>
                  </div>
                  <h1 className="text-[18px] font-semibold text-tx-1 leading-snug">
                    Напиши тему —<br />
                    AI создаст пост за тебя
                  </h1>
                  <p className="text-[11px] text-tx-2 mt-1">
                    Занимает 30 секунд. Публикуй сразу или запланируй.
                  </p>
                </div>
                <div className="hidden md:flex border border-line rounded-[10px] overflow-hidden flex-shrink-0">
                  {[
                    { val: generationsCount ?? 0, label: "постов создано" },
                    { val: publishedCount ?? 0, label: "опубликовано" },
                    { val: tokenBalance, label: "токенов" },
                  ].map(({ val, label }, i) => (
                    <div
                      key={label}
                      className={`px-4 py-2.5 text-center ${i > 0 ? "border-l border-line" : ""}`}
                    >
                      <div className="text-[17px] font-semibold text-tx-1 leading-none">
                        {val}
                      </div>
                      <div className="text-[9px] text-tx-3 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2 — generating */}
            {step === 2 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
                <div className="w-12 h-12 bg-accent-dim rounded-full flex items-center justify-center mb-4">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent animate-pulse"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-tx-1 mb-2">
                  AI генерирует контент...
                </h3>
                <p className="text-[12px] text-tx-3 mb-6">
                  {progressMsg || "Анализирую тему и создаю пост"}
                </p>
                <div className="w-48 bg-chip rounded-full h-1.5 mb-2">
                  <div
                    className="bg-accent h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-tx-3">{progress}%</p>
              </div>
            )}

            {/* STEP 1 — form */}
            {step === 1 && (
              <div className="p-5 flex flex-col gap-4">
                {/* ROW: Проект + Платформа */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="bg-panel border border-line rounded-[10px] overflow-visible"
                    style={{ borderLeft: "2px solid var(--accent)" }}
                  >
                    <div className="px-3 pt-2.5 pb-0">
                      <p
                        className="ui-label"
                        style={{ color: "var(--accent)" }}
                      >
                        Проект
                      </p>
                    </div>
                    <div className="px-3 pb-3 pt-2">
                      <CustomSelect
                        value={form.projectId}
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            projectId: v,
                            campaignId: "",
                          }))
                        }
                        placeholder={t("form.projectDefault")}
                        options={(projects || []).map((p: any) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                      />
                    </div>
                  </div>

                  <div
                    className="bg-panel border border-line rounded-[10px] overflow-visible"
                    style={{ borderLeft: "2px solid var(--accent)" }}
                  >
                    <div className="px-3 pb-3 pt-2 flex gap-1.5 flex-wrap">
                      {PLATFORMS.map((pl) => (
                        <button
                          key={pl.value}
                          onClick={() =>
                            setForm((f) => ({ ...f, platform: pl.value }))
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border text-[11px] font-medium transition-colors cursor-pointer ${form.platform === pl.value ? "border-accent bg-accent-dim text-accent" : "border-line text-tx-2 hover:bg-hover bg-panel-2"}`}
                        >
                          {pl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ROW: Тип + Картинка */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
                    <div className="px-3 pt-2.5 pb-0">
                      <p className="ui-label">Тип контента</p>
                    </div>
                    <div className="px-3 pb-3 pt-2 flex gap-1.5 flex-wrap">
                      {CONTENT_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          onClick={() =>
                            setForm((f) => ({ ...f, contentType: ct.value }))
                          }
                          className={`px-2.5 py-1.5 rounded-[6px] border text-[11px] font-medium transition-colors cursor-pointer ${form.contentType === ct.value ? "border-accent bg-accent-dim text-accent" : "border-line text-tx-2 hover:bg-hover bg-panel-2"}`}
                        >
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
                    <div className="px-3 pt-2.5 pb-0">
                      <p className="ui-label">
                        Картинка{" "}
                        <span className="text-[9px] font-normal text-tx-3 normal-case tracking-normal">
                          (необяз.)
                        </span>
                      </p>
                    </div>
                    <div className="px-3 pb-3 pt-2">
                      {imagePreview ? (
                        <div className="relative rounded-[7px] overflow-hidden border border-line">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full max-h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
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
                          className={`border-2 border-dashed rounded-[7px] p-3 text-center cursor-pointer transition-colors ${dragOver ? "border-accent bg-accent-dim" : "border-line hover:border-accent"}`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mx-auto mb-1 text-tx-3"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                          <p className="text-[10px] text-tx-2 font-medium">
                            Перетащи или нажми
                          </p>
                          <p className="text-[9px] text-tx-3">
                            PNG, JPG до 10 МБ
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
                      )}
                      {form.projectId && (
                        <button
                          type="button"
                          onClick={() => setShowStoragePicker((v) => !v)}
                          className="w-full mt-1.5 py-1.5 border border-line rounded-[6px] text-[10px] text-tx-2 hover:bg-hover transition-colors cursor-pointer"
                        >
                          Из хранилища проекта
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Рубрика */}
                <div
                  className="bg-panel border border-line rounded-[10px] overflow-hidden"
                  style={{ borderLeft: "2px solid var(--accent)" }}
                >
                  <div className="px-3 pt-2.5 pb-0">
                    <p className="ui-label" style={{ color: "var(--accent)" }}>
                      Рубрика — задаёт структуру поста
                    </p>
                  </div>
                  <div className="px-3 pb-3 pt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {RUBRICS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setRubric(r.value)}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-[8px] border text-center transition-colors cursor-pointer ${rubric === r.value ? "border-accent bg-accent-dim" : "border-line bg-panel-2 hover:bg-hover"}`}
                        >
                          <i
                            className={`ti ${r.icon} text-[14px] ${rubric === r.value ? "text-accent" : "text-tx-3"}`}
                          />
                          <span
                            className={`text-[9.5px] font-medium ${rubric === r.value ? "text-accent" : "text-tx-2"}`}
                          >
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Тема */}
                <div
                  className="bg-panel border border-line rounded-[10px] overflow-hidden"
                  style={{ borderLeft: "2px solid var(--accent)" }}
                >
                  <div className="px-3 pt-2.5 pb-0">
                    <p className="ui-label" style={{ color: "var(--accent)" }}>
                      Тема или идея
                    </p>
                  </div>
                  <div className="px-3 pb-3 pt-2">
                    <div className="bg-panel-2 border border-line rounded-[7px] p-3">
                      <textarea
                        value={form.topic}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, topic: e.target.value }))
                        }
                        placeholder={t("form.topicPlaceholder")}
                        rows={3}
                        className="w-full bg-transparent border-none outline-none text-[13px] text-tx-1 resize-none placeholder:text-tx-3"
                      />
                    </div>
                    {/* Умные подсказки */}
                    <div className="mt-2">
                      <p className="text-[9px] text-tx-3 mb-1.5">
                        Примеры для «
                        {RUBRICS.find((r) => r.value === rubric)?.label}» —
                        нажми чтобы вставить:
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(RUBRIC_EXAMPLES[rubric] || []).map((ex: string) => (
                          <button
                            key={ex}
                            onClick={() =>
                              setForm((p) => ({ ...p, topic: ex }))
                            }
                            className="px-2.5 py-1 rounded-full text-[10px] bg-accent-dim border border-accent/20 text-accent hover:bg-accent hover:text-on-accent transition-colors cursor-pointer"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW: Тон + Цель */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
                    <div className="px-3 pt-2.5 pb-0">
                      <p className="ui-label">Тон</p>
                    </div>
                    <div className="px-3 pb-3 pt-2 flex gap-1.5 flex-wrap">
                      {TONES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${tone === t.value ? "border-accent bg-accent-dim text-accent" : "border-line text-tx-2 hover:bg-hover bg-panel-2"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
                    <div className="px-3 pt-2.5 pb-0">
                      <p className="ui-label">Цель</p>
                    </div>
                    <div className="px-3 pb-3 pt-2 flex gap-1.5 flex-wrap">
                      {GOAL_CHIPS.map((g) => (
                        <button
                          key={g.value}
                          onClick={() =>
                            setForm((p) => ({ ...p, goal: g.value }))
                          }
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${form.goal === g.value ? "border-accent bg-accent-dim text-accent" : "border-line text-tx-2 hover:bg-hover bg-panel-2"}`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-chip border border-line rounded-[8px] px-3 py-2 text-[12px] text-neg">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — result */}
            {step === 3 && result && (
              <div className="p-5 space-y-4">
                {variants.length > 1 && (
                  <div className="flex gap-2 bg-panel-2 p-1 rounded-xl">
                    {variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedVariantIdx(i);
                          setResult(v);
                        }}
                        className={`flex-1 py-2 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${selectedVariantIdx === i ? "bg-panel text-accent shadow-sm" : "text-tx-3 hover:text-tx-2"}`}
                      >
                        {(v as any).toneLabel || `Вариант ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {result.hook && (
                  <div className="ui-surface p-4">
                    <p className="text-[11px] font-semibold text-tx-1 mb-2">
                      Зацепка
                    </p>
                    <p className="text-[13px] text-tx-1 leading-relaxed">
                      {result.hook}
                    </p>
                  </div>
                )}
                <div className="ui-surface p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-tx-1">
                      {t("result.caption")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenPart("caption")}
                        disabled={regenField === "caption"}
                        className="text-[10px] text-tx-3 hover:text-accent cursor-pointer disabled:opacity-40"
                      >
                        {regenField === "caption" ? "..." : "↺ Переписать"}
                      </button>
                      <button
                        onClick={() => {
                          setInlineEdit("caption");
                          setInlineValue(result.caption);
                        }}
                        className="text-[10px] text-tx-3 hover:text-accent cursor-pointer"
                      >
                        ✏ Редактировать
                      </button>
                    </div>
                  </div>
                  {inlineEdit === "caption" ? (
                    <div>
                      <textarea
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        rows={6}
                        className="w-full text-[13px] text-tx-1 bg-panel-2 border border-line rounded-[8px] p-3 outline-none resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setResult((r) =>
                              r ? { ...r, caption: inlineValue } : r,
                            );
                            setInlineEdit(null);
                          }}
                          className="text-[11px] px-3 py-1.5 bg-accent text-on-accent rounded-[6px] cursor-pointer"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setInlineEdit(null)}
                          className="text-[11px] px-3 py-1.5 bg-chip text-tx-2 rounded-[6px] cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-tx-1 leading-relaxed whitespace-pre-wrap">
                      {result.caption}
                    </p>
                  )}
                </div>
                {result.hashtags?.length > 0 && (
                  <div className="ui-surface p-4">
                    <p className="text-[11px] font-semibold text-tx-1 mb-2">
                      {t("result.hashtags")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.hashtags.map((h, i) => (
                        <span
                          key={i}
                          className="text-[11px] text-accent bg-accent-dim px-2 py-0.5 rounded-full"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.cta && (
                  <div className="ui-surface p-4">
                    <p className="text-[11px] font-semibold text-tx-1 mb-2">
                      {t("result.cta")}
                    </p>
                    <p className="text-[13px] text-tx-1">{result.cta}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STICKY FOOTER */}
          <div className="flex-shrink-0 px-5 py-3.5 border-t border-line bg-panel">
            {step === 1 && (
              <div className="space-y-2.5">
                <div className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5 flex items-start gap-2.5">
                  <div
                    onClick={() => setThreeVariants((v) => !v)}
                    className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 cursor-pointer mt-0.5 ${threeVariants ? "bg-accent" : "bg-track"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 bg-panel rounded-full shadow transition-transform ${threeVariants ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-tx-1">
                      Сгенерировать 3 варианта
                      <span className="ml-1.5 text-[9px] text-c-3 bg-chip px-1.5 py-0.5 rounded">
                        ×3 лимита
                      </span>
                    </p>
                    <p className="text-[10px] text-tx-3 mt-0.5">
                      AI напишет Дружелюбный, Вирусный и Экспертный — выберешь
                      лучший
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!form.projectId || !form.topic || !form.goal}
                  className="w-full py-3 bg-accent hover:opacity-90 text-on-accent text-[13px] font-semibold rounded-[8px] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  {threeVariants
                    ? "Сгенерировать 3 варианта"
                    : t("form.generateBtn")}
                </button>
              </div>
            )}
            {step === 3 && result && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStep(1);
                    setResult(null);
                    setVariants([]);
                  }}
                  className="px-4 py-2.5 border border-line text-tx-2 text-[12px] rounded-[8px] hover:bg-hover cursor-pointer"
                >
                  ← Новый пост
                </button>
                <button
                  onClick={handlePublishNow}
                  disabled={publishing}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-semibold rounded-[8px] hover:opacity-90 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {publishing ? "Публикуем..." : "Опубликовать сейчас"}
                </button>
                <button
                  onClick={() => setShowSchedule((v) => !v)}
                  className="px-4 py-2.5 border border-line text-tx-2 text-[12px] rounded-[8px] hover:bg-hover cursor-pointer"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — preview */}
        <div className="w-[280px] flex-shrink-0 bg-panel flex flex-col overflow-hidden">
          <div
            className="flex-1 overflow-y-auto p-4 flex flex-direction-col gap-4"
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-tx-1">
                Предпросмотр
              </p>
              <span className="text-[10px] text-tx-3 capitalize">
                {form.platform} · {form.contentType}
              </span>
            </div>

            {/* Live preview */}
            <div className="relative">
              <span className="absolute -top-1.5 right-2 z-10 bg-accent text-on-accent text-[9px] font-semibold px-2 py-0.5 rounded-full">
                Live
              </span>
              <div className="border border-line rounded-[10px] overflow-hidden">
                {form.platform === "instagram" ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-panel">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
                        }}
                      >
                        {selectedProject?.name?.[0] || "M"}
                      </div>
                      <span className="text-[11px] font-semibold text-tx-1">
                        {selectedProject?.name || "Выбери проект"}
                      </span>
                    </div>
                    <div className="h-24 bg-panel-2 flex items-center justify-center text-[10px] text-tx-3">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        "Фото / видео"
                      )}
                    </div>
                    <div className="px-3 py-2 bg-panel">
                      {step === 3 && result ? (
                        <p className="text-[11px] text-tx-1 leading-relaxed">
                          {result.caption}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="h-1.5 bg-track rounded-full w-full" />
                          <div className="h-1.5 bg-track rounded-full w-3/4" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ background: "var(--accent)" }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-on-accent flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                      >
                        {selectedProject?.name?.[0] || "M"}
                      </div>
                      <span className="text-[12px] font-semibold text-on-accent">
                        {selectedProject?.name || "Выбери проект"}
                      </span>
                    </div>
                    <div className="p-3 bg-panel-2">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt=""
                          className="w-full rounded-[5px] mb-2 max-h-28 object-cover"
                        />
                      )}
                      {step === 3 && result ? (
                        <p className="text-[12px] text-tx-1 leading-relaxed whitespace-pre-wrap">
                          {result.hook
                            ? `${result.hook}

`
                            : ""}
                          {result.caption}
                        </p>
                      ) : (
                        <div className="h-12 bg-panel rounded-[5px] flex items-center justify-center gap-1.5 mb-2 text-[10px] text-tx-3">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          Текст появится после генерации
                        </div>
                      )}
                      {step !== 3 && (
                        <div className="space-y-1.5 mt-2">
                          <div className="h-1.5 bg-panel rounded-full w-full" />
                          <div className="h-1.5 bg-panel rounded-full w-4/5" />
                          <div className="h-1.5 bg-panel rounded-full w-3/5" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Токены */}
            <div className="bg-panel-2 border border-line rounded-[8px] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="ui-label">AI токены</span>
                <span className="text-[12px] font-semibold text-tx-1">
                  {tokenBalance} / 50
                </span>
              </div>
              <div className="h-1 bg-track rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{
                    width: `${Math.min(100, (tokenBalance / 50) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-tx-3">
                Осталось {tokenBalance} генераций · Free план
              </p>
            </div>

            {/* Пример рубрики */}
            <div>
              <p className="ui-label mb-2">
                Пример для «{RUBRICS.find((r) => r.value === rubric)?.label}»
              </p>
              <div className="bg-accent-dim border border-accent/20 rounded-[8px] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-[5px] bg-panel flex items-center justify-center flex-shrink-0">
                    <i
                      className={`ti ${RUBRICS.find((r) => r.value === rubric)?.icon} text-[12px] text-accent`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-accent">
                    {RUBRICS.find((r) => r.value === rubric)?.label}
                  </span>
                </div>
                <p className="text-[10px] text-tx-2 leading-relaxed italic">
                  {RUBRIC_PREVIEWS[rubric]}
                </p>
              </div>
            </div>

            {/* Советы */}
            <div>
              <p className="ui-label mb-2">Для лучшего результата</p>
              <div className="space-y-2">
                {[
                  "Опиши тему подробнее — AI даст лучший результат",
                  "Рубрика задаёт структуру поста",
                  "Картинка увеличивает охват на 30–40%",
                  "Посты сохраняются в хранилище автоматически",
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <svg
                      className="flex-shrink-0 mt-0.5 text-accent"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-[10px] text-tx-2 leading-relaxed">
                      {tip}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {publishSuccess && (
              <div className="bg-accent-dim border border-accent/20 rounded-[8px] px-3 py-2.5 text-[12px] text-accent font-medium text-center">
                Опубликовано успешно!
              </div>
            )}
            {publishError && (
              <div className="bg-chip border border-line rounded-[8px] px-3 py-2 text-[11px] text-neg">
                {publishError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
