# Phase 1 Slice 63 Core Extraction

## 슬라이스 목표
- 현재 `apps/web` 와 `apps/realtime` 안에 흩어진 순수 계산 로직을 `packages/core` 후보로 분류한다
- 다음 `slice 64` 에서 renderer-core 계약을 잠글 때 필요한 입력 shape, 제외 범위, 소유 에이전트를 미리 고정한다

## 이번 슬라이스에서 답한 질문
- 어떤 로직이 React, Fastify, WebSocket, persistence 없이도 재사용 가능한가
- 어떤 로직은 `packages/shared` 에 남기고 어떤 로직을 신규 core 모듈로 옮겨야 하는가
- `threejs_map`, `frontend_ui`, `realtime_backend` 가 다음 슬라이스에서 공유해야 할 계약은 무엇인가

## 핵심 판단
- `packages/shared` 는 외부 경계 계약과 정규화 규칙을 계속 소유한다
- 신규 `packages/core` 는 세션 스냅샷 조립, 차량 상태 계산, HUD view-model, prediction 선택 규칙처럼 앱 내부에서 재사용할 순수 로직을 소유한다
- 네트워크, 저장소, 인증, HTML sanitize, WebSocket reconnect 자체는 core 후보가 아니다

## 후보 맵

### 1. Session snapshot reducer
- 현재 소스:
- `apps/web/src/store/use-race-store.ts`
- `apps/web/src/lib/use-race-socket.ts`
- `apps/web/src/components/watch-client.tsx`
- 추출 후보:
- drivers, ticks, flag, predictions 를 누적하는 순수 reducer
- session 전환 시 state reset 규칙
- selected driver fallback 선택 규칙
- prediction 보존 개수 제한 규칙
- core 밖에 둘 항목:
- Zustand store 생성
- WebSocket 연결 수명주기
- reconnect timer 와 browser client id 생성
- 다음 슬라이스 입력:
- `SessionSnapshot`
- `SessionSnapshotEvent`
- `SelectionState`

### 2. Renderer state and camera math
- 현재 소스:
- `apps/web/src/components/race-canvas.tsx`
- `apps/web/src/components/race-canvas-visuals.ts`
- 추출 후보:
- track point seed 와 world-space 기준점
- driver color hash 규칙
- lerp 기반 차량 보간 규칙
- selected driver halo scale, opacity, pulse 계산
- focus mode camera target 계산
- core 밖에 둘 항목:
- Canvas draw 호출
- DOM resize observer
- requestAnimationFrame loop
- 다음 슬라이스 입력:
- `TrackModel`
- `CarState`
- `CameraState`
- `RendererFrameInput`

### 3. Telemetry freshness and ordering
- 현재 소스:
- `apps/web/src/components/telemetry-freshness.ts`
- `apps/web/src/components/watch-client.tsx`
- `apps/web/src/components/selected-driver-hud.tsx`
- `apps/web/src/components/driver-panel.tsx`
- 추출 후보:
- stale threshold 상수와 freshness 판정
- freshness priority 에 따른 driver ordering
- stale 전환 시각 계산
- selected driver telemetry alert 여부
- core 밖에 둘 항목:
- locale-specific time string formatting
- status chip class name
- 다음 슬라이스 입력:
- `TelemetryFreshness`
- `FreshnessSummary`
- `DriverOrderKey`

### 4. HUD view-model assembly
- 현재 소스:
- `apps/web/src/components/selected-driver-hud.tsx`
- `apps/web/src/components/driver-panel.tsx`
- `apps/web/src/components/watch-client.tsx`
- 추출 후보:
- selected driver, latest tick, flag 조합
- HUD 기본 통계 카드 값
- no telemetry vs stale telemetry 상태 분기
- focus mode 여부와 무관한 selected driver 기본 정보
- core 밖에 둘 항목:
- JSX layout
- deep-link button click failure UI
- locale-specific string formatting
- 다음 슬라이스 입력:
- `HudViewModel`
- `SelectedDriverSummary`
- `TelemetryCardValue`

### 5. Prediction selection and staleness context
- 현재 소스:
- `apps/web/src/components/prediction-card.tsx`
- `apps/web/src/store/use-race-store.ts`
- 추출 후보:
- latest prediction 과 selected-driver prediction 사이의 우선순위 규칙
- selected prediction stale 경고 계산
- relative age 를 위한 raw elapsed seconds 계산
- core 밖에 둘 항목:
- human-readable 한국어 시간 문구
- prediction 카드 JSX
- 다음 슬라이스 입력:
- `PredictionViewModel`
- `PredictionContext`

### 6. Lap-boundary trigger and deterministic AI input builder
- 현재 소스:
- `apps/realtime/src/services/trigger-tracker.ts`
- `apps/realtime/src/services/ai-service.ts`
- `apps/realtime/src/server.ts`
- `packages/shared/src/rules/p5-trigger.ts`
- 추출 후보:
- session 별 rank transition 추적
- trigger 발생 시 recent tick snapshot selection
- fallback probability normalization 과 clamp 규칙
- prompt 이전 단계의 deterministic feature assembly
- core 밖에 둘 항목:
- provider HTTP fetch
- Fastify route wiring
- repository save/broadcast side effects
- sanitize 와 opaque error wrapping
- 다음 슬라이스 입력:
- `LapBoundaryTrigger`
- `PredictionFeatureSnapshot`
- `PredictionFallbackContext`

## `packages/shared` 에 남길 항목
- `Session`, `Driver`, `TelemetryTick`, `RaceFlag`, `AiPrediction`, `WsEvent` 같은 외부 계약
- `normalizeOpenF1TelemetryTicks`
- `detectP5Trigger`
- watch token, sanitize, opaque error 같은 cross-service boundary helper

## 다음 슬라이스에서 잠글 계약
- `SessionSnapshot`
- session, drivers, latestTicksByDriver, flag, predictions 를 한 번에 담는 desktop renderer 입력
- `CarState`
- world position, smoothed position, rank, speed, freshness, selected/focus visual state
- `HudViewModel`
- selected driver identity, telemetry freshness, flag summary, 주요 수치 카드, prediction context
- `PredictionFeatureSnapshot`
- lap-boundary 예측에 필요한 deterministic 입력 묶음

## 소유권과 후속 순서
- `data_ai`
- `slice 64` 에서 위 계약 타입과 core 모듈 경계를 잠근다
- `threejs_map`
- `slice 65` 에서 `CarState`, `CameraState`, `TrackModel` 을 소비해 desktop renderer MVP 를 만든다
- `frontend_ui`
- `slice 66` 에서 `HudViewModel`, `PredictionViewModel` 을 소비해 desktop 정보 패널을 재설계한다
- `realtime_backend`
- `slice 67` 에서 `LapBoundaryTrigger`, `PredictionFeatureSnapshot` 을 desktop 흐름에 연결한다

## 유지할 기존 테스트 기준
- `apps/web/tests/race-canvas-visuals.test.ts`
- `apps/web/tests/telemetry-freshness.test.ts`
- `apps/web/tests/prediction-card.test.tsx`
- `apps/web/tests/selected-driver-hud.test.tsx`
- `apps/web/tests/driver-panel.test.tsx`
- `apps/web/tests/use-race-socket.test.tsx`
- `packages/shared/tests/p5-trigger.test.ts`

## 수용 기준 점검
- core 후보가 UI 렌더링, 네트워크, 저장소, 인증 경계와 분리되어 문서화됐다
- `slice 64` 가 바로 타입 계약을 만들 수 있도록 입력 shape 후보가 고정됐다
- shared contract 와 신규 core 책임 분리가 문서에 명시됐다
