import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketComments from "@shared/components/MarketComments";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import { ProbabilityChart } from "@shared/components/ProbabilityChart";
import { CrowdSentiment } from "@shared/components/CrowdSentiment";
import { getViewerCurrency } from "@shared/currency/pools";
import {
  getMarket,
  getDisputes,
  getMyDispute,
  submitDispute,
  getDisputeInfo,
  bustCache,
  getTerPrice,
  Market,
  Dispute,
  MyDispute,
  DisputeInfo,
  DisputeSide,
  SubmitDisputePayload,
  TerPrice,
  getMarketHistory,
  OutcomeHistory,
} from "@shared/api/client";
import { DisputeResultBanner } from "../../shared/components/DisputeResultBanner";
import { PwaBetForm } from "../components/PwaBetForm";
import { TmaBetModal } from "../components/TmaBetModal";
import { DisputeContestFields } from "../components/DisputeContestFields";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getCategoryVisual } from "@shared/helpers/visuals";
import { MarketShareSheet } from "@/components/MarketShareSheet";
import { useMarketSocket } from "../hooks/useMarketSocket";
import { useAuth } from "@shared/hooks/useAuth";
import {
  UnderdogBanner,
  getUnderdogLabel,
} from "../../shared/components/UnderdogBanner";
import { getWCFlag, isWCMarket, calcProb } from "./WorldCupHubPage";
import { isEsportsMarket } from "./EsportsHubPage";
import { EsportsMarketDetail } from "../components/EsportsMarketDetail";
import { isUfcMarket } from "./UfcHubPage";
import { UfcMarketDetail } from "../components/UfcMarketDetail";
import { isEplMarket } from "./EplHubPage";
import { EplMarketDetail } from "../components/EplMarketDetail";
import { isUclMarket } from "./UclHubPage";
import { UclMarketDetail } from "../components/UclMarketDetail";
import { PriceMarketDetail } from "../components/PriceMarketDetail";
import { STICKY_TOP, STICKY_MAX_HEIGHT } from "../components/MarketDetailColumns";
import { useGoBack } from "../hooks/useGoBack";

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
  // Bet-first-then-measure: reference price locks only when betting closes
  const refLocked = refPrice > 0;
  const diff =
    displayPrice != null && refLocked ? displayPrice - refPrice : null;
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
            Price to beat
          </div>
          <div
            style={{
              fontSize: refLocked ? "1.3rem" : "0.8rem",
              fontWeight: 800,
              color: refLocked ? "var(--text-main)" : "var(--text-subtle)",
            }}
          >
            {refLocked ? `Nu ${refPrice.toFixed(4)}` : "🔒 Locks at prediction close"}
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
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { user } = useAuth();
  const referralId = String(user?.telegramId ?? user?.id ?? "");
  const [shareOpen, setShareOpen] = useState(false);
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_disputes, setDisputes] = useState<Dispute[]>([]);
  const [myDispute, setMyDispute] = useState<MyDispute | null>(null);
  // Bumped whenever a bet lands, to re-read the position card.
  const [history, setHistory] = useState<OutcomeHistory[] | null>(null);
  // Outcome the phone sheet is open on, if any.
  const [activeBet, setActiveBet] = useState<string | null>(null);

  // Open the detail view at the top, not at the feed's scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const [disputeInfo, setDisputeInfo] = useState<DisputeInfo | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeBond, setDisputeBond] = useState(10);
  const [disputeSide, setDisputeSide] = useState<DisputeSide>("object");
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
    // Fetched here as well as in the poll below. The curve used to be requested
    // only from the 15s interval, so it could not appear before the first tick
    // — fifteen seconds of empty card in front of a six-millisecond endpoint.
    // Fired alongside getMarket rather than after it: they do not depend on
    // each other, and awaiting in sequence would just add a round trip.
    getMarketHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [id]);

  // Refetch when page becomes visible + poll every 15s as WS fallback
  useEffect(() => {
    if (!id) return;
    const refetch = () => {
      bustCache(`/markets/${id}`);
      // The history key is `/insights/markets/…`, which does not share the
      // prefix above, so without this the curve served whatever it had cached
      // and never moved after a bet.
      bustCache(`/insights/markets/${id}`);
      // The curve rides the market poll rather than appending points from the
      // socket: the server already ends the series at the live value, and a
      // client-appended point would compute its probability a different way
      // and land a second "now" at a slightly different timestamp.
      getMarketHistory(id)
        .then(setHistory)
        .catch(() => setHistory([]));
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
    getDisputeInfo(id)
      .then((info) => {
        setDisputeInfo(info);
        if (!info.bondFixed)
          setDisputeBond((b) => (b < info.minBond ? info.minBond : b));
      })
      .catch(() => {});
  }, [id, market?.status]);

  // Load the caller's OWN dispute result once the market is settled, so we can
  // show them what they won or lost. No-ops silently when signed out or when no
  // objection was ever filed (endpoint returns null / 401).
  useEffect(() => {
    if (!id || !market) return;
    const settled = market.status === "settled" || market.status === "resolved";
    if (!settled) {
      setMyDispute(null);
      return;
    }
    getMyDispute(id)
      .then(setMyDispute)
      .catch(() => setMyDispute(null));
  }, [id, market?.status]);

  const handleSubmitDispute = async () => {
    if (!id) return;
    if (!disputeReason.trim()) {
      setDisputeError(
        disputeSide === "support"
          ? "Please explain why the proposed outcome is correct."
          : "Please explain why the proposed outcome is incorrect.",
      );
      return;
    }
    const bondFixed = !!disputeInfo?.bondFixed;
    if (!bondFixed && disputeBond < (disputeInfo?.minBond ?? 10)) {
      setDisputeError(`The minimum bond is Nu ${disputeInfo?.minBond ?? 10}.`);
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      const payload: SubmitDisputePayload = {
        reason: disputeReason,
        side: disputeSide,
      };
      if (!bondFixed && disputeSide === "object")
        payload.bondAmount = disputeBond;
      await submitDispute(id, payload);
      setDisputeSuccess(true);
      getDisputes(id)
        .then(setDisputes)
        .catch(() => {});
      getDisputeInfo(id)
        .then(setDisputeInfo)
        .catch(() => {});
    } catch (e: any) {
      setDisputeError(e.message || "Failed to submit dispute");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // Bundle the resolution-contest controls for each themed detail form.
  const disputeContest = {
    info: disputeInfo,
    bond: disputeBond,
    setBond: setDisputeBond,
    side: disputeSide,
    setSide: setDisputeSide,
  };

  /**
   * The probability curve, mapped into the chart's primitive shape.
   *
   * The server replays this from the market's own bets and already returns the
   * displayed share on a shared timeline, so there is nothing left to derive
   * here — only colours, which are taken from the outcome's position in the
   * market so a line always matches the row beneath it.
   *
   * Null — and the card renders exactly as it did before — when the market has
   * no bets, or when the viewer is on a book the curve is not about: the replay
   * sums the ngultrum positions only, so a USDT viewer would get a chart in a
   * different currency from the rows under it.
   *
   * Declared above the loading/error early returns below: every hook on this
   * page must run on every render, including the ones that bail out.
   */
  const chartSeries = useMemo(() => {
    if (!history || !history.length || !liveMarket) return null;
    if (getViewerCurrency() !== "BTN") return null;

    const resolved =
      liveMarket.status === "resolved" || liveMarket.status === "settled";
    const palette = resolved
      ? ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"]
      : ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f97316"];

    const series = history
      .filter((h) => h.points.length > 0)
      .map((h) => {
        const idx = liveMarket.outcomes.findIndex((o) => o.id === h.outcomeId);
        return {
          label: h.label,
          color: palette[(idx >= 0 ? idx : 0) % palette.length],
          points: h.points.map((pt) => ({ t: pt.t, p: pt.p })),
        };
      });

    // A curve needs somewhere to have moved. One bet is a single step, which
    // reads as a dead market rather than as a market with one bet in it.
    const distinct = new Set(series.flatMap((s) => s.points.map((p) => p.t)));
    if (distinct.size < 3) return null;

    // Five lines is what the eye can follow; the rows below stay complete.
    return series
      .sort(
        (a, b) =>
          b.points[b.points.length - 1].p - a.points[a.points.length - 1].p,
      )
      .slice(0, palette.length);
  }, [history, liveMarket]);

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

  // Mounted here rather than inside each themed detail component: every branch
  // below renders one of six near-duplicate components (and the TMA repeats the
  // same six), so putting the thread in the page gives every market type
  // comments from one place instead of ten.
  //
  // `user` comes from this page's own useAuth() — there is no auth context, so
  // a useAuth() call inside MarketComments would fire another getMe().
  /**
   * The thread's accent, matching whichever themed view is about to render it.
   * Derived here rather than passed per branch because `embeddedComments` is
   * built once and handed to all of them — the branch order below is the same
   * order these predicates are tested in.
   */
  const threadAccent = (() => {
    if (displayMarket.externalSource === "btc") return "#f7931a";
    if (displayMarket.externalSource === "ter") return "#F4AF39";
    if (isUfcMarket(displayMarket)) return "#d20a0a";
    if (isEsportsMarket(displayMarket)) return "#be9e59";
    if (isUclMarket(displayMarket)) return "#2b6bff";
    if (isEplMarket(displayMarket)) return "#00ff85";
    // The generic view keeps the app's own primary.
    return undefined;
  })();

  const commentsProps = {
    marketId: displayMarket.id,
    marketStatus: displayMarket.status,
    currentUserId: user?.id ?? null,
    accent: threadAccent,
    onOpenProfile: (userId: string) => navigate(`/profile/${userId}`),
  };


  // The generic view is two columns with a sticky prediction panel, so the
  // thread goes INSIDE the scrolling left column instead. Mounted below the
  // row, it would end the sticky element's containing block — the panel would
  // unpin the moment you scrolled into the comments, which is the whole reason
  // to keep it on screen.
  const embeddedComments = <MarketComments {...commentsProps} embedded />;

  // TER / BTC price markets get the dedicated trading-styled detail view with
  // the live chart, price-to-beat and Higher/Lower.
  if (
    displayMarket.externalSource === "ter" ||
    displayMarket.externalSource === "btc"
  ) {
    return (
    <>
      <PriceMarketDetail
        market={displayMarket}
        referralId={referralId}
        onBetPlaced={refreshMarket}
        isResolving={isResolving}
        proposedOutcome={proposedOutcome}
        disputeTimeLeft={disputeTimeLeft}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleSubmitDispute={handleSubmitDispute}
        disputeSubmitting={disputeSubmitting}
        disputeError={disputeError}
        disputeSuccess={disputeSuccess}
        disputeContest={disputeContest}
        myDispute={myDispute}
        commentsSlot={embeddedComments}
      />
    </>
    );
  }

  // UFC markets get the dedicated /ufc-styled detail view
  if (isUfcMarket(displayMarket)) {
    return (
    <>
      <UfcMarketDetail
        market={displayMarket}
        referralId={referralId}
        onBetPlaced={refreshMarket}
        isResolving={isResolving}
        proposedOutcome={proposedOutcome}
        disputeTimeLeft={disputeTimeLeft}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleSubmitDispute={handleSubmitDispute}
        disputeSubmitting={disputeSubmitting}
        disputeError={disputeError}
        disputeSuccess={disputeSuccess}
        disputeContest={disputeContest}
        myDispute={myDispute}
        commentsSlot={embeddedComments}
      />
    </>
    );
  }

  // Esports markets get the dedicated /esports-styled detail view
  if (isEsportsMarket(displayMarket)) {
    return (
    <>
      <EsportsMarketDetail
        market={displayMarket}
        referralId={referralId}
        onBetPlaced={refreshMarket}
        isResolving={isResolving}
        proposedOutcome={proposedOutcome}
        disputeTimeLeft={disputeTimeLeft}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleSubmitDispute={handleSubmitDispute}
        disputeSubmitting={disputeSubmitting}
        disputeError={disputeError}
        disputeSuccess={disputeSuccess}
        disputeContest={disputeContest}
        myDispute={myDispute}
        commentsSlot={embeddedComments}
      />
    </>
    );
  }

  // Champions League markets get the dedicated /ucl-styled detail view
  if (isUclMarket(displayMarket)) {
    return (
    <>
      <UclMarketDetail
        chartSlot={chartSeries ? <ProbabilityChart series={chartSeries} /> : null}
        market={displayMarket}
        referralId={referralId}
        onBetPlaced={refreshMarket}
        isResolving={isResolving}
        proposedOutcome={proposedOutcome}
        disputeTimeLeft={disputeTimeLeft}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleSubmitDispute={handleSubmitDispute}
        disputeSubmitting={disputeSubmitting}
        disputeError={disputeError}
        disputeSuccess={disputeSuccess}
        disputeContest={disputeContest}
        myDispute={myDispute}
        commentsSlot={embeddedComments}
      />
    </>
    );
  }

  // EPL markets get the dedicated /epl-styled detail view
  if (isEplMarket(displayMarket)) {
    return (
    <>
      <EplMarketDetail
        chartSlot={chartSeries ? <ProbabilityChart series={chartSeries} /> : null}
        market={displayMarket}
        referralId={referralId}
        onBetPlaced={refreshMarket}
        isResolving={isResolving}
        proposedOutcome={proposedOutcome}
        disputeTimeLeft={disputeTimeLeft}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleSubmitDispute={handleSubmitDispute}
        disputeSubmitting={disputeSubmitting}
        disputeError={disputeError}
        disputeSuccess={disputeSuccess}
        disputeContest={disputeContest}
        myDispute={myDispute}
        commentsSlot={embeddedComments}
      />
    </>
    );
  }

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
        {/* Was a <Link to="/">: labelled Back but always went to the feed
            root, so it discarded wherever you actually came from. useGoBack
            goes back for real, and still lands on "/" for a visitor who
            opened this market from a shared link with no history behind it. */}
        <button
          onClick={goBack}
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
            cursor: "pointer",
            fontFamily: "inherit",
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
        </button>

        <button
          onClick={() => setShareOpen(true)}
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
        <MarketShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          market={displayMarket}
          accentColor={getCategoryVisual(displayMarket.category).accentColor}
          referralId={referralId}
        />
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
          {/* What you already hold here. This used to render only in the
              right column's market-closed branch, so an open market — the one
              you can still act on — showed no sign that you were in it. */}          <div>
            <h1
              style={{
                fontSize: bp === "mobile" ? "1.05rem" : "1.2rem",
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
                  fontSize: bp === "mobile" ? "0.85rem" : "0.9rem",
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
                  padding: bp === "mobile" ? "10px 9px" : "12px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.6rem" : "0.62rem",
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
                    fontSize: bp === "mobile" ? "0.8rem" : "0.9rem",
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
                  padding: bp === "mobile" ? "10px 9px" : "12px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.6rem" : "0.62rem",
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
                    fontSize: bp === "mobile" ? "0.8rem" : "0.9rem",
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
                  padding: bp === "mobile" ? "10px 9px" : "12px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    color: "var(--text-subtle)",
                    fontSize: bp === "mobile" ? "0.6rem" : "0.62rem",
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
                    fontSize: bp === "mobile" ? "0.8rem" : "0.9rem",
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

            {chartSeries && <ProbabilityChart series={chartSeries} />}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
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
                // calcProb uses LMSR only when every outcome has a value
                // (mixed LMSR/pool sources don't sum to 100), else the
                // Laplace-smoothed pool ratio.
                const pct = calcProb(displayMarket, outcome.id) * 100;

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
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            width: 30,
                            height: 30,
                            borderRadius: wcFlag ? 6 : "var(--radius-full)",
                            overflow: "hidden",
                            background: wcFlag ? "transparent" : vis.gradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: wcFlag ? "none" : "1.5px solid #fff",
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
                                fontSize: 13,
                                fontWeight: 900,
                                color: "#fff",
                              }}
                            >
                              {outcome.label.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--text-main)",
                              fontSize: "0.875rem",
                              lineHeight: 1.45,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {outcome.label}
                          </span>
                          {/* The pool reads under its own outcome rather than
                              right-aligned below the bar. It belongs to this
                              row, it balances the two-line pill opposite, and
                              it takes a whole stacked block out of the row. */}
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "var(--text-subtle)",
                              lineHeight: 1.45,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Nu{" "}
                            {Number(outcome.totalBetAmount).toLocaleString()}{" "}
                            total predicted
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          background: `${color}15`,
                          color: color,
                          padding: "3px 9px",
                          borderRadius: "var(--radius-full)",
                          flexShrink: 0,
                          border: `1px solid ${color}30`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          lineHeight: 1.15,
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", fontWeight: 900 }}>{(() => {
                          const outcomePool = Number(outcome.totalBetAmount) || 0;
                          const pool = Number(displayMarket.totalPool) || 0;
                          const edge = Number(displayMarket.houseEdgePct) || 0;
                          const odds = pool > 0 && outcomePool > 0
                            ? (pool * (1 - edge / 100)) / outcomePool
                            : 100 / Math.max(pct, 1);
                          return Math.min(99, odds).toFixed(2);
                        })()}x</span>
                        <span style={{ fontSize: "0.58rem", fontWeight: 700, opacity: 0.75 }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        borderRadius: "var(--radius-full)",
                        height: "7px",
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
                          boxShadow: `0 0 8px ${color}40`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Desktop only. On a phone the columns stack, and the thread sitting
              inside this one would put every comment above the prediction form
              — the form is what you came for. It is re-mounted after the right
              column instead. On desktop it must stay here: the right column is
              sticky, and the thread is what gives it something to pin against. */}
          {bp !== "mobile" && embeddedComments}
        </div>

        {/* Right Column: Interaction — pinned while the left column scrolls. */}
        <div
          style={{
            flex: 1,
            position: bp === "mobile" ? "static" : "sticky",
            // Was `var(--header-height)`, which is 80px — 32px short of this
            // app's 112px header, so the top of the panel sat under the nav.
            top: STICKY_TOP,
            width: "100%",
            // A pinned panel taller than the screen would have its bottom
            // permanently out of reach — scrolling the page moves the panel
            // with it. The dispute form is the tall one. Give it its own
            // scroll instead, on desktop only, where it is actually sticky.
            ...(bp === "mobile"
              ? {}
              : {
                  maxHeight: STICKY_MAX_HEIGHT,
                  overflowY: "auto" as const,
                }),
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
              {/* Phones get the bottom sheet, like every other market type in
                  this app. The inline form is a desktop pattern: it belongs in
                  a rail beside the market, and stacked on a phone it is just a
                  long form buried under the market info. */}
              {bp === "mobile" ? (
                <PredictLauncher
                  market={displayMarket}
                  onPick={(outcomeId) => setActiveBet(outcomeId)}
                />
              ) : (
                <PwaBetForm market={displayMarket} onBetPlaced={refreshMarket} />
              )}
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
                    <DisputeContestFields {...disputeContest} light />
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
                        placeholder={
                          disputeSide === "support"
                            ? "Explain why the proposed outcome is correct..."
                            : "Explain why the proposed outcome is incorrect..."
                        }
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
                      {disputeSubmitting
                        ? "Submitting..."
                        : disputeSide === "support"
                          ? "Defend Outcome"
                          : "Submit Objection"}
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

              <DisputeResultBanner dispute={myDispute} />
            </div>
          )}
        </div>

        {bp === "mobile" && embeddedComments}
      </div>

      {activeBet && (
        <TmaBetModal
          isOpen={true}
          onClose={() => setActiveBet(null)}
          market={displayMarket}
          outcomeId={activeBet}
          onSuccess={() => {
            setActiveBet(null);
            refreshMarket();
          }}
          onFailure={(e: string) => console.error(e)}
          onGoToWallet={() => navigate("/wallet")}
        />
      )}
    </div>
  );
}

