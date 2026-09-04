import { describe, it, expect, vi } from 'vitest';
import { isLocalPointOnOpaquePixel, toSpriteLocalPoint } from '../iso/SpriteHitTest';

describe('SpriteHitTest - toSpriteLocalPoint', () => {
  it('subtracts the sprite\'s own draw position from a world point', () => {
    expect(toSpriteLocalPoint(150, 220, 100, 200)).toEqual({ x: 50, y: 20 });
  });
});

describe('SpriteHitTest - isLocalPointOnOpaquePixel', () => {
  it('rejects a point outside the bounding box entirely, without ever sampling alpha', () => {
    const sampleAlpha = vi.fn(() => 255);
    expect(isLocalPointOnOpaquePixel(-1, 10, 100, 100, sampleAlpha)).toBe(false);
    expect(isLocalPointOnOpaquePixel(10, -1, 100, 100, sampleAlpha)).toBe(false);
    expect(isLocalPointOnOpaquePixel(100, 10, 100, 100, sampleAlpha)).toBe(false); // exactly at width = out of bounds
    expect(isLocalPointOnOpaquePixel(10, 100, 100, 100, sampleAlpha)).toBe(false); // exactly at height = out of bounds
    expect(sampleAlpha).not.toHaveBeenCalled();
  });

  it('rejects a point inside the bounding box but over a fully transparent pixel - the exact scenario the task calls out (a transparent corner of the sprite rectangle)', () => {
    const sampleAlpha = () => 0;
    expect(isLocalPointOnOpaquePixel(5, 5, 100, 100, sampleAlpha)).toBe(false);
  });

  it('accepts a point inside the bounding box over any non-zero-alpha pixel', () => {
    const sampleAlpha = () => 1;
    expect(isLocalPointOnOpaquePixel(5, 5, 100, 100, sampleAlpha)).toBe(true);
    const sampleAlphaFull = () => 255;
    expect(isLocalPointOnOpaquePixel(50, 50, 100, 100, sampleAlphaFull)).toBe(true);
  });

  it('samples the FLOORED integer pixel, not a fractional coordinate', () => {
    const sampleAlpha = vi.fn(() => 255);
    isLocalPointOnOpaquePixel(5.9, 7.2, 100, 100, sampleAlpha);
    expect(sampleAlpha).toHaveBeenCalledWith(5, 7);
  });
});
