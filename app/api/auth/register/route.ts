import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
    }

    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email`,
      [email.toLowerCase(), passwordHash, full_name || null]
    );

    // Create default workspace
    await query(
      `INSERT INTO workspaces (name, owner_id, created_at) VALUES ($1, $2, NOW())`,
      ["Мой воркспейс", user.id]
    );

    // Create token_balance row
    await query(
      `INSERT INTO user_tokens (user_id, plan, tokens_total, tokens_used) VALUES ($1, 'free', 10000, 0) ON CONFLICT DO NOTHING`,
      [user.id]
    );

    const token = createToken(user.id, user.email);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  } catch (e: any) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
