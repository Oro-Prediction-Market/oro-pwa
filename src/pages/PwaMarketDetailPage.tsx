import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import {
  getMarket,
  getDisputes,
  submitDispute,
  bustCache,
  getTerPrice,
  Market,
  Dispute,
  TerPrice,
} from "@shared/api/client";
import { PwaBetForm } from "../components/PwaBetForm";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getCategoryVisual } from "@shared/helpers/visuals";
import { useMarketSocket } from "../hooks/useMarketSocket";
import {
  UnderdogBanner,
  getUnderdogLabel,
} from "../../shared/components/UnderdogBanner";
import { getWCFlag, isWCMarket } from "./WorldCupHubPage";

// ── TER Price Panel (for market detail) ──────────────────────────────────────
function TerPricePanel({ market }: { market: Market }) {
  const meta = market.metadata || {};
  const refPrice = meta.referenceBuyPrice ?? meta.referenceTerPrice ?? 0;
  const settlementPrice = meta.settlementBuyPrice ?? meta.settlementTerPrice;
  const isSettled = market.status === "settled" || market.status === "resolved";
  const isClosed = market.status === "closed" || market.status === "resolving";

  const [live, setLive] = useState<TerPrice | null>(null);

  useEffect(() => {
    if (isSettled || isClosed) return;
    const fetch_ = () =>
      getTerPrice()
        .then(setLive)
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [isSettled, isClosed]);

  const displayPrice = isSettled
    ? settlementPrice
    : (live?.buyPrice ?? live?.midPrice);
  const diff = displayPrice != null ? displayPrice - refPrice : null;
  const pct =
    diff != null && refPrice ? ((diff / refPrice) * 100).toFixed(2) : null;
  const dir =
    diff == null ? null : diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const winLabel = isSettled
    ? market.outcomes.find((o) => o.id === market.resolvedOutcomeId)?.label
    : null;

  const upColor = "#22c55e";
  const downColor = "#ef4444";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${dir === "up" ? "rgba(34,197,94,0.3)" : dir === "down" ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 800,
          color: "var(--accent, #a78bfa)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        TER · 24 Hour Price Prediction
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-subtle)",
              marginBottom: 2,
            }}
          >
            Open price
          </div>
          <div
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--text-main)",
            }}
          >
            Nu {refPrice.toFixed(4)}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "var(--text-subtle)" }}>→</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-subtle)",
              marginBottom: 2,
            }}
          >
            {isSettled ? "Close price" : "Live price"}
          </div>
          <div
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color:
                dir === "up"
                  ? upColor
                  : dir === "down"
                    ? downColor
                    : "var(--text-main)",
            }}
          >
            {displayPrice != null ? `Nu ${displayPrice.toFixed(4)}` : "—"}
          </div>
        </div>
      </div>
      {diff != null && dir !== "flat" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 10,
            background:
              dir === "up" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: dir === "up" ? upColor : downColor,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <span>{dir === "up" ? "▲" : "▼"}</span>
          <span>
            {dir === "up" ? "+" : ""}
            Nu {diff.toFixed(4)} ({dir === "up" ? "+" : ""}
            {pct}%)
          </span>
          {isSettled && winLabel && (
            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>
              {winLabel === "UP" ? "▲ UP won" : "▼ DOWN won"}
            </span>
          )}
        </div>
      )}
      {/* Resolution price */}
      {isSettled && meta && (
        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: "0.8rem",
            lineHeight: 1.8,
            color: "#e2e8f0",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              marginBottom: 8,
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Resolution price
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Price resolved at</span>
            <span>
              {(meta.settlementBuyPrice ?? meta.settlementTerPrice ?? 0).toFixed(4)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Effective at</span>
            <span>
              {market.closesAt
                ? new Date(market.closesAt).toLocaleString("en-BT", {
                    timeZone: "Asia/Thimphu",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PwaMarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_disputes, setDisputes] = useState<Dispute[]>([]);

  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const bp = useBreakpoint();
  const liveData = useMarketSocket(id);

  const liveMarket = useMemo<Market | null>(() => {
    if (!market) return null;
    if (!liveData) return market;
    return {
      ...market,
      totalPool: String(liveData.totalPool),
      outcomes: market.outcomes.map((o) => {
        const live = liveData.outcomes.find((lo) => lo.id === o.id);
        if (!live) return o;
        return {
          ...o,
          totalBetAmount: String(live.totalBetAmount),
          lmsrProbability: live.lmsrProbability ?? o.lmsrProbability,
          currentOdds: String(live.currentOdds),
        } as typeof o;
      }),
    };
  }, [market, liveData]);

  const refreshMarket = useCallback(
    (updatedMarket?: Market) => {
      if (updatedMarket) {
        setMarket(updatedMarket);
        return;
      }
      if (!id) return;
      // Small delay to ensure backend cache is busted after bet placement
      setTimeout(() => {
        bustCache(`/markets/${id}`);
        getMarket(id)
          .then(setMarket)
          .catch((e) => setError(e.message));
      }, 300);
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMarket(id)
      .then(setMarket)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Refetch when page becomes visible + poll every 15s as WS fallback
  useEffect(() => {
    if (!id) return;
    const refetch = () => {
      bustCache(`/markets/${id}`);
      return getMarket(id)
        .then(setMarket)
        .catch(() => {});
    };

    const onVisibility = () => {
      if (!document.hidden) refetch();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(refetch, 15_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!id || !market || market.status !== "resolving") return;
    getDisputes(id)
      .then(setDisputes)
      .catch(() => {});
  }, [id, market?.status]);

  const handleSubmitDispute = async () => {
    if (!id) return;
    if (!disputeReason.trim()) {
      setDisputeError("Please explain why the proposed outcome is incorrect.");
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      await submitDispute(id, { reason: disputeReason });
      setDisputeSuccess(true);
      getDisputes(id)
        .then(setDisputes)
        .catch(() => {});
    } catch (e: any) {
      setDisputeError(e.message || "Failed to submit dispute");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen message="Syncing market..." />;

  if (error || !market) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <div
          style={{
            position: "relative",
            width: 100,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(236, 57, 66, 0.1)",
              border: "1px solid rgba(236, 57, 66, 0.2)",
            }}
          />
          <div style={{ fontSize: 40, zIndex: 1 }}>❌</div>
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "var(--text-main)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          {error || "Market not found"}
        </div>
        <Link
          to="/"
          style={{
            color: "var(--color-primary)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Back to Markets
        </Link>
      </div>
    );
  }

  // Use live-merged market for rendering so odds/pool update in real time
  const displayMarket = liveMarket!;

  const totalBets = displayMarket.outcomes.reduce(
    (sum, o) => sum + parseFloat(o.totalBetAmount),
    0,
  );

  const isOpen = market.status === "open";
  const isResolving = market.status === "resolving";

  const proposedOutcome =
    isResolving && market.proposedOutcomeId
      ? market.outcomes.find((o) => o.id === market.proposedOutcomeId)
      : null;

  const disputeTimeLeft = (() => {
    if (!market.disputeDeadlineAt) return null;
    const diff = new Date(market.disputeDeadlineAt).getTime() - Date.now();
    if (diff <= 0) return "Dispute window closed";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m remaining`;
  })();

  const pageTitle = `${displayMarket.title} | Oro Prediction Market`;
  const pageDesc =
    displayMarket.description ||
    `Predict the outcome of "${displayMarket.title}" and win real money on Oro.`;
  const pageUrl = `https://oro.fun/markets/${displayMarket.id}`;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding:
          bp === "mobile"
            ? "var(--space-md) var(--space-sm) 100px"
            : "var(--space-xl) var(--space-md)",
        position: "relative",
      }}
    >
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content="https://oro.fun/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content="https://oro.fun/og-image.png" />
      </Helmet>
      <div className="mesh-bg" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-lg)",
        }}
      >
        <Link
          to="/"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 800,
            transition: "all 0.2s ease",
            padding: "8px 12px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-main)";
            e.currentTarget.style.borderColor = "var(--text-subtle)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </Link>

        <button
          onClick={() => {
            const url = window.location.href;
            const text = `Check out this prediction market: ${market.title}`;
            if (navigator.share) {
              navigator
                .share({ title: market.title, text, url })
                .catch(() => {});
            } else {
              navigator.clipboard.writeText(url);
              alert("Link copied to clipboard!");
            }
          }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: bp === "mobile" ? "8px" : "8px 16px",
            fontSize: "0.85rem",
            fontWeight: 800,
            color: "var(--text-main)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.2s",
            width: bp === "mobile" ? 36 : "auto",
            height: bp === "mobile" ? 36 : "auto",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text-subtle)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {bp !== "mobile" && "Share"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: bp === "mobile" ? "column" : "row",
          gap: "var(--space-xl)",
          alignItems: "flex-start",
        }}
      >
        {/* Left Column: Info */}
        <div
          style={{
            flex: 1.6,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
            width: "100%",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: bp === "mobile" ? "1.3rem" : "1.5rem",
                fontWeight: 900,
                color: "var(--text-main)",
                marginBottom: "var(--space-sm)",
                lineHeight: 1.2,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}
            >
              {market.title}
            </h1>
            {market.description && market.externalSource !== "ter" && (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: bp === "mobile" ? "0.95rem" : "1.05rem",
                  lineHeight: 1.6,
                  fontWeight: 500,
                  maxWidth: "70ch",
                }}
              >
                {market.description}
              </p>
            )}
          </div>

          {/* TER Price Panel */}
          {market.externalSource === "ter" && market.metadata?.isTer && (
            <TerPricePanel market={market} />
          )}

          <div
            style={{
              overflowX: "visible",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  bp === "mobile" ? "1fr 1fr 1fr" : "repeat(3, 1fr)",
                gap: bp === "mobile" ? "var(--space-sm)" : "var(--space-md)",
              }}
            >
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: bp === "mobile" ? "12px 10px" : "var(--space-md)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.65rem" : "0.68rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    letterSpacing: "0.08em",
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    color: isOpen
                      ? "var(--color-success)"
                      : isResolving
                        ? "var(--color-warning)"
                        : "var(--text-muted)",
                    fontWeight: 900,
                    fontSize: bp === "mobile" ? "0.85rem" : "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  ></span>
                  {market.status.toUpperCase()}
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: bp === "mobile" ? "12px 10px" : "var(--space-md)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.65rem" : "0.68rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    letterSpacing: "0.08em",
                  }}
                >
                  Total Pool
                </div>
                <div
                  style={{
                    color: "var(--text-main)",
                    fontWeight: 900,
                    fontSize: bp === "mobile" ? "0.85rem" : "1rem",
                  }}
                >
                  Nu {Number(displayMarket.totalPool).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: bp === "mobile" ? "12px 10px" : "var(--space-md)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.65rem" : "0.68rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    letterSpacing: "0.08em",
                  }}
                >
                  Deadline
                </div>
                <div
                  style={{
                    color: "var(--text-main)",
                    fontWeight: 900,
                    fontSize: bp === "mobile" ? "0.85rem" : "1rem",
                  }}
                >
                  {market.closesAt
                    ? new Date(market.closesAt).toLocaleDateString(undefined, {
                        month: bp === "mobile" ? "short" : "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Crowd sentiment */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: bp === "mobile" ? "var(--space-md)" : "var(--space-lg)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Crowd Sentiment
              </div>
              {(() => {
                const meta = (market as any).signalMeta;
                if (!meta || meta.composite === 0) return null;
                const c = meta.composite as number;
                const pct = Math.round(c * 100);
                const col =
                  c >= 0.6
                    ? "var(--color-success)"
                    : c >= 0.3
                      ? "var(--color-warning)"
                      : "var(--color-danger)";
                const label =
                  c >= 0.6 ? "Strong" : c >= 0.3 ? "Balanced" : "Low";
                const r = 7,
                  circ = 2 * Math.PI * r;
                const dash = (c * circ).toFixed(2);
                return (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                    title={`Participants: ${meta.participantCount}`}
                  >
                    <div
                      style={{ position: "relative", width: 22, height: 22 }}
                    >
                      <svg width="22" height="22" viewBox="0 0 18 18">
                        <circle
                          cx="9"
                          cy="9"
                          r={r}
                          fill="none"
                          stroke="var(--bg-secondary)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="9"
                          cy="9"
                          r={r}
                          fill="none"
                          stroke={col}
                          strokeWidth="3"
                          strokeDasharray={`${dash} ${circ}`}
                          strokeLinecap="round"
                          transform="rotate(-90 9 9)"
                        />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        color: col,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {label} Confidence ({pct}%)
                    </span>
                  </div>
                );
              })()}
            </div>
            {(market.externalSource === "ter" || market.settlementSource) && (
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-subtle)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Resolves via{" "}
                {market.externalSource === "ter" ? (
                  "api.ter.bt"
                ) : (() => {
                  try {
                    const url = new URL(market.settlementSource!);
                    return (
                      <a
                        href={market.settlementSource!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all" }}
                      >
                        {url.hostname.replace(/^www\./, "")}
                      </a>
                    );
                  } catch {
                    return market.settlementSource;
                  }
                })()}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-md)",
              }}
            >
              {isOpen &&
                (() => {
                  const ul = getUnderdogLabel(
                    displayMarket.outcomes,
                    Number(displayMarket.totalPool),
                  );
                  return ul ? <UnderdogBanner underdogLabel={ul} /> : null;
                })()}
              {displayMarket.outcomes.map((outcome, idx) => {
                // Laplace-smoothed probability — avoids misleading 100%/0% at thin liquidity
                const prior = 1000; // virtual BTN spread evenly across outcomes
                const n = displayMarket.outcomes.length || 1;
                const smoothedAmount =
                  parseFloat(outcome.totalBetAmount) + prior / n;
                const smoothedTotal = totalBets + prior;
                const pct =
                  (outcome as any).lmsrProbability != null &&
                  (outcome as any).lmsrProbability > 0
                    ? (outcome as any).lmsrProbability * 100
                    : (smoothedAmount / smoothedTotal) * 100;

                const isResolved = market.status === "resolved" || market.status === "settled";
                const colors = isResolved
                  ? ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"]
                  : ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f97316"];
                const color = colors[idx % colors.length];

                const wcFlag = isWCMarket(market) ? getWCFlag(outcome.label) : "";
                const avatarUrl = wcFlag || (!imgError
                  ? (outcome as any).imageUrl ||
                    (idx === 0
                      ? market.imageUrl
                      : idx === 1
                        ? market.imageUrlAlt || market.imageUrl
                        : null)
                  : null);
                const vis = getCategoryVisual(market.category);

                return (
                  <div key={outcome.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            width: 36,
                            height: 36,
                            borderRadius: wcFlag ? 6 : "var(--radius-full)",
                            overflow: "hidden",
                            background: wcFlag ? "transparent" : vis.gradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: wcFlag ? "none" : "2px solid #fff",
                            boxShadow: wcFlag ? "none" : "var(--shadow-sm)",
                          }}
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              onError={() => setImgError(true)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: "#fff",
                              }}
                            >
                              {outcome.label.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontWeight: 800,
                            color: "var(--text-main)",
                            fontSize: "1rem",
                          }}
                        >
                          {outcome.label}
                        </span>
                      </div>
                      <div
                        style={{
                          background: `${color}15`,
                          color: color,
                          padding: "4px 12px",
                          borderRadius: "var(--radius-full)",
                          flexShrink: 0,
                          border: `1px solid ${color}30`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          lineHeight: 1.15,
                        }}
                      >
                        <span style={{ fontSize: "0.8rem", fontWeight: 900 }}>{Math.min(99, 100 / Math.max(pct, 1)).toFixed(1)}x</span>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, opacity: 0.75 }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        borderRadius: "var(--radius-full)",
                        height: "10px",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          background: color,
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: "var(--radius-full)",
                          transition:
                            "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          boxShadow: `0 0 12px ${color}40`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-subtle)",
                        marginTop: "6px",
                        fontWeight: 700,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      Nu {Number(outcome.totalBetAmount).toLocaleString()} total
                      bet
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interaction */}
        <div
          style={{
            flex: 1,
            position: bp === "mobile" ? "static" : "sticky",
            top: "calc(var(--header-height) + var(--space-md))",
            width: "100%",
          }}
        >
          {isOpen ? (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-lg)",
                boxShadow: "var(--shadow-lg)",
                backdropFilter: "var(--glass-blur)",
              }}
            >
              <PwaBetForm market={displayMarket} onBetPlaced={refreshMarket} />
            </div>
          ) : isResolving ? (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1.5px solid var(--color-warning)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  padding: "var(--space-md)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      color: "var(--color-warning)",
                      fontSize: "0.9rem",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Dispute Window
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      fontWeight: 700,
                    }}
                  >
                    {disputeTimeLeft}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(245, 158, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-warning)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v3" />
                    <path d="m3 9 2 2 2-2" />
                    <path d="m17 9 2 2 2-2" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <path d="M12 21v-6" />
                    <path d="M9 21h6" />
                  </svg>
                </div>
              </div>

              <div
                style={{
                  padding: "var(--space-lg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-lg)",
                }}
              >
                {proposedOutcome && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 900,
                        color: "var(--text-subtle)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                      }}
                    >
                      Proposed Outcome
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "14px 18px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-main)",
                          fontWeight: 900,
                          fontSize: "1.1rem",
                        }}
                      >
                        {proposedOutcome.label}
                      </span>
                      <span
                        style={{
                          background: "var(--color-warning)",
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 900,
                          padding: "3px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        ORACLE
                      </span>
                    </div>
                  </div>
                )}

                {disputeSuccess ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      background: "rgba(34, 197, 94, 0.08)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-success)",
                      color: "var(--color-success)",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>
                      ✅
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>
                      Dispute Logged
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "6px",
                        fontWeight: 600,
                      }}
                    >
                      The Oracle will re-evaluate based on community evidence.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-md)",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-warning)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Dispute Bond
                      </span>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 900,
                          color: "var(--color-warning)",
                        }}
                      >
                        Nu 10
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      This bond is locked when you raise an objection. You get
                      it back + a reward if the admin agrees the outcome was
                      wrong. You lose it if the admin upholds their decision.
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          display: "block",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Dispute Reasoning
                      </label>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={4}
                        placeholder="Explain why the proposed outcome is incorrect..."
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "14px",
                          borderRadius: "12px",
                          border: "1px solid var(--border)",
                          background: "var(--bg-main)",
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          outline: "none",
                          resize: "none",
                          fontFamily: "var(--font-primary)",
                          fontWeight: 500,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor =
                            "var(--color-warning)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border)")
                        }
                      />
                    </div>
                    {disputeError && (
                      <div
                        style={{
                          color: "var(--color-danger)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ {disputeError}
                      </div>
                    )}
                    <button
                      onClick={handleSubmitDispute}
                      disabled={disputeSubmitting}
                      style={{
                        width: "100%",
                        padding: "16px",
                        borderRadius: "var(--radius-md)",
                        border: "none",
                        background: disputeSubmitting
                          ? "var(--text-subtle)"
                          : "var(--color-warning)",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: "1.05rem",
                        cursor: disputeSubmitting ? "not-allowed" : "pointer",
                        boxShadow: "0 8px 20px -6px rgba(245, 158, 11, 0.4)",
                        transition:
                          "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                      onMouseEnter={(e) =>
                        !disputeSubmitting &&
                        (e.currentTarget.style.transform = "translateY(-2px)")
                      }
                      onMouseLeave={(e) =>
                        !disputeSubmitting &&
                        (e.currentTarget.style.transform = "translateY(0)")
                      }
                    >
                      {disputeSubmitting ? "Submitting..." : "Submit Dispute"}
                    </button>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-subtle)",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      * Bonds are held in escrow until the final resolution.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : market.status === "upcoming" ? (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "48px 24px",
                textAlign: "center",
                boxShadow: "var(--shadow-lg)",
                backdropFilter: "var(--glass-blur)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-info)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.5-1 1-4c2 0 3 .5 3 .5" />
                  <path d="M12 15v5s1 .5 4 1c0-2-.5-3-.5-3" />
                </svg>
              </div>
              <div
                style={{
                  fontWeight: 900,
                  color: "var(--text-main)",
                  fontSize: "1.4rem",
                  marginBottom: "12px",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                }}
              >
                Prophecy Loading
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                This portal opens for predictions on
                <br />
                <strong
                  style={{
                    color: "var(--color-info)",
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    display: "block",
                    marginTop: 8,
                  }}
                >
                  {new Date(market.opensAt!).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "32px 24px",
                textAlign: "center",
                boxShadow: "var(--shadow-lg)",
                marginTop: "var(--space-lg)",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Winning outcome display */}
              {(() => {
                if (!market.resolvedOutcomeId) return null;
                const winnerOutcome = market.outcomes.find(
                  (o) => o.id === market.resolvedOutcomeId,
                );
                if (!winnerOutcome) return null;
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      background: "rgba(34, 197, 94, 0.08)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(34, 197, 94, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 8 12 8s5-4 7.5-4a2.5 2.5 0 0 1 0 5H18" />
                        <path d="M18 9v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9" />
                        <path d="M12 8v13" />
                      </svg>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          color: "#22c55e",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Winning Outcome
                      </div>
                      <div
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 900,
                          color: "#22c55e",
                          marginTop: 2,
                        }}
                      >
                        {winnerOutcome.label}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-subtle)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      color: "var(--text-muted)",
                      fontSize: "0.95rem",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Market Resolved
                  </div>
                  <p
                    style={{
                      color: "var(--text-subtle)",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                      fontWeight: 500,
                      margin: "2px 0 0",
                    }}
                  >
                    No longer accepting bets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
