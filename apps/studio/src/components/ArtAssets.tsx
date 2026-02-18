import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function ArtAssets() {
  const assets = useQuery(api.art.list, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const upsertArt = useMutation(api.art.upsert);

  const [selectedId, setSelectedId] = useState<string>("");
  const selectedUrl = useQuery(
    api.art.getUrl,
    selectedId ? { artAssetId: selectedId } : "skip"
  );

  const [artAssetId, setArtAssetId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedId = useMemo(() => {
    if (!file) return "";
    const base = file.name.replace(/\.[^.]+$/, "");
    return `art-${slugify(base)}`;
  }, [file]);

  async function upload(): Promise<void> {
    if (!file) return;
    const id = (artAssetId.trim() || suggestedId).trim();
    if (!id) {
      setError("artAssetId is required.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const { uploadUrl } = await generateUploadUrl({ purpose: "art" });

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status}).`);
      }

      const data = (await response.json()) as { storageId?: string };
      if (!data.storageId) {
        throw new Error("Upload response missing storageId.");
      }

      await upsertArt({
        artAssetId: id,
        sourceMode: "upload",
        storageId: data.storageId as any
      });

      setSelectedId(id);
      setArtAssetId("");
      setFile(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  if (assets === undefined) {
    return <section className="panel">Loading art assets...</section>;
  }

  return (
    <section className="panel">
      <h2>Art Assets</h2>
      <p>Upload art to Convex storage (primary v1 art workflow). Use Card Catalog to assign `artAssetId` to cards.</p>

      <div className="grid-2">
        <div>
          <h3 style={{ marginTop: 0 }}>Upload</h3>
          <label>
            File (png/jpg/webp/svg)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <label>
            Art Asset ID (optional)
            <input
              value={artAssetId}
              onChange={(event) => setArtAssetId(event.target.value)}
              placeholder={suggestedId || "art-my-asset"}
            />
          </label>

          <button className="primary" onClick={() => void upload()} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload Art"}
          </button>

          {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Library</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span className="badge">Assets: {assets.length}</span>
            {selectedId ? <span className="badge">Selected: {selectedId}</span> : null}
            {selectedUrl ? <span className="badge">Version: {selectedUrl.version}</span> : null}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mode</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.artAssetId}
                  onClick={() => setSelectedId(asset.artAssetId)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{asset.artAssetId}</td>
                  <td>{asset.sourceMode}</td>
                  <td>{asset.version}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={3}>No art assets yet.</td>
                </tr>
              )}
            </tbody>
          </table>

          {selectedUrl?.url ? (
            <div style={{ marginTop: 10 }}>
              <img
                src={selectedUrl.url}
                alt={`Art ${selectedId}`}
                style={{ width: "100%", border: "2px solid var(--line)" }}
              />
            </div>
          ) : selectedId ? (
            <p style={{ marginTop: 10, color: "#4a4138" }}>No resolvable URL for this asset.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
