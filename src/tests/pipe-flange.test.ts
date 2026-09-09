// fix/wiring-and-library-groups commit 4 - the 4 mandatory tests for
// "wyglad przylacza rury" (the Houston-style flange at a water pipe's
// own anchored end). getFlangeSegments (ConnectionLine.tsx) is pure
// geometry - which ends get a short, wider stub, and where - tested
// directly here without rendering any Konva. Test 20 (color) is a
// source-scan: the flange's own four passes literally reuse the SAME
// coreColor/shadowColor/highlightColor variables the pipe's own four
// passes already compute from netState, rather than a second,
// separately-colored copy - by construction, whatever color the pipe
// itself reads for its net state, the flange reads too.

import { describe, it, expect } from 'vitest';
import { getFlangeSegments } from '../components/ConnectionLine';
import connectionLineSource from '../components/ConnectionLine.tsx?raw';
import { GRID_SIZE } from '../theme/ScadaTheme';

function waterConn(points: any[]) {
  return { medium: 'WATER' as const, points };
}

function electricalConn(points: any[]) {
  return { medium: 'ELECTRICAL' as const, points };
}

const ANCHOR = { symbolId: 'b1', terminalId: 'IN' };

describe('17. an anchored water pipe end has a flange', () => {
  it('getFlangeSegments returns one stub for the anchored end, inset by half a grid cell toward the wire', () => {
    const conn = waterConn([{ x: 0, y: 0 }, { x: 100, y: 0, anchor: ANCHOR }]);
    const segments = getFlangeSegments(conn);
    expect(segments).toHaveLength(1);
    expect(segments[0][0]).toEqual({ x: 100, y: 0, anchor: ANCHOR });
    expect(segments[0][1]).toEqual({ x: 100 - GRID_SIZE / 2, y: 0 });
  });

  it('both ends anchored (a short jumper) get two distinct flanges, one at each terminal', () => {
    const conn = waterConn([{ x: 0, y: 0, anchor: ANCHOR }, { x: 100, y: 0, anchor: { symbolId: 'b2', terminalId: 'OUT' } }]);
    const segments = getFlangeSegments(conn);
    expect(segments).toHaveLength(2);
  });
});

describe('18. a free water pipe end has NO flange', () => {
  it('getFlangeSegments returns nothing for an unanchored wire at all', () => {
    const conn = waterConn([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    expect(getFlangeSegments(conn)).toEqual([]);
  });

  it('only the anchored end of a two-end wire gets a flange - the free end gets none', () => {
    const conn = waterConn([{ x: 0, y: 0 }, { x: 100, y: 0, anchor: ANCHOR }]);
    const segments = getFlangeSegments(conn);
    expect(segments).toHaveLength(1);
    expect(segments[0][0].x).toBe(100); // only the anchored end (x=100), never x=0
  });
});

describe('19. an anchored ELECTRICAL pipe end has NO flange', () => {
  it('getFlangeSegments returns nothing for a non-WATER medium, anchored or not', () => {
    const conn = electricalConn([{ x: 0, y: 0 }, { x: 100, y: 0, anchor: ANCHOR }]);
    expect(getFlangeSegments(conn)).toEqual([]);
  });

  it('same for VENTILATION', () => {
    const conn = { medium: 'VENTILATION' as const, points: [{ x: 0, y: 0 }, { x: 100, y: 0, anchor: ANCHOR }] };
    expect(getFlangeSegments(conn)).toEqual([]);
  });
});

describe('20. the flange\'s color follows the net state, same as the pipe itself', () => {
  it('the flange\'s own four passes reuse the exact same coreColor/shadowColor/highlightColor variables the pipe\'s own four passes compute from netState - not a second, independent color', () => {
    // One flange-specific fill Path, using coreColor - the same
    // variable getConductorCoreColor(conn.medium, netState) assigns to
    // the pipe's own fill pass a few lines above it.
    expect(connectionLineSource).toMatch(/flangePath.*stroke=\{coreColor\}/);
    expect(connectionLineSource).toMatch(/flangePath.*stroke=\{shadowColor\}/);
    expect(connectionLineSource).toMatch(/flangePath.*stroke=\{highlightColor\}/);
    // Sanity: no separate, hardcoded hex color anywhere near the flange block.
    const flangeBlockStart = connectionLineSource.indexOf('Pipe flange (commit 4)');
    const flangeBlock = connectionLineSource.slice(flangeBlockStart, flangeBlockStart + 1500);
    expect(flangeBlock.match(/#[0-9A-Fa-f]{3,8}\b/)).toBeNull();
  });
});
