import "./usdt.css";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createUsdtDeposit,
  getUsdtDeposit,
  getUsdtNetworks,
  listUsdtDeposits,
  topUpUsdtDeposit,
  type UsdtDepositIntent,
  type UsdtNetwork,
} from "@shared/api/client";

/**
 * USDT deposit, manual path.
 *
 * There is no wallet-connect option and that is deliberate rather than
 * unfinished: Tron is the only chain activated for our tenant, and Tron has no
 * browser-wallet integration worth shipping. Most deposits arrive from an
 * exchange anyway, where a wallet is never involved. If EVM chains are
 * activated later this panel gains a second method; until then a toggle with
 * one option is noise.
 *
 * The whole screen exists to prevent two unrecoverable mistakes: sending on the
 * wrong chain, and sending the wrong amount.
 */

type Phase = "choose" | "awaiting" | "done";

const POLL_MS = 5000;
const REQUEST_KEY = "oro_usdt_deposit_request";

/**
 * Statuses where money is still expected against this intent.
 *
 * `confirmed_partial` belongs here: the address is live and the remainder can
 * still arrive through a top-up, so resuming must land on it rather than
 * offering a new deposit.
 */
const PENDING_STATUSES = [
  "awaiting_deposit",
  "confirming",
  "accepted",
  "confirmed_partial",
];

