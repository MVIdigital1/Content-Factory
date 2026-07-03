import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function toSlug(name: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",
    й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",
    у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",
    э:"e",ю:"yu",я:"ya",
  };
  const transliterated = name.toLowerCase().split("").map((c) => map[c] ?? c).join("");
  const base = transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const uid = Math.random().toString(36).slice(2, 8);
  return `${base}-${uid}`;
}

function buildPrompt(body: Record<string, string>): string {
  const { businessName, niche, city, offer, audience, pain, advantages, tone, templateId, oldPrice, newPrice, productEmoji } = body;

  const base = `Бизнес: ${businessName}. Ниша: ${niche}. Город: ${city || "не указан"}.
Оффер: ${offer}. Аудитория: ${audience}. Боль: ${pain || "не указана"}. Преимущества: ${advantages || "не указаны"}. Тон: ${tone}.`;

  if (templateId === "product") {
    const priceInfo = newPrice
      ? `Старая цена: ${oldPrice || "не указана"}. Новая цена: ${newPrice}.`
      : "Цена не указана — укажи 'по запросу'.";
    return `${base}
${priceInfo} Эмодзи товара: ${productEmoji || "🛒"}.

Создай лендинг ТОВАР для продажи. В блоке "price" используй ТОЧНЫЕ значения цен из данных выше (не придумывай).
Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "badge": "короткая акционная метка (3-5 слов, напр. 'Скидка 35% только сейчас')",
      "headline": "яркий заголовок продукта (до 8 слов)",
      "subheadline": "выгода или решение боли (1-2 предложения)",
      "cta": "Узнать цену",
      "centered": true
    },
    {
      "type": "price",
      "emoji": "эмодзи товара из данных выше",
      "oldPrice": "старая цена из данных (если есть, иначе пропусти поле)",
      "newPrice": "новая цена из данных",
      "cta": "Заказать сейчас"
    },
    {
      "type": "features",
      "title": "Почему выбирают нас",
      "items": [
        {"icon": "✅", "title": "преимущество 1", "desc": "1-2 предложения"},
        {"icon": "⚡", "title": "преимущество 2", "desc": "1-2 предложения"},
        {"icon": "🏆", "title": "преимущество 3", "desc": "1-2 предложения"}
      ]
    },
    {
      "type": "form",
      "title": "Заказать со скидкой",
      "subtitle": "Оставьте заявку — перезвоним за 5 минут",
      "button": "Оформить заказ",
      "dark": true,
      "note": "🤖 AI-менеджер свяжется с вами за 1 минуту"
    }
  ]
}`;
  }

  if (templateId === "appointment") {
    return `${base}

Создай лендинг ЗАПИСЬ НА ПРИЁМ/КОНСУЛЬТАЦИЮ. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "eyebrow": "короткая фраза о записи (5-7 слов)",
      "headline": "главный заголовок (до 10 слов)",
      "subheadline": "кратко о записи и выгоде (1-2 предложения)",
      "cta": "Записаться онлайн"
    },
    {
      "type": "features",
      "title": "Как проходит приём",
      "items": [
        {"icon": "📅", "title": "шаг 1", "desc": "описание"},
        {"icon": "💬", "title": "шаг 2", "desc": "описание"},
        {"icon": "✅", "title": "шаг 3", "desc": "описание"}
      ]
    },
    {
      "type": "form",
      "title": "Записаться на приём",
      "subtitle": "Выберите удобное время — подтвердим в течение часа",
      "button": "Записаться",
      "dark": false,
      "note": "Бесплатная запись · Без предоплаты"
    }
  ]
}`;
  }

  if (templateId === "event") {
    return `${base}

Создай лендинг СОБЫТИЕ/МЕРОПРИЯТИЕ. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "badge": "дата или статус (напр. '15 июля · Ташкент')",
      "headline": "название события (до 8 слов)",
      "subheadline": "что получат участники (1-2 предложения)",
      "cta": "Зарегистрироваться",
      "centered": true
    },
    {
      "type": "features",
      "title": "Что вас ждёт",
      "items": [
        {"icon": "🎤", "title": "элемент программы 1", "desc": "описание"},
        {"icon": "🤝", "title": "элемент программы 2", "desc": "описание"},
        {"icon": "🏆", "title": "элемент программы 3", "desc": "описание"}
      ]
    },
    {
      "type": "form",
      "title": "Зарегистрироваться на событие",
      "subtitle": "Места ограничены — зарегистрируйтесь сейчас",
      "button": "Зарегистрироваться",
      "dark": true,
      "note": "Регистрация бесплатная"
    }
  ]
}`;
  }

  if (templateId === "menu") {
    return `${base}

Создай лендинг МЕНЮ/КАТАЛОГ. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "eyebrow": "краткая фраза (5-7 слов)",
      "headline": "главный заголовок меню или каталога",
      "subheadline": "краткое описание ассортимента",
      "cta": "Смотреть меню"
    },
    {
      "type": "features",
      "title": "Популярные позиции",
      "items": [
        {"icon": "⭐", "title": "позиция 1", "desc": "описание и цена"},
        {"icon": "⭐", "title": "позиция 2", "desc": "описание и цена"},
        {"icon": "⭐", "title": "позиция 3", "desc": "описание и цена"},
        {"icon": "⭐", "title": "позиция 4", "desc": "описание и цена"}
      ]
    },
    {
      "type": "form",
      "title": "Заказать или забронировать",
      "subtitle": "Оставьте номер — перезвоним для подтверждения",
      "button": "Оставить заявку",
      "dark": false
    }
  ]
}`;
  }

  if (templateId === "callback") {
    return `${base}

Создай лендинг ОБРАТНЫЙ ЗВОНОК. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "eyebrow": "короткая фраза (5-7 слов)",
      "headline": "главный заголовок (до 10 слов)",
      "subheadline": "конкретная выгода от звонка (1-2 предложения)",
      "cta": "Заказать звонок"
    },
    {
      "type": "features",
      "title": "Что вы получите на консультации",
      "items": [
        {"icon": "📞", "title": "выгода 1", "desc": "описание"},
        {"icon": "💡", "title": "выгода 2", "desc": "описание"},
        {"icon": "✅", "title": "выгода 3", "desc": "описание"}
      ]
    },
    {
      "type": "form",
      "title": "Заказать бесплатный звонок",
      "subtitle": "Перезвоним в течение 5 минут в рабочее время",
      "button": "Перезвоните мне",
      "dark": true,
      "note": "🤖 AI-менеджер свяжется с вами за 1 минуту"
    }
  ]
}`;
  }

  // default: form / lead gen
  return `${base}

Создай лендинг для сбора ЗАЯВОК. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO заголовок страницы",
  "blocks": [
    {
      "type": "hero",
      "eyebrow": "короткая фраза над заголовком (5-7 слов)",
      "headline": "главный заголовок (до 10 слов)",
      "subheadline": "подзаголовок с деталями оффера (1-2 предложения)",
      "cta": "Получить консультацию"
    },
    {
      "type": "features",
      "title": "Почему выбирают нас",
      "items": [
        {"icon": "⚡", "title": "преимущество 1", "desc": "1-2 предложения"},
        {"icon": "✅", "title": "преимущество 2", "desc": "1-2 предложения"},
        {"icon": "🏆", "title": "преимущество 3", "desc": "1-2 предложения"}
      ]
    },
    {
      "type": "form",
      "title": "Оставить заявку",
      "subtitle": "Ответим в течение 30 минут",
      "button": "Отправить заявку",
      "dark": false
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { businessName, offer, audience, brandColor, templateId, bgImage, tone } = body;

    if (!businessName || !offer || !audience) {
      return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
    }

    const prompt = buildPrompt(body);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const slug = toSlug(businessName);

    const landing = await queryOne<{ id: string }>(
      `INSERT INTO landings (user_id, title, slug, content, published)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [
        user.id,
        parsed.title || businessName,
        slug,
        JSON.stringify({
          blocks: parsed.blocks || [],
          template_id: templateId || "form",
          bg_image: bgImage || null,
          settings: { brandColor: brandColor || "#6366f1", tone },
        }),
      ]
    );

    return NextResponse.json({ id: landing?.id, slug });
  } catch (err: any) {
    console.error("[landings/generate]", err);
    return NextResponse.json({ error: err.message || "Внутренняя ошибка" }, { status: 500 });
  }
}
