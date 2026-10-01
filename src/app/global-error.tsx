"use client";

import { useEffect } from "react";

/**
 * The last resort: an error in the root layout itself, where error.tsx can't
 * help. It replaces the whole document, without the app's styles or fonts,
 * so it brings its own few.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0a0a0a",
          color: "#f2efea",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong · Kotodama</title>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>Kotodama ran into a problem</h1>
        <p style={{ margin: 0, maxWidth: "24rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#a8a39b" }}>
          Your progress so far is saved. Trying again usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: "2.75rem",
            padding: "0 1.5rem",
            border: 0,
            borderRadius: "999px",
            background: "#c8102e",
            color: "#fbf8f3",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
