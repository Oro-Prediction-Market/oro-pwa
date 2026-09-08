import React from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";

/**
 * Height of the fixed site header on desktop: the 64px logo/search row plus the
 * 48px category row, and the notch inset the header pads itself by. Kept in
 * step with `<header>` and `<main>`'s paddingTop in PwaApp.tsx.
 *
 * A sticky panel measures `top` from the VIEWPORT, not from the scroll
 * container, so a bare `top: 16` pins it 16px from the top of the screen —
 * which on this site is 112px underneath the header. Every pinned prediction
 * panel has to clear it explicitly.
 *
 * `--header-height` in shared/index.css says 80px and is wrong for this app,
 * but that file is hand-copied into oro-tma, whose header is a different
 * height. Fixing it there would move the TMA's layout, so the correct value
 * lives here instead.
 */
const HEADER = "112px + env(safe-area-inset-top, 0px)";

/** `top` for a panel pinned below the site header, with breathing room. */
export const STICKY_TOP = `calc(${HEADER} + 16px)`;

/**
 * Cap for the same panel. A pinned panel taller than the space below the
 * header would have its bottom permanently out of reach, so it scrolls itself.
 */
export const STICKY_MAX_HEIGHT = `calc(100vh - (${HEADER}) - 32px)`;

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
          top: STICKY_TOP,
          maxHeight: STICKY_MAX_HEIGHT,
          overflowY: "auto",
        }}
      >
        {panel}
      </div>
    </div>
  );
}
