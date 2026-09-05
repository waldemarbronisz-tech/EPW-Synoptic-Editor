import { describe, it, expect } from 'vitest';
import {
  ISO_TILE_WIDTH, ISO_TILE_HEIGHT,
  tileToScreen, screenToTile, screenToTileRounded, isPointInTile
} from '../iso/IsoGrid';

describe('IsoGrid - tileToScreen', () => {
  it('1. tileToScreen(0,0) returns the origin point', () => {
    expect(tileToScreen(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('2. tileToScreen(1,0) is offset by half tile width RIGHT and half tile height DOWN', () => {
    expect(tileToScreen(1, 0)).toEqual({ x: ISO_TILE_WIDTH / 2, y: ISO_TILE_HEIGHT / 2 });
  });

  it('3. tileToScreen(0,1) is offset by half tile width LEFT and half tile height DOWN', () => {
    expect(tileToScreen(0, 1)).toEqual({ x: -ISO_TILE_WIDTH / 2, y: ISO_TILE_HEIGHT / 2 });
  });
});

describe('IsoGrid - screenToTile round-trip', () => {
  it('4. screenToTile(tileToScreen(gx,gy)) returns back (gx,gy) for 20+ coordinate pairs', () => {
    const pairs: Array<[number, number]> = [];
    for (let gx = -5; gx <= 5; gx++) {
      pairs.push([gx, gx * 2 - 3]);
    }
    // 11 pairs above (gx from -5..5); add 10 more, distinct, to clear 20.
    for (let gy = -4; gy <= 5; gy++) {
      pairs.push([gy + 1, gy]);
    }
    expect(pairs.length).toBeGreaterThanOrEqual(20);

    pairs.forEach(([gx, gy]) => {
      const screen = tileToScreen(gx, gy);
      const back = screenToTile(screen.x, screen.y);
      expect(back.gx).toBeCloseTo(gx, 10);
      expect(back.gy).toBeCloseTo(gy, 10);
    });
  });
});

describe('IsoGrid - screenToTileRounded', () => {
  it('5. the center of tile (3,4) rounds to (3,4)', () => {
    const center = tileToScreen(3, 4);
    expect(screenToTileRounded(center.x, center.y)).toEqual({ gx: 3, gy: 4 });
  });

  it('6. a point just inside the LEFT VERTEX of tile (3,4)\'s diamond still rounds to (3,4), not a neighbor - the crux of this file', () => {
    // Left vertex of tile (3,4) is exactly at tileToScreen(3,4) offset
    // by (-ISO_TILE_WIDTH/2, 0) - fractional coords (2.5, 4.5) exactly,
    // the shared corner of four tiles. One pixel inside from it, back
    // toward the tile's own center:
    const center = tileToScreen(3, 4);
    const leftVertexX = center.x - ISO_TILE_WIDTH / 2;
    const justInsideX = leftVertexX + 1; // one pixel toward the center
    const result = screenToTileRounded(justInsideX, center.y);
    expect(result).toEqual({ gx: 3, gy: 4 });

    // Sanity check on the naive-but-common wrong approach (flooring the
    // same fractional coordinates instead of rounding them) - it must
    // NOT land on (3,4), confirming this point is a genuine edge case
    // and not a trivially-easy one.
    const { gx, gy } = screenToTile(justInsideX, center.y);
    expect({ gx: Math.floor(gx), gy: Math.floor(gy) }).not.toEqual({ gx: 3, gy: 4 });
  });

  it('7. a point just past the diamond edge of tile (3,4) rounds to the neighboring tile', () => {
    // Midpoint of the top-left edge of tile (3,4)'s diamond (between its
    // top and left vertices) is at fractional coords (2.5, 4) exactly -
    // one pixel further out (away from the tile's own center) crosses
    // into neighbor (2,4); one pixel back in stays on (3,4).
    const center = tileToScreen(3, 4);
    const edgeMidX = center.x - ISO_TILE_WIDTH / 4; // (gx-0.5, gy) fractional point, per IsoGrid.ts's own derivation
    const edgeMidY = center.y - ISO_TILE_HEIGHT / 4;

    const justOutside = screenToTileRounded(edgeMidX - 1, edgeMidY);
    expect(justOutside).toEqual({ gx: 2, gy: 4 });

    const justInside = screenToTileRounded(edgeMidX + 1, edgeMidY);
    expect(justInside).toEqual({ gx: 3, gy: 4 });
  });
});

describe('IsoGrid - isPointInTile', () => {
  it('is true for the tile\'s own center', () => {
    const center = tileToScreen(3, 4);
    expect(isPointInTile(center.x, center.y, 3, 4)).toBe(true);
  });

  it('8. is false for a point in the corner of the bounding rectangle of the diamond, outside the diamond itself', () => {
    const center = tileToScreen(3, 4);
    // Top-left corner of the rectangle that exactly bounds the diamond
    // (half width x half height away on both axes) - inside the
    // rectangle, but well outside the diamond shape itself.
    const corner = { x: center.x - ISO_TILE_WIDTH / 2, y: center.y - ISO_TILE_HEIGHT / 2 };
    expect(isPointInTile(corner.x, corner.y, 3, 4)).toBe(false);
  });
});
