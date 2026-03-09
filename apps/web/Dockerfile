FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @f1/web... --frozen-lockfile=false
COPY apps/web apps/web
COPY packages/shared packages/shared
RUN pnpm --filter @f1/shared build && pnpm --filter @f1/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@f1/web", "start"]