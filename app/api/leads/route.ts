import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { landing_id, name, phone, email } = await request.json();
  if (!landing_id) return NextResponse.json({ error: "Missing landing_id" }, { status: 400 });

  await query(
    "INSERT INTO leads (landing_id, name, phone, email) VALUES ($1, $2, $3, $4)",
    [landing_id, name || null, phone || null, email || null]
  );
  return NextResponse.json({ ok: true });
}
