import React, { useEffect, useMemo, useState } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { MarketDetailColumns } from "./MarketDetailColumns";
import { ThemedBetPanel } from "./ThemedBetPanel";
import { formatOdds } from "@/pages/WorldCupHubPage";
import { PoolAmount } from "@shared/currency/PoolAmount";
import { MarketShareSheet } from "@/components/MarketShareSheet";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "../hooks/useGoBack";
import { ArrowLeft, Share2, Clock, ShieldAlert, Trophy } from "lucide-react";
import type { Bet, Market, Outcome, MyDispute } from "@shared/api/client";
import { DisputeResultBanner } from "../../shared/components/DisputeResultBanner";
import { YourPositionCard } from "../../shared/components/YourPositionCard";
import { TmaBetModal } from "./TmaBetModal";
import {
  DisputeContestFields,
  type DisputeContestControls,
} from "./DisputeContestFields";
import { calcProb, calcOdds } from "../pages/WorldCupHubPage";
import { isDrawOutcome } from "../pages/BplHubPage";
import { getEplCrest, shortEplName, EplCrest } from "../pages/EplHubPage";

// ── Premier League theme tokens (mirror the hub) ──────────────────────────────
const ACCENT = "#00ff85"; // PL green
const PURPLE = "#38003c"; // PL purple
const PINK = "#e90052"; // PL pink
const GOLD = "#fbbf24";
const BG = "#0a0410";

// "Arsenal vs Chelsea" → { a, b }
function parseMatchTeams(title: string): { a: string; b: string } {
  const m = title.match(
    /^(.+?)\s+vs\.?\s+(.+?)(?:\s*[–—\-:?]|\s*\(|\s+(?:who|which|will)\b|$)/i,
  );
  if (m) return { a: m[1].trim(), b: m[2].trim() };
  return { a: "Team A", b: "Team B" };
}

// A match layout applies to "X vs Y" markets — either a Home/Draw/Away trio or a
// straight two-team head-to-head.
function isMatchLayout(market: Market): boolean {
  if (!/\bvs\b/i.test(market.title)) return false;
  const outs = market.outcomes ?? [];
  const nonDraw = outs.filter((o) => !isDrawOutcome(o.label ?? ""));
  return outs.some((o) => isDrawOutcome(o.label ?? "")) || nonDraw.length === 2;
}

/** Live "Nd Nh" / "Nh Nm" countdown, refreshed each minute. */
function useCountdown(target: string | null | undefined): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!target) {
      setLabel("");
      return;
    }
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Closed");
        return;
      }
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const mn = Math.floor((ms % 3_600_000) / 60_000);
      if (d > 0) setLabel(`${d}d ${h}h`);
      else if (h > 0) setLabel(`${h}h ${mn}m`);
      else setLabel(`${mn}m`);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [target]);
  return label;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface EplMarketDetailProps {
  /**
   * The comment thread, rendered inside the scrolling column beside the pinned
   * prediction panel. Passed in rather than mounted by the page below this
   * component: below, it would sit outside the sticky panel's containing block
   * and the panel would unpin as soon as you scrolled into it.
   */
  commentsSlot?: React.ReactNode;
  market: Market;
  onBetPlaced: () => void;
  isResolving: boolean;
  proposedOutcome?: Outcome | null;
  disputeTimeLeft?: string | null;
  disputeReason: string;
  setDisputeReason: (v: string) => void;
  handleSubmitDispute: () => void;
  disputeSubmitting: boolean;
  disputeError: string | null;
  disputeSuccess: boolean;
  disputeContest?: DisputeContestControls;
  myDispute?: MyDispute | null;
  myBets?: Bet[];
  referralId?: string;
}

