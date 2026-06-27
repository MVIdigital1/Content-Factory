import { query, queryOne } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token");
  if (adminToken?.value !== process.env.ADMIN_SECRET) {
    redirect(`/${locale}/admin`);
  }

  const [
    totalUsersRow, totalContentsRow, totalPublishedRow, totalScheduledRow,
    users, contents, scheduledPosts, integrations,
  ] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*) FROM users"),
    queryOne<{ count: string }>("SELECT COUNT(*) FROM contents"),
    queryOne<{ count: string }>("SELECT COUNT(*) FROM contents WHERE status = 'published'"),
    queryOne<{ count: string }>("SELECT COUNT(*) FROM scheduled_posts WHERE status = 'pending'"),
    query("SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 100"),
    query("SELECT c.*, p.user_id AS project_user_id, p.name AS project_name FROM contents c LEFT JOIN projects p ON c.project_id = p.id ORDER BY c.created_at DESC LIMIT 200"),
    query("SELECT sp.*, c.title AS content_title, c.platform AS content_platform FROM scheduled_posts sp LEFT JOIN contents c ON sp.content_id = c.id ORDER BY sp.scheduled_at ASC LIMIT 100"),
    query("SELECT * FROM integrations ORDER BY created_at DESC"),
  ]);

  const contentCountMap: Record<string, number> = {};
  const publishedCountMap: Record<string, number> = {};
  (contents as any[]).forEach((c) => {
    const uid = c.project_user_id;
    if (uid) {
      contentCountMap[uid] = (contentCountMap[uid] || 0) + 1;
      if (c.status === "published") publishedCountMap[uid] = (publishedCountMap[uid] || 0) + 1;
    }
  });

  const usersWithData = (users as any[]).map((u) => ({
    ...u,
    contents_count: contentCountMap[u.id] || 0,
    published_count: publishedCountMap[u.id] || 0,
  }));

  const enrichedContents = (contents as any[]).map((c) => {
    const user = usersWithData.find((u: any) => u.id === c.project_user_id);
    return { ...c, user_id: c.project_user_id, user_name: user?.full_name || "—", user_email: user?.email || "—" };
  });

  const enrichedScheduled = (scheduledPosts as any[]).map((p) => ({
    ...p,
    platform: p.content_platform || p.platform || "—",
  }));

  return (
    <AdminDashboardClient
      stats={{
        totalUsers: Number(totalUsersRow?.count ?? 0),
        totalContents: Number(totalContentsRow?.count ?? 0),
        totalPublished: Number(totalPublishedRow?.count ?? 0),
        totalScheduled: Number(totalScheduledRow?.count ?? 0),
      }}
      users={usersWithData}
      contents={enrichedContents}
      scheduledPosts={enrichedScheduled}
      integrations={integrations as any[]}
    />
  );
}
