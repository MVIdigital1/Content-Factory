import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const RESEND_API = "https://api.resend.com";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, html, recipients, from_name } = await request.json();

  if (!subject || !html || !recipients?.length) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey)
    return NextResponse.json(
      { error: "Resend API key not configured" },
      { status: 500 },
    );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const fromEmail = process.env.EMAIL_FROM || "noreply@mvidigital.uz";
  const fromName = from_name || "MVI Content Factory";

  const results = [];
  for (const email of recipients.slice(0, 50)) {
    // лимит 50 за раз
    const res = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject,
        html,
      }),
    });
    const data = await res.json();
    results.push({ email, id: data.id, error: data.error });
  }

  const sent = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  // Логировать рассылку
  await supabase.from("email_campaigns").insert({
    user_id: user.id,
    subject,
    recipients_count: recipients.length,
    sent_count: sent,
    failed_count: failed,
    status: sent > 0 ? "sent" : "failed",
  });

  return NextResponse.json({ ok: true, sent, failed });
}
