import React from "react";
import { WatchPreviewClient } from "@/src/components/watch-preview-client";

export const dynamic = "force-dynamic";
const fallbackMessage = "요청 처리 실패";
const unavailableMessage = "공개 웹에서는 preview 세션만 지원합니다.";

export default async function WatchPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (sessionId === "preview") {
    return <WatchPreviewClient />;
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <section className="panel" style={{ width: "min(560px, 92vw)", display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>{fallbackMessage}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {unavailableMessage}
        </p>
      </section>
    </main>
  );
}
