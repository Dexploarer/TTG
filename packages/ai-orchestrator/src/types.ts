import type { CardType } from "@gambit/template-schema";

export type TextProvider = "openrouter" | "vercel_gateway";
export type ArtProvider = "fal";

export interface CardCopyInput {
  cardId: string;
  name: string;
  type: CardType;
  locale: string;
  subtype?: string;
  rulesText?: string;
  flavorText?: string;
  designGoal?: string;
}

export interface GenerateCardCopyRequest {
  provider?: TextProvider;
  model?: string;
  card: CardCopyInput;
}

export interface GeneratedCardCopy {
  provider: TextProvider;
  model: string;
  name: string;
  rulesText: string;
  flavorText: string;
  artPrompt: string;
}

export interface GenerateArtRequest {
  provider?: ArtProvider;
  model?: string;
  cardId: string;
  prompt: string;
  imageSize?: string;
}

export interface GeneratedArtAsset {
  provider: ArtProvider;
  model: string;
  assetId: string;
  sourceUri: string;
  prompt: string;
  imageSize: string;
}

export interface AiProviderStatus {
  openrouterConfigured: boolean;
  aiGatewayConfigured: boolean;
  falConfigured: boolean;
}

export interface AiOrchestratorConfig {
  appName?: string;
  appUrl?: string;
  openRouterApiKey?: string;
  aiGatewayApiKey?: string;
  falApiKey?: string;
  defaultOpenRouterModel?: string;
  defaultGatewayModel?: string;
  defaultFalModel?: string;
  defaultFalImageSize?: string;
}
