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

const PLATFORM_COLOR: Record<string, string> = {
  telegram: "#2AABEE",
  instagram: "#E1306C",
  tiktok: "#010101",
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarPage() {
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: scheduled } = useQuery({
    queryKey: ["scheduled", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*, contents(title, platform, type, caption)")
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
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

  return (
    <div className="p-4 md:p-6 flex flex-col md:flex-row gap-5 max-w-5xl w-full">
      {/* Calendar */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </h1>
            <p className="text-sm text-gray-500">Расписание публикаций</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors text-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Weekdays */}
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

        {/* Days */}
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
                className={`min-h-[60px] md:min-h-[72px] p-1.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#1D9E75] bg-[#E1F5EE]"
                    : today
                      ? "border-[#1D9E75] border-opacity-40 bg-white"
                      : "border-transparent hover:border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div
                  className={`text-xs font-semibold mb-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${
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
                  {posts.slice(0, 2).map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        background:
                          PLATFORM_COLOR[p.contents?.platform] || "#9CA3AF",
                      }}
                      className="h-1.5 rounded-full opacity-70"
                    />
                  ))}
                  {posts.length > 2 && (
                    <div className="text-[9px] text-gray-400 font-medium">
                      +{posts.length - 2}
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

      {/* Side panel */}
      {selectedDay && (
        <div className="md:w-64 w-full flex-shrink-0">
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {format(selectedDay, "d MMMM", { locale: ru })}
          </div>
          {selectedPosts.length > 0 ? (
            <div className="space-y-2">
              {selectedPosts.map((p: any) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          PLATFORM_COLOR[p.contents?.platform] || "#9CA3AF",
                      }}
                    />
                    <span className="text-xs font-medium text-gray-500 capitalize">
                      {p.contents?.platform}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {format(new Date(p.scheduled_at), "HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {p.contents?.title || "Без названия"}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1.5 inline-block ${
                      p.status === "published"
                        ? "bg-[#E1F5EE] text-[#1D9E75]"
                        : p.status === "failed"
                          ? "bg-red-50 text-red-500"
                          : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {p.status === "published"
                      ? "Опубликовано"
                      : p.status === "failed"
                        ? "Ошибка"
                        : "Ожидает"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-xs text-gray-400">Нет публикаций</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
