# Autonomous Development Runbook

## Scope
This repository is prepared for an autonomous Codex workday loop with OAuth-based auth tasks.

## Required Control Files
- `PLAN.md`
- `TASKS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `TEAM_GUIDE.md`

## Daily Schedule (KST)
- 08:10 start workday and run repository inspection
- 08:15 review queue and lock first unfinished task
- 08:20 begin implementation loop
- 17:00 stop loop, summarize, commit

## Start-of-Day Commands
```powershell
pnpm autonomous:start
```

With automatic task suggestion insertion from inspection:
```powershell
pnpm autonomous:start:suggest
```

`autonomous:start` now enforces:
- Node and pnpm readiness
- dependency sync via `pnpm install --frozen-lockfile`
- timeout-based failure instead of indefinite waiting

## Toolchain Recovery Command
```powershell
pnpm autonomous:ensure-toolchain
```

## Dependency Recovery Command
```powershell
pnpm autonomous:ensure-deps
```

## Plan Seeding Command
```powershell
pnpm autonomous:seed-plan
```

## Blocker Report Command
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/autonomous/create-blocker-report.ps1 -TaskTitle "<task>" -Reason "<reason>" -StalledMinutes 60
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

## Quality Gate Command
```powershell
pnpm autonomous:quality
```

## End-of-Day Command
```powershell
pnpm autonomous:eod
```

Commit only:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/autonomous/end-of-day.ps1 -CommitType docs
```

## Codex Task Loop Contract
1. Read `ARCHITECTURE.md`, `PLAN.md`, `TEAM_GUIDE.md`, `TASKS.md`, `CHANGELOG.md`
2. If no unfinished task exists, run `pnpm autonomous:seed-plan` and continue
3. Pick the first unfinished task in `TASKS.md`
4. Let the parent session define a dynamic slice for the current task
5. Use multi-agent execution only when the slice spans multiple subsystems or clearly benefits from ownership separation
6. Lock shared contracts first when payload or schema changes are involved
7. Run implementation with tests when appropriate
8. Run validation (`pnpm autonomous:quality`)
9. Mark task complete in `TASKS.md`
10. Append changelog item
11. Create split commits using `feat|fix|refactor|docs` prefix
12. Do not push during autonomous runs
13. If a task is stalled for 60+ minutes, create blocker report and switch tasks
14. Continue until 17:00 KST even when original queue is exhausted
