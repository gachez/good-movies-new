import { BrandLink } from "@/components/BrandLogo";

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-[#05080b] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <BrandLink className="text-sm text-cyan-200" size={22} />
        <h1 className="mt-8 text-4xl font-black tracking-tight">
          Terms of Use
        </h1>
        <p className="mt-3 text-sm text-white/45">Beta draft</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-white/70">
          <section>
            <h2 className="text-lg font-bold text-white">Beta Product</h2>
            <p className="mt-2">
              FlickBuddy is provided as a beta product. Features, limits,
              recommendations, availability, and data models may change while
              the product is being tested.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Recommendations</h2>
            <p className="mt-2">
              Recommendations are generated from metadata, AI ranking, and user
              feedback. They may be inaccurate, incomplete, or unavailable on a
              user&apos;s streaming services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Acceptable Use</h2>
            <p className="mt-2">
              Users may not abuse the beta, attempt to bypass usage limits,
              scrape the service, interfere with other users, or submit unlawful
              content through feedback or list fields.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Third-Party Content</h2>
            <p className="mt-2">
              Movie and series data may come from third-party sources including
              TMDB. FlickBuddy does not own third-party metadata, images,
              trailers, reviews, or streaming catalog information.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
