// Sprite rendering and depth sorting for the PLAN screen.
//
// Depth sorting is the whole point of this file: in an isometric view,
// what is closer to the camera must be drawn LAST (on top). "Closer"
// means a larger gx+gy - the tile sum grows toward the bottom of the
// screen, which is where the camera's own implicit position is (a fixed,
// un-rotated dimetric view looking down at the plot from above). Ties
// (equal sum) are broken by gx, matching the task's own explicit rule.
// An object spanning more than one tile (its manifest footprint) sorts
// by whichever of its OWN tiles is closest to the camera - the corner of
// its footprint at gx+footprint.x-1, gy+footprint.y-1 - not by its own
// origin tile, so a wide building never draws behind something standing
// in front of its near corner.
//
// Terrain is drawn unconditionally before every object (never subject to
// this same depth comparison) - buildDrawOrder below is what a real
// renderer (IsoRenderer component, at the bottom of this file) and this
// file's own tests both rely on for that guarantee: every terrain entry
// precedes every object entry in the array it returns, by construction.

import { useEffect, useState } from 'react';
import { Image as KonvaImage, Layer } from 'react-konva';
import { tileToScreen } from './IsoGrid';
import type { ScreenPoint } from './IsoGrid';
import { parseTerrainKey } from './TerrainTile';
import type { TerrainTileType } from './TerrainTile';
import { TerrainTileNode } from './TerrainTileRenderer';
import { getSpriteState } from './SpriteManifest';

export interface IsoObjectPlacement {
  gx: number;
  gy: number;
  footprint: { x: number; y: number };
}

export interface IsoPlacedObject extends IsoObjectPlacement {
  id: string;
  spriteId: string;
  state: string;
}

/**
 * Where a sprite's own top-left corner must be drawn so that its anchor
 * point (anchorX, anchorY - where it touches the ground, per
 * SpriteManifest.ts's own contract) lands exactly at tile (gx,gy)'s
 * center. Pure and Konva-free on purpose, so test 13 (anchor lands
 * exactly at the tile center) needs no image, no Stage, nothing Konva at
 * all to verify.
 */
export function getSpriteDrawPosition(gx: number, gy: number, anchorX: number, anchorY: number): ScreenPoint {
  const center = tileToScreen(gx, gy);
  return { x: center.x - anchorX, y: center.y - anchorY };
}

/**
 * The tile, within a footprint starting at (gx,gy), closest to the
 * camera - and its own gx+gy sum, the sort key every object is ordered
 * by. A 1x1 footprint's "closest tile" is simply its own (gx,gy).
 */
export function getDepthSortValue(gx: number, gy: number, footprint: { x: number; y: number }): { sum: number; gx: number } {
  const closestGx = gx + footprint.x - 1;
  const closestGy = gy + footprint.y - 1;
  return { sum: closestGx + closestGy, gx: closestGx };
}

/** Farther (lower sum) sorts first; ties broken by gx - the task's own explicit rule for equal-sum placements. */
export function compareByDepth<T extends IsoObjectPlacement>(a: T, b: T): number {
  const av = getDepthSortValue(a.gx, a.gy, a.footprint);
  const bv = getDepthSortValue(b.gx, b.gy, b.footprint);
  if (av.sum !== bv.sum) return av.sum - bv.sum;
  return av.gx - bv.gx;
}

/** A NEW array (input left untouched), farthest-first - the exact draw order objects must be mounted in. */
export function sortPlacementsByDepth<T extends IsoObjectPlacement>(placements: T[]): T[] {
  return [...placements].sort(compareByDepth);
}

export type IsoDrawItem<T extends IsoObjectPlacement> =
  | { kind: 'terrain'; gx: number; gy: number; type: TerrainTileType }
  | { kind: 'object'; placement: T };

