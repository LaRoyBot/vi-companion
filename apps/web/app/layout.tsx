import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vi-companion.vercel.app"),
  title: "VI Companion — Your player workspace",
  description: "An independent player workspace for manually tracking sessions, objectives, collections and private notes across PS5 and Xbox.",
  applicationName: "VI Companion",
  openGraph: {
    title: "VI Companion",
    description: "Your personal cross-platform player workspace.",
    siteName: "VI Companion",
    type: "website",
    images: [{ url: "/icon.svg", width: 256, height: 256, alt: "VI Companion" }],
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
