# Build context MUST be the repo root (pnpm workspace):
#   docker build -f apps/api/Dockerfile -t bakimevi-api .

FROM node:22-alpine AS base
RUN apk add --no-cache openssl
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
RUN corepack pnpm --filter @bakimevi/api prisma generate
RUN corepack pnpm turbo run build --filter=@bakimevi/api...

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
EXPOSE 3001
# tsconfig.json path-maps @bakimevi/shared-types ve @bakimevi/validation'ı workspace
# paketlerinin src/*.ts kaynağına işaret ediyor (dev'de tsx watch pre-build gerektirmesin
# diye). Bu yüzden tsc, rootDir'i /repo olarak hesaplıyor ve çıktı dist/server.js değil
# dist/apps/api/src/server.js oluyor.
CMD ["node", "dist/apps/api/src/server.js"]