export function EplMarketDetail({
  market,
  onBetPlaced,
  isResolving,
  proposedOutcome,
  disputeTimeLeft,
  disputeReason,
  setDisputeReason,
  handleSubmitDispute,
  disputeSubmitting,
  disputeError,
  disputeSuccess,
  disputeContest,
  myDispute,
  myBets,
  referralId,
  commentsSlot,
}: EplMarketDetailProps) {
  const navigate = useNavigate();
  const goBack = useGoBack();
  // Two columns only where there is room for them.
  const isWide = useBreakpoint() === "desktop";
  const [activeBet, setActiveBet] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Open the detail view at the top, not at the feed's scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [market.id]);

  const locked =
    market.status === "closed" ||
    market.status === "resolving" ||
    market.status === "resolved" ||
    market.status === "settled";
  const resolved = market.status === "resolved" || market.status === "settled";

  const closes = useCountdown(
    locked ? null : (market.bettingClosesAt ?? market.closesAt),
  );

  const outcomes = market.outcomes ?? [];
  const totalPool =
    Number(market.totalPool ?? 0) ||
    outcomes.reduce((s, o) => s + Number(o.totalBetAmount ?? 0), 0);
  const usdtPool =
    market.books?.find((b) => b.currency === "USDT")?.totalPool ?? 0;

  const isMatch = isMatchLayout(market);

  // Season and other field markets keep the original single column: the
  // ranked list IS the market, so a pinned rail would list the same
  // runners twice — once to read, once to click.
  const splitLayout = isWide && isMatch;
  const winnerId = market.resolvedOutcomeId ?? null;

  const statusText = resolved
    ? "Resolved"
    : isResolving
      ? "Resolving"
      : market.status === "closed"
        ? "Closed"
        : closes
          ? `Closes in ${closes}`
          : "Open";

  const onBet = (outcomeId: string) => setActiveBet(outcomeId);

  // Lives in the scrolling column above the thread, in every layout. It was
  // briefly pinned in the rail, but the rail now holds the prediction form.
  const resolutionCard =
    market.resolutionCriteria || market.settlementSource ? (
      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(0,255,133,0.2)",
          borderRadius: 12,
          padding: "14px 15px",
          background: "rgba(0,255,133,0.04)",
        }}
      >
        <SectionLabel>How this resolves</SectionLabel>
        {market.resolutionCriteria && (
          <p
            style={{
              margin: "9px 0 0",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {market.resolutionCriteria}
          </p>
        )}
        {market.settlementSource && (
          <div style={{ marginTop: 10 }}>
            <MutedLabel>Settlement source</MutedLabel>
            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {market.settlementSource}
            </div>
          </div>
        )}
        {resolved && market.evidenceNote && (
          <div style={{ marginTop: 10 }}>
            <MutedLabel>Resolution note</MutedLabel>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {market.evidenceNote}
            </p>
          </div>
        )}
      </div>
    ) : null;

  const iconBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(0,255,133,0.35)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        // Fill the screen only where nothing follows this view. On desktop the
        // site footer comes next, so forcing 100vh on a short market just
        // stretches the themed backdrop into a band of dead space above it.
        minHeight: isWide ? undefined : "100vh",
        background: BG,
      }}
    >
      <div
        style={{
          // Widens on desktop to hold the pinned prediction rail beside the
          // conversation; unchanged on narrower screens, where the layout
          // collapses back to the single 760px column.
          maxWidth: splitLayout ? 1100 : 760,
          margin: "0 auto",
          // No bottom clearance here: <main> already reserves the bottom nav's
          // height on mobile, and on desktop the site footer follows. Reserving
          // it again left a dead band under the thread.
          padding: "16px 16px 16px",
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <button onClick={() => goBack()} style={iconBtn}>
            <ArrowLeft size={15} />
            Back
          </button>
          <button onClick={() => setShareOpen(true)} style={iconBtn}>
            <Share2 size={15} />
            Share
          </button>
          <MarketShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            market={market}
            accentColor={ACCENT}
            theme="epl"
            referralId={referralId}
          />
        </div>

        {/* ── Masthead ── */}
        <div
          style={{
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(0,255,133,0.25)",
            background: `linear-gradient(135deg, ${PURPLE} 0%, #1a0020 55%, ${BG} 100%)`,
          }}
        >
          {/* Pink + green glows */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 100% 0%, rgba(233,0,82,0.35) 0%, transparent 45%), radial-gradient(ellipse at 0% 100%, rgba(0,255,133,0.22) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
          {/* Broadcast slash */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "-25%",
              right: "16%",
              width: 40,
              height: "150%",
              background:
                "linear-gradient(90deg, rgba(0,255,133,0.18), rgba(0,255,133,0))",
              transform: "skewX(-18deg)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", padding: "18px 18px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,255,133,0.12)",
                  border: "1px solid rgba(0,255,133,0.45)",
                  borderRadius: 20,
                  padding: "4px 11px",
                  color: ACCENT,
                  fontSize: 10,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <Trophy size={12} />
                Premier League
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(0,0,0,0.35)",
                  border: `1px solid ${locked ? "rgba(251,191,36,0.4)" : "rgba(0,255,133,0.4)"}`,
                  borderRadius: 20,
                  padding: "4px 10px",
                  color: locked ? GOLD : ACCENT,
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {!locked && <Clock size={11} />}
                {statusText}
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(20px, 5vw, 28px)",
                fontWeight: 900,
                lineHeight: 1.14,
                color: "#fff",
                letterSpacing: "-0.01em",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}
            >
              {market.title}
            </h1>

            {market.description && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 620,
                }}
              >
                {market.description}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <StatTile
                label="Total pool"
                // Both books when both hold money — never added, since no rate
                // between them exists.
                value={
                  usdtPool > 0
                    ? `Nu ${totalPool.toLocaleString()} | $${usdtPool.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : `Nu ${totalPool.toLocaleString()}`
                }
              />
              <StatTile label="Outcomes" value={String(outcomes.length)} />
              <StatTile
                label={locked ? "Status" : "Closes in"}
                value={locked ? (resolved ? "Resolved" : "Locked") : closes || "—"}
              />
            </div>
          </div>
        </div>

        <MarketDetailColumns
          split={splitLayout}
          panel={<>
            {/* ── Locked banner ── */}
            {locked && (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid rgba(251,191,36,0.35)",
                  background: "rgba(251,191,36,0.06)",
                  borderRadius: 12,
                  padding: "11px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <ShieldAlert size={15} color={GOLD} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {resolved
                    ? "This market has been settled"
                    : isResolving
                      ? "Resolving — predictions are closed"
                      : "Predictions are locked"}
                </span>
              </div>
            )}

            {/* ── Outcomes ── */}
            <div style={{ marginTop: 14 }}>
              {!isMatch ? (
                <FieldBlock
                  market={market}
                  locked={locked}
                  winnerId={winnerId}
                  onBet={onBet}
                />
              ) : splitLayout && !locked ? (
                // Predict in place, the way the feed markets do. Only the
                // desktop rail gets this: on a phone the panel is the whole
                // screen already, and the modal is the better pattern there.
                <ThemedBetPanel
                  market={market}
                  onBetPlaced={onBetPlaced}
                  accent={ACCENT}
                  ctaAccent="#00a854"
                  border="rgba(0,255,133,0.25)"
                  background="rgba(255,255,255,0.02)"
                />
              ) : (
                // Locked, or single column. The tiles stay because they carry
                // the final percentages and the WON badge, which the form has
                // no way to show.
                <MatchBlock
                  market={market}
                  locked={locked}
                  winnerId={winnerId}
                  onBet={onBet}
                  part={splitLayout ? "actions" : undefined}
                />
              )}
            </div>
          </>}
          main={<>
            {/* The market itself, read-only. The rail beside it holds the
                action — the inline form on an open match, the result tiles
                once it is locked. Narrow screens render the whole card in the
                panel above instead, so this stays empty. */}
            {splitLayout && (
              <div style={{ marginBottom: 14 }}>
                <MatchBlock
                  market={market}
                  // Never pressable in this column, whatever the market's
                  // status: `locked` is what renders the tiles flat, with no
                  // lip and no hover. On an open market they come along to
                  // carry the percentages and odds, which the form does not
                  // show; once locked the rail shows them with the winner
                  // instead and only the header belongs here.
                  locked
                  winnerId={locked ? winnerId : null}
                  onBet={() => {}}
                  part={locked ? "header" : undefined}
                />
              </div>
            )}
            {/* ── Resolution info ── */}
            <DisputeResultBanner dispute={myDispute ?? null} />
            <YourPositionCard
              bets={myBets ?? []}
              resolved={resolved}
              theme={{ accent: ACCENT, border: "rgba(0,255,133,0.25)", background: "rgba(255,255,255,0.02)" }}
            />

            {resolutionCard}

            {/* ── Dispute (resolving) ── */}
            {isResolving && (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid rgba(251,191,36,0.35)",
                  borderRadius: 12,
                  padding: "14px 15px",
                  background: "rgba(251,191,36,0.05)",
                }}
              >
                <SectionLabel color={GOLD}>Proposed result</SectionLabel>
                {proposedOutcome && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 16,
                      fontWeight: 900,
                      color: "#fff",
                    }}
                  >
                    {shortEplName(proposedOutcome.label)}
                  </div>
                )}
                {disputeTimeLeft && (
                  <div style={{ marginTop: 6 }}>
                    <MutedLabel>{disputeTimeLeft}</MutedLabel>
                  </div>
                )}

                {disputeSuccess ? (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT }}>
                      Dispute submitted — under review
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    {disputeContest && (
                      <div style={{ marginBottom: 12 }}>
                        <DisputeContestFields {...disputeContest} accent="#a855f7" />
                      </div>
                    )}
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Explain why the proposed result is incorrect…"
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        background: BG,
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        color: "#fff",
                        padding: "10px 12px",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {disputeError && (
                      <div style={{ marginTop: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: PINK }}>
                          {disputeError}
                        </span>
                      </div>
                    )}
                    <button
                      disabled={disputeSubmitting}
                      onClick={handleSubmitDispute}
                      style={{
                        marginTop: 10,
                        border: "none",
                        borderRadius: 9,
                        padding: "10px 16px",
                        background: `linear-gradient(180deg, ${GOLD} 0%, #d99e00 100%)`,
                        color: "#1a1400",
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        cursor: disputeSubmitting ? "default" : "pointer",
                        opacity: disputeSubmitting ? 0.5 : 1,
                      }}
                    >
                      {disputeSubmitting ? "Submitting…" : "Submit dispute"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {commentsSlot}
          </>}
        />
      </div>

      {activeBet && (
        <TmaBetModal
          isOpen={true}
          onClose={() => setActiveBet(null)}
          market={market}
          outcomeId={activeBet}
          onSuccess={() => {
            setActiveBet(null);
            onBetPlaced();
          }}
          onFailure={(e: string) => console.error(e)}
          onGoToWallet={() => navigate("/wallet")}
        />
      )}
    </div>
  );
}

