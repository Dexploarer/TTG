import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { CardType } from "@gambit/template-schema";

const RENDER_WORKER_URL = import.meta.env.VITE_RENDER_WORKER_URL ?? "http://localhost:8788";

type TextProvider = "openrouter" | "vercel_gateway";

interface WorkerHealth {
  ok: boolean;
  service: string;
  ai: {
    openrouterConfigured: boolean;
    aiGatewayConfigured: boolean;
    falConfigured: boolean;
  };
  daemon?: {
    enabled: boolean;
    lastError: string | null;
  };
}

interface GeneratedCopy {
  provider: TextProvider;
  model: string;
  name: string;
  rulesText: string;
  flavorText: string;
  artPrompt: string;
}

interface GeneratedArt {
  provider: "fal";
  model: string;
  assetId: string;
  sourceUri: string;
  prompt: string;
  imageSize: string;
}

interface WorkerResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

export function AiWorkshop() {
  const cards = useQuery(api.cards.list, {});
  const upsertCards = useMutation(api.cards.upsertBatch);
  const upsertArt = useMutation(api.art.upsert);

  const [selectedCardId, setSelectedCardId] = useState("");
  const selectedCard = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards.find((record) => record.value.cardId === selectedCardId)?.value ?? cards[0]?.value ?? null;
  }, [cards, selectedCardId]);

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    if (!selectedCardId) setSelectedCardId(cards[0]!.value.cardId);
  }, [cards, selectedCardId]);

  const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [textProvider, setTextProvider] = useState<TextProvider>("openrouter");
  const [textModel, setTextModel] = useState("");
  const [designGoal, setDesignGoal] = useState("");
  const [copyResult, setCopyResult] = useState<GeneratedCopy | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  const [falModel, setFalModel] = useState("fal-ai/flux/dev");
  const [artPrompt, setArtPrompt] = useState("");
  const [artImageSize, setArtImageSize] = useState("portrait_4_3");
  const [artResult, setArtResult] = useState<GeneratedArt | null>(null);
  const [artError, setArtError] = useState<string | null>(null);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth(): Promise<void> {
      try {
        setHealthError(null);
        const response = await fetch(`${RENDER_WORKER_URL}/health`);
        const data = (await response.json()) as WorkerHealth;
        if (!response.ok) {
          throw new Error("render-worker health check failed");
        }
        if (!cancelled) setWorkerHealth(data);
      } catch (error) {
        if (!cancelled) setHealthError(toErrorMessage(error));
      }
    }

    void fetchHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (cards === undefined) {
    return <section className="panel">Loading cards...</section>;
  }

  if (!selectedCard) {
    return <section className="panel">No cards available for AI generation.</section>;
  }

  async function generateCopy(): Promise<void> {
    const card = selectedCard;
    setIsGeneratingCopy(true);
    setCopyError(null);

    try {
      const response = await fetch(`${RENDER_WORKER_URL}/ai/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: textProvider,
          model: parseString(textModel) ?? undefined,
          designGoal: parseString(designGoal) ?? undefined,
          card: {
            cardId: card.cardId,
            name: card.name,
            type: card.type,
            subtype: card.subtype,
            locale: card.locale,
            rulesText: card.rulesText,
            flavorText: card.flavorText
          }
        })
      });

      const data = (await response.json()) as WorkerResult<GeneratedCopy>;
      const result = data.result;
      if (!response.ok || !data.ok || !result) {
        throw new Error(data.error ?? "text generation failed");
      }

      setCopyResult(result);
      setArtPrompt((existing) => existing || result.artPrompt);
    } catch (error) {
      setCopyError(toErrorMessage(error));
    } finally {
      setIsGeneratingCopy(false);
    }
  }

  async function applyCopyToCard(): Promise<void> {
    if (!copyResult) return;
    const card = selectedCard;

    await upsertCards({
      cards: [
        {
          ...card,
          name: copyResult.name,
          rulesText: copyResult.rulesText,
          flavorText: copyResult.flavorText
        }
      ] as any
    });
  }

  async function generateArt(): Promise<void> {
    const card = selectedCard;
    setIsGeneratingArt(true);
    setArtError(null);

    try {
      if (!artPrompt.trim()) {
        throw new Error("Art prompt is required.");
      }

      const response = await fetch(`${RENDER_WORKER_URL}/ai/art`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.cardId,
          model: parseString(falModel) ?? undefined,
          prompt: artPrompt.trim(),
          imageSize: parseString(artImageSize) ?? undefined
        })
      });

      const data = (await response.json()) as WorkerResult<GeneratedArt>;
      if (!response.ok || !data.ok || !data.result) {
        throw new Error(data.error ?? "art generation failed");
      }

      setArtResult(data.result);
    } catch (error) {
      setArtError(toErrorMessage(error));
    } finally {
      setIsGeneratingArt(false);
    }
  }

  async function applyArtToCard(): Promise<void> {
    if (!artResult) return;
    const card = selectedCard;

    await upsertArt({
      artAssetId: artResult.assetId,
      sourceMode: "ai_fal",
      sourceUri: artResult.sourceUri,
      prompt: artResult.prompt,
      provider: "fal"
    });

    await upsertCards({
      cards: [{ ...card, artAssetId: artResult.assetId }] as any
    });
  }

  return (
    <section className="panel">
      <h2>AI Workshop</h2>
      <p>Generate premium card copy with OpenRouter/Vercel AI Gateway, and optionally create art via FAL.</p>

      <div style={{ marginBottom: 8 }}>
        <span className="badge">Worker: {workerHealth ? "online" : "offline"}</span>
        <span className="badge">OpenRouter: {workerHealth?.ai.openrouterConfigured ? "ready" : "missing key"}</span>
        <span className="badge">AI Gateway: {workerHealth?.ai.aiGatewayConfigured ? "ready" : "missing key"}</span>
        <span className="badge">FAL: {workerHealth?.ai.falConfigured ? "ready" : "missing key"}</span>
        {workerHealth?.daemon ? (
          <span className="badge">Daemon: {workerHealth.daemon.enabled ? "enabled" : "disabled"}</span>
        ) : null}
      </div>

      {workerHealth?.daemon?.lastError ? (
        <p style={{ color: "#8a1f1f", marginTop: 0 }}>
          Daemon error: {workerHealth.daemon.lastError}
        </p>
      ) : null}

      {healthError ? <p style={{ color: "#8a1f1f", marginTop: 0 }}>{healthError}</p> : null}

      <div className="grid-2">
        <div>
          <label>
            Card
            <select value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}>
              {cards.map((record) => (
                <option key={record.value.cardId} value={record.value.cardId}>
                  {record.value.name} ({record.value.type})
                </option>
              ))}
            </select>
          </label>

          <label>
            Text Provider
            <select value={textProvider} onChange={(event) => setTextProvider(event.target.value as TextProvider)}>
              <option value="openrouter">OpenRouter</option>
              <option value="vercel_gateway">Vercel AI Gateway</option>
            </select>
          </label>

          <label>
            Model Override (optional)
            <input
              value={textModel}
              onChange={(event) => setTextModel(event.target.value)}
              placeholder={textProvider === "openrouter" ? "openai/gpt-4o-mini" : "openai/gpt-4.1-mini"}
            />
          </label>

          <label>
            Design Goal (optional)
            <textarea
              rows={4}
              value={designGoal}
              onChange={(event) => setDesignGoal(event.target.value)}
              placeholder="e.g. tactical, defensive, school-themed"
            />
          </label>

          <button className="primary" onClick={() => void generateCopy()} disabled={isGeneratingCopy}>
            {isGeneratingCopy ? "Generating..." : "Generate Copy"}
          </button>

          {copyError ? <p style={{ color: "#8a1f1f" }}>{copyError}</p> : null}

          {copyResult ? (
            <div style={{ marginTop: 10 }}>
              <h3 style={{ margin: "4px 0" }}>Generated Copy</h3>
              <p style={{ margin: "4px 0" }}>
                <strong>Name:</strong> {copyResult.name}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Rules:</strong> {copyResult.rulesText}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Flavor:</strong> {copyResult.flavorText}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Art Prompt:</strong> {copyResult.artPrompt}
              </p>
              <button onClick={() => void applyCopyToCard()}>Apply Copy To Card</button>
            </div>
          ) : null}
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Art Generation (FAL)</h3>
          <p style={{ marginTop: 0, color: "#4a4138" }}>
            If FAL is blocked, use the Art Assets page to upload images instead (recommended v1 workflow).
          </p>

          <label>
            FAL Model
            <input value={falModel} onChange={(event) => setFalModel(event.target.value)} />
          </label>

          <label>
            Image Size
            <input value={artImageSize} onChange={(event) => setArtImageSize(event.target.value)} placeholder="portrait_4_3" />
          </label>

          <label>
            Art Prompt
            <textarea rows={5} value={artPrompt} onChange={(event) => setArtPrompt(event.target.value)} />
          </label>

          <button className="primary" onClick={() => void generateArt()} disabled={isGeneratingArt}>
            {isGeneratingArt ? "Generating..." : "Generate Art"}
          </button>

          {artError ? <p style={{ color: "#8a1f1f" }}>{artError}</p> : null}

          {artResult ? (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: "4px 0" }}>
                <strong>Asset ID:</strong> {artResult.assetId}
              </p>
              <p style={{ margin: "4px 0" }}>
                <strong>Source URI:</strong> {artResult.sourceUri}
              </p>
              <img
                src={artResult.sourceUri}
                alt="Generated card art"
                style={{ width: "100%", border: "2px solid var(--line)", marginTop: 8 }}
              />
              <button style={{ marginTop: 8 }} onClick={() => void applyArtToCard()}>
                Save Art + Assign To Card
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

