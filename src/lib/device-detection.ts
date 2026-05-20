export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad OS reports as Mac with touch — treat it as mobile for deep-link flow
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  if (/Android/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}
