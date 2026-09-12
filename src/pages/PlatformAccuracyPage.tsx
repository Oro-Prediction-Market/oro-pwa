import { FC } from "react";
import { Helmet } from "react-helmet-async";
import { Page } from "@shared/components/Page";
import { PlatformAccuracyPanel } from "@shared/components/PlatformAccuracy";

/**
 * Oro's track record, in public.
 *
 * Reached from Settings, and worth indexing: "how often is the crowd right" is
 * the question a sceptical newcomer arrives with, and this is the page that
 * answers it without an account.
 *
 * The body is shared with the Telegram app byte for byte; only the shell
 * differs, because the two have different headers and back behaviour.
 *
 * No heading of its own: the page shell already renders the route title, and a
 * second copy read as the word printed twice.
 */
export const PlatformAccuracyPage: FC = () => (
  <Page back={true}>
    <Helmet>
      <title>Platform Accuracy | Oro Prediction Market</title>
      <meta
        name="description"
        content="How often the crowd on Oro gets it right: the share of every settled market's pool that backed the winning outcome, overall and week by week."
      />
    </Helmet>
    {/* 1240 to match the route title above it, so the dashboard lines up with
        the heading and the KPI row gets the width it needs on a desktop. A
        narrower column squeezed the four tiles and the two lower panels into
        a single stack with the screen half empty either side. */}
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "16px var(--space-md) 60px",
      }}
    >
      <PlatformAccuracyPanel />
    </div>
  </Page>
);

export default PlatformAccuracyPage;
