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
  ctaAccent,
  border,
  background,
}: {
  market: Market;
  onBetPlaced: () => void;
  /** The market's brand colour: heading, selected outcome, hairlines. */
  accent: string;
  /**
   * The Predict button's fill, when the brand colour is too loud as a solid
   * block. PL neon green and UFC red are fine as a 12px label or a 1.5px
   * border and glaring as a full-width button; UCL blue is fine as both.
   * Defaults to `accent`.
   */
  ctaAccent?: string;
  border: string;
  background: string;
}) {
  const cta = ctaAccent ?? accent;
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
          // The CTA colour, not the brand one: --color-primary paints solid
          // blocks (the selected stake chip, the active wallet border), and
          // those glare for exactly the same reason the button did. The brand
          // colour still reaches the heading and the selected outcome, which
          // are text and a hairline — it is passed as a prop below.
          "--color-primary": cta,
          "--grad-primary": `linear-gradient(160deg, ${cta} 0%, ${cta}d9 100%)`,
        } as React.CSSProperties
      }
    >
      {/* Match markets only — every themed view routes field markets to its
          own ranked list instead. Home / Draw / Away keeps that order, and the
          card beside this one fixes each side to a place on the page. */}
      <PwaBetForm
        market={market}
        onBetPlaced={onBetPlaced}
        accent={accent}
        preserveOrder
      />
    </div>
  );
}
