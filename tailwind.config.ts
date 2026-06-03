import type { Config } from "tailwindcss";

/**
 * ВАЖНО: если у тебя уже есть tailwind.config.(js|ts) — НЕ заменяй его целиком,
 * а перенеси в свой `theme.extend` два блока: `colors` и `fontFamily` ниже,
 * и убедись что `content` покрывает ./app и ./components.
 *
 * Тёмная тема работает БЕЗ варианта `dark:` — цвета берутся из CSS-переменных,
 * которые меняются по атрибуту [data-theme="dark"] на <html>. Поэтому нигде
 * не нужно писать `dark:bg-...` — достаточно `bg-panel`, `text-tx-2` и т.д.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        sidebar: "var(--sidebar)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        "tx-1": "var(--tx-1)",
        "tx-2": "var(--tx-2)",
        "tx-3": "var(--tx-3)",
        accent: "var(--accent)",
        "accent-dim": "var(--accent-dim)",
        "on-accent": "var(--on-accent)",
        pos: "var(--pos)",
        neg: "var(--neg)",
        "c-2": "var(--c-2)",
        "c-3": "var(--c-3)",
        hover: "var(--hover)",
        chip: "var(--chip)",
        track: "var(--track)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
