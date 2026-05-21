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
};

// Custom select component
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
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-left flex items-center justify-between bg-white hover:border-[#1D9E75] focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] outline-none transition-colors cursor-pointer"
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

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  const ProjectForm = ({
    values,
    setValues,
    onSubmit,
    onCancel,
    isPending,
  }: any) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t("form.name")}
          </label>
          <input
            value={values.name}
            onChange={(e) =>
              setValues((p: any) => ({ ...p, name: e.target.value }))
            }
            placeholder={t("form.namePlaceholder")}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t("form.niche")}
          </label>
          <CustomSelect
            value={values.niche}
            onChange={(v) => setValues((p: any) => ({ ...p, niche: v }))}
            options={NICHE_OPTIONS}
            placeholder={t("form.nicheDefault")}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {t("form.description")}
        </label>
        <textarea
          value={values.description}
          onChange={(e) =>
            setValues((p: any) => ({ ...p, description: e.target.value }))
          }
          placeholder={t("form.descriptionPlaceholder")}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {t("form.audience")}
        </label>
        <input
          value={values.audience}
          onChange={(e) =>
            setValues((p: any) => ({ ...p, audience: e.target.value }))
          }
          placeholder={t("form.audiencePlaceholder")}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t("form.tone")}
          </label>
          <CustomSelect
            value={values.tone}
            onChange={(v) => setValues((p: any) => ({ ...p, tone: v }))}
            options={TONES}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t("form.language")}
          </label>
          <CustomSelect
            value={values.language}
            onChange={(v) => setValues((p: any) => ({ ...p, language: v }))}
            options={LANGS}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? t("form.saving") : t("form.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {t("form.cancel")}
        </button>
      </div>
    </form>
  );

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

      {/* Create form */}
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
            onSubmit={(e: any) => {
              e.preventDefault();
              setErrorDetail("");
              createMutation.mutate(form);
            }}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {/* Projects list */}
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
          {projects.map((p) => (
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
                    onSubmit={(e: any) => {
                      e.preventDefault();
                      updateMutation.mutate({ id: p.id, values: editForm });
                    }}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-10 h-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-lg flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditForm({
                        name: p.name,
                        niche: p.niche || "",
                        description: p.description || "",
                        audience: p.audience || "",
                        tone: p.tone || "friendly",
                        language: p.language || "ru",
                      });
                    }}
                  >
                    📁
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditForm({
                        name: p.name,
                        niche: p.niche || "",
                        description: p.description || "",
                        audience: p.audience || "",
                        tone: p.tone || "friendly",
                        language: p.language || "ru",
                      });
                    }}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.niche || t("noNiche")} · {tones(p.tone as any)} ·{" "}
                      {langs(p.language as any)}
                    </p>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditForm({
                          name: p.name,
                          niche: p.niche || "",
                          description: p.description || "",
                          audience: p.audience || "",
                          tone: p.tone || "friendly",
                          language: p.language || "ru",
                        });
                      }}
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
          ))}
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
