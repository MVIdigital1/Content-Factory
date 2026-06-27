import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const PAYME_KEY = process.env.PAYME_SECRET_KEY!;
const PLAN_DURATION_DAYS: Record<string, number> = { pro: 30, business: 30 };

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization") || "";
  const encoded = auth.replace("Basic ", "");
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  return decoded === `Paycom:${PAYME_KEY}`;
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: { code: -32504, message: { ru: "Неверные данные авторизации" } }, id: null }, { status: 401 });
  }

  const body = await request.json();
  const { method, params, id } = body;

  switch (method) {
    case "CheckPerformTransaction": {
      const orderId = params?.account?.order_id;
      const payment = await queryOne<{ status: string }>("SELECT status FROM payments WHERE order_id = $1", [orderId]);
      if (!payment) return NextResponse.json({ error: { code: -31050, message: { ru: "Заказ не найден" } }, id });
      if (payment.status === "paid") return NextResponse.json({ error: { code: -31060, message: { ru: "Уже оплачено" } }, id });
      return NextResponse.json({ result: { allow: true }, id });
    }

    case "CreateTransaction": {
      const orderId = params?.account?.order_id;
      const payment = await queryOne("SELECT id FROM payments WHERE order_id = $1", [orderId]);
      if (!payment) return NextResponse.json({ error: { code: -31050, message: { ru: "Заказ не найден" } }, id });
      return NextResponse.json({ result: { create_time: Date.now(), transaction: orderId, state: 1 }, id });
    }

    case "PerformTransaction": {
      const orderId = params?.account?.order_id;
      const payment = await queryOne<{ user_id: string; plan: string; created_at: string }>("SELECT user_id, plan, created_at FROM payments WHERE order_id = $1", [orderId]);
      if (!payment) return NextResponse.json({ error: { code: -31050, message: { ru: "Заказ не найден" } }, id });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (PLAN_DURATION_DAYS[payment.plan] || 30));

      await Promise.all([
        query("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = $1", [orderId]),
        query("UPDATE user_tokens SET plan = $1, plan_expires_at = $2 WHERE user_id = $3", [payment.plan, expiresAt.toISOString(), payment.user_id]),
        query("UPDATE profiles SET plan = $1, plan_expires_at = $2 WHERE id = $3", [payment.plan, expiresAt.toISOString(), payment.user_id]),
      ]);

      return NextResponse.json({ result: { transaction: orderId, perform_time: Date.now(), state: 2 }, id });
    }

    case "CancelTransaction": {
      const orderId = params?.account?.order_id || params?.id;
      await query("UPDATE payments SET status = 'failed' WHERE order_id = $1", [orderId]);
      return NextResponse.json({ result: { transaction: orderId, cancel_time: Date.now(), state: -1 }, id });
    }

    case "CheckTransaction": {
      const orderId = params?.id;
      const payment = await queryOne<{ status: string; created_at: string; paid_at: string | null }>(
        "SELECT status, created_at, paid_at FROM payments WHERE order_id = $1", [orderId]
      );
      if (!payment) return NextResponse.json({ error: { code: -31050, message: { ru: "Не найден" } }, id });
      const stateMap: Record<string, number> = { pending: 1, paid: 2, failed: -1 };
      return NextResponse.json({
        result: {
          create_time: new Date(payment.created_at).getTime(),
          perform_time: payment.paid_at ? new Date(payment.paid_at).getTime() : 0,
          cancel_time: 0,
          transaction: orderId,
          state: stateMap[payment.status] || 1,
          reason: null,
        },
        id,
      });
    }

    default:
      return NextResponse.json({ error: { code: -32601, message: { ru: "Метод не найден" } }, id });
  }
}
