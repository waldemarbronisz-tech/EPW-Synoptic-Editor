// Sprite draw-position math, depth sorting and the sprite image cache
// for the PLAN screen. fix/audit-findings commit 4: split out of
// IsoRenderer.tsx (a pure MOVE, no behavior/signature change to any
// function below) so that file goes back to exporting only its own
// React component, IsoRenderer itself - oxlint's react/only-export-
// components flagged every one of these as a non-component export
// sharing a file with a component, which breaks Fast Refresh for that
// file. Every one of these is Konva-free and React-free (getCachedSpriteImage
// and the image cache it reads are the one exception that touches
// HTMLImageElement, but neither is itself a component or a hook), so
// none of them can trigger that same warning here - this file exports
// no component at all.
//
// Depth sorting is the whole point of buildDrawOrder/compareByDepth
// below: in an isometric view, what is closer to the camera must be
// drawn LAST (on top). "Closer" means a larger gx+gy - the tile sum
// grows toward the bottom of the screen, which is where the camera's
// own implicit position is (a fixed, un-rotated dimetric view looking
// down at the plot from above). Ties (equal sum) are broken by gx,
// matching the task's own explicit rule. An object spanning more than
// one tile (its manifest footprint) sorts by whichever of its OWN
// tiles is closest to the camera - the corner of its footprint at
// gx+footprint.x-1, gy+footprint.y-1 - not by its own origin tile, so
// a wide building never draws behind something standing in front of
// its near corner.
//
// Terrain is drawn unconditionally before every object (never subject
// to this same depth comparison) - buildDrawOrder below is what a
// real renderer (IsoRenderer.tsx's own IsoRenderer component) and
// this file's own tests both rely on for that guarantee: every
// terrain entry precedes every object entry in the array it returns,
// by construction.

import { tileToScreen } from './IsoGrid';
import type { ScreenPoint } from './IsoGrid';
import { parseTerrainKey } from './TerrainTile';
import type { TerrainTileType } from './TerrainTile';

export interface IsoObjectPlacement {
  gx: number;
  gy: number;
  footprint: { x: number; y: number };
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
 * (IsoRenderer.tsx) actually maps into Konva nodes, in exactly this
 * array's order - not a parallel, test-only shadow of the real render
 * path.
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

// ---- Sprite image cache --------------------------------------------------

// No `use-image` dependency in this project (GRANICE forbids adding a
// new one) - a small local cache of native HTMLImageElements, keyed by
// URL, is all IsoRenderer.tsx's own useSpriteImage needs: many placed
// objects commonly share the same sprite file, and this avoids
// re-creating (and re-downloading) an Image for each one. Exported (not
// module-private) so useSpriteImage, which stays in IsoRenderer.tsx
// (a hook tightly coupled to that file's own IsoSpriteNode component,
// never itself exported, so it never triggered this file split in the
// first place), can read and write the SAME cache instance - not a
// second, disconnected copy of it.
export const imageCache = new Map<string, HTMLImageElement>();

export function spriteImageSrc(file: string): string {
  return `/sprites/iso/${file}`;
}

/** The already-loaded image for a sprite state's own file, or null if it has not finished loading yet - PlanCanvas.tsx's own click hit-testing (SpriteHitTest.ts) reads through this same cache rather than keeping a second copy. */
export function getCachedSpriteImage(file: string): HTMLImageElement | null {
  const cached = imageCache.get(spriteImageSrc(file));
  return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
}
