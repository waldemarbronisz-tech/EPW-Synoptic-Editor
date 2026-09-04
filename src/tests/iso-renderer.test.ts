import { describe, it, expect } from 'vitest';
import {
  sortPlacementsByDepth, compareByDepth, buildDrawOrder, getSpriteDrawPosition
} from '../iso/IsoRenderer';
import type { IsoPlacedObject } from '../iso/IsoRenderer';
import { tileToScreen } from '../iso/IsoGrid';

function place(id: string, gx: number, gy: number, footprint = { x: 1, y: 1 }): IsoPlacedObject {
  return { id, spriteId: 'test.sprite', state: 'DEFAULT', gx, gy, footprint };
}

describe('IsoRenderer - depth sorting', () => {
  it('9. an object on tile (2,2) is drawn AFTER an object on tile (1,1)', () => {
    const a = place('A', 1, 1);
    const b = place('B', 2, 2);
    const sorted = sortPlacementsByDepth([b, a]); // deliberately given out of order
    expect(sorted.map(p => p.id)).toEqual(['A', 'B']); // A (farther) drawn first, B (closer) drawn after/on top
  });

  it('10. objects on (0,3) and (3,0) share the same sum - gx decides the order', () => {
    const low = place('LOW_GX', 0, 3);  // sum 3, gx 0
    const high = place('HIGH_GX', 3, 0); // sum 3, gx 3
    const sorted = sortPlacementsByDepth([high, low]);
    expect(sorted.map(p => p.id)).toEqual(['LOW_GX', 'HIGH_GX']); // lower gx drawn first
  });

  it('11. a 2x2-footprint object at (1,1) sorts exactly like a 1x1 object at (2,2)', () => {
    const wide = place('WIDE', 1, 1, { x: 2, y: 2 });
    const reference = place('REF', 2, 2);
    // Both orderings must agree, whichever comes first in the input.
    expect(compareByDepth(wide, reference)).toBe(0);
    expect(compareByDepth(reference, wide)).toBe(0);

    // And sorted against a clearly-farther and clearly-closer third
    // object, WIDE must land in exactly the same slot REF would.
    const farther = place('FARTHER', 0, 0);
    const closer = place('CLOSER', 5, 5);
    const sortedWithWide = sortPlacementsByDepth([closer, wide, farther]).map(p => p.id);
    const sortedWithRef = sortPlacementsByDepth([closer, reference, farther]).map(p => p.id);
    expect(sortedWithWide).toEqual(['FARTHER', 'WIDE', 'CLOSER']);
    expect(sortedWithRef).toEqual(['FARTHER', 'REF', 'CLOSER']);
  });

  it('12. every terrain tile is drawn before every object, regardless of grid coordinates', () => {
    // Terrain tiles deliberately placed at HIGH gx+gy sums (closer to the
    // camera than any of the objects below) - if terrain were subject to
    // the same depth comparison as objects, these would have to sort
    // AFTER at least one of them. The rule is unconditional: they must
    // not.
    const terrainTiles = { '9,9': 'GRASS' as const, '10,10': 'WATER' as const };
    const objects = [place('NEAR_ORIGIN', 0, 0), place('MID', 3, 3)];

    const order = buildDrawOrder(terrainTiles, objects);
    const lastTerrainIndex = order.map(i => i.kind).lastIndexOf('terrain');
    const firstObjectIndex = order.map(i => i.kind).indexOf('object');

    expect(lastTerrainIndex).toBeGreaterThanOrEqual(0);
    expect(firstObjectIndex).toBeGreaterThan(lastTerrainIndex);
    // And the object portion is itself still in correct depth order.
    const objectIds = order.filter(i => i.kind === 'object').map(i => (i as { kind: 'object'; placement: IsoPlacedObject }).placement.id);
    expect(objectIds).toEqual(['NEAR_ORIGIN', 'MID']);
  });
});

describe('IsoRenderer - sprite placement', () => {
  it('13. a sprite placed on tile (5,5) has its anchor point exactly at that tile\'s own center', () => {
    const anchorX = 40;
    const anchorY = 70;
    const drawPos = getSpriteDrawPosition(5, 5, anchorX, anchorY);

    // The anchor point, relative to the sprite's own top-left draw
    // position, is exactly (anchorX, anchorY) - so the anchor's absolute
    // screen position is drawPos + anchor.
    const anchorScreenPos = { x: drawPos.x + anchorX, y: drawPos.y + anchorY };
    expect(anchorScreenPos).toEqual(tileToScreen(5, 5));
  });
});
