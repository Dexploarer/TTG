import { describe, expect, it } from "vitest";
import { createDiffPreview, normalizeCardRows, parseArtCsv, parseCardsCsv, parseEffectsCsv } from "../src";
import type { CardDefinition } from "@gambit/template-schema";

describe("csv pipeline", () => {
  it("parses and validates cards csv", () => {
    const csv = [
      "card_id,name,type,template_id,variant,rarity,art_asset_id,rules_text,flavor_text,locale,cost,attack,health",
      "hall-monitor,Hall Monitor,unit,unit-base-v1,base,common,art-1,Gain +1 attack this turn.,No running.,en-US,1,1,2"
    ].join("\n");

    const parsed = parseCardsCsv(csv);
    expect(parsed.ok).toBe(true);

    const normalized = normalizeCardRows(parsed.rows);
    expect(normalized.cards).toHaveLength(1);
    expect(normalized.issues).toHaveLength(0);
  });

  it("builds diff preview deterministically", () => {
    const csv = [
      "card_id,name,type,template_id,variant,rarity,art_asset_id,rules_text,flavor_text,locale,cost,attack,health",
      "hall-monitor,Hall Monitor,unit,unit-base-v1,base,common,art-1,Gain +1 attack this turn.,No running.,en-US,1,1,2"
    ].join("\n");

    const parsed = parseCardsCsv(csv);
    const normalized = normalizeCardRows(parsed.rows);
    const first = normalized.cards[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("Expected normalized card");

    const existing = new Map<string, CardDefinition>([
      [
        "hall-monitor",
        {
          ...first,
          flavorText: "Old text"
        }
      ]
    ]);

    const diff = createDiffPreview(normalized.cards, existing);
    expect(diff.inserts).toHaveLength(0);
    expect(diff.updates).toHaveLength(1);
    expect(diff.unchanged).toHaveLength(0);
  });

  it("parses effects csv and validates JSON", () => {
    const csv = ["effect_id,effect_json", 'boost,"{""effectId"":""boost"",""triggers"":[]}"'].join("\n");
    const parsed = parseEffectsCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.rows[0]?.effect_id).toBe("boost");

    const bad = ["effect_id,effect_json", 'oops,"{""not"":""json"""'].join("\n");
    const badParsed = parseEffectsCsv(bad);
    expect(badParsed.ok).toBe(false);
    expect(badParsed.issues.some((issue) => issue.column === "effect_json" && issue.severity === "error")).toBe(true);
  });

  it("parses art csv and validates source_mode", () => {
    const csv = ["art_asset_id,source_mode,source_uri", "art-1,external,https://example.com/a.png"].join("\n");
    const parsed = parseArtCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.rows[0]?.art_asset_id).toBe("art-1");

    const bad = ["art_asset_id,source_mode", "art-2,broken"].join("\n");
    const badParsed = parseArtCsv(bad);
    expect(badParsed.ok).toBe(false);
    expect(badParsed.issues.some((issue) => issue.column === "source_mode" && issue.severity === "error")).toBe(true);
  });
});
