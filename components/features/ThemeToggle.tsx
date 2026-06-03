"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-tx-2 hover:text-tx-1 hover:border-line-strong transition-colors cursor-pointer flex-shrink-0"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
