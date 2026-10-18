import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { brandCssVars } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(env.appUrl),
    title: {
      default: `${settings.brandName} — Staff Applications`,
      template: `%s · ${settings.brandName}`,
    },
    description: settings.description,
    applicationName: settings.brandName,
    keywords: ["staff applications", "recruitment", "community team", settings.brandName],
    openGraph: {
      title: `${settings.brandName} — Staff Applications`,
      description: settings.description,
      type: "website",
      siteName: settings.brandName,
      url: env.appUrl,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${settings.brandName} — staff applications`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.brandName} — Staff Applications`,
      description: settings.description,
      images: ["/og.png"],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05060f",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={brandCssVars(settings)}>
        {children}
      </body>
    </html>
  );
}
