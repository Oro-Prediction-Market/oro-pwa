import { useEffect } from "react";
import { X } from "lucide-react";
import { UsdtDepositPanel } from "./UsdtDepositPanel";
import { UsdtWithdrawPanel } from "./UsdtWithdrawPanel";

interface Props {
  mode: "deposit" | "withdraw";
  /** The USDT wallet's balance — withdrawal needs it, deposit ignores it. */
  balance: number;
  onClose: () => void;
  onCredited?: () => void;
}

/**
 * The USDT rail in an overlay, matching how the ngultrum rail's "Top Up"
 * already behaves.
 *
 * A deposit address and an exact amount are things a person retypes into
 * another app on another device. Inline under a wallet page they compete with
 * a balance, a transaction list and a nav bar; here they get the screen.
 */
export function UsdtWalletModal({ mode, balance, onClose, onCredited }: Props) {
  // Escape closes, and the page behind must not scroll under the overlay —
  // on a phone that reads as the modal itself being broken.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "deposit" ? "Deposit USDT" : "Withdraw USDT"}
      style={{
        position: "fixed",
        inset: 0,
        // Above the fixed site header, which sits at 3000. At 1000 the header
        // painted over the top of the panel, clipping the title and the close
        // button — the modal looked broken and there was no way to shut it.
        zIndex: 10000,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        // Only a click on the backdrop itself. Without this check, releasing a
        // drag that started inside the panel closes it — which loses a
        // half-entered amount.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes usdtModalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: "22px 20px 24px",
          width: "100%",
          // Wider than the ngultrum modal by design: the deposit screen puts a
          // QR beside the address on desktop, and 460px squeezed a 34-character
          // address into a narrow column next to it.
          maxWidth: 520,
          margin: "0 16px",
          // The address screen is taller than the form; scroll inside the
          // panel rather than letting it run off a short screen.
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          animation: "usdtModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid var(--glass-border)",
            background: "var(--glass-bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X size={16} />
        </button>

        {mode === "deposit" ? (
          <UsdtDepositPanel onCredited={onCredited} />
        ) : (
          <UsdtWithdrawPanel balance={balance} />
        )}
      </div>
    </div>
  );
}
