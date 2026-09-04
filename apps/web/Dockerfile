# Build context MUST be the repo root (pnpm workspace):
#   docker build -f apps/web/Dockerfile -t bakimevi-web .

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN corepack pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# No NEXT_PUBLIC_API_URL here on purpose: the app falls back to a relative
# "/api/v1" path so the same image works for every tenant behind Caddy.
RUN corepack pnpm turbo run build --filter=@bakimevi/web...

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /repo
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
