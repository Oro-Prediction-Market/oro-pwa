/**
 * Service worker registration, and recovery from a deploy under an open tab.
 *
 * The worker no longer holds the app (see the VitePWA comment in
 * vite.config.ts), so there is nothing to prompt about: the next load is the
 * current build. A tab that stays open across a deploy keeps running the build
 * it started with, which is fine until it lazy-loads a page — that chunk's
 * hash is gone from the server, so the import fails. Reloading at that moment
 * is safe: the person has just tapped to go somewhere else, nothing half-typed
 * is on screen, and the reload lands them on the current build.
 */

/** Long enough that a chunk which is really broken does not reload in a loop. */
const RELOAD_GUARD_MS = 10_000;
const RELOAD_KEY = "oro:chunk-reload-at";

export function registerServiceWorker() {
  window.addEventListener("vite:preloadError", (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    } catch {
      /* storage blocked: fall through and reload once */
    }
    if (Date.now() - last < RELOAD_GUARD_MS) return;
    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      /* storage blocked */
    }
    event.preventDefault();
    window.location.reload();
  });

  if (!("serviceWorker" in navigator)) return;
  const register = () => {
    const registration = import.meta.env.DEV
      ? navigator.serviceWorker.register("/dev-sw.js?dev-sw", {
          scope: "/",
          type: "module",
        })
      : navigator.serviceWorker.register("/sw.js", { scope: "/" });
    registration.catch(() => undefined);
  };
  // After load, so the worker's own downloads never compete with the app's.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
