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
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install
COPY server ./server
RUN cd server && npx prisma generate && npx tsc -p tsconfig.json

FROM base AS runtime
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules
COPY server/package.json ./package.json
RUN mkdir -p storage/downloads storage/temp && \
    useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
