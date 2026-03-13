import React from "react";
import { WatchClient } from "@/src/components/watch-client";
import { WatchPreviewClient } from "@/src/components/watch-preview-client";
import { readWatchSessionToken } from "@/src/lib/watch-session-cookie";

export const dynamic = "force-dynamic";
const fallbackMessage = "요청 처리 실패";

export default async function WatchPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (sessionId === "preview") {
    return <WatchPreviewClient />;
  }

  const watchToken = await readWatchSessionToken();
  if (!watchToken) {
    return fallbackMessage;
  }

  return <WatchClient sessionId={sessionId} watchToken={watchToken} />;
}
