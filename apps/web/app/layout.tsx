import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { getProfile } from "@/lib/api";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Fonts are self-hosted by next/font with display: swap (section 14).
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  // Every page (including /admin) uses this metadata, so an unreachable API must not break rendering.
  const profile = await getProfile().catch(() => null);
  if (!profile) return { metadataBase: new URL(siteUrl), title: { default: "Portfolio", template: "%s — Portfolio" } };
  const title = profile.seoTitle ?? `${profile.fullName} — Portfolio`;
  const description = profile.seoDescription ?? profile.headline;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s — ${profile.fullName}` },
    description,
    openGraph: { type: "website", title, description, siteName: profile.fullName, url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a18" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
