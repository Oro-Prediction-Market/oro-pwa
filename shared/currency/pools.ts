import type { Currency } from "./currency";
import type { Market, Outcome } from "@shared/api/client";

/**
 * Pool figures, read from the book the viewer actually transacts in.
 *
 * `market.totalPool` and `outcome.totalBetAmount` are the **BTN** book's
 * figures and always were — they predate per-currency books entirely. Reading
 * them for a USDT viewer quotes odds, percentages and payouts from a pool that
 * viewer's money will never join: on this market a $2 stake was being priced
 * against Nu 200 of ngultrum liquidity.
 *
 * These two helpers exist so that answer is given in one place. Every card,
 * hub and detail screen was doing its own arithmetic straight off those two
 * fields, which is why the ngultrum figure kept resurfacing one component at a
 * time.
 *
 * Nothing here ever adds currencies together. There is no exchange rate in
 * this system, so a combined pool would be a number with no meaning.
 */
/**
 * The currency the signed-in viewer transacts in, as a module-level value.
 *
 * A deliberate exception to "pass it as a parameter". `calcProb` and
 * `calcOdds` are plain functions called from more than fifty places across
 * cards, hubs, detail screens and share sheets; threading a parameter through
 * every one of them is a change where a single missed call site silently
 * quotes ngultrum odds to somebody staking dollars — which is exactly what
 * kept happening, one screen at a time.
 *
 * Kept in sync by `CurrencyProvider`. An explicit argument always wins, so
 * anything needing a specific book can still ask for one.
 */
let viewerCurrency: Currency = "BTN";

export function setViewerCurrency(currency: Currency): void {
  viewerCurrency = currency;
}

export function getViewerCurrency(): Currency {
  return viewerCurrency;
}

/**
 * Laplace smoothing weight for probability display, per currency.
 *
 * The prior is pseudo-money: it holds a thin pool near even odds until real
 * stakes outweigh it. `1000` was chosen when ngultrum was the only currency,
 * where typical stakes run Nu 50–500 — so a few real bets move the number.
 *
 * Applied unchanged to USDT it is a disaster: minimum stake is $1, so a pool
 * would need a thousand dollars before the display moved off 50/50 at all.
 * Scaled to the same relationship between prior and typical stake, which for
 * USDT is roughly a hundredth.
 */
export function smoothingPrior(currency: Currency): number {
  return currency === "USDT" ? 10 : 1000;
}

export function marketPool(
  market: Pick<Market, "totalPool" | "books">,
  currency: Currency,
): number {
  if (currency === "BTN") {
    return (
      market.books?.find((b) => b.currency === "BTN")?.totalPool ??
      Number(market.totalPool) ??
      0
    );
  }
  return market.books?.find((b) => b.currency === currency)?.totalPool ?? 0;
}

/**
 * Whether this outcome carries a per-currency breakdown at all.
 *
 * A payload from an older server has `books` (so the market reports a USDT
 * pool) but no `poolsByCurrency` on the outcomes. Computing a share from that
 * divides zero by a real pool and yields a confident, wrong split — 45/55 on a
 * market where nobody has staked a dollar. Callers use this to fall back to an
 * even split instead of inventing a number.
 */
export function hasOutcomeBreakdown(
  outcome: Pick<Outcome, "poolsByCurrency">,
): boolean {
  return outcome.poolsByCurrency !== undefined;
}

export function outcomePool(
  outcome: Pick<Outcome, "totalBetAmount" | "poolsByCurrency">,
  currency: Currency,
): number {
  const perCurrency = outcome.poolsByCurrency?.[currency];
  if (perCurrency !== undefined) return Number(perCurrency) || 0;
  // Older payloads carry only the ngultrum figure.
  return currency === "BTN" ? Number(outcome.totalBetAmount) || 0 : 0;
}

/**
 * The platform cut for the viewer's book.
 *
 * Books can carry different rates on the same event, so a payout quoted with
 * the other book's edge is wrong even when the pools are right.
 */
export function bookEdge(
  market: Pick<Market, "houseEdgePct" | "books">,
  currency: Currency,
  fallback = 0,
): number {
  return (
    market.books?.find((b) => b.currency === currency)?.houseEdgePct ??
    Number(market.houseEdgePct) ??
    fallback
  );
}
