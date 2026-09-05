// The PLAN screen's own interactive canvas - the isometric counterpart
// to Canvas.tsx, deliberately a SEPARATE component rather than a mode
// flag inside Canvas.tsx itself: PLAN has no wires, no rotation/scale,
// no five-way mixed selection, and a fundamentally different hit-testing
// story (grid-cell + transparency-aware, not Konva's own per-shape
// events) - trying to share one component would mean branching almost
// every handler in it. App.tsx mounts this one INSTEAD OF Canvas.tsx
// when screenKind is PLAN, never both - Canvas.tsx itself is untouched
// by this file's existence.

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import { useStore } from '../store';
import { COLOR_OUTLINE, COLOR_WATER, COLOR_WHITE } from '../theme/ScadaTheme';
import { clampZoom } from '../utils/CanvasView';
import { isSpaceKeyDown, setSpaceKeyDown } from '../utils/CanvasInputState';
import { tileToScreen, screenToTileRounded } from '../iso/IsoGrid';
import { getTileTopFacePoints } from '../iso/TerrainTile';
import { IsoRenderer, sortPlacementsByDepth, getSpriteDrawPosition, getCachedSpriteImage } from '../iso/IsoRenderer';
import type { IsoPlacedObject } from '../iso/IsoRenderer';
import { getSprite, getSpriteState } from '../iso/SpriteManifest';
import { getPlanObjectFootprint } from '../iso/PlanObject';
import { hitTestSprite } from '../iso/SpriteHitTest';

// A generous, fixed reference grid drawn around the origin - a PLAN
// project has no separate "canvas width/height" concept the way a
// SCHEMATIC one does (canvasConfig was designed for a pixel-sized sheet
// of paper; a plot of land has no natural page size), so this is simply
// enough tiles in every direction to work in comfortably. Painted
// terrain and placed objects are never confined to this range - it is
// only ever a visual reference, exactly like the schematic grid lines
// are.
const GRID_RADIUS_TILES = 24;

function toWorldPoint(stagePos: { x: number; y: number }, panX: number, panY: number, zoom: number) {
  return { x: (stagePos.x - panX) / zoom, y: (stagePos.y - panY) / zoom };
}

/** Nearest-to-farthest hit test (the reverse of draw order - see IsoRenderer.tsx's own header for why draw order itself is farthest-first), transparency-aware via SpriteHitTest.ts. Returns the id of the topmost object actually under (worldX, worldY), or null. */
function hitTestPlacedObjects(worldX: number, worldY: number, objects: IsoPlacedObject[]): string | null {
  const nearestFirst = [...sortPlacementsByDepth(objects)].reverse();
  for (const obj of nearestFirst) {
    const resolved = getSpriteState(obj.spriteId, obj.state);
    if (!resolved) continue;
    const image = getCachedSpriteImage(resolved.entry.file);
    if (!image) continue; // not loaded yet - cannot be reliably hit-tested; falls through to whatever is behind it
    const pos = getSpriteDrawPosition(obj.gx, obj.gy, resolved.entry.anchorX, resolved.entry.anchorY);
    if (hitTestSprite(worldX, worldY, pos.x, pos.y, resolved.entry.width, resolved.entry.height, image)) {
      return obj.id;
    }
  }
  return null;
}

