import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Trash2,
  CheckCheck,
  Check,
  Trophy,
  Coins,
  Award,
  TrendingDown,
  Circle,
  Dot,
  MoreHorizontal,
} from "lucide-react";
import {
  listAllNotifications,
  getUnreadNotificationCount,
  markNotificationsSeen,
  markNotificationsUnread,
  deleteNotifications,
  type UserNotification,
} from "@shared/api/client";

// Poll the unread count on this cadence while signed in, so the bell badge
// stays fresh without a socket. Cheap COUNT query; 45s is plenty for an in-app
// badge and keeps the free-tier backend quiet.
const UNREAD_POLL_MS = 45_000;

// Notifications load a page at a time and fetch more as the user scrolls, so a
// long history never blocks the first paint.
const PAGE_SIZE = 15;
// Prefetch the next page once the user is within this many px of the bottom.
const LOAD_MORE_THRESHOLD_PX = 140;

// Per-type visual treatment. Unknown types fall back to the neutral bell.
function typeStyle(type: string): { Icon: typeof Bell; color: string } {
  switch (type) {
    case "market_won":
      return { Icon: Trophy, color: "var(--color-success)" };
    case "market_lost":
      return { Icon: TrendingDown, color: "var(--color-danger)" };
    case "season_prize":
      return { Icon: Trophy, color: "var(--color-warning)" };
    case "achievement":
    case "collectible":
      return { Icon: Award, color: "var(--color-warning)" };
    case "transaction":
      return { Icon: Coins, color: "var(--color-primary)" };
    default:
      return { Icon: Bell, color: "var(--text-muted)" };
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(then).toLocaleDateString();
}

/** Best-effort deep link from a notification's metadata. */
function linkFor(n: UserNotification): string | null {
  const m = n.metadata || {};
  if (m.marketId) return `/market/${m.marketId}`;
  if (n.type === "transaction") return "/wallet";
  if (n.type === "season_prize") return "/leaderboard";
  if (n.type === "achievement" || n.type === "collectible") return "/profile";
  return null;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Guards against firing overlapping "load more" fetches while one is in
  // flight (state updates are async, so a bare flag can double-fire on scroll).
  const loadingMoreRef = useRef(false);
  // The open row "⋯" menu, positioned fixed (from the button's rect) so the
  // panel's own scroll/overflow can't clip it.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(
    null,
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    getUnreadNotificationCount().then(setUnread).catch(() => {});
  }, []);

  // First page: fast to paint. The unread badge comes from the dedicated count
  // endpoint, not this partial page, so it reflects the full history.
  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listAllNotifications({ limit: PAGE_SIZE });
      setItems(page);
      setHasMore(page.length === PAGE_SIZE);
      refreshCount();
    } finally {
      setLoading(false);
    }
  }, [refreshCount]);

  // Next page, keyed on the oldest loaded row's createdAt cursor. Deduped by id
  // so a createdAt tie at the page boundary can't insert a row twice.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || items.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const before = items[items.length - 1].createdAt;
      const page = await listAllNotifications({ limit: PAGE_SIZE, before });
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...page.filter((p) => !seen.has(p.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, items]);

  // Poll the unread count while mounted (signed in).
  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, UNREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  // Load the first page whenever the panel opens.
  useEffect(() => {
    if (open) loadFirst();
  }, [open, loadFirst]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // The row menu is portaled to <body> (outside rootRef); a click on it must
      // not be read as an outside-click that closes the whole panel.
      if (
        rootRef.current &&
        !rootRef.current.contains(t) &&
        !t.closest("[data-notif-menu-root]")
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The row menu is closed by any panel close, and by a click anywhere that
  // isn't the menu or a "⋯" button (a fixed popover can't rely on overflow).
  useEffect(() => {
    if (!open) {
      setMenu(null);
      setConfirmClear(false);
    }
  }, [open]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-notif-menu-root]")) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const openMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (menu?.id === id) return setMenu(null);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const MENU_H = 92;
    const below = r.bottom + 4;
    const top =
      below + MENU_H > window.innerHeight ? r.top - 4 - MENU_H : below;
    setMenu({ id, top, right: window.innerWidth - r.right });
  };

  const toggleRead = (n: UserNotification) => {
    if (n.seenAt) {
      markNotificationsUnread([n.id]);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, seenAt: null } : x)),
      );
      setUnread((u) => u + 1);
    } else {
      markNotificationsSeen([n.id]);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, seenAt: new Date().toISOString() } : x,
        ),
      );
      setUnread((u) => Math.max(0, u - 1));
    }
  };

  const remove = (id: string) => {
    deleteNotifications([id]);
    setItems((prev) => {
      const gone = prev.find((x) => x.id === id);
      if (gone && !gone.seenAt) setUnread((u) => Math.max(0, u - 1));
      return prev.filter((x) => x.id !== id);
    });
  };

  const markAllRead = () => {
    markNotificationsSeen();
    setItems((prev) =>
      prev.map((x) =>
        x.seenAt ? x : { ...x, seenAt: new Date().toISOString() },
      ),
    );
    setUnread(0);
  };

  const clearAll = () => {
    deleteNotifications();
    setItems([]);
    setUnread(0);
    setHasMore(false);
  };

  const openItem = (n: UserNotification) => {
    setMenu(null);
    if (!n.seenAt) {
      markNotificationsSeen([n.id]);
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, seenAt: new Date().toISOString() } : x,
        ),
      );
    }
    const to = linkFor(n);
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
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
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              boxSizing: "border-box",
              borderRadius: "var(--radius-full)",
              background: "var(--color-danger)",
              border: "2px solid var(--bg-card)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "13px",
              textAlign: "center",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "min(70vh, 560px)",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
            overflow: "hidden",
            zIndex: 3200,
            animation: "notifDrawerIn 0.18s ease-out forwards",
          }}
        >
          <style>{`
            @keyframes notifDrawerIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--glass-border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--text-main)",
              }}
            >
              Notifications
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={markAllRead}
                title="Mark all read"
                disabled={unread === 0}
                style={pillBtn(unread === 0)}
              >
                <CheckCheck size={13} />
                Read all
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                title="Clear all"
                disabled={items.length === 0}
                style={pillBtn(items.length === 0)}
              >
                <Trash2 size={13} />
                Clear all
              </button>
            </div>
          </div>

          {/* Clear-all confirmation */}
          {confirmClear && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-main)",
                }}
              >
                Delete all notifications?
              </span>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setConfirmClear(false)} style={confirmBtn(false)}>
                  No
                </button>
                <button
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                  style={confirmBtn(true)}
                >
                  Yes, clear all
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div
            style={{ overflowY: "auto", flex: 1 }}
            onScroll={(e) => {
              if (menu) setMenu(null);
              const el = e.currentTarget;
              if (
                el.scrollHeight - el.scrollTop - el.clientHeight <
                LOAD_MORE_THRESHOLD_PX
              ) {
                loadMore();
              }
            }}
          >
            {loading && items.length === 0 ? (
              <div style={emptyWrap}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={emptyWrap}>
                <Bell size={26} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div>You're all caught up</div>
              </div>
            ) : (
              items.map((n) => {
                const { Icon, color } = typeStyle(n.type);
                const unreadRow = !n.seenAt;
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: 11,
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--glass-border)",
                      background: unreadRow
                        ? "color-mix(in srgb, var(--color-primary) 7%, transparent)"
                        : "transparent",
                      cursor: linkFor(n) ? "pointer" : "default",
                    }}
                    onClick={() => openItem(n)}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 34,
                        height: 34,
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `color-mix(in srgb, ${color} 16%, transparent)`,
                        color,
                      }}
                    >
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: unreadRow ? 700 : 600,
                            color: "var(--text-main)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {n.title}
                        </span>
                        {unreadRow && (
                          <Circle
                            size={7}
                            fill="var(--color-primary)"
                            color="var(--color-primary)"
                            style={{ flexShrink: 0 }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {n.body}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-subtle)",
                          marginTop: 4,
                        }}
                      >
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {/* Row actions: a single "⋯" opening a small menu */}
                    <div
                      data-notif-menu-root
                      style={{ flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => openMenu(n.id, e)}
                        title="More"
                        aria-label="More options"
                        aria-haspopup="menu"
                        style={iconBtn}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {items.length > 0 && (loadingMore || !hasMore) && (
              <div
                style={{
                  padding: "12px 14px",
                  textAlign: "center",
                  fontSize: 11.5,
                  color: "var(--text-subtle)",
                }}
              >
                {loadingMore ? "Loading more…" : "That's everything"}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Row "⋯" menu — portaled to <body> so no ancestor's transform, filter,
          or overflow can clip or mis-position it; fixed to the button's rect. */}
      {open &&
        menu &&
        (() => {
          const n = items.find((x) => x.id === menu.id);
          if (!n) return null;
          const unreadRow = !n.seenAt;
          return createPortal(
            <div
              role="menu"
              data-notif-menu-root
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: menu.top,
                right: menu.right,
                minWidth: 158,
                padding: 5,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: 12,
                boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                zIndex: 9999,
                animation: "notifDrawerIn 0.14s ease-out forwards",
              }}
            >
              <button
                role="menuitem"
                onClick={() => {
                  toggleRead(n);
                  setMenu(null);
                }}
                style={menuItem()}
              >
                {unreadRow ? <Check size={15} /> : <Dot size={17} />}
                {unreadRow ? "Mark as read" : "Mark as unread"}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  remove(n.id);
                  setMenu(null);
                }}
                style={menuItem("var(--color-danger)")}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>,
            document.body,
          );
        })()}
    </div>
  );
}

const pillBtn = (disabled: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: "var(--radius-full)",
  border: "1px solid var(--glass-border)",
  background: "var(--bg-secondary)",
  color: disabled ? "var(--text-subtle)" : "var(--text-muted)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
};

const confirmBtn = (danger: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  borderRadius: "var(--radius-full)",
  border: danger ? "none" : "1px solid var(--glass-border)",
  background: danger ? "var(--color-danger)" : "var(--bg-card)",
  color: danger ? "#fff" : "var(--text-muted)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

const menuItem = (color?: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 11px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "none",
  color: color ?? "var(--text-main)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
  whiteSpace: "nowrap",
  width: "100%",
});

const emptyWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  color: "var(--text-muted)",
  fontSize: 13,
  textAlign: "center",
};
