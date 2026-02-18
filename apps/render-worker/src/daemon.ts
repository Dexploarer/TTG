import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createInitialRuntimeState } from "@gambit/effect-engine";
import { renderCardToPngBytes } from "./renderer";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadToConvexStorage(uploadUrl: string, pngBytes: Uint8Array): Promise<Id<"_storage">> {
  const copy = Uint8Array.from(pngBytes);
  const body = new Blob([copy.buffer], { type: "image/png" });
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/png"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`upload failed (${response.status})`);
  }

  const data = (await response.json()) as { storageId?: string };
  if (!data.storageId || typeof data.storageId !== "string") {
    throw new Error("upload response missing storageId");
  }
  return data.storageId as Id<"_storage">;
}

export interface RenderDaemonOptions {
  convexUrl: string;
  enabled?: boolean;
}

export class RenderDaemon {
  private client: ConvexHttpClient;
  private stopped = false;
  public lastError: string | null = null;

  constructor(options: RenderDaemonOptions) {
    this.client = new ConvexHttpClient(options.convexUrl);
  }

  stop(): void {
    this.stopped = true;
  }

  async runForever(): Promise<void> {
    let backoffMs = 250;
    const maxBackoffMs = 5000;

    while (!this.stopped) {
      let job: any = null;
      try {
        job = await this.client.mutation(api.render.claimNextJob, {});
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.lastError = message;
        await sleep(backoffMs);
        backoffMs = Math.min(maxBackoffMs, backoffMs * 2);
        continue;
      }

      if (!job) {
        await sleep(backoffMs);
        backoffMs = Math.min(maxBackoffMs, backoffMs * 2);
        continue;
      }

      backoffMs = 250;

      try {
        const outputs: Array<Record<string, unknown>> = [];

        for (const cardId of job.cardIds) {
          const cardRecord = await this.client.query(api.cards.get, { cardId });
          if (!cardRecord) {
            throw new Error(`Card not found: ${cardId}`);
          }

          const templateRecord = await this.client.query(api.templates.get, { templateId: cardRecord.value.templateId });
          if (!templateRecord) {
            throw new Error(`Template not found: ${cardRecord.value.templateId}`);
          }

          const runtimeRecord = await this.client.query(api.runtime.getProjectedCard, { cardId });
          const runtime =
            runtimeRecord?.state ??
            createInitialRuntimeState({
              cardId,
              baseStats: cardRecord.value.baseStats ?? {}
            });

          const art = await this.client.query(api.art.getUrl, { artAssetId: cardRecord.value.artAssetId });
          const artUrl = art.url;
          const artVersion = art.version;

          const rendered = await renderCardToPngBytes({
            card: cardRecord.value,
            template: templateRecord.value,
            runtime,
            artUrl
          });

          const checksumSha256 = await sha256Hex(rendered.pngBytes);

          const uploadUrlResult = await this.client.mutation(api.files.generateUploadUrl, { purpose: "export" });
          const pngStorageId = await uploadToConvexStorage(uploadUrlResult.uploadUrl, rendered.pngBytes);

          await this.client.mutation(api.exports.upsertExport, {
            cardId,
            templateVersion: templateRecord.version,
            cardVersion: cardRecord.version,
            artVersion,
            pngStorageId,
            checksumSha256,
            manifest: rendered.manifest
          });

          outputs.push({
            cardId,
            pngStorageId,
            checksumSha256,
            templateVersion: templateRecord.version,
            cardVersion: cardRecord.version,
            artVersion
          });
        }

        await this.client.mutation(api.render.completeJob, {
          jobId: job.jobId,
          outputs
        });
        this.lastError = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.lastError = message;

        await this.client.mutation(api.render.completeJob, { jobId: job.jobId, outputs: [], error: message });

        await sleep(backoffMs);
        backoffMs = Math.min(maxBackoffMs, backoffMs * 2);
      }
    }
  }
}
