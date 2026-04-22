# Frontend: Node-сборка Vite → nginx, который раздаёт статику и проксирует /api → api:8000.

FROM node:24-alpine AS builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json vite.config.ts eslint.config.mjs index.html ./
COPY app ./app
COPY public ./public

# В docker-compose network запрос /api/v1/... обрабатывает nginx-прокси.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build


FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80
