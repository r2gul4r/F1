# Changelog

## 2026-03-09
- docs: add `PLAN.md`, `TASKS.md`, `ARCHITECTURE.md`, and this changelog baseline
- chore: add autonomous workday scripts for inspection/start/end flow
- chore: add pre-commit security scan gate for autonomous commits
- ci: add workflow guard for required control files and test gates

## 2026-03-10
- chore: add safe toolchain recovery for Node and pnpm with timeout protection
- chore: add dependency recovery gate using `pnpm install --frozen-lockfile`
- chore: add unified quality gate command for typecheck, test, and security scan
- chore: wire start-of-day flow to toolchain and dependency recovery
- docs: update autonomous prompt/runbook and scheduler prompt to use `autonomous:start:suggest`
- docs: end-of-day summary at 2026-03-10 17:02:07
- docs: end-of-day summary at 2026-03-10 20:32:55

## 2026-03-11
- docs: end-of-day summary at 2026-03-11 08:21:32
- feat: add workspace project structure validator with RED-GREEN test coverage
- feat: add reusable realtime database connection module and startup wiring
- feat: add OAuth user identity repository model with sanitized upsert flow
- feat: add OAuth login API with proxy token verification and watch token issuance
- fix: fallback immediately on AI model non-ok response and clear timeout safely
- fix: replace watch page secret misconfig throw with non-crashing fallback render
- fix: add typed watch-token-missing API client error for safer caller handling
- fix: classify realtime HTTP failures as typed API errors with status metadata
