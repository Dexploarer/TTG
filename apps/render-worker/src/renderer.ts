import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";
import { getBindValue, resolveOverlays } from "@gambit/card-renderer";
import type { CardRuntimeState } from "@gambit/effect-engine";
import type { CardDefinition, CardTemplateManifest, OverlayRule, TemplateLayer, TextStyleToken } from "@gambit/template-schema";

export interface RenderRequest {
  card: CardDefinition;
  template: CardTemplateManifest;
  runtime: CardRuntimeState;
  artUrl?: string | null;
}

export interface RenderResult {
  pngBytes: Uint8Array;
  manifest: Record<string, unknown>;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function guessMime(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function inlineLocalAsset(src: string): Promise<string> {
  if (!src.startsWith("/")) return src;

  const filepath = resolve(process.cwd(), "../studio/public", `.${src}`);
  try {
    const bytes = await readFile(filepath);
    const mime = guessMime(filepath);
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return src;
  }
}

function blendModeToCss(mode: OverlayRule["blendMode"] | TemplateLayer["blendMode"]): string {
  switch (mode) {
    case "screen":
      return "screen";
    case "multiply":
      return "multiply";
    case "overlay":
      return "overlay";
    case "normal":
    default:
      return "normal";
  }
}

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

function pickTextStyle(template: CardTemplateManifest, bindKey: string, kind: string): TextStyleToken {
  const fallback: TextStyleToken = {
    fontFamily: "Arial",
    fontSize: 22,
    fontWeight: 500,
    color: "#1a1a1a"
  };

  if (kind === "stat") {
    return template.textStyles.stat ?? template.textStyles.title ?? template.textStyles.body ?? fallback;
  }

  if (bindKey === "card.name") {
    return template.textStyles.title ?? template.textStyles.body ?? fallback;
  }

  if (bindKey === "card.flavorText") {
    return template.textStyles.flavor ?? template.textStyles.body ?? fallback;
  }

  return template.textStyles.body ?? template.textStyles.title ?? fallback;
}

function styleToCss(token: TextStyleToken): string {
  const align = token.align ?? "left";
  const lineHeight = token.lineHeight ?? 1.15;
  return [
    `font-family:${escapeHtml(token.fontFamily)}, Arial, sans-serif`,
    `font-size:${token.fontSize}px`,
    `font-weight:${token.fontWeight}`,
    `color:${token.color}`,
    `text-align:${align}`,
    `line-height:${lineHeight}`
  ].join(";");
}

function layerHtml(layer: TemplateLayer, src: string | undefined): string {
  const opacity = layer.opacity ?? 1;
  const blend = blendModeToCss(layer.blendMode);

  if (layer.kind === "image" && src) {
    return `<img class="layer" data-kind="image" alt="" src="${escapeHtml(src)}" style="z-index:${layer.zIndex};opacity:${opacity};mix-blend-mode:${blend};"/>`;
  }

  if (layer.kind === "shape") {
    const style =
      layer.layerId === "paper"
        ? "background:radial-gradient(circle at top left, #fff7e9, #e8decf);"
        : layer.layerId === "frame"
          ? "border:12px solid #161616; box-shadow: inset 0 0 0 4px #1f1f1f;"
          : "border:2px solid rgba(20,20,20,0.2);";
    return `<div class="layer" data-kind="shape" style="z-index:${layer.zIndex};opacity:${opacity};mix-blend-mode:${blend};${style}"></div>`;
  }

  return "";
}

function regionHtml(
  template: CardTemplateManifest,
  card: CardDefinition,
  runtime: CardRuntimeState,
  artUrl: string | null | undefined,
  region: CardTemplateManifest["dynamicRegions"][number]
): string {
  const left = `${region.rect.x * 100}%`;
  const top = `${region.rect.y * 100}%`;
  const width = `${region.rect.w * 100}%`;
  const height = `${region.rect.h * 100}%`;
  const baseStyle = `left:${left};top:${top};width:${width};height:${height};z-index:${region.zIndex};`;

  if (region.kind === "art_slot") {
    const src = artUrl ?? "";
    if (!src) {
      return `<div class="region region-art" style="${baseStyle}"><div class="art-placeholder">NO ART</div></div>`;
    }
    return `<div class="region region-art" style="${baseStyle}"><img alt="" src="${escapeHtml(src)}" /></div>`;
  }

  const value = getBindValue(region.bindKey, card, runtime);
  const text = value === undefined ? "" : typeof value === "number" ? String(value) : value;
  const token = pickTextStyle(template, region.bindKey, region.kind);
  const css = styleToCss(token);
  const classes = ["region", region.kind === "stat" ? "region-stat" : "region-text"].join(" ");

  const extra =
    region.bindKey === "card.flavorText"
      ? "font-style:italic;"
      : "";

  return `<div class="${classes}" data-autofit="${region.autoFit ? "true" : "false"}" style="${baseStyle}${css};${extra}">${escapeHtml(
    text
  )}</div>`;
}

let browserPromise: ReturnType<typeof chromium.launch> | null = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return await browserPromise;
}

async function buildHtml(request: RenderRequest): Promise<{ html: string; overlayIds: string[] }> {
  const width = request.template.baseResolution.width;
  const height = request.template.baseResolution.height;

  const resolvedLayers = await Promise.all(
    [...request.template.layers].sort((a, b) => a.zIndex - b.zIndex).map(async (layer) => {
      const src = layer.src ? await inlineLocalAsset(layer.src) : undefined;
      return layerHtml(layer, src);
    })
  );

  const overlays = resolveOverlays(request.template, request.card.variant);
  const resolvedOverlays = await Promise.all(
    overlays.map(async (overlay) => {
      const opacity = overlay.opacity ?? 1;
      const blend = blendModeToCss(overlay.blendMode);
      const bg = overlayBackground(overlay.src);
      if (bg) {
        return `<div class="overlay" style="z-index:999;opacity:${opacity};mix-blend-mode:${blend};background:${bg};"></div>`;
      }

      const src = await inlineLocalAsset(overlay.src);
      return `<img class="overlay" alt="" src="${escapeHtml(src)}" style="z-index:999;opacity:${opacity};mix-blend-mode:${blend};" />`;
    })
  );

  const regions = [...request.template.dynamicRegions].sort((a, b) => a.zIndex - b.zIndex);
  const regionHtmlList = regions
    .map((region) => regionHtml(request.template, request.card, request.runtime, request.artUrl, region))
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; animation: none !important; transition: none !important; }
      html, body { margin: 0; padding: 0; }
      body { background: transparent; }
      .card { width: ${width}px; height: ${height}px; position: relative; overflow: hidden; background: #f2eadf; }
      .layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .overlay { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
      .region { position: absolute; padding: 8px 10px; overflow: hidden; }
      .region-stat { display: flex; align-items: center; justify-content: center; padding: 0; text-shadow: 0 2px 0 rgba(255,255,255,0.6); }
      .region-text { white-space: pre-wrap; }
      .region-art { padding: 0; border-radius: 10px; overflow: hidden; border: 3px solid rgba(20,20,20,0.85); background: linear-gradient(135deg, #c8b59f, #f5ede3); }
      .region-art img { width: 100%; height: 100%; object-fit: cover; display:block; }
      .art-placeholder { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; font-family: Arial, sans-serif; font-weight: 800; color: rgba(20,20,20,0.55); letter-spacing: 0.15em; }
    </style>
  </head>
  <body>
    <div class="card">
      ${resolvedLayers.join("")}
      ${regionHtmlList}
      ${resolvedOverlays.join("")}
    </div>
    <script>
      (function () {
        function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

        function fitText(el) {
          var maxIters = 24;
          var minSize = 10;
          var style = window.getComputedStyle(el);
          var size = parseFloat(style.fontSize || "18");
          for (var i = 0; i < maxIters; i += 1) {
            if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return;
            size -= 1;
            if (size < minSize) return;
            el.style.fontSize = size + "px";
          }
        }

        function runAutofit() {
          var nodes = document.querySelectorAll('[data-autofit=\"true\"]');
          for (var i = 0; i < nodes.length; i += 1) {
            fitText(nodes[i]);
          }
        }

        function waitForImages(timeoutMs) {
          var imgs = Array.prototype.slice.call(document.images || []);
          if (imgs.length === 0) return Promise.resolve();

          return Promise.race([
            Promise.all(imgs.map(function (img) {
              if (img.complete) return Promise.resolve();
              return new Promise(function (resolve) {
                img.onload = resolve;
                img.onerror = resolve;
              });
            })),
            sleep(timeoutMs)
          ]);
        }

        window.__gambitRenderReady = (async function () {
          try {
            if (document.fonts && document.fonts.ready) {
              await Promise.race([document.fonts.ready, sleep(1500)]);
            }
          } catch {}
          runAutofit();
          await waitForImages(2500);
          runAutofit();
          await sleep(20);
        })();
      })();
    </script>
  </body>
</html>`;

  return { html, overlayIds: overlays.map((o) => o.id) };
}

export async function renderCardToPngBytes(request: RenderRequest): Promise<RenderResult> {
  const { html, overlayIds } = await buildHtml(request);

  const width = request.template.baseResolution.width;
  const height = request.template.baseResolution.height;

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: {
      width,
      height
    },
    deviceScaleFactor: 1
  });

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => (window as any).__gambitRenderReady);

    const png = await page.screenshot({ type: "png" });

    const manifest = {
      cardId: request.card.cardId,
      generatedAt: new Date().toISOString(),
      templateId: request.template.templateId,
      variant: request.card.variant,
      overlays: overlayIds
    };

    return {
      pngBytes: new Uint8Array(png),
      manifest
    };
  } finally {
    await page.close();
  }
}
