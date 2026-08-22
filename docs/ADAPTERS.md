# Adapter Guide — OmniWeb

> [← Back to README](../README.md)

OmniWeb orchestrates **Webcmd adapters** — deterministic CLI surfaces built on top of websites. This document explains how adapters are registered, used inside workflows, and what happens when they break.

---

## What is a Webcmd Adapter?

A Webcmd adapter turns any website into a CLI command. Instead of writing a custom scraper, you record one interaction with a site and Webcmd produces a replayable, versioned command.

```bash
# Examples of real installed adapters
webcmd hackernews top           # Fetch top stories
webcmd hackernews search "AI"   # Search stories
webcmd gdg team                 # List GDG NITH team
webcmd ycombinator jobs         # YC job board
webcmd pubmed search "RAG"      # PubMed research search
```

Webcmd automatically picks the cheapest strategy for each command:

```
PUBLIC → COOKIE → INTERCEPT → UI → LOCAL
```

---

## Adapter Strategies

| Strategy | How it works | When it's used |
|---|---|---|
| **PUBLIC** | Calls a public API or RSS feed directly | Site exposes a stable public endpoint |
| **COOKIE** | Replays a stored browser session via saved cookies | Site requires login but has stable DOM |
| **INTERCEPT** | Intercepts XHR/fetch requests the page makes | Site loads data dynamically via API calls |
| **UI** | Full Playwright browser automation | No other strategy works; site is complex |
| **LOCAL** | Invokes a locally installed binary (gh, docker, etc.) | Local tools like GitHub CLI |

OmniWeb stores the resolved `strategy` on each `RunStep` so you can audit which strategy was used in every execution.

---

## Adapters in Workflows

Reference any installed webcmd adapter using the `run:` step type in the DSL:

```yaml
name: my-automation
steps:
  - id: top_stories
    run: webcmd hackernews top -f plain

  - id: gdg_members
    run: webcmd gdg team -f json

  - id: search_pubmed
    run: webcmd pubmed search "large language models" -f md
```

### Output Formats

All webcmd commands support the `-f` / `--format` flag:

| Format | Flag | Best for |
|---|---|---|
| Table | `-f table` (default) | Terminal display |
| Plain text | `-f plain` | Simple logging |
| JSON | `-f json` | Programmatic processing |
| YAML | `-f yaml` | Config-style output |
| Markdown | `-f md` | Report generation |
| CSV | `-f csv` | Spreadsheet export |

---

## Built-in Adapters (Installed by Default)

| Adapter | Commands | Strategy | Notes |
|---|---|---|---|
| `hackernews` | `top`, `best`, `new`, `ask`, `show`, `jobs`, `read`, `search`, `user` | PUBLIC | Uses the official HN Firebase API |
| `gdg` | `team` | PUBLIC | GDG NITH chapter team members |
| `ycombinator` | — | PUBLIC | Y Combinator content |
| `pubmed` | `search` | PUBLIC | PubMed research database |
| `web` | `sample` | UI | Generic web page sampling |

---

## External CLIs (via `webcmd external`)

OmniWeb also supports Webcmd's external CLI integration. These wrap existing installed tools:

| CLI | webcmd alias | Underlying tool |
|---|---|---|
| GitHub | `gh` | `gh` CLI |
| Docker | `docker` | Docker CLI |
| Vercel | `vercel` | Vercel CLI |
| Notion | `ntn` | notion-cli |
| Discord | `discord` | discord-cli |
| Telegram | `tg` | tg-cli |
| Lark | `lark-cli` | Lark CLI |
| Obsidian | `obsidian` | Obsidian CLI |
| Cloudflare | `wrangler` | Wrangler CLI |

---

## Registering a New Adapter in OmniWeb

To make a new adapter available in the OmniWeb Marketplace, insert an `Adapter` record via Prisma:

```typescript
await prisma.adapter.create({
  data: {
    siteName: 'My Site',
    commandName: 'mysite',
    strategy: 'COOKIE',
    visibility: 'private',      // 'built_in' | 'private' | 'plugin'
    successRate: 1.0,
  }
});
```

Or via the Seed script in [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts).

---

## Adapter Health & Drift

OmniWeb continuously monitors adapter health. A `DriftEvent` is created when:

- A scheduled smoke test run fails
- `webcmd verify <adapter>` returns a non-zero exit code
- A run step using the adapter fails 3 times in a row

### DriftEvent Classifications

| Classification | Root Cause | Typical Fix |
|---|---|---|
| `selector_drift` | Site changed its DOM structure | Update CSS selectors via `webcmd site` commands |
| `auth_expired` | Stored cookies have expired | Re-run the auth flow with `webcmd profile use` |
| `site_redesign` | Full layout overhaul | Re-record adapter from scratch |
| `rate_limited` | Too many requests | Add delay or switch to a less frequent trigger |
| `unknown` | Unclassified — needs human review | Check `diffSummary` in the event record |

---

## Verifying an Adapter

```bash
# Validate adapter definition
webcmd validate hackernews

# Validate + smoke test (makes real network calls)
webcmd verify hackernews

# Inspect adapter path on disk
webcmd adapter path hackernews

# Check adapter status
webcmd adapter status hackernews
```

---

## Creating a Custom Adapter

Webcmd provides a guided flow for recording new adapters:

```bash
# Start the site recording wizard
webcmd site endpoint https://example.com

# Add a new command to an existing adapter
webcmd site note hackernews "Tried --limit flag, works up to 500"

# Create a plugin adapter for distribution
webcmd plugin create my-adapter
```

Once created, register it in OmniWeb's database and it will appear in the Marketplace.
