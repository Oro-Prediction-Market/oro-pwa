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
          "No sign-up form is needed. If you open Oro through Telegram, your account is created automatically from your Telegram profile. On the web, you can sign in with My Bhutan App (recommended) or with your CID and a password you set in the Telegram app.",
      },
      {
        id: "02",
        question: "How do I sign in to Oro on the web?",
        answer: (
          <>
            <p style={{ margin: "0 0 8px" }}>
              There are two ways to sign in on the web:
            </p>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--text-main)" }}>
              My Bhutan App (recommended)
            </p>
            <p style={{ margin: "0 0 8px" }}>
              On mobile, tap "Login with My Bhutan App" and approve the request
              in the app. On desktop, scan the QR code that appears with your
              My Bhutan App.
            </p>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--text-main)" }}>
              CID + Password
            </p>
            <p style={{ margin: 0 }}>
              Enter your 11-digit CID and the password you set in the Telegram
              Mini App under Settings → Website Access. You must set the
              password in Telegram first before this option works.
            </p>
          </>
        ),
      },
      {
        id: "03",
        question: "Why do I need to link my DK Bank account?",
        answer: (
          <>
            <p style={{ margin: 0 }}>
              DK Bank is the payment gateway for moving real money in and out of
              the platform. Go to the Wallet page, enter your 11-digit CID, and
              verify with your registered phone in DK Bank.
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
                make predictions with real money.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "04",
        question: "What is a CID?",
        answer:
          "CID stands for Citizenship Identity Number — the 11-digit ID on your Bhutanese citizenship card. It is required by DK Bank to verify your identity before you can deposit or withdraw real money.",
      },
    ],
  },
  {
    title: "Prediction & Markets",
    items: [
      {
        id: "05",
        question: "How does parimutuel betting work?",
        answer:
          "All stakes go into a single shared pool. When the market resolves, the total pool (minus the platform fee) is distributed proportionally among everyone who predicted on the winning outcome. Your potential payout is shown before you confirm.",
      },
      {
        id: "06",
        question: "Why do the odds change after I make a prediction?",
        answer:
          "Odds shift in real time as more people predict. The more people who pick the same outcome as you, the smaller each person's share of the pool — and the lower your payout multiplier. The fewer people agree with you, the higher the potential payout.",
      },
      {
        id: "07",
        question: "What is the minimum prediction amount?",
        answer:
          "The minimum is Nu 10 for TER and BTC price markets, and Nu 50 for all other markets. The button in the bet form will show the exact minimum required for the market you are viewing.",
      },
      {
        id: "08",
        question: "What happens if a market is cancelled?",
        answer:
          "If an admin cancels a market before it resolves, every prediction is fully refunded to your Oro wallet automatically. You will receive a notification in Telegram confirming the refund.",
      },
      {
        id: "09",
        question: "What are Duels?",
        answer:
          "Duels let you challenge another person to a head-to-head prediction on a market you have already predicted on. You pick your outcome, set a wager, and share the link. The first person to accept takes the opposite side — the winner collects the entire pot.",
      },
    ],
  },
  {
    title: "Results & Bjarog Oracle",
    items: [
      {
        id: "10",
        question: "How is a market's result decided?",
        answer: (
          <>
            <p style={{ margin: "0 0 8px" }}>
              By <strong style={{ color: "var(--text-main)" }}>Bjarog</strong> —
              the raven that sees what happened. When an event ends, a result is
              proposed and the market enters a short review window (usually one
              hour, never more than two).
            </p>
            <p style={{ margin: 0 }}>
              If nobody challenges the proposed result before the window closes,
              it stands and payouts settle automatically. Bjarog is named for the
              raven of the Raven Crown — the guardian that watches every outcome,
              so no market settles on a lie.
            </p>
          </>
        ),
      },
      {
        id: "11",
        question: "What if I think a result is wrong?",
        answer: (
          <>
            <p style={{ margin: "0 0 8px" }}>
              Challenge it before the review window closes. A challenge requires
              a bond — from Nu 10 on Ngultrum markets, or 0.5 USDT on USDT
              markets. The first challenger in a market sets the bond, and
              everyone who joins that contest matches it.
            </p>
            <p style={{ margin: 0 }}>
              If the result is overturned, you get your bond back and share the
              bonds forfeited by the other side. If the proposed result stands,
              your bond is forfeited. The bond exists to stop casual objections,
              not to stop real ones.
            </p>
          </>
        ),
      },
      {
        id: "12",
        question: "Why is my payout still pending after the event ended?",
        answer:
          "The market is in its review window — the result has been proposed but is not final yet. The market card shows the time remaining. Once the window closes with no successful challenge, your payout is credited automatically.",
      },
    ],
  },
  {
    title: "Wallet & Payments",
    items: [
      {
        id: "13",
        question: "What is the minimum deposit and withdrawal?",
        answer:
          "The minimum for both deposits and withdrawals is Nu 50 per transaction.",
      },
      {
        id: "14",
        question: "How long does a withdrawal take?",
        answer:
          "Withdrawals are processed through DK Bank and are typically near-instant during bank operating hours. Processing may be slower outside standard hours.",
      },
      {
        id: "15",
        question: "What is a referral bonus?",
        answer:
          "When a friend signs up using your referral link and makes their first prediction, you both receive Oro credits as a bonus. Referral bonuses appear as a 'Referral bonus' entry in your transaction history.",
      },
    ],
  },
  {
    title: "USDT & Crypto",
    items: [
      {
        id: "16",
        question: "Can I use USDT on Oro?",
        answer:
          "Yes, where USDT is enabled for your account. USDT accounts hold, predict, and settle entirely in USDT. You must complete identity verification (KYC) and be approved before your first USDT deposit.",
      },
      {
        id: "17",
        question: "Which networks can I deposit USDT on?",
        answer: (
          <>
            <p style={{ margin: "0 0 8px" }}>
              Tron (TRC-20), Base, Polygon, Arbitrum, and Ethereum (ERC-20). The
              deposit screen shows the network name spelled out above the
              address.
            </p>
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(220,38,38,0.06)",
                borderLeft: "2px solid #dc2626",
                borderRadius: "0 6px 6px 0",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Info
                size={14}
                color="#dc2626"
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
                Always send on exactly the network shown. Base, Polygon,
                Arbitrum, and Ethereum all use the same 0x address format —
                sending on the wrong one is permanent and cannot be recovered.
              </p>
            </div>
          </>
        ),
      },
      {
        id: "18",
        question: "What are the USDT limits?",
        answer:
          "Deposits are from 1 USDT up to 1,000 USDT per transaction. The minimum withdrawal is 1 USDT. Network fees are paid by you on the sending side — a TRC-20 transfer needs a small amount of TRX in your wallet, and Ethereum fees are high enough that another network is usually the better choice.",
      },
      {
        id: "19",
        question: "How long does a USDT deposit take?",
        answer:
          "Most deposits credit within a minute or two once the transaction confirms — Tron, Base, and Arbitrum are usually under a minute, Polygon and Ethereum a little longer. Your balance updates automatically; there is nothing to submit.",
      },
      {
        id: "20",
        question: "My deposit address expired, or I sent the wrong amount",
        answer:
          "Each deposit gets its own address that is valid for a limited time. If it expires or you send less than you intended, open the same deposit and use the top-up option to continue it — do not reuse an old address from a previous deposit.",
      },
      {
        id: "21",
        question: "How do I withdraw USDT?",
        answer:
          "Add a payout address to your whitelist first — pick the network, paste the address, and it is checked before it is saved. Withdrawals can then only be sent to an address you have already whitelisted, which is what stops a stolen session from draining your wallet to an unknown address.",
      },
      {
        id: "22",
        question: "I sent USDT to the wrong address or the wrong network. Can Oro get it back?",
        answer: (
          <>
            <p style={{ margin: "0 0 8px" }}>
              No. Blockchain transfers are final the moment they confirm — they
              cannot be reversed, cancelled, or redirected, by us or by anyone
              else. If funds reach an address we do not control, we have no way
              to reach them, and Oro is not responsible for the loss.
            </p>
            <p style={{ margin: 0 }}>
              This is why the deposit screen shows the network spelled out and
              why withdrawals only go to an address you whitelisted in advance.
              Before you send: check the network, check the address, and send a
              small test amount first if you are unsure. Never trust an address
              pasted to you by anyone — malware and scam messages both work by
              swapping the address at the last second.
            </p>
          </>
        ),
      },
      {
        id: "23",
        question: "Can I move money between my Ngultrum and USDT balances?",
        answer:
          "No. Ngultrum and USDT are kept completely separate — separate balances, separate markets, separate pools. There is no exchange rate anywhere in Oro, so the two never mix and a Nu prediction can never be paid out in USDT or the reverse.",
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
