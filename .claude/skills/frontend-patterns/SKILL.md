---
name: frontend-patterns
description: "Vite + React 19 + Tailwind 4 frontend patterns for LTCG. Use when building UI components, routes, or hooks."
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# LTCG Frontend Patterns

Vite 6 + React 19.2 + React Router 7 + Tailwind 4 + Zustand 5 + Framer Motion 12.

## Project Structure

```
apps/web/
├── index.html                 # Entry HTML
├── vite.config.ts             # Vite + React + Tailwind plugins
├── package.json               # elizaos app metadata included
├── tsconfig.json
├── public/
│   └── lunchtable/            # Brand assets
└── src/
    ├── main.tsx               # React root + ConvexProvider
    ├── App.tsx                # BrowserRouter + Routes
    ├── globals.css            # Full zine theming
    ├── lib/
    │   ├── utils.ts           # cn() utility
    │   ├── convexHelpers.ts   # TS2589-safe Convex hooks
    │   ├── archetypeThemes.ts # Archetype color system
    │   └── iframe.ts          # milaidy postMessage protocol
    ├── hooks/
    │   └── useIframeMode.ts   # iframe detection + auth
    ├── stores/                # Zustand stores
    ├── pages/                 # Route page components
    │   ├── Home.tsx
    │   └── embed/             # Chromeless embed pages
    └── components/
        ├── ui/                # Radix primitives (shadcn pattern)
        ├── game/              # Game board components
        ├── collection/        # Card binder
        ├── story/             # Story mode
        ├── auth/              # Privy auth
        ├── streaming/         # retake.tv iframe
        └── layout/            # Nav, sidebar
```

## Routing (React Router 7)

```tsx
import { BrowserRouter, Routes, Route } from "react-router";

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/play/:matchId" element={<Play />} />
    <Route path="/collection" element={<Collection />} />
    <Route path="/decks" element={<Decks />} />
    <Route path="/story" element={<Story />} />
    <Route path="/story/:chapterId" element={<StoryChapter />} />
    <Route path="/profile/:playerId" element={<Profile />} />
    {/* Embed routes - no layout chrome */}
    <Route path="/embed/play" element={<EmbedPlay />} />
    <Route path="/embed/stream/:streamId" element={<EmbedStream />} />
  </Routes>
</BrowserRouter>
```

## Convex Integration

```typescript
// ALWAYS use helpers - never import from convex/react directly
import { apiAny, useConvexQuery, useConvexMutation } from "@/lib/convexHelpers";

function useUserDecks() {
  return useConvexQuery(apiAny.game.getUserDecks);
}

function useCreateDeck() {
  return useConvexMutation(apiAny.game.createDeck);
}
```

## Zustand Store Pattern

```typescript
import { create } from "zustand";

interface GameUIStore {
  selectedCard: string | null;
  selectCard: (id: string | null) => void;
  targetingMode: boolean;
  setTargetingMode: (mode: boolean) => void;
}

export const useGameUIStore = create<GameUIStore>((set) => ({
  selectedCard: null,
  selectCard: (id) => set({ selectedCard: id }),
  targetingMode: false,
  setTargetingMode: (mode) => set({ targetingMode: mode }),
}));
```

## cn() Utility

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Framer Motion Patterns

```tsx
import { motion, AnimatePresence } from "framer-motion";

// Card hover
<motion.div
  whileHover={{ y: -8, scale: 1.02 }}
  transition={{ type: "spring", stiffness: 300 }}
>

// Card play animation
<motion.div
  initial={{ y: 100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -50, opacity: 0, scale: 0.8 }}
/>
```

## Radix UI + Zine Styling

```tsx
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Content className="paper-panel p-6 max-w-md mx-auto">
  <Dialog.Title className="font-heading text-xl uppercase tracking-tight">
    {title}
  </Dialog.Title>
  {children}
</Dialog.Content>
```

## milaidy iframe Integration

```typescript
import { useIframeMode } from "@/hooks/useIframeMode";

function MyComponent() {
  const { isEmbedded, authToken, agentId } = useIframeMode();

  // Adapt UI for embedded mode
  if (isEmbedded) {
    // No sidebar, no header, fullscreen game
  }
}
```

## Vite Path Aliases

```typescript
// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}

// Usage
import { cn } from "@/lib/utils";
import { useIframeMode } from "@/hooks/useIframeMode";
```

## File Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Pages: `PascalCase.tsx`
- Stores: `camelCaseStore.ts`

## Key Libraries

| Library | Version | Usage |
|---------|---------|-------|
| `react-router` | 7.6 | Client-side routing |
| `zustand` | 5.0 | Client state |
| `framer-motion` | 12.29 | Animations |
| `lucide-react` | latest | Icons |
| `sonner` | latest | Toast notifications |
| `convex` | 1.31 | Real-time data (via helpers) |
| `@privy-io/react-auth` | 3.12 | Auth |

## Dev Server

```bash
bun run dev:web    # Vite on port 3334
```

Port 3334 matches the milaidy `launchUrl` in package.json.
