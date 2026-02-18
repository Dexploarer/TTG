import { describe, expect, it, vi } from "vitest";
import { AiOrchestrator, __private, extractJsonObject } from "../src";
import type { AiOrchestratorDeps } from "../src";

describe("extractJsonObject", () => {
  it("parses direct json", () => {
    const parsed = extractJsonObject('{"name":"A","rulesText":"B","flavorText":"C","artPrompt":"D"}');
    expect(parsed).toEqual({
      name: "A",
      rulesText: "B",
      flavorText: "C",
      artPrompt: "D"
    });
  });

  it("parses fenced json", () => {
    const parsed = extractJsonObject(
      "```json\n{\"name\":\"A\",\"rulesText\":\"B\",\"flavorText\":\"C\",\"artPrompt\":\"D\"}\n```"
    );
    expect(parsed).toEqual({
      name: "A",
      rulesText: "B",
      flavorText: "C",
      artPrompt: "D"
    });
  });
});

describe("AiOrchestrator", () => {
  it("generates card copy through injected text client", async () => {
    const generateTextFn: NonNullable<AiOrchestratorDeps["generateTextFn"]> = vi.fn(async () => ({
      text: JSON.stringify({
        name: "Hall Monitor Prime",
        rulesText: "When played, gain +1 attack this turn.",
        flavorText: "The whistle rules the hallway.",
        artPrompt: "stylized hall monitor in dramatic lighting, card game illustration"
      })
    }));

    const deps: AiOrchestratorDeps = {
      generateTextFn
    };

    const orchestrator = new AiOrchestrator(
      {
        aiGatewayApiKey: "test-ai-gateway"
      },
      deps
    );

    const copy = await orchestrator.generateCardCopy({
      provider: "vercel_gateway",
      card: {
        cardId: "hall-monitor",
        name: "Hall Monitor",
        type: "unit",
        locale: "en-US"
      }
    });

    expect(copy.provider).toBe("vercel_gateway");
    expect(copy.name).toBe("Hall Monitor Prime");
    expect(copy.rulesText).toContain("gain +1 attack");
  });

  it("generates art metadata through injected fal client", async () => {
    const falClient: AiOrchestratorDeps["falClient"] = {
      config: vi.fn(),
      subscribe: vi.fn(async () => ({
        data: {
          images: [{ url: "https://assets.example.com/generated.png" }]
        }
      }))
    };

    const orchestrator = new AiOrchestrator(
      {
        falApiKey: "test-fal-key"
      },
      {
        falClient
      }
    );

    const art = await orchestrator.generateArt({
      cardId: "hall-monitor",
      prompt: "cinematic card art of a strict school hall monitor"
    });

    expect(art.provider).toBe("fal");
    expect(art.sourceUri).toContain("assets.example.com");
    expect(art.assetId).toContain("hall-monitor");
  });
});

describe("__private helpers", () => {
  it("extracts image url from direct response shape", () => {
    const url = __private.readFalImageUrl({
      images: [{ url: "https://assets.example.com/direct.png" }]
    });

    expect(url).toBe("https://assets.example.com/direct.png");
  });
});
