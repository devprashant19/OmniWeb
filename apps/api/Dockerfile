# ── Stage 1: deps ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/

RUN npm ci --omit=dev

# ── Stage 2: build ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/

RUN npm ci

COPY apps/api apps/api
COPY --from=deps /app/node_modules ./node_modules

WORKDIR /app/apps/api
RUN npx prisma generate

# ── Stage 3: production runner ─────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy what we need to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
