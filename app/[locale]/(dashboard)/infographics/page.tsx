"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

const TOKEN_COST = 50;

type Infographic = {
  id: string;
  source_url: string;
  result_url: string | null;
  prompt: string | null;
  status: "pending" | "processing" | "done" | "error";
  created_at: string;
};

export default function InfographicsPage() {
  const qc = useQueryClient();
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load projects for selector
  const { data: projects = [] } = useQuery({
    queryKey: ["projects_selector"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      return res.ok ? res.json() : [];
    },
  });

  // Load infographics history
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["infographics"],
    queryFn: async () => {
      const res = await fetch("/api/infographics");
      return res.ok ? (res.json() as Promise<Infographic[]>) : [];
    },
  });

  // Token balance
  const { data: tokenData } = useQuery({
    queryKey: ["token_balance"],
    queryFn: async () => {
      const res = await fetch("/api/tokens/balance");
      return res.ok ? res.json() : null;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSourceFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setSourcePreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    setError("");
  };

  const handleGenerate = async () => {
    if (!sourceFile || !prompt.trim()) {
      setError("Загрузите изображение и опишите что нужно добавить");
      return;
    }
    if (tokenData && tokenData.tokens_remaining < TOKEN_COST) {
      setError(`Недостаточно токенов. Нужно ${TOKEN_COST}, доступно ${tokenData.tokens_remaining}`);
      return;
    }

    setGenerating(true);
    setError("");

    try {
      // Upload source image via /api/upload
      const formData = new FormData();
      formData.append("file", sourceFile);
      formData.append("folder", "uploads/infographics");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Ошибка загрузки изображения");
      const { url: sourceUrl } = await uploadRes.json();

      // Spend tokens
      const spendRes = await fetch("/api/tokens/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "infographic_gen",
          description: `Инфографика: ${sourceFile.name}`,
          meta: { prompt },
        }),
      });
      if (!spendRes.ok) {
        const err = await spendRes.json();
        throw new Error(err.error === "insufficient_tokens"
          ? `Недостаточно токенов (нужно ${TOKEN_COST})`
          : "Ошибка списания токенов");
      }

      // Save to DB with status=processing
      const createRes = await fetch("/api/infographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId || null,
          source_url: sourceUrl,
          prompt: prompt.trim(),
          status: "processing",
        }),
      });
      if (!createRes.ok) throw new Error("Ошибка сохранения");
      const record = await createRes.json();

      // TODO: call real image-generation API here
      // For now — mark as done with source as placeholder result
      await fetch(`/api/infographics/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done", result_url: sourceUrl }),
      });

      qc.invalidateQueries({ queryKey: ["infographics"] });
      qc.invalidateQueries({ queryKey: ["token_balance"] });

      // Reset form
      setSourceFile(null);
      setSourcePreview(null);
      setPrompt("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 rounded-[8px] border border-line text-[12px] outline-none focus:border-line-strong bg-panel text-tx-1 placeholder:text-tx-3";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-tx-1">Инфографика</h1>
          <p className="text-[12px] text-tx-3 mt-0.5">
            Загрузи изображение и опиши что добавить — AI обработает его
          </p>
        </div>
        {tokenData && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-line bg-panel-2">
            <span style={{ fontSize: 13 }}>⚡</span>
            <span className="text-[12px] font-semibold text-tx-1">
              {tokenData.tokens_remaining}
            </span>
            <span className="text-[11px] text-tx-3">токенов</span>
            <span className="text-[10px] text-tx-3 ml-1">
              (−{TOKEN_COST} за генерацию)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-line rounded-[12px] overflow-hidden cursor-pointer hover:border-line-strong transition-colors"
            onClick={() => !sourcePreview && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {sourcePreview ? (
              <div className="relative">
                <img
                  src={sourcePreview}
                  alt="Исходное изображение"
                  className="w-full object-cover"
                  style={{ maxHeight: 280 }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourceFile(null);
                    setSourcePreview(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-[12px] cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
                >
                  ✕
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-[7px] text-[11px] cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
                >
                  Заменить
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                  style={{ background: "var(--chip)" }}
                >
                  <span style={{ fontSize: 22 }}>🖼️</span>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-tx-1">
                    Загрузить изображение
                  </p>
                  <p className="text-[11px] text-tx-3 mt-1">
                    PNG, JPG, WEBP · до 10 МБ
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-tx-2 mb-1">
              Проект (необязательно)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={inp}
            >
              <option value="">— без проекта —</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-tx-2 mb-1">
              Что нужно добавить / изменить *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Например: добавь текст «Скидка 30%» большими буквами сверху, сделай фон белым, добавь логотип в правый нижний угол..."
              className={`${inp} resize-none`}
              rows={5}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-[8px] text-[11px] text-neg border border-neg/30 bg-neg/5">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!sourceFile || !prompt.trim() || generating}
            className="w-full py-3 rounded-[9px] text-[13px] font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--accent)", color: "var(--on-accent)", border: "none" }}
          >
            {generating
              ? "⟳ Обрабатываю..."
              : `✦ Сгенерировать  (−${TOKEN_COST} токенов)`}
          </button>

          <p className="text-[10px] text-tx-3 text-center">
            После подключения AI API результат будет готов за ~30 секунд
          </p>
        </div>

        {/* Right: history */}
        <div>
          <h2 className="text-[13px] font-semibold text-tx-1 mb-3">
            История генераций
          </h2>
          {isLoading ? (
            <div className="text-[12px] text-tx-3 text-center py-10">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-line rounded-[12px]">
              <p style={{ fontSize: 28 }}>🖼️</p>
              <p className="text-[12px] text-tx-3 mt-2">Ещё нет генераций</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-line rounded-[10px] overflow-hidden"
                  style={{ background: "var(--panel-2)" }}
                >
                  <div className="flex gap-3 p-3">
                    <img
                      src={item.result_url ?? item.source_url}
                      alt=""
                      className="rounded-[7px] object-cover flex-shrink-0"
                      style={{ width: 64, height: 64 }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              item.status === "done"
                                ? "var(--pos)/15"
                                : item.status === "error"
                                  ? "var(--neg)/15"
                                  : "var(--chip)",
                            color:
                              item.status === "done"
                                ? "var(--pos)"
                                : item.status === "error"
                                  ? "var(--neg)"
                                  : "var(--tx-3)",
                          }}
                        >
                          {item.status === "done"
                            ? "✓ Готово"
                            : item.status === "processing"
                              ? "⟳ Обработка"
                              : item.status === "error"
                                ? "✕ Ошибка"
                                : "Ожидание"}
                        </span>
                        <span className="text-[10px] text-tx-3">
                          {new Date(item.created_at).toLocaleDateString("ru", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-tx-2 line-clamp-2">
                        {item.prompt}
                      </p>
                    </div>
                    {item.result_url && (
                      <a
                        href={item.result_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-accent self-start flex-shrink-0"
                        style={{ textDecoration: "none" }}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
