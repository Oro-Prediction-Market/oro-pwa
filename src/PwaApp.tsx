import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

// Eagerly-loaded shell components
import { PwaBottomNav } from "./components/PwaBottomNav";

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
const PwaWalletTmaPage = lazy(() =>
  import("@/pages/TmaWalletPage").then((m) => ({
    default: m.TmaWalletPage,
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
  TrendingUp,
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
import { isTokenValid, clearToken } from "@shared/api/client";

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

const NAV_ITEMS = [
  { to: "/", label: "Feed", icon: LayoutGrid },
  { to: "/results", label: "Results", icon: TrendingUp },
  { to: "/leaderboard", label: "Ranks", icon: Medal },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/challenges", label: "Duels", icon: Swords },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

// ── Hamburger Menu (mobile: full-screen drawer · desktop: dropdown) ───────────

function HamburgerMenu({
  isMobile,
  setShowHowItWorks,
  setShowFaq,
  authed,
  onOpenLogin,
}: {
  isMobile: boolean;
  setShowHowItWorks: (val: boolean) => void;
  setShowFaq: (val: boolean) => void;
  authed: boolean;
  onOpenLogin: () => void;
}) {
  const [open, setOpen] = useState(false);

  function handleLogout() {
    setOpen(false);
    clearToken();
    window.dispatchEvent(new Event("oro:unauthorized"));
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
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
              ))}
              <div
                style={{
                  margin: "6px 16px",
                  borderTop: "1px solid var(--glass-border)",
                }}
              />

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
                onClick={() => setSelectedCategory("All")}
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
              <TrendingUp size={13} strokeWidth={2.5} />
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
                      onClick={() => setSelectedCategory(cat)}
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
            }
          />
          <Route
            path="/profile"
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
                <PwaProfilePage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
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
                <PwaSettingsPage />
              </Suspense>
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Footer hidden on mobile — bottom nav covers primary navigation */}
      {!isMobile && <PwaFooter setShowFaq={setShowFaq} />}

      {/* Spacer for mobile bottom nav so content isn't covered */}
      {isMobile && <div style={{ height: 72, flexShrink: 0 }} />}

      <PwaBottomNav />

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

function PwaFooter({ setShowFaq }: { setShowFaq: (v: boolean) => void }) {
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
            <FooterLink to="/challenges">Duels (1v1)</FooterLink>
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
            <FooterLink to="/wallet">Wallet & Deposit</FooterLink>
            <FooterLink to="/profile">My Portfolio</FooterLink>
            <FooterLink to="/settings">Account Settings</FooterLink>
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

  return (
    <ThemeProvider>
      <FilterProvider>
        <HashRouter>
          <PwaLayout authed={authed} onAuthSuccess={() => setAuthed(true)} />
        </HashRouter>
      </FilterProvider>
    </ThemeProvider>
  );
}