/**
 * The complete, ordered draw list for one PLAN screen: every painted
 * terrain tile (order among themselves does not matter - the task's own
 * rule is only that EVERY one of them precedes EVERY object, which
 * putting them all first, unconditionally, trivially guarantees),
 * followed by every object in depth order. This is what IsoRenderer
 * below actually maps into Konva nodes, in exactly this array's order -
 * not a parallel, test-only shadow of the real render path.
 */
export function buildDrawOrder<T extends IsoObjectPlacement>(
  terrainTiles: Record<string, TerrainTileType>,
  objects: T[]
): IsoDrawItem<T>[] {
  const terrainItems: IsoDrawItem<T>[] = Object.entries(terrainTiles).map(([key, type]) => {
    const parsed = parseTerrainKey(key);
    return { kind: 'terrain', gx: parsed?.gx ?? 0, gy: parsed?.gy ?? 0, type };
  });
  const objectItems: IsoDrawItem<T>[] = sortPlacementsByDepth(objects).map(placement => ({ kind: 'object', placement }));
  return [...terrainItems, ...objectItems];
}

// ---- Konva rendering ----------------------------------------------------

// No `use-image` dependency in this project (GRANICE forbids adding a
// new one) - a small local cache of native HTMLImageElements, keyed by
// URL, is all `useSpriteImage` below needs: many placed objects commonly
// share the same sprite file, and this avoids re-creating (and
// re-downloading) an Image for each one.
const imageCache = new Map<string, HTMLImageElement>();

function useSpriteImage(file: string): HTMLImageElement | null {
  const src = `/sprites/iso/${file}`;
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (imageCache.has(src)) return;
    const img = new window.Image();
    img.onload = () => {
      imageCache.set(src, img);
      forceRender(n => n + 1);
    };
    img.src = src;
  }, [src]);

  const cached = imageCache.get(src);
  return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
}

/**
 * One placed sprite. Renders nothing (not a broken-image placeholder)
 * until both the manifest state resolves and the image itself finishes
 * loading - a missing sprite must never crash the canvas.
 */
const IsoSpriteNode: React.FC<{ placement: IsoPlacedObject }> = ({ placement }) => {
  const resolved = getSpriteState(placement.spriteId, placement.state);
  const image = useSpriteImage(resolved?.entry.file ?? '');
  if (!resolved || !image) return null;

  const { entry } = resolved;
  const pos = getSpriteDrawPosition(placement.gx, placement.gy, entry.anchorX, entry.anchorY);

  return (
    <KonvaImage
      image={image}
      x={pos.x}
      y={pos.y}
      width={entry.width}
      height={entry.height}
      // Pixel art must stay crisp when the view is zoomed in, not blur
      // into a smeared approximation - see this file's own header and
      // the completion report for which Konva property this is.
      imageSmoothingEnabled={false}
    />
  );
};

export interface IsoRendererProps {
  terrainTiles: Record<string, TerrainTileType>;
  objects: IsoPlacedObject[];
}

/**
 * The PLAN screen's whole drawable scene, in one Layer: every terrain
 * tile the task's own rule keeps unconditionally behind every object,
 * then every object in depth order - buildDrawOrder's own array, mapped
 * 1:1 into Konva nodes. imageSmoothingEnabled on the Layer affects only
 * the Image nodes (IsoSpriteNode) within it; TerrainTileNode's flat-color
 * Line shapes are entirely unaffected by it, so one Layer safely holds
 * both kinds of content.
 */
export const IsoRenderer: React.FC<IsoRendererProps> = ({ terrainTiles, objects }) => {
  const drawOrder = buildDrawOrder(terrainTiles, objects);

  return (
    <Layer imageSmoothingEnabled={false}>
      {drawOrder.map((item, index) =>
        item.kind === 'terrain'
          ? <TerrainTileNode key={`terrain-${item.gx}-${item.gy}`} gx={item.gx} gy={item.gy} type={item.type} />
          : <IsoSpriteNode key={item.placement.id ?? `object-${index}`} placement={item.placement} />
      )}
    </Layer>
  );
};

