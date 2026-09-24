import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Users, Clock } from "lucide-react";
import {
  getMarkets,
  getMarketHistory,
  type Market,
  type Outcome,
  type OutcomeHistory,
} from "@shared/api/client";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import MarketComments from "@shared/components/MarketComments";
import { MarketThumb } from "@shared/components/MarketThumb";
import { useAuth } from "@shared/hooks/useAuth";
import { ProbabilityChart, type ChartSeries } from "@shared/components/ProbabilityChart";
import { groupArtwork } from "@shared/helpers/marketImage";
import { getCategoryVisual } from "@shared/helpers/visuals";
import { useCurrency, formatMoney } from "@shared/currency/currency";
import { marketPool } from "@shared/currency/pools";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { PwaBetForm } from "../components/PwaBetForm";
import { TmaBetModal } from "../components/TmaBetModal";
import { formatQuoteOnCard } from "@shared/payout";
import {
  candidateName,
  chanceOf,
  findOutcome,
  outcomeQuote,
  YES_COLOR,
  NO_COLOR,
} from "../components/GroupedMarketCard";

/**
 * The page for a grouped event — a political race, typically.
 *
 * This is the ONLY layer. A group used to have none at all: its feed card is
 * the only one that does not navigate, because each candidate row is its own
 * market, and the "+N more" hint led nowhere. The first version of this page
 * added a second hop — it listed the candidates and sent you to each one's own
 * market page to stake — which meant two pages for one event. Now the whole
 * thing resolves here: pick a candidate, the panel binds to it, and you stake
 * without leaving.
 *
 * The staking UI is not reimplemented. Each candidate IS a market, so the same
 * `PwaBetForm` the market detail page puts in its right rail and the same
 * `TmaBetModal` it opens on a phone take the selected candidate directly.
 * Nothing new was written next to the payment path.
 *
 * Assembled from `GET /markets`, which already returns every market in every
 * status but `cancelled` and which the feed already groups by `groupId` this
 * same way, so the page needs no backend change. A dedicated
 * `GET /markets/group/:groupId` would be leaner — `findGroup()` exists,
 * exposed only to admins — and is the follow-up if this page earns traffic.
 */

/** Candidates drawn on the chart. Beyond a handful the lines stop being
 *  readable, and each one costs its own history request. */
const CHARTED = 5;

const PALETTE = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f97316"];

