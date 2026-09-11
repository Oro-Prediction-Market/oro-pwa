import { FC, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { Page } from "@shared/components/Page";
import { SavedMarketsPanel } from "@shared/components/SavedMarkets";
import { useCurrency } from "@shared/currency/currency";
import { calcProb } from "@/pages/WorldCupHubPage";
import { getPublicProfile, type Market } from "@shared/api/client";
import { useEffect, useState } from "react";

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
 * A saved-markets list — yours at /saved, someone else's at /saved/:id.
 *
 * One page for both, because the list is the same list; what changes is whose
 * it is and whether the rows can be unsaved. The alternative was a second
 * near-identical page that would drift the first time either was touched.
 *
 * The list itself is shared with the Telegram app byte for byte; what differs
 * is the shell and the two formatters handed in — this app reads pools in the
 * viewer's own currency, which the Telegram app has no concept of.
 *
 * No heading of its own: the page shell already renders the route title.
 */
export const SavedMarketsPage: FC = () => {
  const navigate = useNavigate();
  const { id: ownerId } = useParams();
  const { probOf, poolLabel } = useSavedFormatters();
  const [ownerName, setOwnerName] = useState<string | undefined>();

  // Only to name the empty state. A failure here leaves the list intact and
  // falls back to "This predictor" — not worth blocking the page for.
  useEffect(() => {
    if (!ownerId) return;
    let live = true;
    getPublicProfile(ownerId)
      .then((p) => {
        if (live)
          setOwnerName(
            p.username ? `@${p.username}` : (p.firstName ?? "This predictor"),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ownerId]);

  const title = ownerId
    ? `${ownerName ?? "Predictor"}'s saved markets`
    : "Saved Markets";

  return (
    <Page back={true}>
      <Helmet>
        <title>{title} | Oro Prediction Market</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 16px 60px" }}>
        {ownerId && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-muted)",
            }}
          >
            Markets {ownerName ?? "this predictor"} is watching
          </p>
        )}
        <SavedMarketsPanel
          userId={ownerId}
          ownerName={ownerName}
          probOf={probOf}
          poolLabel={poolLabel}
          onOpen={(mid) => navigate(`/market/${mid}`)}
          onBrowse={() => navigate("/")}
        />
      </div>
    </Page>
  );
};

export default SavedMarketsPage;
