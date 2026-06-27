import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const SOURCE_MAP: Record<string, string> = { meta: "meta_ads", google: "google_ads", yandex: "yandex" };

async function getGoogleStats(rec: any, days: number, leads: number) {
  const customerId = (rec.ad_account_id ?? "").replace(/\D/g, "");
  if (!customerId) throw new Error("no customer id");
  const dateRange = days === 7 ? "LAST_7_DAYS" : days === 90 ? "LAST_90_DAYS" : "LAST_30_DAYS";
  const res = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${rec.access_token}`, "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ query: `SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr FROM customer WHERE segments.date DURING ${dateRange}` }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const m = json.results?.[0]?.metrics ?? {};
  const spend = (Number(m.costMicros) || 0) / 1_000_000;
  const clicks = Number(m.clicks) || 0;
  const impressions = Number(m.impressions) || 0;
  return NextResponse.json({ connected: true, isMock: false, spend, impressions, clicks,
    ctr: Number(((Number(m.ctr) || 0) * 100).toFixed(2)), leads, conversion: clicks > 0 ? Number(((leads / clicks) * 100).toFixed(2)) : 0 });
}

async function getMetaStats(rec: any, days: number, leads: number) {
  if (!rec.access_token || !rec.ad_account_id) throw new Error("no token");
  const datePreset = days === 7 ? "last_7_days" : days === 90 ? "last_90_days" : "last_30_days";
  const accountId = rec.ad_account_id.startsWith("act_") ? rec.ad_account_id : `act_${rec.ad_account_id}`;
  const res = await fetch(`https://graph.facebook.com/v18.0/${accountId}/insights?fields=spend,impressions,clicks,ctr&date_preset=${datePreset}&access_token=${rec.access_token}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const d = json.data?.[0] ?? {};
  const clicks = Number(d.clicks) || 0;
  return NextResponse.json({ connected: true, isMock: false, spend: Number(d.spend) || 0,
    impressions: Number(d.impressions) || 0, clicks, ctr: Number(Number(d.ctr || 0).toFixed(2)), leads,
    conversion: clicks > 0 ? Number(((leads / clicks) * 100).toFixed(2)) : 0 });
}

function mockStats(rec: any, leads: number) {
  const spend = rec.monthly_spend ?? Math.round(Math.random() * 45000 + 5000);
  const impressions = Math.round(spend * 38);
  const clicks = Math.round(impressions * 0.026);
  const mockLeads = leads || Math.round(clicks * 0.032);
  return NextResponse.json({ connected: true, isMock: true, spend, impressions, clicks, ctr: 2.6, leads: mockLeads,
    conversion: clicks > 0 ? Number(((mockLeads / clicks) * 100).toFixed(2)) : 0 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const period = req.nextUrl.searchParams.get("period") ?? "30d";
  const days = PERIOD_DAYS[period] ?? 30;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rec = await queryOne<any>("SELECT * FROM ad_platforms WHERE user_id = $1 AND platform_key = $2 AND is_active = true", [user.id, platform]);
  if (!rec) return NextResponse.json({ connected: false });

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const leadsRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*) FROM leads WHERE user_id = $1 AND source = $2 AND created_at >= $3",
    [user.id, SOURCE_MAP[platform] ?? platform, since]
  );
  const leads = Number(leadsRow?.count || 0);

  try {
    if (platform === "google" && rec.access_token && rec.ad_account_id) return await getGoogleStats(rec, days, leads);
    if (platform === "meta" && rec.access_token && rec.ad_account_id) return await getMetaStats(rec, days, leads);
  } catch {}

  return mockStats(rec, leads);
}