// ── Small text primitives ─────────────────────────────────────────────────────

function SectionLabel({
  children,
  color = ACCENT,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

function MutedLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 8.5,
        fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "9px 11px",
      }}
    >
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 15,
          fontWeight: 900,
          color: "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Match layout (Home / Draw / Away or head-to-head) ─────────────────────────

const outcomeColor = (label: string, idx: number) =>
  isDrawOutcome(label) ? "#9ca3af" : idx === 0 ? ACCENT : PINK;

function MatchBlock({
  market,
  locked,
  winnerId,
  onBet,
  part,
}: {
  market: Market;
  locked: boolean;
  winnerId: string | null;
  onBet: (outcomeId: string) => void;
  /**
   * Which half to draw. Omitted renders the whole card, which is what the
   * narrow layout wants — there the market is one column and splitting it
   * would only separate a picture from its own button.
   */
  part?: "header" | "actions";
}) {
  const outcomes = market.outcomes ?? [];
  const teams = outcomes.filter((o) => !isDrawOutcome(o.label ?? ""));
  const [t1, t2] = teams;
  if (!t1 || !t2) return null;

  const titleTeams = parseMatchTeams(market.title);
  const name1 = shortEplName(
    /^(yes|no)$/i.test(t1.label.trim()) ? titleTeams.a : t1.label,
  );
  const name2 = shortEplName(
    /^(yes|no)$/i.test(t2.label.trim()) ? titleTeams.b : t2.label,
  );

  // Probability bar segments in market order (Home / Draw / Away).
  const segs = outcomes.map((o, i) => ({
    id: o.id,
    pct: Math.round(calcProb(market, o.id) * 100),
    color: outcomeColor(o.label ?? "", teams.indexOf(o) === -1 ? i : teams.indexOf(o)),
  }));

  return (
    <div
      style={{
        border: "1px solid rgba(0,255,133,0.2)",
        borderRadius: 16,
        overflow: "hidden",
        background: "#140a1a",
      }}
    >
        {/* Crests, names and the probability bar. Split from the
            buttons so the pictures can stay with the market on the
            left while only the action pins to the right. */}
        {part !== "actions" && (
          <>
          {/* Crest header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              gap: 10,
              padding: "22px 16px 16px",
              background: `linear-gradient(135deg, rgba(56,0,60,0.85) 0%, rgba(0,255,133,0.14) 100%)`,
            }}
          >
            <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <EplCrest src={getEplCrest(market, 0)} label={name1} size={58} />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name1}
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#fff",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                padding: "5px 11px",
                flexShrink: 0,
              }}
            >
              VS
            </div>
            <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <EplCrest src={getEplCrest(market, 1)} label={name2} size={58} />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name2}
              </div>
            </div>
          </div>

          {/* Probability bar */}
          <div style={{ display: "flex", height: 5 }}>
            {segs.map((s) => (
              <div key={s.id} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>

          </>
        )}
        {part !== "header" && (
          <div style={{ display: "flex", gap: 8, padding: "14px 14px 16px" }}>
            {outcomes.map((outcome, idx) => {
              const draw = isDrawOutcome(outcome.label ?? "");
              const teamIdx = teams.indexOf(outcome);
              const color = outcomeColor(outcome.label ?? "", teamIdx === -1 ? idx : teamIdx);
              const pct = Math.round(calcProb(market, outcome.id) * 100);
              const odds = calcOdds(market, outcome.id);
              const won = winnerId === outcome.id;
              const label = draw
                ? "Draw"
                : shortEplName(
                    idx === 0 ? name1 : idx === outcomes.length - 1 ? name2 : outcome.label,
                  );
              return (
                <PredictButton
                  key={outcome.id}
                  color={won ? GOLD : color}
                  locked={locked}
                  dimmed={locked && !!winnerId && !won}
                  pct={pct}
                  label={label}
                  footer={won ? "WON" : formatOdds(odds)}
                  onClick={() => onBet(outcome.id)}
                />
              );
            })}
          </div>
        )}
    </div>
  );
}

/**
 * One outcome, styled to read as a button rather than a stat tile.
 *
 * The old treatment was an 8%-alpha wash with a faint border, which was
 * legible enough inside the match card but stopped reading as pressable once
 * the buttons were pinned alone in the desktop rail. What makes it a button:
 * a filled gradient body, a full-strength border in the outcome's colour, and
 * a coloured lip beneath it that compresses when pressed.
 */
function PredictButton({
  color,
  locked,
  dimmed,
  pct,
  label,
  footer,
  onClick,
}: {
  color: string;
  locked: boolean;
  /** Settled and this one lost — held back so the winner reads first. */
  dimmed: boolean;
  pct: number;
  label: string;
  footer: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const live = !locked;
  const lift = live && hover && !down;

  return (
    <button
      disabled={locked}
      onClick={() => live && onClick()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "12px 6px",
        background: `linear-gradient(180deg, ${color}${lift ? "4d" : "33"} 0%, ${color}1a 100%)`,
        border: `1.5px solid ${color}${lift ? "ff" : "b3"}`,
        borderRadius: 12,
        cursor: live ? "pointer" : "default",
        textAlign: "center",
        opacity: dimmed ? 0.5 : 1,
        // The lip is what sells it as a physical button: a solid colour edge
        // under the border that collapses on press.
        boxShadow: live
          ? down
            ? `0 1px 0 ${color}66, 0 2px 6px rgba(0,0,0,0.35)`
            : `0 3px 0 ${color}66, 0 6px 16px rgba(0,0,0,0.35)`
          : "none",
        transform: live ? `translateY(${down ? 2 : lift ? -1 : 0}px)` : "none",
        transition: "transform 90ms ease, box-shadow 90ms ease, background 120ms ease, border-color 120ms ease",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
        {pct}%
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 10, fontWeight: 800, color: GOLD }}>
        {footer}
      </div>
    </button>
  );
}

// ── Field layout (season winner, top scorer, ranked list) ─────────────────────

function FieldBlock({
  market,
  locked,
  winnerId,
  onBet,
}: {
  market: Market;
  locked: boolean;
  winnerId: string | null;
  onBet: (outcomeId: string) => void;
}) {
  const ranked = useMemo(() => {
    const list = [...(market.outcomes ?? [])];
    return list.sort((a, b) => {
      const ea = Number(!!a.isEliminated);
      const eb = Number(!!b.isEliminated);
      if (ea !== eb) return ea - eb;
      return calcProb(market, b.id) - calcProb(market, a.id);
    });
  }, [market]);
  // getEplCrest indexes into the ORIGINAL (unsorted) team order, so the crest
  // must be looked up by the outcome's original position — not its sorted rank.
  const teamOutcomes = useMemo(
    () => (market.outcomes ?? []).filter((o) => !isDrawOutcome(o.label ?? "")),
    [market],
  );


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ranked.map((outcome, idx) => {
        const pct = Math.round(calcProb(market, outcome.id) * 100);
        const odds = calcOdds(market, outcome.id);
        const eliminated = !!outcome.isEliminated;
        const won = winnerId === outcome.id;
        return (
          <div
            key={outcome.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "12px 13px",
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(0,255,133,0.05) 0%, #150b1c 65%)",
              border: `1px solid ${won ? "rgba(251,191,36,0.5)" : "rgba(0,255,133,0.16)"}`,
              opacity: eliminated || (locked && winnerId && !won) ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: 20,
                fontSize: 13,
                fontWeight: 900,
                color: "rgba(255,255,255,0.35)",
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              {idx + 1}
            </div>
            <EplCrest src={getEplCrest(market, teamOutcomes.indexOf(outcome))} label={outcome.label} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#fff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textDecoration: eliminated ? "line-through" : "none",
                }}
              >
                {outcome.label}
              </div>
              <div
                style={{
                  marginTop: 6,
                  height: 3,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: won ? GOLD : eliminated ? "#555" : ACCENT,
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                }}
              >
                <PoolAmount outcome={outcome} />
              </div>
            </div>
            <div style={{ textAlign: "center", flexShrink: 0, minWidth: 46 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: eliminated ? "#777" : ACCENT,
                  lineHeight: 1,
                }}
              >
                {pct}%
              </div>
              <div style={{ marginTop: 3, fontSize: 11, fontWeight: 900, color: GOLD }}>
                {formatOdds(odds)}
              </div>
            </div>
            {won ? (
              <span style={{ fontSize: 10, fontWeight: 900, color: GOLD, flexShrink: 0 }}>
                Winner
              </span>
            ) : eliminated ? (
              <span style={{ fontSize: 9, fontWeight: 800, color: PINK, flexShrink: 0 }}>
                Out
              </span>
            ) : (
              !locked && (
                <button
                  onClick={() => onBet(outcome.id)}
                  style={{
                    border: "none",
                    borderRadius: 9,
                    padding: "9px 14px",
                    background: ACCENT,
                    color: "#052012",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Predict
                </button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
