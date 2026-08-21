import "./usdt.css";
import { useEffect, useMemo, useState } from "react";
import {
  addUsdtDestination,
  getUsdtNetworks,
  listUsdtDestinations,
  listUsdtWithdrawals,
  requestUsdtWithdrawal,
  type UsdtDestination,
  type UsdtNetwork,
  type UsdtWithdrawal,
} from "@shared/api/client";

/**
 * USDT withdrawal.
 *
 * Two things here are deliberately more restrictive than they look:
 *
 * **No network selector next to the amount.** The network is a property of the
 * saved address. All EVM chains share the `0x` format, so nothing can tell a
 * Base address from an Arbitrum one — offering a dropdown invites picking the
 * wrong one and losing the money permanently. It is chosen once, when the
 * address is added, and displayed spelled out everywhere after.
 *
 * **New addresses wait 24 hours.** Enforced by 21Pay, not us. It is surfaced
 * with the time it becomes usable rather than a bare refusal, because a winner
 * who cannot withdraw needs to know why.
 */

function statusLabel(w: UsdtWithdrawal): string {
  if (w.needsManualReview) return "Under review";
  if (w.approvalStatus === "rejected") return "Declined";
  if (w.approvalStatus === "pending_approval") return "Awaiting approval";
  switch (w.remoteStatus) {
    case "completed":
      return "Sent";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "broadcasting":
    case "confirming":
    case "broadcast":
      return "Sending";
    default:
      return "Processing";
  }
}

export function UsdtWithdrawPanel({ balance }: { balance: number }) {
  const [networks, setNetworks] = useState<UsdtNetwork[]>([]);
  const [destinations, setDestinations] = useState<UsdtDestination[]>([]);
  const [history, setHistory] = useState<UsdtWithdrawal[]>([]);
  const [adding, setAdding] = useState(false);
  const [newNetwork, setNewNetwork] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () =>
    Promise.all([listUsdtDestinations(), listUsdtWithdrawals()])
      .then(([d, w]) => {
        setDestinations(d);
        setHistory(w);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    getUsdtNetworks()
      .then(({ networks }) => {
        setNetworks(networks);
        if (networks.length === 1) setNewNetwork(networks[0].id);
      })
      .catch(() => undefined);
    reload();
  }, []);

  const nameFor = (id: string) =>
    networks.find((n) => n.id === id)?.name ?? id;

  const usable = useMemo(
    () => destinations.filter((d) => d.status === "active"),
    [destinations],
  );
  const cooling = useMemo(
    () => destinations.filter((d) => d.status === "cooldown"),
    [destinations],
  );

  async function saveDestination() {
    setError(null);
    setBusy(true);
    try {
      await addUsdtDestination({
        network: newNetwork,
        address: newAddress.trim(),
        label: newLabel.trim() || undefined,
      });
      setNewAddress("");
      setNewLabel("");
      setAdding(false);
      setNotice(
        "Address saved. For your security it can be used 24 hours after being added.",
      );
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await requestUsdtWithdrawal({
        destinationId,
        amountUsdt: amount.trim(),
        clientRequestId: crypto.randomUUID(),
      });
      setAmount("");
      setNotice("Withdrawal requested. It will be reviewed before sending.");
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="usdt-panel">
      <h3>Withdraw USDT</h3>
      <p className="usdt-muted">
        Available ${balance.toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })}
      </p>

      {/* ── Addresses ─────────────────────────────────────────────────────── */}
      <label className="usdt-label">Withdrawal address</label>

      {usable.length === 0 && cooling.length === 0 && !adding && (
        <p className="usdt-muted">
          You have no saved withdrawal addresses yet.
        </p>
      )}

      {usable.map((d) => (
        <label key={d.id} className="usdt-destination">
          <input
            type="radio"
            name="usdt-destination"
            value={d.id}
            checked={destinationId === d.id}
            onChange={() => setDestinationId(d.id)}
          />
          <span>
            <strong>{d.label || "Saved address"}</strong>
            {/* Spelled out, never a chain id — the only thing standing between
                a user and an unrecoverable wrong-chain send. */}
            <span className="usdt-muted"> · {nameFor(d.network)}</span>
            <code className="usdt-addr">{d.address}</code>
          </span>
        </label>
      ))}

      {cooling.map((d) => (
        <div key={d.id} className="usdt-destination is-cooling">
          <span>
            <strong>{d.label || "Saved address"}</strong>
            <span className="usdt-muted"> · {nameFor(d.network)}</span>
            <code className="usdt-addr">{d.address}</code>
            <span className="usdt-muted">
              Available{" "}
              {d.usableAt
                ? new Date(d.usableAt).toLocaleString()
                : "24 hours after being added"}
            </span>
          </span>
        </div>
      ))}

      {!adding ? (
        <button
          type="button"
          className="usdt-secondary"
          onClick={() => setAdding(true)}
        >
          Add an address
        </button>
      ) : (
        <div className="usdt-newdest">
          <label className="usdt-label">Network</label>
          <select
            value={newNetwork}
            onChange={(e) => setNewNetwork(e.target.value)}
          >
            <option value="">Select a network</option>
            {networks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <p className="usdt-muted">
            The network is saved with the address and cannot be changed later.
            Funds sent on a different network cannot be recovered.
          </p>

          <label className="usdt-label">Address</label>
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Paste your wallet address"
          />

          <label className="usdt-label">Label (optional)</label>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Binance"
          />

          <button
            type="button"
            className="usdt-primary"
            disabled={!newNetwork || !newAddress.trim() || busy}
            onClick={saveDestination}
          >
            {busy ? "Saving…" : "Save address"}
          </button>
          <button
            type="button"
            className="usdt-textlink"
            onClick={() => setAdding(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Amount ────────────────────────────────────────────────────────── */}
      {usable.length > 0 && (
        <>
          <label className="usdt-label" htmlFor="usdt-wd-amount">
            Amount (USDT)
          </label>
          <input
            id="usdt-wd-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.00"
          />
          <button
            type="button"
            className="usdt-primary"
            disabled={!destinationId || !amount.trim() || busy}
            onClick={submit}
          >
            {busy ? "Requesting…" : "Request withdrawal"}
          </button>
          <p className="usdt-muted">
            Withdrawals are reviewed before they are sent.
          </p>
        </>
      )}

      {notice && <p className="usdt-notice">{notice}</p>}
      {error && <p className="usdt-error">{error}</p>}

      {/* ── History ───────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="usdt-history">
          <h4>Recent withdrawals</h4>
          {history.map((w) => (
            <div key={w.id} className="usdt-history-row">
              <span>{w.amountUsdt} USDT</span>
              <span className="usdt-muted">{nameFor(w.network)}</span>
              <span>{statusLabel(w)}</span>
            </div>
          ))}
          {history.some((w) => w.needsManualReview) && (
            <p className="usdt-muted">
              A withdrawal under review is being checked manually. Support will
              be in touch — no action is needed from you.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
