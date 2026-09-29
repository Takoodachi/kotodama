import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Accounts need a Supabase project; builds without one keep progress on the device only. */
export const accountsEnabled = Boolean(url && key);

const REQUEST_TIMEOUT = 20_000;

/** fetch never gives up by itself, and a flaky mobile connection can hang forever. */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal || typeof AbortSignal.timeout !== "function") return fetch(input, init);
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
}

let client: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded on first use so the library stays out of the
 * initial download.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!accountsEnabled) return Promise.reject(new Error("Accounts aren't set up in this build."));
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: fetchWithTimeout },
    }),
  );
  return client;
}
