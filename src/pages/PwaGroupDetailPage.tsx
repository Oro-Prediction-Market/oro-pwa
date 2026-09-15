import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Users, Clock } from "lucide-react";
import { getMarkets, type Market, type Outcome } from "@shared/api/client";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import { MarketThumb } from "@shared/components/MarketThumb";
import { groupArtwork } from "@shared/helpers/marketImage";
import { getCategoryVisual } from "@shared/helpers/visuals";
import { useCurrency, formatMoney } from "@shared/currency/currency";
import { marketPool } from "@shared/currency/pools";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { formatOdds } from "./WorldCupHubPage";
import {
  candidateName,
  chanceOf,
  findOutcome,
  outcomeOdds,
  YES_COLOR,
  NO_COLOR,
} from "../components/GroupedMarketCard";

/**
 * The detail page for a grouped event — a political race, typically.
 *
 * Until now a group had no page. The feed card showed two candidates and a
 * "+N more" hint that led nowhere: it is the only card in the feed that does
 * not navigate, because each row is its own market and there was no route that
 * could show them all. On a five-candidate race that meant three candidates
 * were unreachable except through search.
 *
 * Assembled on the client rather than from a group endpoint. `GET /markets`
 * already returns every market in every status but `cancelled`, and the feed
 * already groups them by `groupId` this same way, so filtering that list needs
 * no backend change and no deploy. A dedicated `GET /markets/group/:groupId`
 * would be leaner — the service method already exists, exposed only to admins
 * — and is the natural follow-up if this page ever gets its own traffic.
 *
 * It does not place bets. Each candidate is a market with its own detail page
 * and its own working bet flow, so Yes/No lead there rather than duplicating
 * the auth-modal and bet-sheet plumbing around the payment path.
 */

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

  const [all, setAll] = useState<Market[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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

  // Sorted by chance, and every candidate is shown — the whole point of the
  // page is that the feed card could only fit two.
  const rows = useMemo(
    () =>
      markets
        .map((m) => {
          // Prefer the Yes/No labels, fall back to position, so a renamed
          // outcome still resolves — same rule the feed card uses.
          const yes = findOutcome(m, "yes") ?? m.outcomes?.[0];
          const no = findOutcome(m, "no") ?? m.outcomes?.[1];
          return { market: m, name: candidateName(m), pct: chanceOf(m, yes, currency), yes, no };
        })
        .sort((a, b) => b.pct - a.pct),
    [markets, currency],
  );

  const groupPool = useMemo(
    () => markets.reduce((s, m) => s + marketPool(m, currency), 0),
    [markets, currency],
  );
  // No predictor count here: `Market` as the feed serves it carries no
  // participantCount, so a head count would need a backend change. The
  // front-runner is the more useful glance on a race anyway.
  const leader = rows[0];
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

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: bp === "mobile" ? "var(--space-md)" : "var(--space-xl)",
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
              fontSize: bp === "mobile" ? "1.3rem" : "1.5rem",
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

      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        {stat(null, "Total pool", formatMoney(groupPool, currency))}
        {/* "Leader", not "Front-runner": the longer label wrapped to two lines
            in a third of a phone's width and squeezed the name to "Sonam P…".
            The percentage is on the candidate's own row just below, so the
            name alone is what this tile is for. */}
        {stat(<Users size={11} />, "Leader", leader ? leader.name : "—")}
        {stat(<Clock size={11} />, isOpen ? "Closes" : "Status", isOpen ? countdown : first.status)}
      </div>

      {/* Every candidate, which is the reason this page exists. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ market: m, name, pct, yes, no }) => {
          const avatarUrl = !imgErrors[m.id] ? m.imageUrl : null;
          const fill = Math.max(2, Math.min(100, pct));
          return (
            <div
              key={m.id}
              onClick={() => navigate(`/market/${m.id}`)}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
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
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "var(--text-subtle)",
                    }}
                  >
                    {pct.toFixed(0)}% · {formatMoney(marketPool(m, currency), currency)}
                  </div>
                </div>

                {pickButton(m, yes, "Yes", YES_COLOR)}
                {pickButton(m, no, "No", NO_COLOR)}
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );

  /**
   * Yes/No for one candidate. Navigates to that candidate's own market page
   * rather than opening a bet sheet here — the page it leads to already owns
   * the auth and staking flow, and there is no reason to build a second one
   * next to the payment path.
   */
  function pickButton(m: Market, o: Outcome | undefined, label: string, color: string) {
    const disabled = !o || o.isEliminated || m.status !== "open";
    return (
      <button
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (o) navigate(`/market/${m.id}`);
        }}
        style={{
          position: "relative",
          flexShrink: 0,
          width: 58,
          padding: "6px 0",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          background: `${color}1c`,
          boxShadow: `inset 0 0 0 1px ${color}45`,
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
            {formatOdds(outcomeOdds(m, o, currency))}
          </span>
        )}
      </button>
    );
  }
}
