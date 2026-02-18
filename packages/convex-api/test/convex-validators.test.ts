import { describe, expect, it } from "vitest";
import {
  coerceCardCsvRows,
  normalizeCardRowsLite,
  validateCardDefinitionLite,
  validateTemplateManifestLite
} from "../../../convex/_validators";

describe("convex lite validators", () => {
  it("accepts a minimal template manifest shape", () => {
    const result = validateTemplateManifestLite({
      templateId: "unit-base-v1",
      cardType: "unit",
      baseResolution: { width: 744, height: 1039 },
      layers: [{ layerId: "bg", kind: "image", zIndex: 1 }],
      dynamicRegions: [],
      variantOverlays: { base: [], foil: [], alt_art: [], promo: [] },
      textStyles: {},
      version: 1
    });

    expect(result.ok).toBe(true);
    expect(result.value?.templateId).toBe("unit-base-v1");
  });

  it("rejects invalid template manifest shape", () => {
    const result = validateTemplateManifestLite({ cardType: "unit" });
    expect(result.ok).toBe(false);
    expect(result.issues.join(",")).toContain("templateId");
  });

  it("accepts a valid unit card and rejects invalid spell stats", () => {
    const ok = validateCardDefinitionLite({
      cardId: "unit-1",
      locale: "en-US",
      name: "Unit One",
      type: "unit",
      rarity: "common",
      variant: "base",
      templateId: "unit-base-v1",
      artAssetId: "art-1",
      flavorText: "Flavor",
      rulesText: "Rules",
      baseStats: { cost: 1, attack: 1, health: 2 }
    });
    expect(ok.ok).toBe(true);
    expect(ok.value?.cardId).toBe("unit-1");

    const bad = validateCardDefinitionLite({
      cardId: "spell-1",
      locale: "en-US",
      name: "Spell One",
      type: "spell",
      rarity: "common",
      variant: "base",
      templateId: "spell-base-v1",
      artAssetId: "art-2",
      flavorText: "Flavor",
      rulesText: "Rules",
      baseStats: { cost: 1, attack: 9 }
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues.join(",")).toContain("spell cards cannot define attack/health");
  });

  it("normalizes valid CSV rows into CardDefinition values", () => {
    const rows = coerceCardCsvRows([
      {
        card_id: "csv-1",
        locale: "en-US",
        name: "CSV One",
        type: "unit",
        rarity: "common",
        variant: "base",
        template_id: "unit-base-v1",
        art_asset_id: "art-csv-1",
        flavor_text: "Flavor",
        rules_text: "Rules",
        cost: "1",
        attack: "2",
        health: "3"
      }
    ]);

    const normalized = normalizeCardRowsLite(rows);
    expect(normalized.issues).toHaveLength(0);
    expect(normalized.cards).toHaveLength(1);
    expect(normalized.cards[0]?.cardId).toBe("csv-1");
    expect(normalized.cards[0]?.baseStats.attack).toBe(2);
  });
});

