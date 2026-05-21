"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/supabase/types";

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
const TONES = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "expert", label: "Экспертный" },
  { value: "viral", label: "Вирусный" },
  { value: "premium", label: "Премиум" },
];
const LANGS = [
  { value: "ru", label: "Русский" },
  { value: "uz", label: "Узбекский" },
  { value: "en", label: "Английский" },
];

const EMPTY_FORM = {
  name: "",
  niche: "",
  description: "",
  audience: "",
  tone: "friendly",
  language: "ru",
};

export default function ProjectsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorDetail, setErrorDetail] = useState("");

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

      const { error } = await supabase.from("projects").insert({
        ...values,
        user_id: user.id,
        products: [],
      });
      if (error) throw new Error(`${error.code}: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErrorDetail("");
    },
    onError: (error: any) => {
      setErrorDetail(error.message);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail("");
    createMutation.mutate(form);
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-colors bg-white";

  return (
    <div className="p-4 md:p-6 max-w-4xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Проекты / бренды</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Управляйте брендами для генерации контента
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Новый проект
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Новый проект
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Название проекта *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Пятый элемент"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Ниша
                </label>
                <select
                  value={form.niche}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, niche: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Выберите нишу</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Описание бренда
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Производство бумажной продукции..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Целевая аудитория
              </label>
              <input
                value={form.audience}
                onChange={(e) =>
                  setForm((p) => ({ ...p, audience: e.target.value }))
                }
                placeholder="Магазины, покупатели, хозяйки"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Тон
                </label>
                <select
                  value={form.tone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tone: e.target.value }))
                  }
                  className={inputClass}
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Язык
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, language: e.target.value }))
                  }
                  className={inputClass}
                >
                  {LANGS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(createMutation.error || errorDetail) && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                <p className="font-medium">Ошибка при создании проекта:</p>
                <p className="text-xs mt-1 font-mono">{errorDetail}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? "Сохраняем..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
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
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-lg flex-shrink-0">
                📁
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.niche || "Без ниши"} ·{" "}
                  {TONES.find((t) => t.value === p.tone)?.label} ·{" "}
                  {LANGS.find((l) => l.value === p.language)?.label}
                </p>
                {p.description && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {p.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
                disabled={deleteMutation.isPending}
                className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors text-sm"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-sm font-medium text-gray-900 mb-1">Нет проектов</p>
          <p className="text-sm text-gray-400 mb-4">
            Создайте первый бренд чтобы начать генерацию
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#0F6E56] transition-colors"
          >
            + Создать проект
          </button>
        </div>
      )}
    </div>
  );
}
