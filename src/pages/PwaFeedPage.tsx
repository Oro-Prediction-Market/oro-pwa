import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useTransition,
  type ReactElement,
} from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  getMarkets,
  getMe,
  getMyBets,
  getRecentActivity,
  feedHeartbeat,
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
import { GroupedMarketCard } from "../components/GroupedMarketCard";
import { TerMarketCard } from "../components/TerMarketCard";
import { BtcMarketCard } from "../components/BtcMarketCard";
import { PwaMarketGrid } from "../components/PwaMarketGrid";
import { Flame, TrendingUp } from "lucide-react";
import { useFilter } from "@shared/contexts/FilterContext";
import { isWCMarket, getWCFlag, calcProb } from "./WorldCupHubPage";
import {
  isBplMarket,
  getBplCrest,
  isDrawOutcome,
  shortClubName,
  BPL_CLUBS,
  Crest,
} from "./BplHubPage";

interface BplBannerItem {
  crest: string | null;
  label: string;
  prob: number;
  hasData: boolean;
}

// Grid-sized BoB Bhutan Premier League banner — sits beside the TER/BTC cards
// and spans two card slots on tablet/desktop (.bpl-banner-card media query)
function BplBannerCard({
  items,
  onOpen,
}: {
  items: BplBannerItem[];
  onOpen: () => void;
}) {
  return (
    <div
      className="bpl-banner-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        backgroundImage: "url('/bpl-banner.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        outline: "none",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        minHeight: 320,
      }}
    >
        {/* Legibility overlay — dark on the left under the title, clear over the trophy */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(5,12,28,0.78) 0%, rgba(5,12,28,0.4) 55%, rgba(5,12,28,0.08) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            textAlign: "left",
            padding: "20px 16px 12px",
            position: "relative",
            zIndex: 1,
            textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 900, color: "#7dd3fc", lineHeight: 1, letterSpacing: "-0.02em" }}>BoB</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em" }}>Bhutan Premier League</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#f87171", lineHeight: 1.1, letterSpacing: "-0.02em" }}>Prediction</div>
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            padding: "6px 12px 6px 4px",
            position: "relative",
            zIndex: 1,
            gap: 8,
          }}
        >
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 20,
                background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                animation: `wcMarquee ${Math.max(12, items.length * 2)}s linear infinite`,
                width: "max-content",
              }}
            >
              {[...items, ...items].map((item, i) => (
                <div
                  key={i}
                  title={item.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "2px 10px",
                    gap: 1,
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Crest src={item.crest} label={item.label} size={26} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: item.hasData ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
                    {item.hasData ? `${Math.round(item.prob * 100)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", flexShrink: 0 }}>
            Click Here »
          </span>
        </div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingBet, setPendingBet] = useState<ActiveBet | null>(null);
  const [, startTransition] = useTransition();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let sid = sessionStorage.getItem("oro_feed_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("oro_feed_sid", sid);
    }
    const ping = () => feedHeartbeat(sid!).then(({ count }) => setOnlineCount(count)).catch(() => {});
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleBetClick = (marketId: string, outcomeId: string) => {
    if (!authed) {
      setPendingBet({ marketId, outcomeId });
      setShowAuthModal(true);
    } else {
      startTransition(() => setActiveBet({ marketId, outcomeId }));
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingBet) {
      startTransition(() => { setActiveBet(pendingBet); setPendingBet(null); });
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

          // Only show live/upcoming + closed/resolving within last 48h
          const active = d.filter((m) => {
            if (m.status === "open" || m.status === "upcoming") return true;
            if (m.status === "closed" || m.status === "resolving") {
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
            if (m.status === "closed" || m.status === "resolving") {
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
    if (isWCMarket(m)) return false;
    // BPL markets live in the /bpl hub — the grid banner card is their entry point
    if (isBplMarket(m)) return false;
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

  // Subcategory pills: dynamically derived from markets in the selected category.
  // Exclude wc-* subcategories — those are internal WC tags, not user-facing filters.
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
                      selectedCategory.toLowerCase() &&
                    m.subcategory &&
                    !m.subcategory.startsWith("wc-"),
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
        if (a.externalSource !== b.externalSource) {
          if (a.externalSource === "ter") return -1;
          if (b.externalSource === "ter") return 1;
        }
        // Two overlapping rounds of the same source: bettable round first,
        // then the locked round that's waiting to settle
        const now = Date.now();
        const openA = a.bettingClosesAt
          ? new Date(a.bettingClosesAt).getTime() > now
          : true;
        const openB = b.bettingClosesAt
          ? new Date(b.bettingClosesAt).getTime() > now
          : true;
        if (openA && !openB) return -1;
        if (openB && !openA) return 1;
      }
      return 0;
    });
  const resolvingMarkets = filteredMarkets.filter(
    (m) => m.status === "resolving" || m.status === "closed",
  );
  const upcomingMarkets = filteredMarkets.filter(
    (m) => m.status === "upcoming",
  );
  const activeMarket = activeBet
    ? markets.find((m) => m.id === activeBet.marketId)
    : null;

  const wcEntryMarkets = markets.filter(isWCMarket);

  const WC_DEFAULT_NATIONS = [
    { flag: "/worldcup/Brazil.svg", country: "Brazil" },
    { flag: "/worldcup/Argentina.svg", country: "Argentina" },
    { flag: "/worldcup/France.svg", country: "France" },
    { flag: "/worldcup/England.svg", country: "England" },
    { flag: "/worldcup/Germany.svg", country: "Germany" },
    { flag: "/worldcup/Spain.svg", country: "Spain" },
    { flag: "/worldcup/Portugal.svg", country: "Portugal" },
    { flag: "/worldcup/Netherlands.svg", country: "Netherlands" },
    { flag: "/worldcup/USA.svg", country: "USA" },
    { flag: "/worldcup/Mexico.svg", country: "Mexico" },
    { flag: "/worldcup/Canada.svg", country: "Canada" },
    { flag: "/worldcup/Japan.svg", country: "Japan" },
    { flag: "/worldcup/SouthKorea.svg", country: "Korea" },
    { flag: "/worldcup/Morocco.svg", country: "Morocco" },
    { flag: "/worldcup/Uruguay.svg", country: "Uruguay" },
    { flag: "/worldcup/Croatia.svg", country: "Croatia" },
  ];

  const wcMarketItems = wcEntryMarkets
    .filter((m) => m.subcategory === "wc-winner")
    .flatMap((m) =>
      (m.outcomes ?? [])
        .map((outcome) => ({
          flag: getWCFlag(outcome.label),
          country: outcome.label,
          prob: calcProb(m, outcome.id),
          hasData: Number(m.totalPool) > 0,
        }))
        .filter((item) => item.flag)
    );

  const wcWinnerItems =
    wcMarketItems.length > 0
      ? wcMarketItems
      : WC_DEFAULT_NATIONS.map((n) => ({ ...n, prob: 0, hasData: false }));

  // BoB Bhutan Premier League banner strip — live match outcomes, club fallback
  const bplMarketItems = markets
    .filter(
      (m) => m.status === "open" && isBplMarket(m) && /\bvs\b/i.test(m.title),
    )
    .flatMap((m) => {
      const teamOutcomes = (m.outcomes ?? []).filter(
        (o) => !isDrawOutcome(o.label ?? ""),
      );
      return teamOutcomes.map((outcome, idx) => ({
        crest: getBplCrest(m, idx),
        label: shortClubName(outcome.label),
        prob: calcProb(m, outcome.id),
        hasData: Number(m.totalPool) > 0,
      }));
    });

  const bplItems =
    bplMarketItems.length > 0
      ? bplMarketItems
      : BPL_CLUBS.map((c) => ({
          crest: null as string | null,
          label: c.short,
          prob: 0,
          hasData: false,
        }));

  const renderGrid = (items: Market[], withBplBanner = false) => {
    // Grouped multi-binary events (shared groupId): the first sibling in the
    // list renders one GroupedMarketCard for the whole group; the rest skip.
    const seenGroups = new Set<string>();
    const cards = items
      .map((market) => {
        if (market.groupId) {
          if (seenGroups.has(market.groupId)) return null;
          seenGroups.add(market.groupId);
          const siblings = items.filter((m) => m.groupId === market.groupId);
          return (
            <GroupedMarketCard
              key={`group-${market.groupId}`}
              markets={siblings}
              onBet={handleBetClick}
            />
          );
        }
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
      })
      .filter((c): c is ReactElement => c !== null);
    if (withBplBanner) {
      // Slot the BPL banner right after the TER/BTC auto-market cards
      const autoCount = items.filter((m) =>
        ["ter", "btc"].includes(m.externalSource ?? ""),
      ).length;
      cards.splice(
        autoCount,
        0,
        <BplBannerCard
          key="bpl-banner"
          items={bplItems}
          onOpen={() => navigate("/bpl")}
        />,
      );
    }
    return <PwaMarketGrid>{cards}</PwaMarketGrid>;
  };

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
        @keyframes wcShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes wcPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
        @keyframes wcMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wcSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 767px) { .section-title { display: none; } }
        /* Mobile: 1 grid column — banner takes the full row */
        .bpl-banner-card { grid-column: auto; }
        /* Tablet/desktop (grid is 2 or 4 cols) — banner covers two card slots */
        @media (min-width: 640px) { .bpl-banner-card { grid-column: span 2; } }
      `}</style>
      <div className="mesh-bg" />

      {/* ── Online viewers badge — always visible when count is known ── */}
      {onlineCount !== null && onlineCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "3px 10px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#22c55e" }}>{onlineCount} online</span>
          </div>
        </div>
      )}

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

          {/* ── World Cup Banner Card ── */}
          {!searchQuery.trim() && (
            <div style={{
              marginBottom: 16,
              borderRadius: 18,
              padding: 2,
              background: "radial-gradient(circle at top left, #22c55e 0%, transparent 55%), radial-gradient(circle at bottom left, #7f1d1d 0%, transparent 55%), radial-gradient(circle at top right, #ef4444 0%, transparent 55%), radial-gradient(circle at bottom right, #7c3aed 0%, transparent 55%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/world-cup")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/world-cup")}
              style={{
                marginBottom: 0,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                backgroundImage: "url('/background.svg')",
                backgroundSize: "cover",
                backgroundPosition: "right bottom",
                outline: "none",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <img src="/football.svg" alt="" aria-hidden="true" decoding="async" style={{ position: "absolute", top: "50%", left: -60, marginTop: -75, width: 120, height: 120, opacity: 0.7, animation: "wcSpin 6s linear infinite", pointerEvents: "none", zIndex: 0 }} />
              <div style={{ display: "flex", alignItems: "stretch", minHeight: 148, position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1, padding: "22px 0 14px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>FIFA</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>World Cup</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#84cc16", lineHeight: 1.1, letterSpacing: "-0.02em" }}>Prediction</div>
                </div>
                <div style={{ width: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <img src="/worldcup.svg" alt="FIFA World Cup 2026" decoding="async" width={160} height={148} style={{ width: 160, height: 148, objectFit: "contain", display: "block" }} />
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", padding: "6px 12px 6px 4px", position: "relative", zIndex: 1, gap: 8 }}>
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 20, background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)", zIndex: 1, pointerEvents: "none" }} />
                  <div style={{ display: "flex", animation: `wcMarquee ${Math.max(12, wcWinnerItems.length * 2)}s linear infinite`, width: "max-content" }}>
                    {[...wcWinnerItems, ...wcWinnerItems].map((item, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 10px", gap: 1, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                        {item.flag
                          ? <img src={item.flag} alt="" loading="lazy" decoding="async" width={26} height={26} style={{ width: 26, height: 26, borderRadius: 3, objectFit: "cover" }} />
                          : null
                        }
                        <span style={{ fontSize: 10, fontWeight: 800, color: item.hasData ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
                          {item.hasData ? `${Math.round(item.prob * 100)}%` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", flexShrink: 0 }}>Click Here »</span>
              </div>
            </div>
            </div>
          )}

          {renderGrid(openMarkets, !searchQuery.trim())}
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
