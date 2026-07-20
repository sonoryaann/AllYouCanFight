import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppMenu } from "@/components/AppMenu";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "All You Can Fight",
  description: "Conta i pezzi, sfida gli amici, vinci la cena all-you-can-eat.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AYCF",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fbf7f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${baloo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-rice text-nori">
        {children}
        <AppMenu />
        <Analytics />
      </body>
    </html>
  );
}
