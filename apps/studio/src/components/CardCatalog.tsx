import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { CardDefinition, VariantTag } from "@gambit/template-schema";
import { api } from "../../../../convex/_generated/api";

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function CardCatalog() {
  const cards = useQuery(api.cards.list, {});
  const templates = useQuery(api.templates.list, {});
  const artAssets = useQuery(api.art.list, {});
  const upsertBatch = useMutation(api.cards.upsertBatch);

  const [cardId, setCardId] = useState("");

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    if (cardId.length === 0) {
      setCardId(cards[0]!.value.cardId);
    }
  }, [cards, cardId]);

  const selected = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards.find((record) => record.value.cardId === cardId)?.value ?? cards[0]?.value ?? null;
  }, [cards, cardId]);

  const [draft, setDraft] = useState<CardDefinition | null>(null);

  useEffect(() => {
    if (!selected) return;
    setDraft(selected);
  }, [selected?.cardId, selected?.name, selected?.artAssetId, selected?.rulesText, selected?.flavorText]);

  if (cards === undefined || templates === undefined || artAssets === undefined) {
    return <section className="panel">Loading cards...</section>;
  }

  if (!selected || !draft) {
    return <section className="panel">No cards yet.</section>;
  }

  async function save(): Promise<void> {
    await upsertBatch({ cards: [draft] as any });
  }

  const variantOptions: VariantTag[] = ["base", "foil", "alt_art", "promo"];

  return (
    <section className="panel">
      <h2>Card Catalog</h2>
      <div className="grid-2">
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Variant</th>
                <th>Rarity</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((record) => (
                <tr
                  key={record.value.cardId}
                  onClick={() => setCardId(record.value.cardId)}
                  style={{ cursor: "pointer", background: record.value.cardId === selected.cardId ? "rgba(0,0,0,0.04)" : undefined }}
                >
                  <td>{record.value.name}</td>
                  <td>{record.value.type}</td>
                  <td>{record.value.variant}</td>
                  <td>{record.value.rarity}</td>
                </tr>
              ))}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={4}>No cards yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <label>
            Name
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>

          <label>
            Template
            <select
              value={draft.templateId}
              onChange={(event) => setDraft({ ...draft, templateId: event.target.value })}
            >
              {templates.map((t) => (
                <option key={t.value.templateId} value={t.value.templateId}>
                  {t.value.templateId}
                </option>
              ))}
            </select>
          </label>

          <label>
            Variant
            <select
              value={draft.variant}
              onChange={(event) => setDraft({ ...draft, variant: event.target.value as VariantTag })}
            >
              {variantOptions.map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </label>

          <label>
            Art Asset
            <select
              value={draft.artAssetId}
              onChange={(event) => setDraft({ ...draft, artAssetId: event.target.value })}
            >
              {artAssets.map((a) => (
                <option key={a.artAssetId} value={a.artAssetId}>
                  {a.artAssetId} (v{a.version})
                </option>
              ))}
            </select>
          </label>

          <label>
            Rules Text
            <textarea
              rows={5}
              value={draft.rulesText}
              onChange={(event) => setDraft({ ...draft, rulesText: event.target.value })}
            />
          </label>

          <label>
            Flavor Text
            <textarea
              rows={4}
              value={draft.flavorText}
              onChange={(event) => setDraft({ ...draft, flavorText: event.target.value })}
            />
          </label>

          <div className="grid-3">
            <label>
              Cost
              <input
                value={draft.baseStats.cost ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    baseStats: { ...draft.baseStats, cost: toNumberOrUndefined(event.target.value) }
                  })
                }
              />
            </label>

            <label>
              ATK
              <input
                value={draft.baseStats.attack ?? ""}
                disabled={draft.type === "spell"}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    baseStats: { ...draft.baseStats, attack: toNumberOrUndefined(event.target.value) }
                  })
                }
              />
            </label>

            <label>
              HP
              <input
                value={draft.baseStats.health ?? ""}
                disabled={draft.type === "spell"}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    baseStats: { ...draft.baseStats, health: toNumberOrUndefined(event.target.value) }
                  })
                }
              />
            </label>
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="primary" onClick={() => void save()}>
              Save Card
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

