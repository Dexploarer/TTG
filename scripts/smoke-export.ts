import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name}.`);
  }
  return value.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const convexUrl = process.env.CONVEX_URL?.trim() || process.env.VITE_CONVEX_URL?.trim() || "";
  if (!convexUrl) {
    throw new Error("Set CONVEX_URL (or VITE_CONVEX_URL) before running this smoke test.");
  }

  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "60000");

  const client = new ConvexHttpClient(convexUrl);

  await client.mutation(api.seed.bootstrap, {});

  const cards = await client.query(api.cards.list, {});
  const first = cards[0]?.value;
  if (!first) {
    throw new Error("No cards found after seed.bootstrap.");
  }

  const job = await client.mutation(api.render.enqueueCard, { cardId: first.cardId });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await client.query(api.render.getJob, { jobId: job.jobId });
    if (!current) {
      await sleep(250);
      continue;
    }

    if (current.status === "queued" || current.status === "running") {
      await sleep(500);
      continue;
    }

    if (current.status === "failed") {
      throw new Error(`Render job failed: ${current.error ?? "unknown error"}`);
    }

    const manifest = await client.query(api.exports.getManifest, {});
    const entry = (manifest.entries as any[]).find((e) => e.cardId === first.cardId);
    if (!entry) {
      throw new Error("Export manifest missing entry for rendered card.");
    }
    if (!entry.pngUrl) {
      throw new Error("Export entry missing pngUrl (storage URL could not be resolved).");
    }

    // eslint-disable-next-line no-console
    console.log(`OK: ${first.cardId}`);
    // eslint-disable-next-line no-console
    console.log(`pngUrl: ${entry.pngUrl}`);
    return;
  }

  throw new Error(`Timed out waiting for render job. Is render-worker running with CONVEX_URL set? (jobId=${job.jobId})`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

