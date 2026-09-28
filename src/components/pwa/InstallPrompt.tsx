"use client";

import { Check, Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

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
 * note once the app is already running installed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = useIsStandalone();
  const ios = useSyncExternalStore(noSubscription, isIos, () => false);

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

  if (standalone) {
    return (
      <p className="flex items-center gap-2 text-sm text-mist">
        <Check className="size-4 text-gold-bright" /> Installed. You&apos;re using the app version.
      </p>
    );
  }

  if (deferred) {
    return (
      <Button
        variant="gold"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        <Download className="size-4" /> Install Kotodama
      </Button>
    );
  }

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