function useCountdown(targetAt: string | null): string {
  const [label, setLabel] = useState("Open");
  useEffect(() => {
    if (!targetAt) return;
    const tick = () => {
      const ms = new Date(targetAt).getTime() - Date.now();
      if (ms <= 0) return setLabel("Closed");
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(
        h > 24 ? `${Math.floor(h / 24)}d left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`,
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [targetAt]);
  return label;
}

export default function PwaGroupDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const currency = useCurrency();
  const isMobile = bp === "mobile";
  // Passed down to the thread rather than letting MarketComments call useAuth()
  // itself — there is no auth context, so that would be a second getMe().
  const { user } = useAuth();

  const [all, setAll] = useState<Market[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  /** The candidate whose market the panel is bound to. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Phone only: the candidate + side the stake sheet is open on. */
  const [activeBet, setActiveBet] = useState<{ marketId: string; outcomeId: string } | null>(
    null,
  );
  const [histories, setHistories] = useState<Record<string, OutcomeHistory[]>>({});

  const load = useCallback(() => {
    return getMarkets()
      .then(setAll)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    let live = true;
    getMarkets()
      .then((m) => live && setAll(m))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const markets = useMemo(
    () => (all ?? []).filter((m) => m.groupId === groupId),
    [all, groupId],
  );

  const first = markets[0];
  const title = first ? (first.groupTitle || first.title).trim() : "";

  // Sorted by chance, and every candidate is shown — the feed card can only
  // fit two, which is the reason this page exists.
  const rows = useMemo(
    () =>
      markets
        .map((m) => {
          // Prefer the Yes/No labels, fall back to position, so a renamed
          // outcome still resolves — the same rule the feed card uses.
          const yes = findOutcome(m, "yes") ?? m.outcomes?.[0];
          const no = findOutcome(m, "no") ?? m.outcomes?.[1];
          return { market: m, name: candidateName(m), pct: chanceOf(m, yes, currency), yes, no };
        })
        .sort((a, b) => b.pct - a.pct),
    [markets, currency],
  );

  // The leader is the default binding, so the panel is never empty on arrival.
  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].market.id);
  }, [rows, selectedId]);

  const charted = useMemo(() => rows.slice(0, CHARTED), [rows]);

  // One history request per charted candidate — each is a separate market, so
  // there is no single call that returns the group's curves.
  useEffect(() => {
    let live = true;
    for (const { market: m } of charted) {
      if (histories[m.id]) continue;
      getMarketHistory(m.id)
        .then((h) => live && setHistories((prev) => ({ ...prev, [m.id]: h })))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [charted, histories]);

  /**
   * One line per candidate: their Yes curve, labelled with their name.
   *
   * A candidate's own market has a Yes and a No curve that mirror each other,
   * so drawing both would double the lines and say nothing — across the group
   * it is the Yes side that competes.
   */
  const chartSeries: ChartSeries[] = useMemo(() => {
    const out: ChartSeries[] = [];
    charted.forEach(({ market: m, name, yes }, i) => {
      const h = histories[m.id];
      if (!h || !yes) return;
      const curve = h.find((x) => x.outcomeId === yes.id);
      if (!curve?.points?.length) return;
      out.push({
        label: name,
        color: PALETTE[i % PALETTE.length],
        points: curve.points,
      });
    });
    return out;
  }, [charted, histories]);

  const groupPool = useMemo(
    () => markets.reduce((s, m) => s + marketPool(m, currency), 0),
    [markets, currency],
  );
  const earliestClose = useMemo(
    () =>
      markets.reduce<string | null>(
        (acc, m) =>
          m.closesAt && (!acc || new Date(m.closesAt) < new Date(acc)) ? m.closesAt : acc,
        null,
      ),
    [markets],
  );
  const countdown = useCountdown(earliestClose);
  // No predictor count: `Market` as the feed serves it carries no
  // participantCount, so a head count would need a backend change. The leader
  // is the more useful glance on a race anyway.
  const leader = rows[0];
  const selected = rows.find((r) => r.market.id === selectedId) ?? rows[0];

  /**
   * The market the race's comment thread hangs off.
   *
   * Comments are keyed to a single `marketId` and a group is virtual, so there
   * is no row for the race itself to own a thread. One conversation about the
   * race is what people would actually write, so the whole group shares the
   * oldest child's thread rather than splitting five ways.
   *
   * Oldest, specifically: candidates are only ever appended, so the first one
   * never changes. Anchoring to the newest would move the thread — and hide
   * every existing comment — the moment a candidate was added.
   *
   * Tie-broken on id, which is what makes that guarantee hold. Children created
   * in one statement share a `createdAt` to the microsecond, and an ordering
   * that treats equal timestamps as unequal is decided by whatever order the
   * feed happened to return — so the thread could move between candidates from
   * one load to the next, taking every comment on it out of view.
   */
  const commentAnchor = useMemo(() => {
    if (!markets.length) return null;
    return [...markets].sort((a, b) => {
      const at = String(a.createdAt ?? "");
      const bt = String(b.createdAt ?? "");
      return at === bt ? a.id.localeCompare(b.id) : at < bt ? -1 : 1;
    })[0];
  }, [markets]);
  /**
   * The candidate the stake sheet is bound to, titled candidate-first.
   *
   * A child market's stored title is "<race> — <candidate>", and the sheet
   * heads itself with it on one truncated line, so every candidate's sheet
   * read "Who will lead Paro Thromde the next fi…" — identical, with the name
   * cut off. Flipped, the name survives truncation and the race still reaches
   * the share card, which takes this same title. Display only: the stake posts
   * `market.id`.
   */
  const activeMarket = useMemo(() => {
    const m = activeBet ? markets.find((x) => x.id === activeBet.marketId) : undefined;
    if (!m) return undefined;
    const race = (m.groupTitle || "").trim();
    return race ? { ...m, title: `${candidateName(m)} — ${race}` } : m;
  }, [activeBet, markets]);

  if (!all && !failed) return <LoadingScreen />;

  if (!first) {
    return (
      <div style={{ padding: "var(--space-xl)", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
          {failed ? "Could not load this event" : "Event not found"}
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "var(--space-sm)" }}>
          {failed
            ? "Something went wrong fetching the markets."
            : "This group has no markets, or they have been cancelled."}
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "var(--space-lg)",
            padding: "8px 18px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-main)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Back to markets
        </button>
      </div>
    );
  }

  const vis = getCategoryVisual(first.category);
  const isOpen = first.status === "open";

  /**
   * Yes or No for one candidate.
   *
   * On a phone it opens the stake sheet on exactly that side. On a wide screen
   * it binds the right-hand panel to that candidate — the panel carries its own
   * Yes/No picker, so the side is chosen there, in the one place that takes the
   * money.
   */
  const pick = (m: Market, o: Outcome | undefined) => {
    if (!o) return;
    setSelectedId(m.id);
    // The side buttons carry `disabled`, but the whole row is clickable too —
    // without this a tap anywhere on a settled candidate opened a stake sheet
    // for a race that finished.
    if (m.status !== "open" || o.isEliminated) return;
    if (isMobile) setActiveBet({ marketId: m.id, outcomeId: o.id });
  };

  const stat = (icon: React.ReactNode, label: string, value: string) => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-subtle)",
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: "1rem",
          fontWeight: 900,
          color: "var(--text-main)",
          marginTop: 3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );

  const sideButton = (m: Market, o: Outcome | undefined, label: string, color: string) => {
    const disabled = !o || o.isEliminated || m.status !== "open";
    const active = selected?.market.id === m.id;
    return (
      <button
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          pick(m, o);
        }}
        style={{
          position: "relative",
          flexShrink: 0,
          width: 58,
          padding: "6px 0",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          background: `${color}${active && !isMobile ? "33" : "1c"}`,
          boxShadow: `inset 0 0 0 1px ${color}${active && !isMobile ? "80" : "45"}`,
          color,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1.15,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <span style={{ fontSize: "0.72rem", fontWeight: 900 }}>{o?.label ?? label}</span>
        {o && (
          <span style={{ fontSize: "0.55rem", fontWeight: 700, opacity: 0.8 }}>
            {formatQuoteOnCard(outcomeQuote(m, o, currency))}
          </span>
        )}
      </button>
    );
  };

  const candidateList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(({ market: m, name, pct, yes, no }) => {
        const avatarUrl = !imgErrors[m.id] ? m.imageUrl : null;
        const fill = Math.max(2, Math.min(100, pct));
        const active = !isMobile && selected?.market.id === m.id;
        return (
          <div
            key={m.id}
            onClick={() => pick(m, yes)}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-card)",
              // The bound candidate is marked, because on a wide screen the
              // panel beside this list belongs to exactly one of these rows.
              border: `1px solid ${active ? vis.accentColor : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {/* The chance bar as the row's background, matching the outcome
                rows on a market detail page. */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${fill}%`,
                background: `linear-gradient(90deg, ${YES_COLOR}2e, ${YES_COLOR}12)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  background: vis.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgErrors((p) => ({ ...p, [m.id]: true }))}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    color: "var(--text-main)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-subtle)" }}>
                  {pct.toFixed(0)}% · {formatMoney(marketPool(m, currency), currency)}
                </div>
              </div>

              {sideButton(m, yes, "Yes", YES_COLOR)}
              {sideButton(m, no, "No", NO_COLOR)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: isMobile ? 760 : 1180,
        margin: "0 auto",
        padding: isMobile ? "var(--space-md)" : "var(--space-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
      }}
    >
      <Helmet>
        <title>{title} · Oro</title>
      </Helmet>

      <button
        onClick={() => navigate(-1)}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontWeight: 700,
          fontSize: "0.85rem",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header: the event's artwork and its umbrella question. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <MarketThumb src={groupArtwork(first)} alt={title} size={52} rounded={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            {first.category && (
              <span
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: vis.accentColor,
                  background: `${vis.accentColor}18`,
                  border: `1px solid ${vis.accentColor}40`,
                  padding: "1px 7px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {first.category}
              </span>
            )}
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                color: "var(--text-subtle)",
                border: "1px solid var(--border)",
                padding: "1px 7px",
                borderRadius: 99,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {rows.length} candidates
            </span>
          </div>
          <h1
            style={{
              fontSize: isMobile ? "1.3rem" : "1.5rem",
              fontWeight: 900,
              color: "var(--text-main)",
              margin: 0,
              lineHeight: 1.2,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "var(--space-lg)",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            flex: 1.6,
            width: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            {stat(null, "Total pool", formatMoney(groupPool, currency))}
            {/* "Leader", not "Front-runner": the longer label wrapped to two
                lines in a third of a phone's width and squeezed the name to
                "Sonam P…". The percentage is on the row just below. */}
            {stat(<Users size={11} />, "Leader", leader ? leader.name : "—")}
            {stat(
              <Clock size={11} />,
              isOpen ? "Closes" : "Status",
              isOpen ? countdown : first.status,
            )}
          </div>

          {chartSeries.length > 0 && <ProbabilityChart series={chartSeries} fit />}

          {candidateList}

          {(first.resolutionCriteria || first.settlementSource) && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              {first.resolutionCriteria && <p style={{ margin: 0 }}>{first.resolutionCriteria}</p>}
              {first.settlementSource && (
                <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                  Resolves via {first.settlementSource}
                </p>
              )}
            </div>
          )}

          {/* One thread for the race. Inside the scrolling left column, not
              below it: mounted below, it would end the sticky rail's
              containing block and unpin the panel the moment you scrolled
              into the comments — the same reason the market detail page
              embeds its thread rather than stacking it. */}
          {commentAnchor && (
            <MarketComments
              marketId={commentAnchor.id}
              marketStatus={commentAnchor.status}
              currentUserId={user?.id ?? null}
              onOpenProfile={(userId: string) => navigate(`/profile/${userId}`)}
              embedded
            />
          )}
        </div>

        {/* The staking panel, bound to the selected candidate. Phones get the
            sheet instead — a rail beside nothing is not a layout. Only for a
            candidate still open: a finished race was still showing a panel
            inviting a prediction on it. */}
        {!isMobile && selected && selected.market.status === "open" && (
          <div
            style={{
              flex: 1,
              width: "100%",
              minWidth: 300,
              position: "sticky",
              top: "var(--space-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 2px",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-subtle)",
              }}
            >
              Predicting on
              <span style={{ color: "var(--text-main)", textTransform: "none", fontSize: "0.85rem" }}>
                {selected.name}
              </span>
            </div>
            <PwaBetForm
              // Remounts when the candidate changes, so a half-typed stake
              // cannot carry across to a different person's market.
              key={selected.market.id}
              market={selected.market}
              onBetPlaced={() => load()}
              accent={vis.accentColor}
              preserveOrder
            />
          </div>
        )}
      </div>

      {activeBet && activeMarket && (
        <TmaBetModal
          isOpen={true}
          onClose={() => setActiveBet(null)}
          market={activeMarket}
          outcomeId={activeBet.outcomeId}
          onSuccess={() => {
            setActiveBet(null);
            load();
          }}
          onFailure={(e: string) => console.error(e)}
          onGoToWallet={() => navigate("/wallet")}
        />
      )}
    </div>
  );
}
