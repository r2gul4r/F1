# F1 Pulse

F1 시청 보조 웹앱 초기 구현

## 빠른 시작

1. `cp .env.example .env`
2. `.env`에서 `OPENF1_API_KEY`, `INTERNAL_API_TOKEN`, `WATCH_TOKEN_SECRET` 값을 실제 값으로 변경
3. Gemini를 사용할 경우 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`를 함께 설정
4. `pnpm install`
5. `pnpm validate:env`
6. 전체 사전 점검은 `pnpm validate:preflight`
7. `docker compose up --build`

## 로컬 개발

1. `cp .env.example .env`
2. `.env`에서 `OPENF1_API_KEY`, `INTERNAL_API_TOKEN`, `WATCH_TOKEN_SECRET` 값을 실제 값으로 변경
3. Gemini를 사용할 경우 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`를 함께 설정
4. `pnpm install`
5. `pnpm validate:env`
6. 전체 사전 점검은 `pnpm validate:preflight`
7. `pnpm dev`

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
- AI provider 기본값은 `ollama`이고, Gemini 사용 시 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`가 모두 필요
- 자동 근무 시작 전 점검은 `pnpm autonomous:preflight`
- 수동 점검은 `pnpm install` 이후 `pnpm validate:preflight`

## 워크스페이스

- `apps/web`: 시청 대시보드 UI
- `apps/realtime`: REST/WS 서버
- `apps/worker`: OpenF1 수집 파이프라인
- `packages/shared`: 스키마/보안/규칙 엔진

## 멀티 에이전트 워크플로우

- 메인 스레드 시작 명령: `!출근`
- 다음 날 재개 시 최신 관련 보고서 1개까지 함께 확인
- 상세 운영 규칙: `TEAM_GUIDE.md`
- 실행 계획: `PLAN.md`
- 부모 모델 내부용 슬라이스 기준: `docs/parent-slice-template.md`
- Phase 1 예시 실행 패킷: `docs/phase1-slice1-orchestration.md`
- 원칙:
- `packages/shared` 계약은 먼저 잠그고 구현 에이전트를 병렬 실행
- `frontend_ui`와 `threejs_map`은 파일 충돌이 없을 때만 병렬 실행
- `reviewer`는 항상 read-only로 마지막 검수만 수행

## 운영 원칙 반영 사항

- 비밀값은 모두 `process.env` 사용
- Postgres는 파라미터 바인딩 쿼리만 사용
- 모델/내부 API 실패 메시지는 opaque 응답 유지
- 사용자 입력 텍스트는 sanitize 처리
