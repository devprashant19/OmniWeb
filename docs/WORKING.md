# How OmniWeb Works

> [← Back to README](../README.md)

This document explains the internal mechanics of the three most important subsystems: the **Workflow Execution Engine**, the **Self-Healing Loop**, and the **Webcmd Strategy Picker**.

---

## 1. Workflow Execution Engine

### DSL Format

Workflows are written in YAML and parsed at runtime using a Zod schema. The DSL supports four node types:

```yaml
name: my-workflow
steps:
  # 1. run — executes a webcmd command
  - id: fetch_hn
    run: webcmd hackernews top -f plain

  # 2. if — conditional branch (evaluates a JS-style expression)
  - id: check_count
    if: "steps.fetch_hn.count > 10"
    run: webcmd hackernews ask -f plain

  # 3. approve — pauses execution until a human approves via the UI
  - id: human_gate
    approve:
      role: eng-manager
      timeout: 2h

  # 4. retry — wraps a step with retry logic
  - id: robust_fetch
    run: webcmd gdg team -f plain
    retry:
      attempts: 3
      backoff: exponential
    on_fail: heal_then_retry
```

### Parsing Pipeline

```
Raw YAML string
    │
    ▼ YAML.parse()  (js-yaml)
Plain JS object
    │
    ▼ WorkflowSchema.parse()  (Zod)
Validated WorkflowDSL  ─── throws ZodError if invalid
    │
    ▼ stored as JSON blob in Workflow.dsl (Postgres)
```

**File:** [`apps/api/src/workflowParser.ts`](../apps/api/src/workflowParser.ts)

---

### Execution Loop

When a workflow run is triggered, the engine processes steps **sequentially**. Each step:

1. Creates a `RunStep` record in Postgres
2. Emits `step_updated` over WebSocket so the frontend highlights it
3. Spawns the webcmd process via `child_process.spawn`
4. Pipes real-time `stdout`/`stderr` to the browser via `step_log` events
5. Marks the step `succeeded` or `failed` on process exit
6. Increments the cumulative token savings counter

**Pausing for approval:**

When an `approve` step is reached, the engine:
- Emits `run_waiting_approval` with the `stepId`
- Returns (suspends) — the loop does **not** continue
- Resumes only when `POST /api/runs/:id/approve` is called with the `stepId`
- `resumeWorkflow()` picks up from the next step index

**File:** [`apps/api/src/mockEngine.ts`](../apps/api/src/mockEngine.ts)

---

### Token Savings Counter

Each successfully completed `webcmd` step contributes to `Run.costTokensSaved`. This metric represents the approximate number of LLM tokens saved by routing through a deterministic CLI command instead of a raw browser-replay session.

The current formula (demo): `rand(100, 600)` per step. In production this would be measured against a baseline cost model.

---

## 2. The Self-Healing Pipeline

OmniWeb monitors registered adapters for **selector drift** — the condition where a site's DOM changes and the pre-recorded webcmd command can no longer locate its target elements.

### Healing Lifecycle

```
         ┌─────────────────┐
         │    DETECTED     │  ← DOM diff detected / test run failed
         └────────┬────────┘
                  │ ~4s
                  ▼
         ┌─────────────────┐
         │    DIAGNOSING   │  ← LLM analyzes diff, suggests new selectors
         │    & REPAIRING  │
         └────────┬────────┘
                  │ ~6s
                  ▼
         ┌─────────────────┐
         │   VERIFYING     │  ← New selectors tested on canary environment
         │   (Canary)      │
         └────────┬────────┘
                  │ ~8s
                  ├─── Pass ──▶ RESOLVED  (adapter updated, promoted)
                  └─── Fail ──▶ ESCALATED (human review required)
```

### What triggers a drift event?

| Classification | Description |
|---|---|
| `selector_drift` | A CSS selector or XPath that webcmd relies on has changed |
| `auth_expired` | The stored cookie profile is no longer valid |
| `site_redesign` | Major layout change requiring full adapter re-training |
| `rate_limited` | The site is blocking requests and the adapter needs a strategy upgrade |
| `unknown` | Unclassified failure, flagged for human review |

### WebSocket Events during Healing

```
trigger → drift_detected  → (Kanban card appears in "Detected" column)
       → drift_updated { status: 'healing' }   → card moves to "Diagnosing"
       → drift_updated { status: 'verifying' } → card moves to "Verifying"
       → drift_updated { status: 'resolved' }  → card moves to "Resolved"
```

All transitions are animated in real-time using **Framer Motion** `AnimatePresence` + `layout` prop.

---

## 3. Webcmd Strategy Picker

Webcmd selects the cheapest reliable strategy for each command automatically. OmniWeb reads the `strategy` field from the `Adapter` model to indicate which strategy was chosen:

| Strategy | Description | Cost | Reliability |
|---|---|---|---|
| `PUBLIC` | Hits a public API or RSS endpoint — no auth needed | Very Low | High |
| `COOKIE` | Replays a stored browser session using saved cookies | Low | High |
| `INTERCEPT` | Intercepts network requests made by the page | Medium | Medium |
| `UI` | Full browser automation (Playwright) — pixel-perfect but brittle | High | Low |
| `LOCAL` | Invokes a locally installed binary (e.g. `gh`, `docker`) | Very Low | Very High |

OmniWeb's Observatory page visualizes the distribution of strategies across all run steps, helping operators identify which adapters are relying on expensive `UI` automation and should be upgraded.

---

## 4. Multi-Tenant Isolation

Each `Tenant` gets:
- A separate namespace of `Profile` records — encrypted browser sessions with per-site strategy assignments
- Isolated `Workflow` and `Run` records
- A compute quota (tracked via `maxConcurrentWorkers` + `monthlyRunLimit`)
- A secrets vault (API keys stored encrypted, surfaced as environment variables during `webcmd` execution)

The `Profile` model tracks session health:

| Status | Meaning |
|---|---|
| `active` | Cookie jar is valid — commands can run |
| `expired` | Session has expired — needs a re-auth run |
| `needs_reauth` | Auth flow changed — manual re-auth required |

---

## 5. Real-Time Communication

OmniWeb uses **Socket.IO** rooms to scope broadcasts:

- `run_<runId>` — all events for a specific workflow run
- `healing_events` — all drift detection and healing events (global broadcast)

Clients subscribe by emitting `subscribe_run` or `subscribe_healing` from the frontend.

**File:** [`apps/api/src/socket.ts`](../apps/api/src/socket.ts)
