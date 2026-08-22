# Contributing to OmniWeb

> [← Back to README](../README.md)

---

## Development Workflow

1. Fork and clone the repo
2. Follow the [Setup Guide](./SETUP.md) to get the stack running locally
3. Create a feature branch: `git checkout -b feat/my-feature`
4. Make your changes
5. Open a pull request with a clear description of what changed and why

---

## Monorepo Structure

```
omniweb/
├── apps/
│   ├── api/    ← Fastify backend (Node.js + TypeScript)
│   └── web/    ← React + Vite frontend (TypeScript)
├── docs/       ← Documentation
└── package.json  ← Workspace root
```

Run `npm install` from the root — npm workspaces will install all packages.

---

## Code Style

- **TypeScript everywhere** — no plain JS in `src/`
- **Zod for validation** — all API inputs and DSL schemas use Zod
- **No `any` unless necessary** — prefer typed interfaces
- **Framer Motion for animations** — not CSS `transition` alone for interactive elements
- **Socket.IO rooms for scoping** — never broadcast globally unless it's a fleet-wide event

---

## Adding a New Page

1. Create `apps/web/src/pages/MyPage.tsx`
2. Add a route in [`apps/web/src/App.tsx`](../apps/web/src/App.tsx)
3. Add a `<NavLink>` in [`apps/web/src/components/layout/Navbar.tsx`](../apps/web/src/components/layout/Navbar.tsx)
4. Add a `<FeatureCard>` on the Landing page if it's a top-level feature

---

## Adding a New API Endpoint

1. Add the handler in [`apps/api/src/routes.ts`](../apps/api/src/routes.ts)
2. Define input with a `z.object()` schema
3. Update [`docs/API.md`](./API.md) with the new endpoint
4. If it emits WebSocket events, document them in the table at the bottom of the API reference

---

## Database Changes

1. Edit [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma)
2. Run `npx prisma migrate dev --name describe_your_change`
3. Update [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) if the schema diagram changes
4. Update `apps/api/prisma/seed.ts` to include demo data for the new model

---

## Reporting Issues

Please include:
- Node.js and npm versions (`node -v`, `npm -v`)
- Docker version (`docker --version`)
- Webcmd version (`npx @agentrhq/webcmd --version`)
- The full error output
- Steps to reproduce
