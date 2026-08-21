import { useEffect, useState } from "react";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import { UsdtDepositPanel } from "../components/UsdtDepositPanel";
import { KycVerificationPanel } from "../components/KycVerificationPanel";
import { formatMoney } from "@shared/currency/currency";
import { UsdtWithdrawPanel } from "../components/UsdtWithdrawPanel";
import {
  getKycStatus,
  getMe,
  getMyTransactions,
  type AuthUser,
  type Transaction,
} from "@shared/api/client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  Trophy,
  RotateCcw,
  Lock,
  Unlock,
  Wallet,
  Plus,
  ArrowUpCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Swords,
  ChevronDown,
  Eye,
  EyeOff,
  Gift,
  Medal,
  Award,
  Flame,
} from "lucide-react";

const INITIAL_LIMIT = 5;

const TX_ICON: Record<Transaction["type"], React.ReactNode> = {
  deposit: <ArrowDownLeft size={18} />,
  withdrawal: <ArrowUpRight size={18} />,
  bet_placed: <Target size={18} />,
  bet_payout: <Trophy size={18} />,
  refund: <RotateCcw size={18} />,
  dispute_bond: <Lock size={18} />,
  dispute_refund: <Unlock size={18} />,
  dispute_bond_lock: <Lock size={18} />,
  dispute_bond_forfeit: <Lock size={18} />,
  dispute_bond_reward: <Award size={18} />,
  referral_bonus: <UserPlus size={18} />,
  referral_prize: <Medal size={18} />,
  streak_bonus: <Flame size={18} />,
  duel_wager: <Swords size={18} />,
  duel_payout: <Swords size={18} />,
  free_credit: <Gift size={18} />,
  season_prize: <Medal size={18} />,
};

const TX_LABEL: Record<Transaction["type"], string> = {
  deposit: "Top Up",
  withdrawal: "Cash Out",
  bet_placed: "Prediction placed",
  bet_payout: "Payout received",
  refund: "Prediction refunded",
  dispute_bond: "Dispute bond",
  dispute_refund: "Bond refund",
  dispute_bond_lock: "Dispute bond locked",
  dispute_bond_forfeit: "Dispute lost — bond forfeited",
  dispute_bond_reward: "Dispute won — reward",
  referral_bonus: "Referral bonus",
  referral_prize: "Referral prize",
  streak_bonus: "Streak bonus",
  duel_wager: "Duel wager locked",
  duel_payout: "Duel payout",
  free_credit: "Welcome bonus",
  season_prize: "Season prize",
};

function TxRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px",
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        marginBottom: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: isCredit
            ? "rgba(34, 197, 94, 0.1)"
            : "rgba(59, 130, 246, 0.1)",
          color: isCredit ? "#22c55e" : "#3b82f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {TX_ICON[tx.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--text-main)",
          }}
        >
          {TX_LABEL[tx.type]}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-subtle)",
            marginTop: 2,
          }}
        >
          {new Date(tx.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "1rem",
            fontWeight: 800,
            color: isCredit ? "#22c55e" : "var(--text-main)",
          }}
        >
          {isCredit ? "+" : ""}
          {Number(tx.amount).toLocaleString()}
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-subtle)",
            marginTop: 2,
          }}
        >
          Bal {Number(tx.balanceAfter).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function PwaWalletPage() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [balanceHidden, setBalanceHidden] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getMyTransactions()])
      .then(([p, t]) => {
        setProfile(p);
        setTxs(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when server pushes a balance update via SSE
  useEffect(() => {
    const handler = () => {
      Promise.all([getMe(), getMyTransactions()])
        .then(([p, t]) => {
          setProfile(p);
          setTxs(t);
        })
        .catch(() => {});
    };
    window.addEventListener("oro:balance-changed", handler);
    return () => window.removeEventListener("oro:balance-changed", handler);
  }, []);

  // An account is native to one currency. A USDT account gets the crypto rail
  // and never sees DK Bank; a BTN account sees exactly what it always has.
  const isUsdt = profile?.currency === "USDT";
  // A Bhutanese account that also holds USDT. Its ngultrum rail is unchanged —
  // DK Bank top-up, DK Bank withdrawal — and the USDT wallet sits beside it as
  // a separate section. The two balances are never added: there is no rate
  // between them.
  const hasSecondWallet = !isUsdt && profile?.canHoldUsdt === true;
  // Read live rather than from the session: `profile.kycStatus` was minted at
  // login and does not change when a reviewer approves, so a verified user
  // would keep seeing the form until they logged out and back in.
  const [kycApproved, setKycApproved] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isUsdt) return;
    let cancelled = false;
    getKycStatus()
      .then((s) => !cancelled && setKycApproved(s.status === "approved"))
      // A failed status check must not open the gate. The server refuses an
      // unverified deposit anyway; showing the form is the honest fallback.
      .catch(() => !cancelled && setKycApproved(false));
    return () => {
      cancelled = true;
    };
  }, [isUsdt]);
  const [usdtTab, setUsdtTab] = useState<"deposit" | "withdraw">("deposit");

  const totalIn = txs
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = txs
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div
      style={{
        padding: "32px 16px 100px",
        maxWidth: 600,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div className="mesh-bg" />

      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: "var(--text-main)",
          marginBottom: 24,
          paddingLeft: 4,
          fontFamily: "var(--font-display)",
        }}
      >
        Wallet
      </h1>

      {loading && <LoadingScreen message="Syncing balance…" />}

      {error && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <p style={{ color: "#ef4444", fontWeight: 700 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-main)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && profile && (
        <>
          {/* Balance card */}
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-xl)",
              padding: "20px 20px 0",
              position: "relative",
              border: "1px solid var(--border)",
              marginBottom: 24,
            }}
          >
            {/* Label row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Est. total balance
              </span>
              <button
                onClick={() => setBalanceHidden((h) => !h)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 0 0 4px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  marginLeft: "auto",
                }}
                aria-label={balanceHidden ? "Show balance" : "Hide balance"}
              >
                {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Balance amount */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-1px",
                }}
              >
                {balanceHidden
                  ? "****"
                  : Number(profile.creditsBalance).toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Nu
              </span>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 24,
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
                paddingBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 3,
                  }}
                >
                  Total In
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--success)",
                  }}
                >
                  +{totalIn.toLocaleString()}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 3,
                  }}
                >
                  Total Out
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {Math.abs(totalOut).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ── USDT rail ─────────────────────────────────────────────────
              A USDT account funds and withdraws through 21 Pay and never sees
              DK Bank. A BTN account sees exactly what it always has: the two
              blocks are mutually exclusive, because an account is native to
              one currency and there is no conversion between them. */}
          {isUsdt && kycApproved === false && (
            <div style={{ marginBottom: 32 }}>
              <KycVerificationPanel
                onSubmitted={() => setKycApproved(false)}
              />
            </div>
          )}

          {isUsdt && kycApproved && (
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <button
                  onClick={() => setUsdtTab("deposit")}
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid var(--glass-border)",
                    background:
                      usdtTab === "deposit"
                        ? "var(--deposit-btn-bg)"
                        : "var(--bg-card)",
                    color: usdtTab === "deposit" ? "#fff" : "var(--text-main)",
                  }}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setUsdtTab("withdraw")}
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid var(--glass-border)",
                    background:
                      usdtTab === "withdraw"
                        ? "var(--deposit-btn-bg)"
                        : "var(--bg-card)",
                    color: usdtTab === "withdraw" ? "#fff" : "var(--text-main)",
                  }}
                >
                  Withdraw
                </button>
              </div>

              {usdtTab === "deposit" ? (
                <UsdtDepositPanel
                  onCredited={() =>
                    window.dispatchEvent(new Event("oro:balance-changed"))
                  }
                />
              ) : (
                <UsdtWithdrawPanel balance={Number(profile.balance ?? 0)} />
              )}
            </div>
          )}

          {/* ── Second wallet: USDT held by a Bhutanese account ───────────
              Only rendered when the account may hold one. The ngultrum rail
              above is untouched by anything in here. */}
          {hasSecondWallet && (
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    margin: 0,
                  }}
                >
                  USDT wallet
                </h3>
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                  }}
                >
                  {formatMoney(Number(profile.usdtBalance ?? 0), "USDT")}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-subtle)",
                  margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
              >
                Separate from your ngultrum balance. Deposit from your own
                crypto wallet and stake it in USDT markets — the two are never
                converted into each other.
              </p>

              {profile.usdtVerified === false ? (
                <KycVerificationPanel />
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <button
                      onClick={() => setUsdtTab("deposit")}
                      style={walletTabStyle(usdtTab === "deposit")}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setUsdtTab("withdraw")}
                      style={walletTabStyle(usdtTab === "withdraw")}
                    >
                      Withdraw
                    </button>
                  </div>
                  {usdtTab === "deposit" ? (
                    <UsdtDepositPanel
                      onCredited={() =>
                        window.dispatchEvent(new Event("oro:balance-changed"))
                      }
                    />
                  ) : (
                    <UsdtWithdrawPanel
                      balance={Number(profile.usdtBalance ?? 0)}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Action buttons — BTN rail only */}
          {!isUsdt && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 32,
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px",
                borderRadius: 16,
                background: "var(--deposit-btn-bg)",
                color: "#fff",
                border: "none",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(39,117,208,0.25)",
              }}
            >
              <Plus size={20} />
              Top Up
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "16px",
                borderRadius: 16,
                background: "var(--bg-card)",
                color: "var(--text-main)",
                border: "1px solid var(--glass-border)",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <ArrowUpCircle size={20} />
              Cash Out
            </button>
          </div>
          )}

          {/* Transaction list */}
          <div style={{ padding: "0 4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "var(--text-main)",
                    margin: 0,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  History
                </h2>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-subtle)",
                    marginTop: 2,
                  }}
                >
                  {txs.length} transaction{txs.length !== 1 ? "s" : ""}
                </div>
              </div>
              <Clock size={16} color="var(--text-subtle)" />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {txs.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                  }}
                >
                  <Wallet
                    size={48}
                    strokeWidth={1.5}
                    style={{
                      marginBottom: 16,
                      opacity: 0.3,
                      display: "block",
                      margin: "0 auto 16px",
                    }}
                  />
                  <div
                    style={{
                      fontWeight: 900,
                      color: "var(--text-main)",
                      fontSize: "1.1rem",
                      marginBottom: 8,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    No transactions yet
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    Your deposit and payout history will appear here.
                  </div>
                </div>
              ) : (
                <>
                  {txs.slice(0, visibleCount).map((tx) => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                  {visibleCount < txs.length && (
                    <button
                      onClick={() => setVisibleCount((c) => c + INITIAL_LIMIT)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        width: "100%",
                        padding: "14px",
                        marginTop: 4,
                        borderRadius: 16,
                        background: "var(--bg-card)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--bg-secondary)";
                        e.currentTarget.style.color = "var(--text-main)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg-card)";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      <ChevronDown size={16} />
                      View more ({txs.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Shared by both wallet tab rows, which were byte-identical inline blocks. */
function walletTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    border: "1px solid var(--glass-border)",
    background: active ? "var(--deposit-btn-bg)" : "var(--bg-card)",
    color: active ? "#fff" : "var(--text-main)",
  };
}
