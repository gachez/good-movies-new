import { BrandLink } from "@/components/BrandLogo";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#05080b] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <BrandLink className="text-sm text-cyan-200" size={22} />
        <h1 className="mt-8 text-4xl font-black tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-white/45">Beta draft</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-white/70">
          <section>
            <h2 className="text-lg font-bold text-white">What We Collect</h2>
            <p className="mt-2">
              FlickBuddy stores account details, movie interactions, list
              activity, recommendation feedback, anonymous device identifiers,
              and basic analytics events so the beta can improve recommendations
              and measure product quality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">How We Use Data</h2>
            <p className="mt-2">
              We use this data to personalize the feed, build taste profiles,
              prevent abuse, understand which recommendations work, and debug
              product issues during the beta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Third-Party Data</h2>
            <p className="mt-2">
              FlickBuddy uses third-party services for authentication, AI
              ranking, movie metadata, and hosting. Movie metadata is provided
              through TMDB.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Deletion Requests</h2>
            <p className="mt-2">
              During beta, users can request deletion of their account, lists,
              interactions, feedback, and analytics records by contacting the
              project owner through the beta feedback channel.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
