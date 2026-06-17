import type { Metadata } from "next";
import "../globals.css";
import QueryProvider from "@/components/features/QueryProvider";
import { ThemeProvider } from "@/components/features/ThemeProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "MVI Content Factory",
  description: "AI-генерация и автопостинг контента для соцсетей",
};

// Ставит тему до первой отрисовки → нет «мигания» при загрузке.
// По умолчанию светлая; запоминает выбор пользователя в localStorage.
const themeScript = `(function(){try{var t=localStorage.getItem('mvi-theme')||'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
