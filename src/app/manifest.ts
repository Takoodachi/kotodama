import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/basePath";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBasePath("/"),
    name: "Kotodama · Japanese practice",
    short_name: "Kotodama",
    description: "Drill kana, kanji, words, phrases and sentences with spaced repetition.",
    lang: "en",
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["education"],
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: withBasePath("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: withBasePath("/icons/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "Practice",
        url: withBasePath("/practice"),
        icons: [{ src: withBasePath("/icons/icon-192.png"), sizes: "192x192" }],
      },
    ],
  };
}
