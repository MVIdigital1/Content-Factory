import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PAGE_PROMPTS: Record<string, string> = {
  dashboard:    "пользователь смотрит главный дашборд SMM-платформы (общие показатели, активность)",
  projects:     "пользователь управляет проектами и брендами клиентов",
  campaigns:    "пользователь работает с рекламными кампаниями и бюджетами",
  landings:     "пользователь создаёт или просматривает лендинги (страницы захвата лидов)",
  content:      "пользователь создаёт контент: посты, тексты, расписание публикаций",
  analytics:    "пользователь смотрит аналитику: охваты, CTR, ROI, конверсии",
  integrations: "пользователь настраивает интеграции с соцсетями и рекламными кабинетами",
  billing:      "пользователь смотрит тарифы и историю платежей",
  team:         "пользователь управляет командой и ролями",
  "ai-agents":  "пользователь работает с AI-агентами и автоматизацией",
  crm:          "пользователь работает с CRM и базой клиентов",
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page } = await req.json();
  const pageContext = PAGE_PROMPTS[page] ?? "пользователь работает в SMM-платформе";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Ты — краткий AI-советник внутри SMM-платформы для рынка Узбекистана/СНГ. Сейчас ${pageContext}.

Дай ровно 3 коротких практических совета на русском языке. Каждый совет — одно предложение, конкретный и actionable.

Верни ТОЛЬКО валидный JSON: {"tips":[{"icon":"эмодзи","text":"совет"},{"icon":"эмодзи","text":"совет"},{"icon":"эмодзи","text":"совет"}]}
Без markdown, без пояснений.`,
    }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ tips: parsed.tips ?? [] });
  } catch {
    return NextResponse.json({ tips: [] });
  }
}
