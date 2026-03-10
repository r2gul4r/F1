# Codex Autonomous Workday Prompt

Operate as the autonomous developer for this repository.

Rules:
- Follow `ARCHITECTURE.md` before implementing any task
- Follow `PLAN.md` milestones
- Always execute the first unfinished task in `TASKS.md`
- Use OAuth as the authentication approach when auth work is involved
- Keep changes incremental and safe
- Never use destructive commands
- Use Korean for all conversation, status updates, and reports

Loop:
1. Run `pnpm autonomous:start:suggest`
2. Read `TASKS.md`
3. Implement first unfinished task with tests
4. Run `pnpm autonomous:quality`
5. Mark completed task as `[x]`
6. Update `CHANGELOG.md`
7. Commit with one of: `feat`, `fix`, `refactor`, `docs`
8. Push changes
9. Repeat until 17:00 KST

End of day:
1. Stop loop
2. Run end-of-day summary update
3. Commit and push remaining changes
