import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── старые цвета ──────────────────────────────────
        accent: "var(--accent)",
        brand: {
          blue: "#185FA5",
          "blue-light": "#E6F1FB",
          orange: "#854F0B",
          "orange-light": "#FAEEDA",
        },
        // ── новые CSS-переменные (тёмная тема без dark:) ──
        bg: "var(--bg)",
        sidebar: "var(--sidebar)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        "tx-1": "var(--tx-1)",
        "tx-2": "var(--tx-2)",
        "tx-3": "var(--tx-3)",
        "accent-dim": "var(--accent-dim)",
        "on-accent": "var(--on-accent)",
        "pos-dim": "var(--pos-dim)",
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
};

export default config;
