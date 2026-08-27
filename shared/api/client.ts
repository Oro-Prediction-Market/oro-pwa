// ─────────────────────────────────────────────────────────────────────────────
// API client — all requests to the NestJS backend go through here
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// JWT lives only in memory — never persisted to localStorage to prevent XSS token theft.
// Session is restored on page reload via the httpOnly "oro_auth" cookie + GET /auth/refresh.
let _token: string | null = null;
let _refreshInFlight: Promise<{ token: string; user: any } | null> | null = null;

export function setToken(token: string) {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function clearToken() {
  _token = null;
}

/**
 * Called once on app start. Reads the httpOnly "oro_auth" cookie server-side
 * and returns a fresh in-memory token without exposing the cookie to JS.
 * Returns null if no valid session exists.
 */
export async function refreshAuth(): Promise<{ token: string; user: any } | null> {
  // App shell and auth hooks can mount together (and twice in Strict Mode).
  // Share one request so that never becomes a refresh-request burst.
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = (async () => {
    try {
      let res = await fetch(`${API_URL}/auth/refresh`, { method: "GET", credentials: "include", headers: { "Content-Type": "application/json" } });
      if (res.status === 429) {
        const seconds = Math.max(1, Number(res.headers.get("retry-after")) || 1);
        await new Promise((resolve) => window.setTimeout(resolve, seconds * 1000));
        res = await fetch(`${API_URL}/auth/refresh`, { method: "GET", credentials: "include", headers: { "Content-Type": "application/json" } });
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.token) { setToken(data.token); return data; }
      return null;
    } catch { return null; }
  })();
  try { return await _refreshInFlight; } finally { _refreshInFlight = null; }
}

/**
 * Calls POST /auth/logout to revoke the JWT on the server and clear the
 * httpOnly cookie, then wipes the in-memory token.
 */
export async function logoutApi(): Promise<void> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers,
    });
  } catch {
    // Best-effort — always clear local state regardless
  } finally {
    clearToken();
  }
}

// Decode a JWT payload without a library — returns null if malformed
export function decodeTokenPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

// Returns true if the stored token exists and has not expired
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  // exp is in seconds; give a 30-second buffer
  return payload.exp * 1000 > Date.now() + 30_000;
}

/**
 * URL for the CORS-friendly avatar proxy. Telegram's photo hosts don't send
 * CORS headers on the image itself, so the share-card <canvas> can't draw them
 * directly without tainting (which breaks PNG export). This backend route
 * re-serves the photo from our origin with proper CORS.
 */
export function avatarUrl(userId: string): string {
  return `${API_URL}/users/avatar/${encodeURIComponent(userId)}`;
}

// ─── In-app notifications ─────────────────────────────────────────────────────

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

/** Unseen in-app notifications for the current user (popped once on app open). */
export function getMyNotifications(): Promise<UserNotification[]> {
  return request<UserNotification[]>("/users/me/notifications").catch(() => []);
}

/** Mark notifications seen (by id, or all unseen when omitted) so they don't pop again. */
export function markNotificationsSeen(
  ids?: string[],
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/users/me/notifications/seen", {
    method: "POST",
    body: JSON.stringify(ids?.length ? { ids } : {}),
  })
    .catch(() => ({ ok: false }))
    .then((r) => {
      bustCache("/users/me/notifications");
      return r;
    });
}

/** Report unlocked achievement badges so the backend creates a one-time
 *  notification per new badge. `seenIds` baselines already-acknowledged badges. */
export function syncAchievements(
  badges: { id: string; name: string; requirement?: string }[],
  seenIds: string[] = [],
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/users/me/achievements/sync", {
    method: "POST",
    body: JSON.stringify({ badges, seenIds }),
  })
    .catch(() => ({ ok: false }))
    .then((r) => {
      bustCache("/users/me/notifications");
      return r;
    });
}

// ─── In-memory GET cache (stale-while-revalidate, 15s TTL) ───────────────────
const _cache = new Map<
  string,
  { data: unknown; expiresAt: number; inflight?: Promise<unknown> }
>();
const CACHE_TTL_MS = 5_000;

export function bustCache(pathPrefix?: string) {
  if (!pathPrefix) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    if (key.startsWith(pathPrefix)) _cache.delete(key);
  }
}

