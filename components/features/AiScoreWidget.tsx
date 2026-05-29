"use client";

import { useState } from "react";

type Score = {
  virality: number;
  tone_match: number;
  brand_match: number;
  overall: number;
  tip: string;
};

const SCORE_LABELS: Record<string, string> = {
  virality: "Виральность",
  tone_match: "Тон",
  brand_match: "Бренд",
};

const getColor = (score: number) => {
  if (score >= 80) return { bar: "bg-[#1D9E75]", text: "text-[#1D9E75]" };
  if (score >= 60) return { bar: "bg-amber-400", text: "text-amber-500" };
  return { bar: "bg-red-400", text: "text-red-500" };
};

export default function AiScoreWidget({ contentId }: { contentId: string }) {
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/score-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });
      const data = await res.json();
      if (data.score) setScore(data.score);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (!score) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        className="w-full py-2.5 border border-dashed border-[#1D9E75] text-[#1D9E75] text-xs font-medium rounded-xl hover:bg-[#E1F5EE] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-3 h-3 border border-[#1D9E75] border-t-transparent rounded-full animate-spin" /> Анализирую пост...</>
        ) : (
          <>✦ AI-оценка поста</>
        )}
      </button>
    );
  }

  const overall = getColor(score.overall);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700">✦ AI-оценка поста</p>
        <div className={`text-xl font-bold ${overall.text}`}>{score.overall}</div>
      </div>

      <div className="space-y-2 mb-3">
        {Object.entries(SCORE_LABELS).map(([key, label]) => {
          const val = score[key as keyof Score] as number;
          const c = getColor(val);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-500">{label}</span>
                <span className={`text-[10px] font-semibold ${c.text}`}>{val}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${val}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {score.tip && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-[10px] text-amber-700">💡 {score.tip}</p>
        </div>
      )}

      <button
        onClick={() => setScore(null)}
        className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        Переоценить
      </button>
    </div>
  );
}
