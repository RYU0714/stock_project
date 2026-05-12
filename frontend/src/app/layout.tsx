import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "US Stock Short-Term Analysis",
  description: "1-5 day swing trading analysis dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
