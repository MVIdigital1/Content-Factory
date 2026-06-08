"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocale } from "next-intl";

type Props = {
  publishedCount: number;
  generationsCount: number;
  scheduledCount: number;
  pubDelta: number;
  genDelta: number;
  platformCounts: Record<string, number>;
  pubThisWeek: number;
};

const PLATFORM_COLOR: Record<string, string> = {
  telegram: "var(--accent)",
  instagram: "var(--accent)",
  tiktok: "var(--c-3)",
  vk: "var(--accent)",
};

const ALL_PLATFORMS = ["telegram", "instagram", "tiktok"];

export default function HealthWidget({
  publishedCount,
  generationsCount,
  scheduledCount,
  pubDelta,
  genDelta,
  platformCounts,
  pubThisWeek,
}: Props) {
  const [period, setPeriod] = useState<"7д" | "30д" | "90д">("30д");
  const locale = useLocale();

  const totalPlatform =
    Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;

  const successRate =
    publishedCount > 0
      ? Math.round((publishedCount / (generationsCount || 1)) * 100) + "%"
      : "0%";

  const DeltaBadge = ({ delta }: { delta: number }) => {
    if (delta === 0)
      return (
        <span className="text-[10px] text-tx-3 flex items-center gap-0.5 mt-1">
          <Minus size={9} /> без изм.
        </span>
      );
    if (delta > 0)
      return (
        <span className="text-[10px] text-pos flex items-center gap-0.5 mt-1">
          <TrendingUp size={9} /> +{delta} за неделю
        </span>
      );
    return (
      <span className="text-[10px] text-neg flex items-center gap-0.5 mt-1">
        <TrendingDown size={9} /> {delta} за неделю
      </span>
    );
  };

  const METRICS = [
    { label: "Опубликовано", value: publishedCount, delta: pubDelta },
    { label: "Генераций", value: generationsCount, delta: genDelta },
    { label: "Запланировано", value: scheduledCount, delta: null },
    { label: "Успешность", value: successRate, delta: null },
  ];

  return (
    <div className="ui-surface overflow-hidden">
      {/* Шапка */}
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-tx-1">
            Здоровье контента
          </h2>
          <p className="text-[11px] text-tx-3 mt-0.5">
            Активность и охват по каналам
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(["7д", "30д", "90д"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="text-[10px] px-2 py-1 rounded-[5px] border transition-colors cursor-pointer"
              style={{
                background: period === p ? "var(--accent-dim)" : "transparent",
                color: period === p ? "var(--accent)" : "var(--tx-3)",
                borderColor: period === p ? "var(--accent)" : "var(--line)",
                fontWeight: period === p ? 500 : 400,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 4 метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-line border-b border-line">
        {METRICS.map((m) => (
          <div key={m.label} className="px-5 py-4">
            <p className="ui-label mb-2">{m.label}</p>
            <p className="ui-num text-[24px] font-semibold text-tx-1 leading-none">
              {m.value}
            </p>
            {m.delta !== null ? (
              <DeltaBadge delta={m.delta} />
            ) : (
              <span className="text-[10px] text-tx-3 mt-1 block">
                за {period}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Каналы */}
      <div className="px-5 py-4 space-y-3">
        {ALL_PLATFORMS.map((platform) => {
          const count = platformCounts[platform] ?? 0;
          const published = platform === "telegram" ? pubThisWeek : 0;
          const pct = count > 0 ? Math.round((count / totalPlatform) * 100) : 0;
          const isConnected = count > 0;
          const isInstagram = platform === "instagram";

          return (
            <div
              key={platform}
              className="flex items-center gap-3"
              style={{ opacity: isConnected || isInstagram ? 1 : 0.5 }}
            >
              <span className="text-[11px] font-medium text-tx-1 capitalize min-w-[76px] flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: isConnected
                      ? PLATFORM_COLOR[platform] || "var(--accent)"
                      : "var(--track)",
                  }}
                />
                {platform}
              </span>
              <div
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: "var(--track)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: PLATFORM_COLOR[platform] || "var(--accent)",
                  }}
                />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 min-w-[160px] justify-end">
                {isConnected ? (
                  <>
                    <span className="text-[10px] text-tx-3">
                      <span className="font-medium text-tx-1">{count}</span>{" "}
                      постов
                    </span>
                    <span className="text-[10px] text-tx-3">
                      <span className="font-medium text-tx-1">{published}</span>{" "}
                      опубл.
                    </span>
                    <span
                      className="text-[9.5px] font-medium px-2 py-0.5 rounded-[4px]"
                      style={{
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}
                    >
                      Активен
                    </span>
                  </>
                ) : isInstagram ? (
                  <>
                    <span className="text-[10px] text-tx-3">0 постов</span>
                    <span className="text-[10px] text-tx-3">0 опубл.</span>
                    <span
                      className="text-[9.5px] font-medium px-2 py-0.5 rounded-[4px]"
                      style={{
                        background: "var(--accent-dim)",
                        color: "var(--c-3)",
                      }}
                    >
                      Ожидает
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-tx-3">—</span>
                    <Link
                      href={`/${locale}/integrations`}
                      className="text-[9.5px] font-medium px-2 py-0.5 rounded-[4px] hover:opacity-80"
                      style={{
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}
                    >
                      Подключить
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
