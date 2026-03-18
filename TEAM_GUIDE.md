# F1 Pulse Team Guide

## 목적
- 이 문서는 F1 Pulse에서 Codex 멀티 에이전트를 안정적으로 운영하기 위한 기본 실행 규칙이다
- 목표는 역할을 많이 늘리는 것이 아니라 충돌 없이 빠르게 결과를 내는 것이다
- 현재 저장소의 실제 스택과 디렉터리 구조를 기준으로 팀을 움직인다

## 현재 기준 스택
- Frontend UI: Next.js, React, Zustand
- 2D Renderer: Canvas
- Backend API: Fastify
- Realtime transport: native `ws`
- Optional worker: Python preferred when offline analysis or external ingestion needs appear
- Shared contracts: `packages/shared`
- Data: Redis, PostgreSQL
- AI: local Ollama plus Gemma 3, cloud Gemini adapter

## 최우선 목표
1. 실시간 데이터가 끊기지 않는다
2. 차량 이동이 부드럽다
3. 타이어, gap, interval, speed, RPM, gear가 잘 보인다
4. AI 설명이 결정론적 문맥 위에서 그럴듯하게 나온다
5. Virtual HUD는 위 네 가지가 안정화된 뒤에 붙인다

## 팀 구조
- `parent`
부모 세션이다
작업 분해, 에이전트 선택, 병합, 최종 수용 판단을 담당한다

- `frontend_ui`
일반 웹 UI 담당이다
레이아웃, 패널, 카드, 반응형, 가독성을 맡는다

- `threejs_map`
레거시 이름만 남은 canvas renderer 담당이다
2D 트랙, 차량 렌더링, 보간, focus viewport, HUD 시각화 경로를 맡는다

- `realtime_backend`
실시간 백엔드 담당이다
Fastify, WebSocket 전달, 인증, 메트릭, reconnect 관련 서버 로직을 맡는다

- `data_ai`
수집, 공유 계약, AI adapter 담당이다
optional ingestion, shared contracts, `packages/shared`, trigger, deterministic context, provider switching을 맡는다

- `reviewer`
검수 담당이다
반드시 read-only로 동작하고 수정하지 않는다
정확성, 회귀, 성능 리스크, 계약 불일치, 테스트 누락을 보고한다

## 소유권 경계
- `apps/web/app`, `apps/web/src/components`, `apps/web/src/lib`, `apps/web/src/store`
기본 소유자는 `frontend_ui`

- `apps/web/src/components/race-canvas.tsx` 와 이후 추가될 canvas or HUD renderer 파일
기본 소유자는 `threejs_map`

- `apps/realtime`
기본 소유자는 `realtime_backend`

- 이후 추가될 `workers/python`
기본 소유자는 `data_ai`

- `packages/shared`
기본 소유자는 `data_ai`

- 문서, 계획, 최종 병합 판단
기본 소유자는 `parent`

## 충돌 방지 규칙
- 하나의 파일은 한 시점에 한 에이전트만 쓴다
- `packages/shared`는 기본적으로 `data_ai`만 수정한다
- `reviewer`는 어떤 경우에도 직접 수정하지 않는다
- `frontend_ui`와 `threejs_map`가 동시에 `apps/web`를 다루더라도 같은 파일을 만지지 않게 분리한다
- API shape, schema, event payload가 바뀌면 먼저 `data_ai`가 계약을 정리한 뒤 다른 구현 에이전트를 돌린다
- 부모는 병렬 실행 전에 writable scope를 명시한다

## 부모 세션 기본 책임
- 작업을 한 문장으로 줄인다
- 작업마다 새 슬라이스를 동적으로 정의한다
- 사용자가 슬라이스 문서를 먼저 수동으로 쓸 필요는 없다
- 수용 기준을 3개 안팎으로 고정한다
- 어느 에이전트가 선행인지 결정한다
- 병렬 가능한 일과 순차 처리할 일을 나눈다
- 결과를 합치기 전에 reviewer를 부르지 않는다
- reviewer가 막은 이슈는 해당 소유 에이전트에게 되돌린다

