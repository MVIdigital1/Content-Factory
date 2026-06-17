"use client";

/**
 * Страница "Проекты" — список всех проектов с агрегированной статистикой.
 * Путь в приложении: app/projects/page.tsx
 *
 * Подключено к реальным таблицам:
 *  - projects  (основные данные проекта)
 *  - contents  (материалы → считаем "Материалов", "N постов" и спарклайн за 6 мес.)
 *
 * ⚠️ Сделано по аналогии, проверь под свою схему:
 *  - campaigns  (project_id, status, created_at) → "Кампаний" / "Активных кампаний"
 *  - ai_workers (project_id) → "Агентов" / "AI-агентов"
 *  - участники проекта — пока показываем только владельца (заглушка),
 *    подключи свою таблицу project_members, когда она будет готова.
 * Если таблицы называются иначе — просто поправь .from(...), запросы
 * безопасно вернут 0 при ошибке и страница не упадёт.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Search, FolderOpen, Megaphone, FileText, Bot, type LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Цвета проектов: подбираются по id проекта, поэтому совпадают с цветом
// аватара на детальной странице проекта (там используется та же функция).
// Когда в БД появится своё поле цвета — замени hashColor(p.id) на project.color.
// ---------------------------------------------------------------------------
const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#e11d48", // rose
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
];
function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

interface ProjectRow {
  id: string;
  name: string;
  niche?: string | null;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  [key: string]: any;
}

interface ProjectCardData {
  id: string;
  name: string;
  niche: string | null;
  description: string | null;
  color: string;
  campaignsCount: number;
  materialsCount: number;
  agentsCount: number;
  activity: number[];
  postsCount: number;
  members: { id: string; initial: string; bg: string }[];
  timestamp: string;
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return minutes <= 1 ? "сейчас" : `${minutes}м назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

// ---------------------------------------------------------------------------
// Мини-компоненты
// ---------------------------------------------------------------------------

function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const w = 160;
  const h = 36;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * stepX, h - ((v - min) / range) * (h - 4) - 2]);
  const linePoints = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;
  const gradId = `spark-${id}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 block" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <div className="bg-panel border border-line rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-panel-2 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-tx-2" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-tx-3 truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-2xl font-bold text-tx-1 leading-none">{value}</p>
          {typeof delta === "number" && delta > 0 && (
            <span className="text-[11px] font-medium text-emerald-700">↗ +{delta}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricChip({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="bg-panel-2 rounded-lg py-2.5 flex flex-col items-center text-center">
      <Icon size={14} className="text-tx-3" strokeWidth={1.8} />
      <p className="text-base font-bold text-tx-1 leading-none mt-1.5">{value}</p>
      <p className="text-[11px] text-tx-3 mt-1">{label}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group bg-panel border border-line rounded-xl p-5 flex flex-col hover:border-line-strong hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-base flex-shrink-0"
          style={{ background: project.color }}
        >
          {project.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[15px] font-semibold text-tx-1 leading-tight truncate">
            {project.name}
          </h3>
          <p className="text-xs text-tx-3 mt-0.5">{project.niche || "Без ниши"}</p>
        </div>
      </div>

      <p className="text-[13px] text-tx-2 mt-3 leading-relaxed line-clamp-2 min-h-[2.6em]">
        {project.description || "Без описания"}
      </p>

      <div className="border-t border-line mt-4 pt-3.5">
        <p className="text-[11px] text-tx-3 mb-2">Активность за 6 мес.</p>
        {project.postsCount > 0 ? (
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <Sparkline data={project.activity} color={project.color} id={project.id} />
            </div>
            <span className="text-xs text-tx-3 whitespace-nowrap pb-0.5">
              {project.postsCount} постов
            </span>
          </div>
        ) : (
          <p className="text-xs text-tx-3 h-9 flex items-center">Нет активности</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <MetricChip icon={Megaphone} value={project.campaignsCount} label="Кампаний" />
        <MetricChip icon={FileText} value={project.materialsCount} label="Материалов" />
        <MetricChip icon={Bot} value={project.agentsCount} label="Агентов" />
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          {project.members.map((m) => (
            <div
              key={m.id}
              title={m.initial}
              className="w-6 h-6 rounded-full border-2 border-panel flex items-center justify-center text-[10px] font-semibold text-white"
              style={{ background: m.bg }}
            >
              {m.initial}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-tx-3">{formatRelativeTime(project.timestamp)}</span>
          <span className="text-xs font-medium text-tx-1 group-hover:text-accent transition-colors">
            Открыть →
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewProjectCard() {
  return (
    <Link
      href="/projects/new"
      className="bg-panel border border-line rounded-xl flex flex-col items-center justify-center text-center p-8 hover:border-accent transition-colors group min-h-[220px]"
    >
      <div className="w-11 h-11 rounded-full bg-panel-2 flex items-center justify-center mb-3 group-hover:bg-accent-dim transition-colors">
        <span className="text-xl text-tx-2 group-hover:text-accent transition-colors leading-none">
          +
        </span>
      </div>
      <p className="text-sm font-semibold text-tx-1">Новый проект</p>
      <p className="text-xs text-tx-3 mt-1 max-w-[220px]">
        Создайте проект для управления контентом и кампаниями
      </p>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-panel border border-line rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-panel-2" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 bg-panel-2 rounded" />
          <div className="h-2.5 w-1/3 bg-panel-2 rounded" />
        </div>
      </div>
      <div className="h-3 w-full bg-panel-2 rounded mt-4" />
      <div className="h-3 w-4/5 bg-panel-2 rounded mt-2" />
      <div className="h-9 bg-panel-2 rounded-lg mt-4" />
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="h-16 bg-panel-2 rounded-lg" />
        <div className="h-16 bg-panel-2 rounded-lg" />
        <div className="h-16 bg-panel-2 rounded-lg" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Страница
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const supabase = createClient();
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as ProjectRow[];
    },
  });

  // Один запрос на все проекты сразу (вместо N+1) — считаем материалы,
  // "N постов" и спарклайн за 6 мес. на клиенте.
  const { data: contentsRaw = [] } = useQuery({
    queryKey: ["projects-contents-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("project_id, created_at");
      if (error) return [];
      return data || [];
    },
  });

  const { data: campaignsRaw = [] } = useQuery({
    queryKey: ["projects-campaigns-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("project_id, status, created_at");
      if (error) return [];
      return data || [];
    },
  });

  const { data: agentsRaw = [] } = useQuery({
    queryKey: ["projects-agents-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_workers").select("project_id");
      if (error) return [];
      return data || [];
    },
  });

  const cards = useMemo<ProjectCardData[]>(() => {
    return projects.map((p) => {
      const myContents = contentsRaw.filter((c: any) => c.project_id === p.id);
      const myCampaigns = campaignsRaw.filter((c: any) => c.project_id === p.id);
      const myAgents = agentsRaw.filter((a: any) => a.project_id === p.id);

      const buckets = Array.from({ length: 6 }, (_, idx) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - (5 - idx));
        const y = d.getFullYear();
        const m = d.getMonth();
        return myContents.filter((c: any) => {
          const cd = new Date(c.created_at);
          return cd.getFullYear() === y && cd.getMonth() === m;
        }).length;
      });

      return {
        id: p.id,
        name: p.name,
        niche: p.niche ?? null,
        description: p.description ?? null,
        color: hashColor(p.id),
        campaignsCount: myCampaigns.length,
        materialsCount: myContents.length,
        agentsCount: myAgents.length,
        activity: buckets,
        postsCount: myContents.length,
        members: [{ id: `${p.id}-owner`, initial: "J", bg: "#1a1a1a" }],
        timestamp: p.updated_at || p.created_at,
      };
    });
  }, [projects, contentsRaw, campaignsRaw, agentsRaw]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      `${c.name} ${c.niche ?? ""} ${c.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [cards, search]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeCampaigns = campaignsRaw.filter((c: any) => !c.status || c.status === "active").length;
    const newCampaigns = campaignsRaw.filter(
      (c: any) => c.created_at && new Date(c.created_at).getTime() > weekAgo,
    ).length;
    const newMaterials = contentsRaw.filter(
      (c: any) => c.created_at && new Date(c.created_at).getTime() > weekAgo,
    ).length;
    return {
      totalProjects: projects.length,
      activeCampaigns,
      newCampaigns,
      totalMaterials: contentsRaw.length,
      newMaterials,
      totalAgents: agentsRaw.length,
    };
  }, [projects, campaignsRaw, contentsRaw, agentsRaw]);

  return (
    <div className="p-6">
      <p className="text-sm text-tx-3 mb-1">Маркетинг / Проекты</p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-[26px] font-bold text-tx-1">Проекты</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-3"
              strokeWidth={1.8}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск проектов..."
              className="pl-9 pr-3 py-2 text-sm bg-panel border border-line rounded-lg outline-none focus:border-accent w-full sm:w-64 transition-colors"
            />
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-tx-1 text-panel text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            + Новый проект
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={FolderOpen} label="Всего проектов" value={stats.totalProjects} />
        <StatCard
          icon={Megaphone}
          label="Активных кампаний"
          value={stats.activeCampaigns}
          delta={stats.newCampaigns}
        />
        <StatCard
          icon={FileText}
          label="Контент-материалов"
          value={stats.totalMaterials}
          delta={stats.newMaterials}
        />
        <StatCard icon={Bot} label="AI-агентов" value={stats.totalAgents} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="text-center py-16 bg-panel rounded-xl border border-line">
          <p className="text-tx-2 text-sm">Ничего не найдено по запросу «{search}»</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <NewProjectCard />
        </div>
      )}
    </div>
  );
}