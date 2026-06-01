import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId");
  if (!contentId)
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  const { data } = await supabase
    .from("post_comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ comments: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId, text } = await request.json();
  if (!contentId || !text?.trim())
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      content_id: contentId,
      user_id: user.id,
      user_email: user.email,
      text: text.trim(),
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase
    .from("post_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
