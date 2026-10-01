import { create } from "zustand";

interface StorageState {
  /**
   * Whether the browser has agreed to keep this site's data until the user
   * removes it. null while not asked yet, or where the browser can't say.
   */
  persisted: boolean | null;
}

export const useStorage = create<StorageState>()(() => ({ persisted: null }));

let asked = false;

/**
 * Asks the browser to keep the site's storage for good. By default a browser
 * may clear it when the device runs low on space, and Safari clears it after
 * seven days without a visit unless the app is installed; progress kept only
 * on the device would go with it. Browsers decide by themselves (Chrome by
 * how much the site is used, Safari by whether it is installed) or ask the
 * user (Firefox). Asks once per visit, however often it is called.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (asked || typeof navigator === "undefined" || !navigator.storage?.persist) return;
  asked = true;
  try {
    const persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    useStorage.setState({ persisted });
  } catch {
    // Storage that can't be asked about (a private window, say) is left as unknown.
  }
}
