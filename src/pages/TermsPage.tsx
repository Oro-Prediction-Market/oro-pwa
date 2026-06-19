import { ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SECTIONS = [
  {
    number: "1",
    title: "Acceptance of Terms",
    content: [
      `By accessing or using the Oro Prediction Market platform ("Oro", "the Platform", "we", "us"), whether through the Telegram Mini App ("TMA"), the Progressive Web App ("PWA"), or the Telegram bot (@OroPredictBot), you ("User", "you") agree to be bound by these Terms and Conditions ("Terms") in their entirety.`,
      `If you do not agree with any part of these Terms, you must immediately discontinue use of the Platform.`,
      `These Terms constitute a legally binding agreement between you and Oro. We reserve the right to update or modify these Terms at any time. Continued use of the Platform after any changes constitutes your acceptance of the revised Terms.`,
    ],
  },
  {
    number: "2",
    title: "Eligibility",
    subsections: [
      {
        heading: "2.1 Requirement",
        text: "You must have DK Bank to use Oro. By registering, you confirm that you are using your own DK Bank account.",
      },
      {
        heading: "2.2 Jurisdiction",
        text: "Oro operates under a license issued by the GMC Gelephu. Access to and use of the Platform is subject to all applicable laws and regulations. By using Oro, you represent and warrant that your participation is lawful in your jurisdiction. Oro reserves the right to restrict access from jurisdictions where such services are prohibited.",
      },
      {
        heading: "2.3 DK Bank Requirement",
        text: "To deposit or withdraw real money, you must hold a valid DK Bank account and possess an 11-digit Bhutanese Citizenship Identity Number (CID). Browsing markets and using welcome bonus credits does not require a DK Bank account.",
      },
      {
        heading: "2.4 Platform Access",
        text: "Oro is accessible via two channels: the Telegram Mini App (TMA), which requires a valid Telegram account, and the Progressive Web App (PWA), which can be accessed directly through any modern web browser. New users may register through either channel. PWA users may set a Web App password via Settings > Website Access for direct web login.",
      },
      {
        heading: "2.5 Single Account Policy",
        text: "Each user is permitted to maintain only one account. Creating multiple accounts to exploit bonuses, referrals, or other promotional features is prohibited and will result in permanent suspension of all associated accounts.",
      },
    ],
  },
  {
    number: "3",
    title: "Account Registration and Security",
    subsections: [
      {
        heading: "3.1 Automatic Registration",
        text: "Your Oro account is created automatically the first time you open the Oro Mini App within Telegram. Your Telegram display name and username are used as your identity — no separate sign-up form is required.",
      },
      {
        heading: "3.2 Identity Verification",
        text: "When linking a DK Bank account, you are required to provide your 11-digit CID. Oro verifies this against your DK Bank account via the DK Bank payment gateway. The CID you link must belong to you.",
      },
      {
        heading: "3.3 Phone Verification",
        text: "Linking a DK Bank account requires that your Telegram-registered phone number matches the phone number registered with DK Bank. Your actual phone number is never stored in plain text.",
      },
      {
        heading: "3.4 PWA Password",
        text: "Users may set a PWA password (minimum 6 characters) via Settings > Website Access in the TMA. It is stored as a secure one-way hash. You are responsible for keeping this password confidential.",
      },
      {
        heading: "3.5 Account Security",
        text: "You are responsible for maintaining the security of your Telegram account and any PWA password. Oro will not be liable for any losses resulting from unauthorised access to your account.",
      },
    ],
  },
  {
    number: "4",
    title: "Prediction Markets",
    subsections: [
      {
        heading: "4.1 How Markets Work",
        text: "Oro uses a parimutuel pool model. All stakes placed on a market are pooled together. When the market resolves, the total pool (minus the platform fee) is distributed proportionally among users who bet on the winning outcome.",
      },
      {
        heading: "4.2 Market Categories",
        text: "Oro hosts prediction markets across: Sports, Weather, Entertainment, Economy, and Other categories.",
      },
      {
        heading: "4.3 Platform Fee",
        text: "A platform fee is deducted from the total pool before distributing payouts. Individual markets may carry a different fee, which will always be disclosed.",
      },
      {
        heading: "4.4 Dynamic Odds",
        text: "Odds in a parimutuel market are not fixed. They change in real time as more bets are placed. Your final payout depends on the total pool composition at market close. Oro does not guarantee any specific return.",
      },
      {
        heading: "4.5 Minimum Bet",
        text: "The minimum bet per position is Nu 50. Bets below this amount will be rejected.",
      },
      {
        heading: "4.6 Market Closing",
        text: "Markets close at the deadline set by the administrator. No bets can be placed after a market closes.",
      },
      {
        heading: "4.7 Market Resolution",
        text: "Markets are resolved by the Oro administration team based on verified outcomes. Users with an active position may dispute a proposed resolution during the objection window (see Section 7).",
      },
      {
        heading: "4.8 Source Verification",
        text: "The administration team cross-references multiple independent and trusted sources before proposing a resolution. No single report or authority is treated as conclusive on its own.",
      },
      {
        heading: "4.9 Market Cancellation",
        text: "Oro reserves the right to cancel a market if the underlying event is cancelled, postponed indefinitely, or if a fair resolution is not possible. All stakes are refunded in full upon cancellation.",
      },
    ],
  },
  {
    number: "5",
    title: "Wallet, Deposits, and Withdrawals",
    subsections: [
      {
        heading: "5.1 In-App Wallet",
        text: "Each Oro account has an in-app wallet balance denominated in Bhutanese Ngultrum (Nu / BTN). This balance is used exclusively within Oro to place bets and receive payouts.",
      },
      {
        heading: "5.2 Deposits",
        text: "Minimum: Nu 50 | Maximum: Nu 15,000 per transaction. Processed near-instantly via DK Bank OTP-verified pull-payment. You must enter the OTP sent to your registered DK Bank phone to authorise each deposit.",
      },
      {
        heading: "5.3 Withdrawals",
        text: "Minimum: Nu 50 per transaction. Near-instant during DK Bank operating hours. Authorised via OTP sent to your Telegram account. Funds are pushed directly to your linked DK Bank account.",
      },
      {
        heading: "5.4 Bonus Balance",
        text: "Bonus credits are not real money — they are promotional play credits. They cannot be withdrawn under any circumstances. If you win a market position funded with bonus credits, you do not receive a real money payout — winnings are returned as bonus credits only. If you lose a position funded with bonus credits, the opposing real-money winners still receive their full payout (the platform covers it). Bonus credits cannot be transferred between users and may be revoked at any time.",
      },
      {
        heading: "5.5 Failed Transactions",
        text: "If a DK Bank transaction fails after OTP submission, no funds will be debited and no balance will be credited. You may retry by initiating a new deposit.",
      },
    ],
  },
  {
    number: "6",
    title: "Welcome Bonus and Referral Programme",
    subsections: [
      {
        heading: "6.1 Welcome Bonus",
        text: "All new users receive a Nu 20 welcome bonus on first registration. This is non-transferable, non-refundable, and granted once per user. It is subject to the bonus credit rules in Section 5.4 — not redeemable as real money.",
      },
      {
        heading: "6.2 Referral Programme",
        text: "When a referred user places their first bet, you receive a Nu 25 flat bonus plus 5% of their first prediction (up to Nu 75 total per referral). A milestone reward of Nu 500 is granted on 10 converted referrals. Self-referrals are rejected. Any abuse of the referral programme will result in forfeiture and account suspension.",
      },
    ],
  },
  {
    number: "7",
    title: "Dispute and Objection Process",
    subsections: [
      {
        heading: "7.1 Objection Window",
        text: "After a market is submitted for resolution, there is a configurable objection window (10–120 minutes per market) during which users with an active position may raise an objection.",
      },
      {
        heading: "7.2 Objection Bond",
        text: "Filing an objection requires a Nu 10 dispute bond to be locked from your wallet balance. This bond is held while the objection is under review.",
      },
      {
        heading: "7.3 Objection Outcomes",
        text: "If upheld: bond returned in full and resolution amended. If rejected: bond is forfeited to the market pool.",
      },
      {
        heading: "7.4 Admin Decision",
        text: "The Oro administration team's decision on all disputes is final. Oro does not enter into further correspondence regarding resolved disputes.",
      },
    ],
  },
  {
    number: "8",
    title: "Prohibited Conduct",
    content: ["You agree not to engage in any of the following:"],
    list: [
      "Fraud and Manipulation — Attempting to manipulate market outcomes, colluding with other users, or engaging in any form of market manipulation.",
      "Multiple Accounts — Creating more than one account to circumvent limits, exploit bonuses, or game the referral programme.",
      "Identity Misrepresentation — Using another person's CID, DK Bank account, or Telegram account.",
      "Automated Bots — Using automated scripts or bots to place bets (except through official Telegram bot commands as intended).",
      "Exploitation of Bugs — Deliberately exploiting any technical error or vulnerability. You must report discovered bugs to Oro immediately.",
      "Money Laundering — Using Oro in any way that facilitates money laundering or financing of illegal activities.",
      "Chargebacks — Initiating chargebacks or payment reversals through DK Bank after funds have been credited to your Oro wallet.",
      "Harassment — Harassing, threatening, or abusing other users or Oro staff.",
      "Circumvention — Attempting to circumvent any rate limit, security measure, or access control.",
    ],
  },
  {
    number: "9",
    title: "Responsible Prediction",
    subsections: [
      {
        heading: "9.1 Nature of the Platform",
        text: "Oro is a prediction market platform. Participation involves real financial risk. You may lose the money you deposit. Oro does not guarantee any winnings or returns.",
      },
      {
        heading: "9.2 Voluntary Limits",
        text: "We encourage users to set personal limits on their spending. If you believe you may have a problem with compulsive prediction, please seek assistance from a qualified support service before using this platform.",
      },
      {
        heading: "9.3 Self-Exclusion",
        text: "If you wish to restrict your access to Oro, please contact us via the official Telegram channel. We will make reasonable efforts to process exclusion requests promptly.",
      },
    ],
  },
  {
    number: "10",
    title: "Intellectual Property",
    content: [
      `All content on the Oro platform — including the name "Oro", the platform design, market structure, branding, interface, and software — is the exclusive property of Oro. You are granted a limited, non-exclusive, non-transferable licence to use the Platform for personal, non-commercial purposes.`,
      "You may not copy, reproduce, or redistribute any part of the Platform; reverse-engineer or decompile it; or use Oro's name, brand, or imagery for commercial purposes without express written consent.",
    ],
  },
  {
    number: "11",
    title: "Privacy and Data",
    subsections: [
      {
        heading: "11.1 Data We Collect",
        text: "Telegram user ID, display name, and username; a hashed (one-way HMAC) representation of your phone number; your 11-digit CID and DK Bank account number; in-app transaction and prediction history; device and session data for security purposes.",
      },
      {
        heading: "11.2 How We Use Your Data",
        text: "To operate your account and process transactions; to verify identity and prevent fraud; to communicate via Telegram (OTP notifications, payout confirmations, market updates); and to comply with applicable laws.",
      },
      {
        heading: "11.3 Data Sharing",
        text: "Oro shares data with DK Bank only to the extent necessary to process deposits and withdrawals. We do not sell your personal data to third parties.",
      },
      {
        heading: "11.4 Security",
        text: "All sensitive data is stored using industry-standard encryption. Phone numbers are stored as cryptographic hashes. Passwords are stored using bcrypt. We use HMAC-SHA-256 for phone verification.",
      },
    ],
  },
  {
    number: "12",
    title: "Disclaimers and Limitation of Liability",
    subsections: [
      {
        heading: "12.1 No Guarantee of Service",
        text: 'Oro is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted, error-free, or timely availability of the Platform.',
      },
      {
        heading: "12.2 Financial Risk",
        text: "All participation in prediction markets involves financial risk. You may lose some or all of the money you deposit. You acknowledge that you participate at your own risk.",
      },
      {
        heading: "12.3 Third-Party Services",
        text: "Oro relies on Telegram and DK Bank. We are not responsible for any downtime, errors, or failures caused by these third parties.",
      },
      {
        heading: "12.4 Limitation of Liability",
        text: "To the maximum extent permitted by applicable law, Oro's total liability shall not exceed the amount deposited by you in the 30 days preceding the claim. Oro is not liable for any indirect, incidental, or consequential damages.",
      },
    ],
  },
  {
    number: "13",
    title: "Account Suspension and Termination",
    subsections: [
      {
        heading: "13.1 Suspension by Oro",
        text: "Oro reserves the right to suspend or terminate any account at its sole discretion, including for violation of these Terms, fraud, suspected money laundering, bonus abuse, or chargebacks.",
      },
      {
        heading: "13.2 Effect of Termination",
        text: "Any real money balance (non-bonus funds) remaining will be returned to your linked DK Bank account within a reasonable period, subject to verification. Bonus credits are forfeited upon termination.",
      },
      {
        heading: "13.3 Termination by User",
        text: "You may request account closure at any time by contacting us via the official Telegram channel. Pending prediction will be settled before closure is processed.",
      },
    ],
  },
  {
    number: "14",
    title: "Modifications to the Platform",
    content: [
      "Oro reserves the right to modify, suspend, or discontinue any feature of the Platform at any time without notice. This includes market types, fee structures, bonus programmes, and payment limits. We will endeavour to communicate significant changes through the official Telegram channel in advance where possible.",
    ],
  },
  {
    number: "15",
    title: "Governing Law and Jurisdiction",
    content: [
      "These Terms are governed by and construed in accordance with GMC Gelephu. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction.",
    ],
  },
  {
    number: "16",
    title: "Severability",
    content: [
      "If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will continue in full force and effect.",
    ],
  },
  {
    number: "17",
    title: "Entire Agreement",
    content: [
      "These Terms, together with any additional policies posted on the Platform, constitute the entire agreement between you and Oro with respect to your use of the Platform.",
    ],
  },
];

export function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-main)",
        color: "var(--text-main)",
      }}
    >
      <Helmet>
        <title>Terms of Service | Oro</title>
        <meta name="description" content="Read Oro's Terms of Service. Understand the rules for using Oro's prediction market platform." />
        <link rel="canonical" href="https://oro.fun/terms" />
      </Helmet>
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}
      >
        {/* Intro */}
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
              margin: 0,
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: 1.65,
            }}
          >
            Please read these Terms and Conditions carefully before using Oro.
            By using the platform you agree to be bound by them. For questions
            or support, contact us via{" "}
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

        {/* Sections */}
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

            {/* Bullet list */}
            {"list" in section && section.list && (
              <ul style={{ paddingLeft: 18, margin: "8px 0 0" }}>
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
            18. Contact
          </h3>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            For questions, disputes, or support requests, please contact us
            through:
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
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            opacity: 0.6,
          }}
        >
          By using Oro, you confirm that you have read, understood, and agreed
          to these Terms in their entirety.
        </p>
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
