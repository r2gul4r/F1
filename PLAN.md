# F1 Pulse 실행 계획

## 제품 목표
- 각 사용자가 자기 환경에서 실행하는 로컬 데스크톱 앱을 만든다
- 2.5D 서킷 위에 차량을 실시간으로 표시하고 선택된 드라이버의 핵심 상태를 HUD로 바로 읽을 수 있게 만든다
- 매 랩 종료 시점마다 최신 레이스 상태를 분석해 포디움 예측 AI를 갱신한다
- 공개 웹은 랜딩, 다운로드, 문서, 히스토리컬 데모만 맡고 실시간 본체는 맡지 않는다
- 화려한 연출보다 안정성, 판독성, 지연 제어, 로컬 처리 경계를 먼저 확보한다

## MVP 우선순위
1. 실시간 본체는 로컬 앱에서만 동작해야 한다
2. 원본 데이터 간격이 고르지 않아도 2.5D 차량 움직임이 부드러워야 한다
3. 선택 드라이버 HUD에서 gap, interval, speed, RPM, gear, tire 정보가 즉시 읽혀야 한다
4. 포디움 예측 AI는 매 랩 종료마다 결정론적 문맥 위에서만 갱신되어야 한다
5. 공개 웹은 실시간 대체품이 아니라 보조 채널로만 유지한다

## 개발언어
- 데스크톱 앱 UI와 렌더러: `TypeScript`
- 데스크톱 앱 메인 프로세스와 로컬 세션 로직: `TypeScript (Node.js)`
- 공개 웹 랜딩, 다운로드, 문서, 히스토리컬 데모: `TypeScript`
- 선택적 오프라인 분석 또는 수집 워커: `Python`

## 기준 스택
- 데스크톱 셸: 새 `apps/desktop`의 Electron
- 렌더러: `apps/desktop` 안의 Vite, React, TypeScript, Zustand, Three.js 기반 2.5D 렌더링 경로
- 도메인 코어: 새 `packages/core` 또는 이에 준하는 공용 모듈로 세션 모델, 차량 상태 계산, 보간, HUD view-model 을 분리한다
- 공용 계약과 규칙: `packages/shared`
- 웹: `apps/web`의 Next.js 는 랜딩, 다운로드, 문서, 히스토리컬 데모 전용으로 축소한다
- 실시간 로직: 기존 `apps/realtime` 로직은 데스크톱 앱에서 재사용 가능한 로컬 우선 모듈로 분해하고, 공개 중계 서버는 기본 경로에서 제거한다
- AI: local Ollama + cloud Gemini 를 하나의 adapter 계약 뒤로 숨기되 예측 호출은 랩 단위로 제한한다
- 인프라: GitHub Releases 또는 동급 배포 경로를 기본값으로 두고, Oracle Cloud 는 랜딩과 문서처럼 공개 웹 보조 채널에만 사용한다
- 스타일링: 현재 프론트는 억지로 살리지 않고 UI, 레이아웃, 시각화 계층을 처음부터 다시 설계한다

## 계획 원칙
- 제품 본체는 더 이상 웹앱이 아니라 로컬 데스크톱 앱으로 전환한다
- 공개 웹은 실시간 데이터, 로그인, 영상, 세션 토큰을 중계하지 않는다
- 현재 프론트는 억지로 살리지 않고 도메인 로직, 공용 계약, 쓸만한 보간 규칙만 재사용한다
- 렌더링 계층은 `renderer-core` 와 앱 UI 를 분리하고 2.5D 기준으로 다시 설계한다
- `packages/shared` 와 신규 core 모듈을 frontend, desktop shell, optional AI adapter 사이의 계약 경계로 본다
- 기존 `apps/realtime` 는 공개 라이브 서비스가 아니라 mock, replay, 검증, optional local helper 용도로 축소하거나 core 로 흡수한다
- 예측 AI 입력은 랩 종료 기준의 결정론적 데이터로 먼저 고정하고 LLM 은 그 위에만 얹는다
- 비밀값은 `process.env` 로만 다루고, 데이터베이스 쿼리는 파라미터 바인딩을 유지하고, 사용자 텍스트는 sanitize 하고, 에러 메시지는 opaque 하게 유지한다
- 시각적 화려함보다 관측성, fallback, replay 복구, 설치 가능성을 먼저 붙인다
- 이 저장소의 기본 멀티 에이전트 운영 계약은 `TEAM_GUIDE.md` 를 따른다

