import { createWatchToken } from "@f1/shared/watch-token";
import { WatchClient } from "@/src/components/watch-client";

export const dynamic = "force-dynamic";

const hasStrongSecret = (value: string | undefined): value is string =>
  Boolean(
    value &&
    value.trim().length >= 24 &&
    ![
      "replace-this-token",
      "replace-with-strong-internal-token-32chars",
      "replace-with-strong-watch-token-secret-32chars"
    ].includes(value.trim().toLowerCase())
  );

export default async function WatchPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const watchTokenSecret = process.env.WATCH_TOKEN_SECRET;

  if (!hasStrongSecret(watchTokenSecret)) {
    throw new Error("요청 처리 실패");
  }

  const watchToken = createWatchToken(watchTokenSecret, 60 * 60 * 3);
  return <WatchClient sessionId={sessionId} watchToken={watchToken} />;
}
