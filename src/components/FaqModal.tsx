import React from "react";
import { X, Info } from "lucide-react";
import { useBreakpoint } from "../hooks/useBreakpoint";

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    title: "Getting Started",
    items: [
      {
        id: "01",
        question: "Do I need to create an account to use Oro?",
        answer:
          "No. Your account is created automatically the first time you open the Oro Mini App inside Telegram. Your Telegram username and display name are used directly — no sign-up form required.",
      },
      {
        id: "02",
        question: "Why do I need to link my DK Bank account?",
        answer: (
          <>
            <p style={{ margin: 0 }}>
              DK Bank is the payment gateway for moving real money in and out of
              the platform. Go to Profile &gt; Link DK Bank, enter your 11-digit
              CID, and verify with your registered phone in DK Bank.
            </p>
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(39,117,208,0.06)",
                borderLeft: "2px solid var(--color-primary)",
                borderRadius: "0 6px 6px 0",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Info
                size={14}
                color="var(--color-primary)"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "var(--text-main)",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                You do not need DK Bank to browse markets or view odds — only to
                place bets with real money.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "03",
        question: "Can I use Oro without a Telegram account?",
        answer:
          "Oro's primary interface is the Telegram Mini App, so a Telegram account is required for most users. However, you can set a PWA password in Settings > Website Access and log in to the web version of Oro without opening Telegram each time.",
      },
      {
        id: "04",
        question: "What is a CID?",
        answer:
          "CID stands for Citizenship Identity Number — the 11-digit ID on your Bhutanese citizenship card. DK Bank requires this to verify your identity before you can deposit or withdraw real money.",
      },
    ],
  },
  {
    title: "Betting & Markets",
    items: [
      {
        id: "05",
        question: "How does parimutuel betting work?",
        answer:
          "In a parimutuel market, all stakes go into a single shared pool. When the market resolves, the total pool (minus the house edge) is distributed proportionally among everyone who bet on the winning outcome.",
      },
      {
        id: "06",
        question: "Why do the odds change after I place my bet?",
        answer:
          "Oro uses a parimutuel pool — odds shift as more people bet. When more people bet on the same outcome as you, your potential payout multiplier decreases. When fewer people bet on your outcome, the multiplier increases.",
      },
    ],
  },
  {
    title: "Wallet & Payments",
    items: [
      {
        id: "07",
        question: "What is the minimum deposit and withdrawal?",
        answer:
          "The minimum for both deposits and withdrawals is Nu 50 per transaction.",
      },
      {
        id: "08",
        question: "How long does a withdrawal take?",
        answer:
          "Withdrawals are processed through DK Bank and are typically near-instant during bank operating hours. Processing may be slower outside standard hours.",
      },
    ],
  },
];

interface FAQModalProps {
  onClose: () => void;
}

export function FaqModal({ onClose }: FAQModalProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 16px" : "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-main)",
          width: "100%",
          maxWidth: isMobile ? 480 : 680,
          maxHeight: isMobile ? "70vh" : "85vh",
          borderRadius: isMobile ? 16 : 20,
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-premium)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "faqFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes faqFadeIn {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .faq-scroll::-webkit-scrollbar { width: 6px; }
          .faq-scroll::-webkit-scrollbar-track { background: transparent; }
          .faq-scroll::-webkit-scrollbar-thumb { background: var(--glass-border); borderRadius: 3px; }
        `}</style>

        {/* Header */}
        <div
          style={{
            padding: isMobile ? "14px 16px" : "20px 24px",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-card)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 12,
            }}
          >
            <div
              style={{
                padding: isMobile ? 6 : 8,
                background: "rgba(37,99,235,0.1)",
                borderRadius: 8,
              }}
            >
              <Info
                size={isMobile ? 14 : 18}
                color="var(--color-primary, #2563eb)"
              />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? "0.9rem" : "1.1rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                }}
              >
                FAQ & Help Center
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: isMobile ? "0.72rem" : "0.8rem",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                Common questions and platform guides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-border)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="faq-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "16px" : "24px",
          }}
        >
          {FAQ_DATA.map((section, sIndex) => (
            <div key={sIndex} style={{ marginBottom: isMobile ? 20 : 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: isMobile ? 10 : 16,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    color: "var(--color-primary, #2563eb)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {(sIndex + 1).toString().padStart(2, "0")}
                </span>
                <h2
                  style={{
                    fontSize: isMobile ? "0.88rem" : "1.2rem",
                    fontWeight: 900,
                    color: "var(--text-main)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {section.title}
                </h2>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 10 : 14,
                }}
              >
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      borderRadius: isMobile ? 10 : 12,
                      overflow: "hidden",
                      border: "1px solid var(--glass-border)",
                      background: "var(--bg-card)",
                    }}
                  >
                    {/* Number box */}
                    <div
                      style={{
                        width: isMobile ? 34 : 44,
                        fontSize: isMobile ? "0.72rem" : "0.85rem",
                        fontWeight: 900,
                        color: "var(--color-primary, #2563eb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRight: "1px solid var(--glass-border)",
                        background: "rgba(37,99,235,0.04)",
                        flexShrink: 0,
                      }}
                    >
                      {item.id}
                    </div>

                    {/* Content box */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          padding: isMobile ? "9px 12px" : "12px 16px",
                          background: "rgba(255,255,255,0.02)",
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: isMobile ? "0.8rem" : "0.95rem",
                            fontWeight: 700,
                            color: "var(--text-main)",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.question}
                        </h3>
                      </div>
                      <div
                        style={{
                          padding: isMobile ? "9px 12px" : "12px 16px",
                          color: "var(--text-muted)",
                          fontSize: isMobile ? "0.75rem" : "0.85rem",
                          lineHeight: 1.55,
                        }}
                      >
                        {item.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 10,
              padding: "20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: 500,
              opacity: 0.6,
            }}
          >
            End of Frequently Asked Questions
          </div>
        </div>
      </div>
    </div>
  );
}
