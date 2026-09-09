import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stevens Stats",
    short_name: "Stevens Stats",
    description:
      "Track & field results for the Stevens team — rosters, event bests and season progressions.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#992211",
    theme_color: "#992211",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
