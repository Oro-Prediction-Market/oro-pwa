import { useEffect, useState, useRef } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "@shared/api/client";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** Whether Google sign-in is configured at all. */
export const googleSignInAvailable = Boolean(CLIENT_ID);


if (!CLIENT_ID && import.meta.env.DEV) {
  console.warn(
    "[Oro] Google sign-in is hidden: VITE_GOOGLE_CLIENT_ID is not set. It must " +
      "match the backend's GOOGLE_CLIENT_ID.",
  );
}

interface Props {
  /** Called after a successful sign-in. `isNew` marks a freshly created account. */
  onSuccess: (isNew: boolean) => void;
}

export function GoogleSignInButton({ onSuccess }: Props) {

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxWidth(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = useState(false);

  // Google's script is loaded from accounts.google.com. It is blocked outright
  // in some networks and by some extensions, and when that happens the button
  // silently never renders. Watch for it rather than leaving a blank gap.
  useEffect(() => {
    if (!CLIENT_ID) return;
    const timer = setTimeout(() => {
      if (!(window as any).google?.accounts?.id) setScriptFailed(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!CLIENT_ID) return null;

  async function handleCredential(credential?: string) {
    if (!credential) {
      setError("Google did not return a sign-in token. Please try again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const referralCode =
        sessionStorage.getItem("oro_pending_referral") ?? undefined;
      const result = await loginWithGoogle(credential, referralCode);
      if (referralCode) sessionStorage.removeItem("oro_pending_referral");
      onSuccess(result.isNew);
    } catch (err: any) {
      // The server refuses an unverified Google address; say so plainly rather
      // than showing a generic failure the user cannot act on.
      const message: string = err?.message ?? "";
      setError(
        /verified/i.test(message)
          ? "That Google account has no verified email address. Verify it with Google, then try again."
          : message || "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    // maxWidth 400 + centered: Google's real (invisible) button is capped at
    // 400px wide, so on desktop/wide layouts a full-width visible button left
    // its edges over dead space — clicks there never reached Google's button
    // (it only "worked" once the screen was narrow enough to match). Capping the
    // whole control to 400px keeps the visible button and the clickable overlay
    // the same width at every viewport.
    <div style={{ width: "100%", maxWidth: 400, marginInline: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      {scriptFailed ? (
        <div style={noticeStyle}>
          Google sign-in could not load. Check your connection or any blocking
          extension, then reload.
        </div>
      ) : (
        <div
          ref={boxRef}
          style={{
            position: "relative",
            width: "100%",
            opacity: busy ? 0.5 : 1,
            pointerEvents: busy ? "none" : "auto",
          }}
        >
          {/* Our button, drawn to match the rest of the sheet.
              Purely visual: `pointer-events: none` so every click passes
              through to Google's own button laid over it. */}
          <div style={brandButton} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M12.24 10.4v3.36h5.56c-.24 1.44-1.68 4.22-5.56 4.22-3.34 0-6.07-2.77-6.07-6.18s2.73-6.18 6.07-6.18c1.9 0 3.18.81 3.91 1.51l2.66-2.56C17.1 2.99 14.9 2 12.24 2 6.98 2 2.72 6.26 2.72 11.52s4.26 9.52 9.52 9.52c5.5 0 9.14-3.86 9.14-9.3 0-.63-.07-1.1-.15-1.58h-8.99z" />
            </svg>
            Continue with Google
          </div>

          <div style={overlay}>

            <div style={stretchToCover}>
            <GoogleOAuthProvider clientId={CLIENT_ID}>
              <GoogleLogin
                onSuccess={(res) => void handleCredential(res.credential)}
                // Fires on a blocked popup, a closed window, or a Google-side
                // failure. They are indistinguishable to us, so one message.
                onError={() =>
                  setError(
                    "Google sign-in was cancelled or blocked. Allow popups for this site and try again.",
                  )
                }
                theme="filled_blue"
                size="large"
                shape="rectangular"
                text="continue_with"
                // Matches our button exactly, so the invisible hit area lines
                // up with what the user can see.
                width={String(Math.min(400, boxWidth || 320))}
              />
            </GoogleOAuthProvider>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", margin: 0, textAlign: "center" }}>
          Signing in…
        </p>
      )}
      {error && (
        <p style={{ fontSize: "0.78rem", color: "#ef4444", margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The visible button. Matches the sheet, not Google's palette. */
const brandButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "13px 16px",
  borderRadius: 12,
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  boxSizing: "border-box",
  // Clicks belong to the real Google button stacked above this one.
  pointerEvents: "none",
};

/**
 * Google's button, invisible and covering ours.
 *
 * `opacity: 0` rather than `visibility: hidden` or `display: none` — the
 * widget must stay rendered and hit-testable, and the other two remove it from
 * the hit-testing tree entirely.
 */
const overlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  cursor: "pointer",
};

/** Scales the invisible widget past our button's bounds so every pixel hits. */
const stretchToCover: React.CSSProperties = {
  transform: "scale(1.05, 1.4)",
  transformOrigin: "center",
};

const noticeStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--color-warning, #f59e0b)",
  background: "rgba(245,158,11,0.08)",
  border: "1px solid rgba(245,158,11,0.25)",
  borderRadius: 8,
  padding: "8px 12px",
  lineHeight: 1.5,
};
