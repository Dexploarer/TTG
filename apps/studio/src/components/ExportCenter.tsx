import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function ExportCenter() {
  const cards = useQuery(api.cards.list, {});
  const manifest = useQuery(api.exports.getManifest, {});
  const enqueueBatch = useMutation(api.render.enqueueBatch);

  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const lastJob = useQuery(api.render.getJob, lastJobId ? { jobId: lastJobId } : "skip");

  const allCardIds = useMemo(() => (cards ? cards.map((c) => c.value.cardId) : []), [cards]);

  async function runBatchExport(): Promise<void> {
    if (!allCardIds.length) return;
    const job = await enqueueBatch({ cardIds: allCardIds });
    setLastJobId(job.jobId);
  }

  function downloadManifest(): void {
    if (!manifest) return;
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gambit-manifest-${manifest.generatedAt}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cards === undefined || manifest === undefined) {
    return <section className="panel">Loading export data...</section>;
  }

  return (
    <section className="panel">
      <h2>Export Center</h2>
      <p>Queue deterministic PNG exports. A render-worker daemon claims jobs and stores PNGs in Convex storage.</p>

      <button className="primary" onClick={() => void runBatchExport()} disabled={allCardIds.length === 0}>
        Export All Cards ({allCardIds.length})
      </button>

      {lastJob ? (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">Job: {lastJob.jobId}</span>
          <span className="badge">Status: {lastJob.status}</span>
          <span className="badge">Cards: {lastJob.cardIds.length}</span>
          <span className="badge">Outputs: {lastJob.outputs.length}</span>
          {lastJob.error ? <span className="badge">Error: {lastJob.error}</span> : null}
        </div>
      ) : lastJobId ? (
        <p style={{ marginTop: 10, color: "#4a4138" }}>Waiting for job record...</p>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <h3>Manifest</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge">Generated: {new Date(manifest.generatedAt).toLocaleString()}</span>
          <span className="badge">Entries: {manifest.entries.length}</span>
          <button onClick={downloadManifest} disabled={manifest.entries.length === 0}>
            Download Manifest JSON
          </button>
        </div>
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Card</th>
              <th>Template</th>
              <th>Card</th>
              <th>Art</th>
              <th>PNG</th>
              <th>Checksum</th>
            </tr>
          </thead>
          <tbody>
            {manifest.entries.map((entry: any) => (
              <tr key={entry.cardId}>
                <td>{entry.cardId}</td>
                <td>{entry.templateVersion}</td>
                <td>{entry.cardVersion}</td>
                <td>{entry.artVersion}</td>
                <td>
                  {entry.pngUrl ? (
                    <a href={entry.pngUrl} target="_blank" rel="noreferrer">
                      Open PNG
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={{ fontFamily: "monospace" }}>{entry.checksumSha256 ? String(entry.checksumSha256).slice(0, 10) : "-"}</td>
              </tr>
            ))}
            {manifest.entries.length === 0 ? (
              <tr>
                <td colSpan={6}>No exports yet. Queue a render job, then wait for the daemon to complete it.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
