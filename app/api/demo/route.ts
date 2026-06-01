import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Проверить что уже нет проектов
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0)
    return NextResponse.json({ error: "Already has data" }, { status: 400 });

  // Создать демо проект
  const { data: project } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: "MVI Coffee — демо",
      niche: "Еда и напитки",
      description:
        "Уютная кофейня в центре города. Авторский кофе, свежая выпечка, Wi-Fi.",
      audience: "25-40 лет, офисные работники, фрилансеры",
      tone: "friendly",
      language: "ru",
      is_active: true,
      stop_words: "дешево, дёшево, скидка",
    })
    .select()
    .single();

  if (!project)
    return NextResponse.json(
      { error: "Failed to create demo project" },
      { status: 500 },
    );

  // Создать демо посты
  const demoPosts = [
    {
      project_id: project.id,
      type: "post",
      platform: "telegram",
      goal: "вовлечённость",
      title: "Утро начинается с нас",
      hook: "☕ Пока все ещё спят, мы уже варим лучший кофе в городе",
      caption:
        "Каждое утро мы начинаем в 7:00 — чтобы вы могли начать своё с идеальной чашкой кофе.\n\nНаш бариста Алишер выбирает только лучшие зерна из Эфиопии и Колумбии. Обжарка — каждую пятницу, свежесть — гарантирована.\n\nЗаходите на завтрак — круассаны ещё тёплые 🥐",
      hashtags: ["кофе", "ташкент", "кофейня", "доброеутро", "кофеман"],
      cta: "Где вы пьёте первый кофе утром? Пишите в комментарии 👇",
      status: "published",
      ai_model: "claude-sonnet-4-5",
    },
    {
      project_id: project.id,
      type: "reels",
      platform: "instagram",
      goal: "охват",
      title: "Процесс варки альтернативного кофе",
      hook: "Знаешь ли ты, что температура воды меняет вкус кофе на 40%?",
      caption:
        "Показываем как варим фильтр-кофе на V60 🫖\n\nКаждый параметр важен: температура 93°C, помол средний, соотношение 1:15. Результат — чашка с нотами персика и чёрной смородины.",
      hashtags: ["specialty", "v60", "кофе", "альтернатива", "бариста"],
      cta: "Хочешь попробовать? Приходи к нам в эти выходные",
      status: "generated",
      ai_model: "claude-sonnet-4-5",
    },
    {
      project_id: project.id,
      type: "post",
      platform: "telegram",
      goal: "продажи",
      title: "Бизнес-ланч для фрилансеров",
      hook: "📍 Ищешь тихое место для работы?",
      caption:
        "У нас есть всё что нужно фрилансеру:\n\n✅ Быстрый Wi-Fi (300 Мбит/с)\n✅ Розетки у каждого места\n✅ Тихая зона без музыки\n✅ Кофе с бесплатным рефиллом при заказе от 35 000 сум\n\nРаботаем с 7:00 до 22:00 без выходных.",
      hashtags: ["фриланс", "коворкинг", "ташкент", "работа"],
      cta: "Забронируй место заранее — пиши нам",
      status: "scheduled",
      ai_model: "claude-sonnet-4-5",
    },
  ];

  await supabase.from("contents").insert(demoPosts);

  // Создать демо задачу
  await supabase.from("tasks").insert({
    project_id: project.id,
    created_by: user.id,
    title: "Сфотографировать новое меню",
    description: "Нужны красивые фото для постов в Instagram",
    status: "todo",
    priority: "high",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Пометить что демо создано
  await supabase
    .from("profiles")
    .upsert({ id: user.id, demo_created: true })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, project_id: project.id });
}
