# ── Fetchly frontend (static build served by Nginx) ────────────────────────
FROM node:20-slim AS build
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install
COPY client ./client
RUN cd client && npx vite build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY docker/nginx/static-site.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
