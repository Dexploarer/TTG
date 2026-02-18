import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { parseArtCsv, parseCardsCsv, parseEffectsCsv } from "@gambit/csv-pipeline/src/parse";
import { createInitialRuntimeState, validateEffectSpec } from "@gambit/effect-engine";
import type { EffectSpec } from "@gambit/effect-engine";
import type { CardDefinition } from "@gambit/template-schema";
import { jobId, nextVersion, nowTs } from "./_helpers";
import { normalizeCardRowsLite, validateCardDefinitionLite } from "./_validators";

export const validateCsv = action({
  args: { csv: v.string() },
  handler: async (_ctx, args) => {
    const parsed = parseCardsCsv(args.csv);
    const normalized = normalizeCardRowsLite(parsed.rows);
    const issues = [...parsed.issues, ...normalized.issues];

    return {
      ok: !issues.some((issue) => issue.severity === "error"),
      fileHash: parsed.fileHash,
      rows: parsed.rows.length,
      issues,
      normalizedCards: normalized.cards
    };
  }
});

export const applyCsv = mutation({
  args: { csv: v.string() },
  handler: async (ctx, args) => {
    const parsed = parseCardsCsv(args.csv);
    const normalized = normalizeCardRowsLite(parsed.rows);
    const issues = [...parsed.issues, ...normalized.issues];

    const record = {
      importId: jobId("import"),
      kind: "cards" as const,
      fileHash: parsed.fileHash,
      rowCount: parsed.rows.length,
      issues,
      createdAt: nowTs()
    };
    await ctx.db.insert("imports", record);

    if (issues.some((issue) => issue.severity === "error")) {
      return { importRecord: record, upserted: [] };
    }

    const upserted: Array<{ value: CardDefinition; version: number; updatedAt: number }> = [];

    for (const card of normalized.cards) {
      const check = validateCardDefinitionLite(card);
      if (!check.ok || !check.value) {
        continue;
      }

      const validCard = check.value;

      const existing = await ctx.db
        .query("cards")
        .withIndex("by_card_id", (q) => q.eq("cardId", validCard.cardId))
        .unique();

      const version = nextVersion(existing?.version);
      const updatedAt = nowTs();

      if (existing) {
        await ctx.db.patch(existing._id, { data: validCard, version, updatedAt });
      } else {
        await ctx.db.insert("cards", { cardId: validCard.cardId, data: validCard, version, updatedAt });
      }

      const runtime = await ctx.db
        .query("runtime")
        .withIndex("by_card_id", (q) => q.eq("cardId", validCard.cardId))
        .unique();
      const nextRuntime = createInitialRuntimeState({ cardId: validCard.cardId, baseStats: validCard.baseStats });
      if (!runtime) {
        await ctx.db.insert("runtime", { cardId: validCard.cardId, state: nextRuntime, appliedEffects: [], updatedAt });
      } else {
        const baseStatsChanged = JSON.stringify(runtime.state?.baseStats ?? {}) !== JSON.stringify(nextRuntime.baseStats);
        if (baseStatsChanged) {
          await ctx.db.patch(runtime._id, { state: nextRuntime, appliedEffects: [], updatedAt });
        }
      }

      upserted.push({ value: validCard, version, updatedAt });
    }

    return { importRecord: record, upserted };
  }
});

export const validateArtCsv = action({
  args: { csv: v.string() },
  handler: async (_ctx, args) => {
    const parsed = parseArtCsv(args.csv);
    const issues = [...parsed.issues];

    parsed.rows.forEach((row, index) => {
      const rowIndex = index + 2;
      if (row.source_mode === "external" && (!row.source_uri || row.source_uri.trim().length === 0)) {
        issues.push({ row: rowIndex, column: "source_uri", severity: "error", message: "source_uri is required for external art" });
      }
      if (row.source_mode === "upload") {
        issues.push({ row: rowIndex, column: "source_mode", severity: "warning", message: "upload art cannot be created via CSV (use Studio upload)" });
      }
    });

    return {
      ok: !issues.some((issue) => issue.severity === "error"),
      fileHash: parsed.fileHash,
      rows: parsed.rows.length,
      issues,
      normalizedArtAssets: parsed.rows
    };
  }
});

