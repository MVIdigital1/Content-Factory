import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [camps, contents, agents] = await Promise.all([
    query<{ project_id: string }>("SELECT project_id FROM ad_campaigns WHERE user_id = $1", [user.id]),
    query<{ project_id: string }>("SELECT project_id FROM contents WHERE user_id = $1", [user.id]),
    query<{ project_id: string }>("SELECT project_id FROM ai_agents WHERE user_id = $1 AND is_active = true", [user.id]),
  ]);

  const stats: Record<string, { campaigns: number; contents: number; agents: number }> = {};
  const ensure = (id: string) => { if (!stats[id]) stats[id] = { campaigns: 0, contents: 0, agents: 0 }; };

  camps.forEach((r) => { ensure(r.project_id); stats[r.project_id].campaigns++; });
  contents.forEach((r) => { if (r.project_id) { ensure(r.project_id); stats[r.project_id].contents++; } });
  agents.forEach((r) => { if (r.project_id) { ensure(r.project_id); stats[r.project_id].agents++; } });

  return NextResponse.json(stats);
}
