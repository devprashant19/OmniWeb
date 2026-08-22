# ── Stage 1: deps ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json apps/web/

RUN npm install --omit=dev

# ── Stage 2: build ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json apps/web/

RUN npm install

COPY apps/web apps/web

WORKDIR /app/apps/web

# Build static assets — output goes to apps/web/dist
RUN npx vite build

# ── Stage 3: serve with nginx ──────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA fallback: route all paths to index.html for React Router
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
