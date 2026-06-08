"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CampaignsView } from "./CampaignsView";
import { WizardView } from "./WizardView";
import { CreativesView } from "./CreativesView";
import { ReportsView } from "./ReportsView";
import { ConnectView } from "./ConnectView";

type TabKey = "campaigns" | "wizard" | "creatives" | "reports" | "connect";

function Inner({
  onCreateCampaign,
  projectId,
}: {
  onCreateCampaign?: () => void;
  projectId?: string;
}) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) ?? "campaigns";
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
      {tab === "campaigns" && (
        <CampaignsView
          onCreateCampaign={onCreateCampaign}
          projectId={projectId}
        />
      )}
      {tab === "wizard" && (
        <WizardView onClose={() => {}} projectId={projectId} />
      )}
      {tab === "creatives" && <CreativesView projectId={projectId} />}
      {tab === "reports" && <ReportsView projectId={projectId} />}
      {tab === "connect" && <ConnectView projectId={projectId} />}
    </div>
  );
}

export function TabContent({
  onCreateCampaign,
  projectId,
}: {
  onCreateCampaign?: () => void;
  projectId?: string;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          <CampaignsView />
        </div>
      }
    >
      <Inner onCreateCampaign={onCreateCampaign} projectId={projectId} />
    </Suspense>
  );
}
