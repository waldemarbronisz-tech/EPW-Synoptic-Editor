// Pure isometric grid math for the PLAN screen (dimetric 2:1 projection,
// tile diamond centered on each integer (gx, gy)) - no React, no Konva,
// no store dependency, same convention GridSnap.ts/GeometryUtils.ts
// already use for the schematic canvas's own pure math, so this file can
// be unit tested directly and reused by both the renderer
// (IsoRenderer.tsx) and the terrain-painting tool without either pulling
// in the other.
//
// Origin (0,0) is tile (0,0)'s own center, in local iso-layer space -
// panning/zooming the whole layer is the Konva Stage's own concern
// (canvasState.zoom/panX/panY), exactly as it already is for the
// schematic canvas; these functions stay origin-less on purpose.

export const ISO_TILE_WIDTH = 128;
export const ISO_TILE_HEIGHT = 64;
export const ISO_METERS_PER_TILE = 8;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface TileCoord {
  gx: number;
  gy: number;
}

/**
 * Screen-space center of tile (gx, gy)'s own top face (the diamond
 * TerrainTile.ts draws, and the point a sprite's anchor is placed on by
 * IsoRenderer.tsx). gx grows toward the bottom-right of the screen, gy
 * toward the bottom-left - the standard dimetric convention, matching
 * the manifest's own footprint.x/footprint.y axes.
 */
export function tileToScreen(gx: number, gy: number): ScreenPoint {
  return {
    x: (gx - gy) * (ISO_TILE_WIDTH / 2),
    y: (gx + gy) * (ISO_TILE_HEIGHT / 2),
  };
}

/**
 * Exact inverse of tileToScreen - FRACTIONAL grid coordinates, needed
 * for cursor hit-testing before rounding to a whole tile.
 *
 * At the diamond's own center (tileToScreen(gx,gy) for integer gx,gy)
 * this returns exactly (gx, gy). At any of its four vertices it returns
 * (gx +/- 0.5, gy +/- 0.5) - the whole diamond, in fact, corresponds
 * EXACTLY to the axis-aligned square [gx-0.5, gx+0.5) x [gy-0.5, gy+0.5)
 * in this fractional space, because tileToScreen/screenToTile is a pure
 * LINEAR (affine) map: it takes a square to a parallelogram with zero
 * distortion, never an approximation. screenToTileRounded and
 * isPointInTile below both lean on this fact directly - see
 * screenToTileRounded's own comment for why that half-integer boundary
 * is the entire story behind correct tile picking.
 */
export function screenToTile(x: number, y: number): TileCoord {
  return {
    gx: x / ISO_TILE_WIDTH + y / ISO_TILE_HEIGHT,
    gy: y / ISO_TILE_HEIGHT - x / ISO_TILE_WIDTH,
  };
}

/**
 * Which single whole tile a screen point lies in - what every mouse
 * click/hover in PLAN mode actually calls.
 *
 * The common isometric-picking bug is to FLOOR the fractional grid
 * coordinates, the way an ordinary top-left-anchored rectangular grid
 * would (GridSnap.ts's own snapToGrid rounds to the NEAREST grid line
 * for the same underlying reason this does, but a naive port of "floor
 * the index" from a plain rectangular grid is the mistake this comment
 * is warning against). tileToScreen returns the diamond's CENTER, not a
 * corner, so - per screenToTile's own comment - the tile's fractional
 * cell is centered ON the integer coordinate, spanning +/-0.5, not
 * spanning [gx, gx+1) from it. Flooring assumes the wrong cell shape and
 * is wrong for roughly the far half of every tile; rounding each axis
 * independently is exact, because the diamond-to-square correspondence
 * above holds with zero distortion at every point, not just near the
 * center.
 *
 * This is most visible right next to a tile's own vertex, where two
 * diamonds meet edge-to-edge along a line that is NOT aligned with
 * either screen axis: a point one pixel inside tile (3,4) from its own
 * LEFT vertex has gx-fraction ~2.51 and gy-fraction ~4.49 - Math.round
 * gives back (3,4) correctly; Math.floor gives (2,4), the wrong,
 * neighboring tile. See iso-grid.test.ts's "left vertex" case, the most
 * important test in that file.
 */
export function screenToTileRounded(x: number, y: number): TileCoord {
  const { gx, gy } = screenToTile(x, y);
  return { gx: Math.round(gx), gy: Math.round(gy) };
}

/**
 * Exact point-in-diamond test for tile (gx, gy). Reuses
 * screenToTileRounded rather than re-deriving the diamond inequality
 * (|dx|/halfWidth + |dy|/halfHeight <= 1) by hand - per screenToTile's
 * own comment, "the point rounds to this tile" and "the point lies
 * inside this tile's diamond" are the exact same test, not two
 * approximations of each other.
 */
export function isPointInTile(x: number, y: number, gx: number, gy: number): boolean {
  const rounded = screenToTileRounded(x, y);
  return rounded.gx === gx && rounded.gy === gy;
}
