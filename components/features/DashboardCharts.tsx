"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = {
  activityData: { date: string; count: number }[];
  platformCounts: Record<string, number>;
};

const PLATFORM_COLORS: Record<string, string> = {
  telegram: "#2AABEE",
  instagram: "#E1306C",
  tiktok: "#010101",
  vk: "#4C75A3",
};

const tooltipStyle = {
  fontSize: 11,
  border: "0.5px solid #E5E7EB",
  borderRadius: 0,
  boxShadow: "none",
  background: "#fff",
};

export default function DashboardCharts({
  activityData,
  platformCounts,
}: Props) {
  const platformArr = Object.entries(platformCounts).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: PLATFORM_COLORS[k] || "#9CA3AF",
  }));

  const hasActivity = activityData.some((d) => d.count > 0);
  const maxCount = Math.max(...activityData.map((d) => d.count), 1);

  return (
    <Link href="/analytics" className="block group">
      <div className="border border-gray-200 bg-white hover:border-gray-300 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <div className="text-sm font-semibold text-gray-700">
              Активность генераций
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Контент за 30 дней
            </div>
          </div>
          <div className="flex items-center gap-3">
            {Object.entries(platformCounts).map(([k]) => (
              <div
                key={k}
                className="flex items-center gap-1.5 text-xs text-gray-400"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: PLATFORM_COLORS[k] || "#9CA3AF" }}
                />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </div>
            ))}
            <span className="text-xs text-gray-300 group-hover:text-accent transition-colors ml-2">
              Подробнее →
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-gray-100 px-5 pb-3">
          <div className="pr-4">
            <div className="text-[10px] text-gray-400 mb-0.5">ВСЕГО ПОСТОВ</div>
            <div className="text-xl font-semibold text-gray-900">
              {activityData.reduce((s, d) => s + d.count, 0)}
            </div>
          </div>
          <div className="px-4">
            <div className="text-[10px] text-gray-400 mb-0.5">ПЛАТФОРМЫ</div>
            <div className="text-xl font-semibold text-gray-900">
              {Object.keys(platformCounts).length}
            </div>
          </div>
          <div className="px-4">
            <div className="text-[10px] text-gray-400 mb-0.5">ПИКОВЫЙ ДЕНЬ</div>
            <div className="text-xl font-semibold text-gray-900">
              {maxCount}
            </div>
          </div>
          <div className="pl-4">
            <div className="text-[10px] text-gray-400 mb-0.5">
              АКТИВНЫХ ДНЕЙ
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {activityData.filter((d) => d.count > 0).length}
            </div>
          </div>
        </div>

        {/* Big area chart */}
        <div className="px-2 pb-2">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={activityData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--accent)"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any) => [`${v} постов`, ""]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--accent)"
                strokeWidth={1.5}
                fill="url(#actGrad)"
                dot={false}
                activeDot={{ r: 3, fill: "var(--accent)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  );
}
