/** Sub-path the app is served from ("/kotodama" on GitHub Pages, "" elsewhere). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefixes a root-relative URL with the base path. Needed for plain URLs such
 * as icons, the manifest and the service worker. `<Link>` and the router
 * add the base path themselves.
 */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
