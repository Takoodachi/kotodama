/**
 * Kotodama service worker: the whole app works offline after one visit.
 *
 * - Install precaches every page, plus every script, stylesheet and font
 *   those pages reference, so any screen opens without a connection. The
 *   content library ships inside those scripts, so it comes along.
 * - Pages and RSC payloads: network first, falling back to the cached copy.
 * - Build assets and icons: cache first (their URLs change when their content does).
 * - Fonts: cache first in a cache that outlives deploys, since font files
 *   rarely change and the Japanese ones are large.
 * - The full dictionary (/dict) is far too large to precache. Its files are
 *   kept as they are fetched, in a cache that also outlives deploys, so words
 *   looked up once and JLPT word sets used once work offline. They live in a
 *   folder named after the dictionary release; when the summary (meta.json,
 *   network first) names a new one, the old release's files are dropped.
 *
 * The page registers this file as `sw.js?v=<build id>`, so every deploy
 * installs a fresh worker and drops the previous build's caches.
 * URLs resolve against the worker's scope, so the same file works at the
 * site root and under a sub-path such as GitHub Pages' /kotodama/.
 */
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGES = `kotodama-${BUILD}-pages`;
const ASSETS = `kotodama-${BUILD}-assets`;
const FONTS = "kotodama-fonts";
const DICTIONARY = "kotodama-dict";

const scoped = (path) => new URL(path, self.registration.scope).href;
const ROUTES = ["", "practice", "practice/dictionary", "quiz", "all", "progress", "settings"];
const EXTRAS = ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon.svg"];

/** Build assets referenced by a page, from its tags and its inlined RSC payload. */
function assetUrls(html) {
  const urls = new Set();
  for (const match of html.matchAll(/(?:\/_next\/)?(static\/(?:chunks|css|media|[\w-]+)\/[^"'\\\s)]+\.(?:js|css|woff2))/g)) {
    urls.add(scoped(`_next/${match[1]}`));
  }
  return [...urls];
}

async function precache() {
  const pages = await caches.open(PAGES);
  // "reload" skips the HTTP cache, so a new build never precaches the previous build's pages.
  await pages.addAll([...ROUTES, ...EXTRAS].map((path) => new Request(scoped(path), { cache: "reload" })));

  const assets = new Set();
  for (const route of ROUTES) {
    const response = await pages.match(scoped(route));
    if (response) assetUrls(await response.text()).forEach((url) => assets.add(url));
  }
  const assetCache = await caches.open(ASSETS);
  const fontCache = await caches.open(FONTS);
  // One missing file shouldn't block installation; it will be cached on first use instead.
  await Promise.allSettled(
    [...assets].map(async (url) => {
      const cache = url.endsWith(".woff2") ? fontCache : assetCache;
      if (!(await cache.match(url))) await cache.add(url);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PAGES && key !== ASSETS && key !== FONTS && key !== DICTIONARY)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    // Revalidate with the server rather than trusting the HTTP cache: static
    // hosts (GitHub Pages) send max-age=600, which would hide a new deploy.
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match(scoped(""));
      if (shell) return shell;
    }
    // Failing an RSC fetch makes the Next router fall back to a full page load, which is served from cache.
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** The dictionary's summary: from the network, so a new release is noticed; the kept copy when offline. */
async function dictionarySummary(request) {
  const cache = await caches.open(DICTIONARY);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      cache.put(request, response.clone());
      const { version } = await response.clone().json();
      // Files of earlier releases are no use once the summary points at a new folder.
      const current = scoped(`dict/${version}/`);
      for (const kept of await cache.keys()) {
        if (kept.url !== request.url && !kept.url.startsWith(current)) cache.delete(kept);
      }
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPageData = request.mode === "navigate" || request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isPageData) event.respondWith(networkFirst(request));
  else if (url.pathname.endsWith("/dict/meta.json")) event.respondWith(dictionarySummary(request));
  else if (url.pathname.includes("/dict/")) event.respondWith(cacheFirst(request, DICTIONARY));
  else if (/\.(?:woff2?|ttf|otf)$/.test(url.pathname)) event.respondWith(cacheFirst(request, FONTS));
  else if (url.pathname.includes("/_next/static/") || url.pathname.includes("/icons/")) event.respondWith(cacheFirst(request, ASSETS));
  else event.respondWith(staleWhileRevalidate(request));
});