function useCountdown(iso: string | undefined) {
  const [left, setLeft] = useState<number>(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () =>
      setLeft(Math.max(0, new Date(iso).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  return { expired: left <= 0, label: `${mins}:${String(secs).padStart(2, "0")}` };
}

export function UsdtDepositPanel({ onCredited }: { onCredited?: () => void }) {
  const [networks, setNetworks] = useState<UsdtNetwork[] | null>(null);
  const [networkId, setNetworkId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [intent, setIntent] = useState<UsdtDepositIntent | null>(null);
  const [phase, setPhase] = useState<Phase>("choose");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pollFailing, setPollFailing] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);

  // Generated once per attempt. Reused on retry so a double-tap replays the
  // same intent rather than burning another derived address.
  // The idempotency key for one deposit attempt.
  //
  // Persisted rather than generated per mount, so closing and reopening the
  // sheet replays the intent already being watched instead of creating a
  // second address. But it must not outlive the attempt: the server returns
  // the existing intent for a repeated key, so a key kept forever meant every
  // later "Continue" handed back the *first* intent — long since expired —
  // and the screen opened straight onto "this deposit window has expired".
  //
  // Rotated whenever there is no live intent to replay: on mount, on "start
  // again", and after one completes.
  const requestId = useRef<string>(
    sessionStorage.getItem(REQUEST_KEY) ?? crypto.randomUUID(),
  );
  const rotateRequestId = useCallback(() => {
    requestId.current = crypto.randomUUID();
    sessionStorage.setItem(REQUEST_KEY, requestId.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Networks and any deposit already in flight, together. A user who closed
    // this sheet while waiting — or reloaded, or came back on another device —
    // must land back on their address, not on a blank form that would create a
    // second intent beside the one still being watched.
    Promise.all([getUsdtNetworks(), listUsdtDeposits().catch(() => [])])
      .then(([{ networks }, deposits]) => {
        if (cancelled) return;
        setNetworks(networks);
        if (networks.length === 1) setNetworkId(networks[0].id);

        const live = (deposits ?? []).find(
          (d) =>
            PENDING_STATUSES.includes(d.status) &&
            // Status is swept on a schedule, so an intent can still read
            // `awaiting_deposit` well past its window. Resuming one of those
            // drops the user straight onto an expired screen.
            (!d.expiresAt || new Date(d.expiresAt).getTime() > Date.now()),
        );
        if (live) {
          setIntent(live);
          setNetworkId(live.network);
          setPhase("awaiting");
        } else {
          // Nothing in flight, so whatever key we were holding belongs to a
          // finished or expired attempt. Reusing it would replay that one.
          rotateRequestId();
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rotateRequestId]);

  const chosen = useMemo(
    () => networks?.find((n) => n.id === networkId) ?? null,
    [networks, networkId],
  );
  const countdown = useCountdown(intent?.expiresAt);

  // Held in a ref so the poll below does not depend on it.
  //
  // The caller passes an inline arrow, so `onCredited` is a new function on
  // every parent render. With it in the dependency array, each parent render
  // tore down the interval and started a fresh one — and on a page that
  // re-renders more often than the poll period, the timer never survived long
  // enough to fire even once. The deposit credited server-side and the screen
  // sat on "waiting" indefinitely.
  const onCreditedRef = useRef(onCredited);
  useEffect(() => {
    onCreditedRef.current = onCredited;
  }, [onCredited]);

  // Poll while a deposit is outstanding. Settlement is server-side either way;
  // this only decides how quickly the screen catches up.
  //
  // Keyed on the intent **id**, not the intent object: every successful poll
  // replaces the object, which would restart the timer on each tick.
  const intentId = intent?.intentId;
  useEffect(() => {
    if (phase !== "awaiting" || !intentId) return;
    let misses = 0;
    const t = setInterval(async () => {
      try {
        const fresh = await getUsdtDeposit(intentId);
        misses = 0;
        setPollFailing(false);
        setIntent(fresh);
        if (["confirmed", "confirmed_overpaid"].includes(fresh.status)) {
          setPhase("done");
          // This attempt is finished; the next deposit must not replay it.
          rotateRequestId();
          onCreditedRef.current?.();
        }
      } catch {
        // One failure is a blip. A run of them means we are not going to find
        // out this way, and saying nothing leaves the user staring at a
        // "waiting" screen that will never change on its own.
        if (++misses >= 3) setPollFailing(true);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [phase, intentId, rotateRequestId]);

  const copy = useCallback((text: string, what: "address" | "amount") => {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const created = await createUsdtDeposit({
        network: networkId,
        amountUsdt: amount.trim(),
        clientRequestId: requestId.current,
      });
      setIntent(created);
      setPhase("awaiting");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function topUp() {
    if (!intent) return;
    setBusy(true);
    try {
      const child = await topUpUsdtDeposit(intent.intentId, crypto.randomUUID());
      setIntent(child);
      setPhase("awaiting");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // The amount as a person should read and retype it.
  //
  // The column is `numeric(28,9)`, so the API hands back "1.000000000" once
  // the row has been read from the database — nine decimals for a six-decimal
  // token. It is not wrong arithmetically and it looks wrong to everybody, and
  // this is the number users copy by hand into a wallet.
  const displayAmount = (value: string | number | null | undefined): string => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return String(value ?? "");
    // Six decimals is USDT's precision; trailing zeros then trimmed so a whole
    // number reads as "1", not "1.000000".
    return n.toFixed(6).replace(/\.?0+$/, "");
  };

  if (networks === null || resuming)
    return <p className="usdt-muted">Loading…</p>;

  // An empty list means no chain is currently safe to offer — the backend
  // withholds any it cannot confirm 21Pay is watching. Saying so is better
  // than an empty picker.
  if (networks.length === 0) {
    return (
      <div className="usdt-panel">
        <p>USDT deposits are temporarily unavailable. Please try again later.</p>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="usdt-panel">
        <h3>Deposit USDT</h3>

        <label className="usdt-label">Network</label>
        <p className="usdt-muted">
          Send on this network only. A transfer on a different network cannot be
          recovered.
        </p>
        <div className="usdt-networks">
          {networks.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`usdt-network ${networkId === n.id ? "is-selected" : ""}`}
              onClick={() => setNetworkId(n.id)}
            >
              <span className="usdt-network-name">{n.name}</span>
              <span className="usdt-muted">{n.confirmationHint}</span>
            </button>
          ))}
        </div>

        {chosen?.warning && (
          <p className="usdt-warning">{chosen.warning}</p>
        )}

        <label className="usdt-label" htmlFor="usdt-amount">
          Amount (USDT)
        </label>
        <input
          id="usdt-amount"
          inputMode="decimal"
          placeholder="25.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {error && <p className="usdt-error">{error}</p>}

        <button
          type="button"
          className="usdt-primary"
          disabled={!networkId || !amount.trim() || busy}
          onClick={start}
        >
          {busy ? "Creating…" : "Continue"}
        </button>
      </div>
    );
  }


  if (!intent) return null;

  const partial = intent.status === "confirmed_partial";
  const expired = intent.status === "expired" || countdown.expired;

  if (phase === "done") {
    return (
      <div className="usdt-panel">
        <h3>Deposit received</h3>
        <p>
          {displayAmount(intent.detectedAmountUsdt ?? intent.amountUsdt)} USDT
          has been added to
          your balance.
        </p>
        {intent.status === "confirmed_overpaid" && (
          <p className="usdt-muted">
            You sent more than the requested amount. The full amount received
            has been credited.
          </p>
        )}
        {intent.explorerUrl && (
          <a href={intent.explorerUrl} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="usdt-panel">
      <h3>Send {displayAmount(intent.amountUsdt)} USDT</h3>
      <p className="usdt-muted">
        {chosen?.name ?? intent.network} · {chosen?.confirmationHint}
      </p>

      {/* An expired window stops showing its address at all.
          The intent is closed on our side, but the address stays real — money
          sent to it now lands against something we are no longer watching and
          has to be recovered by hand, so leaving a scannable QR on screen is
          an invitation to exactly that. A partial deposit is different: that
          window is still live and the remainder belongs at the same address. */}
      {expired && !partial ? null : (
        <>
        {/* Address and amount each get their own copy control. Users type the
            amount by hand and get it wrong, and every wrong amount becomes an
            underpayment the user then has to top up. */}
        {/* The QR leads. Scanning is the path that cannot be mistyped, so it
            gets the size; the address sits under it for anyone copying by hand
            or checking the two match.

            Encodes the **address only**, deliberately: a payment URI carrying
            the amount is honoured inconsistently for TRC-20, and a wallet that
            quietly drops it produces an underpayment — the one outcome this
            screen exists to avoid. */}
        <figure className="usdt-qr">
          <div className="usdt-qr-frame">
            <QRCodeSVG
              value={intent.depositAddress}
              size={220}
              level="M"
              marginSize={2}
            />
          </div>
          <figcaption>Scan, then enter the amount by hand</figcaption>
        </figure>

        <label className="usdt-label">Address</label>
        <div className="usdt-copyrow">
          <code>{intent.depositAddress}</code>
          <button
            type="button"
            onClick={() => copy(intent.depositAddress, "address")}
          >
            {copied === "address" ? "Copied" : "Copy"}
          </button>
        </div>

        <label className="usdt-label">Exact amount</label>
        <div className="usdt-copyrow">
          <code>{displayAmount(intent.amountUsdt)}</code>
          <button
            type="button"
            onClick={() => copy(displayAmount(intent.amountUsdt), "amount")}
          >
            {copied === "amount" ? "Copied" : "Copy"}
          </button>
        </div>
          {chosen?.warning && (
            <p className="usdt-warning">{chosen.warning}</p>
          )}
        </>
      )}

      {pollFailing && (
        <p className="usdt-notice">
          We have lost contact with the server, so this screen may be out of
          date. Your deposit is unaffected — it is credited from the chain, not
          from this page. Reopen the wallet to check.
        </p>
      )}

      {!expired && !partial && (
        <p className="usdt-muted">
          {intent.status === "confirming" || intent.status === "accepted"
            ? `Transaction seen — confirming on-chain. ${chosen?.confirmationHint ?? ""}`
            : `Waiting for your transfer · expires in ${countdown.label}`}
        </p>
      )}

      {/* A way out.
          Resuming an in-flight deposit is right — it stops a second address
          being created for the same attempt — but with no escape it means
          someone who typed the wrong amount is stuck staring at an address
          they do not want until the window times out. */}
      {!partial && (
        <button
          type="button"
          className="usdt-textlink"
          onClick={() => {
            rotateRequestId();
            setIntent(null);
            setPhase("choose");
          }}
        >
          Deposit a different amount
        </button>
      )}

      {partial && (
        <div className="usdt-partial">
          <p>
            We received {displayAmount(intent.detectedAmountUsdt)} of{" "}
            {displayAmount(intent.amountUsdt)} USDT.
            Send the difference to the same address to complete this deposit.
          </p>
          <button
            type="button"
            className="usdt-inline-action"
            onClick={topUp}
            disabled={busy}
          >
            Top up the difference
          </button>
        </div>
      )}

      {expired && !partial && (
        <div className="usdt-partial">
          <p>This deposit window has expired. You can start a new one.</p>
          <button
            type="button"
            className="usdt-inline-action"
            onClick={() => {
              rotateRequestId();
              setIntent(null);
              setPhase("choose");
            }}
          >
            Start again
          </button>
        </div>
      )}

      {intent.status === "failed" && (
        <p className="usdt-error">
          This deposit could not be completed. Please contact support.
        </p>
      )}

      {error && <p className="usdt-error">{error}</p>}
    </div>
  );
}
