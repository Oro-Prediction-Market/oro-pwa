import React, { createContext, useContext, useMemo } from "react";
import { setViewerCurrency } from "./pools";

export type Currency = "BTN" | "USDT";

/**
 * How each currency is written and how precise it is.
 *
 * USDT is a 6dp token but showing six decimals on every figure is unreadable,
 * so display rounds to 2 while the ledger keeps all six. The two are different
 * concerns: this only ever affects what a user sees, never what is stored or
 * paid.
 */
const SPEC: Record<Currency, { symbol: string; decimals: number; suffix?: string }> = {
  BTN: { symbol: "Nu ", decimals: 2 },
  USDT: { symbol: "$", decimals: 2, suffix: " USDT" },
};

/**
 * Format an amount in a named currency.
 *
 * **Currency is required, deliberately.** The old helper defaulted to
 * ngultrum, which meant a component that forgot to pass one silently rendered
 * "Nu" on a USDT screen — wrong in a way nobody notices until a user does.
 * Making it required turns that into a compile error.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: Currency,
  opts: { compact?: boolean } = {},
): string {
  const spec = SPEC[currency] ?? SPEC.BTN;
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `${spec.symbol}0`;

  const body = opts.compact && Math.abs(n) >= 1000
    ? n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })
    : n.toLocaleString(undefined, {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: spec.decimals,
      });

  return `${spec.symbol}${body}${spec.suffix ?? ""}`;
}

/** Just the unit, for labels and input adornments. */
export function currencyLabel(currency: Currency): string {
  return currency === "USDT" ? "USDT" : "Nu";
}

const CurrencyContext = createContext<Currency>("BTN");

/**
 * The account's currency, read once from the session.
 *
 * An account is native to exactly one currency, so there is no toggle and no
 * secondary reference line — a USDT user sees dollars everywhere and a BTN
 * user sees ngultrum everywhere. There is no exchange rate in this system, so
 * showing both would mean inventing one.
 */
export function CurrencyProvider({
  currency,
  children,
}: {
  currency: Currency | string | null | undefined;
  children: React.ReactNode;
}) {
  const value = useMemo<Currency>(
    () => (currency === "USDT" ? "USDT" : "BTN"),
    [currency],
  );
  // Mirror into the module-level value the pool helpers read, so plain
  // functions like `calcProb` and `calcOdds` — which cannot use a hook —
  // default to the viewer's own book. Set during render rather than in an
  // effect: the first paint must not quote the wrong currency.
  setViewerCurrency(value);
  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): Currency {
  return useContext(CurrencyContext);
}

/** Format in the signed-in account's own currency. */
export function useMoney() {
  const currency = useCurrency();
  return useMemo(
    () => ({
      currency,
      format: (amount: number | string | null | undefined, opts?: { compact?: boolean }) =>
        formatMoney(amount, currency, opts),
      label: currencyLabel(currency),
      isUsdt: currency === "USDT",
    }),
    [currency],
  );
}
