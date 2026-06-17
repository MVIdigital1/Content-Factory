"use client";

import { useState, useEffect, Suspense } from "react";
import { useLocale } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Tab = "profile" | "workspace" | "integrations" | "billing" | "security";
type PlanKey = "pro" | "business";

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const initialTab = (searchParams.get("tab") as Tab) || "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Workspace edit state
  const [wsName, setWsName] = useState("");
  const [wsEditing, setWsEditing] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  // Load workspace
  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .single();
      return data;
    },
    enabled: activeTab === "workspace",
  });

  useEffect(() => {
    if (workspace?.name) setWsName(workspace.name);
  }, [workspace]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("workspaces")
        .update({ name })
        .eq("owner_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      setWsEditing(false);
      showToast("Воркспейс обновлён");
    },
  });

  const handleUpgrade = async (plan: PlanKey) => {
    setPendingPlan(plan);
    await new Promise((r) => setTimeout(r, 1000));
    setPendingPlan(null);
    showToast(
      `Тариф ${plan === "pro" ? "Pro" : "Business"} — скоро будет доступен!`,
    );
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    {
      key: "profile",
      label: "Профиль",
      icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7",
    },
    {
      key: "workspace",
      label: "Воркспейс",
      icon: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM16 3v4M8 3v4M3 11h18",
    },
    {
      key: "integrations",
      label: "Интеграции",
      icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    },
    {
      key: "billing",
      label: "Тариф",
      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    },
    {
      key: "security",
      label: "Безопасность",
      icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
  ];

  const PLANS: {
    key: PlanKey;
    name: string;
    price: string;
    features: string[];
  }[] = [
    {
      key: "pro",
      name: "Pro",
      price: "$19/мес",
      features: [
        "200 генераций/день",
        "10 проектов",
        "Все платформы",
        "Приоритет",
      ],
    },
    {
      key: "business",
      name: "Business",
      price: "$49/мес",
      features: ["Безлимит", "Все проекты", "API доступ", "White-label"],
    },
  ];

  return (
    <div className="p-6 max-w-4xl w-full relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-on-accent text-sm px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <div className="ui-label">Аккаунт</div>
        <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
          Настройки
        </h1>
        <p className="text-[13px] text-tx-2 mt-1">
          Управляйте аккаунтом и настройками
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                  activeTab === tab.key
                    ? "bg-accent-dim text-accent font-medium"
                    : "text-tx-2 hover:text-tx-1 hover:bg-hover"
                }`}
                aria-current={activeTab === tab.key ? "page" : undefined}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-panel rounded-xl border border-line p-6">
          {/* ── ПРОФИЛЬ ── */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-tx-1 mb-4">Профиль</h2>
              <Link
                href={`/${locale}/profile`}
                className="flex items-center gap-3 p-4 border border-line rounded-xl hover:border-accent hover:bg-accent-dim/50 transition-all group"
              >
                <div className="w-10 h-10 bg-accent-dim rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-tx-1">
                    Личный кабинет
                  </p>
                  <p className="text-xs text-tx-3 mt-0.5">
                    Имя, фото, email, пароль
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:stroke-accent transition-colors"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )}

          {/* ── ВОРКСПЕЙС ── */}
          {activeTab === "workspace" && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-tx-1 mb-4">
                Воркспейс
              </h2>

              {wsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-chip rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* Название */}
                  <div className="p-4 border border-line rounded-xl">
                    <p className="text-xs text-tx-3 mb-2 font-medium uppercase tracking-wide">
                      Название воркспейса
                    </p>
                    {wsEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={wsName}
                          onChange={(e) => setWsName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              updateWorkspaceMutation.mutate(wsName);
                            if (e.key === "Escape") {
                              setWsEditing(false);
                              setWsName(workspace?.name || "");
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-line-strong rounded-lg outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => updateWorkspaceMutation.mutate(wsName)}
                          disabled={
                            !wsName || updateWorkspaceMutation.isPending
                          }
                          className="px-3 py-2 bg-accent text-on-accent text-xs rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 transition-colors"
                        >
                          {updateWorkspaceMutation.isPending
                            ? "..."
                            : "Сохранить"}
                        </button>
                        <button
                          onClick={() => {
                            setWsEditing(false);
                            setWsName(workspace?.name || "");
                          }}
                          className="px-3 py-2 text-tx-2 text-xs rounded-lg cursor-pointer hover:bg-hover transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-tx-1">
                          {workspace?.name || "Мой воркспейс"}
                        </p>
                        <button
                          onClick={() => setWsEditing(true)}
                          className="text-xs text-accent hover:underline cursor-pointer"
                        >
                          Изменить
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Тариф */}
                  <div className="p-4 border border-line rounded-xl">
                    <p className="text-xs text-tx-3 mb-2 font-medium uppercase tracking-wide">
                      Тариф
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-tx-1">
                          {(workspace?.plan || "free").toUpperCase()}
                        </span>
                        <span className="text-[10px] bg-chip text-tx-2 px-2 py-0.5 rounded-full font-medium">
                          Активен
                        </span>
                      </div>
                      <button
                        onClick={() => handleTabChange("billing")}
                        className="text-xs text-accent hover:underline cursor-pointer"
                      >
                        Улучшить →
                      </button>
                    </div>
                  </div>

                  {/* Команда */}
                  <Link
                    href={`/${locale}/team`}
                    className="flex items-center gap-3 p-4 border border-line rounded-xl hover:border-accent hover:bg-accent-dim/50 transition-all group"
                  >
                    <div className="w-10 h-10 bg-accent-dim rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tx-1">
                        Управление командой
                      </p>
                      <p className="text-xs text-tx-3 mt-0.5">
                        Участники, роли, приглашения
                      </p>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9CA3AF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-accent transition-colors"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          )}

          {/* ── ИНТЕГРАЦИИ ── */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-tx-1 mb-4">
                Интеграции
              </h2>
              <Link
                href={`/${locale}/integrations`}
                className="flex items-center gap-3 p-4 border border-line rounded-xl hover:border-accent hover:bg-accent-dim/50 transition-all group"
              >
                <div className="w-10 h-10 bg-accent-dim rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-tx-1">
                    Управление интеграциями
                  </p>
                  <p className="text-xs text-tx-3 mt-0.5">
                    Telegram, Instagram, TikTok
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:stroke-accent transition-colors"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )}

          {/* ── ТАРИФ ── */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-tx-1 mb-4">Тариф</h2>
              <div className="p-4 bg-accent-dim border border-line rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-accent">
                    Free план
                  </span>
                  <span className="text-xs bg-accent text-on-accent px-2 py-0.5 rounded-full font-medium">
                    Активен
                  </span>
                </div>
                <p className="text-xs text-accent/70">
                  20 генераций в час · 1 проект · Telegram
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {PLANS.map((plan) => (
                  <div
                    key={plan.key}
                    className="p-4 border border-line-strong rounded-xl hover:border-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-tx-1">
                        {plan.name}
                      </span>
                      <span className="text-xs font-semibold text-accent">
                        {plan.price}
                      </span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="text-xs text-tx-2 flex items-center gap-1.5"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={pendingPlan === plan.key}
                      className="w-full py-1.5 bg-accent text-on-accent text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 flex items-center justify-center gap-1.5"
                    >
                      {pendingPlan === plan.key ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          Подключение...
                        </>
                      ) : (
                        "Подключить"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── БЕЗОПАСНОСТЬ ── */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-tx-1 mb-4">
                Безопасность
              </h2>
              <Link
                href={`/${locale}/profile`}
                className="flex items-center gap-3 p-4 border border-line rounded-xl hover:border-accent hover:bg-chip/30 transition-all group"
              >
                <div className="w-10 h-10 bg-chip rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-tx-1">
                    Сменить пароль
                  </p>
                  <p className="text-xs text-tx-3 mt-0.5">
                    Обновите пароль аккаунта
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:stroke-blue-400 transition-colors"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
              <div className="p-4 border border-line rounded-xl bg-chip/50">
                <p className="text-sm font-medium text-red-700 mb-1">
                  Опасная зона
                </p>
                <p className="text-xs text-neg mb-3">
                  Удаление аккаунта необратимо
                </p>
                <Link
                  href={`/${locale}/profile`}
                  className="text-xs text-neg font-medium hover:text-red-700 hover:underline transition-colors"
                >
                  Перейти в личный кабинет →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-tx-3">Загрузка...</div>}
    >
      <SettingsContent />
    </Suspense>
  );
}
