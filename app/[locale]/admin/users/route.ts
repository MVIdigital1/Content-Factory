import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token");
  return adminToken?.value === process.env.ADMIN_SECRET;
}

export async function PATCH(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, is_blocked } = await request.json();
  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ is_blocked })
    .eq("id", userId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await request.json();
  const supabase = await createClient();

  // Delete user data
  await supabase.from("contents").delete().eq("user_id", userId);
  await supabase.from("integrations").delete().eq("user_id", userId);
  await supabase
    .from("projects")
    .update({ is_active: false })
    .eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
  await supabase.auth.admin.deleteUser(userId);

  return NextResponse.json({ ok: true });
}
