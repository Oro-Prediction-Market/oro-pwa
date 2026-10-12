// Moved verbatim from src/pages/WorldCupHubPage.tsx so the feed, detail pages
// and other hubs can use these without loading that page.
import type { Currency } from "@shared/currency/currency";
import { bookEdge, getViewerCurrency, hasOutcomeBreakdown, marketPool, smoothingPrior, outcomePool } from "@shared/currency/pools";
import { type Market, type Outcome } from "@shared/api/client";
import { looksEsports } from "@shared/helpers/esportsKeywords";
import { formatQuoteOnCard, ODDS_PROBE_BTN, ODDS_PROBE_USDT, quotePayout, type PayoutQuote } from "@shared/payout";

// ── Helpers (mirrored from TMA — keep in sync) ────────────────────────────────

export const SVG_MAP: Record<string, string> = {
  algeria: "Algeria", argentina: "Argentina", australia: "Australia",
  austria: "Austria", belgium: "Belgium",
  "bosnia and herzegovina": "BosniaAndHerzegovina", bosnia: "BosniaAndHerzegovina",
  brazil: "Brazil", canada: "Canada", "cape verde": "Cape Verde",
  colombia: "Colombia", croatia: "Croatia",
  "curaçao": "Curaçao", curacao: "Curaçao",
  czechia: "Czechia", "czech republic": "Czechia",
  "dr congo": "DR Congo", congo: "DR Congo",
  ecuador: "Ecuador", egypt: "Egypt", england: "England",
  france: "France", germany: "Germany", ghana: "Ghana", haiti: "Haiti",
  iran: "Iran", iraq: "Iraq",
  "ivory coast": "Ivory Coast", "côte d'ivoire": "Ivory Coast",
  japan: "Japan", jordan: "Jordan", mexico: "Mexico", morocco: "Morocco",
  netherlands: "Netherlands", holland: "Netherlands",
  "new zealand": "NewZealand", norway: "Norway",
  panama: "Panama", paraguay: "Paraguay", portugal: "Portugal", qatar: "Qatar",
  "saudi arabia": "Saudi Arabia", scotland: "Scotland", senegal: "Senegal",
  "south africa": "SouthAfrica",
  "south korea": "SouthKorea", korea: "SouthKorea",
  spain: "Spain", sweden: "Sweden", switzerland: "Switzerland", tunisia: "Tunisia",
  turkey: "Türkiye", "türkiye": "Türkiye",
  "united states": "USA", usa: "USA", america: "USA", us: "USA",
  uruguay: "Uruguay", uzbekistan: "Uzbekistan",
};

// Outcome labels that are answers/markers, not countries — must never map to a flag.
export const NON_COUNTRY_LABELS = new Set([
  "yes", "no", "over", "under", "draw", "tie", "odd", "even",
  "none", "both", "neither", "other", "tbd",
]);

export function getWCFlag(country: string): string {
  const lower = country.toLowerCase().trim();
  // Generic prop/outcome labels are NOT teams — never resolve them to a flag,
  // e.g. "No" must not fuzzy-match "Norway", "Yes"/"Draw"/"Over" etc.
  if (!lower || NON_COUNTRY_LABELS.has(lower)) return "";
  if (SVG_MAP[lower]) return `/worldcup/${SVG_MAP[lower]}.svg`;
  for (const [key, file] of Object.entries(SVG_MAP)) {
    // Label contains a country name, OR (only for sufficiently long labels) the
    // country name contains the label. The length guard blocks short tokens
    // ("no", "us") from matching a longer country via the reverse direction.
    if (lower.includes(key) || (lower.length >= 4 && key.includes(lower)))
      return `/worldcup/${file}.svg`;
  }
  return "";
}

export function isWCMarket(m: Market): boolean {
  if (m.subcategory?.startsWith("wc-")) return true;
  // "Esports World Cup" / "Free Fire World Cup" are different events entirely —
  // they belong to the /esports hub, not the FIFA World Cup hub
  if (looksEsports(m.title, m.description)) return false;
  return m.title.toLowerCase().includes("world cup");
}

/**
 * A market's outcomes, likeliest first.
 *
 * The order the API returns is the order they were created in, which says
 * nothing a reader wants to know. Eliminated outcomes sink to the bottom
 * whatever their price — they cannot win, so they are not in the running.
 *
 * Returns a copy: `market.outcomes` is shared with everything else on the
 * page, and `sort` mutates in place.
 *
 * Match markets do NOT use this. Home / Draw / Away has a reading order of
 * its own, and the two-sided cards pin each side to a fixed position — the
 * left crest, the red corner — so re-ranking them would swap the teams around
 * as the price moved.
 */
export function rankedOutcomes(market: Market): Outcome[] {
  return [...(market.outcomes ?? [])].sort((a, b) => {
    const ea = Number(!!a.isEliminated);
    const eb = Number(!!b.isEliminated);
    if (ea !== eb) return ea - eb;
    return calcProb(market, b.id) - calcProb(market, a.id);
  });
}

