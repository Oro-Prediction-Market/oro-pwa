import React from "react"

type CardVariant = "default" | "elevated" | "outlined" | "glass"
type CardPadding = "none" | "sm" | "md" | "lg"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  radius?: "md" | "lg"
  row?: boolean
}

const variants: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-md)",
  },
  elevated: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-lg)",
  },
  outlined: {
    background: "transparent",
    border: "1px solid var(--border)",
    boxShadow: "none",
  },
  glass: {
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    boxShadow: "var(--shadow-md)",
  },
}

const paddings: Record<CardPadding, React.CSSProperties> = {
  none: { padding: 0 },
  sm: { padding: "12px" },
  md: { padding: "16px" },
  lg: { padding: "20px" },
}

const radii = {
  md: "var(--radius-md)",
  lg: "var(--radius-card)",
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  radius = "md",
  row = false,
  children,
  style,
  ...rest
}) => (
  <div
    style={{
      ...variants[variant],
      ...paddings[padding],
      borderRadius: radii[radius],
      display: "flex",
      flexDirection: row ? "row" : "column",
      ...(row ? { alignItems: "center" } : {}),
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
)
