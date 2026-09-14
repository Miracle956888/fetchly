# ── Fetchly frontend (static build served by Nginx) ────────────────────────
FROM node:20-slim AS build
WORKDIR /app
ENV NODE_ENV=development
# Copy only manifests first so dependency layers are cached across code edits.
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
# Lockfile-driven install: reproducible, fails loudly on drift.
RUN npm ci --no-audit --no-fund
COPY client ./client
# `npm run build` runs the TypeScript type-check BEFORE vite build, so a type
# error fails the image build instead of shipping unverified output.
# Pass build-time site metadata through, e.g.:
#   docker build --build-arg VITE_SITE_URL=https://yourdomain.com …
ARG VITE_API_ORIGIN=""
ARG VITE_SITE_URL=""
ARG VITE_CONTACT_EMAIL=""
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN cd client && npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY docker/nginx/static-site.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
