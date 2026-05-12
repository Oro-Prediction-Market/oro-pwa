import { useEffect, useState, useMemo } from "react";
import {
  getLeaderboard,
  getMe,
  getCurrentSeason,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type AuthUser,
} from "@shared/api/client";
import { LoadingScreen } from "@shared/components/LoadingScreen";
import {
  Medal,
  TrendingUp,
  BarChart2,
  CheckCircle,
  Flame,
  Sprout,
  Search,
  Target,
  Zap,
  Crown,
} from "lucide-react";

type Period = "all" | "week" | "month";

// ── Tier helpers ──────────────────────────────────────────────────────────────

function tierLabel(tier: string) {
  return tier === "legend"
    ? "Legend"
    : tier === "hot_hand"
      ? "Hot Hand"
      : tier === "sharpshooter"
        ? "Sharpshooter"
        : "Rookie";
}

function tierColor(tier: string) {
  return tier === "legend"
    ? "#f59e0b"
    : tier === "hot_hand"
      ? "#22c55e"
      : tier === "sharpshooter"
        ? "#3b82f6"
        : "#94a3b8";
}

function tierIcon(tier: string, size = 12) {
  if (tier === "legend") return <Crown size={size} color="#f59e0b" />;
  if (tier === "hot_hand") return <Flame size={size} color="#22c55e" />;
  if (tier === "sharpshooter") return <Target size={size} color="#3b82f6" />;
  return <Sprout size={size} color="#94a3b8" />;
}

