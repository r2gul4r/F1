# F1 Pulse

F1 시청 보조 웹앱 초기 구현

## 빠른 시작

1. `cp .env.example .env`
2. `.env`에서 `OPENF1_API_KEY`, `INTERNAL_API_TOKEN`, `WATCH_TOKEN_SECRET` 값을 실제 값으로 변경
3. `pnpm install`
4. `docker compose up --build`

## 로컬 개발

1. `cp .env.example .env`
2. `.env`에서 `OPENF1_API_KEY`, `INTERNAL_API_TOKEN`, `WATCH_TOKEN_SECRET` 값을 실제 값으로 변경
3. `pnpm install`
4. `pnpm dev`

기본 접속 경로

- Web: `http://localhost:3000/watch/current`
- Realtime API: `http://localhost:4001/api/v1/sessions/current` (`x-watch-token` 필요)
- WebSocket: `ws://localhost:4001/ws` (`token` 쿼리 필요)

로컬 기능 점검

1. `http://localhost:3000/watch/current` 접속
2. 차량 위치 실시간 이동 확인
3. 드라이버 클릭 후 패널 정보 확인
4. `공식 온보드 열기` 버튼으로 딥링크 확인
5. 순위 6->5 진입 이벤트 발생 시 예측 카드 표시 확인

참고

- OpenF1 응답이 일시 실패하면 워커가 mock 데이터로 자동 fallback

## 워크스페이스

- `apps/web`: 시청 대시보드 UI
- `apps/realtime`: REST/WS 서버
- `apps/worker`: OpenF1 수집 파이프라인
- `packages/shared`: 스키마/보안/규칙 엔진

## 운영 원칙 반영 사항

- 비밀값은 모두 `process.env` 사용
- Postgres는 파라미터 바인딩 쿼리만 사용
- 모델/내부 API 실패 메시지는 opaque 응답 유지
- 사용자 입력 텍스트는 sanitize 처리