export const PlanCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const { canvasState, setCanvasState } = useStore();
  const { terrainTiles, paintTerrainTile, commitTerrainStroke, terrainPaintTool } = useStore();
  const { planObjects, selectedPlanObjectIds, selectPlanObjects, clearPlanSelection, movePlanObjectTo, deletePlanObjects, addPlanObject } = useStore();

  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  const isPaintingRef = useRef(false);
  const draggingIdRef = useRef<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; gx: number; gy: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Space-drag-to-pan and Delete-to-remove-selection - the same two
  // keyboard conventions Canvas.tsx's own effect establishes for
  // SCHEMATIC, reimplemented against the PLAN selection instead. Reuses
  // CanvasInputState's shared isSpaceKeyDown/setSpaceKeyDown rather than
  // tracking a second, parallel flag: only one of Canvas.tsx/
  // PlanCanvas.tsx is ever mounted at a time (App.tsx switches on
  // screenKind), so there is never a real second listener to conflict
  // with.
  useEffect(() => {
    const isTypingInField = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInField()) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deletePlanObjects(useStore.getState().selectedPlanObjectIds);
      } else if (e.key === ' ') {
        setSpaceKeyDown(true);
        if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'grab';
      } else if (e.key === 'Escape') {
        clearPlanSelection();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpaceKeyDown(false);
        if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'default';
      }
    };
    const handleBlur = () => {
      setSpaceKeyDown(false);
      if (containerRef.current && !isPanningRef.current) containerRef.current.style.cursor = 'default';
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: pointer.x / oldScale - stage.x() / oldScale, y: pointer.y / oldScale - stage.y() / oldScale };
    const newScale = clampZoom(e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy);
    setCanvasState({
      zoom: newScale,
      panX: -(mousePointTo.x - pointer.x / newScale) * newScale,
      panY: -(mousePointTo.y - pointer.y / newScale) * newScale
    });
  };

  const handleMouseDown = (e: any) => {
    if (e.evt.button === 1 || (isSpaceKeyDown() && e.evt.button === 0)) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }

    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const world = toWorldPoint(pos, canvasState.panX, canvasState.panY, canvasState.zoom);

    if (terrainPaintTool) {
      const tile = screenToTileRounded(world.x, world.y);
      paintTerrainTile(tile.gx, tile.gy, terrainPaintTool);
      isPaintingRef.current = true;
      return;
    }

    const resolvedObjects: IsoPlacedObject[] = planObjects.map(o => ({ id: o.id, spriteId: o.spriteId, state: o.state, gx: o.gx, gy: o.gy, footprint: getPlanObjectFootprint(o) }));
    const hitId = hitTestPlacedObjects(world.x, world.y, resolvedObjects);

    if (hitId) {
      selectPlanObjects([hitId], e.evt.shiftKey);
      const obj = planObjects.find(o => o.id === hitId)!;
      draggingIdRef.current = hitId;
      setDragPreview({ id: hitId, gx: obj.gx, gy: obj.gy });
    } else {
      if (!e.evt.shiftKey) clearPlanSelection();
    }
  };

  const handleMouseMove = (e: any) => {
    if (isPanningRef.current) {
      const dx = e.evt.clientX - lastPanPosRef.current.x;
      const dy = e.evt.clientY - lastPanPosRef.current.y;
      setCanvasState({ panX: canvasState.panX + dx, panY: canvasState.panY + dy });
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const world = toWorldPoint(pos, canvasState.panX, canvasState.panY, canvasState.zoom);

    if (terrainPaintTool && isPaintingRef.current) {
      const tile = screenToTileRounded(world.x, world.y);
      paintTerrainTile(tile.gx, tile.gy, terrainPaintTool);
      return;
    }

    if (draggingIdRef.current) {
      const tile = screenToTileRounded(world.x, world.y);
      setDragPreview({ id: draggingIdRef.current, gx: tile.gx, gy: tile.gy });
    }
  };

  const handleMouseUp = (e: any) => {
    if (e.evt.button === 1 || isPanningRef.current) {
      isPanningRef.current = false;
      if (containerRef.current) containerRef.current.style.cursor = 'default';
      return;
    }

    if (terrainPaintTool) {
      if (isPaintingRef.current) {
        commitTerrainStroke();
        isPaintingRef.current = false;
      }
      return;
    }

    if (draggingIdRef.current) {
      const id = draggingIdRef.current;
      const preview = dragPreview;
      draggingIdRef.current = null;
      setDragPreview(null);
      // A drag that never left its own starting tile still calls
      // movePlanObjectTo with the SAME coordinates - updatePlanObject's
      // shallow merge makes that a genuine no-op, and saveHistory's own
      // no-change guard (historySlice.ts) already skips a no-op entry,
      // so a plain click-without-drag never clutters undo.
      if (preview) movePlanObjectTo(id, preview.gx, preview.gy);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const dataStr = e.dataTransfer.getData('application/reactflow');
    if (!dataStr) return;
    const data = JSON.parse(dataStr);
    const sprite = getSprite(data.spriteId);
    if (!sprite) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - containerRect.left, y: e.clientY - containerRect.top };
    const world = toWorldPoint(pos, canvasState.panX, canvasState.panY, canvasState.zoom);
    const tile = screenToTileRounded(world.x, world.y);
    const firstState = Object.keys(sprite.states)[0];

    addPlanObject({ spriteId: sprite.id, state: firstState, gx: tile.gx, gy: tile.gy, designation: '', name: sprite.description });
    const newest = useStore.getState().planObjects[useStore.getState().planObjects.length - 1];
    if (newest) selectPlanObjects([newest.id], false);
  };

  // Reference grid: diamond outlines, not squares (this task's own
  // explicit requirement for PLAN mode) - reuses TerrainTile.ts's own
  // getTileTopFacePoints rather than re-deriving the diamond shape.
  const gridLines: React.ReactNode[] = [];
  for (let gx = -GRID_RADIUS_TILES; gx <= GRID_RADIUS_TILES; gx++) {
    for (let gy = -GRID_RADIUS_TILES; gy <= GRID_RADIUS_TILES; gy++) {
      const pts = getTileTopFacePoints(gx, gy).flatMap(p => [p.x, p.y]);
      gridLines.push(<Line key={`g-${gx}-${gy}`} points={pts} closed stroke={COLOR_OUTLINE} strokeWidth={1} opacity={0.1} listening={false} />);
    }
  }

  const renderObjects: IsoPlacedObject[] = planObjects.map(o => {
    const live = dragPreview && dragPreview.id === o.id ? dragPreview : o;
    return { id: o.id, spriteId: o.spriteId, state: o.state, gx: live.gx, gy: live.gy, footprint: getPlanObjectFootprint(o) };
  });

  return (
    <div
      className="canvas-container"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        width={size.width}
        height={size.height}
        ref={stageRef}
        scaleX={canvasState.zoom}
        scaleY={canvasState.zoom}
        x={canvasState.panX}
        y={canvasState.panY}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: terrainPaintTool ? 'crosshair' : 'default' }}
      >
        <Layer>{gridLines}</Layer>

        <IsoRenderer terrainTiles={terrainTiles} objects={renderObjects} />

        {/* Selection outline - same dashed-white convention the
            schematic Transformer handles already use (Canvas.tsx's own
            ObjectTransformerHandle), drawn as its own topmost pass so it
            is never hidden by a later object the way ObjectNode's old
            per-object Transformer used to be before that fix. */}
        <Layer>
          {selectedPlanObjectIds.map(id => {
            const obj = renderObjects.find(o => o.id === id);
            if (!obj) return null;
            const resolved = getSpriteState(obj.spriteId, obj.state);
            if (!resolved) return null;
            const pos = getSpriteDrawPosition(obj.gx, obj.gy, resolved.entry.anchorX, resolved.entry.anchorY);
            return (
              <Rect
                key={`sel-${id}`}
                x={pos.x}
                y={pos.y}
                width={resolved.entry.width}
                height={resolved.entry.height}
                stroke={COLOR_WHITE}
                strokeWidth={1.5}
                dash={[6, 4]}
                fill="transparent"
                listening={false}
              />
            );
          })}
          {/* The tile a terrain stroke or a drag is currently over - a
              small live cue, same cyan the schematic's own rubber-band
              selection box uses. */}
          {dragPreview && (() => {
            const center = tileToScreen(dragPreview.gx, dragPreview.gy);
            return (
              <Rect x={center.x - 4} y={center.y - 4} width={8} height={8} fill={COLOR_WATER} listening={false} />
            );
          })()}
        </Layer>
      </Stage>
    </div>
  );
};
