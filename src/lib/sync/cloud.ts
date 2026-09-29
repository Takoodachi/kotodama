import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeDocs, readDoc, sameDoc, type ProgressDoc } from "./progressDoc";

/** One row per account, holding its whole progress document. See supabase/migrations. */
const TABLE = "kotodama_progress";

/** Postgres unique violation: another device created the row first. */
const ALREADY_EXISTS = "23505";

/**
 * Pulls the account's progress, merges this device's into it and saves the
 * result. Each write only succeeds if nobody else wrote since it was read;
 * otherwise it merges again with the newer version. Returns the merged
 * progress, which the device should merge into its own.
 */
export async function syncProgress(client: SupabaseClient, userId: string, local: ProgressDoc): Promise<ProgressDoc> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error } = await client
      .from(TABLE)
      .select("data, version")
      .eq("user_id", userId)
      .retry(false)
      .maybeSingle<{ data: unknown; version: number }>();
    if (error) throw error;

    const remote = row ? readDoc(row.data) : null;
    const merged = remote ? mergeDocs(local, remote) : local;
    if (remote && sameDoc(merged, remote)) return merged;

    if (!row) {
      const { error: insertError } = await client.from(TABLE).insert({ user_id: userId, data: merged, version: 1 });
      if (!insertError) return merged;
      if (insertError.code === ALREADY_EXISTS) continue;
      throw insertError;
    }

    const { data: written, error: updateError } = await client
      .from(TABLE)
      .update({ data: merged, version: row.version + 1 })
      .eq("user_id", userId)
      .eq("version", row.version)
      .select("version");
    if (updateError) throw updateError;
    if (written.length) return merged;
    // Another device saved in between: go round again and merge with its version.
  }
  throw new Error("Progress kept changing on another device. It will sync again shortly.");
}
