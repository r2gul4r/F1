# Phase 1 Slice 1 Orchestration

## 문서 성격
- 이 문서는 `docs/parent-slice-template.md`를 사용해 만든 구체 예시다
- 고정 규칙이 아니라 Phase 1 첫 실행을 위한 샘플 패킷이다

## 목표
- 첫 멀티 에이전트 실행은 `실시간 데이터 전달 안정화`를 대상으로 한다
- 이번 슬라이스는 화려한 기능이 아니라 reconnect, replay, fallback, lag visibility를 안정화하는 데 집중한다

## 이번 슬라이스에서 해결할 질문
- WebSocket reconnect 뒤에 클라이언트가 얼마나 빨리 화면을 복구하는가
- mock 또는 live source adapter 실패 시 session or driver state를 깨뜨리지 않는가
- 서버와 클라이언트 양쪽에서 재연결과 지연 상태를 추적할 수 있는가
- reviewer가 보기에도 계약 위반이나 회귀 위험이 없는가

## 수용 기준
- reconnect 이후 최근 상태 복구가 가능하다
- fallback 경로에서 session, drivers, telemetry가 비정상 상태로 남지 않는다
- 최소 하나 이상의 reconnect or lag 관련 metric or observable state가 추가된다
- 변경 범위가 UI cosmetic 확장으로 새지 않는다
- reviewer 차단 이슈가 없다

## 사용할 에이전트
- `parent`
필수
작업 분해, 순서 제어, 결과 병합, 수용 판단

- `realtime_backend`
필수
`apps/realtime` 중심

- `data_ai`
필수
`packages/shared`, 필요 시 AI or trigger contract 확인

- `reviewer`
필수
read-only 최종 검수

- `frontend_ui`
선택
reconnect state 노출이나 driver load 보강이 꼭 필요할 때만 호출

- `threejs_map`
이번 슬라이스에서는 기본 비활성
캔버스나 HUD 품질 작업은 다음 슬라이스로 미룬다

## 우선 파일
- `apps/realtime/src/ws/hub.ts`
- `apps/realtime/src/ws/ring-buffer.ts`
- `apps/realtime/src/server.ts`
- `apps/realtime/src/metrics.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/lib/use-race-socket.ts`

## 부모 세션 실행 순서
1. `data_ai`와 `realtime_backend`에 먼저 읽기와 분석을 맡긴다
2. 둘 중 하나가 shared contract 변경이 필요하다고 판단하면 `data_ai`가 먼저 잠근다
3. 계약 변경이 없으면 `realtime_backend`가 서버 쪽 reconnect and replay 안정화부터 처리한다
4. `data_ai`가 shared contract와 source adapter 경계를 정리한다
5. 부모가 diff 범위를 읽고 겹치는 변경을 정리한다
6. UI 상태 노출이 부족하면 그때만 `frontend_ui`를 추가 호출한다
7. 마지막에 `reviewer`를 read-only로 호출한다
8. reviewer finding이 있으면 해당 소유 에이전트에게만 fix를 되돌린다

## 부모 세션용 킥오프 프롬프트
```text
작업: F1 Pulse Phase 1 slice 1을 진행한다

목표:
- reconnect, replay, fallback, lag visibility를 안정화한다
- flashy feature는 하지 않는다

수용 기준:
- reconnect 뒤 최근 상태 복구가 가능해야 한다
- mock 또는 OpenF1 fallback 경로에서 session, drivers, telemetry가 깨지면 안 된다
- reconnect or lag 관련 observable state 또는 metric이 추가돼야 한다
- reviewer 차단 이슈가 없어야 한다

운영 규칙:
- TEAM_GUIDE.md를 따른다
- packages/shared는 기본적으로 data_ai만 수정한다
- reviewer는 read-only다
- 같은 파일을 두 에이전트가 동시에 수정하지 않는다
- 범위 밖 리팩터링 금지

실행 순서:
1. data_ai와 realtime_backend를 먼저 돌려서 문제 지점을 분석하게 한다
2. contract 변경 필요 여부를 parent가 판정한다
3. contract 변경 필요 시 data_ai 선행, 아니면 realtime_backend 선행
4. 구현이 끝나면 필요할 때만 frontend_ui를 부른다
5. 마지막에 reviewer를 호출한다

결과물:
- 변경 파일 목록
- 수용 기준 충족 여부
- 남은 리스크
- 다음 슬라이스 추천
```

