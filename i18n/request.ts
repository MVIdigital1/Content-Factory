import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  const locales = ["ru", "uz", "en"];
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale)) {
    locale = "ru";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
