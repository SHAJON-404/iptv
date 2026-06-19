import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientPopupWrapper from "./components/ClientPopupWrapper";
import { AuthProvider } from "./hooks/useAuth";
import Script from "next/script";
import MobileNavBar from "./components/MobileNavBar";
import TurnstileGuard from "./components/TurnstileGuard";
import ViewerTracker from "./components/ViewerTracker";
import MaintenanceView from "./components/MaintenanceView";
import Footer from "./components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070414" },
    { media: "(prefers-color-scheme: light)", color: "#070414" },
  ],
};

export const metadata: Metadata = {
  title: "IPTV Player — Watch 6500+ Live TV Channels Free",
  description:
    "Stream 6500+ live TV channels from Bangladesh, India, and worldwide. Premium IPTV web player with HLS streaming, custom playlist support, and a modern UI. No app install needed.",
  keywords: [
    "IPTV",
    "live TV",
    "streaming",
    "HLS player",
    "TV channels",
    "Bangladesh TV",
    "sports live",
    "T Sports",
    "free TV",
    "online TV",
    "IPTV player",
    "m3u player",
    "web TV player",
  ],
  authors: [{ name: "S. SHAJON", url: "https://github.com/SHAJON-404" }],
  creator: "S. SHAJON",
  publisher: "S. SHAJON",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "IPTV Player",
    title: "IPTV Player — Watch 6500+ Live TV Channels Free",
    description:
      "Stream 6500+ live TV channels from Bangladesh, India, and worldwide. Premium IPTV web player with HLS streaming, custom playlist support, and a modern UI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IPTV Player — Live TV streaming with 6500+ channels",
        type: "image/png",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showPopup = process.env.SHOW_POPUP?.toLowerCase() === "true";
  const isMaintenance = process.env.MAINTANANCE?.toLowerCase() === "true";

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col pb-24 md:pb-0 bg-[#070414]">
        {isMaintenance ? (
          <MaintenanceView />
        ) : (
          <TurnstileGuard>
            <AuthProvider>
              <ViewerTracker />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
              <Footer />
              <MobileNavBar />
              <ClientPopupWrapper showPopup={showPopup} />
            </AuthProvider>
          </TurnstileGuard>
        )}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N36GM5VYZ7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N36GM5VYZ7');
          `}
        </Script>
      </body>
    </html>
  );
}
