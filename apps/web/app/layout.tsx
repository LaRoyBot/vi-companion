import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VI Companion — Your player workspace",
  description: "A private, cross-platform player workspace for sessions, personal goals and collections.",
  applicationName: "VI Companion",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
