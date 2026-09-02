import { ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SECTIONS = [
  {
    number: "1",
    title: "Introduction",
    content: [
      `Welcome to Oro ("we," "us," or "our"), a parimutuel prediction market platform. Oro is operated as a Telegram Mini App and Progressive Web App, and processes personal and financial data in connection with the services described below.`,
      `By accessing or using Oro, you agree to the collection and use of information as described in this Privacy Policy. If you do not agree, please discontinue use of the platform.`,
    ],
  },
  {
    number: "2",
    title: "Information We Collect",
    subsections: [
      {
        heading: "2.1 Account & Identity",
        text: "Bhutanese Citizen ID (CID) required for identity verification. Telegram user ID, username, display name, and profile photo provided by Telegram upon authorisation.",
      },
      {
        heading: "2.2 Financial Information",
        text: "Account balances (BTN and USDT, held separately), payment records (amounts, methods, timestamps, status), DK Bank transaction references and OTP confirmation data. We do not store your full bank credentials or PIN.",
      },
      {
        heading: "2.3 Digital Asset Data",
        text: "For USDT activity we process deposit addresses issued to you, blockchain network selected, transaction hashes, on-chain amounts and confirmation status, and the withdrawal addresses you whitelist together with any label you give them. We do not hold your private keys, seed phrase, or wallet credentials, and we never ask for them.",
      },
      {
        heading: "2.4 Identity Verification (KYC) Documents",
        text: "Where identity verification is required — including before any USDT deposit — we collect your document type, document number, issuing country, and an image of the document, along with the review decision, reviewer, timestamp, and any rejection reason. Document images and numbers are encrypted before storage and are accessible only to authorised reviewers through audited internal tooling.",
      },
      {
        heading: "2.5 Prediction & Activity Data",
        text: "Prediction history (markets, amounts staked, outcomes, winnings), positions held, and settlement records.",
      },
      {
        heading: "2.6 Technical Data",
        text: "Session tokens (JWT, stored client-side), IP address, browser/app version, Telegram client info, page views, interaction timestamps, and WebSocket session metadata.",
      },
    ],
  },
  {
    number: "3",
    title: "How We Use Your Information",
    table: [
      {
        purpose: "Account creation and authentication",
        data: "CID, Telegram ID, JWT tokens and Bhutan App",
      },
      {
        purpose: "Processing deposits and withdrawals",
        data: "Payment records, bank references",
      },
      {
        purpose: "Calculating and settling prediction",
        data: "Prediction history, market data, balances",
      },
      {
        purpose: "Processing USDT deposits and withdrawals",
        data: "Deposit addresses, whitelisted addresses, transaction hashes, network",
      },
      {
        purpose: "Identity verification (KYC) and eligibility",
        data: "Identity document data and images, review decisions",
      },
      {
        purpose: "Fraud detection and compliance",
        data: "CID, transaction records, IP address",
      },
      {
        purpose: "Customer support",
        data: "Account info, transaction history",
      },
      {
        purpose: "Platform analytics and improvement",
        data: "Usage logs, activity data",
      },
    ],
    note: "We do not sell your personal data to third parties.",
  },
  {
    number: "4",
    title: "Legal Basis for Processing",
    list: [
      "Contractual necessity — to provide the prediction market service, process predictions, and settle payments.",
      "Legal obligation — to comply with applicable Bhutanese financial regulations and identity verification requirements.",
      "Legitimate interests — to detect fraud, maintain platform security, and improve our services.",
      "Consent — for any optional data collection beyond the above (you may withdraw consent at any time).",
    ],
  },
  {
    number: "5",
    title: "Data Sharing",
    list: [
      "DK Bank — transaction data required to process BTN deposits and withdrawals via the bank's merchant API.",
      "Telegram — we receive data from Telegram under their platform terms; we do not send personal data back to Telegram beyond what their Mini App SDK requires.",
      "Digital asset payment processor — our USDT payment provider receives the data needed to issue deposit addresses, monitor incoming transfers, and send withdrawals to your whitelisted address.",
      "Blockchain networks — a deposit or withdrawal is recorded on a public blockchain. Addresses, amounts, and timestamps are visible to anyone, permanently, and cannot be edited or deleted by us or by you.",
      "Service providers — infrastructure and hosting providers who process data on our behalf under data processing agreements.",
      "Legal authorities — where required by Bhutanese law or valid legal process.",
    ],
  },
  {
    number: "6",
    title: "Data Retention",
    table: [
      {
        purpose: "Account and identity data",
        data: "Duration of account + 5 years",
      },
      {
        purpose: "Transaction and payment records",
        data: "7 years (financial compliance)",
      },
      {
        purpose: "Identity verification documents",
        data: "Duration of account + 5 years (AML/CFT)",
      },
      { purpose: "Prediction history", data: "5 years" },
      { purpose: "Session tokens", data: "Until logout or expiry" },
      { purpose: "Usage logs", data: "90 days" },
    ],
    note: "You may request deletion of your account and associated personal data at any time, subject to legal retention obligations for financial records. Data already written to a public blockchain cannot be deleted by us — see Section 10.",
  },
  {
    number: "7",
    title: "Data Security",
    list: [
      "Encryption in transit — all API communication uses HTTPS/TLS.",
      "Password hashing — credentials are hashed using BCrypt before storage.",
      "2FA (TOTP) — admin access requires time-based one-time password authentication.",
      "Bearer token authentication — API requests require valid JWT tokens.",
      "Redis session management — short-lived session data is stored securely server-side.",
      "KYC document encryption — identity document images and numbers are encrypted before they are stored, with a separate key used to make them searchable without being readable.",
      "Withdrawal address whitelisting — USDT can only be sent to an address you registered in advance, so a compromised session cannot redirect funds to an unknown address.",
      "Access controls — administrative functions are restricted to verified admin accounts with full audit logging.",
    ],
  },
  {
    number: "8",
    title: "Cookies and Local Storage",
    content: [
      "Oro stores session tokens and user preferences in your browser's local storage or Telegram's client storage. We do not use third-party tracking cookies.",
    ],
  },
  {
    number: "9",
    title: "Telegram Mini App",
    content: [
      "Oro operates within the Telegram ecosystem. Telegram authenticates your identity and provides your profile data to us. Your use of Telegram is governed by Telegram's Privacy Policy. We are an independent controller of the data we collect; Telegram is not responsible for our data practices.",
    ],
  },
  {
    number: "10",
    title: "Blockchain and Digital Asset Data",
    content: [
      "USDT deposits and withdrawals settle on public blockchain networks. Once a transaction is confirmed, the sending address, receiving address, amount, and timestamp are recorded permanently on a public ledger that we do not control and cannot alter, correct, or erase.",
      "Anyone can view that ledger. If an address can be linked to you — for example because you have published it, or because it is also used elsewhere in your name — your Oro deposits and withdrawals may be linked to you by a third party. This is a property of blockchains generally, not of Oro.",
      "Your rights of correction and erasure under Section 11 apply to the data we hold in our own systems. They cannot be applied to on-chain records.",
    ],
  },
  {
    number: "11",
    title: "Your Rights",
    list: [
      "Access — request the personal data we hold about you.",
      "Correct — request correction of inaccurate or incomplete data.",
      "Delete — request deletion of your account and personal data (subject to retention obligations).",
      "Restrict or object — to certain types of processing.",
      "Data portability — receive a copy of your data in a structured format.",
    ],
  },
  {
    number: "12",
    title: "Children's Privacy",
    content: [
      "Oro is not intended for anyone under 18. We do not knowingly collect data from minors. If you believe a minor has registered on our platform, contact us and we will promptly delete the account.",
    ],
  },
  {
    number: "13",
    title: "Changes to This Policy",
    content: [
      `We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top. Significant changes will be communicated via in-app notification. Continued use of Oro after changes constitutes acceptance of the updated policy.`,
    ],
  },
];

export function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-main)",
        color: "var(--text-main)",
      }}
    >
      <Helmet>
        <title>Privacy Policy | Oro</title>
        <meta name="description" content="Read Oro's Privacy Policy. Learn how we handle your data on the Oro prediction market platform." />
        <link rel="canonical" href="https://oro.fun/privacy" />
      </Helmet>
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}
      >
        {/* Intro card */}
        <div
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 32,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Last Updated: 28 April 2026
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: 1.65,
            }}
          >
            This policy explains how Oro collects, uses, and protects your
            personal data. For questions, contact us via{" "}
            <a
              href="https://t.me/OroPredictionMarket"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-primary, #2563eb)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              our Telegram channel{" "}
              <ExternalLink
                size={11}
                style={{ display: "inline", verticalAlign: "middle" }}
              />
            </a>
            .
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.number} style={{ marginBottom: 36 }}>
            {/* Section heading */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 900,
                  color: "var(--color-primary, #2563eb)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  minWidth: 20,
                }}
              >
                {section.number.padStart(2, "0")}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  letterSpacing: "-0.01em",
                }}
              >
                {section.title}
              </h2>
            </div>

            {/* Paragraphs */}
            {"content" in section &&
              section.content?.map((para, i) => (
                <p
                  key={i}
                  style={{
                    margin: "0 0 10px",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {para}
                </p>
              ))}

            {/* Note */}
            {"note" in section && section.note && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "rgba(37,99,235,0.06)",
                  borderLeft: "2px solid var(--color-primary, #2563eb)",
                  borderRadius: "0 8px 8px 0",
                  fontSize: "0.83rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {section.note}
              </div>
            )}

            {/* Bullet list */}
            {"list" in section && section.list && (
              <ul style={{ paddingLeft: 18, margin: "4px 0 0" }}>
                {section.list.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.65,
                      marginBottom: 6,
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {/* Table */}
            {"table" in section && section.table && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {section.table.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--glass-border)",
                      background: "var(--bg-card)",
                    }}
                  >
                    <div
                      style={{
                        flex: "0 0 55%",
                        padding: "10px 14px",
                        fontSize: "0.83rem",
                        fontWeight: 600,
                        color: "var(--text-main)",
                        borderRight: "1px solid var(--glass-border)",
                      }}
                    >
                      {row.purpose}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {row.data}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subsections */}
            {"subsections" in section && section.subsections && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {section.subsections.map((sub, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--glass-bg)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        marginBottom: 4,
                      }}
                    >
                      {sub.heading}
                    </div>
                    <div
                      style={{
                        fontSize: "0.83rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {sub.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Contact */}
        <div
          style={{
            background: "rgba(37,99,235,0.06)",
            border: "1px solid rgba(37,99,235,0.2)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 24,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "var(--text-main)",
            }}
          >
            13. Contact Us
          </h3>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            For questions, concerns, or data requests regarding this Privacy
            Policy:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <a
              href="https://t.me/OroPredictionMarket"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-primary, #2563eb)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Telegram Channel: t.me/OroPredictionMarket
            </a>
            <a
              href="https://t.me/OroPredictBot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-primary, #2563eb)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Telegram Bot: @OroPredictBot
            </a>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            opacity: 0.4,
          }}
        >
          © 2026 Oro Prediction Market. All rights reserved.
        </p>
      </div>
    </div>
  );
}
