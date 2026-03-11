# F1 Pulse 실행 계획

## 제품 목표
- 2.5D 트랙 뷰, 드라이버 텔레메트리 패널, 하이브리드 AI 인사이트를 갖춘 실시간 F1 전략 대시보드를 만든다
- 화려한 연출보다 안정성과 가독성을 먼저 확보한다

## MVP 우선순위
1. 실시간 데이터가 눈에 띄게 끊기지 않아야 한다
2. 원본 데이터 간격이 고르지 않아도 차량 움직임이 부드러워야 한다
3. 타이어, gap, interval, speed, RPM, gear 정보가 바로 읽혀야 한다
4. AI 요약은 결정론적 레이스 문맥 위에서 그럴듯해야 한다
5. Virtual HUD와 chase-cam 계열 연출은 핵심 대시보드가 신뢰 가능한 수준이 된 뒤 붙인다

## 기준 스택
- 프론트엔드: `apps/web`의 Next.js, React, Three.js, Zustand
- 백엔드 API: `apps/realtime`의 Node.js, Fastify
- 실시간 전송: native `ws`
- 수집 워커: `apps/worker`의 Node.js TypeScript 파이프라인
- 공용 계약과 규칙: `packages/shared`
- 데이터: Redis 실시간 버퍼, PostgreSQL 레이스 이력 저장
- AI: local Ollama + Gemma 3, cloud Gemini를 하나의 adapter 계약 뒤로 숨긴다
- 인프라: Docker, Oracle Cloud, GitHub
- 스타일링: 현재 global CSS를 기본값으로 두고, Tailwind는 MVP 이후 필요할 때만 도입한다

## 계획 원칙
- 현재 저장소의 실제 스택을 구현 기준으로 삼는다
- Express, Socket.io, Tailwind로 바꾸기 위해 프로젝트를 다시 시작하지 않는다
- `packages/shared`를 frontend, realtime, worker, AI 사이의 계약 경계로 본다
- 비밀값은 `process.env`로만 다루고, 데이터베이스 쿼리는 파라미터 바인딩을 유지하고, 사용자 텍스트는 sanitize 하고, 에러 메시지는 opaque 하게 유지한다
- 시각적 확장보다 관측성과 fallback 로직을 먼저 붙인다
- 이 저장소의 기본 멀티 에이전트 운영 계약은 `TEAM_GUIDE.md`를 따른다

## 1단계
- 목표: 수집과 실시간 전달 경로를 안정화한다
- 범위:
- OpenF1 수집 경로를 복원력 있게 만들고 fallback 동작을 명확히 한다
- 재연결 클라이언트를 위한 Redis buffering 과 replay 동작을 검증한다
- session lifecycle, current-session resolution, session boundary handling 을 정리한다
- ingestion lag, broadcast count, reconnect rate, dropped-event suspicion 을 볼 수 있는 기본 메트릭을 넣는다
- 수용 기준:
- mock 과 OpenF1 경로 모두에서 대시보드가 살아 있어야 한다
- 웹 클라이언트가 재연결 후 최근 상태를 복구해야 한다
- 반복적인 재연결이나 원본 소스 실패 상황에서도 실시간 경로가 버텨야 한다

## 2단계
- 목표: 전략 대시보드 MVP를 완성한다
- 범위:
- 2.5D 트랙 렌더링 품질과 좌표 충실도를 올린다
- 원본 cadence 가 불규칙해도 interpolation 기반 차량 smoothing 이 안정적으로 보이게 한다
- 드라이버 패널에 tire, gap, interval, speed, RPM, gear 를 명확히 표시한다
- 실시간 가독성을 해치지 않는 선에서 데스크톱과 모바일 읽기 품질을 개선한다
- 수용 기준:
- 사용자가 순위, gap, 선택된 드라이버 상태를 빠르게 파악할 수 있어야 한다
- 화면 jitter 가 전략 읽기를 방해하지 않을 정도로 움직임이 안정적이어야 한다
- 드라이버 텔레메트리 패널이 외부 F1 맥락 없이도 유용해야 한다

## 3단계
- 목표: 하이브리드 AI 전략 엔진을 단단하게 만든다
- 범위:
- local Ollama 와 cloud Gemini 를 하나의 인터페이스 뒤로 숨기는 AI adapter 를 도입한다
- pace delta, pit window, trigger context 같은 결정론적 계산은 LLM 바깥에 둔다
- P5 trigger 분석 흐름을 다듬고 AI 출력에 시간 메타데이터를 같이 저장한다
- 모델이 느리거나 죽거나 이상한 응답을 줄 때 fallback 동작을 정의한다
- 수용 기준:
- local 과 cloud provider 전환이 환경 변수만으로 가능해야 한다
- AI 출력은 항상 결정론적 문맥과 안전한 fallback 텍스트를 가져야 한다
- 예측 latency 와 failure rate 를 측정할 수 있어야 한다

## 4단계
- 목표: 핵심 대시보드가 신뢰 가능해진 뒤 고임팩트 연출을 추가한다
- 범위:
- 선택된 드라이버용 virtual HUD 를 구현한다
- chase-cam 스타일의 selected-driver focus mode 를 추가한다
- throttle, brake 시각화를 선택 드라이버 경험 위에 얹는다
- HUD 경로는 메인 대시보드와 분리해서 HUD 실패가 메인 화면을 깨지 않게 한다
- 수용 기준:
- HUD 기능은 메인 대시보드를 해치지 않고 추가 가치만 줘야 한다
- HUD 기능을 꺼도 메인 전략 화면은 온전히 동작해야 한다

## 5단계
- 목표: 이중 배포 경로와 운영 준비를 마무리한다
- 범위:
- public 배포는 Oracle Cloud 와 cloud AI provider 설정에 맞춘다
- developer workflow 는 local GPU 기반 Ollama 실행에 최적화한다
- 배포 체크, 환경 검증, failure-mode runbook 을 추가한다
- 환경별 cost, latency, fallback 동작을 점검한다
- 수용 기준:
- public 과 developer 모드를 환경 설정만으로 전환할 수 있어야 한다
- AI provider 전환에 코드 수정이 필요 없어야 한다
- 핵심 health check 와 rollback 절차가 문서화되어 있어야 한다

## 권장 에이전트 레인
- Frontend UI 레인: canvas 바깥의 `apps/web` 레이아웃, 패널, 반응형, 대시보드 가독성
- Three.js 레인: `apps/web`의 canvas, camera, interpolation, map fidelity, HUD 렌더링
- Realtime backend 레인: `apps/realtime`의 HTTP, WebSocket 전달, auth, metrics, reconnect 동작
- Data and AI 레인: `apps/worker`, `packages/shared`, AI adapter 와 trigger 계약
- Review 레인: read-only 회귀 검증, 계약 불일치, 성능 리스크, 테스트 누락 점검

## 권장 모델 배치
- Parent planner 와 reviewer: `gpt-5.4` + `xhigh`
- Frontend UI, Three.js, realtime backend, data or AI 구현 에이전트: `gpt-5.3-codex` + `high`
- 속도 티어는 일단 전부 `Fast`로 시작하고, 특정 역할이 반복적으로 품질을 못 맞출 때만 조정한다
