"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, TrendingUp, Clapperboard, Drama } from "lucide-react";

type Worker = "smm" | "trends" | "scripts" | "creative";

export default function AiWorkersPage() {
  const supabase = createClient();
  const [activeWorker, setActiveWorker] = useState<Worker>("smm");
  const [selectedProject, setSelectedProject] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptDuration, setScriptDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, niche")
        .eq("is_active", true);
      return data || [];
    },
  });

  const run = async () => {
    if (!selectedProject) {
      setError("Выбери проект");
      return;
    }
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const endpoints: Record<Worker, string> = {
        smm: "/api/ai/smm-manager",
        trends: "/api/ai/trend-analyst",
        scripts: "/api/ai/script-writer",
        creative: "/api/ai/creative-director",
      };

      const body: any = { projectId: selectedProject };
      if (activeWorker === "scripts") {
        if (!scriptTopic) {
          setError("Укажи тему видео");
          setLoading(false);
          return;
        }
        body.topic = scriptTopic;
        body.duration = scriptDuration;
      }
      if (activeWorker === "creative") {
        body.goal = scriptTopic || "рост аудитории";
        body.duration = "month";
      }

      const res = await fetch(endpoints[activeWorker], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const WORKERS = [
    {
      key: "smm" as Worker,
      name: "AI SMM Manager",
      icon: ClipboardList,
      desc: "Контент-план на 7 дней с темами, форматами и временем публикации",
    },
    {
      key: "trends" as Worker,
      name: "AI Trend Analyst",
      icon: TrendingUp,
      desc: "Анализ трендов в вашей нише — что популярно, что растёт, что избегать",
    },
    {
      key: "scripts" as Worker,
      name: "AI Script Writer",
      icon: Clapperboard,
      desc: "Сценарии для Reels и TikTok с раскадровкой и текстом",
    },
    {
      key: "creative" as Worker,
      name: "AI Creative Director",
      icon: Drama,
      desc: "Концепция контент-кампании, столпы контента, стратегия на месяц",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 border-b border-line px-6 flex items-center">
        <span className="text-xs text-tx-3">AI Сотрудники</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl">
          <div className="mb-6">
            <div className="ui-label">Инструменты</div>
            <h1 className="text-[24px] font-semibold tracking-tight text-tx-1 mt-1.5">
              AI-сотрудники
            </h1>
            <p className="text-[13px] text-tx-2 mt-1">
              Ваши персональные AI-эксперты по контенту
            </p>
          </div>

          {/* Worker cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {WORKERS.map((w) => (
              <button
                key={w.key}
                onClick={() => {
                  setActiveWorker(w.key);
                  setResult(null);
                }}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${activeWorker === w.key ? "border-accent bg-accent-dim" : "border-line bg-panel hover:border-line-strong"}`}
              >
                <div className="mb-2">
                  <w.icon size={22} className="text-accent" strokeWidth={1.7} />
                </div>
                <p
                  className={`text-sm font-semibold mb-1 ${activeWorker === w.key ? "text-accent" : "text-tx-1"}`}
                >
                  {w.name}
                </p>
                <p className="text-[10px] text-tx-3 leading-relaxed">
                  {w.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="bg-panel border border-line rounded-xl p-4 mb-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-tx-2 block mb-1.5">
                  Проект
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent bg-panel cursor-pointer"
                >
                  <option value="">Выбери проект</option>
                  {(projects as any[]).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.niche ? `(${p.niche})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {activeWorker === "scripts" && (
                <>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-tx-2 block mb-1.5">
                      Тема видео
                    </label>
                    <input
                      value={scriptTopic}
                      onChange={(e) => setScriptTopic(e.target.value)}
                      placeholder="Например: 5 причин выбрать нас"
                      className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-tx-2 block mb-1.5">
                      Длительность
                    </label>
                    <select
                      value={scriptDuration}
                      onChange={(e) =>
                        setScriptDuration(Number(e.target.value))
                      }
                      className="w-full px-3 py-2.5 border border-line-strong rounded-lg text-sm outline-none focus:border-accent bg-panel cursor-pointer"
                    >
                      <option value={15}>15 сек</option>
                      <option value={30}>30 сек</option>
                      <option value={60}>60 сек</option>
                      <option value={90}>90 сек</option>
                    </select>
                  </div>
                </>
              )}
              <button
                onClick={run}
                disabled={loading || !selectedProject}
                className="px-6 py-2.5 bg-accent text-on-accent text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Генерирую...
                  </>
                ) : (
                  `✦ Запустить`
                )}
              </button>
            </div>
            {error && <p className="text-xs text-neg mt-2">{error}</p>}
          </div>

          {/* Results */}
          {result && (
            <div className="bg-panel border border-line rounded-xl p-5">
              {/* SMM Manager result */}
              {activeWorker === "smm" && result.plan && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-tx-1">
                      Контент-план на неделю
                    </h3>
                    <span className="text-xs bg-accent-dim text-accent px-2.5 py-1 rounded-full font-medium">
                      {result.plan.week_theme}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {result.plan.days?.map((day: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-panel-2 rounded-xl"
                      >
                        <div className="text-center flex-shrink-0 w-16">
                          <p className="text-[10px] font-bold text-tx-2">
                            {day.day}
                          </p>
                          <p className="text-xs text-accent font-medium">
                            {day.best_time}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-tx-1">
                            {day.topic}
                          </p>
                          <p className="text-[10px] text-tx-3 mt-0.5">
                            {day.tip}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <span className="text-[9px] px-2 py-0.5 bg-chip text-c-2 rounded-full">
                            {day.platform}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 bg-chip text-c-2 rounded-full">
                            {day.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.plan.summary && (
                    <div className="mt-4 p-3 bg-accent-dim rounded-xl">
                      <p className="text-xs text-accent">
                        {result.plan.summary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Trend Analyst result */}
              {activeWorker === "trends" && result.analysis && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-tx-1 mb-2">
                      Актуальные тренды
                    </p>
                    <div className="space-y-2">
                      {result.analysis.trending_now?.map(
                        (t: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 border border-line rounded-xl"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${t.potential === "high" ? "bg-chip text-neg" : t.potential === "medium" ? "bg-chip text-c-3" : "bg-chip text-tx-2"}`}
                              >
                                {t.potential === "high"
                                  ? "Высокий"
                                  : t.potential === "medium"
                                    ? "Средний"
                                    : "Низкий"}
                              </span>
                              <p className="text-sm font-semibold text-tx-1">
                                {t.trend}
                              </p>
                            </div>
                            <p className="text-xs text-tx-2 mb-1">
                              {t.description}
                            </p>
                            <p className="text-[10px] text-accent font-medium">
                              {t.content_idea}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  {result.analysis.hashtag_groups?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-tx-1 mb-2">
                        Хэштеги
                      </p>
                      <div className="space-y-2">
                        {result.analysis.hashtag_groups.map(
                          (g: any, i: number) => (
                            <div key={i}>
                              <p className="text-[10px] text-tx-2 mb-1">
                                {g.group}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {g.tags?.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] px-2 py-0.5 bg-accent-dim text-accent rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {result.analysis.insight && (
                    <div className="p-3 bg-chip border border-amber-100 rounded-xl">
                      <p className="text-xs text-c-3 font-medium">
                        Главный инсайт: {result.analysis.insight}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Script Writer result */}
              {activeWorker === "scripts" && result.script && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-tx-1">
                      {result.script.title}
                    </h3>
                    <span className="text-xs text-tx-3">
                      {result.script.estimated_duration} сек
                    </span>
                  </div>
                  <div className="mb-3 p-3 bg-chip border border-line rounded-xl">
                    <p className="text-[10px] font-bold text-neg mb-1">
                      Хук (первые секунды)
                    </p>
                    <p className="text-sm text-tx-1">{result.script.hook}</p>
                  </div>
                  <div className="space-y-2 mb-3">
                    {result.script.scenes?.map((scene: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 border border-line rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] bg-chip text-tx-2 px-2 py-0.5 rounded font-mono">
                            {scene.seconds}
                          </span>
                          <span className="text-[10px] text-tx-2">
                            {scene.action}
                          </span>
                        </div>
                        {scene.voiceover && (
                          <p className="text-xs text-tx-1 mb-1">
                            {scene.voiceover}
                          </p>
                        )}
                        {scene.visual && (
                          <p className="text-[10px] text-tx-3">
                            {scene.visual}
                          </p>
                        )}
                        {scene.text_on_screen && (
                          <p className="text-[10px] text-c-2">
                            "{scene.text_on_screen}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-accent-dim rounded-xl mb-2">
                    <p className="text-xs text-accent font-medium">
                      CTA: {result.script.cta}
                    </p>
                  </div>
                  {result.script.filming_tips?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-tx-2 mb-1">
                        Советы по съёмке:
                      </p>
                      {result.script.filming_tips.map(
                        (tip: string, i: number) => (
                          <p key={i} className="text-[10px] text-tx-2">
                            • {tip}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Creative Director result */}
              {activeWorker === "creative" && result.campaign && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-tx-1">
                        {result.campaign.campaign_name}
                      </h3>
                      <p className="text-xs text-accent italic">
                        "{result.campaign.tagline}"
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-panel-2 rounded-xl">
                    <p className="text-xs text-tx-1">
                      {result.campaign.concept}
                    </p>
                  </div>
                  {result.campaign.content_pillars?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-tx-1 mb-2">
                        Столпы контента
                      </p>
                      <div className="space-y-2">
                        {result.campaign.content_pillars.map(
                          (p: any, i: number) => (
                            <div
                              key={i}
                              className="p-3 border border-line rounded-xl"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-tx-1">
                                  {p.name}
                                </p>
                                <span className="text-[10px] bg-accent-dim text-accent px-2 py-0.5 rounded-full">
                                  {p.percent}%
                                </span>
                              </div>
                              <p className="text-xs text-tx-2 mb-1">
                                {p.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {p.examples?.map((ex: string) => (
                                  <span
                                    key={ex}
                                    className="text-[9px] bg-chip text-tx-2 px-2 py-0.5 rounded"
                                  >
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {result.campaign.key_messages?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-tx-1 mb-2">
                        Ключевые сообщения
                      </p>
                      <div className="space-y-1">
                        {result.campaign.key_messages.map(
                          (m: string, i: number) => (
                            <p
                              key={i}
                              className="text-xs text-tx-2 flex items-start gap-2"
                            >
                              <span className="text-accent">→</span>
                              {m}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {result.campaign.creative_hooks?.length > 0 && (
                    <div className="p-3 bg-chip rounded-xl">
                      <p className="text-[10px] font-bold text-c-2 mb-2">
                        Нестандартные идеи
                      </p>
                      {result.campaign.creative_hooks.map(
                        (h: string, i: number) => (
                          <p key={i} className="text-xs text-c-2">
                            • {h}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
