import { createClient, createAdminClient } from "@/lib/supabase/server";
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

  const supabase = await createClient(); // for auth cookie check only
  const admin = createAdminClient(); // bypasses RLS — sees all users' data

  const [
    { count: totalUsers },
    { count: totalContents },
    { count: totalPublished },
    { count: totalScheduled },
    { data: users },
    { data: contents },
    { data: scheduledPosts },
    { data: integrations },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("contents").select("*", { count: "exact", head: true }),
    admin
      .from("contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    admin
      .from("scheduled_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("contents")
      .select("*, projects(user_id, name)")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("scheduled_posts")
      .select("*, contents(title, platform, project_id)")
      .order("scheduled_at", { ascending: true })
      .limit(100),
    admin
      .from("integrations")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  // Get emails from auth
  const { data: authData } = await admin.auth.admin.listUsers();
  const authUsers = authData?.users || [];

  // Build user map
  const userMap: Record<string, any> = {};
  authUsers.forEach((au) => {
    userMap[au.id] = au;
  });

  // Count contents per user
  const contentCountMap: Record<string, number> = {};
  const publishedCountMap: Record<string, number> = {};
  (contents || []).forEach((c: any) => {
    const uid = c.projects?.user_id;
    if (uid) {
      contentCountMap[uid] = (contentCountMap[uid] || 0) + 1;
      if (c.status === "published")
        publishedCountMap[uid] = (publishedCountMap[uid] || 0) + 1;
    }
  });

  const usersWithData = (users || []).map((u: any) => ({
    ...u,
    email: userMap[u.id]?.email || u.email || "—",
    last_sign_in_at: userMap[u.id]?.last_sign_in_at || null,
    contents_count: contentCountMap[u.id] || 0,
    published_count: publishedCountMap[u.id] || 0,
  }));

  // Enrich contents with user info
  const enrichedContents = (contents || []).map((c: any) => {
    const uid = c.projects?.user_id;
    const user = uid ? usersWithData.find((u: any) => u.id === uid) : null;
    return {
      ...c,
      user_id: uid,
      user_name: user?.full_name || "—",
      user_email: user?.email || "—",
    };
  });

  // Enrich scheduled posts
  const enrichedScheduled = (scheduledPosts || []).map((p: any) => {
    const uid = p.contents?.project_id;
    const user = usersWithData.find((u: any) => u.id === uid);
    return {
      ...p,
      content_title: p.contents?.title || "—",
      platform: p.contents?.platform || p.platform || "—",
      user_name: user?.full_name || "—",
      user_email: user?.email || "—",
    };
  });

  return (
    <AdminDashboardClient
      stats={{
        totalUsers: totalUsers ?? 0,
        totalContents: totalContents ?? 0,
        totalPublished: totalPublished ?? 0,
        totalScheduled: totalScheduled ?? 0,
      }}
      users={usersWithData}
      contents={enrichedContents}
      scheduledPosts={enrichedScheduled}
      integrations={integrations || []}
    />
  );
}
