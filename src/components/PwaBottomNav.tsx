import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Wallet, UserCircle, Swords, Medal, LogIn } from "lucide-react";

interface PwaBottomNavProps {
  authed: boolean;
  onOpenLogin: () => void;
}

export const PwaBottomNav: React.FC<PwaBottomNavProps> = ({ authed, onOpenLogin }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isMobile) return null;

  const publicItems = [
    { to: "/", label: "Feed", icon: LayoutGrid },
    { to: "/leaderboard", label: "Ranks", icon: Medal },
  ];

  const authItems = [
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/challenges", label: "Duels", icon: Swords },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  const navItems = authed ? [...publicItems, ...authItems] : publicItems;

  const navLinkStyle = (isActive: boolean) => ({
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
    textDecoration: "none",
    color: isActive ? "#2775d0" : "var(--text-muted)",
    transition: "all 0.2s ease",
    padding: "8px 12px",
    borderRadius: "12px",
  });

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "70px",
        background: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderTop: "1px solid var(--glass-border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)",
      }}
    >
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => navLinkStyle(isActive)}
        >
          {({ isActive }) => (
            <>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  transition: "transform 0.2s ease",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              />
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {!authed && (
        <button
          onClick={onOpenLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-primary)",
            padding: "8px 12px",
            borderRadius: "12px",
          }}
        >
          <LogIn size={22} strokeWidth={2} />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.01em" }}>
            Sign In
          </span>
        </button>
      )}
    </nav>
  );
};
