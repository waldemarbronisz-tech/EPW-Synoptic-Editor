import { describe, it, expect } from 'vitest';
import {
  TERRAIN_TILE_TYPES, TERRAIN_WALL_HEIGHT,
  getTerrainTileColors, terrainKey, parseTerrainKey,
  getTileTopFacePoints, getTileLeftWallPoints, getTileRightWallPoints
} from '../iso/TerrainTile';
import { tileToScreen, ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoGrid';

// Simple relative luminance from a '#RRGGBB' hex string - test-only, just
// enough to compare "which of two tones reads lighter" the same way an
// eye would.
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('TerrainTile - colors', () => {
  it('every terrain type has three distinct tones', () => {
    for (const type of TERRAIN_TILE_TYPES) {
      const { top, left, right } = getTerrainTileColors(type);
      expect(new Set([top, left, right]).size).toBe(3);
    }
  });

  it('the left wall is lighter than the top face, and the right wall is darker, for every type - single light source from upper-left', () => {
    for (const type of TERRAIN_TILE_TYPES) {
      const { top, left, right } = getTerrainTileColors(type);
      expect(luminance(left)).toBeGreaterThan(luminance(top));
      expect(luminance(right)).toBeLessThan(luminance(top));
    }
  });
});

describe('TerrainTile - terrainKey / parseTerrainKey', () => {
  it('round-trips grid coordinates through the key', () => {
    expect(parseTerrainKey(terrainKey(3, -4))).toEqual({ gx: 3, gy: -4 });
    expect(parseTerrainKey(terrainKey(0, 0))).toEqual({ gx: 0, gy: 0 });
  });

  it('rejects a malformed key instead of throwing', () => {
    expect(parseTerrainKey('not-a-key')).toBeNull();
    expect(parseTerrainKey('1,2,3')).toBeNull();
    expect(parseTerrainKey('1.5,2')).toBeNull();
    expect(parseTerrainKey('')).toBeNull();
  });
});

describe('TerrainTile - geometry', () => {
  it('getTileTopFacePoints returns the same four diamond vertices tileToScreen implies', () => {
    const center = tileToScreen(2, 3);
    const points = getTileTopFacePoints(2, 3);
    expect(points).toEqual([
      { x: center.x, y: center.y - ISO_TILE_HEIGHT / 2 },
      { x: center.x + ISO_TILE_WIDTH / 2, y: center.y },
      { x: center.x, y: center.y + ISO_TILE_HEIGHT / 2 },
      { x: center.x - ISO_TILE_WIDTH / 2, y: center.y },
    ]);
  });

  it('the left wall shares its top edge with the diamond\'s own left-to-bottom edge, extruded down by TERRAIN_WALL_HEIGHT', () => {
    const [, , bottom, left] = getTileTopFacePoints(1, 1);
    const wall = getTileLeftWallPoints(1, 1);
    expect(wall[0]).toEqual(left);
    expect(wall[1]).toEqual(bottom);
    expect(wall[2]).toEqual({ x: bottom.x, y: bottom.y + TERRAIN_WALL_HEIGHT });
    expect(wall[3]).toEqual({ x: left.x, y: left.y + TERRAIN_WALL_HEIGHT });
  });

  it('the right wall shares its top edge with the diamond\'s own bottom-to-right edge, extruded down by TERRAIN_WALL_HEIGHT', () => {
    const [, right, bottom] = getTileTopFacePoints(1, 1);
    const wall = getTileRightWallPoints(1, 1);
    expect(wall[0]).toEqual(bottom);
    expect(wall[1]).toEqual(right);
    expect(wall[2]).toEqual({ x: right.x, y: right.y + TERRAIN_WALL_HEIGHT });
    expect(wall[3]).toEqual({ x: bottom.x, y: bottom.y + TERRAIN_WALL_HEIGHT });
  });
});
