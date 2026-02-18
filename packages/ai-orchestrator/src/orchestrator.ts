import { gateway } from "@ai-sdk/gateway";
import { createOpenAI } from "@ai-sdk/openai";
import { fal } from "@fal-ai/client";
import { generateText } from "ai";
import { z } from "zod";
import type {
  AiOrchestratorConfig,
  AiProviderStatus,
  GenerateArtRequest,
  GenerateCardCopyRequest,
  GeneratedArtAsset,
  GeneratedCardCopy,
  TextProvider
} from "./types";

type GenerateTextFn = typeof generateText;
type LanguageModelLike = Parameters<GenerateTextFn>[0]["model"];
type TextGenerator = (input: { model: LanguageModelLike; prompt: string }) => Promise<{ text: string }>;

interface FalClientLike {
  config(options: { credentials: string }): void;
  subscribe(
    model: string,
    options: {
      input: Record<string, unknown>;
      logs?: boolean;
      pollInterval?: number;
    }
  ): Promise<unknown>;
}

export interface AiOrchestratorDeps {
  generateTextFn?: TextGenerator;
  falClient?: FalClientLike;
}

const generatedCardCopySchema = z.object({
  name: z.string().min(1).max(80),
  rulesText: z.string().min(1).max(280),
  flavorText: z.string().min(1).max(220),
  artPrompt: z.string().min(1).max(400)
});

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanCardCopy(copy: z.infer<typeof generatedCardCopySchema>): z.infer<typeof generatedCardCopySchema> {
  return {
    name: compactText(copy.name),
    rulesText: copy.rulesText.trim(),
    flavorText: copy.flavorText.trim(),
    artPrompt: copy.artPrompt.trim()
  };
}

export function extractJsonObject(input: string): unknown {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error("Model returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // fall through
    }
  }

  throw new Error("Model response did not contain valid JSON.");
}

function buildCardCopyPrompt(request: GenerateCardCopyRequest): string {
  const card = request.card;
  return [
    "You are a senior trading card game content designer.",
    "Generate polished card copy and an art prompt for a digital TCG card.",
    "Return ONLY valid JSON with keys: name, rulesText, flavorText, artPrompt.",
    "Constraints:",
    "- rulesText must be concise and actionable (<= 220 chars).",
    "- flavorText must be evocative and readable (<= 160 chars).",
    "- artPrompt should be detailed enough for a text-to-image model.",
    "- Keep output aligned with the card type and existing mechanics intent.",
    "",
    "Input card payload:",
    JSON.stringify(
      {
        cardId: card.cardId,
        name: card.name,
        type: card.type,
        subtype: card.subtype ?? null,
        locale: card.locale,
        currentRulesText: card.rulesText ?? "",
        currentFlavorText: card.flavorText ?? "",
        designGoal: card.designGoal ?? ""
      },
      null,
      2
    )
  ].join("\n");
}

function readFalImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const fromData = (payload as { data?: { images?: Array<{ url?: unknown }> } }).data?.images?.[0]?.url;
  if (typeof fromData === "string" && fromData.length > 0) {
    return fromData;
  }

  const direct = (payload as { images?: Array<{ url?: unknown }> }).images?.[0]?.url;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  return null;
}

function buildAssetId(cardId: string): string {
  const safeCardId = cardId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `art-${safeCardId || "card"}-${Date.now()}`;
}

export class AiOrchestrator {
  private readonly config: AiOrchestratorConfig;
  private readonly deps: Required<AiOrchestratorDeps>;

  public constructor(config: AiOrchestratorConfig = {}, deps: AiOrchestratorDeps = {}) {
    this.config = config;
    this.deps = {
      generateTextFn:
        deps.generateTextFn ??
        (async ({ model, prompt }) => {
          const response = await generateText({ model, prompt });
          return { text: response.text };
        }),
      falClient: deps.falClient ?? fal
    };
  }

  public getProviderStatus(): AiProviderStatus {
    return {
      openrouterConfigured: Boolean(this.config.openRouterApiKey ?? process.env.OPENROUTER_API_KEY),
      aiGatewayConfigured: Boolean(
        this.config.aiGatewayApiKey ?? process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY
      ),
      falConfigured: Boolean(this.config.falApiKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY)
    };
  }

  public async generateCardCopy(request: GenerateCardCopyRequest): Promise<GeneratedCardCopy> {
    const provider: TextProvider = request.provider ?? "openrouter";
    const model =
      request.model ??
      (provider === "openrouter"
        ? this.config.defaultOpenRouterModel ?? "openai/gpt-4o-mini"
        : this.config.defaultGatewayModel ?? "openai/gpt-4.1-mini");

    const response = await this.deps.generateTextFn({
      model: this.resolveTextModel(provider, model),
      prompt: buildCardCopyPrompt(request)
    });

    const parsed = generatedCardCopySchema.parse(extractJsonObject(response.text));
    const cleaned = cleanCardCopy(parsed);

    return {
      provider,
      model,
      name: cleaned.name,
      rulesText: cleaned.rulesText,
      flavorText: cleaned.flavorText,
      artPrompt: cleaned.artPrompt
    };
  }

  public async generateArt(request: GenerateArtRequest): Promise<GeneratedArtAsset> {
    const provider = request.provider ?? "fal";
    if (provider !== "fal") {
      throw new Error(`Unsupported art provider: ${provider}`);
    }

    const apiKey = this.config.falApiKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY;
    if (!apiKey) {
      throw new Error("FAL_KEY is required for provider=fal.");
    }

    const model = request.model ?? this.config.defaultFalModel ?? "fal-ai/flux/dev";
    const imageSize = request.imageSize ?? this.config.defaultFalImageSize ?? "portrait_4_3";

    this.deps.falClient.config({ credentials: apiKey });

    const result = await this.deps.falClient.subscribe(model, {
      input: {
        prompt: request.prompt,
        image_size: imageSize,
        num_images: 1
      },
      logs: false
    });

    const sourceUri = readFalImageUrl(result);
    if (!sourceUri) {
      throw new Error("FAL did not return an image URL.");
    }

    return {
      provider,
      model,
      assetId: buildAssetId(request.cardId),
      sourceUri,
      prompt: request.prompt,
      imageSize
    };
  }

  private resolveTextModel(provider: TextProvider, model: string): LanguageModelLike {
    if (provider === "openrouter") {
      const apiKey = this.config.openRouterApiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is required for provider=openrouter.");
      }

      const client = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "X-Title": this.config.appName ?? "Gambit Studio",
          "HTTP-Referer": this.config.appUrl ?? "http://localhost:5173"
        }
      });
      return client(model) as LanguageModelLike;
    }

    const gatewayKey =
      this.config.aiGatewayApiKey ?? process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY;
    if (!gatewayKey) {
      throw new Error("AI_GATEWAY_API_KEY is required for provider=vercel_gateway.");
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      process.env.AI_GATEWAY_API_KEY = gatewayKey;
    }

    return gateway(model) as LanguageModelLike;
  }
}

export function createAiOrchestrator(config: AiOrchestratorConfig = {}, deps: AiOrchestratorDeps = {}): AiOrchestrator {
  return new AiOrchestrator(config, deps);
}

export const __private = {
  buildCardCopyPrompt,
  readFalImageUrl
};
