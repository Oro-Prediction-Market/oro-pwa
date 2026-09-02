import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  X,
  Trash2,
  CheckCheck,
  Trophy,
  Coins,
  Award,
  TrendingDown,
  Circle,
  Dot,
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

// Per-type visual treatment. Unknown types fall back to the neutral bell.
function typeStyle(type: string): { Icon: typeof Bell; color: string } {
  switch (type) {
    case "market_won":
      return { Icon: Trophy, color: "#22c55e" };
    case "market_lost":
      return { Icon: TrendingDown, color: "#ef4444" };
    case "season_prize":
      return { Icon: Trophy, color: "#f5a623" };
    case "achievement":
    case "collectible":
      return { Icon: Award, color: "#e8c766" };
    case "transaction":
      return { Icon: Coins, color: "#2b6bff" };
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
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    getUnreadNotificationCount().then(setUnread).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAllNotifications({ limit: 40 });
      setItems(list);
      setUnread(list.filter((n) => !n.seenAt).length);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count while mounted (signed in).
  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, UNREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  // Load the full list whenever the panel opens.
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
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
  };

  const openItem = (n: UserNotification) => {
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
          width: 38,
          height: 38,
          borderRadius: 10,
          background: open ? "var(--bg-secondary)" : "none",
          border: "none",
          color: "var(--text-main)",
          cursor: "pointer",
        }}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              boxSizing: "border-box",
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: "16px",
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
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "min(70vh, 560px)",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            overflow: "hidden",
            zIndex: 3200,
          }}
        >
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
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-main)" }}>
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
                onClick={clearAll}
                title="Clear all"
                disabled={items.length === 0}
                style={pillBtn(items.length === 0)}
              >
                <Trash2 size={13} />
                Clear
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
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
                        borderRadius: 9,
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
                            fontSize: 13,
                            fontWeight: unreadRow ? 800 : 600,
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
                    {/* Row actions */}
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleRead(n)}
                        title={unreadRow ? "Mark read" : "Mark unread"}
                        style={iconBtn}
                      >
                        {unreadRow ? <Dot size={16} /> : <Circle size={12} />}
                      </button>
                      <button
                        onClick={() => remove(n.id)}
                        title="Delete"
                        style={iconBtn}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pillBtn = (disabled: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 9px",
  borderRadius: 8,
  border: "1px solid var(--glass-border)",
  background: "none",
  color: disabled ? "var(--text-subtle)" : "var(--text-muted)",
  fontSize: 11.5,
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "none",
  background: "var(--bg-secondary)",
  color: "var(--text-muted)",
  cursor: "pointer",
};

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
