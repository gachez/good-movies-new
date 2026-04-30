import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  description: "A personalized movie recommendation feed.",
  applicationName: "FlickBuddy",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/FlickBuddy-mascot.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/FlickBuddy-mascot-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/FlickBuddy-mascot-192.png",
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
        url: "/icons/FlickBuddy-mascot.jpg",
        width: 1024,
        height: 1024,
        alt: "FlickBuddy mascot logo",
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
        {children}
      </body>
    </html>
  );
}
