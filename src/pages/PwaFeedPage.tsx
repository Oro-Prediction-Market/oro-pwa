import { useState, useEffect, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  getMarkets,
  getMe,
  getMyBets,
  getRecentActivity,
  type Market,
  type ActivityEvent,
  type AuthUser,
  type Bet,
} from "@shared/api/client";
import { ProtectedRoute } from "../components/ProtectedRoute";
// Lazy-load TmaBetModal — it pulls in heavy TMA SDK deps and is only shown on interaction
const TmaBetModal = lazy(() =>
  import("@/components/TmaBetModal").then((m) => ({
    default: m.TmaBetModal,
  })),
);
import { LoadingScreen } from "@shared/components/LoadingScreen";
import { PwaMarketCard } from "../components/PwaMarketCard";
import { TerMarketCard } from "../components/TerMarketCard";
import { BtcMarketCard } from "../components/BtcMarketCard";
import { PwaMarketGrid } from "../components/PwaMarketGrid";
import { Flame, TrendingUp } from "lucide-react";
import { useFilter } from "@shared/contexts/FilterContext";

interface FormattedEvent {
  userName: string;
  initials: string;
  action: string;
  outcome: string;
  amount: string;
  marketTitle: string;
  marketId: string;
  type: "bet" | "win";
}

