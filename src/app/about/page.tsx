import Link from "next/link";
import { BrandLink } from "@/components/BrandLogo";

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[#05080b] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <BrandLink className="text-sm text-cyan-200" size={28} />
        <h1 className="mt-8 text-4xl font-black tracking-tight">
          About FlickBuddy
        </h1>
        <p className="mt-5 text-base leading-7 text-white/70">
          FlickBuddy is a beta movie and series discovery app built to help
          people decide what to watch faster. The product learns from likes,
          passes, saves, watched signals, search prompts, and direct feedback.
        </p>

        <section className="mt-10 rounded-md border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-bold">Data Attribution</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB. Movie and series metadata, posters, backdrops, trailers, and
            review data may be provided by The Movie Database.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-white/65">
          <Link href="/privacy" className="hover:text-cyan-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-cyan-200">
            Terms
          </Link>
        </div>
      </section>
    </main>
  );
}
