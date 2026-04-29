import { FilmRabbitLoader } from "@/components/FilmRabbitLoader";

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#05080b] px-6 text-white">
      <FilmRabbitLoader
        title="Preparing your recommendations..."
        message="FilmRabbit is lining up the best matches for your search."
      />
    </main>
  );
}
