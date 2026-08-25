import { useState } from "react";
import { sendFeedback } from "@shared/api/client";

/**
 * Footer "Contact support" entry + feedback modal.
 *
 * The user types their own email and a message; on send it POSTs to /feedback
 * and the BACKEND relays it to Oro's support inbox. Oro's address deliberately
 * appears nowhere here — the frontend never learns it, so it can't be scraped.
 */
export function ContactSupport() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend =
    emailLooksValid && message.trim().length > 0 && status !== "sending";

  function close() {
    setOpen(false);
    // Reset only after a successful send, so a failed attempt keeps the draft.
    if (status === "sent") {
      setEmail("");
      setMessage("");
      setStatus("idle");
      setError(null);
    }
  }

  async function handleSend() {
    if (!canSend) return;
    setStatus("sending");
    setError(null);
    try {
      await sendFeedback(email.trim(), message.trim());
      setStatus("sent");
    } catch (err: any) {
      setStatus("idle");
      setError(err?.message || "Couldn't send your message. Please try again.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={itemBtn}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Email</span>
          <span style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 500 }}>
            Oro Customer Support
          </span>
        </div>
      </button>

      {open && (
        <div style={overlay} onClick={close} role="presentation">
          <div
            style={card}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Contact Oro customer support"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              style={closeBtn}
            >
              ×
            </button>

            {status === "sent" ? (
              <div style={{ textAlign: "center", padding: "16px 4px" }}>
                <div style={{ fontSize: 40, lineHeight: 1 }}>✅</div>
                <h3 style={{ margin: "14px 0 6px", fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>
                  Message sent
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  Thanks — Oro Customer Support will get back to you by email.
                </p>
                <button type="button" onClick={close} style={{ ...sendBtn, marginTop: 20, opacity: 1 }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "2px 0 4px", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                  Contact Oro Customer Support
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "rgba(255,255,255,0.55)" }}>
                  Send us your feedback or a question — we'll reply to the email
                  you give below.
                </p>

                <label style={label}>Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={input}
                />

                <label style={{ ...label, marginTop: 14 }}>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
                  placeholder="How can we help?"
                  rows={5}
                  style={{ ...input, resize: "vertical", minHeight: 96, fontFamily: "inherit" }}
                />

                {error && (
                  <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#ef4444" }}>
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    ...sendBtn,
                    marginTop: 18,
                    opacity: canSend ? 1 : 0.5,
                    cursor: canSend ? "pointer" : "not-allowed",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const itemBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  color: "rgba(255,255,255,0.6)",
  textAlign: "left",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.05)",
  cursor: "pointer",
  transition: "all 0.2s",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 1000,
};

const card: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background: "#14161c",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "22px 20px 20px",
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
};

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 12,
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  lineHeight: 1,
  color: "rgba(255,255,255,0.5)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.45)",
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: "0.9rem",
  outline: "none",
};

const sendBtn: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 800,
  cursor: "pointer",
};
