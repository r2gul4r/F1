# Parent Slice Template

## 사용 목적
- 이 문서는 부모 세션이 매 작업마다 새로운 슬라이스를 동적으로 정의할 때 쓰는 템플릿이다
- 한 슬라이스는 하나의 핵심 문제를 해결하는 데 집중한다
- 이 템플릿은 부모 모델이 내부적으로 참고하는 기준이다
- 사용자가 매번 수동으로 복제해서 채울 필요는 없다

## 슬라이스 이름
- 예: `Phase 1 Slice 2 - telemetry panel readiness`

## 이 슬라이스의 목표
- 이번 슬라이스에서 해결할 핵심 문제를 한두 문장으로 적는다
- 예:
- reconnect 뒤 상태 복구를 더 빠르고 명확하게 만든다
- tyre and gap 표시를 위해 필요한 telemetry field 경로를 정리한다

## 이 슬라이스에서 답해야 할 질문
- 이번 작업이 끝나면 무엇이 명확해져야 하는가
- 예:
- 어느 에이전트가 주 소유자인가
- shared contract 변경이 필요한가
- 병렬 실행이 가능한가
- reviewer가 봐야 할 리스크는 무엇인가

## 수용 기준
- 최대 3개에서 5개까지만 적는다
- 모두 observable 해야 한다
- 예:
- reconnect 뒤 최근 상태 복구가 가능하다
- 새 telemetry field가 worker, realtime, web에서 같은 shape로 흐른다
- reviewer 차단 이슈가 없다

## 사용할 에이전트
- `parent`
필수

- `frontend_ui`
필요 시만

- `threejs_map`
필요 시만

- `realtime_backend`
필요 시만

- `data_ai`
필요 시만

- `reviewer`
마지막 검수용

## 비활성 에이전트
- 이번 슬라이스에서 일부 에이전트를 쉬게 할 이유를 적는다
- 예:
- `threejs_map` 비활성
이번 슬라이스는 canvas 품질보다 API 안정화가 우선이다

## 우선 파일
- 부모가 먼저 읽게 할 파일을 적는다
- 가급적 5개에서 10개 이내로 제한한다

## 소유권 판단
- 주 소유 에이전트:
- 보조 에이전트:
- shared contract 변경 여부:
- 병렬 실행 가능 여부:

## 표준 분해 규칙
1. 작업을 한 문장으로 줄인다
2. shared contract 변경 필요 여부를 먼저 판단한다
3. 계약 변경이 있으면 `data_ai`를 선행시킨다
4. 파일 충돌이 없을 때만 구현 에이전트를 병렬 실행한다
5. `reviewer`는 마지막에 read-only로만 호출한다

## 부모 세션 실행 순서
1. 분석 에이전트를 먼저 호출한다
2. contract 잠금 필요 여부를 판정한다
3. 선행 구현 에이전트를 실행한다
4. 병렬 가능한 구현 에이전트를 실행한다
5. 부모가 병합 or 범위 조정을 한다
6. `reviewer`를 호출한다
7. finding이 있으면 해당 소유 에이전트에게만 fix를 되돌린다
8. 부모가 수용 기준 충족 여부를 마감한다

## 부모 세션용 킥오프 프롬프트 템플릿
```text
작업: <슬라이스 이름>

목표:
- <핵심 목표 1>
- <핵심 목표 2>

수용 기준:
- <기준 1>
- <기준 2>
- <기준 3>

운영 규칙:
- TEAM_GUIDE.md를 따른다
- 같은 파일을 두 에이전트가 동시에 수정하지 않는다
- packages/shared 계약 변경은 먼저 잠근다
- reviewer는 read-only다
- 범위 밖 리팩터링 금지

실행 순서:
1. <분석 에이전트>
2. <contract 판단>
3. <선행 구현>
4. <병렬 구현>
5. <reviewer>

결과물:
- 변경 파일 목록
- 수용 기준 충족 여부
- 남은 리스크
- 다음 슬라이스 추천
```

## 에이전트별 프롬프트 템플릿

## 분석 or 구현 에이전트 공통 템플릿
```text
역할: <agent_name>

작업:
- <이번 에이전트가 맡을 구체 작업>

먼저 읽을 파일:
- <file 1>
- <file 2>

수용 기준:
- <agent-specific acceptance 1>
- <agent-specific acceptance 2>

수정 가능 범위:
- <directory or file list>

수정 금지:
- <directory or file list>

출력:
- 변경한 파일
- 변경 이유
- 다른 에이전트가 이어받아야 할 점
```

## reviewer 템플릿
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

## 부모 마감 요약 템플릿
- 슬라이스 이름:
- 주 소유 에이전트:
- 수용 기준 충족 여부:
- reviewer 차단 이슈 유무:
- 남은 리스크:
- 다음 슬라이스 후보:

## 좋은 슬라이스 조건
- 하나의 핵심 문제만 다룬다
- 파일 충돌이 적다
- reviewer가 짧게 검토 가능하다
- 끝났을 때 전진 여부가 명확하다

## 나쁜 슬라이스 신호
- UI, backend, worker, AI를 한 번에 다 갈아엎는다
- 수용 기준이 모호하다
- shared contract가 확정되지 않았는데 구현이 먼저 시작된다
- reviewer 전에 구현 에이전트를 계속 추가 호출한다
