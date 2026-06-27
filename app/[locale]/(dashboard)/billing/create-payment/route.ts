import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

const PLAN_PRICES: Record<string, number> = { pro: 14900, business: 39900 };
const PLAN_PRICES_UZS: Record<string, number> = { pro: 149000, business: 399000 };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, method } = await request.json();
  if (!plan || !PLAN_PRICES[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const amount = PLAN_PRICES[plan];
  const orderId = `${user.id}-${plan}-${Date.now()}`;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ru/billing?success=1&plan=${plan}`;

  await query(
    "INSERT INTO payments (user_id, plan, amount, provider, order_id, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
    [user.id, plan, PLAN_PRICES_UZS[plan], method, orderId]
  );

  let paymentUrl: string;
  if (method === "payme") {
    const merchantId = process.env.PAYME_MERCHANT_ID!;
    const params = { m: merchantId, ac: JSON.stringify({ order_id: orderId }), a: amount * 100, c: returnUrl, l: "ru" };
    const encoded = Buffer.from(JSON.stringify(params)).toString("base64");
    paymentUrl = `https://checkout.paycom.uz/${encoded}`;
  } else {
    const serviceId = process.env.CLICK_SERVICE_ID!;
    const merchantId = process.env.CLICK_MERCHANT_ID!;
    paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${PLAN_PRICES_UZS[plan]}&transaction_param=${orderId}&return_url=${encodeURIComponent(returnUrl)}&currency_code=UZS`;
  }

  return NextResponse.json({ url: paymentUrl, orderId });
}
