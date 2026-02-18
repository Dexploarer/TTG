import type { CardCsvRow, CsvValidationIssue } from "@gambit/csv-pipeline";
import type { CardDefinition, CardType, Rarity, VariantTag } from "@gambit/template-schema";

type ValidationResult<T> = {
  ok: boolean;
  value?: T;
  issues: string[];
};

type TemplateManifestLite = {
  templateId: string;
  cardType: CardType;
  baseResolution: { width: number; height: number };
  layers: Array<Record<string, unknown>>;
  dynamicRegions: Array<Record<string, unknown>>;
  variantOverlays: Record<string, unknown>;
  textStyles: Record<string, unknown>;
  version: number;
};

const CARD_TYPES = ["unit", "spell", "artifact"] as const;
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
const VARIANTS = ["base", "foil", "alt_art", "promo"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toCardType(value: unknown): CardType | undefined {
  if (typeof value !== "string") return undefined;
  return (CARD_TYPES as readonly string[]).includes(value) ? (value as CardType) : undefined;
}

function toRarity(value: unknown): Rarity | undefined {
  if (typeof value !== "string") return undefined;
  return (RARITIES as readonly string[]).includes(value) ? (value as Rarity) : undefined;
}

function toVariant(value: unknown): VariantTag | undefined {
  if (typeof value !== "string") return undefined;
  return (VARIANTS as readonly string[]).includes(value) ? (value as VariantTag) : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isObjectArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((item) => isRecord(item));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

export function validateTemplateManifestLite(input: unknown): ValidationResult<TemplateManifestLite> {
  const issues: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: ["manifest must be an object"] };
  }

  const templateId = optionalString(input.templateId);
  const cardType = toCardType(input.cardType);
  if (!templateId) issues.push("templateId is required");
  if (!cardType) issues.push("cardType is invalid");

  const resolution = isRecord(input.baseResolution) ? input.baseResolution : null;
  const resolutionWidth = resolution ? toNumber(resolution.width) : undefined;
  const resolutionHeight = resolution ? toNumber(resolution.height) : undefined;
  if (resolutionWidth === undefined || resolutionHeight === undefined) issues.push("baseResolution is required");

  if (!Array.isArray(input.layers) || input.layers.length === 0) issues.push("layers are required");
  if (!Array.isArray(input.dynamicRegions)) issues.push("dynamicRegions must be an array");

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (!isObjectArray(input.layers)) {
    return { ok: false, issues: ["layers must be an array of objects"] };
  }

  if (!isObjectArray(input.dynamicRegions)) {
    return { ok: false, issues: ["dynamicRegions must be an array of objects"] };
  }

  if (!isRecord(input.variantOverlays)) {
    return { ok: false, issues: ["variantOverlays is required"] };
  }

  if (!isRecord(input.textStyles)) {
    return { ok: false, issues: ["textStyles is required"] };
  }

  if (!isFiniteNumber(input.version)) {
    return { ok: false, issues: ["version must be a number"] };
  }

  if (!templateId || !cardType || resolutionWidth === undefined || resolutionHeight === undefined) {
    return { ok: false, issues: ["template shape is invalid"] };
  }

  const manifest: TemplateManifestLite = {
    templateId,
    cardType,
    baseResolution: { width: resolutionWidth, height: resolutionHeight },
    layers: input.layers,
    dynamicRegions: input.dynamicRegions,
    variantOverlays: input.variantOverlays,
    textStyles: input.textStyles,
    version: input.version
  };

  return {
    ok: true,
    value: manifest,
    issues: []
  };
}

