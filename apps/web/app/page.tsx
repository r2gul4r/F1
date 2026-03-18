import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <section className="panel" style={{ width: "min(880px, 92vw)", display: "grid", gap: 20 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="muted">F1 Pulse</div>
          <h1 style={{ margin: 0 }}>실시간 본체는 데스크톱 앱으로 전환 중</h1>
          <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
            공개 웹은 랜딩, 다운로드, 문서, 히스토리컬 데모만 맡는다. 실시간 2.5D 레이스 보드와 HUD 본체는
            로컬 데스크톱 앱으로 옮기는 중이다.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <article className="panel" style={{ padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Desktop</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              로컬 셸, 2.5D 렌더러, HUD, 랩 단위 예측 AI 를 이 경로에서 완성한다.
            </p>
            <Link href="/download">다운로드 및 실행 안내</Link>
          </article>
          <article className="panel" style={{ padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Web Demo</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              현재 웹은 미리보기와 랜딩 경계만 유지한다.
            </p>
            <Link href="/watch/preview">프로토타입 미리보기</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
