import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const COOKIE_NAME = "auth_token";

export type JwtPayload = {
  userId: string;
  email: string;
};

export function createToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Get current user from cookie (for server components / route handlers)
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const row = await queryOne<{ id: string; email: string; full_name: string }>(
      "SELECT id, email, full_name FROM users WHERE id = $1",
      [payload.userId]
    );
    if (!row) return null;
    return { ...row, avatar_url: null };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
