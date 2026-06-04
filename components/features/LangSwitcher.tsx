"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

const LANGS = [
  { value: "ru", label: "RU" },
  { value: "uz", label: "UZ" },
  { value: "en", label: "EN" },
];

export default function LangSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    window.location.href = segments.join("/");
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {LANGS.map((lang) => (
        <button
          key={lang.value}
          onClick={() => handleChange(lang.value)}
          className={`flex-1 py-2 px-2 text-xs font-semibold rounded-md transition-all ${
            locale === lang.value
              ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
          style={
            locale === lang.value
              ? { background: "var(--on-accent)", color: "var(--accent)" }
              : {}
          }
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
