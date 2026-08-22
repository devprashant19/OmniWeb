# OmniWeb

> **The multi-tenant orchestration and observability platform for AI-driven browser CLI agents — powered by [Webcmd](https://webcmd.dev).**

OmniWeb sits above the Webcmd CLI, providing everything a team needs to run browser automations at scale: workflow chaining, real-time observability, self-healing pipelines, multi-tenant isolation, and an adapter marketplace.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [📖 Architecture](./docs/ARCHITECTURE.md) | System design, data flow, and component breakdown |
| [⚙️ Working](./docs/WORKING.md) | How the engine, healing loop, and DSL work internally |
| [🚀 Setup Guide](./docs/SETUP.md) | Local dev, Docker, and environment configuration |
| [🌐 Deployment](./docs/DEPLOYMENT.md) | VPS, Railway, Render, GCP Cloud Run, CI/CD |
| [🔌 API Reference](./docs/API.md) | All REST endpoints and WebSocket events |
| [🧩 Adapter Guide](./docs/ADAPTERS.md) | How Webcmd adapters are registered, used, and healed |
| [🤝 Contributing](./docs/CONTRIBUTING.md) | Dev workflow and code style guide |

---

## ✨ Features

- **🔗 Visual Workflow Engine** — Drag-and-drop DAG builder for chaining real `webcmd` commands with conditionals, retries, and human-approval gates
- **⚡ Live Run Visualizer** — Real-time step-by-step execution view with live `stdout`/`stderr` streamed via WebSockets
- **🩺 Self-Healing Pipeline** — Kanban board showing the full lifecycle of drift events: Detected → Diagnosing → Verifying (Canary) → Resolved
- **📊 Fleet Observatory** — Token savings, strategy distribution, drift frequency and repair metrics across all tenants
- **🛒 Adapter Registry** — Discover, install, and publish Webcmd adapters for any website
- **🏢 Multi-Tenant Isolation** — Encrypted cookie jar profiles, per-tenant secrets vaults, and compute quotas

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Core CLI** | [`@agentrhq/webcmd`](https://webcmd.dev) v0.7.4 |
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **Visualizations** | Recharts, XYFlow (React Flow) |
| **Backend** | Node.js + Fastify |
| **Real-time** | Socket.IO (WebSockets) |
| **Database** | PostgreSQL (via Prisma 7 + `pg` driver adapter) |
| **Queue** | BullMQ + Redis |
| **Deployment** | Docker Compose |

---

## 🚀 Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
git clone https://github.com/your-org/omniweb
cd omniweb
docker compose up --build
```

Then visit **http://localhost:5173**

### Option 2 — Local Development

**Prerequisites:** Node.js 22+, Docker (for Postgres & Redis)

```bash
# 1. Start infrastructure
docker compose up postgres redis -d

# 2. Install dependencies
npm install

# 3. Migrate and seed the database
cd apps/api
npx prisma migrate dev
npx tsx prisma/seed.ts

# 4. Start API server (port 3001)
npm run dev

# 5. In a new terminal — start frontend (port 5173)
cd ../web
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
omniweb/
├── apps/
│   ├── api/                     # Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry point
│   │   │   ├── routes.ts        # REST API routes
│   │   │   ├── socket.ts        # Socket.IO initialization
│   │   │   ├── mockEngine.ts    # Webcmd execution + healing engine
│   │   │   ├── workflowParser.ts# YAML DSL parser (Zod)
│   │   │   └── db.ts            # Prisma client singleton
│   │   └── prisma/
│   │       ├── schema.prisma    # Database schema
│   │       └── seed.ts          # Demo data seeder
│   └── web/                     # React + Vite frontend
│       └── src/
│           ├── pages/           # Route-level page components
│           ├── components/      # Shared UI components
│           └── lib/             # API client + Socket.IO client
├── docker-compose.yml
└── docs/                        # This documentation
```

---

## 🗺️ App Routes

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero + architecture animation |
| `/build` | Workflow Builder | Drag-and-drop DAG canvas |
| `/runs/:id` | Live Run | Real-time step execution + approval gates |
| `/healing` | Healing Pipeline | Drift event Kanban board |
| `/observatory` | Observatory | Fleet metrics and charts |
| `/marketplace` | Marketplace | Adapter registry |
| `/tenant` | Tenant | Profiles, secrets, quotas |

---

## 📜 License

Apache-2.0 — the same license as `@agentrhq/webcmd`.
