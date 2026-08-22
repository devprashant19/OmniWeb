# API Reference — OmniWeb

> [← Back to README](../README.md)

Base URL: `http://localhost:3001/api`

All request/response bodies are JSON. All endpoints return `200` on success unless noted.

---

## Workflows

### `GET /workflows`
List all workflows across all tenants.

**Response**
```json
[
  {
    "id": "clx...",
    "name": "weekly-pipeline-digest",
    "tenantId": "clx...",
    "tenant": { "id": "...", "name": "Acme Corp" },
    "dsl": { "name": "...", "steps": [...] },
    "createdAt": "2026-08-21T12:00:00Z"
  }
]
```

---

### `POST /workflows/run`
Parse a YAML DSL and kick off a new workflow run (or re-run an existing workflow by ID). Returns immediately with the `runId`; execution happens asynchronously with progress emitted over WebSockets.

**Request body**
```json
{
  "tenantId": "clx...",
  "yaml": "name: my-wf\nsteps:\n  - id: s1\n    run: webcmd hackernews top -f plain"
}
```

OR to re-run an existing saved workflow:
```json
{
  "tenantId": "clx...",
  "workflowId": "clx..."
}
```

**Response**
```json
{ "runId": "clx..." }
```

---

## Runs

### `GET /runs/:id`
Get the full state of a run including all steps.

**Response**
```json
{
  "id": "clx...",
  "workflowId": "clx...",
  "tenantId": "clx...",
  "status": "running",
  "startedAt": "2026-08-22T08:00:00Z",
  "finishedAt": null,
  "costTokensSaved": 420,
  "steps": [
    {
      "id": "clx...",
      "index": 0,
      "command": "webcmd hackernews top -f plain",
      "strategy": "PUBLIC",
      "status": "succeeded",
      "startedAt": "...",
      "finishedAt": "..."
    }
  ]
}
```

**Run status values:** `queued` | `running` | `waiting_approval` | `succeeded` | `failed` | `healed`

**Step status values:** `pending` | `running` | `succeeded` | `failed` | `healing` | `skipped`

---

### `POST /runs/:id/approve`
Resume a run that is paused at a human-approval gate.

**Request body**
```json
{ "stepId": "clx..." }
```

**Response**
```json
{ "success": true }
```

---

## Observability

### `GET /stats`
Aggregated fleet statistics across all runs and adapters.

**Response**
```json
{
  "totalTokensSaved": 18420,
  "strategyCounts": {
    "PUBLIC": 14,
    "COOKIE": 32,
    "INTERCEPT": 5,
    "UI": 3,
    "LOCAL": 8
  },
  "adapterCount": 12,
  "driftEventCount": 7
}
```

---

## Healing

### `GET /healing`
List all drift events (most recent first), each including the related adapter.

**Response**
```json
[
  {
    "id": "clx...",
    "adapterId": "clx...",
    "adapter": { "siteName": "Hacker News", "commandName": "hackernews", ... },
    "detectedAt": "2026-08-22T08:00:00Z",
    "classification": "selector_drift",
    "status": "resolved",
    "resolvedAt": "2026-08-22T08:00:18Z",
    "diffSummary": "Target selector .btn-login not found in DOM"
  }
]
```

**DriftEvent status values:** `detected` | `healing` | `verifying` | `resolved` | `escalated`

---

### `POST /healing/trigger`
Trigger a simulated drift event for demo purposes. Picks a random adapter, creates a `DriftEvent`, and animates it through all stages over ~18 seconds.

**Response**
```json
{ "success": true }
```

---

## Tenants

### `GET /tenants`
List all tenants with their browser session profiles.

**Response**
```json
[
  {
    "id": "clx...",
    "name": "Acme Corp",
    "createdAt": "...",
    "profiles": [
      {
        "id": "clx...",
        "siteName": "Hacker News",
        "strategy": "COOKIE",
        "status": "active"
      }
    ]
  }
]
```

---

## Adapters

### `GET /adapters`
List all registered Webcmd site adapters.

**Response**
```json
[
  {
    "id": "clx...",
    "siteName": "Hacker News",
    "commandName": "hackernews",
    "version": 1,
    "strategy": "PUBLIC",
    "visibility": "built_in",
    "successRate": 0.98,
    "lastVerified": "2026-08-21T00:00:00Z"
  }
]
```

---

## WebSocket Events

Connect to: `http://localhost:3001`

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `subscribe_run` | `runId: string` | Join the room for a specific run |
| `subscribe_healing` | — | Join the global healing events room |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `run_started` | `Run` object | Emitted when a new run is created |
| `step_updated` | `RunStep` object | Emitted on every step status change |
| `step_log` | `{ stepId: string, log: string }` | Real-time stdout/stderr chunks from webcmd |
| `run_waiting_approval` | `{ runId, stepId }` | Run paused — approval required |
| `run_resumed` | `{ runId }` | Run resumed after approval |
| `run_completed` | `{ runId, status }` | Run finished (succeeded or failed) |
| `drift_detected` | `DriftEvent + Adapter` | New drift event detected |
| `drift_updated` | `{ id: string, status: string }` | Drift event moved to a new stage |
