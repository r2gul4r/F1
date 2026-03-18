import Link from "next/link";

export default function HistoryPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <section className="panel" style={{ width: "min(760px, 92vw)", display: "grid", gap: 18 }}>
        <div className="muted">Historical Demo</div>
        <h1 style={{ margin: 0 }}>히스토리컬 데모 진입점</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
          공개 웹에서는 실시간 본체를 중계하지 않는다. 대신 데스크톱 제품이 다루는 레이스 읽기 흐름을
          복원할 수 있는 preview-only 데모와 향후 리플레이 데모 진입점을 이 페이지에서 제공한다.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <article className="panel" style={{ padding: 14 }}>
            <strong>Preview Demo</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              현재 바로 확인 가능한 경로. desktop board 정보 구조와 prediction card 흐름을 preview session으로 보여준다.
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href="/watch/preview">/watch/preview 열기</Link>
            </div>
          </article>
          <article className="panel" style={{ padding: 14 }}>
            <strong>Replay Demo</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              다음 공개 채널 슬라이스에서 mock/replay 기준의 고정 데모 패키지를 이 자리에 연결한다.
            </div>
          </article>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">랜딩으로 돌아가기</Link>
          <Link href="/download">다운로드 안내</Link>
          <Link href="/watch/preview">프로토타입 미리보기</Link>
        </div>
      </section>
    </main>
  );
}
