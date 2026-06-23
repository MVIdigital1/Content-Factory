import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET — верификация webhook от Meta
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST — получение лидов из Meta Lead Ads
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const leadId = change.value?.leadgen_id;
      if (!leadId) continue;

      // Find the Meta platform record to get access_token
      const { data: platform } = await supabase
        .from("ad_platforms")
        .select("user_id, access_token")
        .eq("platform_key", "meta")
        .eq("is_active", true)
        .single();

      if (!platform?.access_token) continue;

      // Fetch full lead data from Graph API
      let lead: any;
      try {
        const leadRes = await fetch(
          `https://graph.facebook.com/${leadId}?fields=field_data&access_token=${platform.access_token}`
        );
        lead = await leadRes.json();
      } catch {
        continue;
      }

      const fields: { name: string; values: string[] }[] = lead.field_data ?? [];
      const get = (name: string) =>
        fields.find((f) => f.name === name)?.values?.[0] ?? null;

      const phone = get("phone_number") ?? get("phone");
      const name = get("full_name") ?? get("first_name");
      const email = get("email");

      if (!phone) continue;

      await supabase.from("leads").insert({
        user_id: platform.user_id,
        source: "meta_ads",
        name,
        phone,
        email,
        meta_lead_id: leadId,
        status: "new",
      });

      // TODO: здесь вызов AI-бота
      // await triggerVapiCall({ phone, userId: platform.user_id });
    }
  }

  return NextResponse.json({ ok: true });
}
