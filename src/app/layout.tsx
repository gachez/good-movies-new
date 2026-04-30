import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWARegister } from "@/components/PWARegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "FlickBuddy",
    template: "%s | FlickBuddy",
  },
  description: "A personalized movie and series discovery app.",
  applicationName: "FlickBuddy",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/flickbuddy-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/flickbuddy-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/flickbuddy-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "FlickBuddy",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "FlickBuddy",
    description: "A personalized movie recommendation feed.",
    siteName: "FlickBuddy",
    type: "website",
    images: [
      {
        url: "/icons/flickbuddy.png",
        width: 625,
        height: 625,
        alt: "FlickBuddy logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWARegister />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}
