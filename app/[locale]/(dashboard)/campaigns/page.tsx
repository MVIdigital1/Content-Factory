"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import {
  Megaphone,
  Plus,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  TrendingUp,
  FileText,
  Send,
  Image as ImageIcon,
  Music2,
  Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Campaign = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: "generating" | "ready" | "running" | "completed";
  budget_total: number | null;
  budget_spent: number | null;
  leads: number | null;
  customers: number | null;
  revenue: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  project?: { name: string } | null;
};
type AdCampaign = {
  id: string;
  name: string;
  goal?: string;
  status: string;
  platforms: string[];
  budget_total?: number;
  budget_spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  ctr: number;
  cpl: number;
  roas: number;
  created_at: string;
};
type AdCreative = {
  id: string;
  platform: string;
  format: string;
  title?: string;
  caption?: string;
  image_url?: string;
  status: string;
  ctr: number;
  impressions: number;
  clicks: number;
  is_winner: boolean;
  ai_generated: boolean;
  created_at: string;
};
type AdReport = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  type: string;
  status: string;
  total_spend: number;
  total_revenue: number;
  total_roas: number;
  total_leads: number;
  created_at: string;
};
type AdPlatform = {
  id: string;
  platform_key: string;
  name: string;
  color: string;
  abbr: string;
  status: string;
  is_active: boolean;
  account_name?: string;
  token_expires_at?: string;
};
type Integration = {
  id: string;
  platform: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
};

// ─── Platform meta ────────────────────────────────────────────────────────────
const PLATFORM_META: Record<
  string,
  { color: string; textColor?: string; abbr: string; name: string }
> = {
  yandex: {
    color: "#FFDB4D",
    textColor: "#664400",
    abbr: "Я",
    name: "Яндекс Директ",
  },
  vk: { color: "#0077FF", abbr: "VK", name: "VK Реклама" },
  telegram: { color: "#0088CC", abbr: "TG", name: "Telegram Ads" },
  mytarget: { color: "#FF6600", abbr: "MT", name: "myTarget" },
  google: { color: "#34A853", abbr: "G", name: "Google Ads" },
  meta: { color: "#1877F2", abbr: "M", name: "Meta Ads" },
  tiktok: { color: "#000000", abbr: "TT", name: "TikTok Ads" },
};

const PLATFORM_ICON: Record<string, any> = {
  telegram: Send,
  instagram: ImageIcon,
  tiktok: Music2,
};

