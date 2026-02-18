import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import type { CardTemplateManifest, DynamicRegion } from "@gambit/template-schema";
import { api } from "../../../../convex/_generated/api";

type Handle = "move" | "nw" | "ne" | "sw" | "se";

type DragState = {
  regionId: string;
  handle: Handle;
  startX: number;
  startY: number;
  startRect: DynamicRegion["rect"];
};

const CANVAS_WIDTH = 360;
const GRID_PX = 8;
const MIN_SIZE_PX = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapPx(value: number, enabled: boolean): number {
  if (!enabled) return value;
  return Math.round(value / GRID_PX) * GRID_PX;
}

function sampleValueForBindKey(bindKey: string): string {
  if (bindKey === "card.name") return "Sample Card Name";
  if (bindKey === "card.rulesText") return "Rules text preview. This should wrap.";
  if (bindKey === "card.flavorText") return "Flavor text preview.";
  if (bindKey.includes("attack")) return "7";
  if (bindKey.includes("health")) return "5";
  if (bindKey.includes("cost")) return "2";
  return bindKey;
}

export function TemplateEditor() {
  const templates = useQuery(api.templates.list, {});
  const updateTemplate = useMutation(api.templates.update);

  const [selectedId, setSelectedId] = useState("");
  const [snapGrid, setSnapGrid] = useState(true);
  const [boundsLock, setBoundsLock] = useState(true);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!templates || templates.length === 0) return null;
    return templates.find((t) => t.value.templateId === selectedId) ?? templates[0] ?? null;
  }, [templates, selectedId]);

  const [draft, setDraft] = useState<CardTemplateManifest | null>(null);
  const [draftVersion, setDraftVersion] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!selected) return;
    if (selectedId.length === 0) {
      setSelectedId(selected.value.templateId);
      return;
    }
    if (dragRef.current) return;
    setDraft(selected.value);
    setDraftVersion(selected.version);
    setActiveRegionId(null);
  }, [selected?.value.templateId, selected?.version]);

  if (templates === undefined) {
    return <section className="panel">Loading templates...</section>;
  }

  if (!selected || !draft) {
    return <section className="panel">No templates yet.</section>;
  }

  const resW = draft.baseResolution.width;
  const resH = draft.baseResolution.height;
  const canvasHeight = Math.round((CANVAS_WIDTH * resH) / resW);

  function rectToPx(rect: DynamicRegion["rect"]) {
    return {
      x: rect.x * CANVAS_WIDTH,
      y: rect.y * canvasHeight,
      w: rect.w * CANVAS_WIDTH,
      h: rect.h * canvasHeight
    };
  }

  function pxToRect(px: { x: number; y: number; w: number; h: number }): DynamicRegion["rect"] {
    const x = px.x / CANVAS_WIDTH;
    const y = px.y / canvasHeight;
    const w = px.w / CANVAS_WIDTH;
    const h = px.h / canvasHeight;
    return { x, y, w, h };
  }

  async function persist(next: CardTemplateManifest): Promise<void> {
    await updateTemplate({
      templateId: next.templateId,
      manifest: next
    });
  }

  function updateRegion(regionId: string, updater: (prev: DynamicRegion) => DynamicRegion): void {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        dynamicRegions: prev.dynamicRegions.map((region) => (region.regionId === regionId ? updater(region) : region))
      };
      return next;
    });
  }

  function deleteRegion(regionId: string): void {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, dynamicRegions: prev.dynamicRegions.filter((region) => region.regionId !== regionId) };
      return next;
    });
    setActiveRegionId((current) => (current === regionId ? null : current));
  }

  function addRegion(): void {
    if (!draft) return;
    const regionId = `region-${draft.dynamicRegions.length + 1}`;
    const next: CardTemplateManifest = {
      ...draft,
      dynamicRegions: [
        ...draft.dynamicRegions,
        {
          regionId,
          kind: "text",
          bindKey: "card.rulesText",
          rect: { x: 0.12, y: 0.62, w: 0.76, h: 0.18 },
          autoFit: true,
          zIndex: 50
        }
      ]
    };
    setDraft(next);
    setActiveRegionId(regionId);
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    regionId: string,
    handle: Handle
  ): void {
    if (!draft) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);

    const region = draft.dynamicRegions.find((r) => r.regionId === regionId);
    if (!region) return;
    dragRef.current = {
      regionId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startRect: region.rect
    };
    setActiveRegionId(regionId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    const startPx = rectToPx(drag.startRect);
    let nextPx = { ...startPx };

    const applyBounds = (px: typeof nextPx): typeof nextPx => {
      if (!boundsLock) {
        return {
          x: px.x,
          y: px.y,
          w: Math.max(MIN_SIZE_PX, px.w),
          h: Math.max(MIN_SIZE_PX, px.h)
        };
      }

      const w = clamp(px.w, MIN_SIZE_PX, CANVAS_WIDTH);
      const h = clamp(px.h, MIN_SIZE_PX, canvasHeight);
      const x = clamp(px.x, 0, CANVAS_WIDTH - w);
      const y = clamp(px.y, 0, canvasHeight - h);
      return { x, y, w, h };
    };

    if (drag.handle === "move") {
      nextPx.x = snapPx(startPx.x + dx, snapGrid);
      nextPx.y = snapPx(startPx.y + dy, snapGrid);
      nextPx = applyBounds(nextPx);
    } else {
      const x2 = startPx.x + startPx.w;
      const y2 = startPx.y + startPx.h;

      if (drag.handle === "nw") {
        nextPx.x = snapPx(startPx.x + dx, snapGrid);
        nextPx.y = snapPx(startPx.y + dy, snapGrid);
        nextPx.w = snapPx(x2 - nextPx.x, snapGrid);
        nextPx.h = snapPx(y2 - nextPx.y, snapGrid);
      }

      if (drag.handle === "ne") {
        nextPx.y = snapPx(startPx.y + dy, snapGrid);
        nextPx.w = snapPx(startPx.w + dx, snapGrid);
        nextPx.h = snapPx(y2 - nextPx.y, snapGrid);
      }

      if (drag.handle === "sw") {
        nextPx.x = snapPx(startPx.x + dx, snapGrid);
        nextPx.w = snapPx(x2 - nextPx.x, snapGrid);
        nextPx.h = snapPx(startPx.h + dy, snapGrid);
      }

      if (drag.handle === "se") {
        nextPx.w = snapPx(startPx.w + dx, snapGrid);
        nextPx.h = snapPx(startPx.h + dy, snapGrid);
      }

      nextPx = applyBounds(nextPx);
    }

    const nextRect = pxToRect(nextPx);
    updateRegion(drag.regionId, (prev) => ({ ...prev, rect: nextRect }));
  }

  function onPointerUp(): void {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!draft) return;
    void persist(draft);
  }

  const activeRegion = activeRegionId ? draft.dynamicRegions.find((r) => r.regionId === activeRegionId) ?? null : null;

  return (
    <section className="panel">
      <h2>Template Editor</h2>
      <p>Drag/resize dynamic regions. Changes persist to Convex on release.</p>

      <div className="grid-3">
        <label>
          Template
          <select value={selected.value.templateId} onChange={(event) => setSelectedId(event.target.value)}>
            {templates.map((record) => (
              <option key={record.value.templateId} value={record.value.templateId}>
                {record.value.templateId}
              </option>
            ))}
          </select>
        </label>

        <label>
          Snap Grid
          <select value={String(snapGrid)} onChange={(event) => setSnapGrid(event.target.value === "true")}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label>
          Bounds Lock
          <select value={String(boundsLock)} onChange={(event) => setBoundsLock(event.target.value === "true")}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              width: CANVAS_WIDTH,
              height: canvasHeight,
              position: "relative",
              border: "2px solid var(--line)",
              background: "radial-gradient(circle at top left, #fff7e9, #e8decf)",
              boxShadow: "inset 0 0 0 10px #161616"
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerDown={() => setActiveRegionId(null)}
          >
            {snapGrid ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.25,
                  backgroundImage: `linear-gradient(to right, rgba(20,20,20,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,20,0.15) 1px, transparent 1px)`,
                  backgroundSize: `${GRID_PX}px ${GRID_PX}px`,
                  pointerEvents: "none"
                }}
              />
            ) : null}

            {draft.dynamicRegions
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((region) => {
                const px = rectToPx(region.rect);
                const isActive = region.regionId === activeRegionId;
                return (
                  <div
                    key={region.regionId}
                    style={{
                      position: "absolute",
                      left: px.x,
                      top: px.y,
                      width: px.w,
                      height: px.h,
                      border: isActive ? "2px solid #8a1f1f" : "2px dashed rgba(20,20,20,0.55)",
                      background: isActive ? "rgba(255, 240, 240, 0.25)" : "rgba(255,255,255,0.08)",
                      cursor: "move",
                      overflow: "hidden"
                    }}
                    onPointerDown={(event) => onPointerDown(event, region.regionId, "move")}
                  >
                    <div style={{ fontSize: 10, padding: 4, color: "#1a1a1a", fontWeight: 700 }}>
                      {region.regionId} ({region.kind})
                    </div>
                    <div style={{ fontSize: 10, padding: "0 4px", color: "#4a4138" }}>
                      {sampleValueForBindKey(region.bindKey)}
                    </div>

                    {isActive ? (
                      <>
                        {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                          <div
                            key={handle}
                            onPointerDown={(event) => onPointerDown(event, region.regionId, handle)}
                            style={{
                              position: "absolute",
                              width: 10,
                              height: 10,
                              background: "#8a1f1f",
                              borderRadius: 2,
                              cursor: `${handle}-resize`,
                              left: handle.includes("w") ? -5 : undefined,
                              right: handle.includes("e") ? -5 : undefined,
                              top: handle.includes("n") ? -5 : undefined,
                              bottom: handle.includes("s") ? -5 : undefined
                            }}
                          />
                        ))}
                      </>
                    ) : null}
                  </div>
                );
              })}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={addRegion}>Add Dynamic Region</button>
            <button
              className="primary"
              onClick={() => void persist(draft)}
              disabled={draftVersion === selected.version && JSON.stringify(draft) === JSON.stringify(selected.value)}
            >
              Save Template
            </button>
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 320 }}>
          <h3 style={{ marginTop: 0 }}>Region Inspector</h3>
          {activeRegion ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span className="badge">ID: {activeRegion.regionId}</span>
                <span className="badge">Z: {activeRegion.zIndex}</span>
                <span className="badge">
                  Rect: {activeRegion.rect.x.toFixed(3)},{activeRegion.rect.y.toFixed(3)} {activeRegion.rect.w.toFixed(3)}x{activeRegion.rect.h.toFixed(3)}
                </span>
              </div>

              <label>
                Kind
                <select
                  value={activeRegion.kind}
                  onChange={(event) =>
                    updateRegion(activeRegion.regionId, (prev) => ({ ...prev, kind: event.target.value as any }))
                  }
                >
                  <option value="stat">stat</option>
                  <option value="text">text</option>
                  <option value="art_slot">art_slot</option>
                </select>
              </label>

              <label>
                Bind Key
                <input
                  value={activeRegion.bindKey}
                  onChange={(event) =>
                    updateRegion(activeRegion.regionId, (prev) => ({ ...prev, bindKey: event.target.value }))
                  }
                />
              </label>

              <label>
                Auto Fit
                <select
                  value={String(activeRegion.autoFit)}
                  onChange={(event) =>
                    updateRegion(activeRegion.regionId, (prev) => ({ ...prev, autoFit: event.target.value === "true" }))
                  }
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>

              <label>
                Z Index
                <input
                  type="number"
                  value={activeRegion.zIndex}
                  onChange={(event) =>
                    updateRegion(activeRegion.regionId, (prev) => ({ ...prev, zIndex: Number(event.target.value) }))
                  }
                />
              </label>

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button className="primary" onClick={() => void persist(draft)}>
                  Save
                </button>
                <button onClick={() => deleteRegion(activeRegion.regionId)}>Delete Region</button>
              </div>
            </>
          ) : (
            <p style={{ marginTop: 0, color: "#4a4138" }}>
              Click a region to edit its kind/bind key. Drag regions to reposition, and use corner handles to resize.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
