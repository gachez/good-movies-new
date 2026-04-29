import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicListStoryViewer } from "@/components/lists/PublicListStoryViewer";
import { getPublicListBySlug } from "@/lib/lists";

interface ShareListPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ShareListPageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = getPublicListBySlug(slug);

  if (!list) {
    return {
      title: "Shared list not found",
    };
  }

  return {
    title: `${list.name} by ${list.creator.name}`,
    description:
      list.description ||
      `A FilmRabbit list with ${list.movies.length} movies and series.`,
    openGraph: {
      title: `${list.name} | FilmRabbit`,
      description:
        list.description ||
        `A FilmRabbit list with ${list.movies.length} movies and series.`,
      type: "website",
      images: list.movies[0]?.movie.backdrop_path
        ? [
            {
              url: `https://image.tmdb.org/t/p/w1280${list.movies[0].movie.backdrop_path}`,
              width: 1280,
              height: 720,
              alt: list.name,
            },
          ]
        : undefined,
    },
  };
}

export default async function SharedListPage({ params }: ShareListPageProps) {
  const { slug } = await params;
  const list = getPublicListBySlug(slug);

  if (!list) {
    notFound();
  }

  return <PublicListStoryViewer list={list} />;
}
