import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mvira.uz";
const LOCALES = ["ru", "uz", "en"] as const;

// Public routes that should be indexed
const PUBLIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/auth/login", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/auth/register", priority: 0.8, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      entries.push({
        url: `${SITE_URL}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${SITE_URL}/${l}${route.path}`])
          ),
        },
      });
    }
  }

  return entries;
}
