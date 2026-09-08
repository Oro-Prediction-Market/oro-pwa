import React from "react";
import type { Market } from "@shared/api/client";
import { PwaBetForm } from "./PwaBetForm";

/**
 * The feed markets' inline prediction form, dropped into one of the themed
 * market views (EPL, UCL, UFC, Esports) so those match pages predict in place
 * instead of opening a modal.
 *
 * `PwaBetForm` is written against the app's design tokens, which flip with the
 * light/dark setting. The themed views are the one place that breaks: they
 * paint their own near-black backdrop no matter what the app theme says, so in
 * light mode the form would render `--text-main: #0f172a` — near-black text on
 * a near-black page. Pinning the six colour tokens on this wrapper keeps the
 * form legible in both settings, and cascades to everything inside it.
 */
export function ThemedBetPanel({
  market,
  onBetPlaced,
  accent,
  border,
  background,
}: {
  market: Market;
  onBetPlaced: () => void;
  /** Drives the form's primary button and selected-outcome highlight. */
  accent: string;
  border: string;
  background: string;
}) {
  return (
    <div
      style={
        {
          border: `1px solid ${border}`,
          borderRadius: 14,
          background,
          padding: 14,
          // Dark values, held regardless of the app's light/dark setting —
          // see the note above.
          "--bg-card": "rgba(255,255,255,0.04)",
          "--bg-secondary": "rgba(255,255,255,0.06)",
          "--border": "rgba(255,255,255,0.14)",
          "--text-main": "#ffffff",
          "--text-muted": "rgba(255,255,255,0.62)",
          "--text-subtle": "rgba(255,255,255,0.45)",
          // Let each view's accent drive the call to action rather than the
          // app's generic blue.
          "--color-primary": accent,
          "--grad-primary": `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`,
        } as React.CSSProperties
      }
    >
      <PwaBetForm market={market} onBetPlaced={onBetPlaced} />
    </div>
  );
}
