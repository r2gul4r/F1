import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "F1 Pulse",
  description: "F1 시청 대시보드"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}