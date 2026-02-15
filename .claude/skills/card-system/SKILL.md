---
name: card-system
description: "LTCG card definitions, archetypes, abilities, and data format. Use when working with card data, balancing, or card-related UI."
allowed-tools: [Read, Glob, Grep]
---

# LTCG Card System

132 unique cards across 6 archetypes. Data lives in `convex/cardData.ts`.

## Archetypes (6)

| Archetype | Cards | Color | Playstyle |
|-----------|-------|-------|-----------|
| Dropouts | 22 | Red | Aggro, burn, self-destruct for big damage |
| Preps | 22 | Blue | Midrange, reputation buffs, social warfare |
| Geeks | 22 | Yellow | Combo, tech effects, draw engines |
| Freaks | 22 | Purple | Chaos, random effects, opponent disruption |
| Nerds | 22 | Green | Control, high defense, grind advantage |
| Goodies | 22 | White/Gray | Attrition, healing, removal, stall |

## Cards Per Archetype

| Type | Count | Total |
|------|-------|-------|
| Stereotype (monster) | 5 | 30 |
| Spell | 8 | 48 |
| Trap | 6 | 36 |
| Environment | 3 | 18 |
| **Total** | **22** | **132** |

## Card Definition Format

```typescript
{
  name: string,                    // "Crypto All-In Carl"
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary",
  archetype: "dropouts" | "preps" | "geeks" | "freaks" | "nerds" | "goodies",
  cardType: "stereotype" | "spell" | "trap",
  cost: number,                    // Mana/summon cost
  level?: number,                  // Monster level (1-12+)
  attack?: number,                 // Monster attack stat
  defense?: number,                // Monster defense stat
  attribute?: string,              // Element/theme tag
  ability?: CardAbility[],         // Effect definitions
  description?: string,            // Flavor/rules text
}
```

## Ability/Effect Format

```typescript
interface CardAbility {
  trigger: string,     // When the effect activates
  speed: number,       // Chain speed (1 = spell speed, 2 = trap speed)
  targets: string[],   // What it can target
  operations: string[], // What it does
}
```

### Common Triggers
- `OnSummon` - When this card is summoned
- `OnSpellPlayed` - When a spell is played
- `OnStabilityZero` - When a monster's stability hits 0
- `OnDestroy` - When this card is destroyed
- `Manual` - Activated by player choice
- `OnDraw` - When drawn from deck

### Common Operations
- `DESTROY: target` - Destroy a card
- `MODIFY_STAT: stat +/-amount` - Boost/reduce attack or defense
- `DRAW: count` - Draw cards
- `DAMAGE: amount` - Deal direct damage
- `HEAL: amount` - Restore life points
- `ADD_VICE: count` - Add vice counters
- `REMOVE_VICE: count` - Remove vice counters
- `SPECIAL_SUMMON: from` - Special summon from location
- `BANISH: target` - Remove from game
- `RETURN_TO_HAND: target` - Bounce to hand

## Example Cards

### Dropout: Crypto All-In Carl (Rare)
```json
{
  "name": "Crypto All-In Carl",
  "rarity": "rare",
  "archetype": "dropouts",
  "cardType": "stereotype",
  "cost": 1, "level": 6,
  "attack": 2000, "defense": 1000,
  "attribute": "Crypto",
  "ability": [
    { "trigger": "OnSpellPlayed", "speed": 1, "targets": ["self"],
      "operations": ["MODIFY_STAT: reputation +300"] },
    { "trigger": "OnStabilityZero", "speed": 1, "targets": ["self", "alliedStereotypes"],
      "operations": ["DESTROY: alliedStereotypes", "MODIFY_STAT: reputation +1500"] }
  ]
}
```

## Starter Decks (6)

Each archetype has a starter deck. Defined in `convex/cardData.ts` as `STARTER_DECKS`.

| Deck Name | Archetype | Strategy |
|-----------|-----------|----------|
| Dropout Gang | Dropouts | Aggro/burn |
| Geek Squad | Geeks | Combo/draw |
| Mixed Lunch | Mixed | Balanced |
| Prep Rally | Preps | Midrange |
| Nerd Herd | Nerds | Control |
| Freak Show | Freaks | Chaos |

## Vice Mechanic (Unique)

Vice counters accumulate on monsters. At `breakdownThreshold` (default: 5), the monster "breaks down" - triggering special effects.

Vice types match the `vices/` brand assets:
- Adderall, Alcohol, Conspiracy, Crypto, Gambling
- MLM, Narcissism, Rage, Social Media, Validation

## Working with Card Data

### Reading definitions
```typescript
// All cards loaded in convex/cardData.ts as CARD_DEFINITIONS
// Seeded to Convex via convex/seed.ts -> seedAll()
```

### Card lookup in engine
```typescript
// Engine uses cardLookup: Record<string, CardDefinition>
// Keys are card IDs, values are full definitions
const card = state.cardLookup[cardId];
```

### Frontend card display
```typescript
// Use archetype themes for visual styling
import { getArchetypeTheme } from "@/lib/archetypeThemes";
const theme = getArchetypeTheme(card.archetype);
// Returns: { primary, gradient, icon, borderColor, glowColor }
```
