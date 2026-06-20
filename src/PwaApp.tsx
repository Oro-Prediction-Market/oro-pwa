import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";

// Eagerly-loaded shell components
import { PwaBottomNav } from "./components/PwaBottomNav";
import { useSSE } from "@shared/hooks/useSSE";

// All pages are lazy — only the active route's chunk is downloaded
const PwaFeedPage = lazy(() =>
  import("./pages/PwaFeedPage").then((m) => ({ default: m.PwaFeedPage })),
);
const PwaMarketDetailPage = lazy(() =>
  import("./pages/PwaMarketDetailPage").then((m) => ({
    default: m.PwaMarketDetailPage,
  })),
);
const PwaPaymentTestPage = lazy(() =>
  import("./pages/PwaPaymentTestPage").then((m) => ({
    default: m.PwaPaymentTestPage,
  })),
);
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);
const PwaMyBetsPage = lazy(() =>
  import("./pages/PwaMyBetsPage").then((m) => ({ default: m.PwaMyBetsPage })),
);
const PwaResultsPage = lazy(() =>
  import("./pages/PwaResultsPage").then((m) => ({ default: m.PwaResultsPage })),
);

// ── PWA install prompt hook ───────────────────────────────────────────────────

function usePwaInstall() {
  const deferredPrompt = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — no need to prompt
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setAlreadyInstalled(true);
      return;
    }

    // iOS: no beforeinstallprompt — show manual instructions
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as any).MSStream;
    if (ios) {
      setIsIos(true);
      return;
    }

    const android = /android/i.test(navigator.userAgent);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If beforeinstallprompt never fires on Android (e.g. Firefox),
    // fall back to manual instructions after a short wait.
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (android) {
      fallbackTimer = setTimeout(() => {
        if (!deferredPrompt.current) setIsAndroid(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      deferredPrompt.current = null;
      setCanInstall(false);
    }
  };

  return { canInstall, isIos, isAndroid, alreadyInstalled, install };
}

// Mark as PWA mode so TMA-specific SDK calls (backButton etc.) are skipped
if (typeof window !== "undefined") {
  (window as any).__PWA_MODE__ = true;
}

// Lazy-load the heavier TMA pages — they only need the JWT token to work in PWA
const PwaLeaderboardPage = lazy(() =>
  import("@/pages/TmaLeaderboardPage").then((m) => ({
    default: m.TmaLeaderboardPage,
  })),
);
const PwaChallengesPage = lazy(() =>
  import("@/pages/TmaChallengesPage").then((m) => ({
    default: m.TmaChallengesPage,
  })),
);
const PwaProfilePage = lazy(() =>
  import("@/pages/TmaProfilePage").then((m) => ({
    default: m.TmaProfilePage,
  })),
);
const PwaSettingsPage = lazy(() =>
  import("@/pages/TmaSettingsPage").then((m) => ({
    default: m.TmaSettingsPage,
  })),
);
const PwaResolvedPage = lazy(() =>
  import("@/pages/ResolvedMarketsPage").then((m) => ({
    default: m.ResolvedMarketsPage,
  })),
);
const PwaWorldCupPage = lazy(() =>
  import("./pages/WorldCupHubPage").then((m) => ({
    default: m.WorldCupHubPage,
  })),
);
const PwaBplPage = lazy(() =>
  import("./pages/BplHubPage").then((m) => ({
    default: m.BplHubPage,
  })),
);
const PwaWalletTmaPage = lazy(() =>
  import("@/pages/TmaWalletPage").then((m) => ({
    default: () => <m.TmaWalletPage isPwa />,
  })),
);

import { publicUrl } from "@shared/helpers/publicUrl.ts";
import { ThemeProvider } from "@shared/contexts/ThemeContext";
import { OroLogo } from "@shared/components/OroLogo";
import { FilterProvider, useFilter } from "@shared/contexts/FilterContext";
import {
  Search,
  CircleHelp,
  LayoutGrid,
  Medal,
  Wallet,
  Swords,
  UserCircle,
  Menu,
  X as XIcon,
  LogOut,
  LogIn,
  ArrowLeft,
  CheckCircle,
  History,
} from "lucide-react";
import { ProtectedRoute } from "./components/ProtectedRoute";
// Lazy-load HowItWorksModal — only needed on click
const HowItWorksModal = lazy(() =>
  import("./components/HowItWorksModal").then((m) => ({
    default: m.HowItWorksModal,
  })),
);
const FaqModal = lazy(() =>
  import("./components/FaqModal").then((m) => ({
    default: m.FaqModal,
  })),
);
// Lazy TonConnect provider — scoped to the /wallet route only (835 KiB saved on all other routes)
const LazyTonConnectProvider = lazy(() =>
  import("@tonconnect/ui-react").then((m) => ({
    default: function TonConnectProvider({
      children,
      manifestUrl,
    }: {
      children: React.ReactNode;
      manifestUrl: string;
    }) {
      return (
        <m.TonConnectUIProvider manifestUrl={manifestUrl}>
          {children}
        </m.TonConnectUIProvider>
      );
    },
  })),
);
import React from "react";
import { isTokenValid, clearToken, logoutApi, refreshAuth } from "@shared/api/client";

// ── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/leaderboard": "Leaderboard",
  "/profile": "Profile",
  "/challenges": "Duels",
  "/resolved": "Resolution Record",
  "/wallet": "Wallet",
  "/my-bets": "My Positions",
  "/results": "Results",
  "/terms": "Terms & Conditions",
  "/privacy": "Privacy Policy",
};

function PageTitleBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = PAGE_TITLES[pathname];
  const isMobile = window.innerWidth < 768;
  if (!title) return null;
  if (isMobile) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "20px var(--space-md) 0",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--bg-secondary)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-main)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
      </button>
      <h1
        style={{
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: 900,
          color: "var(--text-main)",
          letterSpacing: "-0.03em",
          fontFamily: "var(--font-display)",
        }}
      >
        {title}
      </h1>
    </div>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS_PUBLIC = [
  { to: "/", label: "Feed", icon: LayoutGrid },
  { to: "/results", label: "Results", icon: History },
  { to: "/leaderboard", label: "Ranks", icon: Medal },
];

const NAV_ITEMS_AUTH = [
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/challenges", label: "Duels", icon: Swords },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const NAV_ITEMS = [...NAV_ITEMS_PUBLIC, ...NAV_ITEMS_AUTH];

// ── Hamburger Menu (mobile: full-screen drawer · desktop: dropdown) ───────────

function HamburgerMenu({
  isMobile,
  setShowHowItWorks,
  setShowFaq,
  authed,
  onOpenLogin,
  canInstall,
  isIos,
  isAndroid,
  onInstall,
}: {
  isMobile: boolean;
  setShowHowItWorks: (val: boolean) => void;
  setShowFaq: (val: boolean) => void;
  authed: boolean;
  onOpenLogin: () => void;
  canInstall: boolean;
  isIos: boolean;
  isAndroid: boolean;
  onInstall: () => void;
}) {
  const [open, setOpen] = useState(false);

  function handleLogout() {
    setOpen(false);
    logoutApi().then(() => window.dispatchEvent(new Event("oro:unauthorized")));
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: open ? "var(--bg-card)" : "var(--bg-secondary)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-main)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Open menu"
      >
        {open ? <XIcon size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9990,
              background: isMobile ? "rgba(0,0,0,0.4)" : "transparent",
            }}
          />

          {/* Desktop dropdown */}
          {!isMobile ? (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                zIndex: 9991,
                minWidth: 220,
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: 14,
                boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                backdropFilter: "var(--glass-blur)",
                WebkitBackdropFilter: "var(--glass-blur)",
                overflow: "hidden",
                animation: "drawerIn 0.18s ease-out forwards",
              }}
            >
              <style>{`
                @keyframes drawerIn {
                  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                  to   { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
              {(authed ? NAV_ITEMS : NAV_ITEMS_PUBLIC).map(
                ({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 18px",
                      textDecoration: "none",
                      color: isActive
                        ? "var(--color-primary)"
                        : "var(--text-main)",
                      background: isActive
                        ? "rgba(39,117,208,0.07)"
                        : "transparent",
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 800 : 600,
                      borderLeft: isActive
                        ? "3px solid var(--color-primary)"
                        : "3px solid transparent",
                      transition: "background 0.12s",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={16}
                          strokeWidth={isActive ? 2.5 : 2}
                          color={
                            isActive
                              ? "var(--color-primary)"
                              : "var(--text-muted)"
                          }
                        />
                        {label}
                      </>
                    )}
                  </NavLink>
                ),
              )}
              <div
                style={{
                  margin: "6px 16px",
                  borderTop: "1px solid var(--glass-border)",
                }}
              />

              {(canInstall || isIos || isAndroid) && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onInstall();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "calc(100% - 24px)",
                    margin: "0 12px 6px",
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(16,185,129,0.3)",
                    background: "rgba(16,185,129,0.08)",
                    color: "#10b981",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install App
                </button>
              )}
              {!authed && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenLogin();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "calc(100% - 24px)",
                    margin: "0 12px 12px",
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(39,117,208,0.3)",
                    background: "rgba(39,117,208,0.08)",
                    color: "var(--color-primary)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <LogIn size={15} />
                  Sign In
                </button>
              )}
              {authed && (
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "calc(100% - 24px)",
                    margin: "0 12px 12px",
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.25)",
                    background: "rgba(239,68,68,0.06)",
                    color: "#ef4444",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            /* Mobile drawer — only actions (nav is in bottom bar) */
            <div
              style={{
                position: "fixed",
                top: 60,
                left: 0,
                right: 0,
                zIndex: 9991,
                background: "var(--glass-bg)",
                backdropFilter: "var(--glass-blur)",
                WebkitBackdropFilter: "var(--glass-blur)",
                borderBottom: "1px solid var(--glass-border)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                padding: "16px 16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                animation: "drawerIn 0.2s ease-out forwards",
              }}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  setShowHowItWorks(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  padding: "14px",
                  borderRadius: 14,
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-main)",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <CircleHelp size={16} />
                How it works
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  setShowFaq(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  padding: "14px",
                  borderRadius: 14,
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-main)",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                FAQ
              </button>

              {(canInstall || isIos || isAndroid) && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onInstall();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid rgba(16,185,129,0.3)",
                    background: "rgba(16,185,129,0.08)",
                    color: "#10b981",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install App
                </button>
              )}
              {!authed && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenLogin();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid rgba(39,117,208,0.3)",
                    background: "rgba(39,117,208,0.08)",
                    color: "var(--color-primary)",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <LogIn size={18} />
                  Sign In
                </button>
              )}
              {authed && (
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid rgba(239,68,68,0.25)",
                    background: "rgba(239,68,68,0.06)",
                    color: "#ef4444",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Polymarket-style Search ───────────────────────────────────────────────────

function PwaSearch({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { searchQuery, setSearchQuery } = useFilter();
  const [isFocused, setIsFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Compact (mobile): icon-only that expands on click
  if (compact) {
    return (
      <div style={{ position: "relative" }}>
        {expanded ? (
          <>
            <div
              onClick={() => {
                setExpanded(false);
                setSearchQuery("");
              }}
              style={{ position: "fixed", inset: 0, zIndex: 9990 }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 9991,
                width: 260,
                background: "var(--bg-card)",
                border: "1.5px solid var(--color-primary)",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                boxShadow: "0 8px 24px -4px rgba(39,117,208,0.25)",
              }}
            >
              <Search
                size={15}
                color="var(--color-primary)"
                style={{ flexShrink: 0 }}
              />
              <input
                autoFocus
                type="text"
                placeholder="Search markets…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "10px 10px",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              />
            </div>
          </>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Search size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={
        fullWidth
          ? { position: "relative", width: "100%" }
          : {
              position: "relative",
              width: isFocused ? 260 : 200,
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }
      }
    >
      <Search
        size={15}
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: isFocused ? "var(--color-primary)" : "var(--text-subtle)",
          transition: "color 0.2s",
          pointerEvents: "none",
        }}
      />
      <input
        type="text"
        placeholder={fullWidth ? "Search markets..." : "Search markets…"}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: isFocused ? "var(--bg-card)" : "var(--bg-secondary)",
          border: isFocused
            ? "1.5px solid var(--color-primary)"
            : "1px solid var(--glass-border)",
          borderRadius: fullWidth ? 8 : 22,
          padding: fullWidth ? "12px 16px 12px 38px" : "9px 16px 9px 38px",
          color: "var(--text-main)",
          fontSize: fullWidth ? "0.95rem" : "0.85rem",
          fontWeight: 600,
          outline: "none",
          transition: "all 0.2s ease",
          boxShadow: isFocused
            ? "0 6px 16px -4px rgba(39,117,208,0.2)"
            : "none",
        }}
      />
      {fullWidth && (
        <div
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--bg-card)",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 4,
            pointerEvents: "none",
            border: "1px solid var(--glass-border)",
          }}
        >
          /
        </div>
      )}
    </div>
  );
}

// ── Auth Gate — wraps protected routes ───────────────────────────────────────

function AuthGate({
  authed,
  onAuthSuccess,
  children,
}: {
  authed: boolean;
  onAuthSuccess: () => void;
  children: React.ReactNode;
}) {
  if (!authed) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "var(--space-xl) var(--space-md) 100px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(39,117,208,0.06)",
            border: "1px solid rgba(39,117,208,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--text-main)",
              fontWeight: 700,
            }}
          >
            Sign in to access this feature
          </p>
          <a
            href="https://t.me/OroPredictBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              background: "var(--grad-primary)",
              color: "#fff",
              fontSize: "0.82rem",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Open Oro in Telegram
          </a>
        </div>
        <ProtectedRoute onLogin={onAuthSuccess} />
      </div>
    );
  }
  return <>{children}</>;
}

// ── Layout ───────────────────────────────────────────────────────────────────

function PwaLayout({
  authed,
  onAuthSuccess,
}: {
  authed: boolean;
  onAuthSuccess: () => void;
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const { canInstall, isIos, isAndroid, install } = usePwaInstall();

  function handleInstall() {
    if (isIos) {
      setShowIosInstall(true);
      return;
    }
    if (isAndroid && !canInstall) {
      setShowAndroidInstall(true);
      return;
    }
    install();
  }
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  function showToast(message: string, type: "success" | "info" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleAuthSuccess() {
    setShowLoginModal(false);
    onAuthSuccess();
    showToast("Signed in successfully", "success");
  }

  useEffect(() => {
    const onLogout = () => showToast("Signed out", "info");
    window.addEventListener("oro:unauthorized", onLogout);
    return () => window.removeEventListener("oro:unauthorized", onLogout);
  }, []);
  const {
    selectedCategory,
    setSelectedCategory,
    setSelectedSubcategory,
    availableCategories,
    hasTrendingMarkets,
  } = useFilter();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "var(--text-main)",
        fontFamily: "var(--font-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="mesh-bg" />

      {/* ── Toast notification ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? 80 : 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderRadius: 14,
            background:
              toast.type === "success"
                ? "rgba(16,185,129,0.95)"
                : "rgba(100,116,139,0.95)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.88rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
            animation: "fadeScaleIn 0.2s ease-out",
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle size={16} />
          {toast.message}
        </div>
      )}

      {/* ── Login modal (rendered outside header to avoid transform stacking context) ── */}
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-main)",
              borderRadius: 20,
              padding: "24px 4px",
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "fadeScaleIn 0.2s ease-out",
            }}
          >
            <style>{`@keyframes fadeScaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
            <ProtectedRoute onLogin={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* ── iOS install instructions ── */}
      {showIosInstall && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowIosInstall(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-card)",
              borderRadius: 20,
              padding: "28px 24px 32px",
              animation: "fadeScaleIn 0.2s ease-out",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              Install Oro
            </p>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Tap the Share button in your browser toolbar and choose{" "}
              <b>Add to Home Screen</b>.
            </p>

            {/* Step-by-step visual guide */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                margin: "0 0 20px",
                textAlign: "left",
              }}
            >
              {[
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  ),
                  label: "Tap the Share button",
                  sub: "The box-with-arrow icon in your browser's toolbar",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                  label: "Add to Home Screen",
                  sub: "Scroll down in the share sheet and tap this option",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ),
                  label: "Tap Add",
                  sub: "Confirm by tapping Add in the top-right corner",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--color-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--text-main)",
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowIosInstall(false)}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Android install instructions ── */}
      {showAndroidInstall && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAndroidInstall(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-card)",
              borderRadius: 20,
              padding: "28px 24px 32px",
              animation: "fadeScaleIn 0.2s ease-out",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "var(--text-main)",
              }}
            >
              Install Oro
            </p>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Tap your browser's menu and choose <b>Add to Home Screen</b> or{" "}
              <b>Install app</b>.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                margin: "0 0 20px",
                textAlign: "left",
              }}
            >
              {[
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="5" r="1" fill="currentColor" />
                      <circle cx="12" cy="12" r="1" fill="currentColor" />
                      <circle cx="12" cy="19" r="1" fill="currentColor" />
                    </svg>
                  ),
                  label: "Open browser menu",
                  sub: "Tap the three-dot (⋮) menu icon in the top-right corner of your browser",
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                  label: "Add to Home Screen",
                  sub: 'Tap "Add to Home Screen" or "Install app" from the menu',
                },
                {
                  icon: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ),
                  label: "Tap Add",
                  sub: "Confirm the prompt to install Oro on your home screen",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--color-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--text-main)",
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAndroidInstall(false)}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 14,
                border: "1px solid var(--glass-border)",
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Top bar (Polymarket-style Two-tier) ── */}
      <header
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--glass-border)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3000,
        }}
      >
        {/* ROW 1: Logo, Search, Actions */}
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 var(--space-md)",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Left: Logo */}
          <NavLink
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <OroLogo size={62} />
            {/* <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "var(--text-main)",
                lineHeight: 1,
                position: "relative",
                zIndex: 1,
              }}
            >
              ORO
            </span> */}
          </NavLink>

          {/* Spacer on mobile */}
          {isMobile && <div style={{ flex: 1 }} />}

          {/* Middle: Giant Search (Desktop) */}
          {!isMobile && (
            <div style={{ flex: 1, maxWidth: 640 }}>
              <PwaSearch fullWidth />
            </div>
          )}

          {/* Spacer to push actions to right on desktop */}
          {!isMobile && <div style={{ flex: 1 }} />}

          {/* Right actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 10 : 16,
              flexShrink: 0,
            }}
          >
            {/* Compact search icon on mobile (matches desktop search UX) */}
            {isMobile && <PwaSearch compact />}

            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  onClick={() => setShowHowItWorks(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <CircleHelp size={16} />
                  How it works
                </button>
                <button
                  onClick={() => setShowFaq(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  FAQ
                </button>
                <a
                  href="https://t.me/OroPredictBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 10,
                    background: "var(--grad-primary)",
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    boxShadow: "0 4px 10px rgba(39,117,208,0.2)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-1px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  Open in Telegram
                </a>
              </div>
            )}

            <HamburgerMenu
              isMobile={isMobile}
              setShowHowItWorks={setShowHowItWorks}
              setShowFaq={setShowFaq}
              authed={authed}
              onOpenLogin={() => setShowLoginModal(true)}
              canInstall={canInstall}
              isIos={isIos}
              isAndroid={isAndroid}
              onInstall={handleInstall}
            />
          </div>
        </div>

        {/* ROW 2: Sub-Nav — unified horizontal-scroll nav links + categories */}
        <div style={{ borderTop: "1px solid var(--glass-border)" }}>
          <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
          <div
            className="hide-scrollbar"
            style={{
              maxWidth: isMobile ? "none" : 1240,
              margin: "0 auto",
              padding: isMobile ? "0 14px" : "0 var(--space-md)",
              height: isMobile ? 42 : 48,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 16 : 24,
              overflowX: "auto",
              whiteSpace: "nowrap",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {hasTrendingMarkets && (
              <NavLink
                to="/"
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedSubcategory("All");
                }}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  textDecoration: "none",
                  fontSize: isMobile ? "0.82rem" : "0.88rem",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "var(--text-main)" : "var(--text-muted)",
                  flexShrink: 0,
                })}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                Trending
              </NavLink>
            )}

            <NavLink
              to="/results"
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
                fontSize: isMobile ? "0.82rem" : "0.88rem",
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "var(--text-main)" : "var(--text-muted)",
                flexShrink: 0,
              })}
            >
              <History size={13} strokeWidth={2.5} />
              Results
            </NavLink>

            {availableCategories.filter((cat) => cat !== "All").length > 0 && (
              <>
                <div
                  style={{
                    width: 1,
                    height: 14,
                    background: "var(--glass-border)",
                    flexShrink: 0,
                  }}
                />
                {availableCategories
                  .filter((cat) => cat !== "All")
                  .map((cat) => (
                    <NavLink
                      key={cat}
                      to="/"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedSubcategory("All");
                      }}
                      style={({ isActive }) => ({
                        textDecoration: "none",
                        fontSize: isMobile ? "0.82rem" : "0.88rem",
                        fontWeight:
                          isActive && selectedCategory === cat ? 800 : 600,
                        color:
                          isActive && selectedCategory === cat
                            ? "var(--text-main)"
                            : "var(--text-muted)",
                        cursor: "pointer",
                        flexShrink: 0,
                        textTransform: "capitalize",
                      })}
                    >
                      {cat}
                    </NavLink>
                  ))}
              </>
            )}
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          position: "relative",
          paddingTop: isMobile ? 106 : 112,
          paddingBottom: isMobile
            ? "calc(70px + env(safe-area-inset-bottom))"
            : 0,
        }}
      >
        <PageTitleBar />
        <Routes>
          <Route
            path="/"
            element={
              <PwaFeedPage authed={authed} onAuthRequired={onAuthSuccess} />
            }
          />
          <Route path="/markets" element={<Navigate to="/" />} />
          <Route
            path="/market/:id"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaMarketDetailPage />
              </Suspense>
            }
          />
          <Route path="/payment-test" element={<PwaPaymentTestPage />} />
          <Route
            path="/terms"
            element={
              <Suspense fallback={null}>
                <TermsPage />
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <Suspense fallback={null}>
                <PrivacyPage />
              </Suspense>
            }
          />
          <Route
            path="/wallet"
            element={
              <AuthGate authed={authed} onAuthSuccess={onAuthSuccess}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading…
                    </div>
                  }
                >
                  <LazyTonConnectProvider
                    manifestUrl={publicUrl("tonconnect-manifest.json")}
                  >
                    <PwaWalletTmaPage />
                  </LazyTonConnectProvider>
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="/my-bets"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaMyBetsPage />
              </Suspense>
            }
          />
          <Route
            path="/results"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaResultsPage />
              </Suspense>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaLeaderboardPage />
              </Suspense>
            }
          />
          <Route
            path="/challenges"
            element={
              <AuthGate authed={authed} onAuthSuccess={onAuthSuccess}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading…
                    </div>
                  }
                >
                  <PwaChallengesPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGate authed={authed} onAuthSuccess={onAuthSuccess}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading…
                    </div>
                  }
                >
                  <PwaProfilePage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGate authed={authed} onAuthSuccess={onAuthSuccess}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading…
                    </div>
                  }
                >
                  <PwaSettingsPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="/resolved"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaResolvedPage />
              </Suspense>
            }
          />
          <Route
            path="/world-cup"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaWorldCupPage />
              </Suspense>
            }
          />
          <Route
            path="/bpl"
            element={
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <PwaBplPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {isMobile && !authed && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 500 }}>
              © {new Date().getFullYear()} Oro Markets
            </p>
            <span style={{ color: "var(--glass-border)", fontSize: "0.72rem" }}>·</span>
            <NavLink to="/terms" style={{ color: "var(--text-subtle)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 600 }}>Terms</NavLink>
            <span style={{ color: "var(--glass-border)", fontSize: "0.72rem" }}>·</span>
            <NavLink to="/privacy" style={{ color: "var(--text-subtle)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 600 }}>Privacy</NavLink>
            <span style={{ color: "var(--glass-border)", fontSize: "0.72rem" }}>·</span>
            <a href="https://t.me/OroPredictBot" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 700 }}>Telegram</a>
          </div>
        )}
      </main>

      {/* Footer hidden on mobile — bottom nav covers primary navigation */}
      {!isMobile && <PwaFooter setShowFaq={setShowFaq} authed={authed} />}

      {/* Spacer for mobile bottom nav so content isn't covered */}
      {isMobile && <div style={{ height: 72, flexShrink: 0 }} />}

      <PwaBottomNav
        authed={authed}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* How It Works Modal (Slider) */}
      {showHowItWorks && (
        <Suspense fallback={null}>
          <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
        </Suspense>
      )}

      {/* FAQ Modal (Numbered List) */}
      {showFaq && (
        <Suspense fallback={null}>
          <FaqModal onClose={() => setShowFaq(false)} />
        </Suspense>
      )}
    </div>
  );
}

