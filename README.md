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
bun run studio:dev
bun run render-worker:dev
```

## AI Provider Environment

Configure these environment variables before using the Studio AI Workshop tab:

```bash
OPENROUTER_API_KEY=...
AI_GATEWAY_API_KEY=...
FAL_KEY=...
```

Optional:

```bash
VITE_RENDER_WORKER_URL=http://localhost:8788
```

## Logo Asset

Brand logo is copied from:
- `apps/web/public/lunchtable/logo.png`

into:
- `apps/studio/public/brand/logo.png`
