// Terrain tile geometry and color lookup for the PLAN screen - pure,
// Konva-free (same convention as IsoGrid.ts), so it stays directly unit
// testable and reusable by both the actual Konva renderer (a separate
// component, since this file stays a .ts, not .tsx) and, later, the
// terrain-painting tool's own preview.
//
// A tile is drawn as its diamond top face (see IsoGrid.ts's own
// tileToScreen) plus two side walls extruded straight down by
// TERRAIN_WALL_HEIGHT, giving the terrain visible thickness - the LEFT
// wall (between the diamond's own left and bottom vertices) and the
// RIGHT wall (between its bottom and right vertices). The diamond's TOP
// and RIGHT-of-top edges are never drawn as walls: with light from
// upper-left (the same convention every sprite in public/sprites/iso/ is
// already painted with), those two faces would be hidden behind the tile
// itself from the camera's fixed viewing angle.

import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT, tileToScreen } from './IsoGrid';
import type { ScreenPoint } from './IsoGrid';
import {
  TERRAIN_GRASS_TOP, TERRAIN_GRASS_LEFT, TERRAIN_GRASS_RIGHT,
  TERRAIN_PAVING_TOP, TERRAIN_PAVING_LEFT, TERRAIN_PAVING_RIGHT,
  TERRAIN_SOIL_TOP, TERRAIN_SOIL_LEFT, TERRAIN_SOIL_RIGHT,
  TERRAIN_GRAVEL_TOP, TERRAIN_GRAVEL_LEFT, TERRAIN_GRAVEL_RIGHT,
  TERRAIN_WATER_TOP, TERRAIN_WATER_LEFT, TERRAIN_WATER_RIGHT,
} from '../theme/ScadaTheme';

export const TERRAIN_TILE_TYPES = ['GRASS', 'PAVING', 'SOIL', 'GRAVEL', 'WATER'] as const;
export type TerrainTileType = typeof TERRAIN_TILE_TYPES[number];

// The task's own explicit fixed value for this design (same category as
// IsoGrid.ts's ISO_TILE_WIDTH/ISO_TILE_HEIGHT: a deliberate constant of
// the isometric engine itself, not a sprite dimension that belongs in
// the manifest).
export const TERRAIN_WALL_HEIGHT = 8;

export interface TerrainTileColors {
  top: string;
  left: string;
  right: string;
}

const TERRAIN_COLORS: Record<TerrainTileType, TerrainTileColors> = {
  GRASS: { top: TERRAIN_GRASS_TOP, left: TERRAIN_GRASS_LEFT, right: TERRAIN_GRASS_RIGHT },
  PAVING: { top: TERRAIN_PAVING_TOP, left: TERRAIN_PAVING_LEFT, right: TERRAIN_PAVING_RIGHT },
  SOIL: { top: TERRAIN_SOIL_TOP, left: TERRAIN_SOIL_LEFT, right: TERRAIN_SOIL_RIGHT },
  GRAVEL: { top: TERRAIN_GRAVEL_TOP, left: TERRAIN_GRAVEL_LEFT, right: TERRAIN_GRAVEL_RIGHT },
  WATER: { top: TERRAIN_WATER_TOP, left: TERRAIN_WATER_LEFT, right: TERRAIN_WATER_RIGHT },
};

export function getTerrainTileColors(type: TerrainTileType): TerrainTileColors {
  return TERRAIN_COLORS[type];
}

/** Stable string key for a tile's grid coordinate - the terrain map (and the .epwsyn "terrain" field) is keyed by this, one entry per PAINTED tile only. */
export function terrainKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

/** Inverse of terrainKey - parses a "gx,gy" key back into numbers. Returns null for anything not in that exact shape (defensive against a hand-edited or corrupted project file). */
export function parseTerrainKey(key: string): { gx: number; gy: number } | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  const gx = Number(parts[0]);
  const gy = Number(parts[1]);
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return null;
  return { gx, gy };
}

/** The four vertices of tile (gx,gy)'s own diamond top face, in draw order (top, right, bottom, left). */
export function getTileTopFacePoints(gx: number, gy: number): ScreenPoint[] {
  const c = tileToScreen(gx, gy);
  const halfW = ISO_TILE_WIDTH / 2;
  const halfH = ISO_TILE_HEIGHT / 2;
  return [
    { x: c.x, y: c.y - halfH },        // top
    { x: c.x + halfW, y: c.y },        // right
    { x: c.x, y: c.y + halfH },        // bottom
    { x: c.x - halfW, y: c.y },        // left
  ];
}

