import { useEffect, useRef, useState } from "react";
import {
  getKycStatus,
  submitKycDocument,
  type KycDocumentType,
  type KycStatusResponse,
} from "@shared/api/client";
import { ShieldCheck, Clock, XCircle, Upload, Camera } from "lucide-react";

/**
 * Identity verification.
 *
 * Google proves an email address is real. It says nothing about who owns it,
 * so a deposit is gated on a document a human has looked at. This is the only
 * way to reach that state.
 */


const DOC_TYPES: { value: KycDocumentType; label: string; hint: string }[] = [
  { value: "passport", label: "Passport", hint: "The photo page" },
  {
    value: "national_id",
    label: "National ID card",
    hint: "Front side, showing the number",
  },
  {
    value: "residence_permit",
    label: "Residence permit",
    hint: "If you live outside your country of citizenship",
  },
];

/** Comfortably under the server's 4 MB ceiling, and under the request limit. */
const TARGET_BYTES = 700 * 1024;
const MAX_EDGE = 1600;

interface Props {
  /** Fires once a document is accepted for review. */
  onSubmitted?: () => void;
}

export function KycVerificationPanel({ onSubmitted }: Props) {
  const [state, setState] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [documentType, setDocumentType] = useState<KycDocumentType>("passport");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentCountry, setDocumentCountry] = useState("");
  const [image, setImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
    bytes: number;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    try {
      setState(await getKycStatus());
    } catch (err: any) {
      setError(err?.message ?? "Could not load your verification status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // While a document is under review, the answer arrives from a human at some
  // unpredictable point. Poll gently so an approval turns into an unlocked
  // deposit without the user reloading, and stop when it is no longer pending.
  useEffect(() => {
    if (state?.status !== "pending") return;
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [state?.status]);

  async function handleFile(file: File) {
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Please choose a JPEG, PNG or WebP photograph.");
      return;
    }
    try {
      const shrunk = await downscale(file);
      setImage(shrunk);
    } catch {
      setError("That image could not be read. Try taking the photo again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!image) {
      setError("Add a photograph of your document.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitKycDocument({
        documentType,
        documentNumber: documentNumber.trim(),
        documentCountry: documentCountry.trim().toUpperCase(),
        imageBase64: image.base64,
        mimeType: image.mimeType,
      });
      sessionStorage.removeItem("oro_new_account");
      await refresh();
      onSubmitted?.();
    } catch (err: any) {
      setError(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div style={cardStyle}>Loading your verification status…</div>;
  }

  // ── Terminal and waiting states ────────────────────────────────────────────

  if (state?.status === "approved") {
    return (
      <div style={{ ...cardStyle, ...tone("#22c55e") }}>
        <Row icon={<ShieldCheck size={18} />} title="Identity verified" />
        <p style={bodyText}>
          Your account is verified. Deposits and withdrawals are open.
        </p>
      </div>
    );
  }

  if (state?.status === "pending") {
    return (
      <div style={{ ...cardStyle, ...tone("#f59e0b") }}>
        <Row icon={<Clock size={18} />} title="Under review" />
        <p style={bodyText}>
          A reviewer is checking your document. This usually takes a few hours.
          You can browse markets meanwhile — deposits open as soon as it is
          approved.
        </p>
        {state.submittedAt && (
          <p style={metaText}>
            Submitted {new Date(state.submittedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  // ── The form: `none` and `rejected` both land here ─────────────────────────

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      {state?.status === "rejected" && (
        <div style={{ ...noticeStyle, marginBottom: 4 }}>
          <Row icon={<XCircle size={16} />} title="Not accepted" />
          <p style={{ ...bodyText, margin: "4px 0 0" }}>
            {state.rejectionReason ??
              "Your document could not be verified. Please submit another."}
          </p>
        </div>
      )}

      <div>
        <h3 style={headingStyle}>Verify your identity</h3>
        <p style={metaText}>
          Required before your first deposit. Your document is encrypted and
          seen only by a reviewer.
        </p>
      </div>

      <label style={labelStyle}>
        Document type
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as KycDocumentType)}
          style={inputStyle}
        >
          {DOC_TYPES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {/* What to photograph, for the type they picked. A reviewer rejecting
            a passport's back cover costs both sides a round trip. */}
        <span style={metaText}>
          {DOC_TYPES.find((d) => d.value === documentType)?.hint}
        </span>
      </label>

      <label style={labelStyle}>
        Document number
        <input
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="As printed on the document"
          autoComplete="off"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Issuing country
        <input
          value={documentCountry}
          onChange={(e) =>
            setDocumentCountry(
              e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase(),
            )
          }
          placeholder="Two-letter code, e.g. IN"
          style={inputStyle}
        />
      </label>

      <div style={labelStyle}>
        Photograph of the document
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ ...inputStyle, ...uploadButton }}
        >
          {image ? <Upload size={16} /> : <Camera size={16} />}
          {image ? "Choose a different photo" : "Take or choose a photo"}
        </button>
        {image && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={image.preview}
              alt="Document preview"
              style={{
                width: 64,
                height: 44,
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid var(--glass-border)",
              }}
            />
            <span style={metaText}>
              Ready — {(image.bytes / 1024).toFixed(0)} KB
            </span>
          </div>
        )}
        <span style={metaText}>
          All four corners visible, no glare, text readable.
        </span>
      </div>

      {error && <p style={errorText}>{error}</p>}

      <button
        type="submit"
        disabled={busy || !image || !documentNumber.trim() || documentCountry.length !== 2}
        style={{
          ...submitButton,
          opacity:
            busy || !image || !documentNumber.trim() || documentCountry.length !== 2
              ? 0.5
              : 1,
        }}
      >
        {busy ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

/**
 * Shrink a camera photo to something a request can carry.
 *
 * Phones produce 3–8 MB. Sending that raw means a 413 with no useful message,
 * and the reviewer gains nothing from the extra pixels — legibility caps out
 * well before a 12-megapixel original. Re-encodes as JPEG, stepping quality
 * down until it fits.
 */
async function downscale(
  file: File,
): Promise<{ base64: string; mimeType: string; preview: string; bytes: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  let dataUrl = "";
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    // A data URL is base64, so its payload length maps directly to bytes.
    if (base64Bytes(dataUrl) <= TARGET_BYTES) break;
  }
  const base64 = dataUrl.split(",")[1] ?? "";
  return {
    base64,
    mimeType: "image/jpeg",
    preview: dataUrl,
    bytes: base64Bytes(dataUrl),
  };
}

function base64Bytes(dataUrl: string): number {
  const b64 = dataUrl.split(",")[1] ?? "";
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function Row({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
      {icon}
      <span>{title}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: 14,
  padding: 18,
  color: "var(--text-main)",
  boxSizing: "border-box",
};

const tone = (colour: string): React.CSSProperties => ({
  borderColor: `${colour}55`,
  color: colour,
});

const headingStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  margin: "0 0 4px",
  color: "var(--text-main)",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text-subtle)",
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--glass-border)",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const uploadButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const submitButton: React.CSSProperties = {
  padding: "11px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const bodyText: React.CSSProperties = {
  fontSize: "0.82rem",
  lineHeight: 1.5,
  margin: 0,
  color: "var(--text-main)",
};

const metaText: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--text-subtle)",
  margin: 0,
};

const errorText: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#ef4444",
  margin: 0,
};

const noticeStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.25)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#ef4444",
};
