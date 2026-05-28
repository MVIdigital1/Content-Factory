"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { useTranslations } from "next-intl";

const NICHES = [
  "Товары для дома",
  "Одежда и мода",
  "Еда и напитки",
  "Строительство",
  "IT / Технологии",
  "Красота и уход",
  "Спорт",
  "Другое",
];

const EMPTY_FORM = {
  name: "",
  niche: "",
  description: "",
  audience: "",
  tone: "friendly",
  language: "ru",
  stop_words: "",
  logo_url: "",
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-left flex items-center justify-between bg-white hover:border-[#1D9E75] outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder || "Выберите..."}
        </span>
        <span
          className={`text-gray-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-left text-gray-400 hover:bg-gray-50 cursor-pointer"
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-[#E1F5EE] hover:text-[#1D9E75] cursor-pointer transition-colors ${value === o.value ? "bg-[#E1F5EE] text-[#1D9E75] font-medium" : "text-gray-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectForm({
  values,
  setValues,
  onSubmit,
  onCancel,
  isPending,
  labels,
  toneOptions,
  langOptions,
  nicheOptions,
}: {
  values: typeof EMPTY_FORM;
  setValues: (fn: (p: typeof EMPTY_FORM) => typeof EMPTY_FORM) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  labels: Record<string, string>;
  toneOptions: { value: string; label: string }[];
  langOptions: { value: string; label: string }[];
  nicheOptions: { value: string; label: string }[];
}) {
  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {labels.name}
          </label>
          <input
            value={values.name}
            onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
            placeholder={labels.namePlaceholder}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {labels.niche}
          </label>
          <CustomSelect
            value={values.niche}
            onChange={(v) => setValues((p) => ({ ...p, niche: v }))}
            options={nicheOptions}
            placeholder={labels.nicheDefault}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {labels.description}
        </label>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues((p) => ({ ...p, description: e.target.value }))
          }
          placeholder={labels.descriptionPlaceholder}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {labels.audience}
        </label>
        <input
          value={values.audience}
          onChange={(e) =>
            setValues((p) => ({ ...p, audience: e.target.value }))
          }
          placeholder={labels.audiencePlaceholder}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {labels.tone}
          </label>
          <CustomSelect
            value={values.tone}
            onChange={(v) => setValues((p) => ({ ...p, tone: v }))}
            options={toneOptions}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {labels.language}
          </label>
          <CustomSelect
            value={values.language}
            onChange={(v) => setValues((p) => ({ ...p, language: v }))}
            options={langOptions}
          />
        </div>
      </div>
      {/* ← Новое поле: стоп-слова */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Стоп-слова{" "}
          <span className="text-gray-400 font-normal">
            (Claude никогда не использует)
          </span>
        </label>
        <input
          value={values.stop_words}
          onChange={(e) =>
            setValues((p) => ({ ...p, stop_words: e.target.value }))
          }
          placeholder="скидка, акция, дешево — через запятую"
          className={inputClass}
        />
      </div>
      {/* Логотип */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Логотип{" "}
          <span className="text-gray-400 font-normal">(URL картинки)</span>
        </label>
        <div className="flex gap-2 items-center">
          {values.logo_url && (
            <img
              src={values.logo_url}
              alt="logo"
              className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <input
            value={values.logo_url}
            onChange={(e) =>
              setValues((p) => ({ ...p, logo_url: e.target.value }))
            }
            placeholder="https://example.com/logo.png"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const t = useTranslations("projects");
  const tones = useTranslations("tones");
  const langs = useTranslations("langs");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [errorDetail, setErrorDetail] = useState("");

  const TONES = [
    { value: "friendly", label: tones("friendly") },
    { value: "expert", label: tones("expert") },
    { value: "viral", label: tones("viral") },
    { value: "premium", label: tones("premium") },
  ];
  const LANGS = [
    { value: "ru", label: langs("ru") },
    { value: "uz", label: langs("uz") },
    { value: "en", label: langs("en") },
  ];
  const NICHE_OPTIONS = NICHES.map((n) => ({ value: n, label: n }));

  const FORM_LABELS = {
    name: t("form.name"),
    namePlaceholder: t("form.namePlaceholder"),
    niche: t("form.niche"),
    nicheDefault: t("form.nicheDefault"),
    description: t("form.description"),
    descriptionPlaceholder: t("form.descriptionPlaceholder"),
    audience: t("form.audience"),
    audiencePlaceholder: t("form.audiencePlaceholder"),
    tone: t("form.tone"),
    language: t("form.language"),
    saving: t("form.saving"),
    save: t("form.save"),
    cancel: t("form.cancel"),
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  // Мини-статистика: количество постов и дата последнего
  const { data: contentStats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("project_id, created_at")
        .order("created_at", { ascending: false });
      if (!data) return {};
      const stats: Record<string, { count: number; lastDate: string }> = {};
      data.forEach((c) => {
        if (!stats[c.project_id])
          stats[c.project_id] = { count: 0, lastDate: c.created_at };
        stats[c.project_id].count++;
      });
      return stats;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_FORM) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");
      const { error } = await supabase
        .from("projects")
        .insert({ ...values, user_id: user.id, products: [] });
      if (error) throw new Error(`${error.code}: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErrorDetail("");
    },
    onError: (error: any) => setErrorDetail(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: typeof EMPTY_FORM;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      niche: p.niche || "",
      description: p.description || "",
      audience: p.audience || "",
      tone: p.tone || "friendly",
      language: p.language || "ru",
      stop_words: (p as any).stop_words || "",
      logo_url: (p as any).logo_url || "",
    });
  };

  const getDaysAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "сегодня";
    if (days === 1) return "вчера";
    return `${days} дн. назад`;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {t("newProject")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("form.title")}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
            >
              ×
            </button>
          </div>
          {errorDetail && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
              <p className="font-medium">{t("form.error")}</p>
              <p className="text-xs mt-1 font-mono">{errorDetail}</p>
            </div>
          )}
          <ProjectForm
            values={form}
            setValues={setForm}
            onSubmit={(e) => {
              e.preventDefault();
              setErrorDetail("");
              createMutation.mutate(form);
            }}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
            labels={FORM_LABELS}
            toneOptions={TONES}
            langOptions={LANGS}
            nicheOptions={NICHE_OPTIONS}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((p) => {
            const stats = contentStats?.[p.id];
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors"
              >
                {editingId === p.id ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Редактировать проект
                      </h3>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg"
                      >
                        ×
                      </button>
                    </div>
                    <ProjectForm
                      values={editForm}
                      setValues={setEditForm}
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate({ id: p.id, values: editForm });
                      }}
                      onCancel={() => setEditingId(null)}
                      isPending={updateMutation.isPending}
                      labels={FORM_LABELS}
                      toneOptions={TONES}
                      langOptions={LANGS}
                      nicheOptions={NICHE_OPTIONS}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className="w-10 h-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-lg flex-shrink-0 cursor-pointer overflow-hidden"
                      onClick={() => startEdit(p)}
                    >
                      {(p as any).logo_url ? (
                        <img
                          src={(p as any).logo_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        "📁"
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => startEdit(p)}
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.niche || t("noNiche")} · {tones(p.tone as any)} ·{" "}
                        {langs(p.language as any)}
                      </p>
                      {/* ← Мини-статистика */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {stats ? (
                          <>
                            <span className="text-[10px] text-gray-400">
                              📝 {stats.count} постов
                            </span>
                            <span className="text-[10px] text-gray-400">
                              🕐 Последний: {getDaysAgo(stats.lastDate)}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            Постов ещё нет
                          </span>
                        )}
                        {(p as any).stop_words && (
                          <span
                            className="text-[10px] text-amber-500"
                            title={(p as any).stop_words}
                          >
                            🚫 Стоп-слова
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-2 text-gray-300 hover:text-[#1D9E75] hover:bg-[#E1F5EE] rounded-lg transition-colors cursor-pointer text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-sm"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {t("empty.title")}
          </p>
          <p className="text-sm text-gray-400 mb-4">{t("empty.subtitle")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors cursor-pointer"
          >
            {t("empty.btn")}
          </button>
        </div>
      )}
    </div>
  );
}
