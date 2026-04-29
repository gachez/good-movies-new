import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FilmRabbit",
    short_name: "FilmRabbit",
    description: "A personalized movie recommendation feed.",
    start_url: "/",
    display: "standalone",
    background_color: "#05080b",
    theme_color: "#05080b",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/filmrabbit-mascot.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/filmrabbit-mascot-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/filmrabbit-mascot-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/filmrabbit-mascot-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
