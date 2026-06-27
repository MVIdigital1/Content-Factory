import { query, queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadId = change.value?.leadgen_id;
      if (!leadId) continue;

      const platform = await queryOne<{ user_id: string; access_token: string }>(
        "SELECT user_id, access_token FROM ad_platforms WHERE platform_key = 'meta' AND is_active = true LIMIT 1"
      );
      if (!platform?.access_token) continue;

      let lead: any;
      try {
        const leadRes = await fetch(`https://graph.facebook.com/${leadId}?fields=field_data&access_token=${platform.access_token}`);
        lead = await leadRes.json();
      } catch { continue; }

      const fields: { name: string; values: string[] }[] = lead.field_data ?? [];
      const get = (name: string) => fields.find((f) => f.name === name)?.values?.[0] ?? null;

      const phone = get("phone_number") ?? get("phone");
      const name = get("full_name") ?? get("first_name");
      const email = get("email");

      if (!phone) continue;

      await query(
        "INSERT INTO leads (user_id, source, name, phone, email, meta_lead_id, status) VALUES ($1, 'meta_ads', $2, $3, $4, $5, 'new')",
        [platform.user_id, name, phone, email, leadId]
      );
    }
  }

  return NextResponse.json({ ok: true });
}
