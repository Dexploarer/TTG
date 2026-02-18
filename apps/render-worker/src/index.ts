import { createAiOrchestrator } from "@gambit/ai-orchestrator";
import type { CardType } from "@gambit/template-schema";
import { renderCardToPngBytes } from "./renderer";
import { loadDotEnvLocal } from "./env";
import { RenderDaemon } from "./daemon";

declare const Bun: {
  serve: (options: {
    port: number;
    fetch: (request: Request) => Promise<Response> | Response;
  }) => { port: number };
};

loadDotEnvLocal();

const port = Number(process.env.PORT ?? 8788);

const aiOrchestrator = createAiOrchestrator();
const convexUrl = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? null;

const daemon = convexUrl ? new RenderDaemon({ convexUrl }) : null;
if (daemon) {
  // Run in the background; failures surface via /health.
  void daemon.runForever();
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization"
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseCardType(value: unknown): CardType | null {
  if (value === "unit" || value === "spell" || value === "artifact") {
    return value;
  }
  return null;
}

const server = Bun.serve({
  port,
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    const pathname = new URL(request.url).pathname;

    if (request.method === "GET" && pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "render-worker",
        ai: aiOrchestrator.getProviderStatus(),
        daemon: {
          enabled: Boolean(daemon),
          lastError: daemon?.lastError ?? null
        }
      });
    }

    if (request.method === "POST" && pathname === "/render") {
      try {
        const payload = await request.json();
        const result = await renderCardToPngBytes(payload);
        return jsonResponse({
          ok: true,
          result: {
            pngBase64: Buffer.from(result.pngBytes).toString("base64"),
            manifest: result.manifest
          }
        });
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          400
        );
      }
    }

    if (request.method === "POST" && pathname === "/ai/text") {
      try {
        const payload = (await request.json()) as Record<string, unknown>;
        const card = payload.card as Record<string, unknown> | undefined;

        const cardType = parseCardType(card?.type);
        const cardId = parseString(card?.cardId);
        const name = parseString(card?.name);
        const locale = parseString(card?.locale) ?? "en-US";

        if (!card || !cardType || !cardId || !name) {
          throw new Error("card.cardId, card.name, and valid card.type are required.");
        }

        const result = await aiOrchestrator.generateCardCopy({
          provider: payload.provider === "vercel_gateway" ? "vercel_gateway" : "openrouter",
          model: parseString(payload.model) ?? undefined,
          card: {
            cardId,
            name,
            type: cardType,
            locale,
            subtype: parseString(card.subtype) ?? undefined,
            rulesText: parseString(card.rulesText) ?? undefined,
            flavorText: parseString(card.flavorText) ?? undefined,
            designGoal: parseString(payload.designGoal) ?? undefined
          }
        });

        return jsonResponse({ ok: true, result });
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          400
        );
      }
    }

    if (request.method === "POST" && pathname === "/ai/art") {
      try {
        const payload = (await request.json()) as Record<string, unknown>;
        const prompt = parseString(payload.prompt);
        const cardId = parseString(payload.cardId);

        if (!prompt || !cardId) {
          throw new Error("cardId and prompt are required.");
        }

        const result = await aiOrchestrator.generateArt({
          provider: "fal",
          model: parseString(payload.model) ?? undefined,
          cardId,
          prompt,
          imageSize: parseString(payload.imageSize) ?? undefined
        });

        return jsonResponse({ ok: true, result });
      } catch (error) {
        return jsonResponse(
          { ok: false, error: error instanceof Error ? error.message : String(error) },
          400
        );
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS
    });
  }
});

console.log(`render-worker listening on http://localhost:${server.port}`);
