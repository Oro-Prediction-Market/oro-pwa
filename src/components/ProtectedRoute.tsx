import { useState, useEffect, useRef } from "react";
import { loginWithDKBank, getPwaStatus } from "@shared/api/client";
import { Eye, EyeOff, QrCode } from "lucide-react";
import { OroLogo } from "@shared/components/OroLogo";
import { BhutanAppLogin } from "./BhutanAppLogin";

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
        setHasPassword(false);
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

  const canSubmit =
    cid.trim().length === 11 &&
    !checking &&
    hasPassword === true &&
    password.length >= 1;

  // ── BhutanApp active ───────────────────────────────────────────────────────
  if (showBhutanApp) {
    return (
      <div style={container}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* Close button */}
        <button
          onClick={() => setShowBhutanApp(false)}
          aria-label="Close"
          className="close-btn"
          style={{
            position: "absolute",
            top: -15,
            right: 0,
            background: "var(--bg-main)",
            border: "none",
            borderRadius: "50%",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ×
        </button>
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
    );
  }

  // ── Default: login options ─────────────────────────────────────────────────
  return (
    <div style={container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .close-btn { right: -20px !important; } }`}</style>

      {/* Close button */}
      <button
        onClick={onLogin}
        aria-label="Close"
        className="close-btn"
        style={{
          position: "absolute",
          top: -15,
          right: 0,
          background: "var(--bg-main)",
          border: "none",
          borderRadius: "50%",
          width: 30,
          height: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        ×
      </button>

      <header style={headerWrap}>
        <OroLogo size={72} />
        <div>
          <h2 style={heading}>Sign in to Oro</h2>
          <p style={subtext}>Bhutan's prediction market</p>
        </div>
      </header>

      {/* ── Primary: My Bhutan App ── */}
      <button
        onClick={() => setShowBhutanApp(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "13px 16px",
          borderRadius: 12,
          border: "1.5px solid rgba(245,158,11,0.4)",
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))",
          color: "#f59e0b",
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        <QrCode size={18} />
        Login with My Bhutan App
      </button>

      {/* ── Divider ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <div
          style={{ flex: 1, height: 1, background: "var(--glass-border)" }}
        />
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
        <div
          style={{ flex: 1, height: 1, background: "var(--glass-border)" }}
        />
      </div>

      {/* ── Secondary: CID / Password ── */}
      <form onSubmit={handleLogin} style={card}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-subtle)",
            margin: "0 0 10px",
            textAlign: "center",
          }}
        >
          Sign in with DK Bank CID
        </p>

        {/* CID field */}
        <div style={fieldWrap}>
          <label style={label}>CID</label>
          <input
            type="text"
            value={cid}
            onChange={(e) => {
              setCid(e.target.value.replace(/\D/g, "").slice(0, 11));
              setError(null);
            }}
            placeholder="11-digit national ID"
            maxLength={11}
            required
            style={inputStyle}
          />
          {checking && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
              Checking…
            </span>
          )}
        </div>

        {/* Password field */}
        {hasPassword && (
          <div style={fieldWrap}>
            <label style={label}>PWA Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your password"
                required
                autoFocus
                style={{ ...inputStyle, paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
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
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
              Set via Telegram → Settings → Website Access
            </span>
          </div>
        )}

        {hasPassword === false && cid.trim().length === 11 && (
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--color-warning, #f59e0b)",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 8,
              padding: "8px 12px",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ display: "block", marginBottom: 2 }}>
              Password required
            </strong>
            Open Telegram → Oro → <strong>Settings → Website Access</strong> to
            set one.
          </div>
        )}

        {error && (
          <p style={{ fontSize: "0.8rem", color: "#ef4444", margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          style={{
            padding: "9px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            opacity: canSubmit && !loading ? 1 : 0.5,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const container: React.CSSProperties = {
  position: "relative",
  maxWidth: 360,
  width: "100%",
  margin: "5px auto",
  padding: "30px 20px 0",
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
  fontSize: "1.1rem",
  fontWeight: 800,
  color: "var(--text-main)",
  margin: 0,
  marginTop: -10,
};

const subtext: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  margin: 0,
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

const label: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text-subtle)",
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
