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
    default: "FilmRabbit",
    template: "%s | FilmRabbit",
  },
  description: "A personalized movie recommendation feed.",
  applicationName: "FilmRabbit",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/filmrabbit-mascot.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/filmrabbit-mascot-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/filmrabbit-mascot-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "FilmRabbit",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "FilmRabbit",
    description: "A personalized movie recommendation feed.",
    siteName: "FilmRabbit",
    type: "website",
    images: [
      {
        url: "/icons/filmrabbit-mascot.jpg",
        width: 1024,
        height: 1024,
        alt: "FilmRabbit mascot logo",
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