/**
 * Probability implied by the money on each side.
 *
 * `currency` selects the book: the figure has to agree with the payout
 * multiple shown next to it, and that multiple is per book. Defaults to
 * ngultrum so older callers are unchanged.
 */
export function calcProb(
  market: Market,
  outcomeId: string,
  currency: Currency = getViewerCurrency(),
): number {
  const outcomes = market.outcomes ?? [];
  const o = outcomes.find((x) => x.id === outcomeId);
  if (!o) return 0;
  const n = outcomes.length || 1;
  const prior = smoothingPrior(currency);
  const tPool = marketPool(market, currency);
  // Once there is real money in the pool, the honest probability is the
  // outcome's Laplace-smoothed share of the pool — which is also consistent with
  // the parimutuel payout multiple shown next to it. The stored LMSR values are
  // NOT used here: on a lopsided pool they saturate (favourite → ~0.99, everyone
  // else → a tiny non-zero number), which read as "99% / 0%" and don't reflect
  // the actual money on each side.
  // The pool branch needs the per-outcome breakdown to mean anything. Without
  // it — an older server, or a cached response from one — the market reports a
  // pool while every outcome reads zero, and the split comes out confidently
  // wrong rather than merely unknown.
  if (tPool > 0 && (currency === "BTN" || hasOutcomeBreakdown(o))) {
    return (outcomePool(o, currency) + prior / n) / (tPool + prior);
  }
  // Empty pool: sensible initial odds from LMSR when every outcome has one
  // (they sum to ~100), otherwise equal priors.
  //
  // Read per currency. `outcome.lmsrProbability` is the BTN book's value — the
  // engine writes it only on ngultrum stakes — so using it for a USDT viewer
  // quotes odds derived from money in a book their stake will never join. With
  // an untouched USDT book the honest answer is an even split.
  const lmsrOf = (x: Outcome) =>
    Number(x.lmsrByCurrency?.[currency] ?? (currency === "BTN" ? x.lmsrProbability : 0)) || 0;
  const lmsr = outcomes.map(lmsrOf);
  if (lmsr.every((p) => p > 0)) {
    const sum = lmsr.reduce((a, b) => a + b, 0);
    return lmsrOf(o) / sum;
  }
  // Last resort, and it must still read the viewer's own book. Reading
  // `o.totalBetAmount` here divided a ngultrum figure by the USDT prior and
  // produced percentages like 1050% and 5008% — a BTN pool measured on a USDT
  // scale. With an untouched book this now yields exactly 1/n: 50% on a
  // two-way market, which is the honest starting point.
  return (outcomePool(o, currency) + prior / n) / (tPool + prior);
}

/**
 * What a stake would return, quoted from the viewer's own book — or why it
 * would return nothing.
 *
 * `stake` is a notional probe and defaults per currency: a Nu 100 probe
 * against a one-dollar book would swamp the pool and report a multiple nobody
 * could ever be paid.
 *
 * Parimutuel, so the probe joins the pool it is claiming from: the bigger the
 * bet relative to the pool, the more it dilutes itself. A quoted multiplier is
 * therefore only true for the stake it was computed with. On a Nu 1,900 pool
 * the same outcome pays 12x at Nu 100 and 1.2x at Nu 5,000, so callers listing
 * odds must present them as indicative (see formatOdds) rather than as what
 * the viewer will receive. The exact figure comes from the amount actually
 * entered on the bet page.
 *
 * This used to end in `Math.max(raw, 1.05)`. The diagnosis behind that was
 * right — an outcome holding most of the pool quotes a sub-1.0x multiple, "bet
 * 100, win 90", a guaranteed loss for being right. The remedy was not: the
 * engine does not pay a 1.05x floor there, it refunds the whole market. So the
 * floor replaced one wrong number with another. `quotePayout` returns `refund`
 * for that case instead — see shared/payout.ts.
 */
export function calcOdds(
  market: Market,
  outcomeId: string,
  stake?: number,
  currency: Currency = getViewerCurrency(),
): PayoutQuote {
  const o = market.outcomes?.find((x) => x.id === outcomeId);
  if (!o) return { kind: "no_pool" };
  return quotePayout({
    stake: stake ?? (currency === "USDT" ? ODDS_PROBE_USDT : ODDS_PROBE_BTN),
    outcomePool: outcomePool(o, currency),
    totalPool: marketPool(market, currency),
    houseEdgePct: bookEdge(market, currency),
  });
}

/**
 * Renders a listed multiplier for display.
 *
 * The leading "~" is load-bearing, not decoration: listed odds are quoted for
 * a small reference stake, and the multiple a viewer actually receives falls
 * as their own stake grows. Printing a bare "12.00x" reads as a promise;
 * "~12.00x" reads as an indication, which is all a card without a stake box
 * can honestly offer.
 */
export function formatOdds(q: PayoutQuote): string {
  return formatQuoteOnCard(q);
}
