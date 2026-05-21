import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/features/QueryProvider";

export const metadata: Metadata = {
  title: "MVI Content Factory",
  description: "AI-генерация и автопостинг контента для соцсетей",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