export function PwaLeaderboardPage() {
  const [period, setPeriod] = useState<Period>("all");
  const [lb, setLb] = useState<LeaderboardResponse | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [currentSeason, setCurrentSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([getLeaderboard(), getMe(), getCurrentSeason()])
      .then(([res, user, season]) => {
        setLb(res);
        setMe(user);
        setCurrentSeason(season);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const filteredEntries = useMemo(() => {
    if (!lb) return [];
    if (!searchQuery) return lb.board;
    const q = searchQuery.toLowerCase();
    return lb.board.filter(
      (e: LeaderboardEntry) =>
        e.username?.toLowerCase().includes(q) ||
        e.firstName?.toLowerCase().includes(q) ||
        e.lastName?.toLowerCase().includes(q),
    );
  }, [lb, searchQuery]);

  const top3 = useMemo(() => filteredEntries.slice(0, 3), [filteredEntries]);
  const others = useMemo(() => filteredEntries.slice(3), [filteredEntries]);

  const myRank = lb?.myRank;

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <div className="mesh-bg" />

      {/* Decorative Glows */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          left: "5%",
          width: 400,
          height: 400,
          background: "rgba(39, 117, 208, 0.05)",
          filter: "blur(120px)",
          borderRadius: "50%",
          zIndex: -1,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          right: "5%",
          width: 400,
          height: 400,
          background: "rgba(34, 197, 94, 0.05)",
          filter: "blur(120px)",
          borderRadius: "50%",
          zIndex: -1,
        }}
      />

      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 100px" }}
      >
        {/* Header Hero */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(39,117,208,0.1)",
              padding: "6px 16px",
              borderRadius: 99,
              marginBottom: 16,
              border: "1px solid rgba(39,117,208,0.2)",
            }}
          >
            <Zap
              size={14}
              color="var(--color-primary)"
              fill="var(--color-primary)"
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "var(--color-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Live Rankings{" "}
              {currentSeason && `· Season ${currentSeason.number}`}
            </span>
          </div>
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: 950,
              color: "var(--text-main)",
              letterSpacing: "-0.05em",
              margin: "0 0 12px",
              fontFamily: "var(--font-display)",
            }}
          >
            The Hall of{" "}
            <span
              style={{
                background: "var(--grad-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Elite
            </span>
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-muted)",
              fontWeight: 600,
              maxWidth: 600,
              margin: "0 auto 32px",
            }}
          >
            The most accurate predictors on the planet, ranked by precision,
            volume, and reputation.
          </p>

          {/* Period Selection - Center Fixed */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-card)",
              padding: 6,
              borderRadius: 16,
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-lg)",
              backdropFilter: "var(--glass-blur)",
            }}
          >
            {(["week", "month", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    period === p ? "var(--grad-primary)" : "transparent",
                  color: period === p ? "#fff" : "var(--text-muted)",
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  textTransform: "capitalize",
                }}
              >
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingScreen message="Calculating global standings..." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 40,
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
              {/* Immersive Podium */}
              {!searchQuery && top3.length >= 3 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: 20,
                    padding: "60px 0 40px",
                    perspective: "1000px",
                  }}
                >
                  <EnhancedPodiumCard entry={top3[1]} rank={2} />
                  <EnhancedPodiumCard entry={top3[0]} rank={1} featured />
                  <EnhancedPodiumCard entry={top3[2]} rank={3} />
                </div>
              )}

              {/* Main List Section */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    padding: "0 12px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: "var(--text-main)",
                    }}
                  >
                    Standings
                  </h3>
                  <div style={{ position: "relative", width: 260 }}>
                    <Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-subtle)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Find a predictor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 40px",
                        borderRadius: 12,
                        background: "var(--bg-card)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-main)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {(searchQuery ? filteredEntries : others).map(
                    (entry: LeaderboardEntry) => (
                      <PremiumEntryRow
                        key={entry.rank}
                        entry={entry}
                        isMe={entry.isMe}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar: Personal Performance Card */}
            <div style={{ position: "sticky", top: 100 }}>
              {me && (
                <div
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: 32,
                    padding: 32,
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-premium)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Card Glow Effect */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: "var(--grad-primary)",
                    }}
                  />

                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div
                      style={{
                        position: "relative",
                        display: "inline-block",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: "50%",
                          border: `3px solid ${tierColor(me.reputationTier || "rookie")}`,
                          padding: 4,
                          background: "var(--bg-secondary)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            overflow: "hidden",
                          }}
                        >
                          {me.photoUrl ? (
                            <img
                              src={me.photoUrl}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--bg-secondary)",
                                fontSize: "1.5rem",
                                fontWeight: 900,
                              }}
                            >
                              {me.firstName?.[0]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 28,
                          height: 28,
                          background: "var(--bg-card)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `2px solid ${tierColor(me.reputationTier || "rookie")}`,
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        {tierIcon(me.reputationTier || "rookie", 14)}
                      </div>
                    </div>
                    <h3
                      style={{
                        margin: "0 0 4px",
                        fontSize: "1.4rem",
                        fontWeight: 950,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {me.firstName} {me.lastName}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: tierColor(me.reputationTier || "rookie"),
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {tierLabel(me.reputationTier || "rookie")} Predictor
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 32,
                    }}
                  >
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        padding: "16px 12px",
                        borderRadius: 20,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: "var(--text-subtle)",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Current Rank
                      </div>
                      <div
                        style={{
                          fontSize: "1.75rem",
                          fontWeight: 950,
                          color: "var(--color-primary)",
                          letterSpacing: "-0.04em",
                        }}
                      >
                        #{myRank || "—"}
                      </div>
                    </div>
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        padding: "16px 12px",
                        borderRadius: 20,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: "var(--text-subtle)",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Win Rate
                      </div>
                      <div
                        style={{
                          fontSize: "1.75rem",
                          fontWeight: 950,
                          color: "var(--color-success)",
                          letterSpacing: "-0.04em",
                        }}
                      >
                        {(
                          ((me.correctPredictions || 0) /
                            (me.totalPredictions || 1)) *
                          100
                        ).toFixed(0)}
                        %
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      marginBottom: 32,
                    }}
                  >
                    <PerformanceMetric
                      label="Total Predictions"
                      value={me.totalPredictions}
                      icon={<BarChart2 size={16} />}
                    />
                    <PerformanceMetric
                      label="Correct Picks"
                      value={me.correctPredictions}
                      icon={<CheckCircle size={16} />}
                      color="var(--color-success)"
                    />
                    <PerformanceMetric
                      label="Volume Generated"
                      value={`Nu ${(me as any).totalBetAmount?.toLocaleString() || 0}`}
                      icon={<Medal size={16} />}
                    />
                  </div>

                  <button
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: 16,
                      border: "none",
                      background: "var(--grad-primary)",
                      color: "#fff",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 8px 24px -6px rgba(39, 117, 208, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      transition: "transform 0.2s",
                    }}
                    onMouseDown={(e) =>
                      (e.currentTarget.style.transform = "scale(0.97)")
                    }
                    onMouseUp={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    Share My Performance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .premium-loader {
          width: 48px;
          height: 48px;
          border: 4px solid var(--glass-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: premiumSpin 1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
          margin: 0 auto;
        }
        @keyframes premiumSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes podiumEntrance {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; filter: blur(20px); }
          50% { opacity: 1; filter: blur(30px); }
        }
      `}</style>
    </div>
  );
}

function PerformanceMetric({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: any;
  icon: any;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--text-muted)",
        }}
      >
        {icon}
        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: "0.9rem",
          fontWeight: 800,
          color: color || "var(--text-main)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EnhancedPodiumCard({
  entry,
  rank,
  featured = false,
}: {
  entry: LeaderboardEntry;
  rank: number;
  featured?: boolean;
}) {
  const color = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#b45309";
  const label = rank === 1 ? "ST PLACE" : rank === 2 ? "ND PLACE" : "RD PLACE";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        width: featured ? 220 : 180,
        animation: `podiumEntrance ${0.5 + rank * 0.1}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        position: "relative",
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 120,
            background: "rgba(245,158,11,0.15)",
            borderRadius: "50%",
            filter: "blur(40px)",
            zIndex: -1,
            animation: "glowPulse 3s infinite",
          }}
        />
      )}

      <div style={{ position: "relative" }}>
        <div
          style={{
            width: featured ? 140 : 100,
            height: featured ? 140 : 100,
            borderRadius: "50%",
            padding: 6,
            background: `linear-gradient(135deg, ${color}, ${color}22)`,
            boxShadow: featured
              ? "0 20px 40px -12px rgba(245,158,11,0.3)"
              : "none",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "var(--bg-card)",
              border: `2px solid var(--bg-card)`,
              overflow: "hidden",
            }}
          >
            {entry.photoUrl ? (
              <img
                src={entry.photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-secondary)",
                  fontSize: featured ? "2.5rem" : "1.75rem",
                  fontWeight: 900,
                }}
              >
                {entry.firstName?.[0]}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            color: "#fff",
            padding: "2px 10px",
            borderRadius: 99,
            fontSize: "0.65rem",
            fontWeight: 900,
            whiteSpace: "nowrap",
            border: "3px solid var(--bg-main)",
          }}
        >
          {rank}
          {label}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: featured ? "1.25rem" : "1rem",
            fontWeight: 950,
            color: "var(--text-main)",
            letterSpacing: "-0.02em",
            marginBottom: 2,
          }}
        >
          {entry.username
            ? `@${entry.username}`
            : `${entry.firstName} ${entry.lastName || ""}`}
        </div>
        <div
          style={{
            fontSize: featured ? "0.9rem" : "0.8rem",
            fontWeight: 800,
            color: "var(--color-success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <TrendingUp size={14} /> {entry.winRate}% Accurate
        </div>
      </div>
    </div>
  );
}

function PremiumEntryRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe?: boolean;
}) {
  const color = tierColor(entry.reputationTier);
  const winColor =
    entry.winRate >= 65
      ? "var(--color-success)"
      : entry.winRate >= 50
        ? "var(--text-main)"
        : "var(--color-warning)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "50px 1fr 100px 100px 120px",
        padding: "16px 20px",
        alignItems: "center",
        background: isMe ? "rgba(39,117,208,0.05)" : "var(--bg-card)",
        borderRadius: 20,
        border: isMe
          ? "2.5px solid var(--color-primary)"
          : "1px solid var(--glass-border)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        boxShadow: isMe ? "0 8px 24px -6px rgba(39,117,208,0.15)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isMe) {
          e.currentTarget.style.transform = "translateX(6px)";
          e.currentTarget.style.borderColor = "var(--color-primary)";
          e.currentTarget.style.background = "var(--bg-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isMe) {
          e.currentTarget.style.transform = "translateX(0)";
          e.currentTarget.style.borderColor = "var(--glass-border)";
          e.currentTarget.style.background = "var(--bg-card)";
        }
      }}
    >
      <span
        style={{
          fontSize: "1.1rem",
          fontWeight: 950,
          color: entry.rank <= 10 ? "var(--text-main)" : "var(--text-subtle)",
          letterSpacing: "-0.04em",
        }}
      >
        {entry.rank}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `2px solid ${isMe ? color : "var(--glass-border)"}`,
            padding: 2,
            background: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            {entry.photoUrl ? (
              <img
                src={entry.photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-secondary)",
                  fontSize: "0.9rem",
                  fontWeight: 900,
                }}
              >
                {entry.firstName?.[0]}
              </div>
            )}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--text-main)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {entry.username
              ? `@${entry.username}`
              : `${entry.firstName} ${entry.lastName || ""}`}
            {isMe && (
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 900,
                  color: "#fff",
                  background: "var(--color-primary)",
                  padding: "2px 8px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                }}
              >
                You
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            {tierIcon(entry.reputationTier, 12)}
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              {tierLabel(entry.reputationTier)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 800,
            color: "var(--text-main)",
          }}
        >
          {entry.totalPredictions}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--text-subtle)",
            textTransform: "uppercase",
          }}
        >
          Picks
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "1.05rem",
            fontWeight: 950,
            color: winColor,
            letterSpacing: "-0.02em",
          }}
        >
          {entry.winRate}%
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--text-subtle)",
            textTransform: "uppercase",
          }}
        >
          Accuracy
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 800,
            color: "var(--text-main)",
          }}
        >
          Nu {entry.totalBetAmount?.toLocaleString() || 0}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--text-subtle)",
            textTransform: "uppercase",
          }}
        >
          Volume
        </div>
      </div>
    </div>
  );
}
