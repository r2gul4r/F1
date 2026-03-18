# F1 Pulse

로컬 데스크톱 앱 전환을 준비 중인 F1 시청 보조 프로젝트

## 빠른 시작

1. `cp .env.example .env`
2. `pnpm env:bootstrap:local`로 `.env`를 보강한다 (`INTERNAL_API_TOKEN`, `OAUTH_PROXY_TOKEN`, `WATCH_TOKEN_SECRET` placeholder를 로컬 강한 값으로 교체)
3. 로컬 MVP만 볼 경우 `DATA_SOURCE=mock` 으로 두고, AI 없이 개발할 경우 `AI_PROVIDER=disabled` 로 둔다
4. 실데이터 adapter 를 붙일 경우 필요한 외부 키만 실제 값으로 변경한다
5. Gemini를 사용할 경우 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`를 함께 설정한다
6. 필요하면 `.env`에서 `INTERNAL_API_TOKEN`, `OAUTH_PROXY_TOKEN`, `WATCH_TOKEN_SECRET` 값을 직접 지정한다
7. `pnpm install`
8. `pnpm validate:preflight`
9. `pnpm build:desktop`
10. `pnpm dev:desktop`

## Desktop 로컬 개발

1. `cp .env.example .env`
2. `pnpm env:bootstrap:local`로 `.env`를 보강한다 (`INTERNAL_API_TOKEN`, `OAUTH_PROXY_TOKEN`, `WATCH_TOKEN_SECRET` placeholder를 로컬 강한 값으로 교체)
3. 로컬 MVP만 볼 경우 `DATA_SOURCE=mock` 으로 두고, AI 없이 개발할 경우 `AI_PROVIDER=disabled` 로 둔다
4. 실데이터 adapter 를 붙일 경우 필요한 외부 키만 실제 값으로 변경한다
5. Gemini를 사용할 경우 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`를 함께 설정한다
6. 필요하면 `.env`에서 `INTERNAL_API_TOKEN`, `OAUTH_PROXY_TOKEN`, `WATCH_TOKEN_SECRET` 값을 직접 지정한다
7. `pnpm install`
8. `pnpm validate:preflight`
9. `pnpm build:desktop`
10. `pnpm dev:desktop`

기본 접속 경로

- Desktop renderer: `pnpm dev:desktop` 실행 후 Electron 창
- Web preview only: `http://localhost:3000/watch/preview`
- Public web non-preview watch 경로와 `/api/auth/watch-session`은 의도적으로 비활성화되어 있다
- Realtime API: `http://localhost:4001/api/v1/sessions/current` (`x-watch-token` 필요)
- WebSocket: `ws://localhost:4001/ws` (`token` 쿼리 필요)

로컬 smoke check

1. `pnpm build:desktop`
2. `pnpm dev:desktop`
3. Electron 창에서 2.5D race board, 차량 보간 이동, 선택 드라이버 HUD가 보이는지 확인
4. 집중 모드 토글과 드라이버 선택 전환이 동작하는지 확인
5. 웹은 `http://localhost:3000/watch/preview`만 확인하고 non-preview watch 경로가 비활성화 상태인지 확인

참고

- 기본 제품 경로는 `desktop + realtime + shared (+ core)` 이다
- `workers/python`은 현재 기본 경로가 아니며, offline 분석/ingestion 필요 시 별도 서비스로 추가한다
- `.env` 기본 시크릿 자동 보강은 `pnpm env:bootstrap:local`
- 로컬 개발에서 외부 데이터 없이 보려면 `DATA_SOURCE=mock` 을 쓴다
- 로컬 AI나 Gemini API가 없으면 `AI_PROVIDER=disabled` 로 두고 fallback 예측만 확인할 수 있다
- 로컬 Ollama를 쓸 경우 `AI_PROVIDER=ollama`, Gemini를 쓸 경우 `AI_PROVIDER=gemini` 와 `GEMINI_API_KEY`를 함께 설정한다
- 자동 근무 시작 전 점검은 `pnpm autonomous:preflight`
- 수동 점검은 `pnpm install` 이후 `pnpm validate:preflight`

## 워크스페이스

- `apps/desktop`: Electron 셸과 로컬 앱 renderer 초안
- `apps/web`: 시청 대시보드 UI
- `apps/realtime`: REST/WS 서버
- `packages/shared`: 스키마/보안/규칙 엔진

## 배포와 운영

- public 과 developer 모드는 `.env` 값만 바꿔서 전환한다
- desktop build: `pnpm build:desktop`
- desktop local smoke: `pnpm build:desktop` 후 `pnpm dev:desktop`
- 배포 전 점검, smoke check, rollback 시작점은 `docs/deployment-runbook.md` 를 따른다
- AI 요청 안정화 주요 환경 변수
  - `AI_REQUEST_TIMEOUT_MS`: AI provider 요청 timeout(ms)
- compose health 빠른 확인 경로
  - 상태: `docker compose ps realtime web`
  - realtime: `http://localhost:4001/healthz`
  - web preview: `http://localhost:3000/watch/preview`
  - 상세 기준: `docs/deployment-runbook.md` 의 `배포 직후 smoke check`, `운영 중 확인 포인트`

## 멀티 에이전트 워크플로우

- 메인 스레드 시작 명령: `!출근`
- Codex 앱 직접 실행을 계속 이어가려면 1회 설치: `pnpm autonomous:app-workday:install`
- 앱 직접 `!출근` 직후 현재 세션 등록: `pnpm autonomous:app-workday:activate`
- 앱 자동 근무 중지: `pnpm autonomous:app-workday:deactivate`
- 앱 자동 근무 상태 확인: `pnpm autonomous:app-workday:status`
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