async function fetchAndCache<T>(
  path: string,
  options: RequestInit,
  cacheKey: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const err = await res.json().catch(() => ({ message: "Unauthorized" }));
    // OTP verification endpoints return 401 for wrong codes — don't treat as session expiry
    const isOtpEndpoint =
      path.includes("verify-phone-otp") || path.includes("send-phone-otp");
    if (!isOtpEndpoint) {
      clearToken();
      window.dispatchEvent(new Event("oro:unauthorized"));
    }
    throw new Error(err.message || "Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const data: T = await res.json();
  _cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

// Base fetch wrapper — automatically attaches Bearer token
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const cacheKey = isGet ? `${path}::${_token ?? ""}` : null;

  if (cacheKey) {
    const hit = _cache.get(cacheKey);
    if (hit) {
      if (hit.expiresAt > Date.now()) return hit.data as T;
      // Stale — serve cached value but revalidate in background
      if (!hit.inflight) {
        hit.inflight = fetchAndCache<T>(path, options, cacheKey)
          .catch(() => undefined)
          .finally(() => {
            const entry = _cache.get(cacheKey);
            if (entry) entry.inflight = undefined;
          });
      }
      return hit.data as T;
    }
    return fetchAndCache<T>(path, options, cacheKey);
  }

  // Non-GET: never cache, bust any cached version of this path
  bustCache(path);
  return fetchAndCache<T>(path, options, `__nocache__${Date.now()}`);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  balance: string;
  creditsBalance?: number;
  createdAt?: string;
  /**
   * The account's currency, fixed at signup and never changed.
   *
   * Absent on older sessions, so treat anything other than "USDT" as BTN —
   * the overwhelming majority of accounts, and the safe default.
   */
  currency?: "BTN" | "USDT";
  /** Only meaningful for email/USDT accounts; BTN accounts stay "none". */
  kycStatus?: "none" | "pending" | "approved" | "rejected";
  /**
   * Whether this account may hold a USDT wallet beside its native currency.
   *
   * A Bhutanese account holds ngultrum natively; if it has proved its identity
   * — an approved document, or a linked DK Bank account — it can also hold
   * USDT deposited from an outside wallet. The two never mix and there is no
   * rate between them, so never add {@link usdtBalance} to `balance`.
   */
  canHoldUsdt?: boolean;
  /** Whether identity is proved well enough to fund that wallet. */
  usdtVerified?: boolean;
  /** The USDT wallet's balance. Null when the account has no second wallet. */
  usdtBalance?: number | null;
  // DK Bank linking fields
  dkCid?: string | null;
  dkAccountName?: string | null;
  telegramLinkedAt?: string | null;
  // Boolean flags — hashes are never sent to the client
  isDkPhoneLinked?: boolean;
  isPhoneVerified?: boolean;
  // Reputation
  reputationScore?: number | null;
  reputationTier?: string;
  totalPredictions?: number;
  correctPredictions?: number;
  categoryScores?: Record<string, { correct: number; total: number }> | null;
  // Contrarian badge
  contrarianBadge?: "bronze" | "silver" | "gold" | null;
  contrarianWins?: number;
  contrarianAttempts?: number;
  // Daily bet streak
  betStreakCount?: number;
  dayInCycle?: number;
  nextBoostInDays?: number;
  boostReady?: boolean;
  // Referrals
  referralCount?: number;
  featuredAchievementIds?: string[];
  // Season-scoped EPL/UCL tallies for the season collectible badges, keyed by
  // season (e.g. "2026-27"). Counts only that season's settled predictions.
  seasonBadgeStats?: Record<
    string,
    { eplSettled: number; eplWins: number; uclSettled: number; uclWins: number }
  >;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Login / register using Telegram initData (HMAC validated on server) */
export async function loginWithTelegram(
  initData: string,
  referralCode?: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({
      initData,
      ...(referralCode ? { referralCode } : {}),
    }),
  });
  setToken(result.token);
  return result;
}

/** Login / register using DK Bank CID — for PWA users without Telegram */
export async function loginWithDKBank(
  cid: string,
  password?: string,
  referralCode?: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/dkbank", {
    method: "POST",
    body: JSON.stringify({
      cid,
      ...(password ? { password } : {}),
      ...(referralCode ? { referralCode } : {}),
    }),
  });
  setToken(result.token);
  return result;
}

/**
 * Sign in with Google.
 *
 * The credential is Google's ID token — a signed JWT. We never parse it here:
 * anything read client-side is attacker-controlled, so email, name and subject
 * are all taken from the server's verified copy.
 *
 * `isNew` says the account was created by this call, which is the cue to send
 * the user to identity verification rather than to the feed. Google proves the
 * address is real; it says nothing about who owns it, so deposits stay gated on
 * an approved document.
 */
export async function loginWithGoogle(
  code: string,
  referralCode?: string,
): Promise<AuthResponse & { isNew: boolean }> {
  const result = await request<AuthResponse & { isNew: boolean }>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify({
        // Authorization-code (popup) flow — the backend exchanges this for
        // tokens and verifies the resulting ID token.
        code,
        ...(referralCode ? { referralCode } : {}),
      }),
    },
  );
  setToken(result.token);
  return result;
}

/**
 * Send a footer "contact support" feedback message. The destination inbox lives
 * only on the server (env SUPPORT_EMAIL) — we never learn or send the address.
 */
export async function sendFeedback(
  email: string,
  message: string,
): Promise<{ ok: true }> {
  return request<{ ok: true }>("/feedback", {
    method: "POST",
    body: JSON.stringify({ email, message }),
  });
}

/**
 * A protected first-time merge (an existing verified account) returns this
 * instead of a token: the server sent a one-time code to the DK-registered
 * phone, and login completes via {@link verifyBhutanAppMerge}.
 */
export interface BhutanAppOtpRequired {
  requiresOtp: true;
  challengeId: string;
  maskedPhone: string;
}

