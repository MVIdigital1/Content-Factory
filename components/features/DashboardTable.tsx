"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "recent" | "scheduled" | "published";

type ContentRow = {
  id: string;
  title: string | null;
  type: string | null;
  platform: string | null;
  status: string | null;
  created_at: string;
  projects: { name: string } | { name: string }[] | null;
};

type ScheduledRow = {
  id: string;
  scheduled_at: string;
  status: string;
  contents: { title: string | null; platform: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-blue-50 text-blue-600",
  scheduled: "bg-[#F0FDF8] text-[#1D9E75]",
  generated: "bg-amber-50 text-amber-600",
  draft: "bg-gray-100 text-gray-500",
  approved: "bg-indigo-50 text-indigo-600",
  failed: "bg-red-50 text-red-500",
  pending: "bg-purple-50 text-purple-600",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Active",
  scheduled: "Scheduled",
  generated: "Ready",
  draft: "Draft",
  approved: "Approved",
  failed: "Failed",
  pending: "Pending",
};

const TYPE_ICON: Record<string, string> = {
  video: "🎬",
  post: "📝",
  stories: "📸",
  ad: "📢",
};

export default function DashboardTable({
  initialCount,
}: {
  initialCount: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("recent");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const { data: recentContents = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, type, platform, status, created_at, projects(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as unknown as ContentRow[];
    },
  });

  const { data: scheduledContents = [], isLoading: loadingScheduled } =
    useQuery({
      queryKey: ["dashboard-scheduled"],
      queryFn: async () => {
        const { data } = await supabase
          .from("scheduled_posts")
          .select("id, scheduled_at, status, contents(title, platform)")
          .eq("status", "pending")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(10);
        return (data ?? []) as ScheduledRow[];
      },
      enabled: activeTab === "scheduled",
    });

  const { data: publishedContents = [], isLoading: loadingPublished } =
    useQuery({
      queryKey: ["dashboard-published"],
      queryFn: async () => {
        const { data } = await supabase
          .from("contents")
          .select(
            "id, title, type, platform, status, created_at, projects(name)",
          )
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(10);
        return (data ?? []) as unknown as ContentRow[];
      },
      enabled: activeTab === "published",
    });

  const isLoading =
    (activeTab === "recent" && loadingRecent) ||
    (activeTab === "scheduled" && loadingScheduled) ||
    (activeTab === "published" && loadingPublished);

  const activeCount =
    activeTab === "recent"
      ? recentContents.length
      : activeTab === "scheduled"
        ? scheduledContents.length
        : publishedContents.length;

  const filterContent = <
    T extends { title?: string | null; platform?: string | null },
  >(
    items: T[],
  ) =>
    !search
      ? items
      : items.filter(
          (c) =>
            c.title?.toLowerCase().includes(search.toLowerCase()) ||
            c.platform?.toLowerCase().includes(search.toLowerCase()),
        );

  const filterScheduled = (items: ScheduledRow[]) =>
    !search
      ? items
      : items.filter(
          (s) =>
            (s.contents as any)?.title
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            (s.contents as any)?.platform
              ?.toLowerCase()
              .includes(search.toLowerCase()),
        );

  const TABS: { key: Tab; label: string }[] = [
    { key: "recent", label: "Последние генерации" },
    { key: "scheduled", label: "Запланировано" },
    { key: "published", label: "Опубликовано" },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs font-medium pb-0.5 transition-colors cursor-pointer focus:outline-none ${
              activeTab === tab.key
                ? "text-gray-900 border-b-2 border-[#1D9E75]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="ml-1.5 bg-[#E8F5EE] text-[#1D9E75] text-[10px] px-1.5 py-0.5 rounded-full">
                {isLoading ? "…" : activeCount}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Live search */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-400 focus-within:border-[#1D9E75] transition-colors">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="bg-transparent outline-none w-20 text-gray-700 placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-300 hover:text-gray-500 transition-colors leading-none"
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
          </div>

          {/* View all */}
          <Link
            href={activeTab === "scheduled" ? "/calendar" : "/history"}
            className="flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            Все
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 px-5 py-2 border-b border-gray-50 bg-gray-50/50">
        {activeTab === "scheduled" ? (
          <>
            <div className="col-span-5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Контент
            </div>
            <div className="col-span-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Платформа
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Дата
            </div>
          </>
        ) : (
          <>
            <div className="col-span-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Заголовок
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Проект
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Платформа
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Статус
            </div>
            <div className="col-span-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Дата
            </div>
          </>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="divide-y divide-gray-50">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-5 py-3 flex items-center gap-3 animate-pulse"
            >
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex-shrink-0" />
              <div className="flex-1 h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-16" />
              <div className="h-5 bg-gray-100 rounded-full w-14" />
              <div className="h-3 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      )}

      {/* Recent / Published rows */}
      {!isLoading && (activeTab === "recent" || activeTab === "published") && (
        <>
          {filterContent(
            activeTab === "recent" ? recentContents : publishedContents,
          ).length > 0 ? (
            filterContent(
              activeTab === "recent" ? recentContents : publishedContents,
            ).map((c) => (
              <Link
                key={c.id}
                href={`/history?id=${c.id}`}
                className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/70 transition-colors group last:border-0"
              >
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                    {TYPE_ICON[c.type ?? ""] ?? "📄"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {c.title || "—"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {c.type}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-600 truncate">
                    {(c.projects as any)?.name || "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-xs text-gray-500 capitalize">
                    {c.platform || "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status ?? "draft"]}`}
                  >
                    {STATUS_LABELS[c.status ?? "draft"]}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">✦</div>
              <p className="text-sm text-gray-400 mb-3">
                {search
                  ? "Ничего не найдено"
                  : activeTab === "published"
                    ? "Нет опубликованных постов"
                    : "Нет генераций"}
              </p>
              {!search && (
                <Link
                  href="/create"
                  className="text-sm text-[#1D9E75] font-medium hover:underline"
                >
                  Создать первый пост →
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {/* Scheduled rows */}
      {!isLoading && activeTab === "scheduled" && (
        <>
          {filterScheduled(scheduledContents).length > 0 ? (
            filterScheduled(scheduledContents).map((s) => (
              <Link
                key={s.id}
                href="/calendar"
                className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/70 transition-colors group last:border-0"
              >
                <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                    📅
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {(s.contents as any)?.title || "—"}
                  </p>
                </div>
                <div className="col-span-3 flex items-center">
                  <span className="text-xs text-gray-500 capitalize">
                    {(s.contents as any)?.platform || "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F0FDF8] text-[#1D9E75]">
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(s.scheduled_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="text-sm text-gray-400 mb-3">
                {search ? "Ничего не найдено" : "Нет запланированных постов"}
              </p>
              {!search && (
                <Link
                  href="/calendar"
                  className="text-sm text-[#1D9E75] font-medium hover:underline"
                >
                  Открыть календарь →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
