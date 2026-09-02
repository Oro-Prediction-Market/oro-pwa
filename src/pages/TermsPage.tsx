import { ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SECTIONS = [
  {
    number: "1",
    title: "Introduction",
    content: [
      "ORO lets people trade on what they think will happen in the world. These Terms are the rulebook for using it.",
    ],
    subsections: [
      {
        heading: "1.1 Who We Are",
        text: 'ORO is a collective intelligence and consensus forecasting platform operated by ORO ("ORO," "we," "us," or "the Company"), operating under the regulatory framework of the Gelephu Mindfulness City Authority (GMCA).',
      },
      {
        heading: "1.2 What ORO Does",
        text: "ORO enables users to express probabilistic views on future events through structured prediction markets, and aggregates those views into consensus forecasts intended to surface distributed human knowledge.",
      },
      {
        heading: "1.3 The Agreement",
        text: 'These Terms of Use (the "Terms"), together with the Privacy Policy, Community Standards, Prediction Market Rules, Responsible Participation Policy, and any other policy referenced herein (collectively, the "Policies"), form a single binding agreement (the "Agreement") between ORO and each person who accesses or uses ORO (a "User" or "you").',
      },
    ],
  },
  {
    number: "2",
    title: "Acceptance of Terms",
    content: [
      "Creating an account or using ORO means you have read, understood, and agreed to everything in this Agreement — not just this document.",
    ],
    subsections: [
      {
        heading: "2.1 Binding Acceptance",
        text: 'By creating an Account, clicking "I Agree," or otherwise accessing or using ORO, you confirm that you have read, understood, and agree to be bound by the Agreement in its entirety.',
      },
      {
        heading: "2.2 If You Do Not Agree",
        text: "If you do not agree to the Agreement, you must not create an Account or otherwise use ORO.",
      },
      {
        heading: "2.3 Organizations",
        text: 'If you are using ORO on behalf of an organization, you represent that you have authority to bind that organization, and "you" refers to both you individually and the organization.',
      },
    ],
  },
  {
    number: "3",
    title: "Definitions",
    content: [
      "A glossary so the rest of the document doesn't have to keep re-explaining itself.",
    ],
    table: [
      {
        term: "Account",
        def: "The registered ORO profile through which a User accesses the Platform.",
      },
      {
        term: "Market",
        def: "A structured question on ORO with defined possible Outcomes on which Users may take positions.",
      },
      {
        term: "Outcome",
        def: "A possible resolution value of a Market, as defined in the Market's published rules.",
      },
      {
        term: "Wallet",
        def: "The in-Platform ledger reflecting a User's balance of BTN and/or supported Digital Assets.",
      },
      {
        term: "BTN",
        def: "The initial native unit of value supported for transactions on ORO, as further described in the Digital Asset Policy.",
      },
      {
        term: "Digital Assets",
        def: "BTN, stablecoins, or other blockchain-based assets ORO supports for deposits, withdrawals, or in-Platform use from time to time.",
      },
      {
        term: "USDT",
        def: "Tether (USDT), a US-dollar-denominated stablecoin issued by a third party unaffiliated with ORO, supported on the Platform as a Digital Asset for deposits, withdrawals, and participation in USDT-denominated Markets.",
      },
      {
        term: "Supported Network",
        def: "A blockchain network on which ORO accepts or sends USDT, as published on the Platform at the time of the transaction. Supported Networks may be added or withdrawn at ORO's discretion.",
      },
      {
        term: "Deposit Address",
        def: "A blockchain address issued to a User for a single deposit on a specified Supported Network, valid only for a limited period.",
      },
      {
        term: "Whitelisted Address",
        def: "A blockchain address a User has registered to their Account in advance and to which USDT withdrawals may be sent.",
      },
      {
        term: "Platform",
        def: "The ORO website, mobile applications, APIs, and related services.",
      },
      {
        term: "GMCA",
        def: "The Gelephu Mindfulness City Authority, the regulatory authority under which ORO operates.",
      },
      {
        term: "Collective Intelligence",
        def: "The aggregation of individual User predictions into consensus forecasts.",
      },
      {
        term: "Prediction Market",
        def: "A Market structured so that prices or aggregated positions reflect the collective probability Users assign to an Outcome.",
      },
    ],
  },
  {
    number: "4",
    title: "Eligibility",
    content: [
      "You need to be an adult, legally allowed to use ORO where you live, and not on a sanctions list.",
    ],
    subsections: [
      {
        heading: "4.1 Age",
        text: "You must be at least 18 years old, or the age of legal majority in your jurisdiction if higher, to create an Account.",
      },
      {
        heading: "4.2 Legal Capacity",
        text: "You must have the legal capacity to enter into a binding agreement, and your use of ORO must be lawful under the laws applicable to you, including any laws governing prediction markets, gambling, or derivatives trading in your jurisdiction.",
      },
      {
        heading: "4.3 Restricted Jurisdictions & Sanctions",
        text: "You must not be a resident of, or accessing ORO from, any jurisdiction where prediction markets of the type ORO offers are prohibited, nor be subject to sanctions administered by the United Nations, GMCA, or any other authority applicable to ORO.",
      },
      {
        heading: "4.4 Access Restrictions",
        text: "ORO may restrict, suspend, or deny access to any person or jurisdiction at its discretion, including to comply with legal or regulatory requirements, and may request evidence of eligibility at any time.",
      },
    ],
  },
  {
    number: "5",
    title: "Account Registration & Identity Verification (KYC)",
    content: [
      "You give us accurate information, we may need to verify who you are, and you're responsible for keeping your account secure.",
    ],
    subsections: [
      {
        heading: "5.1 Accurate Information",
        text: "You agree to provide accurate, current, and complete information during registration and to keep it up to date.",
      },
      {
        heading: "5.2 Identity Verification",
        text: 'ORO may require identity verification ("KYC"), source-of-funds information, and ongoing due diligence, consistent with our AML/CFT & KYC Policy, before permitting deposits, withdrawals, or participation in certain Markets.',
      },
      {
        heading: "5.3 Account Security",
        text: "You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your Account. Notify ORO immediately of any unauthorized use.",
      },
      {
        heading: "5.4 Verification for USDT",
        text: "Identity verification is a precondition of USDT use. No USDT deposit may be made until a User has submitted identity documents and those documents have been approved. ORO may decline to approve verification, and may suspend USDT functionality on an Account, without being required to give reasons beyond those required by applicable law.",
      },
      {
        heading: "5.5 One Account",
        text: "One natural person or legal entity may hold only one Account, except where ORO expressly authorizes otherwise (see Section 8 on Prohibited Conduct).",
      },
    ],
  },
  {
    number: "6",
    title: "Platform Services",
    content: [
      "We provide prediction markets and forecasting tools, and we can change or discontinue features.",
    ],
    subsections: [
      {
        heading: "6.1 The Services",
        text: 'ORO provides access to prediction markets, consensus forecasting tools, research insights, and related features (the "Services").',
      },
      {
        heading: "6.2 Changes to Services",
        text: "ORO may add, modify, suspend, or discontinue any Service, in whole or in part, at any time, with notice where reasonably practicable.",
      },
      {
        heading: "6.3 Availability by Jurisdiction",
        text: "Availability of specific Markets, assets, or features may vary by jurisdiction based on applicable law.",
      },
    ],
  },
  {
    number: "7",
    title: "Prediction Markets — How They Work",
    content: [
      "Each market has its own rulebook. Read it before you trade — it controls how the market resolves.",
    ],
    subsections: [
      {
        heading: "7.1 Market Rules",
        text: "Each Market specifies its question, possible Outcomes, resolution source(s), and resolution timeline at the time the Market is created, in accordance with the Prediction Market Rules (Volume II).",
      },
      {
        heading: "7.2 Accepting Market Rules",
        text: "By taking a position in a Market, you accept that Market's specific rules as binding, in addition to this Agreement.",
      },
      {
        heading: "7.3 Prices Are Not Advice",
        text: "Prices or odds within a Market reflect the aggregated positions of participating Users and are not guarantees, forecasts, or advice from ORO.",
      },
      {
        heading: "7.4 Risk Controls",
        text: "ORO may set position limits, margin requirements, or other risk controls on any Market at its discretion.",
      },
    ],
  },
  {
    number: "8",
    title: "Market Integrity & Prohibited Conduct",
    content: [
      "Don't cheat, collude, use bots to manipulate markets, run multiple accounts, or break the law on ORO.",
    ],
    subsections: [
      {
        heading: "8.1 Prohibited Conduct",
        text: 'Users must not engage in, attempt, or facilitate: (a) market manipulation, including wash trading or coordinated positioning intended to distort a Market\'s price; (b) collusion between accounts; (c) use of material non-public information to gain an unfair advantage ("insider abuse"); (d) operation of undisclosed multiple accounts; (e) unauthorized automated trading, scraping, or bot activity; (f) fraud, identity misrepresentation, or circumvention of KYC controls; or (g) any activity unlawful in the applicable jurisdiction.',
      },
      {
        heading: "8.2 Enforcement",
        text: "ORO may investigate suspected violations, freeze affected positions or Wallet balances pending investigation, void or reprice affected Market positions, and suspend or terminate Accounts, in accordance with the Community Standards (Volume V).",
      },
      {
        heading: "8.3 Finality of Determinations",
        text: "ORO's determination of a violation, made reasonably and in accordance with its published policies, is final for purposes of internal Platform enforcement, without prejudice to a User's rights under Section 19 (Dispute Resolution).",
      },
    ],
  },
  {
    number: "9",
    title: "Market Resolution & Settlement",
    content: [
      "Markets resolve based on published rules and data sources. There's an appeals process if something looks wrong.",
    ],
    subsections: [
      {
        heading: "9.1 Resolution Methodology",
        text: "Markets resolve according to the resolution source(s) and methodology disclosed at Market creation, as further detailed in the Prediction Market Rules.",
      },
      {
        heading: "9.2 Ambiguous or Disputed Sources",
        text: "Where a Market's resolution source is ambiguous, unavailable, or disputed, ORO will apply the Invalid Market and Appeals procedures set out in Volume II.",
      },
      {
        heading: "9.3 Settlement",
        text: "Settlement of Wallet balances following resolution will occur within the timeframe published for the relevant Market, subject to applicable KYC and withdrawal controls.",
      },
    ],
  },
  {
    number: "10",
    title: "Fees & Wallets",
    content: [
      "We may charge fees, published on the platform, and we currently support BTN with other assets to follow.",
    ],
    subsections: [
      {
        heading: "10.1 Fees",
        text: "ORO may charge fees for Market creation, trading, withdrawals, or other Services. Current fees are published on the Platform and may change with reasonable prior notice.",
      },
      {
        heading: "10.2 Supported Assets",
        text: "ORO initially supports BTN as its native transactional unit. Support for additional Digital Assets or stablecoins will be governed by the Digital Asset Policy (Volume VIII) and does not require amendment of these Terms to take effect.",
      },
      {
        heading: "10.3 USDT Deposits",
        text: "USDT deposits must be sent as the USDT token on a Supported Network, to the Deposit Address issued for that deposit, within the validity period shown. A Deposit Address is single-use and must not be reused. Deposits are credited only after the transaction confirms on the relevant network. Minimum and maximum deposit amounts are published on the Platform and may be changed at any time.",
      },
      {
        heading: "10.4 Wrong-Network and Misdirected Transfers",
        text: "Blockchain transfers are irreversible and cannot be recalled by ORO. Assets sent on a network other than the one displayed, sent as a token other than USDT, sent to an expired or reused Deposit Address, or sent to an address not issued to you, may be permanently and unrecoverably lost. ORO has no obligation to recover such assets, and recovery may be technically impossible. You are solely responsible for confirming the network and address before sending.",
      },
      {
        heading: "10.5 USDT Withdrawals",
        text: "USDT withdrawals may be sent only to a Whitelisted Address registered to your Account on a Supported Network. ORO may apply minimum withdrawal amounts, holding periods, and additional verification before processing a withdrawal, and may decline or delay a withdrawal where required for compliance, security, or fraud prevention. Once broadcast to the network, a withdrawal cannot be reversed.",
      },
      {
        heading: "10.6 Network Fees",
        text: "Blockchain network fees are separate from any ORO fee, are set by the relevant network rather than by ORO, and are borne by the sending party. Network fees may vary substantially between Supported Networks and may exceed the value of a small transfer.",
      },
      {
        heading: "10.7 Currency Segregation",
        text: "BTN and USDT balances are held and accounted for separately. ORO does not operate an exchange, does not convert between BTN and USDT, and does not publish or apply any exchange rate between them. A position taken in one unit is staked, resolved, and settled in that same unit; balances in one unit can never be used for Markets, bonds, or payouts denominated in the other.",
      },
      {
        heading: "10.8 No Interest or Custody Services",
        text: "Wallet balances are held for the purpose of participating in Markets and are not a deposit, investment, or interest-bearing account. ORO pays no interest on balances and does not offer custody, staking, lending, or yield services in respect of any Digital Asset.",
      },
      {
        heading: "10.9 Taxes",
        text: "Users are responsible for any taxes arising from their use of ORO.",
      },
    ],
  },
  {
    number: "11",
    title: "Responsible Participation",
    content: [
      "Prediction markets can be risky and habit-forming for some people. We offer tools to help you stay in control — use them.",
    ],
    subsections: [
      {
        heading: "11.1 Voluntary Tools",
        text: "ORO provides voluntary tools including spending limits, cooling-off periods, and self-exclusion, as described in the Responsible Participation Policy (Volume IV).",
      },
      {
        heading: "11.2 Participate Within Your Means",
        text: "Users are encouraged to participate only with funds they can afford to risk and to treat Market participation as inherently uncertain.",
      },
      {
        heading: "11.3 Seeking Support",
        text: "Users who believe they may be experiencing harm from their participation are encouraged to use self-exclusion tools and seek independent support; ORO's provision of these tools does not constitute medical or professional advice.",
      },
    ],
  },
  {
    number: "12",
    title: "Risk Disclosure",
    content: [
      "You can lose the full amount you put into a market. ORO isn't giving you financial advice and doesn't guarantee any outcome.",
    ],
    subsections: [
      {
        heading: "12.1 Risk of Loss",
        text: "Participation in prediction markets involves risk of total loss of funds committed to a position. Past accuracy of consensus forecasts on ORO does not guarantee future accuracy.",
      },
      {
        heading: "12.2 No Advice",
        text: "ORO does not provide investment, financial, legal, or tax advice. Nothing on the Platform, including aggregated forecasts or AI-generated insights, should be treated as a recommendation to take any action.",
      },
      {
        heading: "12.3 Digital Asset Risks",
        text: "Digital Assets are volatile and subject to risks including price fluctuation, regulatory change, and technical failure. ORO is not responsible for losses arising from these risks.",
      },
      {
        heading: "12.4 Stablecoin Risk",
        text: "USDT is issued and administered by a third party over which ORO has no control. Its value is not guaranteed by ORO. A stablecoin may lose its peg to the US dollar, its issuer may become unable or unwilling to honour redemptions, may freeze or blacklist addresses, or may cease operations. ORO does not insure, guarantee, or underwrite the value or redeemability of USDT, and does not compensate Users for losses arising from issuer conduct or loss of peg.",
      },
      {
        heading: "12.5 Blockchain and Network Risk",
        text: "Blockchain transactions are irreversible, pseudonymous, and outside ORO's control once broadcast. Networks may congest, fork, halt, reorganise, or fail, and third-party infrastructure ORO relies on may be interrupted. These events may delay or prevent deposits and withdrawals. ORO is not liable for losses arising from network conditions, third-party infrastructure failure, or the irreversibility of blockchain transactions.",
      },
      {
        heading: "12.6 Regulatory Risk",
        text: "The regulatory treatment of stablecoins and Digital Assets is evolving. Changes in law, regulation, or the requirements of ORO's banking, payment, or infrastructure partners may require ORO to restrict, suspend, or withdraw USDT functionality — including in a particular jurisdiction or for a particular User — with such notice as is reasonably practicable.",
      },
    ],
  },
  {
    number: "13",
    title: "AI & Collective Intelligence",
    content: [
      "We use AI to help markets run fairly and to generate insights, but a human is always meant to be in the loop for anything that matters.",
    ],
    subsections: [
      {
        heading: "13.1 Use of AI",
        text: "ORO may use artificial intelligence and machine learning tools to support market integrity monitoring, research, analytics, and consensus-forecast generation, as described in the AI & Collective Intelligence Policy (Volume VI).",
      },
      {
        heading: "13.2 Informational Only",
        text: "AI-generated outputs are provided for informational purposes only and do not replace independent human judgment. ORO does not warrant the accuracy of AI-generated content.",
      },
      {
        heading: "13.3 Oversight",
        text: "ORO applies bias-mitigation and human-oversight measures to AI systems materially affecting Users, consistent with Volume VI.",
      },
    ],
  },
  {
    number: "14",
    title: "Intellectual Property",
    content: [
      "The platform, its branding, and its underlying tech belong to ORO. You get a license to use it, not ownership of it.",
    ],
    subsections: [
      {
        heading: "14.1 Ownership",
        text: "All software, algorithms, interfaces, trademarks, and content comprising the Platform are owned by ORO or its licensors and protected by applicable intellectual property laws.",
      },
      {
        heading: "14.2 Your License",
        text: "ORO grants Users a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purpose, subject to this Agreement.",
      },
      {
        heading: "14.3 User Content",
        text: "Users retain ownership of content they submit to the Platform (e.g., Market proposals, comments) but grant ORO a worldwide, royalty-free license to use, display, and process that content in connection with operating the Platform.",
      },
    ],
  },
  {
    number: "15",
    title: "Privacy",
    content: [
      "What we collect and why is spelled out in the Privacy Policy — this section just points you there.",
    ],
    subsections: [
      {
        heading: "15.1 Privacy Policy",
        text: "ORO processes personal information in accordance with the Privacy Policy (Volume III), which forms part of this Agreement.",
      },
      {
        heading: "15.2 Aggregated Data",
        text: "Aggregated and anonymized platform data may be used for research, academic collaboration, and AI model improvement, in accordance with the Research & Data Governance Policy (Volume IX) and applicable data protection law.",
      },
    ],
  },
  {
    number: "16",
    title: "Suspension & Termination",
    content: [
      "We can suspend or close accounts for breaking the rules or for legal reasons; you can close your account too, subject to settling open positions.",
    ],
    subsections: [
      {
        heading: "16.1 Suspension by ORO",
        text: "ORO may suspend or terminate an Account, with or without notice, where a User breaches this Agreement, engages in Prohibited Conduct, or where required by law or GMCA directive.",
      },
      {
        heading: "16.2 Closure by You",
        text: "Users may close their Account at any time, subject to settlement of open Market positions and any outstanding obligations.",
      },
      {
        heading: "16.3 Survival",
        text: "Sections of this Agreement that by their nature should survive termination — including Intellectual Property, Disclaimers, Limitation of Liability, and Governing Law — will survive.",
      },
    ],
  },
  {
    number: "17",
    title: "Disclaimers",
    content: [
      `ORO is provided "as is." We don't guarantee it will be error-free, uninterrupted, or that any market outcome will go a particular way.`,
    ],
    subsections: [
      {
        heading: "17.1 As-Is Basis",
        text: 'THE PLATFORM AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT, EXCEPT AS REQUIRED BY LAW.',
      },
      {
        heading: "17.2 No Guarantee of Availability",
        text: "ORO does not guarantee that the Platform will be uninterrupted, secure, or error-free, or that any Market will resolve in a particular manner.",
      },
      {
        heading: "17.3 Third-Party Data",
        text: "ORO does not guarantee the accuracy, completeness, or timeliness of third-party data sources used for Market resolution.",
      },
    ],
  },
  {
    number: "18",
    title: "Limitation of Liability & Indemnification",
    content: [
      "Our liability to you is capped, and we're not on the hook for indirect losses or for mistakes you make when sending crypto. You agree to cover us if your misuse of ORO gets us sued.",
    ],
    subsections: [
      {
        heading: "18.1 No Indirect Damages",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, ORO WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM.",
      },
      {
        heading: "18.2 Liability Cap",
        text: "ORO's aggregate liability arising from this Agreement will not exceed the greater of (a) the fees you paid to ORO in the twelve (12) months preceding the claim, or (b) the GMCA-equivalent minimum amount specified by applicable law, except where such limitation is unenforceable under mandatory law.",
      },
      {
        heading: "18.3 User Error and Misdirected Transfers",
        text: "You are solely responsible for the accuracy of every address, network, and amount you enter or confirm. ORO is not liable for any loss arising from a transfer you sent to an incorrect, mistyped, outdated, expired, or third-party address; sent on a network other than the one displayed; sent as a token other than USDT; or sent from or to an address or wallet you do not control, including where the error results from a typing mistake, a copy-and-paste failure, clipboard-altering malware, a phishing message, or an address supplied to you by any person other than ORO. Blockchain transactions are final on confirmation and cannot be reversed, cancelled, or redirected by ORO. ORO does not hold the receiving keys for any address other than its own, has no ability to recover assets that reached an address it does not control, and is under no obligation to attempt recovery, to trace a transfer, or to credit, reimburse, or replace the amount lost. Any assistance ORO chooses to offer in such a case is provided as a courtesy, does not create an obligation or an admission of liability, and carries no guarantee of success. This Section applies notwithstanding any other provision of this Agreement.",
      },
      {
        heading: "18.4 Indemnification",
        text: "You agree to indemnify and hold ORO harmless from claims, losses, or expenses (including reasonable legal fees) arising from your breach of this Agreement, your violation of law, or your Market participation.",
      },
    ],
  },
  {
    number: "19",
    title: "Governing Law & Dispute Resolution",
    content: [
      "Disputes are handled under GMCA rules, with an escalation path before anyone goes to formal proceedings.",
    ],
    subsections: [
      {
        heading: "19.1 Governing Law",
        text: "This Agreement is governed by the laws and regulations applicable within the Gelephu Mindfulness City Authority, without regard to conflict-of-law principles, subject to any mandatory consumer-protection laws of your jurisdiction that cannot be contractually waived.",
      },
      {
        heading: "19.2 Good-Faith Resolution",
        text: "Before initiating formal proceedings, the parties agree to attempt a good-faith resolution through ORO's internal support and appeals process for a period of 30 days.",
      },
      {
        heading: "19.3 Formal Proceedings",
        text: "Unresolved disputes will be submitted to the dispute resolution mechanism designated under GMCA regulations, seated in Gelephu, Bhutan, conducted in English.",
      },
      {
        heading: "19.4 Injunctive Relief",
        text: "Nothing in this section limits either party's right to seek injunctive relief in a court of competent jurisdiction for misuse of intellectual property or unauthorized access to the Platform.",
      },
    ],
  },
  {
    number: "20",
    title: "Amendments",
    content: [
      "We can update these Terms; if you keep using ORO after an update, that counts as accepting it.",
    ],
    subsections: [
      {
        heading: "20.1 Changes to the Agreement",
        text: "ORO may amend this Agreement from time to time. Material changes will be notified via the Platform or email at least 14 days before taking effect, except where a shorter period is required by law or regulatory directive.",
      },
      {
        heading: "20.2 Continued Use",
        text: "Continued use of the Platform after an amendment takes effect constitutes acceptance of the revised Agreement. If you do not agree, you must stop using the Platform and may close your Account.",
      },
    ],
  },
  {
    number: "21",
    title: "General Provisions",
    content: [
      "Standard boilerplate: if one clause is unenforceable the rest still stands, you can't transfer your account, and this document is the whole agreement between us.",
    ],
    subsections: [
      {
        heading: "21.1 Severability",
        text: "If any provision of this Agreement is found unenforceable, the remaining provisions remain in full force.",
      },
      {
        heading: "21.2 Assignment",
        text: "Users may not assign or transfer their Account or rights under this Agreement without ORO's prior written consent. ORO may assign this Agreement in connection with a merger, acquisition, or sale of assets.",
      },
      {
        heading: "21.3 Entire Agreement",
        text: "This Agreement, together with the Policies it incorporates, constitutes the entire agreement between the parties regarding use of the Platform.",
      },
      {
        heading: "21.4 No Waiver",
        text: "ORO's failure to enforce any provision is not a waiver of its right to do so later.",
      },
      {
        heading: "21.5 Force Majeure",
        text: "ORO is not liable for delays or failures caused by events beyond its reasonable control.",
      },
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
        <title>Terms of Use | Oro</title>
        <meta name="description" content="Read ORO's Terms of Use. Understand the rules for using ORO's collective intelligence and prediction market platform." />
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
              margin: "0 0 8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-main)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ORO — Terms of Use · Version 2.0
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: 1.65,
            }}
          >
            Collective Intelligence & Prediction Market Platform, operated by
            ORO under the jurisdiction of the Gelephu Mindfulness City
            Authority (GMCA).
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--text-main)",
              lineHeight: 1.65,
            }}
          >
            Acceptance of Terms: by creating an Account, clicking "I Agree,"
            or otherwise accessing or using ORO, you confirm that you have
            read, understood, and agree to be bound by this Agreement in its
            entirety. If you do not agree, you must not create an Account or
            otherwise use ORO.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: 1.65,
            }}
          >
            For questions or support, contact us via{" "}
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

        {/* Table of Contents */}
        <div
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "var(--text-main)",
            }}
          >
            Table of Contents
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 22,
              columns: 2,
              columnGap: 24,
              fontSize: "0.85rem",
              lineHeight: 1.9,
            }}
          >
            {[...SECTIONS.map((s) => s.title), "Contact"].map((title, i) => (
              <li key={title} style={{ breakInside: "avoid" }}>
                <a
                  href={`#terms-section-${i + 1}`}
                  style={{
                    color: "var(--color-primary, #2563eb)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <div
            key={section.number}
            id={`terms-section-${section.number}`}
            style={{ marginBottom: 36, scrollMarginTop: 16 }}
          >
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

            {/* Plain-English summary */}
            {"content" in section &&
              section.content?.map((para, i) => (
                <p
                  key={i}
                  style={{
                    margin: "0 0 12px",
                    fontSize: "0.875rem",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {para}
                </p>
              ))}

            {/* Definitions table */}
            {"table" in section && section.table && (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.83rem",
                    lineHeight: 1.6,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          color: "var(--text-main)",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "2px solid var(--glass-border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Term
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          color: "var(--text-main)",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "2px solid var(--glass-border)",
                        }}
                      >
                        Definition
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.map((row) => (
                      <tr key={row.term}>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontWeight: 700,
                            color: "var(--text-main)",
                            borderBottom: "1px solid var(--glass-border)",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                          }}
                        >
                          {row.term}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            borderBottom: "1px solid var(--glass-border)",
                          }}
                        >
                          {row.def}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          id="terms-section-22"
          style={{
            background: "rgba(37,99,235,0.06)",
            border: "1px solid rgba(37,99,235,0.2)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 24,
            scrollMarginTop: 16,
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
            22. Contact
          </h3>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            How to reach us for legal notices or general support:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              For legal notices and general support, use the in-app Contact
              Support (Settings → Support).
            </span>
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
          By using ORO, you confirm that you have read, understood, and agreed
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
          © 2026 ORO. All rights reserved.
        </p>
      </div>
    </div>
  );
}
