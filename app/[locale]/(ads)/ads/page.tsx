"use client";
import { Suspense, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TopBar } from "@/components/ads/TopBar";
import { LeftPanel } from "@/components/ads/LeftPanel";
import { TabBar } from "@/components/ads/TabBar";
import { TabContent } from "@/components/ads/TabContent";
import { RightPanel } from "@/components/ads/RightPanel";
import { PlatformCabinet } from "@/components/ads/PlatformCabinet";

export default function AdsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [activePlatform, setActivePlatform] = useState<string>("all");

  const openWizard = () => {
    const params = new URLSearchParams();
    params.set("tab", "wizard");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePlatformClick = (key: string) => {
    // Toggle: if same platform clicked again, go back to all
    setActivePlatform((prev) => (prev === key ? "all" : key));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text-primary)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <TopBar
        onNewCampaign={openWizard}
        projectId={projectId}
        onProjectChange={setProjectId}
      />
      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        <LeftPanel
          activePlatform={activePlatform}
          onPlatformClick={handlePlatformClick}
          projectId={projectId}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {activePlatform !== "all" ? (
            /* Platform cabinet view */
            <PlatformCabinet
              platformKey={activePlatform}
              projectId={projectId}
              onBack={() => setActivePlatform("all")}
            />
          ) : (
            /* Main tabs */
            <>
              <Suspense>
                <TabBar />
              </Suspense>
              <TabContent onCreateCampaign={openWizard} projectId={projectId} />
            </>
          )}
        </div>

        <RightPanel projectId={projectId} />
      </div>
    </div>
  );
}
