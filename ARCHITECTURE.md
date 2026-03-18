# Architecture

## System Layout
- Desktop shell: Electron app in `apps/desktop`
- Public web: React and Next.js landing and demo app in `apps/web`
- Backend: Node.js, TypeScript, and Fastify in `apps/realtime`
- Shared package: schemas, normalization rules, sanitization helpers, and cross-service contracts in `packages/shared`
- Future worker: optional Python ingestion or analysis service outside the critical MVP path

## Runtime Flow
- Desktop shell hosts the local renderer and becomes the primary product entrypoint
- Realtime service owns the primary session snapshot flow, serves HTTP reads, and broadcasts updates over WebSocket
- Future optional worker services may fetch or analyze external data and publish normalized updates into the realtime boundary later
- Desktop renderer consumes session snapshots and renders the live race experience
- Web app provides landing, download, docs, and historical demo routes
- Realtime service triggers podium prediction generation when a new lap completion boundary is observed
- AI predictions are attached to lap metadata and returned to the web client as discrete updates instead of per-tick noise

## Module Boundaries
- `apps/desktop/src`: Electron main, preload, renderer bootstrap
- `apps/web/app`: route entrypoints and watch-page composition
- `apps/web/src/components`: 2D track renderer, HUD, driver list, prediction card, and page-level presentation
- `apps/web/src/store`: client session state, selected-driver state, interpolation state, and prediction view state
- `apps/realtime/src/routes`: HTTP route handlers and WebSocket boundary
- `apps/realtime/src/services`: current-session resolution, replay buffering, lap-boundary detection, and AI prediction orchestration
- `apps/realtime/src/store`: persistence adapters and repository layer
- `apps/realtime/src/sources`: primary mock or live session adapters that feed the MVP directly
- `packages/shared/src`: shared contracts, lap and telemetry normalization, sanitization, and cross-service utilities

## Operational Conventions
- Secrets must come from `process.env`
- Database access must use parameterized queries
- User-provided HTML or text must be sanitized before rendering
- Error responses must stay opaque and avoid internal detail leakage
- Auth integration standard for this project is OAuth
- Podium prediction AI must run on lap-boundary events, not on every telemetry tick
- Optional worker processes must consume and emit the same shared session contracts as the TypeScript core

## Source Directories
- `apps/`
- `packages/`
- `tests/` (service-level tests live in each workspace package)
