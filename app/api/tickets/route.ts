import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await query("SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
  return NextResponse.json(tickets);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, priority = "medium" } = await request.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const tickets = await query(
    "INSERT INTO tickets (user_id, title, description, priority, status) VALUES ($1, $2, $3, $4, 'open') RETURNING *",
    [user.id, title, description || null, priority]
  );
  return NextResponse.json(tickets[0]);
}
