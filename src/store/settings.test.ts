import { beforeAll, describe, expect, it, vi } from "vitest";

// The store saves itself to localStorage, which a test run doesn't have. A
// device that chose its settings before they synced: furigana off, the rest
// as they come.
const saved = new Map<string, string>([
  ["kotodama-settings", JSON.stringify({ state: { furigana: "hide", sessionLength: 20, audio: { autoplay: "answer", rate: 1.1, voiceURI: null } }, version: 2 })],
]);
let useSettings: typeof import("./settings").useSettings;
let syncedSettings: typeof import("./settings").syncedSettings;
beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
  });
  ({ useSettings, syncedSettings } = await import("./settings"));
});

const settings = () => useSettings.getState();

describe("settings that sync", () => {
  it("counts those chosen before syncing existed as chosen long ago, and stamps nothing while loading", async () => {
    await useSettings.persist.rehydrate();
    expect(settings().furigana).toBe("hide");
    expect(settings().syncedAt).toEqual({ furigana: 1, rate: 1 });
  });

  it("stamps a setting changed here with the time, and sends only stamped, synced ones", () => {
    const before = Date.now();
    settings().setGlyph("sans");
    settings().setJpSize(1.3);
    expect(settings().syncedAt.glyph).toBeGreaterThanOrEqual(before);
    const doc = syncedSettings(settings());
    expect(Object.keys(doc).sort()).toEqual(["furigana", "glyph", "rate"]);
    expect(doc.glyph.value).toBe("sans");
    // Text size suits one screen: it stays on the device.
    expect(doc).not.toHaveProperty("jpSize");
  });

  it("takes the account's later changes, keeps its own later ones, and ignores what a setting can't hold", () => {
    const glyphAt = settings().syncedAt.glyph!;
    settings().mergeSynced({
      furigana: { at: 50, value: "after" },
      glyph: { at: glyphAt - 1, value: "mincho" },
      rate: { at: 60, value: 0.7 },
      theme: { at: 70, value: "neon" },
      dailyGoal: { at: 80, value: 50 },
      somethingNewer: { at: 90, value: true },
    });
    expect(settings().furigana).toBe("after");
    expect(settings().glyph).toBe("sans");
    expect(settings().audio.rate).toBe(0.7);
    expect(settings().theme).toBe("dark");
    expect(settings().dailyGoal).toBe(50);
    // Taken in, not changed here: the times are the account's.
    expect(settings().syncedAt).toMatchObject({ furigana: 50, glyph: glyphAt, rate: 60, dailyGoal: 80 });
    expect(settings().syncedAt.theme).toBeUndefined();
  });

  it("takes another account's settings as they are, sending none of this device's", () => {
    settings().mergeSynced({ sessionLength: { at: 5, value: 50 } }, true);
    expect(settings().sessionLength).toBe(50);
    expect(Object.keys(syncedSettings(settings()))).toEqual(["sessionLength"]);
  });
});
