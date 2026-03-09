FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/realtime/package.json apps/realtime/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @f1/realtime... --frozen-lockfile=false
COPY apps/realtime apps/realtime
COPY packages/shared packages/shared
RUN pnpm --filter @f1/shared build && pnpm --filter @f1/realtime build
EXPOSE 4001
CMD ["pnpm", "--filter", "@f1/realtime", "start"]