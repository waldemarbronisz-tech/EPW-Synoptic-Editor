import { describe, it, expect } from 'vitest';
import {
  TERRAIN_TILE_TYPES, TERRAIN_WALL_HEIGHT,
  getTerrainTileColors, terrainKey, parseTerrainKey,
  getTileTopFacePoints, getTileLeftWallPoints, getTileRightWallPoints,
  hasLeftWall, hasRightWall, getTerrainEdgeVisibility
} from '../iso/TerrainTile';
import type { TerrainTileType } from '../iso/TerrainTile';
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

// fix/iso-tiles-and-rotation commit 1: a painted plot must read as one
// continuous slab, not a pile of separately-outlined tiles - these are
// the tests for the neighbor-aware wall/outline visibility that fix
// relies on. Every one of them builds its own terrainTiles map by hand
// rather than going through the store, exactly like the pure geometry
// tests above - no Canvas, no Konva, nothing beyond plain data in and
// plain booleans out.
describe('TerrainTile - slab seams (wall and edge visibility)', () => {
  it('1. a single, isolated tile has both side walls', () => {
    const map: Record<string, TerrainTileType> = { '5,5': 'GRASS' };
    expect(hasLeftWall(map, 5, 5)).toBe(true);
    expect(hasRightWall(map, 5, 5)).toBe(true);
  });

  it('2. a tile with a neighbor at (gx, gy+1) has NO left wall', () => {
    const map: Record<string, TerrainTileType> = { '5,5': 'GRASS', '5,6': 'GRASS' };
    expect(hasLeftWall(map, 5, 5)).toBe(false);
    // The right wall is unrelated to this neighbor - still there.
    expect(hasRightWall(map, 5, 5)).toBe(true);
  });

  it('3. a tile with a neighbor at (gx+1, gy) has NO right wall', () => {
    const map: Record<string, TerrainTileType> = { '5,5': 'GRASS', '6,5': 'GRASS' };
    expect(hasRightWall(map, 5, 5)).toBe(false);
    expect(hasLeftWall(map, 5, 5)).toBe(true);
  });

  it('4. a tile with neighbors on both sides has no wall at all', () => {
    const map: Record<string, TerrainTileType> = { '5,5': 'GRASS', '5,6': 'GRASS', '6,5': 'GRASS' };
    expect(hasLeftWall(map, 5, 5)).toBe(false);
    expect(hasRightWall(map, 5, 5)).toBe(false);
  });

  it('5. a grass tile touching a paving tile has no wall between them - only presence, never type, is checked', () => {
    const map: Record<string, TerrainTileType> = { '0,0': 'GRASS', '0,1': 'PAVING' };
    expect(hasLeftWall(map, 0, 0)).toBe(false);
    // And the shared top-face edge between them is the weak divider, not the strong outer outline.
    expect(getTerrainEdgeVisibility(map, 0, 0).bottomLeft).toBe(false);
  });

  it('6. a 3x3 slab has walls only around its own outer perimeter', () => {
    const map: Record<string, TerrainTileType> = {};
    for (let gx = 0; gx <= 2; gx++) {
      for (let gy = 0; gy <= 2; gy++) {
        map[terrainKey(gx, gy)] = 'GRASS';
      }
    }
    for (let gx = 0; gx <= 2; gx++) {
      for (let gy = 0; gy <= 2; gy++) {
        // Left wall exists only along the south edge (gy=2, no tile at gy+1=3).
        expect(hasLeftWall(map, gx, gy)).toBe(gy === 2);
        // Right wall exists only along the east edge (gx=2, no tile at gx+1=3).
        expect(hasRightWall(map, gx, gy)).toBe(gx === 2);
      }
    }
  });
});

describe('TerrainTile - getTerrainEdgeVisibility', () => {
  it('every edge is the strong outer boundary for a fully isolated tile', () => {
    const map: Record<string, TerrainTileType> = { '2,2': 'GRASS' };
    expect(getTerrainEdgeVisibility(map, 2, 2)).toEqual({
      topLeft: true, topRight: true, bottomLeft: true, bottomRight: true
    });
  });

  it('an edge becomes the weak interior divider exactly when the corresponding neighbor is painted', () => {
    const map: Record<string, TerrainTileType> = {
      '2,2': 'GRASS', '1,2': 'GRASS', '2,1': 'GRASS', '2,3': 'GRASS', '3,2': 'GRASS'
    };
    // All four neighbors present - every edge is now interior.
    expect(getTerrainEdgeVisibility(map, 2, 2)).toEqual({
      topLeft: false, topRight: false, bottomLeft: false, bottomRight: false
    });
  });
});
