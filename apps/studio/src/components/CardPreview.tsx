import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useQuery } from "convex/react";
import { getBindValue, resolveOverlays } from "@gambit/card-renderer";
import type { CardDefinition, CardTemplateManifest, OverlayRule } from "@gambit/template-schema";
import { api } from "../../../../convex/_generated/api";

function overlayBackground(src: string): string | null {
  if (src === "overlay://foil") {
    return "linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 35%, rgba(160,255,220,0.25) 50%, rgba(255,255,255,0.45) 65%, rgba(255,255,255,0) 100%)";
  }
  if (src === "overlay://alt") {
    return "linear-gradient(180deg, rgba(10,10,10,0.06), rgba(10,10,10,0))";
  }
  if (src === "overlay://promo") {
    return "radial-gradient(circle at 78% 18%, rgba(255,235,130,0.45), rgba(255,235,130,0) 55%)";
  }
  return null;
}

function blendModeToCss(mode: OverlayRule["blendMode"]): CSSProperties["mixBlendMode"] {
  switch (mode) {
    case "screen":
      return "screen";
    case "multiply":
      return "multiply";
    case "overlay":
      return "overlay";
    default:
      return "normal";
  }
}

function Region({
  template,
  card,
  runtime,
  artUrl,
  region
}: {
  template: CardTemplateManifest;
  card: CardDefinition;
  runtime: any;
  artUrl: string | null;
  region: CardTemplateManifest["dynamicRegions"][number];
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${region.rect.x * 100}%`,
    top: `${region.rect.y * 100}%`,
    width: `${region.rect.w * 100}%`,
    height: `${region.rect.h * 100}%`,
    zIndex: region.zIndex,
    overflow: "hidden"
  };

  if (region.kind === "art_slot") {
    return (
      <div style={{ ...style, borderRadius: 10, border: "3px solid rgba(20,20,20,0.85)", background: "#e4dacb" }}>
        {artUrl ? (
          <img src={artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, letterSpacing: "0.12em", color: "rgba(20,20,20,0.55)" }}>
            NO ART
          </div>
        )}
      </div>
    );
  }

  const value = getBindValue(region.bindKey, card, runtime);
  const text = value === undefined ? "" : typeof value === "number" ? String(value) : value;

  const isStat = region.kind === "stat";
  const base = isStat
    ? template.textStyles.stat ?? template.textStyles.title ?? template.textStyles.body
    : region.bindKey === "card.name"
      ? template.textStyles.title ?? template.textStyles.body
      : region.bindKey === "card.flavorText"
        ? template.textStyles.flavor ?? template.textStyles.body
        : template.textStyles.body ?? template.textStyles.title;

  const fontSize = base?.fontSize ?? (isStat ? 36 : 22);
  const fontWeight = base?.fontWeight ?? (isStat ? 900 : 500);

  return (
    <div
      style={{
        ...style,
        padding: isStat ? 0 : "8px 10px",
        fontFamily: `${base?.fontFamily ?? "Arial"}, Arial, sans-serif`,
        fontSize,
        fontWeight,
        color: base?.color ?? "#1a1a1a",
        display: isStat ? "flex" : "block",
        alignItems: isStat ? "center" : undefined,
        justifyContent: isStat ? "center" : undefined,
        whiteSpace: isStat ? "nowrap" : "pre-wrap",
        fontStyle: region.bindKey === "card.flavorText" ? "italic" : "normal",
        textShadow: isStat ? "0 2px 0 rgba(255,255,255,0.6)" : undefined
      }}
      title={region.bindKey}
    >
      {text}
    </div>
  );
}

function CardCanvas({
  template,
  card,
  runtime,
  artUrl
}: {
  template: CardTemplateManifest;
  card: CardDefinition;
  runtime: any;
  artUrl: string | null;
}) {
  const width = 360;
  const height = Math.round((width * template.baseResolution.height) / template.baseResolution.width);

  const overlays = resolveOverlays(template, card.variant);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        border: "12px solid #161616",
        boxShadow: "inset 0 0 0 4px #1f1f1f",
        background: "radial-gradient(circle at top left, #fff7e9, #e8decf)",
        overflow: "hidden"
      }}
    >
      {template.layers
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((layer) => {
          if (layer.kind === "image" && layer.src) {
            return (
              <img
                key={layer.layerId}
                src={layer.src}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: layer.opacity ?? 1,
                  zIndex: layer.zIndex
                }}
              />
            );
          }
          if (layer.kind === "shape") {
            return (
              <div
                key={layer.layerId}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: layer.zIndex,
                  opacity: layer.opacity ?? 1,
                  pointerEvents: "none"
                }}
              />
            );
          }
          return null;
        })}

      {template.dynamicRegions
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((region) => (
          <Region key={region.regionId} template={template} card={card} runtime={runtime} artUrl={artUrl} region={region} />
        ))}

      {(overlays as OverlayRule[]).map((overlay) => {
        const bg = overlayBackground(overlay.src);
        return bg ? (
          <div
            key={overlay.id}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 999,
              pointerEvents: "none",
              opacity: overlay.opacity ?? 1,
              mixBlendMode: blendModeToCss(overlay.blendMode),
              background: bg
            }}
          />
        ) : null;
      })}
    </div>
  );
}

export function CardPreview() {
  const cards = useQuery(api.cards.list, {});
  const templates = useQuery(api.templates.list, {});

  const [cardId, setCardId] = useState("");

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    if (cardId.length === 0) setCardId(cards[0]!.value.cardId);
  }, [cards, cardId]);

  const card = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards.find((c) => c.value.cardId === cardId)?.value ?? cards[0]?.value ?? null;
  }, [cards, cardId]);

  const template = useMemo(() => {
    if (!card || !templates) return null;
    return templates.find((t) => t.value.templateId === card.templateId)?.value ?? null;
  }, [templates, card?.templateId]);

  const runtime = useQuery(api.runtime.getProjectedCard, card ? { cardId: card.cardId } : "skip");
  const art = useQuery(api.art.getUrl, card ? { artAssetId: card.artAssetId } : "skip");

  if (cards === undefined || templates === undefined) {
    return null;
  }

  if (!card || !template || !runtime) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Live Preview</h2>
      <div className="grid-2">
        <div>
          <label>
            Card
            <select value={cardId} onChange={(event) => setCardId(event.target.value)}>
              {cards.map((c) => (
                <option key={c.value.cardId} value={c.value.cardId}>
                  {c.value.name} ({c.value.type}/{c.value.variant})
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Template: {template.templateId}</span>
            <span className="badge">ATK: {runtime.state.derivedStats.attack ?? 0}</span>
            <span className="badge">HP: {runtime.state.derivedStats.health ?? 0}</span>
            <span className="badge">COST: {runtime.state.derivedStats.cost ?? 0}</span>
            <span className="badge">Art v{art?.version ?? 0}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "end" }}>
          <CardCanvas template={template} card={card} runtime={runtime.state} artUrl={art?.url ?? null} />
        </div>
      </div>
    </section>
  );
}
