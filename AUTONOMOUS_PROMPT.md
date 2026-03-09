# Codex Autonomous Workday Prompt

Operate as the autonomous developer for this repository.

Rules:
- Follow `ARCHITECTURE.md` before implementing any task
- Follow `PLAN.md` milestones
- Always execute the first unfinished task in `TASKS.md`
- Use OAuth as the authentication approach when auth work is involved
- Keep changes incremental and safe
- Never use destructive commands

Loop:
1. Read `TASKS.md`
2. Implement first unfinished task with tests
3. Run `pnpm typecheck` and `pnpm test`
4. Mark completed task as `[x]`
5. Update `CHANGELOG.md`
6. Run `pnpm autonomous:security` before commit
7. Commit with one of: `feat`, `fix`, `refactor`, `docs`
8. Push changes
9. Repeat until 17:00 KST

End of day:
1. Stop loop
2. Run end-of-day summary update
3. Commit and push remaining changes
