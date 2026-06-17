import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PLAN_PRICES: Record<string, number> = {
  pro: 14900, // в тийинах (149 сум * 100)
  business: 39900, // в тийинах
};

const PLAN_PRICES_UZS: Record<string, number> = {
  pro: 149000,
  business: 399000,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, method } = await request.json();
  if (!plan || !PLAN_PRICES[plan])
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const amount = PLAN_PRICES[plan];
  const orderId = `${user.id}-${plan}-${Date.now()}`;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ru/billing?success=1&plan=${plan}`;

  // Сохранить pending платёж
  await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      plan,
      amount_uzs: PLAN_PRICES_UZS[plan],
      method,
      order_id: orderId,
      status: "pending",
    })
    .select()
    .single();

  let paymentUrl: string;

  if (method === "payme") {
    // Payme checkout URL
    const merchantId = process.env.PAYME_MERCHANT_ID!;
    const params = {
      m: merchantId,
      ac: JSON.stringify({ order_id: orderId }),
      a: amount * 100, // в тийинах
      c: returnUrl,
      l: "ru",
    };
    const encoded = Buffer.from(JSON.stringify(params)).toString("base64");
    paymentUrl = `https://checkout.paycom.uz/${encoded}`;
  } else {
    // Click checkout URL
    const serviceId = process.env.CLICK_SERVICE_ID!;
    const merchantId = process.env.CLICK_MERCHANT_ID!;
    paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${PLAN_PRICES_UZS[plan]}&transaction_param=${orderId}&return_url=${encodeURIComponent(returnUrl)}&currency_code=UZS`;
  }

  return NextResponse.json({ url: paymentUrl, orderId });
}