## `data_ai` 프롬프트
```text
역할: data_ai

작업:
- packages/shared 관점에서 reconnect, fallback, ingestion 안정성을 점검하고 필요한 최소 수정만 수행하라

먼저 읽을 파일:
- packages/shared/src/index.ts

수용 기준:
- fallback 경로가 session, drivers, telemetry 상태를 비정상으로 남기지 않아야 한다
- shared contract 변경이 필요하면 그 이유를 명확히 설명하고 최소 범위로 수정해야 한다
- UI or backend 범위까지 불필요하게 확장하지 않는다

수정 가능 범위:
- packages/shared
- 필요 시 parent 승인 후 AI or trigger contract 연동 파일

수정 금지:
- apps/web 시각화 파일
- apps/realtime 전체를 주도적으로 수정하는 것

출력:
- 변경한 파일
- 왜 이 변경이 reconnect or fallback 안정성에 필요한지
- backend와 UI가 따라야 할 계약 변화가 있는지
```

## `realtime_backend` 프롬프트
```text
역할: realtime_backend

작업:
- apps/realtime 관점에서 reconnect, replay, lag visibility를 안정화하고 필요한 최소 수정만 수행하라

먼저 읽을 파일:
- apps/realtime/src/server.ts
- apps/realtime/src/ws/hub.ts
- apps/realtime/src/ws/ring-buffer.ts
- apps/realtime/src/metrics.ts
- apps/web/src/lib/use-race-socket.ts

수용 기준:
- reconnect 뒤 상태 복구 경로가 더 명확해져야 한다
- replay, lag, reconnect 상태 중 최소 하나는 더 잘 관측 가능해야 한다
- shared contract 변경이 필요하면 parent에 명확히 넘겨야 한다

수정 가능 범위:
- apps/realtime

수정 금지:
- apps/web 대시보드 레이아웃
- packages/shared 직접 수정

출력:
- 변경한 파일
- reconnect 안정성에 어떤 영향을 주는지
- frontend가 추가 대응해야 하는지
```

## `frontend_ui` 보조 프롬프트
```text
역할: frontend_ui

이 프롬프트는 parent가 필요할 때만 사용한다

작업:
- reconnect, loading, or stale-state visibility를 사용자에게 더 명확히 보여주는 최소 UI 변경만 수행하라

먼저 읽을 파일:
- apps/web/src/lib/use-race-socket.ts
- apps/web/src/components/watch-client.tsx
- apps/web/src/store/use-race-store.ts

수용 기준:
- 사용자가 연결 상태와 재연결 대기 상태를 이해할 수 있어야 한다
- 이번 슬라이스에서 새 디자인 시스템이나 HUD 작업으로 확장하지 않는다

수정 가능 범위:
- apps/web/app
- apps/web/src/components
- apps/web/src/lib
- apps/web/src/store

수정 금지:
- race-canvas.tsx 중심의 Canvas 렌더러 품질 작업
- backend, worker, shared contract 수정
```

## `reviewer` 프롬프트
```text
역할: reviewer

작업:
- 이번 슬라이스 변경을 read-only로 검토하고 correctness, regression, performance risk, contract drift, missing tests 관점에서 finding을 반환하라

먼저 읽을 파일:
- 변경된 파일 전체
- TEAM_GUIDE.md
- PLAN.md

규칙:
- 절대 수정하지 않는다
- finding이 없으면 그 사실을 분명하게 말한다
- finding이 있으면 파일 경로, 영향, 추천 후속조치를 함께 적는다
```

## 이번 슬라이스 완료 후 부모가 남길 요약
- 수용 기준 충족 여부
- reconnect and fallback 관측성 개선 여부
- reviewer finding 유무
- 다음 슬라이스 추천

## 다음 슬라이스 후보
- telemetry panel 확장
- gap and interval 시각화
- tire, RPM, gear 추가
- Canvas track fidelity 개선
