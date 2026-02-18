export const REQUIRED_CARD_COLUMNS = [
  "card_id",
  "name",
  "type",
  "template_id",
  "variant",
  "rarity",
  "art_asset_id",
  "rules_text",
  "flavor_text",
  "locale"
] as const;

export const OPTIONAL_CARD_COLUMNS = [
  "base_card_id",
  "subtype",
  "cost",
  "attack",
  "health",
  "effect_id",
  "tags",
  "status"
] as const;

export const REQUIRED_EFFECT_COLUMNS = ["effect_id", "effect_json"] as const;

export const OPTIONAL_EFFECT_COLUMNS = [] as const;

export const REQUIRED_ART_COLUMNS = ["art_asset_id", "source_mode"] as const;

export const OPTIONAL_ART_COLUMNS = [
  "source_uri",
  "prompt",
  "style_id",
  "rights_tier",
  "version",
  "provider",
  "width",
  "height"
] as const;
