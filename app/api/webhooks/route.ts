import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Отправить событие на все настроенные webhook URLs пользователя
export async function triggerWebhooks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("url, secret")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [event]);

  if (!webhooks?.length) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (wh.secret) headers["X-Webhook-Secret"] = wh.secret;

      await fetch(wh.url, { method: "POST", headers, body });
    }),
  );
}

// CRUD для управления webhook URLs
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ webhooks: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, name, events, secret } = await request.json();
  if (!url || !name || !events?.length)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      user_id: user.id,
      url,
      name,
      events,
      secret: secret || null,
      is_active: true,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase.from("webhooks").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
