import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-5 text-white">
      <section className="w-full max-w-md rounded-md border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-cyan-300 text-black">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-black">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-white/62">
          FlickBuddy can reopen cached screens, but fresh recommendations,
          profile sync, search, and movie details need a connection.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-black text-black"
          >
            Open cached feed
          </Link>
          <Link
            href="/discover"
            className="rounded-md border border-white/12 px-5 py-3 text-sm font-bold text-white/75"
          >
            Open discovery
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
          <BrandLogo size={18} />
          FlickBuddy PWA
        </div>
      </section>
    </main>
  );
}
