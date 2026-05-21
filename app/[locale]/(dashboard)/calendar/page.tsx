"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

const PLATFORM_COLOR: Record<string, string> = {
  telegram: "#2AABEE",
  instagram: "#E1306C",
  tiktok: "#010101",
};
const PLATFORM_ICON: Record<string, string> = {
  telegram: "✈️",
  instagram: "📸",
  tiktok: "🎵",
};
const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function CalendarPage() {
  const supabase = createClient();
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const WEEKDAYS =
    locale === "uz" ? WEEKDAYS_UZ : locale === "en" ? WEEKDAYS_EN : WEEKDAYS_RU;
  const dateFnsLocale = locale === "ru" ? ru : undefined;

  const { data: scheduled } = useQuery({
    queryKey: ["scheduled", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, contents(id, title, platform, type, caption)")
        .gte("scheduled_at", start)
        .lte("scheduled_at", end + "T23:59:59")
        .order("scheduled_at");
      return data || [];
    },
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOffset = (getDay(startOfMonth(currentMonth)) + 6) % 7;
  const getPostsForDay = (day: Date) =>
    (scheduled || []).filter((p: any) =>
      isSameDay(new Date(p.scheduled_at), day),
    );
  const selectedPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const goToHistory = (contentId: string) => {
    router.push(`/${locale}/history?id=${contentId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Calendar main */}
      <div className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {format(currentMonth, "LLLL yyyy", { locale: dateFnsLocale })}
            </h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors cursor-pointer text-sm"
            >
              ←
            </button>
            <button
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDay(new Date());
              }}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition-colors cursor-pointer"
            >
              {t("today")}
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors cursor-pointer text-sm"
            >
              →
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Скрыть панель" : "Показать панель"}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors cursor-pointer text-sm"
            >
              {sidebarOpen ? "▶" : "◀"}
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-400 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {days.map((day) => {
            const posts = getPostsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[56px] md:min-h-[64px] p-1.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#1D9E75] bg-[#E1F5EE]"
                    : today
                      ? "border-[#1D9E75]/30 bg-white"
                      : "border-transparent hover:border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div
                  className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    today
                      ? "bg-[#1D9E75] text-white"
                      : isSelected
                        ? "text-[#1D9E75]"
                        : isSameMonth(day, currentMonth)
                          ? "text-gray-700"
                          : "text-gray-300"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {posts.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background:
                            PLATFORM_COLOR[p.contents?.platform] || "#9CA3AF",
                        }}
                      />
                      <span className="text-[9px] text-gray-500 truncate leading-tight">
                        {p.contents?.title?.slice(0, 12) || "—"}
                      </span>
                    </div>
                  ))}
                  {posts.length > 3 && (
                    <div className="text-[9px] text-gray-400 font-medium">
                      +{posts.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4">
          {Object.entries(PLATFORM_COLOR).map(([platform, color]) => (
            <div key={platform} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: color }}
              />
              <span className="text-xs text-gray-400 capitalize">
                {platform}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      {sidebarOpen && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {selectedDay
                ? format(selectedDay, "d MMMM yyyy", { locale: dateFnsLocale })
                : "Выберите день"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedPosts.length > 0
                ? `${selectedPosts.length} публикаций`
                : t("noPosts")}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!selectedDay ? (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400">
                  Нажмите на день в календаре
                </p>
              </div>
            ) : selectedPosts.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-2xl mb-2">📅</div>
                <p className="text-xs text-gray-400">{t("noPosts")}</p>
              </div>
            ) : (
              selectedPosts.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => goToHistory(p.contents?.id)}
                  className="bg-gray-50 hover:bg-[#E1F5EE] rounded-xl p-3 cursor-pointer transition-all border border-transparent hover:border-[#1D9E75]/20 group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          PLATFORM_COLOR[p.contents?.platform] || "#9CA3AF",
                      }}
                    />
                    <span className="text-xs font-medium text-gray-500">
                      {PLATFORM_ICON[p.contents?.platform]}{" "}
                      {p.contents?.platform}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto font-mono">
                      {format(new Date(p.scheduled_at), "HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {p.contents?.title || "—"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${
                        p.status === "published"
                          ? "bg-[#E1F5EE] text-[#1D9E75]"
                          : p.status === "failed"
                            ? "bg-red-50 text-red-500"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {p.status === "published"
                        ? t("status.published")
                        : p.status === "failed"
                          ? t("status.failed")
                          : t("status.pending")}
                    </span>
                    <span className="text-[10px] text-[#1D9E75] opacity-0 group-hover:opacity-100 transition-opacity">
                      Открыть →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
