import { useCurrency } from "./currency";
import { outcomePool } from "./pools";
import type { Outcome } from "@shared/api/client";

/**
 * One outcome's pool, in the viewer's own currency.
 *
 * A component rather than a helper call so it can read the currency itself.
 * These figures sit inside `.map()` bodies scattered across half a dozen
 * detail screens, and threading a `currency` variable into each of those
 * scopes is how one gets missed — which has happened repeatedly.
 */
export function PoolAmount({
  outcome,
  suffix = "pool",
}: {
  outcome: Pick<Outcome, "totalBetAmount" | "poolsByCurrency">;
  /** Trailing word, or empty for a bare figure. */
  suffix?: string;
}) {
  const currency = useCurrency();
  const amount = outcomePool(outcome, currency);
  return (
    <>
      {currency === "USDT" ? "$" : "Nu"}{" "}
      {amount.toLocaleString(undefined, {
        maximumFractionDigits: currency === "USDT" ? 2 : 0,
      })}
      {suffix ? ` ${suffix}` : ""}
    </>
  );
}
