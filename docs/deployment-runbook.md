# Deployment Runbook

## 목적
- public 배포와 developer 로컬 실행을 같은 코드베이스에서 환경 변수만으로 전환한다
- 배포 전 점검, 배포 직후 smoke check, 실패 시 rollback 시작점을 짧게 고정한다

## 모드 구분
- developer 모드
  - `DATA_SOURCE=mock`
  - `AI_PROVIDER=disabled` 또는 `AI_PROVIDER=ollama`
  - 로컬 GPU가 없거나 외부 API 없이 개발할 때 쓴다
- public 모드
  - `DATA_SOURCE=openf1`
  - `AI_PROVIDER=gemini` 또는 운영 가능한 `ollama`
  - `OPENF1_API_KEY`, `GEMINI_API_KEY`, 강한 내부 토큰을 실제 값으로 둔다
  - `ALLOWED_ORIGINS`, `NEXT_PUBLIC_REALTIME_HTTP_BASE`, `NEXT_PUBLIC_REALTIME_WS_BASE`를 실제 공개 주소로 맞춘다

## 운영용 timeout and backoff 환경 변수
- `AI_REQUEST_TIMEOUT_MS`
  - AI provider 요청 timeout(ms)
  - 기본값 예시: `5000`
- `WORKER_REALTIME_POST_TIMEOUT_MS`
  - worker가 realtime 내부 endpoint로 전송할 때 요청 timeout(ms)
  - 기본값 예시: `3000`
- `WORKER_OPENF1_REQUEST_TIMEOUT_MS`
  - worker의 OpenF1 API 요청 timeout(ms)
  - 기본값 예시: `5000`
- `WORKER_RETRY_BACKOFF_MULTIPLIER`
  - worker 재시도 backoff 배수
  - 기본값 예시: `2`
- `WORKER_RETRY_BACKOFF_MAX_MS`
  - worker 재시도 backoff 최대 대기(ms)
  - 기본값 예시: `10000`

## 배포 전 점검
1. `.env`가 public 모드 값인지 확인한다
2. `pnpm install`
3. `pnpm validate:preflight`
4. `docker compose up --build -d`
5. compose startup gating 확인
  - `realtime`은 `postgres`, `redis` healthcheck가 `healthy`가 된 뒤에만 시작된다
  - `web`, `worker`는 `realtime` healthcheck가 `healthy`가 된 뒤에만 시작된다

## 배포 직후 smoke check
1. 통합 smoke 명령 실행
```powershell
pnpm deployment:smoke
```
  - `pnpm deployment:smoke`는 Windows PowerShell 엔트리포인트다
  - Linux 또는 pwsh 환경은 `pnpm deployment:smoke:pwsh`를 사용한다
  - Windows PowerShell 명시 호출은 `pnpm deployment:smoke:windows`와 동일하다
  - compose 상태(`postgres`, `redis`, `realtime`, `web`는 `(healthy)`, `worker`는 `Up`)를 확인한다
  - realtime `healthz`의 HTTP 200뿐 아니라 본문 `{"status":"ok"}`도 확인한다
  - web `watch/current`를 확인한다
  - startup gating 로그 tail(`--tail=120`)를 실제로 출력한다
  - metrics 토큰 우선순위는 `-MetricsToken` > 프로세스 환경 변수 `INTERNAL_API_TOKEN` > `.env`의 `INTERNAL_API_TOKEN`이다
  - metrics 토큰이 끝까지 없거나 `-SkipMetrics`를 주면 `/metrics` 확인을 skip 한다
2. 선택적 skip 옵션
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/deployment/smoke-check.ps1 -SkipCompose -SkipRealtimeHealth -SkipWebWatch -SkipLogs -SkipMetrics
```
  - `-SkipRealtimeHealth`, `-SkipWebWatch`, `-SkipCompose`, `-SkipLogs`, `-SkipMetrics`를 조합해 환경에 맞게 부분 실행할 수 있다
  - pwsh 대안:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/deployment/smoke-check.ps1 -SkipCompose -SkipRealtimeHealth -SkipWebWatch -SkipLogs -SkipMetrics
```
3. 특정 compose 서비스만 부분 확인할 때
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/deployment/smoke-check.ps1 -ComposeServices realtime,web -SkipLogs -SkipMetrics
```
  - `-ComposeServices`에 넘긴 서비스만 상태 검증과 로그 tail 대상이 된다
  - `postgres`, `redis`, `realtime`, `web`는 `(healthy)`를 요구하고 나머지 서비스는 `Up`이면 통과한다
4. web 진입 확인
  - `http://localhost:3000/watch/current`
  - 드라이버 목록, canvas, HUD 토글, prediction 카드가 보이는지 확인한다
5. 데이터 모드 확인
  - public 모드면 실데이터가 들어오는지
  - developer 모드면 mock fallback 이 깨지지 않는지

## 운영 중 확인 포인트
- `docker compose ps realtime web`의 `STATUS`가 `(healthy)`를 유지하는지 본다
- realtime `healthz`는 `{"status":"ok"}` 를 반환해야 한다
- web `watch/current` 요청이 성공해야 한다
- `/metrics`에서 websocket, replay, AI fallback, session sync 계수가 증가하는지 본다
- `watch/current`에서 선택 드라이버 HUD, focus mode, prediction 카드가 함께 동작하는지 본다

## rollback 시작점
1. 새 배포에서 `validate:preflight`, realtime `healthz`, web `watch/current` 중 하나라도 실패하면 즉시 이전 정상 리비전 또는 이미지를 다시 배포한다
2. rollback 에서는 `.env`를 함께 되돌리지 말고 현재 운영 비밀값을 유지한 채 애플리케이션 리비전만 되돌린다
3. rollback 뒤에는 다시 realtime `healthz`, web `watch/current`, `/metrics` smoke check 를 반복한다

## 메모
- 이 저장소의 기준 preflight 는 `pnpm validate:preflight` 이다
- realtime metrics 조회에는 항상 `x-internal-token` 이 필요하다
- worker 와 realtime 은 `.env` 기준으로 같은 provider 설정을 공유한다
