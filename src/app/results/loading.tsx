import { FlickBuddyLoader } from "@/components/FilmRabbitLoader";

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-6 text-white">
      <FlickBuddyLoader
        title="Preparing your recommendations..."
        message="FlickBuddy is lining up the best matches for your search."
      />
    </main>
  );
}
