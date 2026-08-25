import { useState, useEffect } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
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
  if (!CLIENT_ID) return null;
  // `useGoogleLogin` must run inside the provider, so the button lives in an
  // inner component.
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <GoogleButtonInner onSuccess={onSuccess} />
    </GoogleOAuthProvider>
  );
}

/**
 * Our own branded button that opens Google in a popup (authorization-code flow).
 *
 * We deliberately do NOT use Google's embedded button: it renders inside a
 * Google-owned iframe that cannot be restyled, and the old trick of hiding it
 * under a custom button at `opacity: 0` is blocked by Google's anti-clickjacking
 * protection — the click was silently ignored on desktop. `useGoogleLogin` opens
 * a real popup from our own, fully-styled button and hands back a one-time code
 * that the backend exchanges and verifies.
 */
function GoogleButtonInner({ onSuccess }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = useState(false);

  // Google's script (accounts.google.com/gsi/client) is blocked on some networks
  // and by some extensions. Watch for it so we explain rather than leave a button
  // that can never open the popup.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!(window as any).google?.accounts?.oauth2) setScriptFailed(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const login = useGoogleLogin({
    flow: "auth-code",
    // `openid` is what makes the code exchange return an ID token; email/profile
    // fill in the verified address and name the backend reads. Without openid
    // there is no id_token and the backend can't verify who signed in.
    scope: "openid email profile",
    onSuccess: (resp) => void handleCode(resp.code),
    // Fires on a blocked popup, a closed window, or a Google-side failure. They
    // are indistinguishable to us, so one message.
    onError: () =>
      setError(
        "Google sign-in was cancelled or blocked. Allow popups for this site and try again.",
      ),
  });

  async function handleCode(code?: string) {
    if (!code) {
      setError("Google did not return a sign-in code. Please try again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const referralCode =
        sessionStorage.getItem("oro_pending_referral") ?? undefined;
      const result = await loginWithGoogle(code, referralCode);
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
    <div style={{ width: "100%", maxWidth: 400, marginInline: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      {scriptFailed ? (
        <div style={noticeStyle}>
          Google sign-in could not load. Check your connection or any blocking
          extension, then reload.
        </div>
      ) : (
        <button
          type="button"
          onClick={() => login()}
          disabled={busy}
          style={{
            ...brandButton,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "default" : "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M12.24 10.4v3.36h5.56c-.24 1.44-1.68 4.22-5.56 4.22-3.34 0-6.07-2.77-6.07-6.18s2.73-6.18 6.07-6.18c1.9 0 3.18.81 3.91 1.51l2.66-2.56C17.1 2.99 14.9 2 12.24 2 6.98 2 2.72 6.26 2.72 11.52s4.26 9.52 9.52 9.52c5.5 0 9.14-3.86 9.14-9.3 0-.63-.07-1.1-.15-1.58h-8.99z" />
          </svg>
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
      )}
      {error && (
        <p style={{ fontSize: "0.78rem", color: "#ef4444", margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The visible button — matches the sheet, restored to the original look. */
const brandButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "13px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  boxSizing: "border-box",
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
