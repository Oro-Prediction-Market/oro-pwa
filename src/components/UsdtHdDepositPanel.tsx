import "./usdt.css";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getUsdtDepositAddress,
  getUsdtNetworks,
  listUsdtHdDeposits,
  type UsdtDepositAddress,
  type UsdtHdDeposit,
  type UsdtNetwork,
} from "@shared/api/client";

/**
 * USDT deposit on the account's permanent address (21 Pay Single HD wallet).
 *
 * Replaces the per-deposit invoice screen. 21 Pay now gives every account one
 * address that never expires and accepts any amount, any number of times — so
 * there is no amount to enter, no countdown, and nothing to "start again".
 * The screen is the address, and the deposits that have arrived on it.
 *
 * Tron only: it is the only chain the HD wallet covers.
 */

const NETWORK = "tron";
const POLL_MS = 5000;

/** Six decimals is USDT's precision; trailing zeros trimmed ("1", not "1.000000"). */
function displayAmount(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toFixed(6).replace(/\.?0+$/, "");
}

/** How long "X USDT received" stays up before the sheet closes itself. */
const CLOSE_AFTER_CREDIT_MS = 2500;

export function UsdtHdDepositPanel({
  onCredited,
  onDone,
}: {
  onCredited?: () => void;
  /** Called shortly after a deposit is credited, to close the sheet. */
  onDone?: () => void;
}) {
  const [address, setAddress] = useState<UsdtDepositAddress | null>(null);
  const [network, setNetwork] = useState<UsdtNetwork | null>(null);
  const [deposits, setDeposits] = useState<UsdtHdDeposit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pollFailing, setPollFailing] = useState(false);
  const [justReceived, setJustReceived] = useState<UsdtHdDeposit | null>(null);

  // Credited deposits already on screen. Anything credited that is not in
  // here arrived while the sheet was open, and is what we announce.
  const seen = useRef<Set<string> | null>(null);

  // Held in a ref: the caller passes an inline arrow, and depending on it
  // would restart the poll on every parent render.
  const onCreditedRef = useRef(onCredited);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onCreditedRef.current = onCredited;
    onDoneRef.current = onDone;
  }, [onCredited, onDone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [addr, nets, list] = await Promise.all([
          getUsdtDepositAddress(NETWORK),
          // Only for the display strings (name, confirmation hint, gas
          // warning). The address does not depend on it.
          getUsdtNetworks().catch(() => ({ networks: [] as UsdtNetwork[] })),
          listUsdtHdDeposits().catch(() => [] as UsdtHdDeposit[]),
        ]);
        if (cancelled) return;
        setAddress(addr);
        setNetwork(nets.networks.find((n) => n.id === NETWORK) ?? null);
        setDeposits(list);
        seen.current = new Set(
          list.filter((d) => d.status === "credited").map((d) => d.id),
        );
      } catch (e: any) {
        // Most often the identity check, whose message says what to do.
        if (!cancelled) setError(e?.message ?? "Could not load your address");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Watch for money arriving while the sheet is open: at once on the SSE
  // push, every POLL_MS otherwise. Crediting is server-side either way; this
  // only decides how quickly the screen and the balance catch up.
  const hasAddress = Boolean(address);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Closed by hand before the timer fired: do not call onDone on an unmounted
  // sheet (it would close a sheet reopened in the meantime).
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!hasAddress) return;
    let misses = 0;
    const check = async () => {
      try {
        const list = await listUsdtHdDeposits();
        misses = 0;
        setPollFailing(false);
        setDeposits(list);

        const known = seen.current ?? new Set<string>();
        const fresh = list.filter(
          (d) => d.status === "credited" && !known.has(d.id),
        );
        if (fresh.length > 0) {
          fresh.forEach((d) => known.add(d.id));
          seen.current = known;
          setJustReceived(fresh[0]);
          onCreditedRef.current?.();
          // The deposit is done: say so for a moment, then get out of the way.
          // The address stays the same, so there is nothing left to do here —
          // the next deposit can reopen the sheet.
          closeTimer.current ??= setTimeout(
            () => onDoneRef.current?.(),
            CLOSE_AFTER_CREDIT_MS,
          );
        }
      } catch {
        if (++misses >= 3) setPollFailing(true);
      }
    };
    // The backend pushes `balance:updated` over SSE the moment the `credited`
    // webhook is processed, so a deposit shows up at once. The poll is the
    // fallback for when that stream is down.
    const t = setInterval(check, POLL_MS);
    window.addEventListener("oro:balance-changed", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("oro:balance-changed", check);
    };
  }, [hasAddress]);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  if (loading) return <p className="usdt-muted">Loading…</p>;

  if (error || !address) {
    return (
      <div className="usdt-panel">
        <h3>Deposit USDT</h3>
        <p className="usdt-error">
          {error ?? "USDT deposits are temporarily unavailable."}
        </p>
      </div>
    );
  }

  const networkName = network?.name ?? "Tron (TRC-20)";

  return (
    <div className="usdt-panel">
      <h3>Deposit USDT</h3>
      <p className="usdt-muted">
        {networkName}
        {network?.confirmationHint ? ` · ${network.confirmationHint}` : ""}
      </p>

      {justReceived && (
        <p className="usdt-notice">
          {displayAmount(justReceived.amountUsdt)} USDT received and added to
          your balance.
        </p>
      )}

      {/* Encodes the address only. A payment URI with an amount is honoured
          inconsistently for TRC-20 — and there is no amount to carry any more. */}
      <figure className="usdt-qr">
        <div className="usdt-qr-frame">
          <QRCodeSVG
            value={address.depositAddress}
            size={220}
            level="M"
            marginSize={2}
          />
        </div>
        <figcaption>Your personal USDT address</figcaption>
      </figure>

      <label className="usdt-label">Address</label>
      <div className="usdt-copyrow">
        <code>{address.depositAddress}</code>
        <button type="button" onClick={() => copy(address.depositAddress)}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="usdt-muted">
        This address is yours and does not expire. Send any amount, as often as
        you like — each transfer is credited on its own. Transfers under 0.01
        USDT are ignored.
      </p>

      <p className="usdt-warning">
        Send USDT on {networkName} only. A transfer on a different network
        cannot be recovered.
      </p>
      {network?.warning && <p className="usdt-warning">{network.warning}</p>}

      {pollFailing && (
        <p className="usdt-notice">
          We have lost contact with the server, so this screen may be out of
          date. Your deposit is unaffected — it is credited from the chain, not
          from this page. Reopen the wallet to check.
        </p>
      )}

      {deposits.length > 0 && (
        <div className="usdt-history">
          <h4>Recent deposits</h4>
          {deposits.map((d) => (
            <div key={d.id} className="usdt-history-row">
              <span>{displayAmount(d.amountUsdt)} USDT</span>
              <span className="usdt-muted">
                {new Date(d.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>
                {d.status === "credited" ? (
                  d.explorerUrl ? (
                    <a href={d.explorerUrl} target="_blank" rel="noreferrer">
                      Credited
                    </a>
                  ) : (
                    "Credited"
                  )
                ) : (
                  "Under review"
                )}
              </span>
            </div>
          ))}
          {deposits.some((d) => d.status === "in_review") && (
            <p className="usdt-muted">
              A deposit under review is being checked manually before it is
              added to your balance. No action is needed from you.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
