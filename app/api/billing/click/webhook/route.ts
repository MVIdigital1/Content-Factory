import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

const CLICK_SECRET = process.env.CLICK_SECRET_KEY!;
const PLAN_DURATION_DAYS: Record<string, number> = { pro: 30, business: 30 };

function verifySign(params: Record<string, string>): boolean {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    amount,
    action,
    sign_time,
    sign_string,
  } = params;
  const hash = crypto
    .createHash("md5")
    .update(
      `${click_trans_id}${service_id}${CLICK_SECRET}${merchant_trans_id}${amount}${action}${sign_time}`,
    )
    .digest("hex");
  return hash === sign_string;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => {
    params[k] = String(v);
  });

  if (!verifySign(params)) {
    return NextResponse.json({ error: -1, error_note: "Invalid signature" });
  }

  const orderId = params.merchant_trans_id;
  const action = Number(params.action);
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .single();
  if (!payment)
    return NextResponse.json({ error: 1, error_note: "Order not found" });

  // action=0 — проверка, action=1 — подтверждение
  if (action === 0) {
    return NextResponse.json({
      click_trans_id: params.click_trans_id,
      merchant_trans_id: orderId,
      error: 0,
      error_note: "Success",
    });
  }

  if (action === 1) {
    if (params.error !== "0") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("order_id", orderId);
      return NextResponse.json({
        click_trans_id: params.click_trans_id,
        merchant_trans_id: orderId,
        error: 0,
        error_note: "Cancelled",
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (PLAN_DURATION_DAYS[payment.plan] || 30),
    );

    await Promise.all([
      supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("order_id", orderId),
      supabase
        .from("profiles")
        .update({
          plan: payment.plan,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", payment.user_id),
    ]);

    return NextResponse.json({
      click_trans_id: params.click_trans_id,
      merchant_trans_id: orderId,
      merchant_confirm_id: orderId,
      error: 0,
      error_note: "Success",
    });
  }

  return NextResponse.json({ error: -3, error_note: "Action not found" });
}
