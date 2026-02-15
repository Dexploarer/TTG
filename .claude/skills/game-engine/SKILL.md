---
name: game-engine
description: "LTCG game engine API reference - pure TypeScript card game engine with phases, commands, events, and state management. Use when working with game logic."
allowed-tools: [Read, Glob, Grep]
---

# LTCG Game Engine Reference

Pure TypeScript engine at `packages/engine/`. Zero dependencies, runs anywhere.

## Core API

```typescript
import {
  createEngine,        // High-level: returns stateful engine instance
  createInitialState,  // Create initial GameState from cards + config
  decide,              // Validate command -> returns events (or throws)
  evolve,              // Apply events to state -> new state
  mask,                // GameState -> PlayerView (hide opponent info)
  legalMoves,          // GameState + seat -> valid Command[]
} from "@lunchtable-tcg/engine";
```

### `createEngine(options)`
Returns a stateful engine wrapping the functional API.
```typescript
const engine = createEngine({
  cardLookup: Record<string, CardDefinition>,
  config?: Partial<EngineConfig>,
  hostId: string,
  awayId: string,
  hostDeckIds: string[],
  awayDeckIds: string[],
});
```

### `createInitialState(cardLookup, config, hostId, awayId, hostDeckIds, awayDeckIds)`
Returns initial `GameState` with shuffled decks and drawn hands.

### `decide(state, command, seat): EngineEvent[]`
Validates a command against the current state. Returns events if valid, throws if illegal.

### `evolve(state, events): GameState`
Applies events to produce new state. Pure function, no side effects.

### `mask(state, seat): PlayerView`
Returns a view of the state for a specific player. Hides opponent's hand (shows count only).

### `legalMoves(state, seat): Command[]`
Returns all valid commands for a player in the current state. Use for AI decision-making.

## Game Phases

```
draw -> standby -> main -> combat -> main2 -> breakdown_check -> end
```

## Command Types

```typescript
type Command =
  | { type: "SUMMON"; cardId: string; position: Position; tributeCardIds?: string[] }
  | { type: "SET_MONSTER"; cardId: string }
  | { type: "FLIP_SUMMON"; cardId: string }
  | { type: "CHANGE_POSITION"; cardId: string }
  | { type: "SET_SPELL_TRAP"; cardId: string }
  | { type: "ACTIVATE_SPELL"; cardId: string; targets?: string[] }
  | { type: "ACTIVATE_TRAP"; cardId: string; targets?: string[] }
  | { type: "ACTIVATE_EFFECT"; cardId: string; effectIndex: number; targets?: string[] }
  | { type: "DECLARE_ATTACK"; attackerId: string; targetId?: string }
  | { type: "ADVANCE_PHASE" }
  | { type: "END_TURN" }
  | { type: "CHAIN_RESPONSE"; cardId?: string; pass: boolean }
  | { type: "SURRENDER" };

type Position = "attack" | "defense";
type Seat = "host" | "away";
```

## GameState Shape

```typescript
interface GameState {
  config: EngineConfig;
  cardLookup: Record<string, CardDefinition>;
  hostId: string; awayId: string;

  // Per-player zones
  [host|away]Hand: string[];           // Card IDs in hand
  [host|away]Board: BoardCard[];       // Monsters on field
  [host|away]SpellTrapZone: SpellTrapCard[];
  [host|away]FieldSpell: SpellTrapCard | null;
  [host|away]Deck: string[];
  [host|away]Graveyard: string[];
  [host|away]Banished: string[];

  // Stats
  [host|away]LifePoints: number;
  [host|away]BreakdownsCaused: number;

  // Turn tracking
  currentTurnPlayer: Seat;
  turnNumber: number;
  currentPhase: Phase;
  [host|away]NormalSummonedThisTurn: boolean;

  // Chain system
  currentChain: ChainLink[];
  currentPriorityPlayer: Seat | null;
  pendingAction: PendingAction | null;

  // Modifiers
  temporaryModifiers: TemporaryModifier[];
  lingeringEffects: LingeringEffect[];

  // Win condition
  winner: Seat | null;
  winReason: WinReason | null;  // "lp_zero" | "deck_out" | "breakdown" | "surrender"
  gameOver: boolean;
}
```

## PlayerView (Masked State)

```typescript
interface PlayerView {
  hand: string[];
  board: BoardCard[];
  spellTrapZone: SpellTrapCard[];
  fieldSpell: SpellTrapCard | null;
  graveyard: string[]; banished: string[];
  lifePoints: number; deckCount: number;

  // Opponent info (limited)
  opponentHandCount: number;           // Only count, not IDs
  opponentBoard: BoardCard[];          // Visible
  opponentSpellTrapZone: SpellTrapCard[];
  opponentGraveyard: string[];
  opponentLifePoints: number;
  opponentDeckCount: number;

  // Shared state
  currentTurnPlayer: Seat;
  turnNumber: number;
  currentPhase: Phase;
  currentChain: ChainLink[];
  mySeat: Seat;
  gameOver: boolean;
  winner: Seat | null;
}
```

## BoardCard & SpellTrapCard

```typescript
interface BoardCard {
  cardId: string;
  definitionId: string;
  position: "attack" | "defense";
  faceDown: boolean;
  canAttack: boolean;
  hasAttackedThisTurn: boolean;
  changedPositionThisTurn: boolean;
  viceCounters: number;
  temporaryBoosts: { attack: number; defense: number };
  equippedCards: string[];
  turnSummoned: number;
}

interface SpellTrapCard {
  cardId: string;
  definitionId: string;
  faceDown: boolean;
  activated: boolean;
  isFieldSpell?: boolean;
}
```

## Engine Config

```typescript
interface EngineConfig {
  startingLifePoints: number;      // Default: 8000
  startingHandSize: number;        // Default: 5
  maxHandSize: number;             // Default: 7
  maxBoardSize: number;            // Default: 5
  maxSpellTrapZoneSize: number;    // Default: 5
  breakdownThreshold: number;      // Default: 5 (vice counters to breakdown)
  deckMinSize: number;             // Default: 30
  deckMaxSize: number;             // Default: 40
}
```

## Card Definition

```typescript
interface CardDefinition {
  id: string;
  name: string;
  cardType: "stereotype" | "spell" | "trap";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  archetype: string;
  cost: number;
  level?: number;
  attack?: number;
  defense?: number;
  attribute?: string;
  ability?: CardAbility[];
  description?: string;
}
```

## Testing

```bash
bun run test              # Watch mode
bun run test:once         # Single run
```

Test files: `packages/engine/src/__tests__/`
- `engine.test.ts`, `combat.test.ts`, `summoning.test.ts`
- `spellsTraps.test.ts`, `phases.test.ts`, `vice.test.ts`
- `cards.test.ts`, `cardSet.test.ts`, `loader.test.ts`
- `stateBasedActions.test.ts`, `integration.test.ts`

## Rules Modules

```
packages/engine/src/rules/
├── combat.ts            # Attack declaration, damage calc
├── summoning.ts         # Normal/tribute/flip/set summon
├── spellsTraps.ts       # Spell/trap activation, chain
├── stateBasedActions.ts # Draw, win conditions, cleanup
├── vice.ts              # Vice counters, breakdown mechanic
├── phases.ts            # Phase transitions, turn flow
└── index.ts
```
