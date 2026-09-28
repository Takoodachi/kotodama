import type { NextConfig } from "next";

/**
 * Two build targets:
 * - Default: a Node server (`next start`), with the security and service-worker headers below.
 * - GitHub Pages: `PAGES_BASE_PATH=/kotodama next build` writes a static site to `out/`,
 *   served from a sub-path. Static hosting can't send custom headers, so they're left out.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const serverConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The service worker must never be served from HTTP cache, or updates stall.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

const pagesConfig: NextConfig = {
  output: "export",
  basePath,
};

/** Identifies this build; the service worker uses it to swap caches on each deploy. */
const buildId = process.env.GITHUB_SHA?.slice(0, 10) ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  ...(basePath ? pagesConfig : serverConfig),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;
