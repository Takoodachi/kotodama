import { withBasePath } from "@/lib/basePath";
import { Dictionary } from "./search";
import type { DictMeta, Loader } from "./types";

/**
 * The dictionary files as served next to the app, under /dict. meta.json says
 * which versioned folder holds the rest; those files never change once
 * written, so the service worker keeps what was fetched for offline use.
 */

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(withBasePath(`/dict/${path}`), init);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

/** A loader for one version's files that fetches each file once; a failed fetch can be tried again. */
function loaderFor(version: string): Loader {
  const files = new Map<string, Promise<unknown>>();
  return (path) => {
    let file = files.get(path);
    if (!file) {
      file = fetchJson(`${version}/${path}`);
      files.set(path, file);
      file.catch(() => files.delete(path));
    }
    return file;
  };
}

let opened: Promise<{ dictionary: Dictionary; load: Loader }> | null = null;

function open() {
  if (!opened) {
    // Always asked of the network first: a new release changes which folder to read.
    const opening = (fetchJson("meta.json", { cache: "no-cache" }) as Promise<DictMeta>).then((meta) => {
      const load = loaderFor(meta.version);
      return { dictionary: new Dictionary(meta, load), load };
    });
    opened = opening;
    opening.catch(() => {
      if (opened === opening) opened = null;
    });
  }
  return opened;
}

/** The full dictionary, ready to search. Rejects when its files can't be reached. */
export const openDictionary = (): Promise<Dictionary> => open().then((o) => o.dictionary);

/** One of the dictionary's other files: a JLPT word set, or the links to the app's own library. */
export const loadDictionaryFile = (path: string): Promise<unknown> => open().then((o) => o.load(path));