## 메인 스레드 시작 명령
- `!출근`은 메인 스레드 작업 시작 신호다
- 부모 세션은 `!출근`을 받으면 `ARCHITECTURE.md`, `PLAN.md`, `TEAM_GUIDE.md`, `TASKS.md`, `CHANGELOG.md`를 먼저 읽는다
- Codex 앱에서 직접 `!출근`을 쓴 경우에는 시작 직후 `pnpm autonomous:app-workday:activate`를 먼저 실행해 현재 세션을 앱 자동 근무 세션으로 등록한다
- 앱 직접 실행은 브리지 duty 루프가 없으므로, 로컬에 `pnpm autonomous:app-workday:install`이 한 번 설치돼 있어야 17:00 KST 전까지 자동으로 다음 턴이 이어진다
- `docs/reports` 아래에 관련 보고서가 있으면 최신 `blocker` 또는 최신 `inspection` 보고서 1개만 추가로 확인한다
- 보고서는 맥락 복원용이다. 전부 읽지 말고 현재 미완료 작업과 가장 가까운 최신 보고서만 본다
- 그 다음 현재 작업을 슬라이스로 동적으로 정의하고, 필요할 때만 멀티 에이전트를 사용한다
- 일반 단어 `출근`은 명령으로 해석하지 않는다

## 에이전트에 항상 포함할 입력
- 작업 목표 한 문장
- 먼저 읽을 파일 목록
- 수정 가능한 파일 또는 디렉터리
- 수정 금지 범위
- 수용 기준
- 검증 방법
- 멈춰야 하는 조건

## 표준 실행 순서
1. 부모가 작업을 분류한다
작업이 어느 영역 중심인지 먼저 결정한다
UI 중심인지, canvas renderer 중심인지, realtime 중심인지, 계약 or AI 중심인지 분류한다

2. 계약 잠금이 필요한지 확인한다
새 telemetry 필드, 새 WS 이벤트, 새 AI payload, 타입 변경이 있으면 `data_ai`가 선행한다
이 단계가 끝나기 전에는 다른 구현 에이전트가 shape를 추측해서 만들면 안 된다

3. 선행 에이전트를 실행한다
`realtime_backend` 또는 `data_ai` 중 하나가 먼저 구조를 고정한다
필요하면 부모가 변경 영향 범위를 다시 정리한다

4. 구현 에이전트를 병렬 실행한다
파일 충돌이 없는 경우에만 병렬로 돌린다
대표적으로 `frontend_ui`와 `threejs_map`은 분리 가능하다

5. 부모가 병합 관문을 연다
결과를 읽고 계약 위반, 누락, 범위 초과를 먼저 본다
필요하면 아주 작은 수정만 부모가 직접 하거나 담당 에이전트에 재지시한다

6. `reviewer`를 read-only로 실행한다
코드, 테스트, 성능 리스크, 회귀 가능성을 본다
문제는 반드시 파일 경로와 영향 중심으로 반환하게 한다

7. 수정 루프를 한 번 더 돈다
리뷰 이슈는 해당 소유 에이전트에게만 되돌린다
모든 구현 에이전트를 다시 돌리지 않는다

8. 부모가 최종 검증을 정리한다
typecheck, test, 수동 확인 포인트를 묶어서 마감한다

## 작업 유형별 기본 워크플로우

## 실시간 안정화 작업
- 예: reconnect 문제, 이벤트 유실 의심, Redis replay 문제
- 순서:
1. `realtime_backend`
2. 필요 시 `data_ai`
3. 부모 확인
4. `reviewer`

## 새 telemetry 필드 추가 작업
- 예: tire temps, gap, interval, throttle or brake
- 순서:
1. `data_ai`
계약, shared schema, worker or AI input shape 정리
2. `realtime_backend`
API or WS 전달 경로 반영
3. `frontend_ui` 또는 `threejs_map`
표시 위치에 따라 선택
4. 부모 병합
5. `reviewer`

## 맵 움직임과 시각화 작업
- 예: smoothing, camera, track fidelity, selected driver 강조
- 순서:
1. 필요 시 `data_ai`
좌표 or event shape 변경이 있으면 먼저 계약 정리
2. `threejs_map`
3. `frontend_ui`
캔버스 밖 보조 패널이 필요한 경우만
4. `reviewer`

## HUD 기능 작업
- 예: chase cam, throttle or brake overlay, selected driver immersion
- 순서:
1. 부모가 MVP 우선순위 충족 여부를 먼저 확인
2. `threejs_map`
3. `frontend_ui`
4. 필요 시 `realtime_backend` 또는 `data_ai`
5. `reviewer`

## AI 엔진 작업
- 예: local or cloud switching, prompt contract, fallback text
- 순서:
1. `data_ai`
2. `realtime_backend`
3. 필요 시 `frontend_ui`
4. `reviewer`