function PwaFooter({
  setShowFaq,
  authed,
}: {
  setShowFaq: (v: boolean) => void;
  authed: boolean;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "#0a111a",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "80px 24px 40px",
        marginTop: "80px",
        color: "#fff",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 48,
            marginBottom: 60,
          }}
        >
          {/* Brand Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                opacity: 0.6,
                filter: "grayscale(1)",
              }}
            >
              <OroLogo size={64} />
              {/* <span style={{ fontSize: "1.75rem", fontWeight: 950, letterSpacing: "-0.04em", marginLeft: -4, color: "rgba(255,255,255,0.6)" }}>ORO</span> */}
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Premier prediction market platform. Compete on sports, economics,
              and local events with Ngultrum.
            </p>
          </div>

          {/* Links Columns */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h4
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Markets
            </h4>
            <FooterLink to="/">Active Feed</FooterLink>
            <FooterLink to="/leaderboard">Leaderboard</FooterLink>
            {authed && <FooterLink to="/challenges">Duels (1v1)</FooterLink>}
            <FooterLink to="/results">Settled Markets</FooterLink>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h4
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Platform
            </h4>
            <button
              onClick={() => setShowFaq(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                textAlign: "left",
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
              }
            >
              FAQ
            </button>
            {authed && <FooterLink to="/wallet">Wallet & Deposit</FooterLink>}
            {authed && <FooterLink to="/profile">My Portfolio</FooterLink>}
            {authed && <FooterLink to="/settings">Account Settings</FooterLink>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h4
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Connect
            </h4>
            <a
              href="https://t.me/OroPredictBot"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>
                  Telegram
                </span>
                <span
                  style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 500 }}
                >
                  Telegram Supported
                </span>
              </div>
            </a>
            <a
              href="mailto:oro@21.tech.bt"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>
                  Email
                </span>
                <span
                  style={{ fontSize: "0.75rem", opacity: 0.6, fontWeight: 500 }}
                >
                  oro@21.tech.bt
                </span>
              </div>
            </a>
          </div>
        </div>

        <div
          style={{
            paddingTop: 40,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.3)",
              fontWeight: 500,
            }}
          >
            © {currentYear} Oro Markets. Predict the future.
          </p>
          <div style={{ display: "flex", gap: 32 }}>
            <FooterLink to="/terms">
              <span
                style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}
              >
                Terms of Service
              </span>
            </FooterLink>
            <FooterLink to="/privacy">
              <span
                style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}
              >
                Privacy Policy
              </span>
            </FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      style={{
        color: "rgba(255,255,255,0.5)",
        textDecoration: "none",
        fontSize: "0.95rem",
        fontWeight: 600,
        transition: "color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
      }
    >
      {children}
    </NavLink>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────

export function PwaApp() {
  const [authed, setAuthed] = useState(() => isTokenValid());
  const [bootstrapping, setBootstrapping] = useState(!isTokenValid());

  // On mount, attempt to restore session from the httpOnly cookie.
  // The in-memory token is wiped on every page refresh, but the cookie
  // persists for 7 days — calling /auth/refresh hands us a fresh JWT.
  useEffect(() => {
    if (isTokenValid()) {
      setBootstrapping(false);
      return;
    }
    refreshAuth().then((data) => {
      if (data?.token) setAuthed(true);
      setBootstrapping(false);
    });
  }, []);

  // Connect to SSE for real-time server push (balance updates, market changes)
  useSSE();

  // Listen for 401s from the API client — force back to login
  useEffect(() => {
    const handler = () => {
      clearToken();
      setAuthed(false);
    };
    window.addEventListener("oro:unauthorized", handler);
    return () => window.removeEventListener("oro:unauthorized", handler);
  }, []);

  // Proactive token expiry check every 60 seconds — catches expiry while idle
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        clearToken();
        setAuthed(false);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [authed]);

  if (bootstrapping) return null;

  return (
    <HelmetProvider>
      <ThemeProvider>
        <FilterProvider>
          <BrowserRouter future={{ v7_startTransition: true }}>
            <PwaLayout authed={authed} onAuthSuccess={() => setAuthed(true)} />
          </BrowserRouter>
        </FilterProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
