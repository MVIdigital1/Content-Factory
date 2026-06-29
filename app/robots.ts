import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mvira.uz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ru/", "/uz/", "/en/", "/ru", "/uz", "/en"],
        disallow: [
          "/ru/dashboard/",
          "/uz/dashboard/",
          "/en/dashboard/",
          "/ru/settings",
          "/uz/settings",
          "/en/settings",
          "/ru/billing",
          "/uz/billing",
          "/en/billing",
          "/ru/profile",
          "/uz/profile",
          "/en/profile",
          "/api/",
          "/admin/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
