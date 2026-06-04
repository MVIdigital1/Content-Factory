"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Stats = {
  totalUsers: number;
  totalContents: number;
  totalPublished: number;
  totalScheduled: number;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  ai_tokens_used: number;
  is_blocked: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  contents_count?: number;
  published_count?: number;
};

type Content = {
  id: string;
  title: string;
  platform: string;
  type: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

type ScheduledPost = {
  id: string;
  scheduled_at: string;
  status: string;
  platform: string;
  content_title?: string;
  user_name?: string;
  user_email?: string;
};

type Integration = {
  id: string;
  platform: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  user_id: string;
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-500",
  pro: "bg-accent text-accent",
  business: "bg-purple-50 text-purple-600",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  published: "bg-accent-dim text-accent",
  failed: "bg-red-50 text-red-500",
  generated: "bg-accent text-accent",
  scheduled: "bg-purple-50 text-purple-600",
};

type View =
  | "overview"
  | "users"
  | "user_detail"
  | "generations"
  | "published"
  | "scheduled";

export default function AdminDashboardClient({
  stats,
  users,
  contents = [],
  scheduledPosts = [],
  integrations = [],
}: {
  stats: Stats;
  users: User[];
  contents?: Content[];
  scheduledPosts?: ScheduledPost[];
  integrations?: Integration[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [view, setView] = useState<View>("overview");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push(`/${locale}/admin`);
    router.refresh();
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    setLoadingId(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_blocked: !isBlocked }),
    });
    setLoadingId(null);
    router.refresh();
  };

  const handleDelete = async (userId: string) => {
    setLoadingId(userId);
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoadingId(null);
    setDeleteConfirm(null);
    setView("users");
    router.refresh();
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  // Top generators ranking
  const topGenerators = [...users]
    .sort((a, b) => (b.contents_count || 0) - (a.contents_count || 0))
    .slice(0, 5);

  const topPublishers = [...users]
    .sort((a, b) => (b.published_count || 0) - (a.published_count || 0))
    .slice(0, 5);

  const userContents = selectedUser
    ? contents.filter((c: any) => c.user_id === selectedUser.id)
    : [];

  const breadcrumb = () => {
    if (view === "overview") return "Обзор";
    if (view === "users") return "Пользователи";
    if (view === "user_detail")
      return `Пользователи → ${selectedUser?.full_name || selectedUser?.email}`;
    if (view === "generations") return "Генерации";
    if (view === "published") return "Опубликованные";
    if (view === "scheduled") return "Запланированные";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar tabs — sticky top */}

      <div className="bg-white border-b border-gray-200 px-6 sticky top-0 z-20">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {[
            {
              key: "overview",
              label: "Обзор",
              icon: (
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
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              ),
            },
            {
              key: "users",
              label: "Пользователи",
              icon: (
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
            {
              key: "generations",
              label: "Генерации",
              icon: (
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
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
            },
            {
              key: "published",
              label: "Опубликовано",
              icon: (
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
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              ),
            },
            {
              key: "scheduled",
              label: "Запланировано",
              icon: (
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
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setView(tab.key as View);
                setSelectedUser(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                view === tab.key ||
                (view === "user_detail" && tab.key === "users")
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              <span className="opacity-70">{tab.icon}</span>
              {tab.label}
              {tab.key === "users" && (
                <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center cursor-pointer"
              onClick={() => setView("overview")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <h1
                className="text-sm font-bold text-gray-900 cursor-pointer"
                onClick={() => setView("overview")}
              >
                Admin Panel
              </h1>
              <p className="text-xs text-gray-400">PostCentro</p>
            </div>
            <div className="hidden md:flex items-center gap-1 ml-2 text-xs text-gray-400">
              <span>/</span>
              <span className="text-gray-700 font-medium">{breadcrumb()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{users.length} польз.</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer border border-gray-200"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {view === "overview" && (
          <>
            {/* Stat cards — clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Пользователей",
                  value: stats.totalUsers,
                  color: "text-accent",
                  bg: "bg-accent-dim",
                  icon: (
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
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  ),
                  view: "users" as View,
                },
                {
                  label: "Генераций",
                  value: stats.totalContents,
                  color: "text-accent",
                  bg: "bg-accent",
                  icon: (
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
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  ),
                  view: "generations" as View,
                },
                {
                  label: "Опубликовано",
                  value: stats.totalPublished,
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  icon: (
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
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  ),
                  view: "published" as View,
                },
                {
                  label: "Запланировано",
                  value: stats.totalScheduled,
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                  icon: (
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
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  ),
                  view: "scheduled" as View,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={() => setView(s.view)}
                  className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-gray-400">{s.icon}</span>
                    <span className={`text-2xl font-bold ${s.color}`}>
                      {s.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top generators */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Топ по генерациям
                </h3>
                {topGenerators.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Нет данных
                  </p>
                ) : (
                  topGenerators.map((u, i) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setView("user_detail");
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    >
                      <span className="text-xs font-bold text-gray-300 w-4">
                        {i + 1}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center text-[10px] font-bold text-accent">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 flex-1 truncate">
                        {u.full_name || u.email}
                      </span>
                      <span className="text-xs font-semibold text-accent">
                        {u.contents_count || 0}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Recent users */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Новые пользователи
                </h3>
                {users.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setView("user_detail");
                    }}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center text-[10px] font-bold text-accent">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">
                        {u.full_name || "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {u.email}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${PLAN_COLORS[u.plan] || "bg-gray-100 text-gray-500"}`}
                    >
                      {u.plan || "free"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── USERS LIST ── */}
        {view === "users" && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setView("overview")}
                className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ← Назад
              </button>
              <h2 className="text-sm font-semibold text-gray-900 flex-1">
                Пользователи ({filtered.length})
              </h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 w-48"
              />
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">Все тарифы</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      "Пользователь",
                      "Email",
                      "Тариф",
                      "Генераций",
                      "Токены AI",
                      "Регистрация",
                      "Статус",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${u.is_blocked ? "opacity-50" : ""}`}
                      onClick={() => {
                        setSelectedUser(u);
                        setView("user_detail");
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-accent-dim flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                            {(u.full_name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                            {u.full_name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${PLAN_COLORS[u.plan] || "bg-gray-100 text-gray-500"}`}
                        >
                          {u.plan || "free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {u.contents_count || 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {(u.ai_tokens_used || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.created_at
                          ? format(new Date(u.created_at), "d MMM yyyy", {
                              locale: ru,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.is_blocked ? "bg-red-50 text-red-500" : "bg-accent-dim text-accent"}`}
                        >
                          {u.is_blocked ? "Заблокирован" : "Активен"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                          disabled={loadingId === u.id}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-50 ${u.is_blocked ? "border-accent text-accent hover:bg-accent-dim" : "border-red-200 text-red-500 hover:bg-red-50"}`}
                        >
                          {loadingId === u.id
                            ? "..."
                            : u.is_blocked
                              ? "Разблокировать"
                              : "Заблокировать"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USER DETAIL ── */}
        {view === "user_detail" && selectedUser && (
          <div className="space-y-4">
            <button
              onClick={() => setView("users")}
              className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              ← Назад к пользователям
            </button>

            {/* User card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent-dim flex items-center justify-center text-xl font-bold text-accent">
                    {(selectedUser.full_name ||
                      selectedUser.email ||
                      "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedUser.full_name || "—"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedUser.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${PLAN_COLORS[selectedUser.plan] || "bg-gray-100 text-gray-500"}`}
                      >
                        {selectedUser.plan || "free"}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedUser.is_blocked ? "bg-red-50 text-red-500" : "bg-accent-dim text-accent"}`}
                      >
                        {selectedUser.is_blocked ? "Заблокирован" : "Активен"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleToggleBlock(
                        selectedUser.id,
                        selectedUser.is_blocked,
                      )
                    }
                    disabled={loadingId === selectedUser.id}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-50 ${selectedUser.is_blocked ? "border-accent text-accent hover:bg-accent-dim" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}
                  >
                    {selectedUser.is_blocked
                      ? "Разблокировать"
                      : "Заблокировать"}
                  </button>
                  {deleteConfirm === selectedUser.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(selectedUser.id)}
                        disabled={loadingId === selectedUser.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium cursor-pointer hover:bg-red-600 disabled:opacity-50"
                      >
                        {loadingId === selectedUser.id ? "..." : "Да, удалить"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(selectedUser.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 font-medium hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
                {[
                  {
                    label: "Генераций",
                    value: selectedUser.contents_count || 0,
                  },
                  {
                    label: "Опубликовано",
                    value: selectedUser.published_count || 0,
                  },
                  {
                    label: "Токены AI",
                    value: (selectedUser.ai_tokens_used || 0).toLocaleString(),
                  },
                  {
                    label: "Зарегистрирован",
                    value: selectedUser.created_at
                      ? format(
                          new Date(selectedUser.created_at),
                          "d MMM yyyy",
                          { locale: ru },
                        )
                      : "—",
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Channels inside card */}
              {integrations.filter((ch) => ch.user_id === selectedUser.id)
                .length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Telegram каналы (
                    {
                      integrations.filter(
                        (ch) => ch.user_id === selectedUser.id,
                      ).length
                    }
                    )
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {integrations
                      .filter((ch) => ch.user_id === selectedUser.id)
                      .map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                            <svg
                              width="13"
                              height="13"
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
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {ch.channel_name || ch.channel_id}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {ch.channel_id}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ch.is_active ? "bg-accent-dim text-accent" : "bg-gray-100 text-gray-400"}`}
                          >
                            {ch.is_active ? "Активен" : "Откл."}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* User's contents */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Контент пользователя ({userContents.length})
                </h3>
              </div>
              {userContents.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  Нет контента
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Название", "Платформа", "Тип", "Статус", "Дата"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left text-[10px] font-semibold text-gray-400 uppercase px-4 py-2"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {userContents.slice(0, 20).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-700 max-w-[200px] truncate">
                          {c.title || "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {c.platform}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {c.type}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-500"}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {c.created_at
                            ? format(new Date(c.created_at), "d MMM", {
                                locale: ru,
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── GENERATIONS ── */}
        {view === "generations" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setView("overview")}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  ← Назад
                </button>
                <h2 className="text-sm font-semibold text-gray-900 flex-1">
                  Все генерации ({contents.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {[
                        "Название",
                        "Пользователь",
                        "Платформа",
                        "Статус",
                        "Дата",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-semibold text-gray-400 uppercase px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contents.slice(0, 50).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[180px] truncate">
                          {c.title || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">
                          {c.user_name || c.user_email || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {c.platform}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-500"}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">
                          {c.created_at
                            ? format(new Date(c.created_at), "d MMM HH:mm", {
                                locale: ru,
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top generators sidebar */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Рейтинг активности
              </h3>
              {topGenerators.map((u, i) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setView("user_detail");
                  }}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                >
                  <span
                    className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-accent-dim flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {u.contents_count || 0} генераций
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PUBLISHED ── */}
        {view === "published" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setView("overview")}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  ← Назад
                </button>
                <h2 className="text-sm font-semibold text-gray-900 flex-1">
                  Опубликованные (
                  {contents.filter((c) => c.status === "published").length})
                </h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Название", "Пользователь", "Платформа", "Дата"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-semibold text-gray-400 uppercase px-4 py-3"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contents
                    .filter((c) => c.status === "published")
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[200px] truncate">
                          {c.title || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {c.user_name || c.user_email || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {c.platform}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">
                          {c.created_at
                            ? format(new Date(c.created_at), "d MMM HH:mm", {
                                locale: ru,
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Топ публикаторов
              </h3>
              {topPublishers.map((u, i) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setView("user_detail");
                  }}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2"
                >
                  <span
                    className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-accent-dim flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {u.full_name || u.email}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {u.published_count || 0} постов
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHEDULED ── */}
        {view === "scheduled" && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setView("overview")}
                className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ← Назад
              </button>
              <h2 className="text-sm font-semibold text-gray-900 flex-1">
                Запланированные ({scheduledPosts.length})
              </h2>
            </div>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                Нет запланированных постов
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      "Контент",
                      "Пользователь",
                      "Платформа",
                      "Запланировано на",
                      "Статус",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-semibold text-gray-400 uppercase px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scheduledPosts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">
                        {p.content_title || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.user_name || p.user_email || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.platform}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                        {p.scheduled_at
                          ? format(
                              new Date(p.scheduled_at),
                              "d MMM yyyy HH:mm",
                              { locale: ru },
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-500"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
