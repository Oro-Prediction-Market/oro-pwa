import {
  feedCardHeight,
  outcomesBlockHeight,
  priceChartHeight,
  type FeedCardMetrics,
} from "@shared/feedCardMetrics";

/**
 * The PWA's own card measurements, fed into the shared recipe.
 *
 * These are read off the card's real styles rather than invented: the outcome
 * row is `padding: "7px 10px"` around a 26–28px avatar, the title is `0.95rem`
 * at `lineHeight: 1.35`, and the body is `padding: "10px 14px 12px"` with
 * `gap: 10` between its five sections.
 *
 * Deliberately a single source for all four feed cards — the generic card, the
 * grouped card, and the two price cards. They previously sized themselves
 * independently and drifted; the TER/BTC comment in `PwaMarketCard.tsx` about
 * being "tuned to sit just within the height of the chart cards" was that drift
 * being managed by hand.
 */
const PWA_CARD: FeedCardMetrics = {
  outcomeRowH: 44,
  outcomeGap: 6,
  titleLineH: 21,
  moreLineH: 18,
  sourceLineH: 14,
  // Body padding (10 + 12) + badge row (19) + footer (22) + 4 × gap 10.
  chromeH: 103,
  // The hint sits inside the outcomes block here.
  moreLineInBlock: true,
};

/** Every card in the PWA feed lands on exactly this height. */
export const FEED_CARD_H = feedCardHeight(PWA_CARD);

/** Reserved slot for the "+N more" hint, kept even on binary cards. */
export const MORE_LINE_H = PWA_CARD.moreLineH;

/**
 * One outcome row and the gap below it, exported so a card can work out how
 * many rows fit the space the grid actually gave it — see `useFittedRows`.
 * A row in a stretched grid row is the difference between a third outcome and
 * 50px of blank space.
 */
export const OUTCOME_ROW_H = PWA_CARD.outcomeRowH;
export const OUTCOME_GAP = PWA_CARD.outcomeGap;

/**
 * A grouped card's candidate row, which is taller than a plain outcome row: it
 * carries an avatar, a name, a chance, and the two Yes/No buttons.
 *
 * Measured at 50px with a single-line name. It used to be 65px whenever a name
 * wrapped to two lines, which is why grouped cards stood ~17px above the rest of
 * the feed — a card cannot have a fixed height while its rows are sized by how
 * long someone's name is. The name is clamped to one line for that reason.
 */
export const GROUP_ROW_H = 50;

/**
 * The outcomes block, fixed so every status occupies the same space.
 *
 * Only `open` markets render outcome rows at all — `resolving`, `closed` and
 * `upcoming` each swap the whole list for a single banner, and all four statuses
 * appear side by side in the feed. Sizing the block rather than its contents is
 * what keeps a "CLOSED" card level with a live one.
 */
export const OUTCOMES_BLOCK_H = outcomesBlockHeight(PWA_CARD);

/** Reserved slot for the "Resolves via …" line, kept when there is no source. */
export const SOURCE_LINE_H = PWA_CARD.sourceLineH;

/** Two title lines, reserved so a one-line title does not shorten the card. */
export const TITLE_BLOCK_H = PWA_CARD.titleLineH * 2;

/**
 * Chart well for the TER/BTC cards.
 *
 * Their non-chart content — header, price row, two action buttons, footer —
 * measures about 150px, so the chart takes whatever the shared height leaves.
 * Previously it was a flat 160px that only appeared once price history loaded,
 * which is why those cards jumped taller mid-session.
 */
export const PRICE_CHART_H = priceChartHeight(FEED_CARD_H, 150);
