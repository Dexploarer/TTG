---
name: ltcg-theming
description: "LunchTable zine aesthetic - ink & paper design system, brand assets, CSS utilities, animation patterns. Use when building any UI component."
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# LunchTable Zine Theming System

The LunchTable aesthetic is **photocopied zine, not polished app**. Think: xeroxed punk flyers, raunchy school bathroom wall posters, edgy meme culture.

## Design Tokens

```css
:root {
  --radius: 0rem;                    /* NEVER round corners */
  --background: #fdfdfb;             /* Off-white paper */
  --foreground: #121212;             /* Ink black */
  --primary: #121212;                /* Ink black */
  --primary-foreground: #ffffff;
  --reputation: #ffcc00;             /* Yellow - rep/highlights */
  --stability: #33ccff;              /* Cyan - stability stat */
  --ink: #121212;                    /* Base ink color */
}
```

## Typography

```css
/* Import these fonts */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Special+Elite&display=swap");

/* Font families */
--font-heading: "Outfit", sans-serif;     /* Black weight, uppercase */
--font-body: "Inter", sans-serif;         /* Body text */
--font-special: "Special Elite", cursive; /* Typewriter/zine accents */

/* Heading rules */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  @apply font-black uppercase tracking-tighter;
}
```

## Shadow System

```css
--shadow-zine: 4px 4px 0px 0px rgba(18, 18, 18, 1);       /* Standard chunky */
--shadow-zine-lg: 8px 8px 0px 0px rgba(18, 18, 18, 1);    /* Large elements */
--shadow-zine-sm: 2px 2px 0px 0px rgba(18, 18, 18, 1);    /* Small elements */
--shadow-zine-glow: 0px 0px 20px 0px rgba(255, 204, 0, 0.3); /* Yellow rep glow */
```

## Border System

```css
--border-zine: 2px solid #121212;         /* Standard ink border */
--border-zine-thick: 4px solid #121212;   /* Heavy elements */
--border-zine-dashed: 2px dashed #121212; /* Dashed accent */
```

## CSS Utility Classes

### `.paper-panel` - Primary container
White background with dot grid + noise texture, chunky shadow, ink border.
Use for: cards, panels, modals, sections.

### `.tcg-button` - Standard button
White bg, ink border, chunky shadow. Lifts on hover (-translate), presses on active (+translate).
Font: heading font, uppercase, tracking-wider.

### `.tcg-button-primary` - Primary action button
Inverted: black bg, white text. Same shadow/border behavior.

### `.torn-paper-edge` - Ragged edge effect
Polygon clip-path that creates irregular top edge. Use on banners, headers, dividers.

### `.zine-border` - Ink border image
Uses `ink-border.png` as border-image for hand-drawn look. Use on feature cards, hero sections.

### `.ink-bleed` - Xerox bleed effect
SVG filter + contrast boost + text shadow. Use on headings and bold text.

### `.scanner-noise` - Photocopy overlay
Pseudo-element noise overlay at 6% opacity. Use on backgrounds and large panels.

### `.ink-wash` - Subtle ink gradient
135deg gradient with ink color. Use on backgrounds.

### `.ink-wash-reputation` - Yellow accent wash
135deg gradient with reputation yellow. Use on highlighted/reward sections.

## Animation Classes

```css
.animate-stat-boost    /* Float up + scale, 0.8s */
.animate-card-glow     /* Glow pulse, 1s */
.animate-card-flash    /* Quick flash, 0.6s */
.animate-card-shake    /* Horizontal shake, 0.5s */
.animate-effect-pulse  /* Continuous subtle pulse, 2s infinite */
```

## Component Patterns

### Card Component
```tsx
<div className="paper-panel relative group cursor-pointer">
  {/* Card art */}
  <div className="aspect-[2.5/3.5] bg-black/5 relative overflow-hidden">
    <img src={cardArt} className="w-full h-full object-cover" />
  </div>
  {/* Card name */}
  <h3 className="font-heading font-black uppercase text-sm tracking-tight px-2 py-1 truncate">
    {card.name}
  </h3>
  {/* Stats bar */}
  <div className="flex justify-between px-2 pb-1 text-xs font-bold">
    <span className="text-[var(--reputation)]">{card.attack}</span>
    <span className="text-[var(--stability)]">{card.defense}</span>
  </div>
</div>
```

### Panel/Section
```tsx
<section className="paper-panel p-6 scanner-noise">
  <h2 className="font-heading text-2xl mb-4 ink-bleed">{title}</h2>
  <div className="space-y-4">{children}</div>
</section>
```

### Button Pattern
```tsx
<button className="tcg-button">
  {label}
</button>

<button className="tcg-button-primary">
  {primaryAction}
</button>
```

## Archetype Colors

```typescript
const ARCHETYPE_THEMES = {
  dropouts:  { primary: "#ef4444", gradient: "from-red-500 to-red-700" },
  preps:     { primary: "#3b82f6", gradient: "from-blue-500 to-blue-700" },
  geeks:     { primary: "#eab308", gradient: "from-yellow-500 to-yellow-700" },
  freaks:    { primary: "#a855f7", gradient: "from-purple-500 to-purple-700" },
  nerds:     { primary: "#22c55e", gradient: "from-green-500 to-green-700" },
  goodies:   { primary: "#6b7280", gradient: "from-gray-400 to-gray-600" },
};
```

## Brand Assets Required

Copy from `/Users/home/Desktop/LTCG/apps/web/public/lunchtable/`:
- `paper-texture.png` (512px tile background)
- `ink-border.png` (border-image source)
- `ink-stain.png`
- `halftone-dots.png`
- `crushed-cigarette.png`
- `yellow-tape.png`
- `vices/*.png` (10 vice counter icons)
- `fx-*.png` (comic impact effects)

## Anti-Patterns

- **NO rounded corners** - radius is always 0
- **NO gradient backgrounds** on containers (use paper-panel)
- **NO thin/light fonts** for headings (always font-black)
- **NO clean/polished look** - add noise, torn edges, ink bleeds
- **NO generic sans-serif** - use the specific font stack
- **NO subtle shadows** - shadows are chunky and offset, never blurred