export function isBhutanAppOtpRequired(
  r: AuthResponse | BhutanAppOtpRequired,
): r is BhutanAppOtpRequired {
  return (r as BhutanAppOtpRequired).requiresOtp === true;
}

export async function loginWithBhutanApp(payload: {
  token: string;
  externalUserId: string;
  fullName: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  referralCode?: string;
}): Promise<AuthResponse | BhutanAppOtpRequired> {
  const result = await request<AuthResponse | BhutanAppOtpRequired>(
    "/auth/bhutanapp",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  // A protected-account merge returns no token yet — don't store anything.
  if (!isBhutanAppOtpRequired(result)) {
    setToken(result.token);
  }
  return result;
}

/**
 * Complete a protected BhutanApp merge by submitting the one-time code sent to
 * the DK-registered phone. Returns a normal auth session on success.
 */
export async function verifyBhutanAppMerge(
  challengeId: string,
  otp: string,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/bhutanapp/verify-merge", {
    method: "POST",
    body: JSON.stringify({ challengeId, otp }),
  });
  setToken(result.token);
  return result;
}

/**
 * Check whether the account for a given CID has a PWA password set.
 * Used by the PWA login form to know whether to show the password field.
 */
export async function getPwaStatus(
  cid: string,
): Promise<{ hasPassword: boolean }> {
  return request<{ hasPassword: boolean }>(
    `/auth/pwa-status?cid=${encodeURIComponent(cid)}`,
  );
}

/**
 * Set or change the PWA login password from inside the TMA.
 * Requires a valid JWT (TMA session).
 */
