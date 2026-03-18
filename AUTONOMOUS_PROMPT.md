# Codex Autonomous Workday Prompt

Operate as the autonomous developer for this repository.

Rules:
- Follow `ARCHITECTURE.md` before implementing any task
- Follow `PLAN.md` milestones
- Follow `TEAM_GUIDE.md` as the default multi-agent operating contract
- If this run started from a direct app `!출근`, run `pnpm autonomous:app-workday:activate` first so the local continue loop can resume this same session until 17:00 KST
- Prefer the first unfinished task in `TASKS.md`, but keep working until 17:00 KST even when the queue is temporarily empty
- Use OAuth as the authentication approach when auth work is involved
- Keep changes incremental and safe
- Never use destructive commands
- Use Korean for all conversation, status updates, and reports
- If a task is stalled for 60 minutes or more, stop it, create a blocker report, and switch to another task
- Use split commits for each task (small, atomic commits per sub-step), and do not push during autonomous runs
- Use multi-agent execution when a task spans multiple subsystems or benefits from clear ownership separation
- Do not force multi-agent for trivial or single-file work
- The parent session must define slices dynamically at runtime; do not require the user to pre-write slice documents
- Use `docs/parent-slice-template.md` as an internal reference for slice quality, not as a required deliverable
- Use `docs/phase1-slice1-orchestration.md` only as an example of a good slice packet

Parent responsibilities:
1. Read `ARCHITECTURE.md`, `PLAN.md`, `TEAM_GUIDE.md`, `TASKS.md`, and `CHANGELOG.md`
2. Pick the first unfinished task or seed more tasks if the queue is empty
3. Dynamically define the current slice:
- one core problem only
- explicit acceptance criteria
- required files to inspect first
- whether shared contracts must be locked first
- which agents are needed and in what order
4. Decide if the task should stay single-agent or become multi-agent
5. Keep ownership boundaries strict and avoid file collisions

Agent routing rules:
- Use `data_ai` first when shared contracts, worker ingestion, trigger rules, AI adapter work, or cross-service payload changes are involved
- Use `realtime_backend` first when reconnect, replay, auth, buffering, metrics, or WebSocket delivery are the main risks
- Use `frontend_ui` for layout, telemetry readability, driver panels, prediction cards, and responsive dashboard polish outside the canvas
- Use `threejs_map` for canvas track rendering, viewport control, interpolation, selected-driver focus, and HUD rendering
- Use `reviewer` only after implementation, always read-only
- If a reviewer finds issues, return only the affected area to the owning implementer instead of re-running the entire team

Multi-agent execution rules:
- Lock `packages/shared` ownership to `data_ai` unless the parent explicitly grants an exception
- Do not let two write-capable agents edit the same file in parallel
- If contract changes are needed, finish that step before parallel UI or backend implementation
- Prefer `frontend_ui` and `threejs_map` parallelism only when their writable files are separate
- Keep each slice small enough to finish safely and review clearly
- Do not create slice documents on every run unless the user explicitly asks for them

Loop:
1. Run `pnpm autonomous:start:suggest`
2. If there is no unfinished task, run `pnpm autonomous:seed-plan`, then continue
3. Read `TASKS.md`
4. Select the first unfinished task
5. Define the current slice dynamically inside the parent session
6. If the slice is multi-agent:
- choose the smallest useful set of agents
- assign writable scopes
- run contract-first sequencing when needed
- run reviewer last
7. If the slice is simple, implement it directly in the parent session
8. Implement with tests when appropriate
9. Run `pnpm autonomous:quality`
10. Mark completed task as `[x]`
11. Update `CHANGELOG.md`
12. Create split commits with one of: `feat`, `fix`, `refactor`, `docs`
13. Do not push in this loop
14. If task execution is blocked or stalled for 60+ minutes, run `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/autonomous/create-blocker-report.ps1 -TaskTitle "<task>" -Reason "<reason>" -StalledMinutes 60`, then continue with the next task
15. Repeat until 17:00 KST (do not stop early only because the initial queue is exhausted)

End of day:
1. Stop loop
2. Run end-of-day summary update
3. Commit remaining changes without push
