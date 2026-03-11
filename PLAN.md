# F1 Pulse Execution Plan

## Product Goal
- Build a real-time F1 strategy dashboard with a 2.5D track view, driver telemetry panels, and hybrid AI race insight
- Prioritize reliability and readability before spectacle features

## MVP Priority
1. Real-time data must keep flowing without visible stalls
2. Car movement must look smooth even when source intervals are uneven
3. Tire, gap, interval, speed, RPM, and gear must be easy to read
4. AI summaries must feel plausible and bounded by deterministic race context
5. Virtual HUD and chase-cam style polish come after the core dashboard is trusted

## Source Of Truth Stack
- Frontend: Next.js, React, Three.js, Zustand in `apps/web`
- Backend API: Node.js and Fastify in `apps/realtime`
- Realtime transport: native WebSocket via `ws`
- Worker ingestion: Node.js pipeline in `apps/worker`
- Shared contracts and rules: `packages/shared`
- Data: Redis for realtime buffering, PostgreSQL for race history
- AI: local Ollama + Gemma 3 and cloud Gemini behind one adapter contract
- Infra: Docker, Oracle Cloud, GitHub
- Styling: current global CSS is the baseline, Tailwind is optional after MVP if styling velocity becomes a bottleneck

## Planning Rules
- The current repository stack is the implementation baseline
- Do not restart the project just to swap to Express, Socket.io, or Tailwind
- Treat `packages/shared` as the contract boundary between frontend, realtime, worker, and AI paths
- Keep secrets in `process.env`, keep database queries parameterized, sanitize user-facing text, and preserve opaque error messages
- Prefer adding observability and fallback logic earlier than cosmetic UI expansion
- Use `TEAM_GUIDE.md` as the default multi-agent operating contract for this repository

## Phase 1
- Goal: stabilize ingestion and realtime delivery
- Scope:
- Implement resilient OpenF1 ingestion flow with clear fallback behavior
- Verify Redis buffering and replay behavior for reconnecting clients
- Tighten session lifecycle, current-session resolution, and session boundary handling
- Add baseline metrics for ingestion lag, broadcast count, reconnect rate, and dropped-event suspicion
- Acceptance:
- Mock and OpenF1 paths both keep the dashboard alive
- Web clients reconnect cleanly and recover recent state
- Realtime path stays responsive under repeated reconnects and source failure

## Phase 2
- Goal: finish the strategy dashboard MVP
- Scope:
- Improve 2.5D track rendering quality and coordinate fidelity
- Keep vehicle smoothing stable with interpolation tuned for inconsistent source cadence
- Expand the driver panel to show tire, gap, interval, speed, RPM, and gear clearly
- Improve dashboard readability on desktop and mobile without sacrificing realtime clarity
- Acceptance:
- Users can identify race order, gaps, and selected-driver state quickly
- Motion looks smooth enough that jitter does not distract from strategy reading
- Driver telemetry panel is useful without external F1 context

## Phase 3
- Goal: harden the hybrid AI strategy engine
- Scope:
- Introduce an AI adapter that hides local Ollama and cloud Gemini behind one interface
- Keep deterministic calculations such as pace delta, pit window, and trigger context outside the LLM
- Refine P5-trigger analysis flow and store AI outputs with timing metadata
- Define fallback behavior when a model is slow, unavailable, or returns unusable output
- Acceptance:
- Local and cloud providers can be switched by environment variables only
- AI output always has deterministic context and safe fallback text
- Prediction latency and failure rate are measurable

## Phase 4
- Goal: add high-impact immersion features after the MVP is trustworthy
- Scope:
- Implement virtual HUD for the selected driver
- Add chase-cam style selected-driver focus mode
- Layer throttle and brake visualization onto the selected-driver experience
- Keep the HUD path isolated from the core dashboard so failures do not break the main view
- Acceptance:
- HUD features feel additive and do not degrade the main dashboard
- The main strategy view still works when HUD features are disabled

## Phase 5
- Goal: finalize dual-path deployment and operational readiness
- Scope:
- Keep public deployment aligned with Oracle Cloud and cloud AI provider settings
- Keep developer workflow optimized for local GPU inference through Ollama
- Add deployment checks, environment validation, and failure-mode runbooks
- Review cost, latency, and fallback behavior per environment
- Acceptance:
- Public and developer modes can be selected through environment configuration
- Deployment does not require code changes to switch AI providers
- Core health checks and rollback steps are documented

## Suggested Agent Lanes
- Frontend UI lane: `apps/web` layout, panels, responsive behavior, and dashboard readability outside the canvas
- Three.js lane: `apps/web` canvas, camera, interpolation, map fidelity, and HUD rendering
- Realtime backend lane: `apps/realtime` HTTP and WebSocket delivery, auth, metrics, and reconnect behavior
- Data and AI lane: `apps/worker`, `packages/shared`, and AI adapter or trigger contracts
- Review lane: read-only validation for regressions, contract drift, performance risk, and missing tests

## Suggested Model Assignment
- Parent planner and reviewer: `gpt-5.4` with `xhigh`
- Frontend UI, Three.js, realtime backend, and data or AI implementers: `gpt-5.3-codex` with `high`
- Speed tier: start with `Fast` for every lane and change only if a role repeatedly misses quality targets
