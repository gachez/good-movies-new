import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlickBuddy",
    short_name: "FlickBuddy",
    id: "/",
    description: "A personalized movie and series discovery app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#05080b",
    theme_color: "#05080b",
    orientation: "portrait",
    categories: ["entertainment", "lifestyle"],
    icons: [
      {
        src: "/icons/flickbuddy-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/flickbuddy-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/flickbuddy-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