/**
 * The phone entry point to the prediction sheet: one button per outcome with
 * its current price. Deliberately not a form — the stake, the wallet and the
 * payout estimate all live in the sheet, which is the pattern every themed
 * market view already uses on a phone.
 */
function PredictLauncher({
  market,
  onPick,
}: {
  market: Market;
  onPick: (outcomeId: string) => void;
}) {
  const pool = Number(market.totalPool) || 0;
  const edge = Number(market.houseEdgePct) || 0;

  return (
    <div>
      {/* The phone path. PwaBetForm carries the same pairing, but below 640px
          the right column renders this instead — so the sentiment badge has to
          live in both or it disappears on every phone. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 900,
            letterSpacing: "0.1em",
            color: "var(--text-subtle)",
            textTransform: "uppercase",
          }}
        >
          Make Your Prediction
        </div>
        <CrowdSentiment
          composite={market.signalMeta?.composite}
          participantCount={market.signalMeta?.participantCount}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "var(--space-sm)",
        }}
      >
        {market.outcomes.map((outcome) => {
          const eliminated = !!outcome.isEliminated;
          const stake = Number(outcome.totalBetAmount) || 0;
          const pct = Math.round(calcProb(market, outcome.id) * 100);
          const odds =
            pool > 0 && stake > 0
              ? Math.min(99, (pool * (1 - edge / 100)) / stake)
              : Math.min(99, 100 / Math.max(pct, 1));
          return (
            <button
              key={outcome.id}
              disabled={eliminated}
              onClick={() => !eliminated && onPick(outcome.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "var(--space-md)",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                cursor: eliminated ? "not-allowed" : "pointer",
                opacity: eliminated ? 0.45 : 1,
                textAlign: "left",
                width: "100%",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {outcome.label}
                {eliminated && (
                  <span style={{ fontSize: "0.7rem", opacity: 0.8 }}> · Out</span>
                )}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                  lineHeight: 1.15,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 900,
                    color: "var(--color-primary)",
                  }}
                >
                  {odds.toFixed(2)}x
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--text-subtle)",
                  }}
                >
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
