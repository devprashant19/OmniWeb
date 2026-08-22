# Deployment Guide — OmniWeb

> [← Back to README](../README.md)

This document covers every deployment path from local Docker Compose to production VPS and cloud platforms.

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Variables](#2-environment-variables)
3. [Option A — Docker Compose on a VPS](#3-option-a--docker-compose-on-a-vps)
4. [Option B — Railway (PaaS, one-click-ish)](#4-option-b--railway)
5. [Option C — Render](#5-option-c--render)
6. [Option D — Google Cloud Run](#6-option-d--google-cloud-run)
7. [Database Migrations in Production](#7-database-migrations-in-production)
8. [Webcmd in Production Containers](#8-webcmd-in-production-containers)
9. [Reverse Proxy with Nginx](#9-reverse-proxy-with-nginx)
10. [TLS / HTTPS with Certbot](#10-tls--https-with-certbot)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [CI/CD with GitHub Actions](#12-cicd-with-github-actions)

---

## 1. Pre-Deployment Checklist

Before deploying to any environment, verify the following:

- [ ] `POSTGRES_PASSWORD` set to a strong random value
- [ ] `REDIS_PASSWORD` set to a strong random value  
- [ ] `DATABASE_URL` updated with the correct host, port, user, and password
- [ ] `CORS_ORIGIN` set to your frontend domain (not `*`)
- [ ] `NODE_ENV=production`
- [ ] Webcmd `@agentrhq/webcmd` is accessible in the container (`npx` can fetch it, or pre-install it)
- [ ] Docker installed on the target host (`docker --version`)
- [ ] Port 80/443 open in firewall/security group rules

---

## 2. Environment Variables

Copy the example file and fill in values:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full Prisma connection string |
| `POSTGRES_PASSWORD` | ✅ | Postgres root password |
| `REDIS_PASSWORD` | ✅ | Redis auth password |
| `REDIS_URL` | ✅ | Full Redis connection string |
| `NODE_ENV` | ✅ | Must be `production` in prod |
| `PORT` | optional | API port — defaults to `3001` |
| `CORS_ORIGIN` | recommended | Your frontend URL e.g. `https://omniweb.yourdomain.com` |

> **Never commit `.env` files to git.** The `.gitignore` already excludes `.env`.

---

## 3. Option A — Docker Compose on a VPS

This is the **recommended path** for a hackathon demo or small production deployment. Works on any Linux VPS (DigitalOcean Droplet, AWS EC2, GCP Compute Engine, Hetzner, etc.).

### Step 1 — Provision a Server

Minimum specs:
- **2 vCPU, 4 GB RAM** (webcmd spawns headless Chromium for UI-strategy adapters)
- Ubuntu 22.04 LTS or Debian 12
- Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open

### Step 2 — Install Docker on the server

```bash
# SSH into the server
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify
docker --version
docker compose version
```

### Step 3 — Clone the repo

```bash
git clone https://github.com/devprashant19/OmniWeb.git
cd OmniWeb
```

### Step 4 — Configure environment

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env  # Fill in strong passwords
```

### Step 5 — Deploy

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up --build -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f
```

Services started:
| Service | Internal Port | External Port |
|---|---|---|
| Postgres | 5432 | (not exposed) |
| Redis | 6379 | (not exposed) |
| API (Fastify) | 3001 | 3001 |
| Web (nginx) | 80 | 80 |

### Step 6 — Verify

```bash
# Check all containers are healthy
docker compose -f docker-compose.prod.yml ps

# Test the API
curl http://localhost:3001/api/tenants

# Test the frontend
curl -I http://localhost:80
```

### Updating a deployment

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up --build -d
```

---

## 4. Option B — Railway

Railway can host the full stack with managed Postgres and Redis.

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Click **Deploy from GitHub repo** → select `devprashant19/OmniWeb`

### Step 2 — Add managed services

In the Railway project dashboard:
- Click **+ Add Service** → **Database** → **PostgreSQL** → copy the `DATABASE_URL`
- Click **+ Add Service** → **Database** → **Redis** → copy the `REDIS_URL`

### Step 3 — Configure the API service

1. In the API service settings → **Environment** tab, add:

```
DATABASE_URL=<paste from Railway Postgres>
REDIS_URL=<paste from Railway Redis>
NODE_ENV=production
```

2. In **Settings** → **Build Command**:
```
npm install && npx prisma generate
```

3. In **Settings** → **Start Command**:
```
npx prisma migrate deploy && npx tsx apps/api/src/index.ts
```

4. Set **Root Directory** to `/` (monorepo root)

### Step 4 — Configure the Web service

1. Add another service from the same repo
2. In **Settings** → **Build Command**:
```
npm install && npx vite build --outDir dist
```

3. In **Settings** → **Start Command**: leave blank (static site)
4. Set **Root Directory** to `apps/web`
5. Set **Publish Directory** to `dist`

Railway will give you a `.up.railway.app` URL for each service.

---

## 5. Option C — Render

### API (Web Service)

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `.` (monorepo root)  
   - **Build Command**: `npm install && cd apps/api && npx prisma generate`
   - **Start Command**: `cd apps/api && npx prisma migrate deploy && npx tsx src/index.ts`
   - **Environment Variables**: Add `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production`

### Frontend (Static Site)

1. New → **Static Site**
2. Connect same repo
3. Settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm install && npx vite build`
   - **Publish Directory**: `dist`

### Managed Database

1. New → **PostgreSQL** → copy Internal Database URL → paste as `DATABASE_URL` in the API service

### Managed Redis

1. New → **Redis** → copy Internal Redis URL → paste as `REDIS_URL`

---

## 6. Option D — Google Cloud Run

This is the most scalable option — fully serverless, auto-scales to zero.

> Note: Webcmd can spawn browser processes. Cloud Run has a 32 GB RAM max and allows concurrent container instances. Ensure `--concurrency` is set appropriately.

### Step 1 — Enable APIs

```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com
```

### Step 2 — Create Artifact Registry

```bash
gcloud artifacts repositories create omniweb \
  --repository-format=docker \
  --location=asia-south1
```

### Step 3 — Build and push images

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=asia-south1

# Build and push API
docker build -f apps/api/Dockerfile -t $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/api:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/api:latest

# Build and push Web
docker build -f apps/web/Dockerfile -t $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/web:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/web:latest
```

### Step 4 — Deploy API to Cloud Run

```bash
gcloud run deploy omniweb-api \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/api:latest \
  --region $REGION \
  --port 3001 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80 \
  --no-cpu-throttling \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=omniweb-db-url:latest,REDIS_URL=omniweb-redis-url:latest \
  --allow-unauthenticated
```

> Store secrets in **Secret Manager**:
> ```bash
> echo -n "postgresql://..." | gcloud secrets create omniweb-db-url --data-file=-
> echo -n "redis://..." | gcloud secrets create omniweb-redis-url --data-file=-
> ```

### Step 5 — Deploy Frontend to Cloud Run

```bash
gcloud run deploy omniweb-web \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/web:latest \
  --region $REGION \
  --port 80 \
  --memory 256Mi \
  --min-instances 0 \
  --allow-unauthenticated
```

### Step 6 — Get URLs

```bash
gcloud run services describe omniweb-api --region $REGION --format='value(status.url)'
gcloud run services describe omniweb-web --region $REGION --format='value(status.url)'
```

### Scale down (save costs when not demoing)

```bash
gcloud run services update omniweb-api \
  --min-instances 0 \
  --cpu-throttling \
  --region $REGION \
  --quiet
```

---

## 7. Database Migrations in Production

**Never run `prisma migrate dev` in production.** Use `migrate deploy` instead:

```bash
# Apply all pending migrations (safe for production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

The `docker-compose.prod.yml` and Cloud Run deploy commands already call `prisma migrate deploy` on startup.

### Seeding in production

Run the seed script **once** after first deploy:

```bash
# In Docker Compose
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts

# In Cloud Run
gcloud run jobs create omniweb-seed \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/omniweb/api:latest \
  --command npx tsx prisma/seed.ts \
  --region $REGION
gcloud run jobs execute omniweb-seed --region $REGION
```

---

## 8. Webcmd in Production Containers

OmniWeb spawns real `webcmd` commands using `child_process.spawn('npx', ['@agentrhq/webcmd', ...])`. In production containers, you need either:

### Option A — Pre-install webcmd in the image (recommended)

Add to `apps/api/Dockerfile` in the deps stage:

```dockerfile
RUN npm install -g @agentrhq/webcmd
```

This avoids cold-start `npx` downloads during workflow execution.

### Option B — Use npx (current default)

Works out of the box but adds ~2-3s per first invocation as `npx` downloads the package.

### Chromium / Playwright for UI strategy

If your workflows use adapters with `UI` strategy (full browser automation), the container needs Chromium:

```dockerfile
# Add to API Dockerfile (Alpine-based)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
```

---

## 9. Reverse Proxy with Nginx

For a VPS deployment, use Nginx as a reverse proxy to route traffic:

```nginx
# /etc/nginx/sites-available/omniweb

server {
    listen 80;
    server_name omniweb.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    # Socket.IO WebSocket upgrade
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/omniweb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. TLS / HTTPS with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Issue certificate (replace with your domain)
sudo certbot --nginx -d omniweb.yourdomain.com

# Auto-renewal is set up automatically. Verify:
sudo certbot renew --dry-run
```

Certbot will modify your nginx config to redirect HTTP → HTTPS and add the SSL certificate.

---

## 11. Monitoring & Logs

### View live logs

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Cloud Run
gcloud run services logs read omniweb-api --region asia-south1 --tail 100
```

### Container health

```bash
# Docker Compose
docker compose -f docker-compose.prod.yml ps
docker stats  # CPU/memory usage live

# Cloud Run
gcloud run services describe omniweb-api --region asia-south1
```

### Database

```bash
# Connect to Postgres directly (Docker Compose)
docker compose -f docker-compose.prod.yml exec postgres psql -U omniweb omniweb

# Run Prisma Studio (visual DB browser, dev only)
cd apps/api
npx prisma studio
```

---

## 12. CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy OmniWeb

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker asia-south1-docker.pkg.dev

      - name: Build and push API image
        run: |
          docker build -f apps/api/Dockerfile \
            -t asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/api:${{ github.sha }} \
            -t asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/api:latest .
          docker push asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/api:latest

      - name: Build and push Web image
        run: |
          docker build -f apps/web/Dockerfile \
            -t asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/web:${{ github.sha }} \
            -t asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/web:latest .
          docker push asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/web:latest

      - name: Deploy API to Cloud Run
        run: |
          gcloud run deploy omniweb-api \
            --image asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/api:latest \
            --region asia-south1 \
            --quiet

      - name: Deploy Web to Cloud Run
        run: |
          gcloud run deploy omniweb-web \
            --image asia-south1-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/omniweb/web:latest \
            --region asia-south1 \
            --quiet
```

**GitHub Secrets to set:**

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | JSON key of a GCP Service Account with Cloud Run + Artifact Registry roles |
| `GCP_PROJECT` | Your GCP project ID |

---

## Quick Reference

| Task | Command |
|---|---|
| Start local dev | `docker compose up --build` |
| Start production | `docker compose -f docker-compose.prod.yml up --build -d` |
| Stop production | `docker compose -f docker-compose.prod.yml down` |
| Wipe data and restart | `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up --build -d` |
| Run migrations | `docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy` |
| Re-seed data | `docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts` |
| View API logs | `docker compose -f docker-compose.prod.yml logs -f api` |
| Shell into API | `docker compose -f docker-compose.prod.yml exec api sh` |
| Shell into Postgres | `docker compose -f docker-compose.prod.yml exec postgres psql -U omniweb omniweb` |
