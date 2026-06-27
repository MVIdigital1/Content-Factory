import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await query("SELECT * FROM crm_clients WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, company, email, phone, status = "lead", budget, notes } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const clients = await query(
    "INSERT INTO crm_clients (user_id, name, company, email, phone, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [user.id, name, company || null, email || null, phone || null, status, notes || null]
  );
  return NextResponse.json(clients[0]);
}