export const applyArtCsv = mutation({
  args: { csv: v.string() },
  handler: async (ctx, args) => {
    const parsed = parseArtCsv(args.csv);
    const issues = [...parsed.issues];

    parsed.rows.forEach((row, index) => {
      const rowIndex = index + 2;
      if (row.source_mode === "external" && (!row.source_uri || row.source_uri.trim().length === 0)) {
        issues.push({ row: rowIndex, column: "source_uri", severity: "error", message: "source_uri is required for external art" });
      }
    });

    const record = {
      importId: jobId("import_art"),
      kind: "art" as const,
      fileHash: parsed.fileHash,
      rowCount: parsed.rows.length,
      issues,
      createdAt: nowTs()
    };
    await ctx.db.insert("imports", record);

    if (issues.some((issue) => issue.severity === "error")) {
      return { importRecord: record, upserted: [] };
    }

    const upserted: Array<{ artAssetId: string; version: number; updatedAt: number }> = [];

    for (const row of parsed.rows) {
      const artAssetId = row.art_asset_id?.trim();
      if (!artAssetId) continue;

      const sourceMode = row.source_mode === "ai_fal" || row.source_mode === "upload" ? row.source_mode : "external";
      if (sourceMode !== "external") {
        continue;
      }

      const sourceUri = row.source_uri?.trim();
      if (!sourceUri) continue;

      const existing = await ctx.db
        .query("artAssets")
        .withIndex("by_art_asset_id", (q) => q.eq("artAssetId", artAssetId))
        .unique();

      const updatedAt = nowTs();
      const version = nextVersion(existing?.version);
      const createdAt = existing?.createdAt ?? updatedAt;

      const payload = {
        artAssetId,
        sourceMode: "external" as const,
        sourceUri,
        prompt: row.prompt?.trim() || undefined,
        provider: row.provider?.trim() === "fal" ? ("fal" as const) : undefined,
        width: row.width ? Number(row.width) : undefined,
        height: row.height ? Number(row.height) : undefined,
        rightsTier: row.rights_tier?.trim() || undefined,
        version,
        createdAt,
        updatedAt
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("artAssets", payload);
      }

      upserted.push({ artAssetId, version, updatedAt });
    }

    return { importRecord: record, upserted };
  }
});

export const validateEffectsCsv = action({
  args: { csv: v.string() },
  handler: async (_ctx, args) => {
    const parsed = parseEffectsCsv(args.csv);
    const issues = [...parsed.issues];
    const normalizedEffects: EffectSpec[] = [];

    parsed.rows.forEach((row, index) => {
      const rowIndex = index + 2;
      const effectId = row.effect_id?.trim();
      const json = row.effect_json?.trim();
      if (!effectId || !json) return;
      try {
        const parsedJson = JSON.parse(json) as Record<string, unknown>;
        if (typeof parsedJson.effectId !== "string" || parsedJson.effectId.trim().length === 0) {
          issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: "effect_json.effectId is required" });
          return;
        }
        if (parsedJson.effectId !== effectId) {
          issues.push({ row: rowIndex, column: "effect_id", severity: "warning", message: "effect_id differs from effect_json.effectId; effect_id will win" });
        }
        const spec = { ...parsedJson, effectId } as unknown as EffectSpec;
        const check = validateEffectSpec(spec);
        if (!check.ok) {
          for (const issue of check.issues) {
            issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: issue });
          }
          return;
        }
        normalizedEffects.push(spec);
      } catch {
        issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: "effect_json must be valid JSON" });
      }
    });

    return {
      ok: !issues.some((issue) => issue.severity === "error"),
      fileHash: parsed.fileHash,
      rows: parsed.rows.length,
      issues,
      normalizedEffects
    };
  }
});

export const applyEffectsCsv = mutation({
  args: { csv: v.string() },
  handler: async (ctx, args) => {
    const parsed = parseEffectsCsv(args.csv);
    const issues = [...parsed.issues];
    const normalizedEffects: EffectSpec[] = [];

    parsed.rows.forEach((row, index) => {
      const rowIndex = index + 2;
      const effectId = row.effect_id?.trim();
      const json = row.effect_json?.trim();
      if (!effectId || !json) return;
      try {
        const parsedJson = JSON.parse(json) as Record<string, unknown>;
        const spec = { ...parsedJson, effectId } as unknown as EffectSpec;
        const check = validateEffectSpec(spec);
        if (!check.ok) {
          for (const issue of check.issues) {
            issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: issue });
          }
          return;
        }
        normalizedEffects.push(spec);
      } catch {
        issues.push({ row: rowIndex, column: "effect_json", severity: "error", message: "effect_json must be valid JSON" });
      }
    });

    const record = {
      importId: jobId("import_effects"),
      kind: "effects" as const,
      fileHash: parsed.fileHash,
      rowCount: parsed.rows.length,
      issues,
      createdAt: nowTs()
    };
    await ctx.db.insert("imports", record);

    if (issues.some((issue) => issue.severity === "error")) {
      return { importRecord: record, upserted: [] };
    }

    const upserted: Array<{ effectId: string; version: number; updatedAt: number }> = [];

    for (const effect of normalizedEffects) {
      const effectId = String((effect as any).effectId);

      const existing = await ctx.db
        .query("effects")
        .withIndex("by_effect_id", (q) => q.eq("effectId", effectId))
        .unique();

      const updatedAt = nowTs();
      const version = nextVersion(existing?.version);

      if (existing) {
        await ctx.db.patch(existing._id, { spec: effect, version, updatedAt });
      } else {
        await ctx.db.insert("effects", { effectId, spec: effect, version, updatedAt });
      }

      upserted.push({ effectId, version, updatedAt });
    }

    return { importRecord: record, upserted };
  }
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("imports").collect();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  }
});
