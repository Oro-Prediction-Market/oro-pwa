import { useState, useEffect, useRef } from "react";
import { loginWithDKBank, getPwaStatus } from "@shared/api/client";
import { Eye, EyeOff } from "lucide-react";
import { OroLogo } from "@shared/components/OroLogo";
import { BhutanAppLogin } from "./BhutanAppLogin";
import {
  GoogleSignInButton,
  googleSignInAvailable,
} from "./GoogleSignInButton";

interface Props {
  onLogin: () => void;
  children?: React.ReactNode;
}

export function ProtectedRoute({ onLogin }: Props) {
  const [showBhutanApp, setShowBhutanApp] = useState(false);

  // ── CID / password state ───────────────────────────────────────────────────
  const [cid, setCid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cid.trim().length !== 11) {
      setHasPassword(null);
      setPassword("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const { hasPassword: hp } = await getPwaStatus(cid.trim());
        setHasPassword(hp);
      } catch {
        // Unknown, not "no password".
        //
        // Treating a failed check as `false` told people with a password that
        // they had none, and sent them to Telegram to set one they already
        // had. Leaving it null shows neither the password field nor the
        // notice — the Continue button then surfaces whatever the server
        // actually says.
        setHasPassword(null);
      } finally {
        setChecking(false);
      }
    }, 500);
  }, [cid]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const referralCode = sessionStorage.getItem("oro_pending_referral") ?? undefined;
      await loginWithDKBank(cid.trim(), hasPassword ? password : undefined, referralCode);
      if (referralCode) sessionStorage.removeItem("oro_pending_referral");
      onLogin();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // `hasPassword` is a tri-state: true, false, or unknown (null) when the
  // check has not run or failed. Unknown must not trap anyone — the form stays
  // usable and the server gives the real answer on submit.
  const canSubmit =
    cid.trim().length === 11 &&
    !checking &&
    hasPassword !== false &&
    (hasPassword === true ? password.length >= 1 : true);

  // ── BhutanApp active ───────────────────────────────────────────────────────
  if (showBhutanApp) {
    return (
      <div style={sheet}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* Close button */}
        {/* Back, not close: this is a step inside the sheet, and dismissing
            the whole thing from here loses the choice they just made. The
            modal's own backdrop still closes it. */}
        <button
          onClick={() => setShowBhutanApp(false)}
          style={backButton}
        >
          ← Back
        </button>
        <div style={container}>
          <header style={headerWrap}>
            <OroLogo size={56} />
            <h2 style={heading}>My Bhutan App</h2>
          </header>
          <div style={card}>
            <BhutanAppLogin
              onSuccess={onLogin}
              onCancel={() => setShowBhutanApp(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Default: login options ─────────────────────────────────────────────────
  return (
    <div style={sheet}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={container}>
        {/* "Welcome to" in words, then the wordmark in place of the name. */}
        <header style={headerWrap}>
          <h2 style={heading} aria-label="Welcome to Oro">
            <span>Welcome to</span>
            {/* Matched to the text's cap height, not to its font size.
                A capital in this face is about 0.72em tall, so a mark set to
                the full font size renders visibly larger than the letters
                beside it — which is exactly how `size={62}` looked here. */}
            {/* Nudged down: flex centres the two on the box, but the text's
                line box sits higher than its visible letters, so an optically
                level mark needs a couple of pixels of offset. */}
            <span style={{ display: "flex", transform: "translateY(2px)" }}>
              <OroLogo height="0.78em" />
            </span>
          </h2>
        </header>

        {/* Google leads, at full width.
            It is the fastest route for anyone without a Bhutanese identity,
            and the one option that needs no explanation. */}
        {googleSignInAvailable && (
          <GoogleSignInButton
            onSuccess={(isNew) => {
              if (isNew) sessionStorage.setItem("oro_new_account", "1");
              onLogin();
            }}
          />
        )}

        {googleSignInAvailable && <Divider />}

        {/* The CID row sits where Polymarket puts email: type an identifier,
            press Continue. Ours is a DK Bank CID because that is the account
            a Bhutanese user already has. */}
        <form onSubmit={handleLogin} style={inlineRow}>
          <input
            type="text"
            value={cid}
            onChange={(e) => {
              setCid(e.target.value.replace(/\D/g, "").slice(0, 11));
              setError(null);
            }}
            placeholder="11-digit CID"
            maxLength={11}
            style={inlineInput}
            aria-label="DK Bank CID"
          />
          <button
            type="submit"
            disabled={!canSubmit || loading}
            style={{
              ...inlineButton,
              opacity: canSubmit && !loading ? 1 : 0.45,
              cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "…" : "Continue"}
          </button>
        </form>

        {/* The password field only exists once we know the CID has one — the
            check runs while they type, so it appears in place rather than
            asking for something they may not have set. */}
        {/* Shown when we know there is a password, and also when we could not
            find out — better to offer the field than to hide the only way in. */}
        {hasPassword !== false && cid.trim().length === 11 && (
          <div style={{ ...fieldWrap, width: "100%" }}>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Website password"
                required
                autoFocus
                style={{ ...inputStyle, paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={eyeButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {checking && <p style={hintText}>Checking…</p>}

        {hasPassword === false && cid.trim().length === 11 && (
          <div style={noticeStyle}>
            <strong style={{ display: "block", marginBottom: 2 }}>
              Password required
            </strong>
            Open Telegram → Oro → <strong>Settings → Website Access</strong> to
            set one.
          </div>
        )}

        {error && <p style={errorText}>{error}</p>}

        {/* The other ways in, as tiles.
            Telegram lives here rather than in the header: it is one route
            among several now, not the only one. */}
        <div style={tileGrid}>
          {/* Logos only, no captions — the marks are the label, the way the
              reference sheet does it. `title` and `aria-label` carry the name
              for a hover and for a screen reader, which is where it belongs
              rather than under every tile. */}
          <button
            type="button"
            onClick={() => setShowBhutanApp(true)}
            style={tile}
            title="My Bhutan App"
            aria-label="Sign in with My Bhutan App"
          >
            <img
              src="/Icon-2.png"
              alt=""
              width={26}
              height={26}
              style={{ borderRadius: 6, display: "block" }}
            />
          </button>

          <a
            href="https://t.me/OroPredictBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...tile, textDecoration: "none" }}
            title="Open in Telegram"
            aria-label="Open in Telegram"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#29a9eb">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>

        <div style={legalRow}>
          <a href="/terms" style={legalLink}>
            Terms
          </a>
          <span style={{ opacity: 0.4 }}>•</span>
          <a href="/privacy" style={legalLink}>
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
      <span
        style={{
          fontSize: 11,
          color: "var(--text-subtle)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        or
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

/** Identifier + action on one line, the way the reference sheet does email. */
const inlineRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: 6,
  borderRadius: 14,
  border: "1px solid var(--glass-border)",
  background: "var(--bg-card)",
  boxSizing: "border-box",
};

const inlineInput: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  color: "var(--text-main)",
  // 16px exactly: anything smaller makes iOS Safari zoom on focus.
  fontSize: 16,
  outline: "none",
};

const inlineButton: React.CSSProperties = {
  flexShrink: 0,
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "var(--bg-secondary)",
  color: "var(--text-main)",
  fontWeight: 800,
  fontSize: "0.85rem",
  transition: "opacity 0.15s",
};

/** The remaining sign-in routes, as equal tiles rather than stacked buttons. */
const tileGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
  gap: 10,
  width: "100%",
};

const tile: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 8px",
  borderRadius: 14,
  border: "1px solid var(--glass-border)",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  cursor: "pointer",
};


const eyeButton: React.CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-subtle)",
  display: "flex",
  padding: 0,
};

const hintText: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--text-subtle)",
  margin: 0,
};

const errorText: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#ef4444",
  margin: 0,
  textAlign: "center",
};

const noticeStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--color-warning, #f59e0b)",
  background: "rgba(245,158,11,0.08)",
  border: "1px solid rgba(245,158,11,0.25)",
  borderRadius: 10,
  padding: "9px 12px",
  lineHeight: 1.5,
  width: "100%",
  boxSizing: "border-box",
};

const legalRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 2,
  fontSize: "0.72rem",
  color: "var(--text-subtle)",
};

const legalLink: React.CSSProperties = {
  color: "var(--text-subtle)",
  textDecoration: "none",
  fontWeight: 600,
};

const backButton: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  padding: "4px 8px",
  border: "none",
  background: "none",
  color: "var(--text-subtle)",
  fontFamily: "inherit",
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
};


