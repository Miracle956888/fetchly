# ── Fetchly API server ─────────────────────────────────────────────────────
FROM node:20-slim AS base
ENV PNPM_HOME="" NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
ENV NODE_ENV=development
# Copy only manifests first so dependency layers are cached across code edits.
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
# Lockfile-driven install: reproducible, fails loudly on drift.
RUN npm ci --no-audit --no-fund
COPY server ./server
RUN cd server && npx prisma generate && npx tsc -p tsconfig.json

FROM base AS runtime
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules
COPY server/package.json ./package.json
# Schema + migrations + entrypoint so `prisma migrate deploy` can run at boot.
COPY server/prisma ./prisma
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p storage/downloads storage/temp && \
    chmod +x ./docker-entrypoint.sh && \
    useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
