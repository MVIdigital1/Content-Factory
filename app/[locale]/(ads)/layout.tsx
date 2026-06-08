import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PostCentro OS",
  description: "Единое рабочее пространство для управления рекламой",
};

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
