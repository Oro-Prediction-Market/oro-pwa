import React, { useEffect } from "react"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  /** Extra padding at the bottom for nav bars. Defaults to 80px (TMA nav height). */
  bottomPad?: number
  /** Max height as a vh value. Defaults to 88. */
  maxHeightVh?: number
  children: React.ReactNode
}

/**
 * BottomSheet — slides up from the bottom, dismisses on backdrop tap.
 * Handles safe-area-inset-bottom automatically.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  bottomPad = 80,
  maxHeightVh = 88,
  children,
}) => {
  // Kept mounted past `open` going false so the sheet can slide back down —
  // the same two-state pattern the sibling BottomSheet in src/components/ui
  // uses. Dropping straight out of the tree gives the exit keyframe no frame
  // to run in.
  const [rendered, setRendered] = React.useState(open)
  const [closing, setClosing] = React.useState(false)

  useEffect(() => {
    if (open) {
      setRendered(true)
      setClosing(false)
      return
    }
    if (!rendered) return
    setClosing(true)
    const timer = window.setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, rendered])

  // Prevent body scroll while open
  useEffect(() => {
    if (rendered) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [rendered])

  if (!rendered) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          maxHeight: `${maxHeightVh}vh`,
          overflowY: "auto",
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${bottomPad}px)`,
          animation: `${closing ? "sheetSlideDown" : "sheetSlideUp"} 0.25s cubic-bezier(0.32,0.72,0,1) forwards`,
        }}
      >
        <style>{`
          @keyframes sheetSlideUp {
            from { transform: translateY(100%) }
            to   { transform: translateY(0) }
          }
          @keyframes sheetSlideDown {
            from { transform: translateY(0) }
            to   { transform: translateY(100%) }
          }
        `}</style>

        {/* Drag handle */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--bg-card)",
            zIndex: 1,
            padding: "12px 20px 0",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: "var(--radius-full)",
              background: "var(--border)",
              margin: "0 auto 12px",
            }}
          />
          {title && (
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-main)",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {title}
            </div>
          )}
        </div>

        <div style={{ padding: "0 20px" }}>{children}</div>
      </div>
    </div>
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Dialog — centered overlay modal for confirmations and alerts.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 20px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--shadow-premium)",
          animation: "dialogPop 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <style>{`
          @keyframes dialogPop {
            from { opacity: 0; transform: scale(0.92) }
            to   { opacity: 1; transform: scale(1) }
          }
        `}</style>
        {title && (
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
