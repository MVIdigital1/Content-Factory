import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const MOCK_NAMES: Record<string, string[]> = {
  meta: ["Весенняя акция", "Ретаргетинг", "Look-alike аудитория"],
  google: ["Поиск — брендовые", "Поиск — общие запросы", "КМС ремаркетинг"],
  yandex: ["Поиск Яндекс", "РСЯ — интересы", "Смарт-баннеры"],
};

function mockCampaigns(platform: string) {
  const names = MOCK_NAMES[platform] ?? ["Кампания 1", "Кампания 2"];
  return names.map((name, i) => ({
    id: `mock_${i}`, name, status: i < 2 ? "active" : "paused",
    spend: Math.round(Math.random() * 18000 + 1500),
    impressions: Math.round(Math.random() * 250000 + 15000),
    clicks: Math.round(Math.random() * 4000 + 150),
    ctr: Number((Math.random() * 2.5 + 0.5).toFixed(2)),
    leads: Math.round(Math.random() * 25), isMock: true,
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rec = await queryOne<{ access_token: string; ad_account_id: string | null }>(
    "SELECT * FROM ad_platforms WHERE user_id = $1 AND platform_key = $2 AND is_active = true",
    [user.id, platform]
  );

  if (!rec) return NextResponse.json({ connected: false, campaigns: [] });

  try {
    if (platform === "google" && rec.access_token && rec.ad_account_id) {
      const customerId = (rec.ad_account_id ?? "").replace(/\D/g, "");
      if (!customerId) throw new Error("no customer id");
      const res = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${rec.access_token}`, "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({ query: "SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return NextResponse.json({ connected: true, campaigns: (json.results ?? []).map((r: any) => ({
        id: String(r.campaign?.id ?? ""), name: r.campaign?.name ?? "",
        status: r.campaign?.status?.toLowerCase() === "enabled" ? "active" : "paused",
        spend: (Number(r.metrics?.costMicros) || 0) / 1_000_000,
        impressions: Number(r.metrics?.impressions) || 0,
        clicks: Number(r.metrics?.clicks) || 0,
        ctr: Number(((Number(r.metrics?.ctr) || 0) * 100).toFixed(2)),
        leads: 0, isMock: false,
      })) });
    }

    if (platform === "meta" && rec.access_token && rec.ad_account_id) {
      const accountId = rec.ad_account_id.startsWith("act_") ? rec.ad_account_id : `act_${rec.ad_account_id}`;
      const res = await fetch(`https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,insights{spend,impressions,clicks,ctr}&access_token=${rec.access_token}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return NextResponse.json({ connected: true, campaigns: (json.data ?? []).map((c: any) => {
        const ins = c.insights?.data?.[0] ?? {};
        return { id: c.id, name: c.name, status: c.status === "ACTIVE" ? "active" : "paused",
          spend: Number(ins.spend) || 0, impressions: Number(ins.impressions) || 0,
          clicks: Number(ins.clicks) || 0, ctr: Number(Number(ins.ctr || 0).toFixed(2)), leads: 0, isMock: false };
      }) });
    }
    if (platform === "yandex" && rec.access_token) {
      const today = new Date();
      const dateFrom = new Date(today.getTime() - 30 * 86_400_000).toISOString().split("T")[0];
      const dateTo = today.toISOString().split("T")[0];

      const reportBody = JSON.stringify({
        params: {
          SelectionCriteria: { DateFrom: dateFrom, DateTo: dateTo },
          FieldNames: ["CampaignId", "CampaignName", "CampaignStatus", "Impressions", "Clicks", "Cost", "Ctr"],
          ReportName: "mvira-campaigns",
          ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
          DateRangeType: "CUSTOM_DATE",
          Format: "TSV",
          IncludeVAT: "NO",
          IncludeDiscount: "NO",
        },
      });
      const reportHeaders: Record<string, string> = {
        Authorization: `Bearer ${rec.access_token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Accept-Language": "ru",
        skipReportHeader: "true",
        skipReportSummary: "true",
        returnMoneyInMicros: "false",
      };

      const deadline = Date.now() + 25_000;
      let tsv: string | null = null;
      while (Date.now() < deadline) {
        const res = await fetch("https://api.direct.yandex.com/v5/reports", {
          method: "POST",
          headers: reportHeaders,
          body: reportBody,
        });
        if (res.status === 401) {
          await query(
            "UPDATE ad_platforms SET is_active = false WHERE user_id = $1 AND platform_key = 'yandex'",
            [user.id]
          );
          return NextResponse.json({ error: "token_expired", needs_reconnect: true }, { status: 401 });
        }
        if (res.status === 200) { tsv = await res.text(); break; }
        if (res.status === 400) {
          const err = await res.json().catch(() => ({})) as any;
          throw new Error(err?.error?.errorCode ?? "yandex_bad_request");
        }
        // 201 (queued) or 202 (processing) — wait 3s and retry
        await new Promise(r => setTimeout(r, 3000));
      }
      if (!tsv) throw new Error("yandex_report_timeout");

      const lines = tsv.trim().split("\n");
      const colNames = lines[0].split("\t");
      const idx = (name: string) => colNames.indexOf(name);
      const campaigns = lines.slice(1).filter(l => l.trim()).map(line => {
        const cols = line.split("\t");
        return {
          id: cols[idx("CampaignId")] ?? "",
          name: cols[idx("CampaignName")] ?? "",
          status: cols[idx("CampaignStatus")] === "SERVING" ? "active" : "paused",
          spend: Number(cols[idx("Cost")]) || 0,
          impressions: Number(cols[idx("Impressions")]) || 0,
          clicks: Number(cols[idx("Clicks")]) || 0,
          ctr: Number(Number(cols[idx("Ctr")] || 0).toFixed(2)),
          leads: 0,
          isMock: false,
        };
      });
      return NextResponse.json({ connected: true, campaigns });
    }
  } catch (e: any) {
    if (platform === "yandex") {
      return NextResponse.json({ connected: true, campaigns: [], error: String(e?.message ?? "api_error") });
    }
  }

  return NextResponse.json({ connected: true, campaigns: mockCampaigns(platform), isMock: true });
}