export async function setPwaPassword(
  password: string,
): Promise<{ ok: boolean; message: string }> {
  return request("/auth/set-pwa-password", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/**
 * Link a DK Bank CID to the currently authenticated Telegram user.
 * Requires a valid JWT. Stores dkPhoneHash on the user row so that
 * the bot's /verify phone check can compare Telegram phone == DK phone.
 */
/**
 * PWA-only: send a 6-digit SMS OTP to the supplied phone number so the user
 * can verify ownership. The verified phone is later used for withdrawal OTPs
 * (PWA users have no Telegram chat).
 */
export async function sendPwaPhoneOtp(
  phoneNumber: string,
): Promise<{ ok: boolean; message: string }> {
  return request("/auth/pwa/send-phone-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

/** PWA-only: verify the SMS OTP. Returns the refreshed user object. */
export async function verifyPwaPhoneOtp(
  otp: string,
): Promise<{ ok: boolean; user: AuthUser }> {
  const result = await request<{ ok: boolean; user: AuthUser }>(
    "/auth/pwa/verify-phone-otp",
    { method: "POST", body: JSON.stringify({ otp }) },
  );
  bustCache("/users/me");
  return result;
}

/**
 * PWA-only: enter a CID to link (and optionally merge) with an existing
 * TMA/DK Bank account. If another user owns this CID, their balance is
 * transferred to the caller and a JWT for that user is returned.
 */
export async function linkCidAccount(
  cid: string,
): Promise<AuthResponse & { merged: boolean }> {
  const result = await request<AuthResponse & { merged: boolean }>(
    "/auth/link-cid",
    { method: "POST", body: JSON.stringify({ cid }) },
  );
  setToken(result.token);
  bustCache("/users/me");
  return result;
}

export async function linkDKBank(cid: string): Promise<AuthResponse> {
  const result = await request<AuthResponse>("/auth/link-dkbank", {
    method: "POST",
    body: JSON.stringify({ cid }),
  });
  // Bust the /users/me cache so the next getMe() call reflects the newly
  // linked DK Bank account instead of returning the 15s stale snapshot.
  bustCache("/users/me");
  return result;
}

/**
 * Verify phone from Telegram.WebApp.requestContact() inside the TMA.
 * The hash is signed by Telegram with the bot token — the backend verifies
 * this signature before trusting the phone number.
 */
export async function verifyPhoneTma(params: {
  phoneNumber: string;
  userId: number;
  authDate: number;
  hash: string;
}): Promise<{
  linked: boolean;
  requiresAccountVerification?: boolean;
  message: string;
}> {
  const result = await request<{
    linked: boolean;
    requiresAccountVerification?: boolean;
    message: string;
  }>("/auth/verify-phone-tma", {
    method: "POST",
    body: JSON.stringify(params),
  });
  // Bust the /users/me cache so isPhoneVerified is reflected immediately.
  bustCache("/users/me");
  return result;
}

/**
 * Fallback verification for users whose Telegram phone differs from their
 * DK Bank registered phone. User proves ownership by entering account number.
 */
export async function verifyDKAccount(
  accountNumber: string,
): Promise<{ verified: boolean; message: string }> {
  const result = await request<{ verified: boolean; message: string }>(
    "/auth/verify-dk-account",
    {
      method: "POST",
      body: JSON.stringify({ accountNumber }),
    },
  );
  bustCache("/users/me");
  return result;
}

// ─── Markets ─────────────────────────────────────────────────────────────────

export interface Outcome {
  id: string;
  label: string;
  /**
   * The **BTN** book's pool. Not the total across currencies — nothing in this
   * product ever adds them. Use {@link Outcome.poolsByCurrency} when quoting a
   * stake in anything else.
   */
  totalBetAmount: string;
  /** Pool per currency, e.g. `{ BTN: 12000, USDT: 340 }`. */
  poolsByCurrency?: Record<string, number>;
  /**
   * LMSR probability per currency.
   *
   * `lmsrProbability` below is the **BTN** book's value — the engine writes it
   * only for ngultrum stakes. Using it for a USDT viewer shows odds derived
   * from another currency's money.
   */
  lmsrByCurrency?: Record<string, number>;
  currentOdds: string;
  lmsrProbability?: number;
  reputationSignal?: number | null;
  intelligenceProb?: number | null;
  isWinner: boolean;
  /** True once this outcome is eliminated (e.g. a team knocked out). No new bets accepted. */
  isEliminated?: boolean;
  marketId: string;
  imageUrl?: string | null;
}

export interface SignalMeta {
  participantCount: number;
  reputationDepth: number;
  maturityScore: number;
  composite: number;
}

export interface MarketBookView {
  currency: "BTN" | "USDT";
  /** Minimum stake, in that currency. Chosen per book, never converted. */
  minStake: number;
  houseEdgePct: number;
  totalPool: number;
}

export interface Market {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageUrlAlt: string | null;
  status:
    | "upcoming"
    | "open"
    | "closed"
    | "resolving"
    | "resolved"
    | "settled"
    | "cancelled";
  liquidityParam: string;
  /** The BTN book's pool. See {@link MarketBookView} for the others. */
  totalPool: string;
  houseEdgePct: string;
  /**
   * The currency books this market accepts.
   *
   * BTN is always present — its book is created on the first ngultrum stake,
   * so most markets have no row for it while still accepting it perfectly
   * well, and the server synthesises the terms the engine would apply. A
   * currency absent from this list is refused by the engine.
   */
  books?: MarketBookView[];
  opensAt: string | null;
  closesAt: string | null;
  bettingClosesAt: string | null;
  resolvedAt: string | null;
  proposedOutcomeId: string | null;
  resolvedOutcomeId: string | null;
  disputeDeadlineAt: string | null;
  resolutionCriteria: string | null;
  category: string | null;
  subcategory: string | null;
  externalSource: string | null;
  externalMarketType: string | null;
  settlementSource: string | null;
  /** Non-null for grouped multi-binary events (e.g. political races): all
   *  sibling Yes/No candidate markets share one groupId. */
  groupId: string | null;
  /** Umbrella event title shared by all markets in the group. */
  groupTitle: string | null;
  metadata: Record<string, any> | null;
  evidenceNote: string | null;
  signalMeta: SignalMeta | null;
  /** Admin-pinned featured flag — hub feature slots prefer this market. */
  isFeatured: boolean;
  createdAt: string;
  outcomes: Outcome[];
}

export type DisputeSide = "object" | "support";
export type DisputeBondStatus =
  | "locked"
  | "rewarded"
  | "forfeited"
  | "not_applicable";

export interface Dispute {
  id: string;
  userId: string;
  marketId: string;
  bondAmount: string;
  reason: string | null;
  /** "object" challenges the proposal; "support" defends it. */
  side: DisputeSide;
  /** true = this side won, false = lost, null = not settled yet. */
  upheld: boolean | null;
  bondStatus: DisputeBondStatus;
  /** Reward paid on top of the returned bond when this side won; "0" otherwise. */
  rewardAmount: string;
  createdAt: string;
}

export interface SubmitDisputePayload {
  reason: string;
  /** Only the FIRST objector may set this (min 10). Others match automatically — omit it. */
  bondAmount?: number;
  /** "object" (default) challenges the proposal; "support" defends it. */
  side?: DisputeSide;
}

export function getDisputes(marketId: string): Promise<Dispute[]> {
  return request<Dispute[]>(`/markets/${marketId}/disputes`);
}

/** The caller's OWN dispute for a market — result + bond + reward, or null. */
export interface MyDispute {
  id: string;
  reason: string | null;
  side: DisputeSide;
  /** true = this side won, false = lost, null = not settled yet. */
  upheld: boolean | null;
  bondAmount: string;
  bondStatus: DisputeBondStatus;
  /** Reward paid on top of the returned bond when this side won; "0" otherwise. */
  rewardAmount: string;
  createdAt: string;
}

export function getMyDispute(marketId: string): Promise<MyDispute | null> {
  return request<MyDispute | null>(`/markets/${marketId}/my-dispute`);
}

/** A dispute the caller raised on some market, with its settled result. */
export interface MyDisputeSummary {
  id: string;
  marketId: string;
  marketTitle: string | null;
  side: DisputeSide;
  /** true = this side won, false = lost, null = not settled yet. */
  upheld: boolean | null;
  bondAmount: string;
  bondStatus: DisputeBondStatus;
  rewardAmount: string;
  createdAt: string;
}

export function getMyDisputes(): Promise<MyDisputeSummary[]> {
  return request<MyDisputeSummary[]>("/markets/my-disputes");
}

export interface DisputeInfo {
  /** OBJECT-side count. */
  objectionCount: number;
  objectCount: number;
  supportCount: number;
  windowOpen: boolean;
  windowClosesAt: string | null;
  windowMinutes: number;
  canObject: boolean;
  /** Fixed per-head bond once the first objector set it; null until then. */
  bondRequired: number | null;
  /** true once the bond is locked in for everyone (after the first objection). */
  bondFixed: boolean;
  /** Floor for the first objector's chosen bond. */
  minBond: number;
  bondNote: string;
}

export function getDisputeInfo(marketId: string): Promise<DisputeInfo> {
  return request<DisputeInfo>(`/markets/${marketId}/dispute-info`);
}

export function submitDispute(
  marketId: string,
  payload: SubmitDisputePayload,
): Promise<Dispute> {
  return request<Dispute>(`/markets/${marketId}/disputes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ActivityEvent {
  type: "bet" | "win";
  userName: string;
  outomeLabel: string; // note: matches backend spelling
  marketTitle: string;
  marketId: string;
  amount: number;
  placedAt: string;
}

export function getRecentActivity(): Promise<ActivityEvent[]> {
  return request<ActivityEvent[]>("/markets/activity");
}

export function feedHeartbeat(sessionId: string): Promise<{ count: number }> {
  return request<{ count: number }>("/markets/feed/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function getMarkets(q?: string): Promise<Market[]> {
  const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return request<Market[]>(`/markets${qs}`);
}

export function getMarket(id: string): Promise<Market> {
  return request<Market>(`/markets/${id}`);
}

export interface ResolvedMarket {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageUrlAlt: string | null;
  category: string | null;
  subcategory: string | null;
  status: "resolved" | "settled";
  totalPool: number;
  resolutionCriteria: string | null;
  createdAt: string;
  opensAt: string | null;
  closesAt: string | null;
  resolvedAt: string | null;
  participantCount: number;
  winner: { id: string; label: string } | null;
  objectionCount: number;
  outcomeChanged: boolean;
  evidence: {
    url: string | null;
    note: string | null;
    submittedAt: string | null;
  };
}

export function getResolvedMarkets(): Promise<ResolvedMarket[]> {
  return request<ResolvedMarket[]>("/markets/resolved");
}

// ─── Bets ─────────────────────────────────────────────────────────────────────

export interface PlaceBetPayload {
  outcomeId: string;
  amount: number;
  /**
   * Which wallet the stake comes from.
   *
   * Omit for the account's native currency, which is what every screen does
   * today. Only send it when the user is deliberately spending a second
   * wallet — the server refuses a currency the account cannot hold.
   */
  currency?: "BTN" | "USDT";
}

export interface BetStreak {
  count: number;
  dayInCycle: number;
  boostActive: boolean;
}

export interface PlaceBetResult {
  id: string;
  streak?: BetStreak;
  [key: string]: any;
}

export function placeBet(
  marketId: string,
  payload: PlaceBetPayload,
): Promise<PlaceBetResult> {
  bustCache(`/markets/${marketId}`);
  bustCache("/markets");
  return request<PlaceBetResult>(`/markets/${marketId}/bets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface Bet {
  id: string;
  amount: number;
  status: "pending" | "won" | "lost" | "refunded";
  oddsAtPlacement: number | null;
  payout: number | null;
  placedAt: string;
  marketId: string;
  outcomeId: string;
  market?: Market;
  outcome?: Outcome;
}

export interface Transaction {
  /**
   * True while a withdrawal has been debited but not yet sent.
   *
   * The debit happens the moment the money is reserved; the transfer happens
   * only after an admin approves it and 21Pay confirms. Rendering the two
   * identically tells someone their money has left when it has not.
   */
  isPending?: boolean;
  /** `pending_approval` | `approved` | `rejected`, for withdrawal rows. */
  withdrawalState?: string;

  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "bet_placed"
    | "bet_payout"
    | "refund"
    | "dispute_bond"
    | "dispute_refund"
    | "dispute_bond_lock"
    | "dispute_bond_forfeit"
    | "dispute_bond_reward"
    | "referral_bonus"
    | "referral_prize"
    | "streak_bonus"
    | "duel_wager"
    | "duel_payout"
    | "free_credit"
    | "season_prize";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note: string | null;
  positionId: string | null;
  paymentId: string | null;
  stakeAmount: number | null;
  createdAt: string;
}

export function getMyBets(status?: Bet["status"]): Promise<Bet[]> {
  const qs = status ? `?status=${status}` : "";
  return request<Bet[]>(`/users/me/bets${qs}`);
}

export function getMyResults(): Promise<Bet[]> {
  return request<Bet[]>("/users/me/results");
}

// ─── User ─────────────────────────────────────────────────────────────────────

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/users/me");
}
export function setFeaturedAchievements(achievementIds: string[]): Promise<{ featuredAchievementIds: string[] }> {
  return request("/users/me/featured-achievements", { method: "POST", body: JSON.stringify({ achievementIds }) });
}

export interface PublicProfile {
  id: string; firstName: string | null; lastName: string | null; username: string | null;
  photoUrl: string | null; reputationTier: string; reputationScore: number | null;
  totalPredictions: number; correctPredictions: number; winRate: number; rank: number | null;
  betStreak?: number; contrarianBadge: string | null; contrarianWins: number; joinedAt: string;
  featuredAchievementIds?: string[];
  seasonBadgeStats?: Record<
    string,
    { eplSettled: number; eplWins: number; uclSettled: number; uclWins: number }
  >;
  recentCalls?: Array<{ id: string; marketTitle: string; outcomeLabel: string; status: "won" | "lost" | "refunded"; payout: number | null; placedAt: string }>;
}
export function getPublicProfile(id: string): Promise<PublicProfile> {
  return request<PublicProfile>(`/users/profiles/${encodeURIComponent(id)}`);
}

export function getMyTransactions(
  type?: Transaction["type"],
): Promise<Transaction[]> {
  const qs = type ? `?type=${type}` : "";
  return request<Transaction[]>(`/users/me/transactions${qs}`);
}

// ─── TON Wallet Betting ──────────────────────────────────────────────────────

export interface WalletBetPayload {
  outcomeId: string;
  amount: number; // in TON
  walletAddress: string;
  txHash?: string; // proof of payment
}

/** Place a bet using TON wallet (no login required) */
export async function placeBetWithWallet(
  marketId: string,
  payload: WalletBetPayload,
) {
  bustCache(`/markets/${marketId}`);
  bustCache("/markets");
  // No auth token needed — wallet address is the identifier
  const res = await fetch(`${API_URL}/markets/${marketId}/bets/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/** Get bets by wallet address (no login required) */
export function getBetsByWallet(walletAddress: string) {
  return fetch(`${API_URL}/bets/wallet/${walletAddress}`).then((r) =>
    r.ok ? r.json() : Promise.reject(r.statusText),
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  reputationScore: number | null;
  reputationTier: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  totalBetAmount: number;
  /** Effective daily-bet streak (0 when a day has been missed). */
  betStreak?: number;
  weeklyPredictions?: number;
  weeklyWins?: number;
  isMe: boolean;
}

export interface LeaderboardResponse {
  board: LeaderboardEntry[];
  myRank: number | null;
  totalRanked: number;
}

export function getLeaderboard(
  period: "all" | "week" = "all",
): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>(`/users/leaderboard?period=${period}`);
}

// ─── Challenges (Prediction Duels) ───────────────────────────────────────────

export type CardType = "doubleDown" | "shield" | "ghost";

export interface CardInventory {
  doubleDown: number;
  shield: number;
  ghost: number;
}

export interface ChallengeResponse {
  id: string;
  marketId: string;
  marketTitle: string | null;
  outcomeId: string;
  outcomeLabel: string | null;
  creatorId: string;
  creatorName: string | null;
  joinerId: string | null;
  joinerName: string | null;
  winnerId: string | null;
  /** null when Ghost card is active and viewer is not the creator */
  wagerAmount: number | null;
  isOwner: boolean;
  participantCount: number;
  status: "open" | "active" | "settled" | "expired" | "void";
  equippedCard: CardType | null;
  expiresAt: string;
  settledAt: string | null;
  createdAt: string;
  link: string;
}

export interface DuelLeaderboardEntry {
  userId: string;
  username: string | null;
  wins: number;
  wagerWon: number;
}

export function createChallenge(
  marketId: string,
  outcomeId: string,
  wagerAmount: number = 0,
  equippedCard?: CardType,
): Promise<ChallengeResponse> {
  return request<ChallengeResponse>("/challenges", {
    method: "POST",
    body: JSON.stringify({
      marketId,
      outcomeId,
      wagerAmount,
      ...(equippedCard ? { equippedCard } : {}),
    }),
  });
}

export function getMyCards(): Promise<CardInventory> {
  return request<CardInventory>("/challenges/cards");
}

export function getChallenges(): Promise<ChallengeResponse[]> {
  return request<ChallengeResponse[]>("/challenges");
}

export function getOpenChallenges(): Promise<ChallengeResponse[]> {
  return request<ChallengeResponse[]>("/challenges/open");
}

export function getDuelLeaderboard(): Promise<DuelLeaderboardEntry[]> {
  return request<DuelLeaderboardEntry[]>("/challenges/leaderboard");
}

export function joinChallenge(challengeId: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(`/challenges/${challengeId}/join`, {
    method: "POST",
  });
}

/** Minimal challenge info shown before sign-in, from a `challenge_<id>` deep link. */
export interface ChallengePreview {
  id: string;
  marketId: string;
  marketTitle: string | null;
  marketStatus: string | null;
  outcomeId: string;
  outcomeLabel: string | null;
  creatorName: string;
  wagerAmount: number | null;
  status: string;
  expiresAt: string | null;
}

/** Public — no auth required. Resolves a challenge deep link to its market. */
export function getChallengePreview(
  challengeId: string,
): Promise<ChallengePreview> {
  return request<ChallengePreview>(`/challenges/${challengeId}/preview`);
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export interface Season {
  id: string;
  weekNumber: number;
  year: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "closed";
  winnersSnapshot:
    | {
        rank: number;
        userId: string;
        firstName: string | null;
        username: string | null;
        reputationScore: number | null;
        reputationTier: string;
        winRate: number;
      }[]
    | null;
  createdAt: string;
}

export function getCurrentSeason(): Promise<Season | null> {
  return request<Season | null>("/users/seasons/current");
}

export function getSeasonHistory(limit = 10): Promise<Season[]> {
  return request<Season[]>(`/users/seasons/history?limit=${limit}`);
}

// ─── Referral ─────────────────────────────────────────────────────────────────

export interface ReferralStats {
  referralLink: string;
  referredCount: number;
  convertedCount: number;
  totalEarned: number;
  flatBonus: number;
  betPct: number;
  cap: number;
  prizeThreshold: number;
  prizeAmount: number;
  prizeClaimed: boolean;
}

export function getReferralStats(): Promise<ReferralStats> {
  return request<ReferralStats>("/users/me/referral");
}

// ── Behavioural event tracking ────────────────────────────────────────────────

export type TrackEventPayload = {
  eventType: string;
  sessionId?: string;
  platform?: "tma" | "pwa";
  meta?: Record<string, any>;
};

/** Fire-and-forget — never throws, never blocks UI. */
export function trackEvent(payload: TrackEventPayload): void {
  request<void>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently discard — tracking must never break the user flow
  });
}

// ── TER Price API ─────────────────────────────────────────────────────────────

export interface TerPrice {
  midPrice: number;
  buyPrice: number;
  sellPrice: number;
  xauUsd: number;
  usdInr: number;
  fetchedAt: string;
}

/**
 * Fetch current TER price (cached 30s on backend).
 * Used by TER market cards and detail pages to show live prices.
 */
export function getTerPrice(): Promise<TerPrice> {
  return request<TerPrice>("/ter/price");
}

/**
 * Fetch recent TER price history (sampled every 5s on the backend).
 * Used to seed the live chart instantly on first page load.
 */
export function getTerPriceHistory(): Promise<TerPrice[]> {
  return request<TerPrice[]>("/ter/price/history");
}

// ── BTC Price API ─────────────────────────────────────────────────────────────

export interface BtcPrice {
  price: number;
  source: "binance" | "coinbase";
  fetchedAt: string;
}

export function getBtcPrice(): Promise<BtcPrice> {
  return request<BtcPrice>("/btc/price");
}

/**
 * Fetch recent BTC price history (sampled every 2s on the backend).
 * Used to seed the live chart instantly on first page load.
 */
export function getBtcPriceHistory(): Promise<BtcPrice[]> {
  return request<BtcPrice[]>("/btc/price/history");
}

// ─── EPL live data (standings + player stats, from apifootball.com) ───────────

export interface EplStandingRow {
  position: number;
  teamName: string;
  teamBadge: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface EplStandings {
  updatedAt: string;
  table: EplStandingRow[];
}

export interface EplStatEntry {
  player: string;
  club: string;
  clubBadge: string;
  face: string; // primary player photo (FPL); "" when unavailable
  faceBackup: string; // secondary player photo (TheSportsDB); "" when none
  value: number;
}

export interface EplStats {
  updatedAt: string;
  goals: EplStatEntry[];
  assists: EplStatEntry[];
  yellow: EplStatEntry[];
  red: EplStatEntry[];
}

export function getEplStandings(): Promise<EplStandings> {
  return request<EplStandings>("/epl/standings");
}

export function getEplStats(): Promise<EplStats> {
  return request<EplStats>("/epl/stats");
}

export interface EplSeason {
  started: boolean;
  seasonStart: string | null;
  maxPlayed: number;
}

export function getEplSeason(): Promise<EplSeason> {
  return request<EplSeason>("/epl/season");
}

// ── UEFA Champions League (same shapes as EPL) ────────────────────────────────
export type UclStandingRow = EplStandingRow;
export type UclStandings = EplStandings;
export type UclStatEntry = EplStatEntry;
export type UclStats = EplStats;
export type UclSeason = EplSeason;

export function getUclStandings(): Promise<UclStandings> {
  return request<UclStandings>("/ucl/standings");
}

export function getUclStats(): Promise<UclStats> {
  return request<UclStats>("/ucl/stats");
}

export function getUclSeason(): Promise<UclSeason> {
  return request<UclSeason>("/ucl/season");
}

export interface UclBracketTeam {
  name: string;
  short: string;
  crest: string;
}
export interface UclBracketMatch {
  a: UclBracketTeam | null;
  b: UclBracketTeam | null;
  winner: "a" | "b" | null;
}
export interface UclBracketRound {
  key: string;
  label: string;
  matches: UclBracketMatch[];
}
export interface UclBracket {
  updatedAt: string;
  season: string | null;
  hasData: boolean;
  decided: boolean;
  rounds: UclBracketRound[];
}

export function getUclBracket(): Promise<UclBracket> {
  return request<UclBracket>("/ucl/bracket");
}

// ── Market suggestions ("Ask the Crowd") ─────────────────────────────────────

export interface MarketSuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  votes: number;
  creator: string;
  createdAt: string;
  votedByMe: boolean;
  marketId: string | null;
}

export interface SuggestionQuota {
  canSuggest: boolean;
  used: number;
  limit: number;
  resetsAt: string;
}

export function getSuggestions(): Promise<MarketSuggestion[]> {
  return request<MarketSuggestion[]>("/suggestions");
}

export function getSuggestionQuota(): Promise<SuggestionQuota> {
  return request<SuggestionQuota>("/suggestions/quota");
}

export function createSuggestion(payload: {
  title: string;
  description?: string;
  category?: string;
}): Promise<{ id: string; status: string }> {
  return request("/suggestions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function voteSuggestion(
  id: string,
): Promise<{ votes: number; votedByMe: boolean }> {
  return request(`/suggestions/${id}/vote`, { method: "POST" });
}

// ── USDT rail (21 Pay) ───────────────────────────────────────────────────────
//
// Every display string here — network names, confirmation hints, the Tron gas
// warning, explorer links — comes from the backend. The client deliberately
// keeps no per-chain table of its own: one that drifts from what the rail
// actually supports is how a user is shown a chain nobody is watching.

// ─── KYC ─────────────────────────────────────────────────────────────────────

export type KycDocumentType =
  | "passport"
  | "national_id"
  | "residence_permit";

export interface KycStatusResponse {
  status: "none" | "pending" | "approved" | "rejected";
  submittedAt: string | null;
  reviewedAt: string | null;
  /** Only ever set when `status` is `rejected`. */
  rejectionReason: string | null;
  /** False while a document is under review, and once approved. */
  canSubmit: boolean;
}

/**
 * Live verification state.
 *
 * Always fetch this rather than reading `kycStatus` off the session user: the
 * session was minted at login and does not change when a reviewer approves.
 */
export function getKycStatus(): Promise<KycStatusResponse> {
  return request<KycStatusResponse>("/kyc/status");
}

export function submitKycDocument(body: {
  documentType: KycDocumentType;
  documentNumber: string;
  documentCountry: string;
  imageBase64: string;
  mimeType: string;
}): Promise<{ status: string }> {
  return request<{ status: string }>("/kyc/documents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface UsdtNetwork {
  id: string;
  /** Spelled out, never a chain id. */
  name: string;
  confirmationHint: string;
  warning: string | null;
}

export type UsdtIntentStatus =
  | "awaiting_deposit"
  | "confirming"
  | "accepted"
  | "confirmed"
  | "confirmed_partial"
  | "confirmed_overpaid"
  | "completed_via_topup"
  | "expired"
  | "failed";

export interface UsdtDepositIntent {
  intentId: string;
  network: string;
  depositAddress: string;
  amountUsdt: string;
  amountBaseUnits: string;
  detectedAmountUsdt: string | null;
  status: UsdtIntentStatus;
  expiresAt: string;
  txHash: string | null;
  explorerUrl: string | null;
}

export interface UsdtDestination {
  id: string;
  network: string;
  address: string;
  label: string | null;
  status: "cooldown" | "active" | "disabled";
  /** When a cooling-down address becomes usable. */
  usableAt: string | null;
}

export interface UsdtWithdrawal {
  id: string;
  network: string;
  amountUsdt: string;
  approvalStatus: "pending_approval" | "approved" | "rejected";
  remoteStatus: string | null;
  txHash: string | null;
  failureReason: string | null;
  needsManualReview: boolean;
  createdAt: string;
}

/** Networks this account may deposit on right now. May be empty. */
export function getUsdtNetworks(): Promise<{ networks: UsdtNetwork[] }> {
  return request("/payments/usdt/networks");
}

/**
 * `clientRequestId` must be generated once per deposit attempt and reused on
 * retry — the server keys idempotency on it, so a double-tap replays the same
 * intent instead of burning another derived address.
 */
export function createUsdtDeposit(body: {
  network: string;
  amountUsdt: string;
  clientRequestId: string;
}): Promise<UsdtDepositIntent> {
  return request("/payments/usdt/deposit-intent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getUsdtDeposit(id: string): Promise<UsdtDepositIntent> {
  return request(`/payments/usdt/deposit-intent/${id}`);
}

export function listUsdtDeposits(): Promise<UsdtDepositIntent[]> {
  return request("/payments/usdt/deposit-intents");
}

/** Top up an underpaid or expired deposit, reusing the same address. */
export function topUpUsdtDeposit(
  id: string,
  clientRequestId: string,
): Promise<UsdtDepositIntent> {
  return request(`/payments/usdt/deposit-intent/${id}/topup`, {
    method: "POST",
    body: JSON.stringify({ clientRequestId }),
  });
}

export function listUsdtDestinations(): Promise<UsdtDestination[]> {
  return request("/payments/usdt/destinations");
}

export function addUsdtDestination(body: {
  network: string;
  address: string;
  label?: string;
}): Promise<UsdtDestination> {
  return request("/payments/usdt/destinations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function requestUsdtWithdrawal(body: {
  destinationId: string;
  amountUsdt: string;
  clientRequestId: string;
}): Promise<UsdtWithdrawal> {
  return request("/payments/usdt/withdrawals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listUsdtWithdrawals(): Promise<UsdtWithdrawal[]> {
  return request("/payments/usdt/withdrawals");
}
