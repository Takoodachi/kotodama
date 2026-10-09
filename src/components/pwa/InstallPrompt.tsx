"use client";

import { Check, Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { useTouchDevice } from "@/hooks/useTouchDevice";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isStandalone = () =>
  window.matchMedia(STANDALONE_QUERY).matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const noSubscription = () => () => {};

/** True when running as the installed app (home-screen icon) rather than in a browser tab. */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
}

/**
 * Offers installation: the native prompt where the browser supports it
 * (Chrome, Edge, Android), Share → Add to Home Screen steps on iOS, and a
 * note once the app is already running installed. On a computer the app is
 * mostly wanted on a phone, so it says how to get it there, and offers this
 * computer as well where the browser can install it.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = useIsStandalone();
  const ios = useSyncExternalStore(noSubscription, isIos, () => false);
  const touch = useTouchDevice();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = deferred && (
    <Button
      variant="gold"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
    >
      <Download className="size-4" /> {touch ? "Install Kotodama" : "Install on this computer"}
    </Button>
  );

  if (!touch) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-mist">
          Open Kotodama in your phone&apos;s browser, then choose <span className="text-paper">Install app</span> or{" "}
          <span className="text-paper">Add to Home screen</span> from its menu (in Safari, under{" "}
          <Share className="inline size-4 align-text-bottom text-paper" /> <span className="text-paper">Share</span>).
        </p>
        {standalone ? (
          <p className="flex items-center gap-2 text-sm text-mist">
            <Check className="size-4 text-gold-bright" /> Installed on this computer.
          </p>
        ) : (
          install
        )}
      </div>
    );
  }

  if (standalone) {
    return (
      <p className="flex items-center gap-2 text-sm text-mist">
        <Check className="size-4 text-gold-bright" /> Installed. You&apos;re using the app version.
      </p>
    );
  }

  if (install) return install;

  if (ios) {
    return (
      <p className="text-sm leading-relaxed text-mist">
        In Safari, tap <Share className="inline size-4 align-text-bottom text-paper" /> <span className="text-paper">Share</span>,
        then <span className="text-paper">Add to Home Screen</span>.
      </p>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-mist">
      Open your browser menu and choose <span className="text-paper">Install app</span> or{" "}
      <span className="text-paper">Add to Home screen</span>.
    </p>
  );
}
