import Link from "next/link";
import { WatchPreviewClient } from "@/src/components/watch-preview-client";

export default function ReplayDemoPage() {
  return (
    <main style={{ display: "grid", gap: 20, minHeight: "100vh", padding: 24 }}>
      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <div className="muted">Historical Replay Demo</div>
        <h1 style={{ margin: 0 }}>고정 리플레이 데모</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
          공개 웹에서는 실시간 본체를 중계하지 않는다. 이 경로는 desktop 제품이 읽게 되는 race board와
          prediction 흐름을 고정 demo로 재현하는 historical replay entry다.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/history">히스토리컬 데모 목록</Link>
          <Link href="/download">다운로드 안내</Link>
        </div>
      </section>
      <WatchPreviewClient />
    </main>
  );
}
