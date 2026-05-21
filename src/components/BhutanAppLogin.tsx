/**
 * BhutanApp OAuth login component.
 *
 * On mobile (iOS/Android/iPad OS): generates an OTP session and opens the
 * My Bhutan App via deep-link. Polls for approval after the user returns.
 *
 * On desktop: generates a QR session, shows the code, and polls automatically.
 *
 * This component should only be mounted when the user has explicitly clicked
 * the "Log in with My Bhutan App" button — it starts making API calls immediately.
 */

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle } from "lucide-react";
import { loginWithBhutanApp } from "@shared/api/client";
import { isMobileDevice } from "@/lib/device-detection";

const BHUTAN_APP_BASE = "https://service.bhutanapp.tech/svc/auth";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

type PollStatus =
  | "PENDING"
  | "SCANNED"
  | "VERIFIED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

interface QRSession {
  sessionId: string;
  qrData: { sessionId: string; timestamp: number; appName: string };
  expiresIn: number;
}

interface OTPSession {
  sessionId: string;
  deepLink: string;
  expiresIn: number;
}

interface StatusResponse {
  status: PollStatus;
  expiresIn: number;
  token?: string | { accessToken: string };
  user?: {
    id?: string;
    name?: string;
    username?: string;
    phoneNumber?: { phoneNumber?: string };
    email?: { emailAddress?: string };
  };
}

// AbortController-based timeout — works in all browsers including Safari < 16.4
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() =>
    clearTimeout(id),
  );
}

