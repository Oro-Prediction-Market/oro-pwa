import React from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";

/**
 * The two-column body every market detail view shares on desktop: the market
 * and its conversation scroll on the left, the prediction panel stays pinned
 * on the right.
 *
 * Below desktop this collapses to one column with the panel FIRST, because on
 * a phone the thing you came to do belongs above the thing you came to read.
 * That ordering is why the panel is a prop rather than the caller nesting it —
 * a CSS-only reorder would leave the DOM order wrong for screen readers.
 *
 * The panel is `sticky`, which only works while its containing block is taller
 * than it is. That is exactly why the comments belong INSIDE `main` and not
 * under this component: mounted below, they would end the containing block and
 * the panel would unpin the moment you scrolled into them.
 */
export function MarketDetailColumns({
  panel,
  main,
  split = true,
}: {
  /** The prediction UI. Pinned on desktop, first in flow on mobile. */
  panel: React.ReactNode;
  /** Everything else, comments included. Scrolls. */
  main: React.ReactNode;
  /**
   * Set false to keep one column even with room for two. Season and other
   * field markets do this: the ranked list IS the market, so a pinned rail
   * would show the same twenty runners twice, once to read and once to click.
   */
  split?: boolean;
}) {
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop" && split;

  if (!isDesktop) {
    return (
      <>
        {panel}
        {main}
      </>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        // The panel takes a fixed-ish rail; the conversation gets the rest.
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
        gap: 20,
        alignItems: "start",
        marginTop: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>{main}</div>
      <div
        style={{
          position: "sticky",
          top: 16,
          // Pinned, a panel taller than the screen would have its bottom
          // permanently out of reach — the page scrolls it along. Give it its
          // own scroll instead.
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        {panel}
      </div>
    </div>
  );
}
