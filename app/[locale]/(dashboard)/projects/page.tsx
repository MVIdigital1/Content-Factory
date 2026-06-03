"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";
import { useTranslations } from "next-intl";
import { ChevronDown, Pencil, Trash2, FolderOpen } from "lucide-react";

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
        className="w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm text-left flex items-center justify-between bg-panel hover:border-accent outline-none transition-colors cursor-pointer"
      >
        <span className={selected ? "text-tx-1" : "text-tx-3"}>
          {selected?.label || placeholder || "Выберите..."}
        </span>
        <ChevronDown
          size={15}
          className={`text-tx-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-panel border border-line-strong rounded-lg shadow-lg overflow-hidden">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-left text-tx-3 hover:bg-hover cursor-pointer"
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
              className={`w-full px-3 py-2 text-sm text-left hover:bg-accent-dim hover:text-accent cursor-pointer transition-colors ${value === o.value ? "bg-accent-dim text-accent font-medium" : "text-tx-1"}`}
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
    "w-full px-3 py-2.5 rounded-lg border border-line-strong text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-panel";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
          <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
        <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
        <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
          <label className="block text-xs font-medium text-tx-2 mb-1.5">
            {labels.tone}
          </label>
          <CustomSelect
            value={values.tone}
            onChange={(v) => setValues((p) => ({ ...p, tone: v }))}
            options={toneOptions}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-tx-2 mb-1.5">
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
        <label className="block text-xs font-medium text-tx-2 mb-1.5">
          Стоп-слова{" "}
          <span className="text-tx-3 font-normal">
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
        <label className="block text-xs font-medium text-tx-2 mb-1.5">
          Логотип <span className="text-tx-3 font-normal">(URL картинки)</span>
        </label>
        <div className="flex gap-2 items-center">
          {values.logo_url && (
            <img
              src={values.logo_url}
              alt="logo"
              className="w-9 h-9 rounded-lg object-cover border border-line-strong flex-shrink-0"
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
          className="px-4 py-2 bg-accent hover:opacity-90 text-on-accent text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-line-strong text-tx-2 text-sm rounded-lg hover:bg-hover transition-colors cursor-pointer"
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

  // Мини-статистика + health score
  const { data: contentStats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contents")
        .select("project_id, created_at")
        .order("created_at", { ascending: false });
      if (!data) return {};
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const stats: Record<
        string,
        { count: number; lastDate: string; thisWeek: number }
      > = {};
      data.forEach((c) => {
        if (!stats[c.project_id])
          stats[c.project_id] = {
            count: 0,
            lastDate: c.created_at,
            thisWeek: 0,
          };
        stats[c.project_id].count++;
        if (c.created_at >= sevenDaysAgo) stats[c.project_id].thisWeek++;
      });
      return stats;
    },
  });

  const getHealthScore = (thisWeek: number) => {
    if (thisWeek >= 5) return { label: "Активный", color: "text-accent" };
    if (thisWeek >= 2) return { label: "Умеренный", color: "text-c-3" };
    if (thisWeek >= 1) return { label: "Низкий", color: "text-c-3" };
    return { label: "Неактивен", color: "text-neg" };
  };

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
          <div className="ui-label">Проекты</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-tx-1 mt-1.5">
            {t("title")}
          </h1>
          <p className="text-[13px] text-tx-2 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 text-on-accent text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {t("newProject")}
        </button>
      </div>

      {showForm && (
        <div className="bg-panel rounded-xl border border-line-strong p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-tx-1">
              {t("form.title")}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-tx-3 hover:text-tx-2 text-lg cursor-pointer"
            >
              ×
            </button>
          </div>
          {errorDetail && (
            <div className="bg-chip border border-line rounded-lg px-3 py-2 text-sm text-neg mb-4">
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
              className="bg-panel rounded-xl border border-line p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-chip rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-chip rounded w-1/3 mb-2" />
                  <div className="h-3 bg-chip rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((p) => {
            const stats = contentStats?.[p.id];
            const health = getHealthScore(stats?.thisWeek || 0);
            if (editingId === p.id)
              return (
                <div
                  key={p.id}
                  className="col-span-2 md:col-span-3 lg:col-span-4 bg-panel rounded-xl border border-line-strong p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-tx-1">
                      Редактировать проект
                    </h3>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-tx-3 hover:text-tx-2 cursor-pointer text-lg"
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
              );
            return (
              <div
                key={p.id}
                className="bg-panel rounded-2xl border border-line overflow-hidden hover:border-accent hover:shadow-md transition-all group"
              >
                {/* Кликабельная карточка */}
                <Link href={`/projects/${p.id}`} className="block p-4">
                  {/* Лого / аватар проекта */}
                  <div className="w-14 h-14 rounded-2xl bg-accent-dim flex items-center justify-center text-2xl mb-3 overflow-hidden border border-line">
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
                      <span>
                        {p.name[0]?.toUpperCase() || (
                          <FolderOpen size={16} className="opacity-70" />
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-tx-1 truncate mb-0.5">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-tx-3 truncate mb-3">
                    {p.niche || "Без ниши"}
                  </p>
                  {/* Мини статистика */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-tx-1">
                        {stats?.count || 0}
                      </p>
                      <p className="text-[10px] text-tx-3">постов</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-medium ${health.color}`}>
                        {health.label}
                      </p>
                      {stats && (
                        <p className="text-[9px] text-tx-3">
                          {getDaysAgo(stats.lastDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                {/* Кнопки действий */}
                <div className="px-4 pb-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(p)}
                    className="flex-1 py-1.5 text-[10px] font-medium border border-line-strong rounded-lg text-tx-2 hover:bg-hover cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <Pencil size={11} /> Изменить
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                    className="px-2.5 py-1.5 text-[10px] border border-line rounded-lg text-neg hover:bg-hover cursor-pointer inline-flex items-center"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-panel rounded-xl border border-line">
          <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center mb-3 mx-auto">
            <FolderOpen size={22} className="text-accent" strokeWidth={1.6} />
          </div>
          <p className="text-sm font-medium text-tx-1 mb-1">
            {t("empty.title")}
          </p>
          <p className="text-sm text-tx-3 mb-4">{t("empty.subtitle")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-accent text-on-accent text-sm font-semibold rounded-lg hover:opacity-90 transition-colors cursor-pointer"
          >
            {t("empty.btn")}
          </button>
        </div>
      )}
    </div>
  );
}
