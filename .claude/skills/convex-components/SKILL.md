---
name: convex-components
description: "White-label Convex component patterns for LTCG - cards, match, and story components. Use when working with backend data or component APIs."
allowed-tools: [Read, Glob, Grep, Write, Edit]
---

# LTCG White-Label Convex Components

Three Convex components provide the backend. The host app at `convex/` orchestrates them via `convex/game.ts`.

## Architecture

```
convex/convex.config.ts
├── app.use(ltcgCards)    -> packages/lunchtable-tcg-cards/
├── app.use(ltcgMatch)    -> packages/lunchtable-tcg-match/
└── app.use(ltcgStory)    -> packages/lunchtable-tcg-story/
```

## Host Layer (`convex/game.ts`)

All frontend calls go through `convex/game.ts`. Components are never called directly from the client.

### Card Queries
```typescript
api.game.getAllCards          // -> LTCGCards.cards.getAllCards()
api.game.getUserCards(userId) // -> LTCGCards.cards.getUserCards()
api.game.getUserDecks(userId) // -> LTCGCards.decks.getUserDecks()
api.game.getDeckWithCards(deckId) // -> deck + card definitions
```

### Deck Mutations
```typescript
api.game.createDeck(name)
api.game.saveDeck(deckId, cardIds)
api.game.setActiveDeck(deckId)
api.game.selectStarterDeck(deckCode)
```

### Story Queries
```typescript
api.game.getChapters()
api.game.getChapterStages(chapterId)
api.game.getStoryProgress()
api.game.getStageProgress(stageId)
```

### Match Flow
```typescript
api.game.startStoryBattle(stageId)    // Creates match, starts with initial state
api.game.submitAction(matchId, command, seat)  // Player action -> engine decide/evolve
api.game.getPlayerView(matchId, seat) // Masked game state
api.game.getMatchMeta(matchId)        // Match metadata
api.game.getRecentEvents(matchId, sinceVersion) // Event log for replays
```

## Cards Component

**Package**: `@lunchtable-tcg/cards`
**Client**: `LTCGCards` class

### Tables (6)
| Table | Purpose |
|-------|---------|
| `cardDefinitions` | Card templates (132 cards) |
| `playerCards` | User inventory (with variants, serials) |
| `userDecks` | Deck metadata |
| `deckCards` | Deck contents (card -> deck mapping) |
| `starterDeckDefinitions` | 6 predefined starter decks |
| `numberedCardRegistry` | Limited edition tracking |

### Client API
```typescript
const cards = new LTCGCards(component);

// Card queries
cards.cards.getAllCards(ctx)
cards.cards.getUserCards(ctx, { userId })
cards.cards.addCardsToInventory(ctx, { userId, cards: [...] })

// Deck operations
cards.decks.getUserDecks(ctx, { userId })
cards.decks.createDeck(ctx, { userId, name })
cards.decks.saveDeck(ctx, { deckId, cards: [...] })
cards.decks.selectStarterDeck(ctx, { userId, deckCode, starterCards })

// Seeding
cards.seeds.seedCardDefinitions(ctx, { cards: [...] })
cards.seeds.seedStarterDecks(ctx, { decks: [...] })
```

## Match Component

**Package**: `@lunchtable-tcg/match`
**Client**: `LTCGMatch` class

### Tables (4)
| Table | Purpose |
|-------|---------|
| `matches` | Match metadata (status, players, winner) |
| `matchSnapshots` | Current game state (source of truth) |
| `matchEvents` | Append-only event log |
| `matchPrompts` | Pending decisions (chain responses) |

### Client API
```typescript
const match = new LTCGMatch(component);

// Lifecycle
match.createMatch(ctx, { hostId, awayId, mode, hostDeck, awayDeck, isAIOpponent })
match.startMatch(ctx, { matchId, initialState })
match.submitAction(ctx, { matchId, command, seat })

// Queries
match.getPlayerView(ctx, { matchId, seat })
match.getMatchMeta(ctx, { matchId })
match.getRecentEvents(ctx, { matchId, sinceVersion })
match.getOpenPrompt(ctx, { matchId, seat })
```

### Event Sourcing Pattern
```
1. submitAction(command) ->
2. Load latest snapshot ->
3. engine.decide(state, command, seat) -> events
4. engine.evolve(state, events) -> newState
5. Store new snapshot + append events
6. If AI opponent, schedule AI turn (500ms delay)
```

## Story Component

**Package**: `@lunchtable-tcg/story`
**Client**: `LTCGStory` class

### Tables (5)
| Table | Purpose |
|-------|---------|
| `storyChapters` | Chapter definitions |
| `storyStages` | Stage definitions (per chapter) |
| `storyProgress` | User chapter progress |
| `storyStageProgress` | User stage-level progress |
| `storyBattleAttempts` | Battle history |

### Client API
```typescript
const story = new LTCGStory(component);

// Content
story.chapters.getChapters(ctx, { actNumber?, status? })
story.chapters.getChapter(ctx, chapterId)
story.stages.getStages(ctx, chapterId)
story.stages.getStage(ctx, stageId)

// Progress
story.progress.getProgress(ctx, { userId })
story.progress.getStageProgress(ctx, { userId, stageId? })
story.progress.upsertProgress(ctx, { userId, chapterId, ... })
story.progress.recordBattleAttempt(ctx, { userId, stageId, ... })

// Seeding
story.seeds.seedChapters(ctx, { chapters })
story.seeds.seedStages(ctx, { stages })
```

## Adding New Convex Functions

When adding to `convex/game.ts`:

1. Use the component clients (already instantiated)
2. Always auth-gate with `getUser(ctx)`
3. Return serializable data
4. Use `internalMutation` for scheduled/internal work

```typescript
// Pattern for new query
export const myNewQuery = query({
  args: { ... },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ltcgCards.someMethod(ctx, { userId: user._id, ...args });
  },
});
```

## Type Safety

All component clients use `as any` casts internally due to cross-component type boundaries. This is expected and safe - the Convex runtime validates types at the function boundary.

Don't try to fix the `as any` casts in component client code.
