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
