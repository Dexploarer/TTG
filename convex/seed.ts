import { mutation } from "./_generated/server";
import { createInitialRuntimeState } from "@gambit/effect-engine";
import type { CardDefinition, CardTemplateManifest, OverlayRule } from "@gambit/template-schema";
import { nowTs } from "./_helpers";

function svgDataUri(label: string, width = 744, height = 440): string {
  const safe = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#d6c7b3"/><stop offset="1" stop-color="#f7f1e8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="42" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#1a1a1a">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function baseOverlays(): Record<string, OverlayRule[]> {
  return {
    base: [],
    foil: [{ id: "foil-shimmer", src: "overlay://foil", blendMode: "screen", opacity: 0.35 }],
    alt_art: [{ id: "alt-border", src: "overlay://alt", blendMode: "normal", opacity: 1 }],
    promo: [{ id: "promo-stamp", src: "overlay://promo", blendMode: "multiply", opacity: 0.9 }]
  };
}

function unitTemplate(): CardTemplateManifest {
  return {
    templateId: "unit-base-v1",
    cardType: "unit",
    baseResolution: { width: 744, height: 1039 },
    layers: [
      { layerId: "paper", kind: "shape", zIndex: 1 },
      { layerId: "frame", kind: "shape", zIndex: 2 }
    ],
    dynamicRegions: [
      {
        regionId: "cost",
        kind: "stat",
        bindKey: "stats.derived.cost",
        rect: { x: 0.05, y: 0.045, w: 0.12, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "name",
        kind: "text",
        bindKey: "card.name",
        rect: { x: 0.18, y: 0.045, w: 0.77, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "art",
        kind: "art_slot",
        bindKey: "card.artAssetId",
        rect: { x: 0.08, y: 0.14, w: 0.84, h: 0.42 },
        autoFit: false,
        zIndex: 10
      },
      {
        regionId: "rules",
        kind: "text",
        bindKey: "card.rulesText",
        rect: { x: 0.08, y: 0.595, w: 0.84, h: 0.21 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "flavor",
        kind: "text",
        bindKey: "card.flavorText",
        rect: { x: 0.08, y: 0.815, w: 0.84, h: 0.1 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "health",
        kind: "stat",
        bindKey: "stats.derived.health",
        rect: { x: 0.055, y: 0.905, w: 0.14, h: 0.08 },
        autoFit: true,
        zIndex: 30
      },
      {
        regionId: "attack",
        kind: "stat",
        bindKey: "stats.derived.attack",
        rect: { x: 0.805, y: 0.905, w: 0.14, h: 0.08 },
        autoFit: true,
        zIndex: 30
      }
    ],
    variantOverlays: baseOverlays(),
    textStyles: {
      title: { fontFamily: "Arial", fontSize: 44, fontWeight: 800, color: "#141414", align: "left", lineHeight: 1.05 },
      body: { fontFamily: "Arial", fontSize: 24, fontWeight: 500, color: "#1a1a1a", align: "left", lineHeight: 1.2 },
      flavor: { fontFamily: "Arial", fontSize: 20, fontWeight: 500, color: "#403a34", align: "left", lineHeight: 1.15 },
      stat: { fontFamily: "Arial", fontSize: 40, fontWeight: 900, color: "#141414", align: "center", lineHeight: 1 }
    },
    version: 1
  };
}

function spellTemplate(): CardTemplateManifest {
  return {
    templateId: "spell-base-v1",
    cardType: "spell",
    baseResolution: { width: 744, height: 1039 },
    layers: [
      { layerId: "paper", kind: "shape", zIndex: 1 },
      { layerId: "frame", kind: "shape", zIndex: 2 }
    ],
    dynamicRegions: [
      {
        regionId: "cost",
        kind: "stat",
        bindKey: "stats.derived.cost",
        rect: { x: 0.05, y: 0.045, w: 0.12, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "name",
        kind: "text",
        bindKey: "card.name",
        rect: { x: 0.18, y: 0.045, w: 0.77, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "art",
        kind: "art_slot",
        bindKey: "card.artAssetId",
        rect: { x: 0.08, y: 0.14, w: 0.84, h: 0.42 },
        autoFit: false,
        zIndex: 10
      },
      {
        regionId: "rules",
        kind: "text",
        bindKey: "card.rulesText",
        rect: { x: 0.08, y: 0.595, w: 0.84, h: 0.25 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "flavor",
        kind: "text",
        bindKey: "card.flavorText",
        rect: { x: 0.08, y: 0.855, w: 0.84, h: 0.1 },
        autoFit: true,
        zIndex: 20
      }
    ],
    variantOverlays: baseOverlays(),
    textStyles: {
      title: { fontFamily: "Arial", fontSize: 44, fontWeight: 800, color: "#141414", align: "left", lineHeight: 1.05 },
      body: { fontFamily: "Arial", fontSize: 26, fontWeight: 500, color: "#1a1a1a", align: "left", lineHeight: 1.2 },
      flavor: { fontFamily: "Arial", fontSize: 20, fontWeight: 500, color: "#403a34", align: "left", lineHeight: 1.15 },
      stat: { fontFamily: "Arial", fontSize: 40, fontWeight: 900, color: "#141414", align: "center", lineHeight: 1 }
    },
    version: 1
  };
}

function artifactTemplate(): CardTemplateManifest {
  return {
    templateId: "artifact-base-v1",
    cardType: "artifact",
    baseResolution: { width: 744, height: 1039 },
    layers: [
      { layerId: "paper", kind: "shape", zIndex: 1 },
      { layerId: "frame", kind: "shape", zIndex: 2 }
    ],
    dynamicRegions: [
      {
        regionId: "cost",
        kind: "stat",
        bindKey: "stats.derived.cost",
        rect: { x: 0.05, y: 0.045, w: 0.12, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "name",
        kind: "text",
        bindKey: "card.name",
        rect: { x: 0.18, y: 0.045, w: 0.77, h: 0.075 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "art",
        kind: "art_slot",
        bindKey: "card.artAssetId",
        rect: { x: 0.08, y: 0.14, w: 0.84, h: 0.42 },
        autoFit: false,
        zIndex: 10
      },
      {
        regionId: "rules",
        kind: "text",
        bindKey: "card.rulesText",
        rect: { x: 0.08, y: 0.595, w: 0.84, h: 0.25 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "flavor",
        kind: "text",
        bindKey: "card.flavorText",
        rect: { x: 0.08, y: 0.855, w: 0.84, h: 0.1 },
        autoFit: true,
        zIndex: 20
      },
      {
        regionId: "durability",
        kind: "stat",
        bindKey: "stats.derived.health",
        rect: { x: 0.805, y: 0.905, w: 0.14, h: 0.08 },
        autoFit: true,
        zIndex: 30
      }
    ],
    variantOverlays: baseOverlays(),
    textStyles: {
      title: { fontFamily: "Arial", fontSize: 44, fontWeight: 800, color: "#141414", align: "left", lineHeight: 1.05 },
      body: { fontFamily: "Arial", fontSize: 26, fontWeight: 500, color: "#1a1a1a", align: "left", lineHeight: 1.2 },
      flavor: { fontFamily: "Arial", fontSize: 20, fontWeight: 500, color: "#403a34", align: "left", lineHeight: 1.15 },
      stat: { fontFamily: "Arial", fontSize: 40, fontWeight: 900, color: "#141414", align: "center", lineHeight: 1 }
    },
    version: 1
  };
}

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const already = await ctx.db.query("templates").take(1);
    if (already.length > 0) {
      return { ok: true, skipped: true };
    }

    const updatedAt = nowTs();

    const templates: CardTemplateManifest[] = [unitTemplate(), spellTemplate(), artifactTemplate()];
    for (const manifest of templates) {
      await ctx.db.insert("templates", {
        templateId: manifest.templateId,
        manifest,
        version: 1,
        updatedAt
      });
    }

    const artAssets = [
      { artAssetId: "art-hall", label: "Hall Monitor" },
      { artAssetId: "art-slip", label: "Detention Slip" },
      { artAssetId: "art-locker", label: "Locker Shield" },
      { artAssetId: "art-lunch", label: "Lunch Rush" },
      { artAssetId: "art-quiz", label: "Pop Quiz" },
      { artAssetId: "art-eraser", label: "Eraser Relic" },
      { artAssetId: "art-mop", label: "Mop Knight" },
      { artAssetId: "art-bell", label: "Final Bell" },
      { artAssetId: "art-map", label: "Campus Map" },
      { artAssetId: "art-gavel", label: "Discipline Gavel" }
    ];

    for (const asset of artAssets) {
      await ctx.db.insert("artAssets", {
        artAssetId: asset.artAssetId,
        sourceMode: "external",
        sourceUri: svgDataUri(asset.label),
        version: 1,
        createdAt: updatedAt,
        updatedAt
      });
    }

    const effects = [
      {
        effectId: "boost-on-start",
        spec: {
          effectId: "boost-on-start",
          triggers: [
            {
              on: "TURN_START",
              do: [{ type: "ADD_MODIFIER", stat: "attack", value: 1, duration: "turn" }]
            }
          ]
        }
      },
      {
        effectId: "discount-on-play",
        spec: {
          effectId: "discount-on-play",
          triggers: [
            {
              on: "CARD_PLAYED",
              do: [{ type: "ADD_MODIFIER", stat: "cost", value: -1, duration: "turn" }]
            }
          ]
        }
      }
    ];

    for (const effect of effects) {
      await ctx.db.insert("effects", {
        effectId: effect.effectId,
        spec: effect.spec,
        version: 1,
        updatedAt
      });
    }

    const cards: CardDefinition[] = [
      {
        cardId: "hall-monitor",
        locale: "en-US",
        name: "Hall Monitor",
        type: "unit",
        rarity: "common",
        variant: "base",
        templateId: "unit-base-v1",
        artAssetId: "art-hall",
        rulesText: "When this unit enters, gain +1 attack this turn.",
        flavorText: "No running in the corridor.",
        baseStats: { cost: 1, attack: 1, health: 2 },
        effectId: "boost-on-start"
      },
      {
        cardId: "mop-knight",
        locale: "en-US",
        name: "Mop Knight",
        type: "unit",
        rarity: "uncommon",
        variant: "foil",
        templateId: "unit-base-v1",
        artAssetId: "art-mop",
        rulesText: "After DAMAGE_TAKEN, gain +1 health this turn.",
        flavorText: "Wax on, war on.",
        baseStats: { cost: 2, attack: 2, health: 3 }
      },
      {
        cardId: "discipline-gavel",
        locale: "en-US",
        name: "Discipline Gavel",
        type: "unit",
        rarity: "rare",
        variant: "alt_art",
        templateId: "unit-base-v1",
        artAssetId: "art-gavel",
        rulesText: "TURN_END: Remove a badge from this unit.",
        flavorText: "Order must be kept.",
        baseStats: { cost: 3, attack: 3, health: 2 }
      },
      {
        cardId: "detention-slip",
        locale: "en-US",
        name: "Detention Slip",
        type: "spell",
        rarity: "rare",
        variant: "promo",
        templateId: "spell-base-v1",
        artAssetId: "art-slip",
        rulesText: "Target unit gets -2 attack this turn.",
        flavorText: "Paperwork is pain.",
        baseStats: { cost: 2 }
      },
      {
        cardId: "final-bell",
        locale: "en-US",
        name: "Final Bell",
        type: "spell",
        rarity: "common",
        variant: "base",
        templateId: "spell-base-v1",
        artAssetId: "art-bell",
        rulesText: "End the turn. (TURN_END)",
        flavorText: "Freedom rings.",
        baseStats: { cost: 1 },
        effectId: "discount-on-play"
      },
      {
        cardId: "locker-shield",
        locale: "en-US",
        name: "Locker Shield",
        type: "artifact",
        rarity: "uncommon",
        variant: "foil",
        templateId: "artifact-base-v1",
        artAssetId: "art-locker",
        rulesText: "Your units get +1 health.",
        flavorText: "Steel beats fists.",
        baseStats: { cost: 2, health: 3 }
      },
      {
        cardId: "eraser-relic",
        locale: "en-US",
        name: "Eraser Relic",
        type: "artifact",
        rarity: "common",
        variant: "base",
        templateId: "artifact-base-v1",
        artAssetId: "art-eraser",
        rulesText: "Remove all badges from a unit. (AURA_REMOVED)",
        flavorText: "Mistakes vanish. History remains.",
        baseStats: { cost: 1, health: 2 }
      },
      {
        cardId: "lunch-rush",
        locale: "en-US",
        name: "Lunch Rush",
        type: "spell",
        rarity: "uncommon",
        variant: "alt_art",
        templateId: "spell-base-v1",
        artAssetId: "art-lunch",
        rulesText: "Give a unit +2 attack this turn.",
        flavorText: "Line forms fast.",
        baseStats: { cost: 2 }
      },
      {
        cardId: "pop-quiz",
        locale: "en-US",
        name: "Pop Quiz",
        type: "spell",
        rarity: "uncommon",
        variant: "base",
        templateId: "spell-base-v1",
        artAssetId: "art-quiz",
        rulesText: "Draw a card.",
        flavorText: "Surprise. Always.",
        baseStats: { cost: 1 }
      },
      {
        cardId: "campus-map",
        locale: "en-US",
        name: "Campus Map",
        type: "artifact",
        rarity: "rare",
        variant: "promo",
        templateId: "artifact-base-v1",
        artAssetId: "art-map",
        rulesText: "Your spells cost -1 this turn.",
        flavorText: "Shortcuts are earned.",
        baseStats: { cost: 2, health: 4 }
      }
    ];

    for (const card of cards) {
      await ctx.db.insert("cards", {
        cardId: card.cardId,
        data: card,
        version: 1,
        updatedAt
      });

      await ctx.db.insert("runtime", {
        cardId: card.cardId,
        state: createInitialRuntimeState({ cardId: card.cardId, baseStats: card.baseStats }),
        appliedEffects: [],
        updatedAt
      });
    }

    return {
      ok: true,
      skipped: false,
      seeded: {
        templates: templates.length,
        cards: cards.length,
        effects: effects.length,
        artAssets: artAssets.length
      }
    };
  }
});

