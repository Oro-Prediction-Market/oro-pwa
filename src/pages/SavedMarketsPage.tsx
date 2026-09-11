import { FC, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Page } from "@shared/components/Page";
import { SavedMarketsPanel } from "@shared/components/SavedMarkets";
import { useCurrency } from "@shared/currency/currency";
import { calcProb } from "@/pages/WorldCupHubPage";
import type { Market } from "@shared/api/client";

/**
 * The two formatters the shared list needs, in this app's terms.
 *
 * Exported because the public profile renders the same list for someone else
 * and has to format it identically — a saved market should not read one way on
 * your own page and another on a visitor's.
 */
export function useSavedFormatters() {
  const currency = useCurrency();

  const probOf = useCallback(
    (market: Market, outcomeId: string) => calcProb(market, outcomeId, currency),
    [currency],
  );

  /**
   * Both books side by side, never added together and never shown as a zero —
   * the same rule the feed card states, for the same reason: there is no
   * exchange rate in this product, and an empty book is absent, not nought.
   *
   * Reading the viewer's own currency here would have been the obvious thing
   * and the wrong one: a USDT viewer would see "$0" on a market holding
   * Nu 500, which says the opposite of what is true.
   */
  const poolLabel = useCallback((market: Market) => {
    const btn = Number(
      market.books?.find((b) => b.currency === "BTN")?.totalPool ??
        market.totalPool ??
        0,
    );
    const usdt = Number(
      market.books?.find((b) => b.currency === "USDT")?.totalPool ?? 0,
    );
    const parts: string[] = [];
    if (btn > 0) parts.push(`Nu ${btn.toLocaleString()}`);
    if (usdt > 0)
      parts.push(
        `$${usdt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      );
    return parts.length ? parts.join(" | ") : "No predictions yet";
  }, []);

  return { probOf, poolLabel };
}

/**
 * The markets this account has bookmarked.
 *
 * The list itself is shared with the Telegram app byte for byte; what differs
 * is the shell and the two formatters handed in — this app reads pools in the
 * viewer's own currency, which the Telegram app has no concept of.
 *
 * No heading of its own: the page shell already renders the route title.
 */
export const SavedMarketsPage: FC = () => {
  const navigate = useNavigate();
  const { probOf, poolLabel } = useSavedFormatters();

  return (
    <Page back={true}>
      <Helmet>
        <title>Saved Markets | Oro Prediction Market</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 16px 60px" }}>
        <SavedMarketsPanel
          probOf={probOf}
          poolLabel={poolLabel}
          onOpen={(id) => navigate(`/market/${id}`)}
          onBrowse={() => navigate("/")}
        />
      </div>
    </Page>
  );
};

export default SavedMarketsPage;
