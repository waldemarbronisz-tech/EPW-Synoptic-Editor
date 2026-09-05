/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateSpriteManifest, getSprite, getSpriteState, listSprites, setSpriteManifestForTesting
} from '../iso/SpriteManifest';
import type { SpriteManifestData } from '../iso/SpriteManifest';
import { useStore } from '../store';

function validManifest(): SpriteManifestData {
  return {
    tileWidth: 128,
    tileHeight: 64,
    metersPerTile: 8,
    sprites: [
      {
        id: 'gate.sliding',
        description: 'Brama przesuwna',
        footprint: { x: 2, y: 1 },
        states: {
          CLOSED: { file: 'gate_sliding_CLOSED.png', width: 96, height: 62, anchorX: 48, anchorY: 62 },
        },
      },
    ],
  };
}

describe('SpriteManifest - validateSpriteManifest shape and rule checks', () => {
  it('rejects null', () => {
    const result = validateSpriteManifest(null);
    expect(result.valid).toBe(false);
    expect(result.issues[0].severity).toBe('ERROR');
  });

  it('rejects a manifest with no sprites array', () => {
    const result = validateSpriteManifest({ tileWidth: 128, tileHeight: 64, metersPerTile: 8 });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'MANIFEST_INVALID_SPRITES')).toBe(true);
  });

  it('rejects sprites that is not an array', () => {
    const result = validateSpriteManifest({ tileWidth: 128, tileHeight: 64, metersPerTile: 8, sprites: 'nope' });
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'MANIFEST_INVALID_SPRITES')).toBe(true);
  });

  it('rejects tileWidth <= 0', () => {
    const manifest = { ...validManifest(), tileWidth: 0 };
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'MANIFEST_INVALID_TILE_WIDTH')).toBe(true);
  });

  it('rejects tileHeight <= 0', () => {
    const manifest = { ...validManifest(), tileHeight: -1 };
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'MANIFEST_INVALID_TILE_HEIGHT')).toBe(true);
  });

  it('rejects a sprite with an empty id', () => {
    const manifest = validManifest();
    manifest.sprites[0].id = '';
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_EMPTY_ID')).toBe(true);
  });

  it('rejects a sprite with a non-integer or non-positive footprint', () => {
    const manifest = validManifest();
    manifest.sprites[0].footprint = { x: 0, y: 1 };
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_FOOTPRINT_INVALID_X')).toBe(true);
  });

  it('rejects a sprite with zero states', () => {
    const manifest = validManifest();
    manifest.sprites[0].states = {};
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_NO_STATES')).toBe(true);
  });

  it('rejects a state with an empty file name', () => {
    const manifest = validManifest();
    manifest.sprites[0].states.CLOSED.file = '';
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_STATE_INVALID_SHAPE')).toBe(true);
  });

  it('rejects anchorX greater than width', () => {
    const manifest = validManifest();
    manifest.sprites[0].states.CLOSED.anchorX = 999;
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_STATE_ANCHOR_X_OUT_OF_BOUNDS')).toBe(true);
  });

  it('rejects anchorY greater than height', () => {
    const manifest = validManifest();
    manifest.sprites[0].states.CLOSED.anchorY = 999;
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_STATE_ANCHOR_Y_OUT_OF_BOUNDS')).toBe(true);
  });

  it('rejects negative width/height/anchor values', () => {
    const manifest = validManifest();
    manifest.sprites[0].states.CLOSED.width = -5;
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_STATE_INVALID_SHAPE')).toBe(true);
  });

  it('rejects a duplicate sprite id', () => {
    const manifest = validManifest();
    manifest.sprites.push({ ...manifest.sprites[0] });
    const result = validateSpriteManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'SPRITE_DUPLICATE_ID')).toBe(true);
  });

  it('accepts a well-formed manifest with zero issues', () => {
    const result = validateSpriteManifest(validManifest());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('loads the REAL manifest shipped in public/sprites/iso/manifest.json and it passes validation with zero errors', () => {
    const manifestPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/sprites/iso/manifest.json');
    const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const result = validateSpriteManifest(raw);
    expect(result.issues.filter(i => i.severity === 'ERROR')).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('SpriteManifest - getSprite / getSpriteState / listSprites', () => {
  beforeEach(() => {
    setSpriteManifestForTesting(validManifest());
    useStore.setState({ messages: [] });
  });

  it('getSprite finds a sprite by id', () => {
    expect(getSprite('gate.sliding')?.description).toBe('Brama przesuwna');
  });

  it('getSprite returns undefined for an unknown id', () => {
    expect(getSprite('nope')).toBeUndefined();
  });

  it('listSprites returns every sprite in the loaded manifest', () => {
    expect(listSprites()).toHaveLength(1);
  });

  it('listSprites is empty when no manifest has been loaded', () => {
    setSpriteManifestForTesting(null);
    expect(listSprites()).toEqual([]);
  });

  it('getSpriteState returns the requested state when it exists', () => {
    const result = getSpriteState('gate.sliding', 'CLOSED');
    expect(result?.stateName).toBe('CLOSED');
    expect(result?.entry.file).toBe('gate_sliding_CLOSED.png');
  });

  it('getSpriteState falls back to the first defined state and reports it in Messages when the requested state does not exist', () => {
    const result = getSpriteState('gate.sliding', 'OPEN');
    expect(result?.stateName).toBe('CLOSED');
    const messages = useStore.getState().messages;
    expect(messages.some(m => m.type === 'warning' && m.text.includes('OPEN') && m.text.includes('CLOSED'))).toBe(true);
  });
});
