import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type Tab = "cards" | "effects" | "art";

const DEFAULT_CARDS_CSV = [
  "card_id,name,type,template_id,variant,rarity,art_asset_id,rules_text,flavor_text,locale,cost,attack,health,effect_id",
  "hall-monitor,Hall Monitor,unit,unit-base-v1,base,common,art-hall,When this unit enters, gain +1 attack this turn.,No running in the corridor.,en-US,1,1,2,boost-on-start"
].join("\n");

const DEFAULT_EFFECTS_CSV = [
  "effect_id,effect_json",
  "boost-on-start,\"{\\\"effectId\\\":\\\"boost-on-start\\\",\\\"triggers\\\":[{\\\"on\\\":\\\"TURN_START\\\",\\\"do\\\":[{\\\"type\\\":\\\"ADD_MODIFIER\\\",\\\"stat\\\":\\\"attack\\\",\\\"value\\\":1,\\\"duration\\\":\\\"turn\\\"}]}]}\""
].join("\n");

const DEFAULT_ART_CSV = ["art_asset_id,source_mode,source_uri", "art-hall,external,data:image/svg+xml;utf8,<svg/>"].join("\n");

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function CsvImportConsole() {
  const [tab, setTab] = useState<Tab>("cards");

  const [cardsCsv, setCardsCsv] = useState(DEFAULT_CARDS_CSV);
  const [effectsCsv, setEffectsCsv] = useState(DEFAULT_EFFECTS_CSV);
  const [artCsv, setArtCsv] = useState(DEFAULT_ART_CSV);

  const validateCards = useAction(api.imports.validateCsv);
  const applyCards = useMutation(api.imports.applyCsv);
  const validateEffects = useAction(api.imports.validateEffectsCsv);
  const applyEffects = useMutation(api.imports.applyEffectsCsv);
  const validateArt = useAction(api.imports.validateArtCsv);
  const applyArt = useMutation(api.imports.applyArtCsv);

  const history = useQuery(api.imports.history, {});

  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const diffPreview = useQuery(
    api.cards.diffPreview,
    tab === "cards" && result?.normalizedCards ? { cards: result.normalizedCards } : "skip"
  );

  const currentCsv = tab === "cards" ? cardsCsv : tab === "effects" ? effectsCsv : artCsv;
  const setCurrentCsv = tab === "cards" ? setCardsCsv : tab === "effects" ? setEffectsCsv : setArtCsv;

  const validate = async (): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      const next =
        tab === "cards"
          ? await validateCards({ csv: cardsCsv })
          : tab === "effects"
            ? await validateEffects({ csv: effectsCsv })
            : await validateArt({ csv: artCsv });
      setResult(next);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const apply = async (): Promise<void> => {
    setIsWorking(true);
    setError(null);
    try {
      const next =
        tab === "cards"
          ? await applyCards({ csv: cardsCsv })
          : tab === "effects"
            ? await applyEffects({ csv: effectsCsv })
            : await applyArt({ csv: artCsv });
      setResult(next);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  };

  const issues = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.issues)) return result.issues;
    if (result.importRecord?.issues) return result.importRecord.issues;
    return [];
  }, [result]);

  return (
    <section className="panel">
      <h2>CSV Import Console</h2>
      <p>Validate, diff, and apply updates from CSV. Cards CSV drives most authoring; effects/art are optional helpers.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={tab === "cards" ? "primary" : ""} onClick={() => setTab("cards")}>
          cards.csv
        </button>
        <button className={tab === "effects" ? "primary" : ""} onClick={() => setTab("effects")}>
          effects.csv
        </button>
        <button className={tab === "art" ? "primary" : ""} onClick={() => setTab("art")}>
          art.csv
        </button>
      </div>

      <textarea
        rows={10}
        value={currentCsv}
        onChange={(event) => setCurrentCsv(event.target.value)}
        style={{ marginTop: 10 }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={() => void validate()} disabled={isWorking}>
          {isWorking ? "Working..." : "Validate"}
        </button>
        <button className="primary" onClick={() => void apply()} disabled={isWorking}>
          Apply
        </button>
      </div>

      {error ? <p style={{ color: "#8a1f1f" }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 12 }}>
          {"ok" in result ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge">OK: {String(result.ok)}</span>
              <span className="badge">Rows: {String(result.rows ?? result.rowCount ?? "-")}</span>
              <span className="badge">Hash: {String(result.fileHash ?? result.importRecord?.fileHash ?? "").slice(0, 12)}...</span>
            </div>
          ) : null}

          {tab === "cards" && diffPreview ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <span className="badge">Inserts: {diffPreview.inserts.length}</span>
              <span className="badge">Updates: {diffPreview.updates.length}</span>
              <span className="badge">Unchanged: {diffPreview.unchanged.length}</span>
            </div>
          ) : null}

          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Row</th>
                <th>Column</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue: any, index: number) => (
                <tr key={`${issue.row}-${index}`}>
                  <td>{issue.severity}</td>
                  <td>{issue.row}</td>
                  <td>{issue.column ?? "-"}</td>
                  <td>{issue.message}</td>
                </tr>
              ))}
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={4}>No validation issues.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <h3>Import History</h3>
        {history === undefined ? (
          <p>Loading history...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Import ID</th>
                <th>Rows</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry: any) => (
                <tr key={entry._id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.kind}</td>
                  <td>{entry.importId}</td>
                  <td>{entry.rowCount}</td>
                  <td>{(entry.issues ?? []).filter((i: any) => i.severity === "error").length}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5}>No imports yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
