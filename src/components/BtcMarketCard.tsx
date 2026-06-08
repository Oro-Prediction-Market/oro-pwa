import { useState, useEffect, memo, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Market, getBtcPrice, BtcPrice } from "../../shared/api/client";

function useCountdown(targetAt: string | null): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!targetAt) return;
    const tick = () => {
      const ms = new Date(targetAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Closing");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      const p = (n: number) => String(n).padStart(2, "0");
      setLabel(`${p(h)}:${p(m)}:${p(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetAt]);
  return label;
}

function useLiveBtcPrice(active: boolean) {
  const [live, setLive] = useState<BtcPrice | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    if (!active) return;
    const fetch_ = () =>
      getBtcPrice()
        .then((p) => {
          setLive(p);
          setHistory((h) => [...h.slice(-19), p.price]);
        })
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 5_000);
    return () => clearInterval(id);
  }, [active]);
  return { live, history };
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface BtcMarketCardProps {
  market: Market;
  onBet?: (marketId: string, outcomeId: string, amount?: number) => void;
}

export const BtcMarketCard: FC<BtcMarketCardProps> = memo(
  ({ market, onBet }) => {
    const navigate = useNavigate();
    const meta = market.metadata || {};
    const isSettled =
      market.status === "settled" || market.status === "resolved";
    const isClosed =
      market.status === "closed" || market.status === "resolving";
    const bettingClosed = !!(
      market.bettingClosesAt && new Date() > new Date(market.bettingClosesAt)
    );

    const countdown = useCountdown(
      isClosed || isSettled
        ? null
        : (market.bettingClosesAt ?? market.closesAt),
    );
    const livePrice = useLiveBtcPrice(!isSettled && !isClosed);

    const refPrice: number = meta.referencePrice ?? 0;
    const liveDisplayPrice: number | undefined = isSettled
      ? meta.settlementPrice
      : livePrice.live?.price;

    const priceHistory = livePrice.history;

    const priceDiff =
      liveDisplayPrice != null ? liveDisplayPrice - refPrice : null;
    const direction =
      priceDiff == null
        ? null
        : priceDiff > 0
          ? "up"
          : priceDiff < 0
            ? "down"
            : "flat";

    const pricePct =
      priceDiff != null && refPrice
        ? ((priceDiff / refPrice) * 100).toFixed(2)
        : null;

    const upOutcome = market.outcomes.find((o) => o.label === "UP");
    const downOutcome = market.outcomes.find((o) => o.label === "DOWN");
    const totalPool = Number(market.totalPool);
    const upPct =
      totalPool > 0 && upOutcome
        ? Math.round((Number(upOutcome.totalBetAmount) / totalPool) * 100)
        : 50;
    const downPct = 100 - upPct;
    const barUpPct = totalPool > 0 ? Math.max(5, Math.min(95, upPct)) : 50;

    const winLabel = isSettled
      ? (market.outcomes.find((o) => o.id === market.resolvedOutcomeId)
          ?.label ?? null)
      : null;

    const upColor = "#22c55e";
    const downColor = "#ef4444";
    const liveColor =
      direction === "up"
        ? upColor
        : direction === "down"
          ? downColor
          : "var(--text-primary, #fff)";
    const borderColor =
      direction === "up"
        ? "rgba(34,197,94,0.3)"
        : direction === "down"
          ? "rgba(239,68,68,0.3)"
          : "rgba(255,255,255,0.08)";

    return (
      <div
        onClick={() => navigate(`/market/${market.id}`)}
        style={{
          background: "var(--bg-card, #1a1a2e)",
          border: `1.5px solid ${borderColor}`,
          borderRadius: "var(--radius-lg, 16px)",
          padding: "12px 14px",
          cursor: "pointer",
          userSelect: "none",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "6px 6px 16px rgba(0,0,0,0.3), -3px -3px 10px rgba(255,255,255,0.04)",
          transition: "box-shadow 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "#f7931a",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            BTC · 15 Min
          </span>
          {!isSettled && !isClosed && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                color: bettingClosed
                  ? "#f59e0b"
                  : "var(--text-secondary, #9ca3af)",
                fontSize: "0.6rem",
                minWidth: 48,
                justifyContent: "flex-end",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "0.55rem" }}>⏱</span>
              <span>{bettingClosed ? "Resolving…" : countdown || "--"}</span>
            </div>
          )}
          {(isSettled || isClosed) && (
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 600,
                color: isSettled ? upColor : "#f59e0b",
                background: isSettled
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(245,158,11,0.12)",
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {isSettled ? "SETTLED" : "RESOLVING"}
            </span>
          )}
        </div>

        {/* Price display */}
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.55rem",
              color: "var(--text-secondary, #9ca3af)",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            BTC/USD · {isSettled ? "Open → Close" : "Base → Live"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 4,
              flexWrap: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-primary, #fff)",
                whiteSpace: "nowrap",
              }}
            >
              {refPrice > 0 ? fmtUsd(refPrice) : "—"}
            </span>
            <span
              style={{
                color: "var(--text-secondary, #6b7280)",
                fontSize: "0.7rem",
              }}
            >
              →
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: liveColor,
                whiteSpace: "nowrap",
              }}
            >
              {liveDisplayPrice != null ? fmtUsd(liveDisplayPrice) : "—"}
            </span>
          </div>
          {priceDiff != null && direction !== "flat" && direction != null && (
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: liveColor,
                textAlign: "center",
              }}
            >
              {priceDiff > 0 ? "+" : ""}
              {fmtUsd(priceDiff)} ({priceDiff > 0 ? "+" : ""}
              {pricePct}%)
            </div>
          )}
        </div>

        {/* Sparkline */}
        {priceHistory.length > 2 && (
          <div style={{ marginBottom: 6, flexShrink: 0 }}>
            <svg
              viewBox="0 0 120 28"
              style={{ width: "100%", height: 28, display: "block" }}
            >
              {(() => {
                const min = Math.min(...priceHistory);
                const max = Math.max(...priceHistory);
                const range = max - min || 1;
                const pts = priceHistory.map((p, i) => ({
                  x: (i / (priceHistory.length - 1)) * 120,
                  y: 24 - ((p - min) / range) * 20,
                }));
                let d = `M${pts[0].x},${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[Math.max(i - 1, 0)];
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const p3 = pts[Math.min(i + 2, pts.length - 1)];
                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;
                  d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                }
                const lineColor =
                  direction === "up"
                    ? upColor
                    : direction === "down"
                      ? downColor
                      : "#6b7280";
                const last = pts[pts.length - 1];
                return (
                  <>
                    <path
                      d={d}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={last.x} cy={last.y} r="3" fill={lineColor}>
                      <animate
                        attributeName="r"
                        values="3;4;3"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0.6;1"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        {/* Sentiment bar */}
        <div style={{ marginBottom: 8, flexShrink: 0 }}>
          <div
            style={{
              height: 5,
              borderRadius: 99,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div
              style={{
                width: `${barUpPct}%`,
                background: upColor,
                transition: "width 0.4s ease",
              }}
            />
            <div style={{ flex: 1, background: downColor }} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: "0.6rem", color: upColor }}>
              ▲ UP {upPct}%
              {!isSettled && downPct > 85 && (
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: "0.5rem",
                    fontWeight: 800,
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  ⚡
                </span>
              )}
            </span>
            <span style={{ fontSize: "0.6rem", color: downColor }}>
              {!isSettled && upPct > 85 && (
                <span
                  style={{
                    marginRight: 4,
                    fontSize: "0.5rem",
                    fontWeight: 800,
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  ⚡
                </span>
              )}
              ▼ DN {downPct}%
            </span>
          </div>
        </div>

        {/* Action area */}
        {isSettled ? (
          <div
            style={{
              textAlign: "center",
              padding: "8px",
              borderRadius: 8,
              background:
                winLabel === "UP"
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)",
              color: winLabel === "UP" ? upColor : downColor,
              fontWeight: 700,
              fontSize: "0.7rem",
              flexShrink: 0,
            }}
          >
            {winLabel === "UP" ? "▲ UP won" : "▼ DOWN won"}
          </div>
        ) : bettingClosed ? (
          <div
            style={{
              textAlign: "center",
              fontSize: "0.65rem",
              color: "#f59e0b",
              padding: "6px 0",
            }}
          >
            Predictions closed — results incoming
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (upOutcome && onBet) onBet(market.id, upOutcome.id);
              }}
              style={{
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: "rgba(34,197,94,0.15)",
                color: upColor,
                fontWeight: 700,
                fontSize: "0.7rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              ▲ UP
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (downOutcome && onBet) onBet(market.id, downOutcome.id);
              }}
              style={{
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: "rgba(239,68,68,0.15)",
                color: downColor,
                fontWeight: 700,
                fontSize: "0.7rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              ▼ DOWN
            </button>
          </div>
        )}

        {totalPool > 0 && (
          <div
            style={{
              textAlign: "center",
              marginTop: 6,
              fontSize: "0.58rem",
              color: "var(--text-secondary, #6b7280)",
              flexShrink: 0,
            }}
          >
            Pool: Nu {totalPool.toLocaleString()}
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            marginTop: 6,
            fontSize: "0.58rem",
            color: "var(--text-subtle)",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Resolves via Binance · Coinbase
        </div>
      </div>
    );
  },
);