## 1단계
- 목표: 로컬 앱 전환에 필요한 셸, 계약, 코어 분리 경계를 고정한다
- 범위:
- `apps/desktop` 초안을 만들고 Electron main, preload, renderer 경계를 잡는다
- `apps/web` 을 랜딩, 다운로드, 문서, 히스토리컬 데모 전용 경로로 축소한다
- 현재 `apps/web`, `apps/realtime` 에 흩어진 상태 계산, 차량 보간, HUD 파생값을 공용 core 모듈로 분리한다
- mock 기반 세션 경로와 renderer-core 입력 계약을 먼저 단단하게 만든다
- 실시간 본체가 중앙 서버 중계를 전제로 하지 않도록 계정, 세션, 라이브 데이터 경계를 정리한다
- 수용 기준:
- 데스크톱 셸이 mock 세션 기준으로 부팅되어야 한다
- 웹은 실시간 본체 없이도 랜딩과 데모 역할을 수행해야 한다
- core 모듈이 UI 없이도 세션 스냅샷, 차량 상태, HUD 파생값을 계산할 수 있어야 한다
- 공개 서비스 경로에 라이브 토큰, 세션 쿠키, 실시간 재배포 전제가 남아 있지 않아야 한다

## 2단계
- 목표: 2.5D 레이스 보드 MVP 를 완성한다
- 범위:
- 2.5D 서킷, 차량, 카메라, 선택 드라이버 강조 렌더링 경로를 새로 만든다
- 원본 cadence 가 불규칙해도 interpolation 기반 차량 smoothing 이 안정적으로 보이게 한다
- 선택 드라이버 HUD, 랭킹, 상태 패널, 핵심 KPI 레이아웃을 새 데스크톱 정보 구조에 맞게 정리한다
- 현재 프론트의 임시 패널과 시각 접착 코드는 재사용하지 않고 필요한 정보 구조만 다시 얹는다
- 수용 기준:
- 사용자가 순위, 차량 위치, 선택 드라이버 상태를 빠르게 파악할 수 있어야 한다
- 화면 jitter 가 레이스 읽기를 방해하지 않을 정도로 움직임이 안정적이어야 한다
- 기본 HUD 가 외부 F1 맥락 없이도 유용해야 한다

## 3단계
- 목표: 랩 단위 포디움 예측 AI 를 데스크톱 흐름 위에 단단하게 만든다
- 범위:
- 랩 완료 시점을 기준으로 예측 트리거를 발생시키는 규칙을 고정한다
- 현재 순위, 최근 페이스, 타이어 상태, gap, interval 같은 결정론적 특징량을 먼저 계산한다
- local Ollama 와 cloud Gemini 를 하나의 인터페이스 뒤로 숨기는 AI adapter 를 유지한다
- 모델이 느리거나 죽거나 이상한 응답을 줄 때 fallback 동작과 예측 메타데이터를 정의한다
- 수용 기준:
- 포디움 예측은 매 랩 종료 시점마다만 갱신되어야 한다
- 예측 출력은 항상 입력 랩 번호, 생성 시각, fallback 여부를 포함해야 한다
- local 과 cloud provider 전환이 환경 변수만으로 가능해야 한다

## 4단계
- 목표: 배포, 설치, 랜딩, 히스토리컬 데모를 포함한 공개 채널 준비를 마무리한다
- 범위:
- 데스크톱 앱 빌드, 설치, 업데이트, 로컬 smoke check 절차를 정리한다
- 공개 웹은 다운로드, 문서, 변경 요약, 히스토리컬 데모를 안정적으로 제공한다
- mock 세션과 리플레이 세션 기준의 품질 검증 절차를 정리한다
- optional Python worker 나 별도 helper 가 필요해지면 기본 제품 경로와 독립 배포한다
- 예측 latency, failure rate, local replay 품질을 운영 기준으로 점검한다
- 수용 기준:
- 새 사용자가 설치 후 mock 세션과 리플레이 데모를 바로 확인할 수 있어야 한다
- AI provider 전환에 코드 수정이 필요 없어야 한다
- 핵심 설치, smoke check, rollback 절차가 문서화되어 있어야 한다

## 권장 에이전트 레인
- Frontend UI 레인: `apps/desktop` renderer 의 패널, HUD, 앱 셸, `apps/web` 랜딩과 다운로드 UX
- Canvas 레인: `packages/renderer-core` 와 `apps/desktop` 의 2.5D 서킷 렌더러, 차량 보간, 카메라, 선택 드라이버 강조
- Realtime backend 레인: 기존 `apps/realtime` 에서 추출할 로컬 우선 세션 로직, mock 또는 replay adapter, metrics, fallback 규칙
- Data and AI 레인: `packages/shared`, 신규 core 모듈, 예측 입력 계약, AI adapter 와 fallback 규칙
- Review 레인: read-only 회귀 검증, 계약 불일치, 성능 리스크, 테스트 누락 점검

## 권장 모델 배치
- Parent planner 와 reviewer: `gpt-5.4` + `xhigh`
- Frontend UI, canvas, realtime backend, data or AI 구현 에이전트: `gpt-5.3-codex` + `high`
- 속도 티어는 일단 전부 `Fast` 로 시작하고, 특정 역할이 반복적으로 품질을 못 맞출 때만 조정한다
