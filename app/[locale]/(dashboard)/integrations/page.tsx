"use client";
import { Suspense } from "react";
import { ConnectView } from "@/components/ads/ConnectView";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 border-b border-line px-5 flex items-center flex-shrink-0 sticky top-0 z-10 bg-panel">
        <p className="text-[11px] text-tx-3">
          Маркетинг / <span className="text-tx-2 font-medium">Подключения</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <Suspense>
          <ConnectView />
        </Suspense>
      </div>
    </div>
  );
}
