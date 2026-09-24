import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { RefreshCw, X } from "lucide-react";

/**
 * "A new version is ready" — and the reload happens only when asked.
 *
 * Before this, registration was the one line vite-plugin-pwa injects: register
 * `/sw.js` and never look again. The worker precaches `index.html` and answers
 * every navigation from it, so a deploy was invisible until the new worker
 * finished installing ~1.4MB in the background — and refreshing during that
 * window got the old worker again, which is why only a hard refresh (which
 * bypasses the worker entirely) reliably showed new code.
 *
 * `registerType: "prompt"` makes that deterministic instead. The new worker
 * installs and waits; nothing about the running page changes, so what is on
 * screen stays consistent rather than flipping between builds. When the viewer
 * taps Reload, `updateSW(true)` tells the waiting worker to take over and
 * reloads — so the next paint is the new build, every time.
 *
 * It does not reload on its own, deliberately. People stake money on this
 * screen, and refreshing a half-filled amount out from under someone to save
 * them a tap is a bad trade.
 */

/** How often a running tab asks whether a newer worker exists. */
const UPDATE_POLL_MS = 60_000;

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [reloading, setReloading] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  // StrictMode runs effects twice in dev, and registering the worker twice
  // starts two update polls.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let timer: ReturnType<typeof setInterval> | undefined;

    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Without this a tab left open all day never learns about a deploy:
        // the browser only re-checks the worker on navigation.
        timer = setInterval(() => {
          registration.update().catch(() => undefined);
        }, UPDATE_POLL_MS);
      },
    });

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!needRefresh) return null;

  const reload = () => {
    setReloading(true);
    // `true` activates the waiting worker and reloads once it has control.
    // If anything goes wrong, fall back to a plain reload rather than leaving
    // the button spinning — the worst case is the viewer sees the old build
    // again and the prompt returns.
    updateRef.current?.(true).catch(() => window.location.reload());
  };

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        // Clear of the bottom nav, and of the home indicator on iOS.
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        left: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(16,22,38,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <RefreshCw size={16} style={{ flexShrink: 0, color: "#19c4a6" }} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          fontWeight: 700,
          color: "#e8eef7",
        }}
      >
        A new version of Oro is ready.
      </span>
      <button
        type="button"
        onClick={reload}
        disabled={reloading}
        style={{
          flexShrink: 0,
          padding: "7px 14px",
          borderRadius: 9,
          border: "none",
          background: "linear-gradient(180deg, #19c4a6 0%, #0d6b5c 100%)",
          color: "#04211c",
          fontSize: 12,
          fontWeight: 900,
          cursor: reloading ? "default" : "pointer",
          opacity: reloading ? 0.7 : 1,
        }}
      >
        {reloading ? "Reloading…" : "Reload"}
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNeedRefresh(false)}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          padding: 0,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
