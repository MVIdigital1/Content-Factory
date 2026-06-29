const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mvira.uz";

export function LandingStructuredData({ locale }: { locale: string }) {
  const names: Record<string, string> = {
    ru: "mvira — AI-маркетинг платформа",
    uz: "mvira — AI Marketing Platform",
    en: "mvira — AI Marketing Platform",
  };

  const descriptions: Record<string, string> = {
    ru: "Создавай посты, сторис и рекламу для Telegram, Instagram и VK с помощью AI. Автопостинг, аналитика и командная работа.",
    uz: "Telegram, Instagram va VK uchun AI yordamida postlar, storilar va reklama yarating.",
    en: "Create posts, stories and ads for Telegram, Instagram and VK with AI. Auto-publishing, analytics and team collaboration.",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "mvira",
        description: descriptions[locale] ?? descriptions.ru,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "MVI Digital",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/og?locale=${locale}`,
          width: 1200,
          height: 630,
        },
        sameAs: [],
      },
      {
        "@type": "SoftwareApplication",
        name: names[locale] ?? names.ru,
        description: descriptions[locale] ?? descriptions.ru,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/${locale}`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: locale === "ru" ? "14 дней бесплатно" : "14 days free trial",
        },
        featureList:
          locale === "ru"
            ? ["AI-генерация контента", "Автопостинг", "Аналитика", "Командная работа", "Мультиязычность"]
            : ["AI content generation", "Auto-publishing", "Analytics", "Team collaboration", "Multilingual"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