function makeInitials(raw: string): string {
  const name = raw.startsWith("@") ? raw.substring(1) : raw;
  const parts = name.trim().split(/[\s_]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase() || "??";
}

function parseActivityEvent(e: ActivityEvent): FormattedEvent {
  const amount = `Nu ${Number(e.amount).toLocaleString()}`;
  const rawUserName = e.userName || "";
  const initials = rawUserName ? makeInitials(rawUserName) : "??";
  return {
    userName: initials,
    initials,
    action: e.type === "win" ? "won" : "predicted",
    outcome: e.outomeLabel,
    amount,
    marketTitle: e.marketTitle,
    marketId: e.marketId,
    type: e.type,
  };
}

function LiveTicker() {
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getRecentActivity()
      .then((data) => {
        if (data.length > 0) {
          setEvents(data.map(parseActivityEvent));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (events.length < 2) return;
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % events.length);
        setVisible(true);
      }, 400);
    }, 4500);
    return () => clearInterval(cycle);
  }, [events.length]);

  if (!events.length) return null;
  const current = events[idx];

  return (
    <>
      <style>{`
        @keyframes tickerSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          width: 1,
          height: 16,
          background: "var(--glass-border)",
          flexShrink: 0,
          margin: "0 8px",
        }}
      />
      <div
        role="button"
        onClick={() =>
          current.marketId && navigate(`/market/${current.marketId}`)
        }
        style={{
          flex: 1,
          minWidth: 0,
          animation: visible
            ? "tickerSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "none",
          opacity: visible ? 1 : 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflow: "hidden",
          cursor: current.marketId ? "pointer" : "default",
        }}
      >
        <Flame
          size={14}
          style={{
            flexShrink: 0,
            color: "var(--color-warning)",
            fill: "#f59e0b40",
          }}
        />
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 800,
            color: "var(--text-main)",
            whiteSpace: "nowrap",
            flexShrink: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {current.userName}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {current.action}
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 900,
            color:
              current.type === "win"
                ? "var(--color-success)"
                : "var(--color-primary)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {current.amount}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-subtle)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 600,
          }}
        >
          · {current.outcome}
        </span>
      </div>
    </>
  );
}

interface ActiveBet {
  marketId: string;
  outcomeId: string;
}

export function PwaFeedPage({
  authed = false,
  onAuthRequired,
}: {
  authed?: boolean;
  onAuthRequired?: () => void;
}) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingBet, setPendingBet] = useState<ActiveBet | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [myBets, setMyBets] = useState<Bet[]>([]);

  const handleBetClick = (marketId: string, outcomeId: string) => {
    if (!authed) {
      setPendingBet({ marketId, outcomeId });
      setShowAuthModal(true);
    } else {
      setActiveBet({ marketId, outcomeId });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingBet) {
      setActiveBet(pendingBet);
      setPendingBet(null);
    }
    onAuthRequired?.();
  };

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => {});
    if (authed) {
      getMyBets()
        .then(setMyBets)
        .catch(() => {});
    }
  }, [authed]);
  const {
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    setAvailableCategories,
    setHasTrendingMarkets,
  } = useFilter();

  useEffect(() => {
    const loadMarkets = () => {
      getMarkets()
        .then((d) => {
          const now = Date.now();
          const cutoff48h = 48 * 60 * 60 * 1000;

          // Only show live/upcoming + resolving within last 48h
          const active = d.filter((m) => {
            if (m.status === "open" || m.status === "upcoming") return true;
            if (m.status === "resolving") {
              // Use closesAt to determine age; hide if closed more than 48h ago
              const closedAt = m.closesAt
                ? new Date(m.closesAt).getTime()
                : null;
              return closedAt ? now - closedAt < cutoff48h : true;
            }
            return false;
          });

          setMarkets(active);
          setHasTrendingMarkets(
            active.filter((m) => m.status === "open").length > 0,
          );

          // Update global categories
          const cats = [
            "All",
            ...(Array.from(
              new Set(active.map((m) => m.category || "other")),
            ) as string[]),
          ];
          setAvailableCategories(cats);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    loadMarkets();

    // Re-fetch when a market changes (SSE push) or every 10s for fast TER transitions
    const onMarketChanged = () => loadMarkets();
    window.addEventListener("oro:market-changed", onMarketChanged);
    const poll = setInterval(loadMarkets, 10_000);

    return () => {
      window.removeEventListener("oro:market-changed", onMarketChanged);
      clearInterval(poll);
    };
  }, []);

  const handleBetSuccess = () => {
    setActiveBet(null);
    getMarkets()
      .then((d) => {
        const now = Date.now();
        const cutoff48h = 48 * 60 * 60 * 1000;
        setMarkets(
          d.filter((m) => {
            if (m.status === "open" || m.status === "upcoming") return true;
            if (m.status === "resolving") {
              const closedAt = m.closesAt
                ? new Date(m.closesAt).getTime()
                : null;
              return closedAt ? now - closedAt < cutoff48h : true;
            }
            return false;
          }),
        );
      })
      .catch(console.error);
  };

  if (loading) return <LoadingScreen message="Reading the Oracles…" />;

  if (!markets.length)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 32px",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div className="mesh-bg" />
        <div
          style={{
            position: "relative",
            width: 100,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(124, 58, 237, 0.1)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          />
          <TrendingUp
            size={28}
            strokeWidth={1.5}
            color="var(--color-primary, #7c3aed)"
            style={{ zIndex: 1 }}
          />
        </div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            color: "var(--text-main)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          No Open Markets
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "var(--text-muted)",
            maxWidth: 350,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          No markets are open right now. Check back soon for new predictions.
        </div>
      </div>
    );

  const filteredMarkets = markets.filter((m) => {
    if (
      selectedCategory === "All" &&
      ["ter", "btc"].includes(m.externalSource ?? "")
    )
      return false;
    const matchesSearch = m.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      (m.category || "other").toLowerCase() === selectedCategory.toLowerCase();
    const matchesSubcategory =
      selectedSubcategory === "All" ||
      (m.subcategory &&
        m.subcategory.toLowerCase() === selectedSubcategory.toLowerCase());
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Subcategory pills: dynamically derived from markets in the selected category
  const availableSubcategories =
    selectedCategory === "All"
      ? []
      : [
          "All",
          ...Array.from(
            new Set(
              markets
                .filter(
                  (m) =>
                    (m.category || "other").toLowerCase() ===
                      selectedCategory.toLowerCase() && m.subcategory,
                )
                .map((m) => m.subcategory!),
            ),
          ).sort(),
        ];

  const openMarkets = filteredMarkets
    .filter((m) => m.status === "open")
    .sort((a, b) => {
      // TER then BTC markets appear first in the economy category
      const autoA = ["ter", "btc"].includes(a.externalSource ?? "");
      const autoB = ["ter", "btc"].includes(b.externalSource ?? "");
      if (autoA && !autoB) return -1;
      if (autoB && !autoA) return 1;
      if (autoA && autoB) {
        if (a.externalSource === "ter") return -1;
        if (b.externalSource === "ter") return 1;
      }
      return 0;
    });
  const resolvingMarkets = filteredMarkets.filter(
    (m) => m.status === "resolving",
  );
  const upcomingMarkets = filteredMarkets.filter(
    (m) => m.status === "upcoming",
  );
  const activeMarket = activeBet
    ? markets.find((m) => m.id === activeBet.marketId)
    : null;

  const renderGrid = (items: Market[]) => (
    <PwaMarketGrid>
      {items.map((market) => {
        if (market.externalSource === "ter") {
          return (
            <TerMarketCard
              key={market.id}
              market={market}
              onBet={async (marketId, outcomeId) => {
                handleBetClick(marketId, outcomeId);
              }}
            />
          );
        }
        if (market.externalSource === "btc") {
          return (
            <BtcMarketCard
              key={market.id}
              market={market}
              onBet={async (marketId, outcomeId) => {
                handleBetClick(marketId, outcomeId);
              }}
            />
          );
        }
        // Use normal PwaMarketCard for all other markets
        return (
          <PwaMarketCard
            key={market.id}
            market={market}
            userPickedOutcomeId={
              myBets.find((b) => b.marketId === market.id)?.outcomeId
            }
            onBet={(outcomeId) => handleBetClick(market.id, outcomeId)}
          />
        );
      })}
    </PwaMarketGrid>
  );

  return (
    <div
      style={{
        padding: "var(--space-xl) var(--space-md) 100px",
        maxWidth: 1240,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <Helmet>
        <title>Live Markets | Oro Prediction Market</title>
        <meta name="description" content="Browse live prediction markets on Oro. Predict sports, crypto, politics and more. Win real money with yes/no predictions on Telegram." />
        <link rel="canonical" href="https://oro.fun/" />
        <meta property="og:url" content="https://oro.fun/" />
        <meta property="og:title" content="Live Markets | Oro Prediction Market" />
        <meta property="og:description" content="Browse live prediction markets on Oro. Predict sports, crypto, politics and more." />
      </Helmet>
      <style>{`
        @keyframes livePing {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes liveTextGlow {
          0%, 100% { opacity: 1; text-shadow: 0 0 6px rgba(34,197,94,0.6); }
          50%       { opacity: 0.7; text-shadow: 0 0 14px rgba(34,197,94,1); }
        }
        @media (max-width: 767px) { .section-title { display: none; } }
      `}</style>
      <div className="mesh-bg" />

      {/* ── Personalized greeting ── */}
      {me && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-subtle)",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {(() => {
              const h = new Date().getHours();
              if (h < 12) return "Good morning";
              if (h < 17) return "Good afternoon";
              return "Good evening";
            })()}
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "var(--text-main)",
              letterSpacing: "-0.03em",
              fontFamily: "var(--font-display)",
            }}
          >
            {me.firstName ?? (me.username ? `@${me.username}` : "Oracle")} 👋
          </div>
        </div>
      )}

      {/* ── Subcategory pills (shown when a category has subcategories) ── */}
      {availableSubcategories.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            marginBottom: 20,
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          <style>{`.hide-scrollbar-sub::-webkit-scrollbar{display:none}`}</style>
          {availableSubcategories.map((sub) => {
            const isActive = selectedSubcategory === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                style={{
                  flexShrink: 0,
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  border: `1px solid ${isActive ? "var(--color-primary)" : "var(--glass-border)"}`,
                  background: isActive
                    ? "rgba(59,130,246,0.12)"
                    : "var(--bg-card)",
                  color: isActive
                    ? "var(--color-primary)"
                    : "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {openMarkets.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: "var(--space-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(34, 197, 94, 0.1)",
                color: "var(--color-success)",
                fontSize: "0.65rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.1)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                }}
              >
                {/* Ping ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "var(--color-success)",
                    animation: "livePing 1.5s ease-out infinite",
                  }}
                />
                {/* Solid dot */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "var(--color-success)",
                  }}
                />
              </div>
              <span
                style={{ animation: "liveTextGlow 1.8s ease-in-out infinite" }}
              >
                Live
              </span>
            </div>
            {/* <h2
              className="section-title"
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.03em",
              }}
            >
              Active Markets
            </h2> */}
            <LiveTicker />
          </div>
          {renderGrid(openMarkets)}
        </section>
      )}

      {resolvingMarkets.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: "var(--space-md)",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.1)",
                color: "var(--color-warning)",
                fontSize: "0.65rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Resolving
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.03em",
              }}
            >
              Oracle Verification
            </h2>
          </div>
          {renderGrid(resolvingMarkets)}
        </section>
      )}

      {upcomingMarkets.length > 0 && (
        <section style={{ marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: "var(--space-md)",
            }}
          >
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--color-info)",
                fontSize: "0.65rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              SOON
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.03em",
              }}
            >
              Coming Up
            </h2>
          </div>
          {renderGrid(upcomingMarkets)}
        </section>
      )}

      {activeMarket && activeBet && (
        <Suspense fallback={null}>
          <TmaBetModal
            isOpen={true}
            onClose={() => setActiveBet(null)}
            market={activeMarket}
            outcomeId={activeBet.outcomeId}
            onSuccess={handleBetSuccess}
            onFailure={(e) => console.error(e)}
          />
        </Suspense>
      )}

      {/* Auth modal — shown when unauthenticated user tries to bet */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-main)",
              borderRadius: 20,
              padding: "24px 4px",
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "fadeScaleIn 0.2s ease-out",
            }}
          >
            <style>{`@keyframes fadeScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
            <ProtectedRoute onLogin={handleAuthSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
