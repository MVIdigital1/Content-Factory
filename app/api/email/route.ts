import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

const RESEND_API = "https://api.resend.com";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, html, recipients, from_name } = await request.json();

  if (!subject || !html || !recipients?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 });

  const fromEmail = process.env.EMAIL_FROM || "noreply@mvira.uz";
  const fromName = from_name || "MVI Content Factory";

  const results = [];
  for (const email of recipients.slice(0, 50)) {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [email], subject, html }),
    });
    const data = await res.json();
    results.push({ email, id: data.id, error: data.error });
  }

  const sent = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  await query(
    "INSERT INTO email_campaigns (user_id, subject, recipients_count, sent_count, failed_count, status) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.id, subject, recipients.length, sent, failed, sent > 0 ? "sent" : "failed"]
  );

  return NextResponse.json({ ok: true, sent, failed });
}
