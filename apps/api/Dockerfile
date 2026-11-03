# syntax=docker/dockerfile:1.7
# Build context = ROOT repo:  docker build -f apps/api/Dockerfile -t portfolio-api .

# ---------- build ----------
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

# Manifest dulu → lapisan install ter-cache selama dependensi tidak berubah.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @portfolio/api...

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @portfolio/api build \
 && pnpm --filter @portfolio/api --prod deploy --legacy /out \
 && cp -r apps/api/dist apps/api/migrations /out/ \
 && rm -rf /out/src /out/test

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4000 UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=build /out/ ./
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 4000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrasi dijalankan eksplisit (lihat docker-compose.yml: service `migrate`), bukan saat boot.
CMD ["node", "dist/server.js"]