/**
 * Full-width wrapper. Exists only so the close button has the sheet's real
 * edge to sit against — the content column below is capped at 360px and
 * centred, so anchoring to it left the button floating well inside the panel.
 */
const sheet: React.CSSProperties = {
  position: "relative",
  width: "100%",
  padding: "10px 44px 4px",
  boxSizing: "border-box",
};

const container: React.CSSProperties = {
  position: "relative",
  // Wider than before: on a phone this now fills a bottom sheet rather than
  // sitting inside a small centred dialog, and a narrow column stranded in the
  // middle of a full-width sheet reads as a mistake.
  maxWidth: 400,
  width: "100%",
  margin: "0 auto",
  padding: "2px 12px 4px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  overflow: "visible",
};

const headerWrap: React.CSSProperties = {
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const heading: React.CSSProperties = {
  // "Welcome to" sits beside the wordmark, so the two share a line and a
  // baseline rather than stacking.
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  flexWrap: "wrap",
  fontSize: "1.35rem",
  fontWeight: 800,
  color: "var(--text-main)",
  margin: 0,
  marginTop: -10,
};


const card: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 14,
  padding: 18,
  boxSizing: "border-box",
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};


const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--glass-border)",
  background: "var(--glass-bg)",
  color: "var(--text-main)",
  fontSize: "16px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
