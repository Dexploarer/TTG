import { useEffect, useMemo, useState } from "react";
import { convexLikeApi } from "@gambit/convex-api";

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

export function AiWorkshop() {
  const cards = convexLikeApi.cards.list();
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.value.cardId ?? "");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const selectedCard = useMemo(
    () =>
      cards.find((record) => record.value.cardId === selectedCardId)?.value ??
      cards[0]?.value ??
      null,
    [cards, selectedCardId, refreshNonce]
  );

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

        if (!cancelled) {
          setWorkerHealth(data);
        }
      } catch (error) {
        if (!cancelled) {
          setHealthError(toErrorMessage(error));
        }
      }
    }

    void fetchHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!selectedCard) {
    return <section className="panel">No cards available for AI generation.</section>;
  }

  async function generateCopy(): Promise<void> {
    if (!selectedCard) {
      return;
    }

    const card = selectedCard;
    setIsGeneratingCopy(true);
    setCopyError(null);

    try {
      const response = await fetch(`${RENDER_WORKER_URL}/ai/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: textProvider,
          model: textModel.trim() || undefined,
          designGoal: designGoal.trim() || undefined,
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

  function applyCopyToCard(): void {
    if (!selectedCard || !copyResult) {
      return;
    }

    const card = selectedCard;

    convexLikeApi.cards.upsertBatch([
      {
        ...card,
        name: copyResult.name,
        rulesText: copyResult.rulesText,
        flavorText: copyResult.flavorText
      }
    ]);

    setSelectedCardId(card.cardId);
    setRefreshNonce((value) => value + 1);
  }

  async function generateArt(): Promise<void> {
    if (!selectedCard) {
      return;
    }

    const card = selectedCard;
    setIsGeneratingArt(true);
    setArtError(null);

    try {
      if (!artPrompt.trim()) {
        throw new Error("Art prompt is required.");
      }

      const response = await fetch(`${RENDER_WORKER_URL}/ai/art`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cardId: card.cardId,
          model: falModel.trim() || undefined,
          prompt: artPrompt.trim(),
          imageSize: artImageSize.trim() || undefined
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

  function applyArtToCard(): void {
    if (!selectedCard || !artResult) {
      return;
    }

    const card = selectedCard;

    convexLikeApi.cards.upsertBatch([
      {
        ...card,
        artAssetId: artResult.assetId
      }
    ]);

    setRefreshNonce((value) => value + 1);
  }

  return (
    <section className="panel">
      <h2>AI Workshop</h2>
      <p>Generate premium card copy with OpenRouter or Vercel AI Gateway, then create art assets via FAL.</p>

      <div style={{ marginBottom: 8 }}>
        <span className="badge">Worker: {workerHealth ? "online" : "offline"}</span>
        <span className="badge">OpenRouter: {workerHealth?.ai.openrouterConfigured ? "ready" : "missing key"}</span>
        <span className="badge">AI Gateway: {workerHealth?.ai.aiGatewayConfigured ? "ready" : "missing key"}</span>
        <span className="badge">FAL: {workerHealth?.ai.falConfigured ? "ready" : "missing key"}</span>
      </div>

      {healthError && <p style={{ color: "#8a1f1f", marginTop: 0 }}>{healthError}</p>}

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
            <select
              value={textProvider}
              onChange={(event) => setTextProvider(event.target.value as TextProvider)}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="vercel_gateway">Vercel AI Gateway</option>
            </select>
          </label>

          <label>
            Model Override (optional)
            <input
              value={textModel}
              onChange={(event) => setTextModel(event.target.value)}
              placeholder={
                textProvider === "openrouter"
                  ? "openai/gpt-4o-mini"
                  : "openai/gpt-4.1-mini"
              }
            />
          </label>

          <label>
            Design Goal (optional)
            <textarea
              rows={4}
              value={designGoal}
              onChange={(event) => setDesignGoal(event.target.value)}
              placeholder="e.g. make the card feel tactical, defensive, and school-themed"
            />
          </label>

          <button className="primary" onClick={() => void generateCopy()} disabled={isGeneratingCopy}>
            {isGeneratingCopy ? "Generating..." : "Generate Copy"}
          </button>

          {copyError && <p style={{ color: "#8a1f1f" }}>{copyError}</p>}

          {copyResult && (
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
              <button onClick={applyCopyToCard}>Apply Copy To Card</button>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Art Generation (FAL)</h3>
          <label>
            FAL Model
            <input value={falModel} onChange={(event) => setFalModel(event.target.value)} />
          </label>

          <label>
            Image Size
            <input
              value={artImageSize}
              onChange={(event) => setArtImageSize(event.target.value)}
              placeholder="portrait_4_3"
            />
          </label>

          <label>
            Art Prompt
            <textarea
              rows={5}
              value={artPrompt}
              onChange={(event) => setArtPrompt(event.target.value)}
              placeholder="Detailed visual prompt for card art"
            />
          </label>

          <button className="primary" onClick={() => void generateArt()} disabled={isGeneratingArt}>
            {isGeneratingArt ? "Generating..." : "Generate Art"}
          </button>

          {artError && <p style={{ color: "#8a1f1f" }}>{artError}</p>}

          {artResult && (
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
              <button style={{ marginTop: 8 }} onClick={applyArtToCard}>
                Apply Art Asset To Card
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