// ---- Slab seams (fix/iso-tiles-and-rotation commit 1) --------------------
// A painted plot must read as ONE continuous slab of ground, not a pile
// of separately-outlined tiles stacked on top of each other. The fix is
// entirely about visibility, computed fresh from the CURRENT terrain map
// every time - never decided once at paint time and cached - so the
// final picture only ever depends on which tiles are painted NOW, not
// the order a user happened to paint them in.
//
// Only two of a tile's four sides are ever walls at all (see this file's
// own header: the camera's fixed angle hides the other two entirely),
// so only two neighbors matter for wall visibility - the same two
// neighbors also gate the STRONG outline on the top face's own bottom-
// left/bottom-right edges (see getTerrainEdgeVisibility below). The
// other two edges (top-left, top-right) never carry a wall, but still
// need the same outer/inner distinction for the top face's own outline.

/** True unless a tile is already painted at (gx, gy+1) - that neighbor's own top face and wall would otherwise cover this one, per the depth sort (it draws after, being closer to the camera). */
export function hasLeftWall(terrainTiles: Record<string, TerrainTileType>, gx: number, gy: number): boolean {
  return !(terrainKey(gx, gy + 1) in terrainTiles);
}

/** True unless a tile is already painted at (gx+1, gy) - same reasoning as hasLeftWall, mirrored. */
export function hasRightWall(terrainTiles: Record<string, TerrainTileType>, gx: number, gy: number): boolean {
  return !(terrainKey(gx + 1, gy) in terrainTiles);
}

/**
 * Per-edge outline treatment for tile (gx,gy)'s own top face - true means
 * "outer boundary of the whole slab, draw the strong COLOR_OUTLINE";
 * false means "another painted tile continues past this edge, draw the
 * weak TERRAIN_TILE_DIVIDER instead". Each edge corresponds to exactly
 * one of the tile's four grid neighbors:
 *   topLeft     borders (gx-1, gy)
 *   topRight    borders (gx, gy-1)
 *   bottomLeft  borders (gx, gy+1) - the same edge hasLeftWall checks
 *   bottomRight borders (gx+1, gy) - the same edge hasRightWall checks
 * Grass next to paving is treated exactly like grass next to grass: only
 * whether the neighboring cell is PAINTED matters here, never what type
 * it is painted with - two different surfaces sharing one level of
 * ground still share a plain division line, not a wall.
 */
export interface TerrainEdgeVisibility {
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

export function getTerrainEdgeVisibility(terrainTiles: Record<string, TerrainTileType>, gx: number, gy: number): TerrainEdgeVisibility {
  return {
    topLeft: !(terrainKey(gx - 1, gy) in terrainTiles),
    topRight: !(terrainKey(gx, gy - 1) in terrainTiles),
    bottomLeft: hasLeftWall(terrainTiles, gx, gy),
    bottomRight: hasRightWall(terrainTiles, gx, gy),
  };
}

/** The left-facing side wall: the diamond's own left-to-bottom edge, extruded straight down. Lighter tone - catches the upper-left light source. */
export function getTileLeftWallPoints(gx: number, gy: number): ScreenPoint[] {
  const [, , bottom, left] = getTileTopFacePoints(gx, gy);
  return [
    left,
    bottom,
    { x: bottom.x, y: bottom.y + TERRAIN_WALL_HEIGHT },
    { x: left.x, y: left.y + TERRAIN_WALL_HEIGHT },
  ];
}

/** The right-facing side wall: the diamond's own bottom-to-right edge, extruded straight down. Darker tone - its own shadow side. */
export function getTileRightWallPoints(gx: number, gy: number): ScreenPoint[] {
  const [, right, bottom] = getTileTopFacePoints(gx, gy);
  return [
    bottom,
    right,
    { x: right.x, y: right.y + TERRAIN_WALL_HEIGHT },
    { x: bottom.x, y: bottom.y + TERRAIN_WALL_HEIGHT },
  ];
}
