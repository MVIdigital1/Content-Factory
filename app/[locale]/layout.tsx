import type { Metadata } from "next";
import "../globals.css";
import QueryProvider from "@/components/features/QueryProvider";
import { ThemeProvider } from "@/components/features/ThemeProvider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { LandingStructuredData } from "./structured-data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mvira.uz";

const META: Record<string, { title: string; description: string; keywords: string; ogLocale: string }> = {
  ru: {
    title: "mvira — AI-маркетинг платформа",
    description: "Создавай посты, сторис и рекламу для Telegram, Instagram и VK с помощью AI. Автопостинг, аналитика и командная работа в одном сервисе.",
    keywords: "AI маркетинг, автопостинг, контент для соцсетей, Telegram, Instagram, VK, SMM, генерация контента, mvira",
    ogLocale: "ru_RU",
  },
  uz: {
    title: "mvira — AI Marketing Platform",
    description: "Telegram, Instagram va VK uchun AI yordamida postlar, storilar va reklama yarating. Avtopublisher, analitika va jamoaviy ish.",
    keywords: "AI marketing, avtopublisher, ijtimoiy tarmoqlar uchun kontent, SMM, mvira",
    ogLocale: "uz_UZ",
  },
  en: {
    title: "mvira — AI Marketing Platform",
    description: "Create posts, stories and ads for Telegram, Instagram and VK with AI. Auto-publishing, analytics and team collaboration in one platform.",
    keywords: "AI marketing, auto-posting, social media content, Telegram, Instagram, VK, SMM, content generation, mvira",
    ogLocale: "en_US",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = META[locale] ?? META.ru;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: m.title,
      template: `%s | mvira`,
    },
    description: m.description,
    keywords: m.keywords,
    authors: [{ name: "MVI Digital", url: SITE_URL }],
    creator: "MVI Digital",
    publisher: "MVI Digital",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      siteName: "mvira",
      title: m.title,
      description: m.description,
      locale: m.ogLocale,
      alternateLocale: ["ru_RU", "uz_UZ", "en_US"].filter((l) => l !== m.ogLocale),
      url: `${SITE_URL}/${locale}`,
      images: [
        {
          url: `/og?locale=${locale}`,
          width: 1200,
          height: 630,
          alt: "mvira — AI Marketing Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
      images: [`/og?locale=${locale}`],
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        "ru": `${SITE_URL}/ru`,
        "uz": `${SITE_URL}/uz`,
        "en": `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/ru`,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
  };
}

// Ставит тему до первой отрисовки → нет «мигания» при загрузке.
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
        <LandingStructuredData locale={locale} />
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
