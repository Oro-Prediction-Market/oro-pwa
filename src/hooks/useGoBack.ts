import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * A Back handler that is safe on a cold open.
 *
 * `navigate(-1)` alone assumes the visitor got here from somewhere inside the
 * app. Market pages are the most-shared links on the platform, so a large share
 * of arrivals are the opposite: a pasted link, a new tab, or a tap out of
 * Telegram. In those sessions there is no previous entry, and navigate(-1)
 * walks the visitor out of the site — off to whatever they were looking at
 * before, or nowhere at all.
 *
 * react-router stamps the first entry of a session with the key "default", so
 * that is the reliable test for "nothing to go back to". Anything later has a
 * generated key. This is checked rather than `window.history.length`, which
 * counts entries from other sites in the same tab and so is not a signal about
 * this app at all.
 *
 * When there is no history, we replace with the fallback instead of pushing:
 * Back should not itself become an entry you can go back to.
 */
export function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== "default";

  return useCallback(() => {
    if (canGoBack) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [canGoBack, fallback, navigate]);
}
