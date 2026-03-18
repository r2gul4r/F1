import React from "react";

export const App = () => {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">F1 Pulse Desktop</div>
        <h1>데스크톱 셸 초안</h1>
        <p className="lead">
          실시간 본체는 이 앱 안에서 돌리고, 웹은 랜딩과 데모만 맡기는 구조로 전환 중이다.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>이번 슬라이스</h2>
          <ul>
            <li>Electron main, preload, renderer 경계 생성</li>
            <li>로컬 mock 세션 연결을 위한 셸 자리 확보</li>
            <li>웹과 데스크톱 책임 분리 시작</li>
          </ul>
        </article>

        <article className="card">
          <h2>다음 단계</h2>
          <ul>
            <li>core 로직 추출</li>
            <li>2.5D renderer-core 계약 고정</li>
            <li>HUD 와 예측 카드 desktop 정보 구조 재설계</li>
          </ul>
        </article>

        <article className="card">
          <h2>런타임 정보</h2>
          <dl className="meta">
            <div>
              <dt>Platform</dt>
              <dd>{window.desktopShell.platform}</dd>
            </div>
            <div>
              <dt>Electron</dt>
              <dd>{window.desktopShell.versions.electron}</dd>
            </div>
            <div>
              <dt>Chrome</dt>
              <dd>{window.desktopShell.versions.chrome}</dd>
            </div>
            <div>
              <dt>Node</dt>
              <dd>{window.desktopShell.versions.node}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
};
