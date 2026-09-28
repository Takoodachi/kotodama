/**
 * Kotodama service worker: makes the app load and run offline.
 *
 * - Pages and RSC payloads: network first, falling back to the cached copy.
 * - Hashed build assets, fonts and icons: cache first (their URLs change when their content does).
 * - Everything else from this origin: stale-while-revalidate.
 *
 * URLs resolve against the worker's scope, so the same file works at the site
 * root and under a sub-path such as GitHub Pages' /kotodama/.
 * Bump VERSION to drop old caches after a breaking change.
 */
const VERSION = "kotodama-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

const scoped = (path) => new URL(path, self.registration.scope).href;
const APP_SHELL = ["", "practice", "quiz", "settings", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(APP_SHELL.map(scoped)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return (
    url.pathname.includes("/_next/static/") ||
    url.pathname.includes("/icons/") ||
    /\.(?:woff2?|ttf|otf|png|svg|ico|webp)$/.test(url.pathname)
  );
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match(scoped(""));
      if (shell) return shell;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
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
  else if (isAsset(url)) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
