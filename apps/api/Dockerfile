# DEPUKO API image. Lockfile is not included in this candidate yet, so install
# resolves the declared semver ranges at build time. Pin a generated lockfile
# before treating images as reproducible production artifacts.
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --no-frozen-lockfile --filter @depuko/api
COPY apps/api apps/api
RUN cd apps/api && pnpm exec nest build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && addgroup -S depuko && adduser -S depuko -G depuko
COPY --from=build --chown=depuko:depuko /app /app
USER depuko
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
