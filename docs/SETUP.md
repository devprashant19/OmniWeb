# Setup Guide — OmniWeb

> [← Back to README](../README.md)

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22+ | Runtime for both API and frontend |
| npm | 10+ | Package manager |
| Docker | 24+ | Postgres + Redis containers |
| Git | Any | Clone the repo |

---

## Option 1: Docker Compose (Recommended)

This spins up everything — Postgres, Redis, API server, and frontend — in one command.

```bash
git clone https://github.com/your-org/omniweb
cd omniweb

docker compose up --build
```

> First run will take a few minutes to build Docker images and run migrations.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Postgres | localhost:5433 |
| Redis | localhost:6379 |

To tear down and wipe all data:
```bash
docker compose down -v
```

---

## Option 2: Local Development

### Step 1 — Start Infrastructure

```bash
# Start only Postgres and Redis
docker compose up postgres redis -d
```

### Step 2 — Install Dependencies

```bash
# Install all workspace packages from root
npm install
```

### Step 3 — Configure Environment

The API reads from `apps/api/.env`. It is pre-configured for the Docker Compose Postgres instance:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/postgres?schema=public"
```

If you have a different Postgres setup, update this file accordingly.

### Step 4 — Migrate & Seed the Database

```bash
cd apps/api

# Run Prisma migrations
npx prisma migrate dev --name init

# Seed with demo data (tenants, workflows, adapters, drift events)
npx tsx prisma/seed.ts
```

### Step 5 — Start the API

```bash
# Still in apps/api
npm run dev
```

The Fastify server will start at **http://localhost:3001**.

### Step 6 — Start the Frontend

Open a new terminal:

```bash
cd apps/web
npm run dev
```

The Vite dev server will start at **http://localhost:5173**.

---

## Environment Variables

### `apps/api/.env`

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5433/postgres` | Prisma connection string |

### Notes on Prisma 7

OmniWeb uses Prisma 7, which requires a **driver adapter** instead of a native connection URL. The `prisma.config.ts` file in `apps/api/` configures the `PrismaPg` adapter from `@prisma/adapter-pg`. The `datasource url` field in `schema.prisma` is intentionally omitted.

---

## Running Webcmd Adapters

OmniWeb spawns real `webcmd` commands via `child_process.spawn`. For this to work, `@agentrhq/webcmd` must be available via `npx`:

```bash
# Verify webcmd is accessible
npx @agentrhq/webcmd --version

# List installed site adapters
npx @agentrhq/webcmd list

# See available hackernews commands (used in default workflow)
npx @agentrhq/webcmd hackernews --help
```

**Network access required:** By default, the workflow builder runs:
- `webcmd hackernews top` — fetches live HN top stories
- `webcmd gdg team` — fetches GDG NITH team members
- `webcmd hackernews ask` — fetches HN Ask posts

These require internet access during execution.

---

## Demo Walkthrough (3-minute projector demo)

1. **Open** http://localhost:5173 — admire the dark-mode landing with animation
2. **Click "Build"** → the Workflow Builder loads with a prebuilt DAG
3. **Click "Run this workflow"** → watch real `webcmd` commands execute live
4. **On the Approval gate** → click "Approve" and watch the pipeline resume
5. **Click "Healing"** → click "Trigger Simulated Drift" → watch the Kanban board animate through all 4 stages over 18 seconds
6. **Click "Observatory"** → show token savings, strategy chart, and insight callout
7. **Click "Marketplace"** → show the adapter registry with mock install
8. **Click "Tenant"** → switch between tenants, show quota bars and secrets vault

---

## Troubleshooting

### API fails to start — `Cannot find module 'yaml'`

```bash
cd apps/api
npm install yaml
```

### Prisma migration fails — auth error

Make sure Docker Compose Postgres is running and the port 5433 is not blocked:

```bash
docker compose up postgres -d
docker compose ps  # verify it's running
```

### Webcmd commands fail in workflow

Check network access and webcmd version:

```bash
npx @agentrhq/webcmd doctor
npx @agentrhq/webcmd --version  # should be 0.7.4+
```