async function apiPost(path: string, body?: object): Promise<Response> {
  return fetchWithTimeout(
    `${BHUTAN_APP_BASE}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    8000,
  );
}

async function generateQRSession(): Promise<QRSession> {
  const res = await apiPost("/oauth/qr/generate");
  if (!res.ok) throw new Error("Failed to start QR session");
  return res.json();
}

async function generateOTPSession(returnUrl: string): Promise<OTPSession> {
  const res = await apiPost("/oauth/otp/generate", { returnUrl });
  if (!res.ok) throw new Error("Failed to start OTP session");
  return res.json();
}

async function fetchStatus(
  sessionId: string,
  type: "qr" | "otp",
): Promise<StatusResponse> {
  const res = await fetchWithTimeout(
    `${BHUTAN_APP_BASE}/oauth/${type}/status/${sessionId}`,
    {},
    5000,
  );
  if (!res.ok) throw new Error("Status check failed");
  return res.json();
}

async function cancelSession(
  sessionId: string,
  type: "qr" | "otp",
): Promise<void> {
  await fetch(`${BHUTAN_APP_BASE}/oauth/${type}/cancel/${sessionId}`, {
    method: "DELETE",
  }).catch(() => {});
}

function extractToken(raw: string | { accessToken: string }): string {
  return typeof raw === "string" ? raw : raw.accessToken;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (msg: string) => void;
}

export function BhutanAppLogin({ onSuccess, onCancel, onError }: Props) {
  const mobile = isMobileDevice();

  type Phase = "init" | "ready" | "polling" | "success" | "error";
  const [phase, setPhase] = useState<Phase>("init");
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"qr" | "otp">("qr");
  const [timeLeft, setTimeLeft] = useState(0);

  // Stable refs so effects don't restart when parent re-renders
  const onSuccessRef = useRef(onSuccess);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCancelRef.current = onCancel;
    onErrorRef.current = onError;
  });

  // ── Cancel session when component unmounts mid-flow ─────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const sessionTypeRef = useRef<"qr" | "otp">("qr");
  useEffect(() => {
    sessionIdRef.current = sessionId;
    sessionTypeRef.current = sessionType;
  }, [sessionId, sessionType]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        cancelSession(sessionIdRef.current, sessionTypeRef.current);
        localStorage.removeItem("bhutan_auth_session_id");
        localStorage.removeItem("bhutan_auth_session_type");
      }
    };
  }, []); // runs only on unmount

  // ── Init: generate session ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (mobile) {
          const returnUrl = `${window.location.origin}/auth/callback`;
          const otp = await generateOTPSession(returnUrl);
          if (cancelled) return;
          setSessionId(otp.sessionId);
          setDeepLink(otp.deepLink);
          setTimeLeft(otp.expiresIn);
          setSessionType("otp");
          localStorage.setItem("bhutan_auth_session_id", otp.sessionId);
          localStorage.setItem("bhutan_auth_session_type", "otp");
          setPhase("ready");
        } else {
          const qr = await generateQRSession();
          if (cancelled) return;
          setQrData(JSON.stringify(qr.qrData));
          setSessionId(qr.sessionId);
          setTimeLeft(qr.expiresIn);
          setSessionType("qr");
          localStorage.setItem("bhutan_auth_session_id", qr.sessionId);
          localStorage.setItem("bhutan_auth_session_type", "qr");
          // Desktop: start polling immediately — user just scans, no button click needed
          setPhase("polling");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Could not connect to BhutanApp");
          setPhase("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ready" && phase !== "polling") return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Poll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || phase !== "polling") return;
    let attempts = 0;
    let stopped = false;

    async function check() {
      if (stopped) return;
      attempts++;
      try {
        const data = await fetchStatus(sessionId!, sessionType);

        if (
          (data.status === "APPROVED" || data.status === "VERIFIED") &&
          data.token
        ) {
          stopped = true;
          clearInterval(id);

          const cid = (data.user?.username || data.user?.id || "").trim();
          const bhutanAppUuid = (data.user?.id || "").trim();

          try {
            await loginWithBhutanApp({
              token: extractToken(data.token),
              externalUserId: bhutanAppUuid || cid,
              fullName: data.user?.name ?? "",
              username: data.user?.username,
              phoneNumber: data.user?.phoneNumber?.phoneNumber,
              email: data.user?.email?.emailAddress,
            });
            localStorage.removeItem("bhutan_auth_session_id");
            localStorage.removeItem("bhutan_auth_session_type");
            sessionIdRef.current = null; // prevent cancel-on-unmount
            setPhase("success");
            setTimeout(() => onSuccessRef.current(), 800);
          } catch (e: any) {
            const msg = e.message || "Login failed";
            setError(msg);
            setPhase("error");
            onErrorRef.current?.(msg);
          }
        } else if (data.status === "REJECTED") {
          stopped = true;
          clearInterval(id);
          setError("Authentication was rejected in My Bhutan App.");
          setPhase("error");
        } else if (
          data.status === "EXPIRED" ||
          data.status === "CANCELLED" ||
          attempts >= MAX_POLL_ATTEMPTS
        ) {
          stopped = true;
          clearInterval(id);
          setError("Session expired. Please try again.");
          setPhase("error");
        }
      } catch {
        // transient network error — keep polling
      }
    }

    const id = setInterval(check, POLL_INTERVAL_MS);

    // Check immediately when tab becomes visible (user returning from app)
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionId, phase, sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOpenApp() {
    if (!deepLink) return;
    window.location.href = deepLink;
    setTimeout(() => setPhase("polling"), 1500);
  }

  function handleCancel() {
    // unmount effect will call cancelSession
    onCancelRef.current();
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "init") {
    return (
      <div style={wrap}>
        <div style={spinner} />
        <p style={muted}>Connecting to My Bhutan App…</p>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div style={wrap}>
        <CheckCircle size={40} color="#22c55e" strokeWidth={2.5} />
        <p
          style={{ fontWeight: 800, color: "#22c55e", fontSize: 13, margin: 0 }}
        >
          Authenticated! Signing you in…
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={wrap}>
        <div style={errorBox}>{error}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCancel} style={ghostBtn}>
            Back
          </button>
          <button
            onClick={() => {
              setError(null);
              setQrData(null);
              setDeepLink(null);
              setSessionId(null);
              sessionIdRef.current = null;
              setPhase("init");
            }}
            style={primaryBtn}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Mobile: deep-link flow ────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={wrap}>
        <img
          src="/bht.png"
          alt="My Bhutan App"
          style={{ width: 48, height: 48, borderRadius: 10 }}
        />

        {phase === "ready" ? (
          <>
            <p
              style={{
                fontWeight: 800,
                color: "var(--text-main)",
                fontSize: 15,
                margin: 0,
              }}
            >
              Open My Bhutan App
            </p>
            <p style={muted}>
              Tap below to open the app and approve the login.
            </p>
            <button onClick={handleOpenApp} style={primaryBtn}>
              Open My Bhutan App
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontWeight: 800,
                color: "var(--text-main)",
                fontSize: 15,
                margin: 0,
              }}
            >
              Approve in My Bhutan App
            </p>
            <p style={muted}>
              Complete the approval in the app, then return here.
            </p>
            <div style={spinner} />
          </>
        )}

        {timeLeft > 0 && <p style={muted}>Expires in {formatTime(timeLeft)}</p>}
        <button onClick={handleCancel} style={ghostBtn}>
          Cancel
        </button>
      </div>
    );
  }

  // ── Desktop: QR code flow ─────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <p
        style={{
          fontWeight: 800,
          color: "var(--text-main)",
          fontSize: 15,
          margin: 0,
        }}
      >
        Scan with My Bhutan App
      </p>

      {qrData ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          }}
        >
          <QRCodeSVG value={qrData} size={200} level="M" marginSize={2} />
        </div>
      ) : (
        <div style={spinner} />
      )}

      <ol
        style={{
          textAlign: "left",
          fontSize: 12,
          color: "var(--text-muted)",
          paddingLeft: 18,
          margin: 0,
          lineHeight: 1.9,
        }}
      >
        <li>Open My Bhutan App on your phone</li>
        <li>Tap the QR scanner icon</li>
        <li>Scan this code and approve</li>
      </ol>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={spinner} />
        <p style={{ ...muted, margin: 0 }}>Waiting for approval…</p>
      </div>

      {timeLeft > 0 && <p style={muted}>Expires in {formatTime(timeLeft)}</p>}

      <button onClick={handleCancel} style={ghostBtn}>
        Cancel
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  padding: "8px 0",
  textAlign: "center",
};

const muted: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  margin: 0,
};

const spinner: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "3px solid rgba(39,117,208,0.2)",
  borderTop: "3px solid #2775d0",
  borderRadius: "50%",
  animation: "spin 0.9s linear infinite",
  flexShrink: 0,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 10,
  border: "none",
  background: "var(--grad-primary, linear-gradient(135deg, #2775d0, #1a5bb5))",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 10,
  border: "1px solid var(--glass-border)",
  background: "var(--bg-secondary, transparent)",
  color: "var(--text-muted)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.2)",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#ef4444",
  maxWidth: 280,
};
