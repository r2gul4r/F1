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
            <strong>로컬 개발</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              `pnpm dev:desktop`
            </div>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <strong>현재 웹 데모</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              히스토리컬/프로토타입 경로만 유지한다
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">랜딩으로 돌아가기</Link>
          <Link href="/watch/preview">프로토타입 미리보기</Link>
        </div>
      </section>
    </main>
  );
}
