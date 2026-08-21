# syntax=docker/dockerfile:1.7
#
# Oro PWA — Progressive Web App
# Build with Bun, serve with nginx
#
#   docker build -t oro-pwa .

FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY shared ./shared

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_UMAMI_SCRIPT_URL=https://analytics.oro.fun/script.js
ENV VITE_UMAMI_SCRIPT_URL=${VITE_UMAMI_SCRIPT_URL}

ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN bun run build

# ── runtime: nginx:alpine on :8080 ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
ENV NGINX_PORT=8080

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R 101:101 /var/cache/nginx /var/run /etc/nginx/conf.d /usr/share/nginx/html

USER 101
EXPOSE 8080
