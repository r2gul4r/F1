# Architecture

## System Layout
- Frontend: React and Next.js in `apps/web`
- Backend: Node.js and Fastify in `apps/realtime`
- Worker: Node.js ingestion pipeline in `apps/worker`
- Shared package: schemas, sanitization helpers, and rules in `packages/shared`

## Module Boundaries
- `apps/web/src`: UI components, client store, presentation logic
- `apps/realtime/src/routes`: HTTP route handlers
- `apps/realtime/src/services`: business services
- `apps/realtime/src/store`: persistence adapters and repository layer
- `apps/worker/src/sources`: external data ingestion adapters
- `packages/shared/src`: shared contracts and cross-service utilities

## Operational Conventions
- Secrets must come from `process.env`
- Database access must use parameterized queries
- User-provided HTML or text must be sanitized before rendering
- Error responses must stay opaque and avoid internal detail leakage
- Auth integration standard for this project is OAuth

## Source Directories
- `apps/`
- `packages/`
- `tests/` (service-level tests live in each workspace package)
