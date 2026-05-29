import type { Metadata } from "next";
import "../globals.css";
import QueryProvider from "@/components/features/QueryProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "MVI Content Factory",
  description: "AI-генерация и автопостинг контента для соцсетей",
  other: {
    "facebook-domain-verification": "t15v67gps1dmz9nopsyx1jaang7izd",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
