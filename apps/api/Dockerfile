# DEPUKO API — Railway-compatible container
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
RUN npm install --legacy-peer-deps
RUN npm run build --workspace=@depuko/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S depuko && adduser -S depuko -G depuko
COPY --from=build --chown=depuko:depuko /app /app
USER depuko
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-4000}/api/v1/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
