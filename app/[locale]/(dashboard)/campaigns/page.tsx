"use client";
import { Suspense, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TabBar } from "@/components/ads/TabBar";
import { TabContent } from "@/components/ads/TabContent";
import { RightPanel } from "@/components/ads/RightPanel";

export default function CampaignsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const openWizard = () => {
    const params = new URLSearchParams();
    params.set("tab", "wizard");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <Suspense>
        <TabBar />
      </Suspense>

      {/* Main content + Right panel */}
      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        {/* Center: tab content */}
        <TabContent onCreateCampaign={openWizard} projectId={projectId} />

        {/* Right: AI panel */}
        <RightPanel projectId={projectId} />
      </div>
    </div>
  );
}
