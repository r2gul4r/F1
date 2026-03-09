# Autonomous Development Runbook

## Scope
This repository is prepared for an autonomous Codex workday loop with OAuth-based auth tasks.

## Required Control Files
- `PLAN.md`
- `TASKS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`

## Daily Schedule (KST)
- 08:10 start workday and run repository inspection
- 08:15 review queue and lock first unfinished task
- 08:20 begin implementation loop
- 17:00 stop loop, summarize, commit, push
- 17:01 optional shutdown via script flag

## Start-of-Day Commands
```powershell
pnpm autonomous:start
```

With automatic task suggestion insertion from inspection:
```powershell
pnpm autonomous:start -- -ApplyTaskSuggestions
```

## Inspection Command
```powershell
pnpm autonomous:inspect
```

Inspection reports are saved into `docs/reports/`.

## Security Gate Command
```powershell
pnpm autonomous:security
```

## End-of-Day Command
```powershell
pnpm autonomous:eod
```

Commit with push and optional shutdown:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/autonomous/end-of-day.ps1 -CommitType docs -Shutdown
```

## Codex Task Loop Contract
1. Read `ARCHITECTURE.md`, `PLAN.md`, `TASKS.md`, `CHANGELOG.md`
2. Pick the first unfinished task in `TASKS.md`
3. Implement with tests
4. Run validation (`pnpm typecheck`, `pnpm test`)
5. Mark task complete in `TASKS.md`
6. Append changelog item
7. Run `pnpm autonomous:security` before commit
8. Commit using `feat|fix|refactor|docs` prefix
9. Push
10. Repeat until 17:00 KST
