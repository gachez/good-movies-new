"use client";

import Link from "next/link";
import { Compass, Home, Search, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Compass, label: "Discover", href: "/discover" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function AppNav() {
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 flex h-16 w-[min(94vw,500px)] -translate-x-1/2 items-center justify-around rounded-full border border-white/10 bg-[#0b1116]/90 px-4 shadow-2xl shadow-black/50 backdrop-blur-xl lg:w-[520px]">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex flex-col items-center gap-1 text-white/90 transition hover:text-cyan-300"
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] text-white/60">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
