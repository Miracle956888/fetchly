# One web service: the Express API serves the built React app on the same origin.
# Bookworm supplies Python 3.11; Node 22 is a supported yt-dlp JS runtime.
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-pip ca-certificates openssl \
    && python3 -m pip install --no-cache-dir --break-system-packages 'yt-dlp[default]==2026.10.26' \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
ENV NODE_ENV=development
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --include=dev
COPY server ./server
COPY client ./client
# Client generation does not connect to MySQL; this placeholder exists only
# for the build step and is never used as a runtime DATABASE_URL.
RUN DATABASE_URL='mysql://build:build@localhost:3306/fetchly' npm run db:generate -w server \
    && npm run build -w server \
    && npm run build -w client

FROM base AS runtime
ENV NODE_ENV=production \
    CLIENT_DIST_DIR=/app/client/dist \
    YTDLP_JS_RUNTIME=node
# npm workspaces are hoisted: there is no server/node_modules to copy.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/dist ./client/dist
RUN mkdir -p storage/downloads storage/temp \
    && useradd -m appuser \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
CMD ["node", "server/dist/server.js"]
