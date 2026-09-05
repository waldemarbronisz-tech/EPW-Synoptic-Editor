import { describe, it, expect, beforeEach } from 'vitest';
import { getPlanObjectFootprint } from '../iso/PlanObject';
import { setSpriteManifestForTesting } from '../iso/SpriteManifest';
import type { SpriteManifestData } from '../iso/SpriteManifest';

describe('PlanObject - getPlanObjectFootprint', () => {
  beforeEach(() => {
    const manifest: SpriteManifestData = {
      tileWidth: 128, tileHeight: 64, metersPerTile: 8,
      sprites: [{
        id: 'building.warehouse', description: 'Hala', footprint: { x: 3, y: 2 },
        states: { DEFAULT: { file: 'x.png', width: 10, height: 10, anchorX: 5, anchorY: 10 } }
      }]
    };
    setSpriteManifestForTesting(manifest);
  });

  it('resolves the footprint from the sprite\'s own manifest entry', () => {
    expect(getPlanObjectFootprint({ spriteId: 'building.warehouse' })).toEqual({ x: 3, y: 2 });
  });

  it('defaults to 1x1 when the sprite id no longer resolves', () => {
    expect(getPlanObjectFootprint({ spriteId: 'nope' })).toEqual({ x: 1, y: 1 });
  });
});
