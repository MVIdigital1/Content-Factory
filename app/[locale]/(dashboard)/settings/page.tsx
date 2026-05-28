"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "profile" | "integrations" | "billing" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const supabase = createClient();
  const locale = useLocale();
  const router = useRouter();

  const TABS: { key: Tab; label: string; icon: string }[] = [
    {
      key: "profile",
      label: "Профиль",
      icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7",
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

  return (
    <div className="p-6 max-w-4xl w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Управляйте аккаунтом и настройками
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 ${
                  activeTab === tab.key
                    ? "bg-[#F0FDF8] text-[#1D9E75] font-medium"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
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
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6">
          {activeTab === "profile" && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Профиль
              </h2>
              <Link
                href="/profile"
                className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-[#1D9E75]/30 hover:bg-[#F0FDF8]/50 transition-all group"
              >
                <div className="w-10 h-10 bg-[#E1F5EE] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Личный кабинет
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
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
                  className="group-hover:stroke-[#1D9E75] transition-colors"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Интеграции
              </h2>
              <Link
                href="/integrations"
                className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-[#1D9E75]/30 hover:bg-[#F0FDF8]/50 transition-all group"
              >
                <div className="w-10 h-10 bg-[#E1F5EE] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Управление интеграциями
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Telegram, Instagram, TikTok, VK
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
                  className="group-hover:stroke-[#1D9E75] transition-colors"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Тариф
              </h2>
              <div className="p-4 bg-[#F0FDF8] border border-[#A7F3D0] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#065F46]">
                    Free план
                  </span>
                  <span className="text-xs bg-[#1D9E75] text-white px-2 py-0.5 rounded-full font-medium">
                    Активен
                  </span>
                </div>
                <p className="text-xs text-[#065F46]/70">
                  20 генераций в час · 1 проект · Telegram
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  {
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
                    name: "Business",
                    price: "$49/мес",
                    features: [
                      "Безлимит",
                      "Все проекты",
                      "API доступ",
                      "White-label",
                    ],
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="p-4 border border-gray-200 rounded-xl hover:border-[#1D9E75] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {plan.name}
                      </span>
                      <span className="text-xs font-semibold text-[#1D9E75]">
                        {plan.price}
                      </span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="text-xs text-gray-500 flex items-center gap-1.5"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1D9E75"
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
                    <button className="w-full py-1.5 bg-[#1D9E75] text-white text-xs font-medium rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30">
                      Подключить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                Безопасность
              </h2>
              <Link
                href="/profile"
                className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-[#1D9E75]/30 transition-all group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Сменить пароль
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
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
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
              <div className="p-4 border border-red-100 rounded-xl bg-red-50/50">
                <p className="text-sm font-medium text-red-700 mb-1">
                  Опасная зона
                </p>
                <p className="text-xs text-red-500 mb-3">
                  Удаление аккаунта необратимо
                </p>
                <Link
                  href="/profile"
                  className="text-xs text-red-500 font-medium hover:text-red-700 hover:underline transition-colors"
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
