"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";

/**
 * Shown in place of a page that failed while rendering, so a bug never
 * leaves a blank screen. Progress lives in the browser's storage and is
 * written on every answer, so nothing of it is lost here.
 */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">
        <span lang="ja">失敗</span> · Something went wrong
      </p>
      <h1 className="mt-3 font-mincho text-3xl leading-tight text-paper">This page ran into a problem</h1>
      <p className="mt-3 text-sm leading-relaxed text-mist">
        Your progress so far is saved. Try again, or go back to the start.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => retry()}>
          Try again
        </Button>
        <LinkButton href="/">Home</LinkButton>
      </div>
    </div>
  );
}
