import Link from "next/link";

export default function DownloadPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <section className="panel" style={{ width: "min(720px, 92vw)", display: "grid", gap: 16 }}>
        <div className="muted">Desktop Distribution</div>
        <h1 style={{ margin: 0 }}>F1 Pulse Desktop 준비 중</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
          현재 공개 웹은 랜딩과 데모만 담당한다. 실시간 본체는 데스크톱 앱으로 옮기는 중이며, 이 페이지는
          다운로드와 설치 안내 진입점 역할을 맡는다.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="panel" style={{ padding: 12 }}>
            <strong>Release tracks</strong>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Windows: `F1-Pulse-Desktop-win-x64.zip`
              <br />
              macOS: `F1-Pulse-Desktop-macos-universal.zip`
              <br />
              Linux: `F1-Pulse-Desktop-linux-x64.tar.gz`
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>Desktop 빌드</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              `pnpm build:desktop`
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>Desktop 실행</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              `pnpm dev:desktop`
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>로컬 smoke check</strong>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              Electron 창에서 race board, 차량 보간 이동, 선택 드라이버 HUD, focus 토글 동작 확인
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>First-run checklist</strong>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              1. mock session으로 desktop 창이 뜨는지 확인
              <br />
              2. `/watch/preview`와 `/history`에서 public web demo entry만 노출되는지 확인
              <br />
              3. `/history/replay`에서 fixed replay demo가 바로 열리는지 확인
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>공개 웹 경계</strong>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              public web은 preview-only 경로(`/watch/preview`)만 유지하고 non-preview watch와 watch-session bridge는 비활성화된다
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">랜딩으로 돌아가기</Link>
          <Link href="/history">히스토리컬 데모 진입점</Link>
          <Link href="/history/replay">리플레이 데모 열기</Link>
          <Link href="/watch/preview">프로토타입 미리보기</Link>
        </div>
      </section>
    </main>
  );
}
