import { useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "@shared/api/client";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** Whether Google sign-in is configured at all. */
export const googleSignInAvailable = Boolean(CLIENT_ID);

// Hiding the button is right in production and baffling in development, where
// the usual reaction to a missing sign-in option is to go looking for the bug
// in the code rather than in the environment.
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

/**
 * Google sign-in, the primary path for international accounts.
 *
 * Renders nothing when `VITE_GOOGLE_CLIENT_ID` is unset — an unconfigured
 * button is worse than an absent one, because it looks like a working option
 * and fails only after the user commits to it.
 */
export function GoogleSignInButton({ onSuccess }: Props) {
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
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {scriptFailed ? (
        <div style={noticeStyle}>
          Google sign-in could not load. Check your connection or any blocking
          extension, then reload.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            // Google renders a fixed-width iframe; let it fill the sheet so it
            // reads as the primary action rather than a widget dropped in.
            colorScheme: "light dark",
            opacity: busy ? 0.5 : 1,
            pointerEvents: busy ? "none" : "auto",
          }}
        >
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
              theme="filled_black"
              size="large"
              shape="pill"
              text="continue_with"
              // Pixels, not a CSS length — the widget ignores "100%". Matches
              // the sheet's content column so it reads as a full-width button
              // rather than a widget dropped into the middle.
              width={String(Math.min(376, window.innerWidth - 56))}
            />
          </GoogleOAuthProvider>
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

const noticeStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--color-warning, #f59e0b)",
  background: "rgba(245,158,11,0.08)",
  border: "1px solid rgba(245,158,11,0.25)",
  borderRadius: 8,
  padding: "8px 12px",
  lineHeight: 1.5,
};
