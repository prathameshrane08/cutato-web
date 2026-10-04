import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Toaster from "@/app/Components/ui/Toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cutato-web.vercel.app";

const description =
  "Book top-rated salons and barbers with live availability, instant confirmation and secure payment.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cutato | Salon and barber booking",
    template: "%s | Cutato",
  },
  description,
  applicationName: "Cutato",
  openGraph: {
    type: "website",
    siteName: "Cutato",
    title: "Cutato | Salon and barber booking",
    description,
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Cutato | Salon and barber booking",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased`}>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