export function validateCardDefinitionLite(input: unknown): ValidationResult<CardDefinition> {
  const issues: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: ["card must be an object"] };
  }

  const cardId = optionalString(input.cardId);
  const locale = optionalString(input.locale);
  const name = optionalString(input.name);
  const templateId = optionalString(input.templateId);
  const artAssetId = optionalString(input.artAssetId);
  const flavorText = optionalString(input.flavorText);
  const rulesText = optionalString(input.rulesText);
  const type = toCardType(input.type);
  const rarity = toRarity(input.rarity);
  const variant = toVariant(input.variant);

  if (!cardId) issues.push("cardId is required");
  if (!locale) issues.push("locale is required");
  if (!name) issues.push("name is required");
  if (!type) issues.push("type is invalid");
  if (!rarity) issues.push("rarity is invalid");
  if (!variant) issues.push("variant is invalid");
  if (!templateId) issues.push("templateId is required");
  if (!artAssetId) issues.push("artAssetId is required");
  if (!flavorText) issues.push("flavorText is required");
  if (!rulesText) issues.push("rulesText is required");

  const baseStatsRecord = isRecord(input.baseStats) ? input.baseStats : {};
  const baseStats = {
    cost: toNumber(baseStatsRecord.cost),
    attack: toNumber(baseStatsRecord.attack),
    health: toNumber(baseStatsRecord.health)
  };

  if (type === "unit") {
    if (typeof baseStats.attack !== "number" || typeof baseStats.health !== "number") {
      issues.push("unit cards require numeric attack and health");
    }
  }

  if (type === "spell") {
    if (baseStats.attack !== undefined || baseStats.health !== undefined) {
      issues.push("spell cards cannot define attack/health");
    }
  }

  if (issues.length > 0 || !cardId || !locale || !name || !type || !rarity || !variant || !templateId || !artAssetId || !flavorText || !rulesText) {
    return { ok: false, issues };
  }

  const value: CardDefinition = {
    cardId,
    baseCardId: optionalString(input.baseCardId),
    locale,
    name,
    type,
    subtype: optionalString(input.subtype),
    rarity,
    variant,
    templateId,
    artAssetId,
    flavorText,
    rulesText,
    baseStats,
    effectId: optionalString(input.effectId)
  };

  return {
    ok: true,
    value,
    issues: []
  };
}

export function normalizeCardRowsLite(rows: CardCsvRow[]): {
  cards: CardDefinition[];
  issues: CsvValidationIssue[];
} {
  const cards: CardDefinition[] = [];
  const issues: CsvValidationIssue[] = [];

  rows.forEach((row, index) => {
    const card: CardDefinition = {
      cardId: row.card_id,
      baseCardId: row.base_card_id || undefined,
      locale: row.locale,
      name: row.name,
      type: row.type,
      subtype: row.subtype || undefined,
      rarity: row.rarity,
      variant: row.variant,
      templateId: row.template_id,
      artAssetId: row.art_asset_id,
      flavorText: row.flavor_text,
      rulesText: row.rules_text,
      effectId: row.effect_id || undefined,
      baseStats: {
        cost: toNumber(row.cost),
        attack: toNumber(row.attack),
        health: toNumber(row.health)
      }
    };

    const check = validateCardDefinitionLite(card);
    if (!check.ok || !check.value) {
      for (const issue of check.issues) {
        issues.push({
          row: index + 2,
          severity: "error",
          message: issue
        });
      }
      return;
    }

    cards.push(check.value);
  });

  return { cards, issues };
}

export function coerceCardCsvRows(input: unknown): CardCsvRow[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const rows: CardCsvRow[] = [];
  for (const row of input) {
    if (!isStringRecord(row)) {
      continue;
    }

    const cardType = toCardType(row.type);
    const rarity = toRarity(row.rarity);
    const variant = toVariant(row.variant);
    const cardId = optionalString(row.card_id);
    const locale = optionalString(row.locale);
    const name = optionalString(row.name);
    const templateId = optionalString(row.template_id);
    const artAssetId = optionalString(row.art_asset_id);
    const flavorText = optionalString(row.flavor_text);
    const rulesText = optionalString(row.rules_text);

    if (!cardType || !rarity || !variant || !cardId || !locale || !name || !templateId || !artAssetId || !flavorText || !rulesText) {
      continue;
    }

    rows.push({
      card_id: cardId,
      base_card_id: optionalString(row.base_card_id),
      locale,
      name,
      type: cardType,
      subtype: optionalString(row.subtype),
      rarity,
      variant,
      template_id: templateId,
      art_asset_id: artAssetId,
      flavor_text: flavorText,
      rules_text: rulesText,
      cost: optionalString(row.cost),
      attack: optionalString(row.attack),
      health: optionalString(row.health),
      effect_id: optionalString(row.effect_id),
      tags: optionalString(row.tags),
      status: optionalString(row.status)
    });
  }

  return rows;
}