const AD_STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Активна", color: "var(--pos,#3a7d6b)" },
  paused: { label: "Пауза", color: "var(--tx-3)" },
  ab_test: { label: "A/B тест", color: "#F59E0B" },
  draft: { label: "Черновик", color: "var(--tx-3)" },
  completed: { label: "Завершена", color: "var(--tx-3)" },
};

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "postcentro_bot";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function roiOf(c: Campaign) {
  const spent = c.budget_spent || 0;
  if (spent <= 0) return null;
  return Math.round((((c.revenue || 0) - spent) / spent) * 100);
}
function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " млн";
  if (n >= 1_000) return Math.round(n / 1_000) + " тыс";
  return Math.round(n).toString();
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}
function fmt(n: number) {
  if (n <= 0) return "—";
  return `₽${n >= 1000 ? Math.round(n / 1000) + "k" : Math.round(n)}`;
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> =
  {
    running: { label: "Активна", cls: "bg-chip text-pos", dot: "bg-pos" },
    ready: { label: "Запланирована", cls: "bg-chip text-tx-2", dot: "bg-tx-3" },
    generating: {
      label: "Генерируется",
      cls: "bg-chip text-tx-2",
      dot: "bg-tx-3",
    },
    completed: { label: "Завершена", cls: "bg-chip text-tx-3", dot: "bg-tx-3" },
  };
const STATUS_OPTIONS = [
  { value: "ready", label: "Запланирована" },
  { value: "running", label: "Активна" },
  { value: "completed", label: "Завершена" },
];
const CREATIVE_VARIANTS = [
  { emoji: "🌙", title: "«Праздничный оффер»", desc: "Акцент на скидке" },
  { emoji: "✨", title: "«Качество + цена»", desc: "Преимущества" },
  { emoji: "🎁", title: "«UGC-стиль»", desc: "Отзыв покупателя" },
  { emoji: "🏠", title: "«Польза / лайфхак»", desc: "Проблема → решение" },
  { emoji: "⭐", title: "«Прямой CTA»", desc: "Конкретный призыв" },
];
const EMPTY = {
  name: "",
  project_id: "",
  goal: "",
  status: "ready",
  budget_total: "",
  starts_at: "",
  ends_at: "",
};
type FormValues = typeof EMPTY;

// ─── SelectField ─────────────────────────────────────────────────────────────
function SelectField({
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] text-left flex items-center justify-between bg-panel hover:border-line-strong outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-tx-1" : "text-tx-3"}>
          {selected?.label || placeholder || "Выберите…"}
        </span>
        <ChevronDown
          size={13}
          className={`text-tx-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-panel border border-line rounded-[8px] shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-[12px] text-left hover:bg-hover transition-colors ${value === o.value ? "bg-accent-dim text-accent font-medium" : "text-tx-1"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
type TabKey =
  | "campaigns"
  | "ad_campaigns"
  | "creatives"
  | "reports"
  | "connect";
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "campaigns", label: "Контент-кампании", icon: "📋" },
  { key: "ad_campaigns", label: "Реклама", icon: "📡" },
  { key: "creatives", label: "Креативы", icon: "⬡" },
  { key: "reports", label: "Отчёты", icon: "◫" },
  { key: "connect", label: "Подключения", icon: "⊕" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<TabKey>("campaigns");

  // ── Old campaigns state ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [err, setErr] = useState("");
  const [detailCamp, setDetailCamp] = useState<Campaign | null>(null);
  const [res, setRes] = useState({
    budget_spent: "",
    leads: "",
    customers: "",
    revenue: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);

  // ── Ad campaigns state ──
  const [adCampaignModal, setAdCampaignModal] = useState<AdCampaign | null>(
    null,
  );
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizName, setWizName] = useState("");
  const [wizGoal, setWizGoal] = useState("Продажи / заявки");
  const [wizProduct, setWizProduct] = useState("");
  const [wizBudget, setWizBudget] = useState("");
  const [wizPlatforms, setWizPlatforms] = useState(new Set<string>());
  const [wizCreatives, setWizCreatives] = useState(new Set<string>());
  const [wizLaunching, setWizLaunching] = useState(false);
  const [wizError, setWizError] = useState("");

  // ── Connect state ──
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [accountIdInput, setAccountIdInput] = useState("");
  const [tgModal, setTgModal] = useState(false);
  const [channelInput, setChannelInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectSection, setConnectSection] = useState<"ad" | "social">("ad");

  // ── Creatives state ──
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadPlatform, setUploadPlatform] = useState("instagram");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creativeDetail, setCreativeDetail] = useState<AdCreative | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Report state ──
  const [createReportModal, setCreateReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("weekly");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [reportDetail, setReportDetail] = useState<AdReport | null>(null);

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong transition-colors bg-panel text-tx-1 placeholder:text-tx-3";

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, project:projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campaign[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data || []) as { id: string; name: string }[];
    },
  });

  const { data: detailContents = [] } = useQuery({
    queryKey: ["campaign-contents", detailCamp?.id],
    enabled: !!detailCamp,
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, status, platform, created_at")
        .eq("campaign_id", detailCamp!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: adCampaigns = [] } = useQuery<AdCampaign[]>({
    queryKey: ["ad_campaigns"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: adCreatives = [] } = useQuery<AdCreative[]>({
    queryKey: ["ad_creatives"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_creatives")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: adReports = [] } = useQuery<AdReport[]>({
    queryKey: ["ad_reports"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: adPlatforms = [] } = useQuery<AdPlatform[]>({
    queryKey: ["ad_platforms"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("ad_platforms")
        .select("*")
        .eq("user_id", user.id);
      return data ?? [];
    },
  });

  const { data: integrations = [], refetch: refetchIntegrations } = useQuery<
    Integration[]
  >({
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

  useEffect(() => {
    if (detailCamp) {
      setRes({
        budget_spent: detailCamp.budget_spent
          ? String(detailCamp.budget_spent)
          : "",
        leads: detailCamp.leads ? String(detailCamp.leads) : "",
        customers: detailCamp.customers ? String(detailCamp.customers) : "",
        revenue: detailCamp.revenue ? String(detailCamp.revenue) : "",
      });
    }
  }, [detailCamp?.id]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("campaigns").insert({
        name: v.name.trim(),
        project_id: v.project_id,
        goal: v.goal.trim() || null,
        status: v.status,
        budget_total: v.budget_total ? Number(v.budget_total) : 0,
        starts_at: v.starts_at || null,
        ends_at: v.ends_at || null,
        total_posts: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeForm();
    },
    onError: (e: any) => setErr(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: FormValues }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: v.name.trim(),
          project_id: v.project_id,
          goal: v.goal.trim() || null,
          status: v.status,
          budget_total: v.budget_total ? Number(v.budget_total) : 0,
          starts_at: v.starts_at || null,
          ends_at: v.ends_at || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      closeForm();
    },
    onError: (e: any) => setErr(e.message),
  });

  const saveResults = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          budget_spent: res.budget_spent ? Number(res.budget_spent) : 0,
          leads: res.leads ? Number(res.leads) : 0,
          customers: res.customers ? Number(res.customers) : 0,
          revenue: res.revenue ? Number(res.revenue) : 0,
        })
        .eq("id", detailCamp!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  // ─── Wizard launch ─────────────────────────────────────────────────────────
  const launchAdCampaign = async () => {
    if (!wizName.trim()) {
      setWizError("Введите название");
      return;
    }
    if (wizPlatforms.size === 0) {
      setWizError("Выберите платформу");
      return;
    }
    setWizLaunching(true);
    setWizError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { data: camp, error: campErr } = await supabase
        .from("ad_campaigns")
        .insert({
          user_id: user.id,
          name: wizName,
          goal: wizGoal,
          description: wizProduct,
          platforms: [...wizPlatforms],
          status: "active",
          budget_total: wizBudget ? Number(wizBudget) : null,
          budget_spent: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          sales: 0,
          revenue: 0,
          ctr: 0,
          cpl: 0,
          roas: 0,
        })
        .select()
        .single();
      if (campErr) throw campErr;
      for (const cId of wizCreatives) {
        const [platformKey, idx] = cId.split("-");
        const v = CREATIVE_VARIANTS[Number(idx)];
        if (v && camp) {
          await supabase.from("ad_creatives").insert({
            user_id: user.id,
            campaign_id: camp.id,
            platform: platformKey,
            format: "post",
            title: v.title,
            caption: v.desc,
            status: "draft",
            ai_generated: true,
            ctr: 0,
            impressions: 0,
            clicks: 0,
            is_winner: false,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["ad_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["ad_creatives"] });
      setShowWizard(false);
      setWizardStep(0);
      setWizName("");
      setWizGoal("Продажи / заявки");
      setWizProduct("");
      setWizBudget("");
      setWizPlatforms(new Set());
      setWizCreatives(new Set());
      setActiveTab("ad_campaigns");
    } catch (e: any) {
      setWizError(e.message);
    } finally {
      setWizLaunching(false);
    }
  };

  // ─── Connect ad platform ───────────────────────────────────────────────────
  const handleConnectAd = async () => {
    if (!connectModal) return;
    const meta = PLATFORM_META[connectModal];
    if (!meta) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      await supabase.from("ad_platforms").upsert({
        user_id: user.id,
        platform_key: connectModal,
        name: meta.name,
        color: meta.color,
        abbr: meta.abbr,
        region: ["yandex", "vk", "telegram", "mytarget"].includes(connectModal)
          ? "cis"
          : "global",
        access_token: tokenInput || null,
        account_id: accountIdInput || null,
        is_active: true,
        status: "active",
        updated_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["ad_platforms"] });
      setConnectModal(null);
      setTokenInput("");
      setAccountIdInput("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
  };

  const handleDisconnectAd = async (id: string) => {
    if (!confirm("Отключить платформу?")) return;
    await supabase
      .from("ad_platforms")
      .update({ is_active: false })
      .eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["ad_platforms"] });
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
        setTgModal(false);
        refetchIntegrations();
      }
    } finally {
      setConnecting(false);
    }
  };

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

  // ─── Upload creative ───────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const ext = uploadFile.name.split(".").pop();
      const path = `creatives/${user.id}/${Date.now()}.${ext}`;
      let imageUrl: string | undefined;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("content-images")
        .upload(path, uploadFile, { contentType: uploadFile.type });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("content-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      await supabase.from("ad_creatives").insert({
        user_id: user.id,
        platform: uploadPlatform,
        format: "image",
        title: uploadTitle || uploadFile.name.split(".")[0],
        image_url: imageUrl,
        status: "draft",
        ai_generated: false,
        ctr: 0,
        impressions: 0,
        clicks: 0,
        is_winner: false,
      });
      queryClient.invalidateQueries({ queryKey: ["ad_creatives"] });
      setUploadModal(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadTitle("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Create report ─────────────────────────────────────────────────────────
  const handleCreateReport = async () => {
    if (!reportTitle || !reportStart || !reportEnd) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      await supabase.from("ad_reports").insert({
        user_id: user.id,
        title: reportTitle,
        period_start: reportStart,
        period_end: reportEnd,
        type: reportType,
        status: "draft",
        total_spend: 0,
        total_revenue: 0,
        total_roas: 0,
        total_leads: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["ad_reports"] });
      setCreateReportModal(false);
      setReportTitle("");
      setReportStart("");
      setReportEnd("");
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
  };

  // ─── Old campaign helpers ──────────────────────────────────────────────────
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
  };
  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setErr("");
    setShowForm(true);
  };
  const startEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      project_id: c.project_id,
      goal: c.goal || "",
      status: c.status,
      budget_total: c.budget_total ? String(c.budget_total) : "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 10) : "",
    });
    setEditingId(c.id);
    setErr("");
    setShowForm(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.project_id) {
      setErr("Укажите название и проект");
      return;
    }
    if (editingId) updateMutation.mutate({ id: editingId, v: form });
    else createMutation.mutate(form);
  };

  const list = campaigns;
  const activeCount = list.filter((c) => c.status === "running").length;
  const totalBudget = list.reduce((s, c) => s + (c.budget_total || 0), 0);
  const rois = list.map(roiOf).filter((r): r is number => r != null);
  const avgRoi = rois.length
    ? Math.round(rois.reduce((s, r) => s + r, 0) / rois.length)
    : null;
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const saving = createMutation.isPending || updateMutation.isPending;

  const dSpent = Number(res.budget_spent) || 0;
  const dTotal = detailCamp?.budget_total || 0;
  const dPct =
    dTotal > 0 ? Math.min(100, Math.round((dSpent / dTotal) * 100)) : 0;
  const dRev = Number(res.revenue) || 0;
  const dCust = Number(res.customers) || 0;
  const dRoi = dSpent > 0 ? Math.round(((dRev - dSpent) / dSpent) * 100) : null;
  const dCac = dCust > 0 ? Math.round(dSpent / dCust) : null;
  const dLtv = dCust > 0 ? Math.round(dRev / dCust) : null;
  const dRatio =
    dCac && dCac > 0 && dLtv != null ? (dLtv / dCac).toFixed(1) : null;

  const connectedAdKeys = adPlatforms
    .filter((p) => p.is_active)
    .map((p) => p.platform_key);
  const availableAdPlatforms = Object.entries(PLATFORM_META).filter(
    ([key]) => !connectedAdKeys.includes(key),
  );
  const tgChannels = integrations.filter((i) => i.platform === "telegram");
  const igChannels = integrations.filter((i) => i.platform === "instagram");

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="h-11 border-b border-line px-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-panel">
        <p className="text-[11px] text-tx-3">
          Маркетинг / <span className="text-tx-2 font-medium">Кампании</span>
        </p>
        <div className="flex gap-2">
          {activeTab === "campaigns" && (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.4} /> Новая кампания
            </button>
          )}
          {activeTab === "ad_campaigns" && (
            <button
              onClick={() => {
                setShowWizard(true);
                setWizardStep(0);
              }}
              className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.4} /> Новая рекламная кампания
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 pt-4 pb-0 border-b border-line bg-panel flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium rounded-t-[8px] border-b-2 transition-colors cursor-pointer ${activeTab === tab.key ? "border-accent text-accent bg-accent-dim" : "border-transparent text-tx-3 hover:text-tx-1 hover:bg-hover"}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* ══════════ TAB: КОНТЕНТ-КАМПАНИИ ══════════ */}
        {activeTab === "campaigns" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-tx-1">
                Контент-кампании
              </h1>
              <p className="text-[12px] text-tx-2 mt-0.5">
                Объединяй посты под одной целью и отслеживай результат
              </p>
            </div>

            {list.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    l: "Кампаний",
                    v: String(list.length),
                    s: `${activeCount} активных`,
                  },
                  { l: "Активных", v: String(activeCount), s: "прямо сейчас" },
                  {
                    l: "Бюджет",
                    v: `$${fmtMoney(totalBudget)}`,
                    s: "суммарно",
                  },
                  {
                    l: "Средний ROI",
                    v: avgRoi != null ? `${avgRoi}%` : "—",
                    s: "по кампаниям",
                    accent: true,
                  },
                ].map((k) => (
                  <div key={k.l} className="ui-surface px-4 py-3">
                    <p className="ui-label mb-2">{k.l}</p>
                    <p
                      className={`ui-num text-[22px] font-semibold leading-none ${(k as any).accent ? "text-pos" : "text-tx-1"}`}
                    >
                      {k.v}
                    </p>
                    <p className="text-[10px] text-tx-3 mt-1">{k.s}</p>
                  </div>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 ui-surface animate-pulse" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="ui-surface flex flex-col items-center text-center py-14 px-6">
                <div className="w-10 h-10 rounded-[10px] bg-chip flex items-center justify-center mb-3">
                  <Megaphone
                    size={18}
                    className="text-tx-3"
                    strokeWidth={1.6}
                  />
                </div>
                <p className="text-[13px] font-medium text-tx-1 mb-1">
                  Пока нет кампаний
                </p>
                <p className="text-[11px] text-tx-3 max-w-[280px] leading-relaxed mb-4">
                  Создай первую кампанию — задай цель, добавь посты и отслеживай
                  ROI
                </p>
                <button
                  onClick={startCreate}
                  className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
                >
                  <Plus size={13} /> Создать первую кампанию
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((c) => {
                  const roi = roiOf(c);
                  const spent = c.budget_spent || 0;
                  const total = c.budget_total || 0;
                  const pct =
                    total > 0
                      ? Math.min(100, Math.round((spent / total) * 100))
                      : 0;
                  const st = STATUS_META[c.status] || STATUS_META.ready;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setDetailCamp(c)}
                      className="ui-surface overflow-hidden cursor-pointer hover:border-line-strong transition-colors group"
                    >
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-[13px] font-medium text-tx-1">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                              />
                              {st.label}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(c);
                              }}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-hover cursor-pointer transition-all"
                            >
                              <Pencil size={11} className="text-tx-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Удалить «${c.name}»?`))
                                  deleteMutation.mutate(c.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-hover cursor-pointer transition-all"
                            >
                              <Trash2 size={11} className="text-tx-3" />
                            </button>
                          </div>
                        </div>
                        {c.goal && (
                          <p className="text-[11px] text-tx-3 leading-relaxed mb-2">
                            {c.goal}
                          </p>
                        )}
                      </div>
                      <div className="px-4 pb-3 border-t border-line pt-3">
                        <div className="flex justify-between text-[10px] text-tx-3 mb-1.5">
                          <span>Прогресс бюджета</span>
                          <span className="font-medium text-tx-1">{pct}%</span>
                        </div>
                        <div className="h-1 bg-track rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="ui-label mb-0.5">Бюджет</p>
                            <p className="text-[13px] font-medium text-tx-1">
                              ${fmtMoney(total)}
                            </p>
                          </div>
                          <div>
                            <p className="ui-label mb-0.5">Срок</p>
                            <p className="text-[13px] font-medium text-tx-1">
                              {c.ends_at ? fmtDate(c.ends_at) : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="ui-label mb-0.5">ROI</p>
                            <p
                              className={`text-[13px] font-medium ${roi != null ? "text-pos" : "text-tx-3"}`}
                            >
                              {roi != null ? `+${roi}%` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div
                  onClick={startCreate}
                  className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-colors min-h-[160px]"
                >
                  <div className="w-8 h-8 rounded-[8px] bg-chip flex items-center justify-center mb-2">
                    <Plus size={16} className="text-tx-3" />
                  </div>
                  <p className="text-[12px] font-medium text-tx-1 mb-1">
                    Создать кампанию
                  </p>
                  <p className="text-[10px] text-tx-3">
                    Задай цель, бюджет и срок
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ TAB: РЕКЛАМА ══════════ */}
        {activeTab === "ad_campaigns" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-tx-1">
                Рекламные кампании
              </h1>
              <p className="text-[12px] text-tx-2 mt-0.5">
                Управление рекламными кабинетами и кампаниями
              </p>
            </div>

            {/* KPI strip */}
            {adCampaigns.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {[
                  {
                    l: "Расход",
                    v: fmt(
                      adCampaigns.reduce(
                        (s, c) => s + (c.budget_spent ?? 0),
                        0,
                      ),
                    ),
                  },
                  {
                    l: "CTR",
                    v: adCampaigns.length
                      ? `${(adCampaigns.reduce((s, c) => s + (c.ctr ?? 0), 0) / adCampaigns.length).toFixed(1)}%`
                      : "—",
                  },
                  {
                    l: "CPL",
                    v: fmt(
                      adCampaigns.length
                        ? adCampaigns.reduce((s, c) => s + (c.cpl ?? 0), 0) /
                            adCampaigns.length
                        : 0,
                    ),
                  },
                  {
                    l: "ROAS",
                    v:
                      adCampaigns.reduce(
                        (s, c) => s + (c.budget_spent ?? 0),
                        0,
                      ) > 0
                        ? `${Math.round((adCampaigns.reduce((s, c) => s + (c.revenue ?? 0), 0) / adCampaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0)) * 100)}%`
                        : "—",
                  },
                  {
                    l: "Заявок",
                    v: String(
                      adCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0),
                    ),
                  },
                ].map((k) => (
                  <div key={k.l} className="ui-surface px-4 py-3">
                    <p className="ui-label mb-2">{k.l}</p>
                    <p className="ui-num text-[20px] font-semibold text-tx-1">
                      {k.v}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {adCampaigns.length === 0 ? (
              <div className="ui-surface flex flex-col items-center text-center py-14 px-6">
                <div className="text-[40px] mb-3">📡</div>
                <p className="text-[13px] font-medium text-tx-1 mb-1">
                  Нет рекламных кампаний
                </p>
                <p className="text-[11px] text-tx-3 max-w-[280px] leading-relaxed mb-4">
                  Создайте первую рекламную кампанию с AI-генерацией креативов
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
                >
                  <Plus size={13} /> Создать кампанию
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {adCampaigns.map((c) => {
                  const st = AD_STATUS_META[c.status] ?? {
                    label: c.status,
                    color: "var(--tx-3)",
                  };
                  return (
                    <div
                      key={c.id}
                      onClick={() => setAdCampaignModal(c)}
                      className="ui-surface px-4 py-3 cursor-pointer hover:border-line-strong transition-colors flex items-center gap-4"
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: st.color,
                          flexShrink: 0,
                        }}
                      />
                      <div className="flex gap-1 flex-shrink-0">
                        {(c.platforms ?? []).slice(0, 3).map((pid: string) => {
                          const pm = PLATFORM_META[pid];
                          return pm ? (
                            <div
                              key={pid}
                              style={{
                                width: 22,
                                height: 16,
                                borderRadius: 3,
                                background: pm.color,
                                color: pm.textColor ?? "#fff",
                                fontSize: 8,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {pm.abbr}
                            </div>
                          ) : null;
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-tx-1 truncate">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-tx-3 mt-0.5">
                          {c.goal ?? ""}
                        </p>
                      </div>
                      <div className="flex gap-6 flex-shrink-0">
                        {[
                          { v: fmt(c.budget_spent ?? 0), l: "расход" },
                          {
                            v: c.ctr > 0 ? `${c.ctr.toFixed(1)}%` : "—",
                            l: "CTR",
                          },
                          {
                            v: c.roas > 0 ? `${Math.round(c.roas)}%` : "—",
                            l: "ROAS",
                          },
                        ].map((m) => (
                          <div key={m.l} className="text-right">
                            <p className="text-[11px] font-medium text-tx-1">
                              {m.v}
                            </p>
                            <p className="text-[9px] text-tx-3 mt-0.5">{m.l}</p>
                          </div>
                        ))}
                      </div>
                      <span
                        className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-chip"
                        style={{ color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════ TAB: КРЕАТИВЫ ══════════ */}
        {activeTab === "creatives" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-tx-1">
                  Креативы
                </h1>
                <p className="text-[12px] text-tx-2 mt-0.5">
                  {adCreatives.length} материалов
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => setUploadModal(true)}
                  className="inline-flex items-center gap-1.5 border border-line rounded-[7px] px-3 py-1.5 text-[11px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  ↑ Загрузить
                </button>
                <button className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer">
                  ✦ AI сгенерировать
                </button>
              </div>
            </div>

            {adCreatives.length === 0 ? (
              <div className="ui-surface flex flex-col items-center text-center py-14">
                <div className="text-[36px] mb-3">⬡</div>
                <p className="text-[13px] font-medium text-tx-1 mb-1">
                  Нет креативов
                </p>
                <p className="text-[11px] text-tx-3 mb-4">
                  Загрузите файл или создайте рекламную кампанию
                </p>
                <button
                  onClick={() => setUploadModal(true)}
                  className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
                >
                  ↑ Загрузить первый
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {adCreatives.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCreativeDetail(c)}
                    className="ui-surface p-3 cursor-pointer hover:border-line-strong transition-colors"
                  >
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.title ?? ""}
                        className="w-full h-24 object-cover rounded-[6px] mb-2"
                      />
                    ) : (
                      <div
                        className="w-full h-24 rounded-[6px] mb-2 flex items-center justify-center text-[26px]"
                        style={{
                          background: `linear-gradient(135deg, ${PLATFORM_META[c.platform]?.color ?? "#333"}, #111)`,
                        }}
                      >
                        {c.platform?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="text-[11px] font-medium text-tx-1 truncate mb-1">
                      {c.title ?? "Без названия"}
                    </p>
                    <p className="text-[9px] text-tx-3 mb-2">
                      {c.platform} · {c.format}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip ${c.status === "active" ? "text-pos" : "text-tx-3"}`}
                      >
                        {(
                          {
                            active: "Активен",
                            draft: "Черновик",
                            paused: "Пауза",
                            winner: "Победитель",
                            failed: "Ошибка",
                          } as Record<string, string>
                        )[c.status] ?? c.status}
                      </span>
                      {c.ctr > 0 && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-pos">
                          CTR {c.ctr.toFixed(1)}%
                        </span>
                      )}
                      {c.ai_generated && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-tx-2">
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div
                  onClick={() => setUploadModal(true)}
                  className="border border-dashed border-line hover:border-line-strong rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[160px]"
                >
                  <div className="text-[28px] text-tx-3 mb-2">+</div>
                  <p className="text-[11px] text-tx-3">Загрузить</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ TAB: ОТЧЁТЫ ══════════ */}
        {activeTab === "reports" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-semibold text-tx-1">Отчёты</h1>
                <p className="text-[12px] text-tx-2 mt-0.5">
                  White-label · авто-отправка · AI текст
                </p>
              </div>
              <button
                onClick={() => setCreateReportModal(true)}
                className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
              >
                <Plus size={12} /> Создать отчёт
              </button>
            </div>

            {adReports.length === 0 ? (
              <div className="ui-surface flex flex-col items-center text-center py-14">
                <div className="text-[36px] mb-3">◫</div>
                <p className="text-[13px] font-medium text-tx-1 mb-1">
                  Нет отчётов
                </p>
                <p className="text-[11px] text-tx-3 mb-4">
                  Создайте первый отчёт для клиента
                </p>
                <button
                  onClick={() => setCreateReportModal(true)}
                  className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-4 py-2 text-[12px] font-medium cursor-pointer hover:opacity-90"
                >
                  <Plus size={13} /> Создать отчёт
                </button>
              </div>
            ) : (
              <div className="ui-surface overflow-hidden">
                {adReports.map((r, i) => (
                  <div
                    key={r.id}
                    onClick={() => setReportDetail(r)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-hover transition-colors ${i < adReports.length - 1 ? "border-b border-line" : ""}`}
                  >
                    <span className="text-[16px] flex-shrink-0">
                      {r.type === "weekly"
                        ? "📄"
                        : r.type === "monthly"
                          ? "📊"
                          : "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-tx-1">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-tx-3 mt-0.5">
                        {r.period_start} — {r.period_end}
                      </p>
                    </div>
                    <span
                      className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-chip ${r.status === "sent" ? "text-pos" : r.status === "live" ? "text-accent" : "text-tx-3"}`}
                    >
                      {(
                        {
                          sent: "Отправлен",
                          live: "Live",
                          draft: "Черновик",
                          scheduled: "Запланирован",
                        } as Record<string, string>
                      )[r.status] ?? r.status}
                    </span>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-tx-3 border border-line rounded-[5px] px-2 py-1 hover:bg-hover"
                    >
                      ↓ PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════ TAB: ПОДКЛЮЧЕНИЯ ══════════ */}
        {activeTab === "connect" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-tx-1">
                Подключения
              </h1>
              <p className="text-[12px] text-tx-2 mt-0.5">
                Рекламные кабинеты и социальные сети
              </p>
            </div>

            {/* Section switcher */}
            <div className="flex gap-1 p-1 bg-panel-2 rounded-[9px] w-fit border border-line">
              {[
                { k: "ad", l: "📡 Рекламные кабинеты" },
                { k: "social", l: "📱 Соцсети" },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={() => setConnectSection(s.k as any)}
                  className={`px-4 py-2 rounded-[7px] text-[12px] font-medium cursor-pointer transition-colors ${connectSection === s.k ? "bg-panel text-tx-1 shadow-sm border border-line" : "text-tx-3 hover:text-tx-1"}`}
                >
                  {s.l}
                </button>
              ))}
            </div>

            {/* Ad platforms */}
            {connectSection === "ad" && (
              <div>
                {adPlatforms.filter((p) => p.is_active).length > 0 && (
                  <>
                    <p className="ui-label mb-3">
                      Подключённые ·{" "}
                      {adPlatforms.filter((p) => p.is_active).length}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {adPlatforms
                        .filter((p) => p.is_active)
                        .map((p) => {
                          const meta = PLATFORM_META[p.platform_key];
                          const warn =
                            p.token_expires_at &&
                            new Date(p.token_expires_at) <
                              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                          return (
                            <div
                              key={p.id}
                              className={`ui-surface p-4 border ${warn ? "border-[#F59E0B]" : "border-[#3a7d6b]/40"}`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  style={{
                                    width: 28,
                                    height: 20,
                                    borderRadius: 4,
                                    background: p.color,
                                    color: meta?.textColor ?? "#fff",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {p.abbr}
                                </div>
                                <p className="text-[12px] font-medium text-tx-1 flex-1">
                                  {p.name}
                                </p>
                                <span
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${warn ? "bg-chip text-[#F59E0B]" : "bg-chip text-pos"}`}
                                >
                                  {warn ? "Обновить" : "Активен"}
                                </span>
                              </div>
                              {p.account_name && (
                                <p className="text-[10px] text-tx-3 mb-2">
                                  {p.account_name}
                                </p>
                              )}
                              {warn && p.token_expires_at && (
                                <p className="text-[9px] text-[#F59E0B] mb-2">
                                  ⚠ Истекает{" "}
                                  {new Date(
                                    p.token_expires_at,
                                  ).toLocaleDateString("ru")}
                                </p>
                              )}
                              <button
                                onClick={() => handleDisconnectAd(p.id)}
                                className="text-[10px] text-tx-3 border border-line rounded-[5px] px-2 py-1 hover:bg-hover cursor-pointer"
                              >
                                Отключить
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
                <p className="ui-label mb-3">Доступно</p>
                <div className="grid grid-cols-3 gap-3">
                  {availableAdPlatforms.map(([key, meta]) => (
                    <div key={key} className="ui-surface p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          style={{
                            width: 28,
                            height: 20,
                            borderRadius: 4,
                            background: meta.color,
                            color: meta.textColor ?? "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {meta.abbr}
                        </div>
                        <p className="text-[12px] font-medium text-tx-1">
                          {meta.name}
                        </p>
                      </div>
                      <button
                        onClick={() => setConnectModal(key)}
                        className="w-full py-1.5 bg-accent text-on-accent text-[11px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                      >
                        ⊕ Подключить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social channels */}
            {connectSection === "social" && (
              <div className="flex flex-col gap-4">
                {/* Telegram */}
                <div className="ui-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-line flex items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: "#0088CC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      TG
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-tx-1">
                        Telegram
                      </p>
                      <p className="text-[11px] text-tx-3">
                        {tgChannels.length} каналов подключено
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    {tgChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-3 bg-panel-2 border border-line rounded-[7px] px-3 py-2 mb-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-pos flex-shrink-0" />
                        <p className="text-[12px] font-medium text-tx-1 flex-1">
                          @{ch.channel_name}
                        </p>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-pos">
                          Активен
                        </span>
                      </div>
                    ))}
                    <p className="text-[11px] text-tx-3 mb-3 leading-relaxed">
                      Добавь бота{" "}
                      <strong className="text-tx-1">@{BOT_USERNAME}</strong> как
                      администратора канала, затем введи username
                    </p>
                    <button
                      onClick={() => setTgModal(true)}
                      className="inline-flex items-center gap-1.5 bg-accent text-on-accent rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
                    >
                      + Добавить канал
                    </button>
                  </div>
                </div>

                {/* Instagram */}
                <div className="ui-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-line flex items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: "#E1306C",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      IG
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-tx-1">
                        Instagram
                      </p>
                      <p className="text-[11px] text-tx-3">
                        {igChannels.length} аккаунтов подключено
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    {igChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-3 bg-panel-2 border border-line rounded-[7px] px-3 py-2 mb-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-pos flex-shrink-0" />
                        <p className="text-[12px] font-medium text-tx-1 flex-1">
                          @{ch.channel_name}
                        </p>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-pos">
                          Активен
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={connectInstagram}
                      style={{ background: "#E1306C", color: "#fff" }}
                      className="inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[11px] font-medium hover:opacity-90 cursor-pointer"
                    >
                      Подключить Instagram
                    </button>
                  </div>
                </div>

                {/* Coming soon */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "TikTok", color: "#000", abbr: "TT" },
                    { name: "ВКонтакте", color: "#0077FF", abbr: "VK" },
                  ].map((p) => (
                    <div key={p.name} className="ui-surface p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            background: p.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {p.abbr}
                        </div>
                        <p className="text-[13px] font-semibold text-tx-1">
                          {p.name}
                        </p>
                      </div>
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-chip text-tx-3">
                        Скоро
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Detail campaign modal (old) */}
      {detailCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setDetailCamp(null)}
          />
          <div className="relative w-full max-w-[600px] bg-panel border border-line rounded-[14px] flex flex-col max-h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="px-5 py-4 border-b border-line flex items-start justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[15px] font-semibold text-tx-1">
                    {detailCamp.name}
                  </p>
                  <span
                    className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[detailCamp.status]?.cls || "bg-chip text-tx-2"}`}
                  >
                    {STATUS_META[detailCamp.status]?.label}
                  </span>
                </div>
                <p className="text-[11px] text-tx-3">
                  {detailCamp.project?.name}
                  {detailCamp.ends_at
                    ? ` · до ${fmtDate(detailCamp.ends_at)}`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setDetailCamp(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer flex-shrink-0"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    l: "ROI",
                    v: dRoi != null ? `+${dRoi}%` : "—",
                    s: "прогноз",
                    green: dRoi != null,
                  },
                  {
                    l: "CAC",
                    v: dCac != null ? `$${fmtMoney(dCac)}` : "—",
                    s: "стоимость клиента",
                  },
                  {
                    l: "LTV",
                    v: dLtv != null ? `$${fmtMoney(dLtv)}` : "—",
                    s: "ценность клиента",
                  },
                  {
                    l: "LTV:CAC",
                    v: dRatio != null ? `${dRatio}×` : "—",
                    s: "хорошо ≥ 3×",
                  },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5"
                  >
                    <p className="ui-label mb-1.5">{m.l}</p>
                    <p
                      className={`text-[17px] font-semibold leading-none ${(m as any).green ? "text-pos" : "text-tx-1"}`}
                    >
                      {m.v}
                    </p>
                    <p className="text-[9px] text-tx-3 mt-1">{m.s}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="font-medium text-tx-1">Бюджет освоен</span>
                  <span className="text-tx-3">
                    ${fmtMoney(dSpent)} из ${fmtMoney(dTotal)}
                  </span>
                </div>
                <div className="h-1.5 bg-track rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${dPct}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="ui-label mb-2">Результаты</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "budget_spent", label: "Потрачено ($)" },
                    { k: "revenue", label: "Выручка ($)" },
                    { k: "leads", label: "Лиды" },
                    { k: "customers", label: "Клиенты" },
                  ].map((f) => (
                    <div key={f.k}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                        {f.label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={(res as any)[f.k]}
                        onChange={(e) =>
                          setRes((p) => ({ ...p, [f.k]: e.target.value }))
                        }
                        placeholder="0"
                        className={inp}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-line flex items-center gap-2 flex-shrink-0">
              {savedFlash && (
                <span className="text-[11px] text-pos mr-auto">Сохранено!</span>
              )}
              <button
                onClick={() => setDetailCamp(null)}
                className="px-4 py-2 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
              >
                Закрыть
              </button>
              <button
                onClick={() => saveResults.mutate()}
                disabled={saveResults.isPending}
                className="flex-1 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Save size={13} strokeWidth={1.6} />
                {saveResults.isPending ? "Сохранение…" : "Сохранить результаты"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ad campaign detail modal */}
      {adCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setAdCampaignModal(null)}
          />
          <div className="relative w-full max-w-[640px] bg-panel border border-line rounded-[14px] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="px-5 py-4 border-b border-line flex items-start justify-between sticky top-0 bg-panel z-10">
              <div>
                <p className="text-[15px] font-semibold text-tx-1">
                  {adCampaignModal.name}
                </p>
                <p className="text-[11px] text-tx-3 mt-0.5">
                  {adCampaignModal.goal}
                </p>
              </div>
              <button
                onClick={() => setAdCampaignModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer flex-shrink-0"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Расход", v: fmt(adCampaignModal.budget_spent ?? 0) },
                  {
                    l: "CTR",
                    v:
                      adCampaignModal.ctr > 0
                        ? `${adCampaignModal.ctr.toFixed(1)}%`
                        : "—",
                  },
                  {
                    l: "CPL",
                    v: adCampaignModal.cpl > 0 ? fmt(adCampaignModal.cpl) : "—",
                  },
                  {
                    l: "ROAS",
                    v:
                      adCampaignModal.roas > 0
                        ? `${Math.round(adCampaignModal.roas)}%`
                        : "—",
                  },
                ].map((k) => (
                  <div
                    key={k.l}
                    className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5"
                  >
                    <p className="ui-label mb-1.5">{k.l}</p>
                    <p className="text-[17px] font-semibold text-tx-1">{k.v}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-panel-2 border border-line rounded-[8px] p-3">
                  <p className="ui-label mb-2">Показатели</p>
                  {[
                    [
                      "Показов",
                      (adCampaignModal.impressions ?? 0).toLocaleString("ru"),
                    ],
                    [
                      "Кликов",
                      (adCampaignModal.clicks ?? 0).toLocaleString("ru"),
                    ],
                    ["Заявок", String(adCampaignModal.leads ?? 0)],
                    ["Продаж", String(adCampaignModal.sales ?? 0)],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between text-[11px] py-1 border-b border-line"
                    >
                      <span className="text-tx-3">{l}</span>
                      <span className="font-medium text-tx-1">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-panel-2 border border-line rounded-[8px] p-3">
                  <p className="ui-label mb-2">Платформы</p>
                  {(adCampaignModal.platforms ?? []).map((pid: string) => {
                    const pm = PLATFORM_META[pid];
                    return pm ? (
                      <div
                        key={pid}
                        className="flex items-center gap-2 py-1 border-b border-line"
                      >
                        <div
                          style={{
                            width: 22,
                            height: 16,
                            borderRadius: 3,
                            background: pm.color,
                            color: pm.textColor ?? "#fff",
                            fontSize: 8,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {pm.abbr}
                        </div>
                        <span className="text-[11px] text-tx-1">{pm.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setShowWizard(false)}
          />
          <div className="relative w-full max-w-[720px] bg-panel border border-line rounded-[14px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-panel z-10">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Новая рекламная кампания
              </h2>
              <button
                onClick={() => setShowWizard(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="p-5">
              {/* Step bar */}
              <div className="flex gap-2 mb-6">
                {["Цель", "Платформы", "Креативы", "Запуск"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <button
                      onClick={() => i < wizardStep && setWizardStep(i)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${wizardStep === i ? "bg-accent text-on-accent" : wizardStep > i ? "bg-chip text-pos cursor-pointer" : "bg-chip text-tx-3"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${wizardStep === i ? "bg-white/20" : wizardStep > i ? "bg-pos text-white" : "bg-panel-2 text-tx-3 border border-line"}`}
                      >
                        {wizardStep > i ? "✓" : i + 1}
                      </div>
                      {s}
                    </button>
                    {i < 3 && <span className="text-tx-3 text-[10px]">›</span>}
                  </div>
                ))}
              </div>

              {wizError && (
                <p className="text-[11px] text-neg bg-panel-2 border border-line rounded-[8px] px-3 py-2 mb-4">
                  {wizError}
                </p>
              )}

              {/* Step 0 */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                      Название *
                    </label>
                    <input
                      value={wizName}
                      onChange={(e) => setWizName(e.target.value)}
                      placeholder="Например: Ramadan акция 2026"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-2">
                      Цель кампании
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        "Продажи / заявки",
                        "Трафик на сайт",
                        "Охват",
                        "Подписчики",
                      ].map((g) => (
                        <button
                          key={g}
                          onClick={() => setWizGoal(g)}
                          className={`px-3 py-1.5 rounded-[7px] text-[11px] border cursor-pointer ${wizGoal === g ? "bg-accent text-on-accent border-accent" : "border-line text-tx-2 hover:bg-hover"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                      О продукте
                    </label>
                    <textarea
                      value={wizProduct}
                      onChange={(e) => setWizProduct(e.target.value)}
                      placeholder="Опишите продукт..."
                      className={`${inp} resize-none h-16`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                      Бюджет (₽)
                    </label>
                    <input
                      type="number"
                      value={wizBudget}
                      onChange={(e) => setWizBudget(e.target.value)}
                      placeholder="Например: 150000"
                      className={inp}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (!wizName.trim()) {
                          setWizError("Введите название");
                          return;
                        }
                        setWizError("");
                        setWizardStep(1);
                      }}
                      className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                    >
                      Далее →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p className="text-[12px] text-tx-2">
                    Выберите платформы для размещения рекламы
                  </p>
                  <div className="space-y-2">
                    {Object.entries(PLATFORM_META).map(([key, meta]) => {
                      const sel = wizPlatforms.has(key);
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            const n = new Set(wizPlatforms);
                            sel ? n.delete(key) : n.add(key);
                            setWizPlatforms(n);
                          }}
                          className={`flex items-center gap-3 p-3 border rounded-[9px] cursor-pointer transition-colors ${sel ? "border-[#3a7d6b]/50 bg-chip" : "border-line hover:border-line-strong"}`}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: `1.5px solid ${sel ? "currentColor" : "#ccc"}`,
                              background: sel ? "currentColor" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: sel ? "#fff" : "transparent",
                              fontSize: 10,
                              flexShrink: 0,
                            }}
                          >
                            ✓
                          </div>
                          <div
                            style={{
                              width: 22,
                              height: 16,
                              borderRadius: 3,
                              background: meta.color,
                              color: meta.textColor ?? "#fff",
                              fontSize: 8,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {meta.abbr}
                          </div>
                          <p className="text-[12px] font-medium text-tx-1">
                            {meta.name}
                          </p>
                          {connectedAdKeys.includes(key) && (
                            <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-chip text-pos">
                              Подключён
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(0)}
                      className="px-4 py-2 border border-line text-[12px] text-tx-2 rounded-[7px] hover:bg-hover cursor-pointer"
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={() => {
                        if (wizPlatforms.size === 0) {
                          setWizError("Выберите платформу");
                          return;
                        }
                        setWizError("");
                        setWizardStep(2);
                      }}
                      className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                    >
                      Далее →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-[12px] text-tx-2">
                    Выберите концепты для каждой платформы
                  </p>
                  {[...wizPlatforms].map((platformKey) => {
                    const pm = PLATFORM_META[platformKey];
                    return pm ? (
                      <div key={platformKey}>
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            style={{
                              width: 22,
                              height: 16,
                              borderRadius: 3,
                              background: pm.color,
                              color: pm.textColor ?? "#fff",
                              fontSize: 8,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {pm.abbr}
                          </div>
                          <p className="text-[12px] font-semibold text-tx-1">
                            {pm.name}
                          </p>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {CREATIVE_VARIANTS.map((v, i) => {
                            const cId = `${platformKey}-${i}`;
                            const sel = wizCreatives.has(cId);
                            return (
                              <div
                                key={cId}
                                onClick={() => {
                                  const n = new Set(wizCreatives);
                                  sel ? n.delete(cId) : n.add(cId);
                                  setWizCreatives(n);
                                }}
                                className={`p-2 border rounded-[8px] cursor-pointer transition-colors ${sel ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"}`}
                              >
                                <div
                                  className="h-12 rounded-[5px] flex items-center justify-center text-[18px] mb-2"
                                  style={{
                                    background: `linear-gradient(135deg, ${pm.color}, #111)`,
                                  }}
                                >
                                  {v.emoji}
                                </div>
                                <p className="text-[9px] font-medium text-tx-1 leading-tight mb-1">
                                  {v.title}
                                </p>
                                <p className="text-[8px] text-tx-3">{v.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 border border-line text-[12px] text-tx-2 rounded-[7px] hover:bg-hover cursor-pointer"
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-5 py-2 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                    >
                      Далее →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-panel-2 border border-line rounded-[9px] p-4 space-y-2">
                    {[
                      { l: "Название", v: wizName },
                      { l: "Цель", v: wizGoal },
                      {
                        l: "Платформы",
                        v:
                          [...wizPlatforms]
                            .map((k) => PLATFORM_META[k]?.name ?? k)
                            .join(", ") || "Не выбраны",
                      },
                      {
                        l: "Бюджет",
                        v: wizBudget
                          ? `₽${Number(wizBudget).toLocaleString("ru")}`
                          : "Не указан",
                      },
                      {
                        l: "Креативы",
                        v: `${wizCreatives.size} вариантов выбрано`,
                      },
                    ].map((row) => (
                      <div
                        key={row.l}
                        className="flex gap-3 text-[11px] py-1.5 border-b border-line"
                      >
                        <span className="w-24 text-tx-3 flex-shrink-0">
                          {row.l}
                        </span>
                        <span className="font-medium text-tx-1">{row.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 border border-line text-[12px] text-tx-2 rounded-[7px] hover:bg-hover cursor-pointer"
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={launchAdCampaign}
                      disabled={wizLaunching}
                      className="flex-1 ml-3 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      {wizLaunching ? "⟳ Создаю..." : "🚀 Запустить кампанию"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit old campaign modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={closeForm}
          />
          <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                {editingId ? "Редактировать кампанию" : "Новая кампания"}
              </h2>
              <button
                onClick={closeForm}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Название
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Например: Запуск продукта"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Проект
                  </label>
                  <SelectField
                    value={form.project_id}
                    onChange={(v) => setForm((p) => ({ ...p, project_id: v }))}
                    options={projectOptions}
                    placeholder="Выберите проект"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Статус
                  </label>
                  <SelectField
                    value={form.status}
                    onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                    options={STATUS_OPTIONS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Цель
                </label>
                <input
                  value={form.goal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, goal: e.target.value }))
                  }
                  placeholder="Что хотим получить"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Бюджет ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_total}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, budget_total: e.target.value }))
                  }
                  placeholder="0"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Начало
                  </label>
                  <input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, starts_at: e.target.value }))
                    }
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    Конец
                  </label>
                  <input
                    type="date"
                    value={form.ends_at}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, ends_at: e.target.value }))
                    }
                    className={inp}
                  />
                </div>
              </div>
              {err && <p className="text-[11px] text-neg">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Сохранение…" : editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect ad platform modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setConnectModal(null)}
          />
          <div className="relative w-full max-w-[420px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Подключить {PLATFORM_META[connectModal]?.name}
              </h2>
              <button
                onClick={() => setConnectModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] text-tx-3 leading-relaxed bg-panel-2 border border-line rounded-[8px] p-3">
                Введите токен доступа от рекламного кабинета. Токен можно
                получить в настройках API платформы.
              </p>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Access Token
                </label>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Вставьте токен..."
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  ID кабинета (необязательно)
                </label>
                <input
                  value={accountIdInput}
                  onChange={(e) => setAccountIdInput(e.target.value)}
                  placeholder="account_12345"
                  className={inp}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConnectModal(null)}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConnectAd}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                >
                  Подключить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram modal */}
      {tgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setTgModal(false)}
          />
          <div className="relative w-full max-w-[420px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Добавить Telegram канал
              </h2>
              <button
                onClick={() => setTgModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-panel-2 border border-line rounded-[8px] p-3 text-[11px] text-tx-3 leading-relaxed">
                1. Зайди в настройки канала → Администраторы
                <br />
                2. Добавь <strong className="text-tx-1">@{BOT_USERNAME}</strong>
                <br />
                3. Дай права на публикацию сообщений
                <br />
                4. Введи username канала ниже
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Username канала
                </label>
                <input
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="@mychannel"
                  onKeyDown={(e) => e.key === "Enter" && connectTelegram()}
                  className={inp}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTgModal(false)}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={connectTelegram}
                  disabled={connecting}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {connecting ? "..." : "Добавить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload creative modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => {
              setUploadModal(false);
              setUploadFile(null);
              setUploadPreview(null);
            }}
          />
          <div className="relative w-full max-w-[440px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Загрузить креатив
              </h2>
              <button
                onClick={() => {
                  setUploadModal(false);
                  setUploadFile(null);
                  setUploadPreview(null);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-2">
                  Платформа
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(PLATFORM_META).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setUploadPlatform(key)}
                      className={`px-2 py-1 rounded-[6px] text-[10px] border cursor-pointer transition-colors ${uploadPlatform === key ? "bg-accent text-on-accent border-accent" : "border-line text-tx-3 hover:bg-hover"}`}
                    >
                      {meta.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Название
                </label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Название..."
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Файл *
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                {uploadPreview ? (
                  <div className="relative">
                    <img
                      src={uploadPreview}
                      alt=""
                      className="w-full h-36 object-cover rounded-[8px]"
                    />
                    <button
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-[11px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-8 border border-dashed border-line hover:border-line-strong rounded-[8px] flex flex-col items-center gap-2 cursor-pointer text-tx-3 hover:bg-hover transition-colors"
                  >
                    <span className="text-[20px]">📁</span>
                    <span className="text-[11px]">
                      Нажмите чтобы выбрать файл
                    </span>
                    <span className="text-[9px] text-tx-3">
                      JPG, PNG, MP4 до 50MB
                    </span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUploadModal(false);
                    setUploadFile(null);
                    setUploadPreview(null);
                  }}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Загрузка..." : "↑ Загрузить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creative detail modal */}
      {creativeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setCreativeDetail(null)}
          />
          <div className="relative w-full max-w-[500px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                {creativeDetail.title ?? "Креатив"}
              </h2>
              <button
                onClick={() => setCreativeDetail(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            {creativeDetail.image_url && (
              <img
                src={creativeDetail.image_url}
                alt=""
                className="w-full h-48 object-cover rounded-[9px] mb-4"
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Платформа", creativeDetail.platform],
                ["Формат", creativeDetail.format],
                [
                  "CTR",
                  creativeDetail.ctr > 0
                    ? `${creativeDetail.ctr.toFixed(1)}%`
                    : "—",
                ],
                [
                  "Показов",
                  creativeDetail.impressions > 0
                    ? creativeDetail.impressions.toLocaleString("ru")
                    : "—",
                ],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5"
                >
                  <p className="ui-label mb-1">{l}</p>
                  <p className="text-[13px] font-medium text-tx-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create report modal */}
      {createReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setCreateReportModal(false)}
          />
          <div className="relative w-full max-w-[420px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                Новый отчёт
              </h2>
              <button
                onClick={() => setCreateReportModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Название
                </label>
                <input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Еженедельный отчёт..."
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                  Тип
                </label>
                <SelectField
                  value={reportType}
                  onChange={setReportType}
                  options={[
                    { value: "weekly", label: "Еженедельный" },
                    { value: "monthly", label: "Месячный" },
                    { value: "custom", label: "Произвольный" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    С
                  </label>
                  <input
                    type="date"
                    value={reportStart}
                    onChange={(e) => setReportStart(e.target.value)}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-tx-3 mb-1">
                    По
                  </label>
                  <input
                    type="date"
                    value={reportEnd}
                    onChange={(e) => setReportEnd(e.target.value)}
                    className={inp}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateReportModal(false)}
                  className="flex-1 py-2.5 border border-line rounded-[7px] text-[12px] text-tx-2 hover:bg-hover cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateReport}
                  className="flex-1 py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[7px] hover:opacity-90 cursor-pointer"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report detail modal */}
      {reportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setReportDetail(null)}
          />
          <div className="relative w-full max-w-[580px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-tx-1">
                {reportDetail.title}
              </h2>
              <button
                onClick={() => setReportDetail(null)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer"
              >
                <X size={14} className="text-tx-3" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { l: "Расход", v: fmt(reportDetail.total_spend) },
                { l: "Доход", v: fmt(reportDetail.total_revenue) },
                {
                  l: "ROAS",
                  v:
                    reportDetail.total_roas > 0
                      ? `${Math.round(reportDetail.total_roas)}%`
                      : "—",
                },
                { l: "Заявок", v: String(reportDetail.total_leads) },
              ].map((k) => (
                <div
                  key={k.l}
                  className="bg-panel-2 border border-line rounded-[8px] px-3 py-2.5"
                >
                  <p className="ui-label mb-1">{k.l}</p>
                  <p className="text-[17px] font-semibold text-tx-1">{k.v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-tx-3">
              Период: {reportDetail.period_start} — {reportDetail.period_end}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
