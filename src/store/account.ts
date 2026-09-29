import { create } from "zustand";
import { BASE_PATH } from "@/lib/basePath";
import { syncProgress } from "@/lib/sync/cloud";
import { emptyDoc } from "@/lib/sync/progressDoc";
import { accountsEnabled, getSupabase } from "@/lib/sync/supabase";
import { progressDoc, useProgress } from "./progress";

export type AuthStatus = "unavailable" | "loading" | "signed-out" | "signed-in";
export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

interface AccountState {
  status: AuthStatus;
  email: string | null;
  userId: string | null;
  sync: SyncStatus;
  lastSynced: number | null;
  syncError: string | null;
  /** Arrived from a password-reset email: a new password is needed. */
  recovering: boolean;
}

/**
 * The signed-in account and the state of its sync. Kept in memory only: the
 * Supabase library stores the session itself.
 */
export const useAccount = create<AccountState>()(() => ({
  status: accountsEnabled ? "loading" : "unavailable",
  email: null,
  userId: null,
  sync: "idle",
  lastSynced: null,
  syncError: null,
  recovering: false,
}));

export interface ActionResult {
  error?: string;
  /** Shown on success, e.g. "check your inbox". */
  message?: string;
}

const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (isOffline() || /fetch|network|timeout|abort/i.test(message)) return "Can't reach the server. Check your connection.";
  return message || "Something went wrong.";
}

/** The longest sign-out waits for the server before carrying on. */
const SIGN_OUT_WAIT = 3_000;

/** Where links in account emails lead back to. */
const returnUrl = () => `${window.location.origin}${BASE_PATH}/settings`;

let running: Promise<boolean> | null = null;
let again = false;
let applyingRemote = false;

/** True while progress from the account is being merged in, which isn't a change to sync back. */
export const isApplyingRemote = () => applyingRemote;

/**
 * Syncs progress with the account now. Calls made while a sync is running
 * queue one more run afterwards. Resolves to whether everything is saved.
 */
export function syncNow(): Promise<boolean> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let ok = false;
    do {
      again = false;
      ok = await syncOnce();
    } while (again && ok);
    running = null;
    return ok;
  })();
  return running;
}

async function syncOnce(): Promise<boolean> {
  const { userId, status } = useAccount.getState();
  if (status !== "signed-in" || !userId || !useProgress.persist.hasHydrated()) return false;
  if (isOffline()) {
    useAccount.setState({ sync: "offline" });
    return false;
  }
  useAccount.setState({ sync: "syncing", syncError: null });
  try {
    const client = await getSupabase();
    const state = useProgress.getState();
    // Progress last synced with a different account stays out of this one.
    const local = state.syncedWith && state.syncedWith !== userId ? emptyDoc() : progressDoc(state);
    const merged = await syncProgress(client, userId, local);
    // Still the same account? (Signing out mid-sync must not bring progress back.)
    if (useAccount.getState().userId !== userId) return false;
    applyingRemote = true;
    try {
      useProgress.getState().mergeDoc(merged, userId);
    } finally {
      applyingRemote = false;
    }
    useAccount.setState({ sync: "synced", lastSynced: Date.now() });
    return true;
  } catch (error) {
    useAccount.setState(isOffline() ? { sync: "offline" } : { sync: "error", syncError: describe(error) });
    return false;
  }
}

export async function signIn(email: string, password: string): Promise<ActionResult> {
  try {
    const { auth } = await getSupabase();
    const { error } = await auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message === "Invalid login credentials" ? "Wrong email or password." : describe(error) };
    return {};
  } catch (error) {
    return { error: describe(error) };
  }
}

export async function signUp(email: string, password: string): Promise<ActionResult> {
  try {
    const { auth } = await getSupabase();
    const { data, error } = await auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: returnUrl() },
    });
    if (error) return { error: describe(error) };
    // With email confirmation on, there's no session until the link is opened.
    if (!data.session) return { message: "Check your inbox and open the link to confirm your email. Then sign in here." };
    return {};
  } catch (error) {
    return { error: describe(error) };
  }
}

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  try {
    const { auth } = await getSupabase();
    const { error } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: returnUrl() });
    if (error) return { error: describe(error) };
    return { message: "If there's an account for that email, a link to choose a new password is on its way." };
  } catch (error) {
    return { error: describe(error) };
  }
}

export async function updatePassword(password: string): Promise<ActionResult> {
  try {
    const { auth } = await getSupabase();
    const { error } = await auth.updateUser({ password });
    if (error) return { error: describe(error) };
    useAccount.setState({ recovering: false });
    return { message: "Password updated." };
  } catch (error) {
    return { error: describe(error) };
  }
}

/**
 * Saves progress to the account, then signs out and clears it from this
 * device. Unless `force` is set, stops first if the latest progress couldn't
 * be saved, so nothing is lost by accident.
 */
export async function signOut({ force = false } = {}): Promise<ActionResult & { unsaved?: boolean }> {
  if (!force && !(await syncNow())) return { unsaved: true };
  try {
    const { auth } = await getSupabase();
    // Supabase tells the server first, then forgets the session here even if
    // that fails. Offline, the server call can take until it times out, so
    // don't wait for it: the session is removed as soon as it's done.
    await Promise.race([auth.signOut({ scope: "local" }), new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT))]);
  } catch {
    // The session is cleared from this device even if the server can't be reached.
  }
  useAccount.setState({ status: "signed-out", userId: null, email: null, sync: "idle", lastSynced: null, syncError: null });
  useProgress.getState().clearLocal();
  return {};
}
