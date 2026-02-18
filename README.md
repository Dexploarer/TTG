# Gambit Premier TCG Generator

A from-scratch vertical slice for a high-fidelity trading card generator:
- template-driven card rendering
- event-driven dynamic stat updates
- CSV import with validation and diff preview
- Convex-shaped API surface
- AI-assisted copy + art flow (OpenRouter, Vercel AI Gateway, FAL, Vercel AI SDK)
- deterministic PNG + JSON manifest export

## Workspace Layout

- `apps/studio` - Browser editor and simulator UI
- `apps/render-worker` - Headless export worker API
- `packages/template-schema` - Shared template/card schema + validation
- `packages/effect-engine` - Declarative DSL and runtime projection
- `packages/csv-pipeline` - CSV parse/validate/diff pipeline
- `packages/card-renderer` - Render model binding + preview composition
- `packages/ai-orchestrator` - AI provider orchestration and prompt contracts
- `convex` - Convex API contracts and in-memory implementation for dev/tests

## Quick Start

```bash
bun install
bun run test
bun run convex:dev
# In another terminal, set VITE_CONVEX_URL + VITE_RENDER_WORKER_URL for Studio
bun run studio:dev
# In another terminal, set CONVEX_URL (or VITE_CONVEX_URL) for the render-worker daemon
bun run render-worker:dev
```

### Required Env (Local Dev)

Studio (`/Users/home/gambit/Gambit/apps/studio/.env.local`):

```bash
VITE_CONVEX_URL=...
VITE_RENDER_WORKER_URL=http://localhost:8788
```

Render-worker daemon (any `.env.local` that `apps/render-worker` can read, e.g. `/Users/home/gambit/Gambit/.env.local`):

```bash
CONVEX_URL=...
```

## AI Provider Environment

Configure these environment variables before using the Studio AI Workshop tab:

```bash
OPENROUTER_API_KEY=...
AI_GATEWAY_API_KEY=...
FAL_KEY=...
```

## Logo Asset

Brand logo is copied from:
- `apps/web/public/lunchtable/logo.png`

into:
- `apps/studio/public/brand/logo.png`
