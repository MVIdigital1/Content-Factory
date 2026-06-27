import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

const CLICK_SECRET = process.env.CLICK_SECRET_KEY!;
const PLAN_DURATION_DAYS: Record<string, number> = { pro: 30, business: 30 };

function verifySign(params: Record<string, string>): boolean {
  const { click_trans_id, service_id, click_paydoc_id, merchant_trans_id, amount, action, sign_time, sign_string } = params;
  const hash = crypto.createHash("md5")
    .update(`${click_trans_id}${service_id}${CLICK_SECRET}${merchant_trans_id}${amount}${action}${sign_time}`)
    .digest("hex");
  return hash === sign_string;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  if (!verifySign(params)) {
    return NextResponse.json({ error: -1, error_note: "Invalid signature" });
  }

  const orderId = params.merchant_trans_id;
  const action = Number(params.action);

  const payment = await queryOne<{ user_id: string; plan: string; status: string }>(
    "SELECT * FROM payments WHERE order_id = $1",
    [orderId]
  );
  if (!payment) return NextResponse.json({ error: 1, error_note: "Order not found" });

  if (action === 0) {
    return NextResponse.json({ click_trans_id: params.click_trans_id, merchant_trans_id: orderId, error: 0, error_note: "Success" });
  }

  if (action === 1) {
    if (params.error !== "0") {
      await query("UPDATE payments SET status = 'failed' WHERE order_id = $1", [orderId]);
      return NextResponse.json({ click_trans_id: params.click_trans_id, merchant_trans_id: orderId, error: 0, error_note: "Cancelled" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (PLAN_DURATION_DAYS[payment.plan] || 30));

    await Promise.all([
      query("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = $1", [orderId]),
      query("UPDATE user_tokens SET plan = $1, plan_expires_at = $2 WHERE user_id = $3", [payment.plan, expiresAt.toISOString(), payment.user_id]),
      query("UPDATE profiles SET plan = $1, plan_expires_at = $2 WHERE id = $3", [payment.plan, expiresAt.toISOString(), payment.user_id]),
    ]);

    return NextResponse.json({ click_trans_id: params.click_trans_id, merchant_trans_id: orderId, merchant_confirm_id: orderId, error: 0, error_note: "Success" });
  }

  return NextResponse.json({ error: -3, error_note: "Action not found" });
}