## 에이전트별 세부 규칙

## `frontend_ui`
- 우선 파일:
- `apps/web/app`
- `apps/web/src/components`
- `apps/web/src/lib`
- `apps/web/src/store`
- 단, `race-canvas.tsx`는 기본 제외
- 강점:
- 패널 정보 구조화
- dashboard readability
- responsive layout
- 예측 카드와 상태 카드 정리
- 금지:
- backend auth, ws shape, shared schema를 추측해서 변경하지 않는다

## `threejs_map`
- 우선 파일:
- `apps/web/src/components/race-canvas.tsx`
- 이후 추가될 `canvas`, `renderer`, `hud` 관련 파일
- 강점:
- Canvas 2D viewport
- smoothing and interpolation
- track and car rendering
- selected driver visual focus
- HUD path isolation
- 금지:
- 일반 패널 레이아웃을 주도하지 않는다

## `realtime_backend`
- 우선 파일:
- `apps/realtime`
- 강점:
- Fastify route shape
- native ws broadcast
- reconnect behavior
- metrics and auth boundaries
- buffer or replay path
- 금지:
- web UI 파일을 직접 수정하지 않는다

## `data_ai`
- 우선 파일:
- `workers/python`
- `packages/shared`
- AI adapter 관련 서버 or worker 연동 지점
- 강점:
- ingestion reliability
- optional source adapter
- shared schema ownership
- deterministic race context
- provider switching by environment
- 금지:
- purely visual UI polish를 맡지 않는다

## `reviewer`
- 우선 파일:
- 전체 저장소
- 강점:
- correctness
- regression
- performance risk
- contract drift
- test gap
- 규칙:
- read-only만 허용
- 요약보다 finding 우선

## 병렬 실행 허용 기준
- 다른 디렉터리를 수정한다
- 같은 디렉터리여도 파일 충돌이 없다
- shared contract가 이미 잠겨 있다
- 부모가 merge 방식을 알고 있다

## 병렬 실행 금지 기준
- 둘 이상이 `packages/shared`를 만진다
- 둘 이상이 같은 컴포넌트 파일을 만진다
- API shape가 아직 확정되지 않았다
- reviewer가 아직 이전 수정 루프 결과를 검증하지 않았다

## 완료 조건
- 관련 타입이 맞는다
- 테스트 또는 최소한 typecheck가 통과한다
- 수동 확인 포인트가 기록된다
- reviewer 차단 이슈가 없다
- 결과가 MVP 우선순위와 어긋나지 않는다

## 중단과 재개 규칙
- 작업이 끝나지 않은 채 중단되면 `TASKS.md`의 해당 미완료 항목 근처에 다음 액션이 무엇인지 짧게 남긴다
- blocker가 있으면 `docs/reports`에 blocker 보고서를 남긴다
- blocker는 아니지만 다음 시작점이 모호할 수 있으면 최신 inspection or handoff 성격의 보고서를 남긴다
- 다음 날 새 스레드에서 `!출근`을 쓰면 부모 세션은 기본 문서와 최신 관련 보고서를 함께 읽고 현재 슬라이스를 다시 정의한다
- 작업 재개 판단의 기준 원본은 `TASKS.md`이고, 보고서는 왜 멈췄는지와 주의점을 복원하는 보조 근거다
- 앱 자동 근무를 강제로 멈추려면 `pnpm autonomous:app-workday:deactivate`를 실행한다

## 부모 세션용 빠른 체크리스트
- 이 작업의 주 소유 에이전트는 누구인가
- shared contract 변경이 필요한가
- 병렬 실행 가능한가
- reviewer를 부를 시점인가
- 이번 작업이 HUD보다 우선인가

## 기본 운영 원칙
- 프로젝트를 새로 시작하지 않는다
- 현재 스택 위에서 품질을 끌어올린다
- flashy feature보다 reliable feature를 먼저 끝낸다
- F1 Pulse의 핵심은 방송 대체 시각화가 아니라 믿을 수 있는 전략 읽기 경험이다

## 초기 실행 패킷
- 부모 모델은 새 작업을 받을 때 `docs/parent-slice-template.md`의 기준을 참고해 슬라이스를 내부적으로 만든다
- 사용자가 템플릿을 직접 채워서 넘길 필요는 없다
- `docs/phase1-slice1-orchestration.md`는 Phase 1 첫 작업 예시로만 사용한다
