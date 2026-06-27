import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await queryOne<{ count: string }>("SELECT COUNT(*) FROM projects WHERE user_id = $1", [user.id]);
  if (Number(existing?.count || 0) > 0) return NextResponse.json({ error: "Already has data" }, { status: 400 });

  const project = await queryOne<{ id: string }>(
    `INSERT INTO projects (user_id, name, niche, description, audience, tone, language, is_active, stop_words)
     VALUES ($1, 'MVI Coffee — демо', 'Еда и напитки', 'Уютная кофейня в центре города. Авторский кофе, свежая выпечка, Wi-Fi.',
             '25-40 лет, офисные работники, фрилансеры', 'friendly', 'ru', true, $2) RETURNING id`,
    [user.id, ["дешево", "дёшево", "скидка"]]
  );
  if (!project) return NextResponse.json({ error: "Failed to create demo project" }, { status: 500 });

  await query(
    `INSERT INTO contents (project_id, user_id, type, platform, goal, title, hook, caption, hashtags, cta, status, ai_model)
     VALUES
     ($1, $2, 'post', 'telegram', 'вовлечённость', 'Утро начинается с нас', '☕ Пока все ещё спят, мы уже варим лучший кофе в городе',
      'Каждое утро мы начинаем в 7:00 — чтобы вы могли начать своё с идеальной чашкой кофе.', $3, 'Где вы пьёте первый кофе утром? Пишите в комментарии 👇', 'published', 'claude-sonnet-4-6'),
     ($1, $2, 'reels', 'instagram', 'охват', 'Процесс варки альтернативного кофе', 'Знаешь ли ты, что температура воды меняет вкус кофе на 40%?',
      'Показываем как варим фильтр-кофе на V60 🫖', $4, 'Хочешь попробовать? Приходи к нам в эти выходные', 'generated', 'claude-sonnet-4-6'),
     ($1, $2, 'post', 'telegram', 'продажи', 'Бизнес-ланч для фрилансеров', '📍 Ищешь тихое место для работы?',
      'У нас есть всё что нужно фрилансеру:', $5, 'Забронируй место заранее — пиши нам', 'scheduled', 'claude-sonnet-4-6')`,
    [project.id, user.id,
      ["кофе", "ташкент", "кофейня", "доброеутро", "кофеман"],
      ["specialty", "v60", "кофе", "альтернатива", "бариста"],
      ["фриланс", "коворкинг", "ташкент", "работа"]]
  );

  await query(
    `INSERT INTO tasks (project_id, user_id, title, description, status, priority, due_date)
     VALUES ($1, $2, 'Сфотографировать новое меню', 'Нужны красивые фото для постов в Instagram', 'todo', 'high', $3)`,
    [project.id, user.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()]
  );

  await query(
    "INSERT INTO profiles (id, demo_created) VALUES ($1, true) ON CONFLICT (id) DO UPDATE SET demo_created = true",
    [user.id]
  );

  return NextResponse.json({ ok: true, project_id: project.id });
}
