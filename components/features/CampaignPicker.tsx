"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, FileText, X } from "lucide-react";

type Props = {
  onSelect: (campaignId: string | null) => void;
};

export default function CampaignPicker({ onSelect }: Props) {
  const [choice, setChoice] = useState<"campaign" | "simple">("campaign");
  const [selectedId, setSelectedId] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns-picker"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      if (!res.ok) return [];
      const data = await res.json();
      return (data as any[]).filter((c) => ["ready", "running"].includes(c.status));
    },
  });

  // Если нет кампаний — не показываем модалку вообще
  if (!isLoading && campaigns.length === 0) {
    onSelect(null);
    return null;
  }

  if (isLoading) return null;

  const handleContinue = () => {
    if (choice === "campaign") {
      const id = selectedId || campaigns[0]?.id;
      onSelect(id || null);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={() => onSelect(null)} />
      <div className="relative w-full max-w-[320px] bg-panel border border-line rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">

        {/* Close */}
        <button onClick={() => onSelect(null)}
          className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-[7px] border border-line hover:bg-hover cursor-pointer">
          <X size={13} className="text-tx-3" />
        </button>

        <p className="text-[14px] font-semibold text-tx-1 mb-1">Куда публикуем пост?</p>
        <p className="text-[11px] text-tx-2 mb-4 leading-relaxed">Выбери — пост привяжется автоматически</p>

        <div className="space-y-2 mb-3">

          {/* В кампанию */}
          <div onClick={() => setChoice("campaign")}
            className={`rounded-[9px] border p-3 cursor-pointer transition-colors ${
              choice === "campaign" ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"
            }`}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                choice === "campaign" ? "bg-accent text-on-accent" : "bg-chip"
              }`}>
                <Megaphone size={12} strokeWidth={1.6} className={choice === "campaign" ? "text-on-accent" : "text-tx-3"} />
              </div>
              <p className={`text-[12px] font-medium ${choice === "campaign" ? "text-accent" : "text-tx-1"}`}>В кампанию</p>
            </div>
            <p className="text-[10px] text-tx-3 pl-8">Пост войдёт в выбранную кампанию</p>
          </div>

          {/* Выбор кампании */}
          {choice === "campaign" && (
            <select
              value={selectedId || campaigns[0]?.id || ""}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full h-9 px-3 border border-line rounded-[7px] text-[11px] text-tx-1 bg-panel-2 outline-none focus:border-line-strong cursor-pointer">
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.status === "running" ? "Активна" : "Запланирована"}
                </option>
              ))}
            </select>
          )}

          {/* Просто пост */}
          <div onClick={() => setChoice("simple")}
            className={`rounded-[9px] border p-3 cursor-pointer transition-colors ${
              choice === "simple" ? "border-accent bg-accent-dim" : "border-line hover:border-line-strong"
            }`}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                choice === "simple" ? "bg-accent text-on-accent" : "bg-chip"
              }`}>
                <FileText size={12} strokeWidth={1.6} className={choice === "simple" ? "text-on-accent" : "text-tx-3"} />
              </div>
              <p className={`text-[12px] font-medium ${choice === "simple" ? "text-accent" : "text-tx-1"}`}>Просто пост</p>
            </div>
            <p className="text-[10px] text-tx-3 pl-8">Без привязки к кампании</p>
          </div>
        </div>

        <button onClick={handleContinue}
          className="w-full py-2.5 bg-accent text-on-accent text-[12px] font-medium rounded-[8px] cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
          Продолжить →
        </button>

        <button onClick={() => onSelect(null)}
          className="w-full text-center text-[10px] text-tx-3 mt-2 cursor-pointer hover:text-tx-2">
          Пропустить
        </button>
      </div>
    </div>
  );
}
