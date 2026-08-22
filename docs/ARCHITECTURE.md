# Architecture — OmniWeb

> [← Back to README](../README.md)

OmniWeb is a full-stack monorepo application organized around three main layers: the **Frontend SPA**, the **Fastify API**, and the **Webcmd Execution Engine**. Postgres and Redis back the persistence and queue layers.

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (User)                          │
│                 React + Vite SPA  (port 5173)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Workflow  │  │ LiveRun  │  │ Healing  │  │  Observatory  │   │
│  │ Builder  │  │ Realtime │  │ Kanban   │  │  Recharts     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────────────┘   │
│       │ REST        │ WS          │ WS                          │
└───────┼─────────────┼─────────────┼─────────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FASTIFY API  (port 3001)                     │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  REST Routes │    │  Socket.IO      │    │  YAML DSL      │  │
│  │  /api/*      │    │  step_log       │    │  Parser (Zod)  │  │
│  │              │    │  drift_detected │    │                │  │
│  └──────┬───────┘    └────────┬────────┘    └───────┬────────┘  │
│         │                    │                      │           │
│         └─────────────────┐  │  ┌───────────────────┘           │
│                           ▼  ▼  ▼                               │
│                    ┌──────────────────┐                         │
│                    │   Execution      │                         │
│                    │   Engine         │                         │
│                    │  mockEngine.ts   │                         │
│                    └────────┬─────────┘                         │
│                             │ child_process.spawn               │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               @agentrhq/webcmd CLI  (v0.7.4)                    │
│                                                                 │
│   webcmd hackernews top   │  webcmd gdg team                    │
│   webcmd hackernews ask   │  webcmd site sample                 │
│   webcmd ycombinator …    │  (+ any installed plugin)           │
│                                                                 │
│   Execution strategies (in priority order):                     │
│   PUBLIC  →  COOKIE  →  INTERCEPT  →  UI  →  LOCAL             │
└─────────────────────────────────────────────────────────────────┘
                              │
                  ┌───────────┴────────────┐
                  ▼                        ▼
       ┌─────────────────┐     ┌─────────────────┐
       │   PostgreSQL    │     │     Redis        │
       │   (port 5433)   │     │   (port 6379)    │
       │                 │     │                  │
       │  Tenants        │     │  BullMQ Queues   │
       │  Workflows      │     │  Job Backpressure│
       │  Runs / Steps   │     │                  │
       │  Adapters       │     └─────────────────┘
       │  DriftEvents    │
       └─────────────────┘
```

---

## Component Breakdown

### Frontend (`apps/web`)

| Component | File | Role |
|---|---|---|
| App Router | `App.tsx` | React Router v6 route definitions |
| Navbar | `components/layout/Navbar.tsx` | Top-level navigation + Demo Mode toggle |
| Landing | `pages/Landing.tsx` | Hero, feature cards, animated architecture diagram |
| Workflow Builder | `pages/WorkflowBuilder.tsx` | XYFlow DAG canvas, node types, Run trigger |
| Live Run | `pages/LiveRun.tsx` | Step cards, approval gates, live log panel |
| Healing Pipeline | `pages/HealingPipeline.tsx` | Kanban Drift events board |
| Observatory | `pages/Observatory.tsx` | Recharts line/bar charts, KPI cards |
| Marketplace | `pages/Marketplace.tsx` | Adapter card grid with install actions |
| Tenant | `pages/Tenant.tsx` | Switcher, quota bars, secrets vault table |

**Library helpers:**

- `lib/api.ts` — Typed `fetch` wrapper pointing to `http://localhost:3001/api`
- `lib/socket.ts` — Singleton `socket.io-client` instance

### Backend (`apps/api`)

| File | Role |
|---|---|
| `index.ts` | Fastify server bootstrap, CORS, Socket.IO init |
| `routes.ts` | All REST endpoint handlers (Zod-validated) |
| `socket.ts` | Socket.IO room management (`run_<id>`, `healing_events`) |
| `mockEngine.ts` | Workflow runner — spawns real `webcmd` CLI processes |
| `workflowParser.ts` | YAML → Zod-validated `WorkflowDSL` object |
| `db.ts` | Prisma + `pg` driver adapter singleton |

---

## Database Schema

```
Tenant ──< Profile
       ──< Workflow ──< Run ──< RunStep
Adapter ──< DriftEvent
```

See full schema → [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma)

### Key models

| Model | Description |
|---|---|
| `Tenant` | An isolated organizational unit with its own profiles, workflows, and runs |
| `Profile` | An encrypted browser session profile for a given site + strategy combo |
| `Adapter` | A registered Webcmd site adapter with strategy and success-rate metadata |
| `Workflow` | A named automation stored as a JSON DSL blob |
| `Run` | One execution instance of a Workflow, tracking status and token savings |
| `RunStep` | A single step within a Run, including command, strategy, and timing |
| `DriftEvent` | A detected adapter regression, tracked through the healing lifecycle |

---

## Data Flow: Workflow Execution

```
User clicks "Run" in /build
        │
        ▼
POST /api/workflows/run  { yaml, tenantId }
        │
        ├─ parseWorkflowYAML(yaml) → WorkflowDSL
        ├─ prisma.workflow.create(...)
        └─ runWorkflow(id, tenantId, dsl)  [async — non-blocking]
                │
                ├─ prisma.run.create()  → socket.emit('run_started')
                │
                └─ for each step:
                       │
                       ├─ prisma.runStep.create()
                       ├─ socket.emit('step_updated', { status: 'running' })
                       │
                       ├─ IF step.approve:
                       │     socket.emit('run_waiting_approval')
                       │     ← execution pauses until POST /runs/:id/approve
                       │
                       └─ IF step.run.startsWith('webcmd '):
                              child_process.spawn(npx @agentrhq/webcmd ...)
                              stdout/stderr → socket.emit('step_log')
                              on close → socket.emit('step_updated', { status: 'succeeded' })

Return to client: { runId }  → navigate('/runs/:runId')
```

---

## Data Flow: Self-Healing

```
POST /api/healing/trigger  (or real drift detected)
        │
        ▼
triggerSimulatedDrift()
        │
        ├─ Pick random Adapter
        ├─ prisma.driftEvent.create({ status: 'detected' })
        ├─ socket.to('healing_events').emit('drift_detected', event)
        │
        ├─ After 4s:  status → 'healing'   → emit('drift_updated')
        ├─ After 10s: status → 'verifying' → emit('drift_updated')
        └─ After 18s: status → 'resolved'  → emit('drift_updated')

Frontend Kanban re-renders as cards move across columns in real time.
```

---

## WebSocket Event Reference

| Event | Direction | Payload |
|---|---|---|
| `subscribe_run` | client → server | `runId: string` |
| `subscribe_healing` | client → server | — |
| `run_started` | server → client | `Run` object |
| `step_updated` | server → client | `RunStep` object |
| `step_log` | server → client | `{ stepId, log: string }` |
| `run_waiting_approval` | server → client | `{ runId, stepId }` |
| `run_resumed` | server → client | `{ runId }` |
| `run_completed` | server → client | `{ runId, status }` |
| `drift_detected` | server → all | `DriftEvent + Adapter` |
| `drift_updated` | server → all | `{ id, status }` |
