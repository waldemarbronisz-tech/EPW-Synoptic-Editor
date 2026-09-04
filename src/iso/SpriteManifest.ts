// Loading and validation for the PLAN screen's sprite manifest
// (public/sprites/iso/manifest.json). Same convention as
// DeviceValidation.ts: validateSpriteManifest takes `unknown`, never
// throws, checks shape first (one issue per malformed item, excluded
// from further checks), then business rules - every violation is an
// ERROR, never a WARNING, because a malformed manifest must not be
// silently half-accepted.
//
// No sprite dimension, anchor point or file name is ever written into
// this app's own source - every one of those three comes from the
// manifest object this file loads and validates; IsoGrid.ts's own
// ISO_TILE_WIDTH/ISO_TILE_HEIGHT constants are the only iso-related
// numbers allowed to live in code, per that file's own header.

import { useStore } from '../store';

export interface SpriteFootprint {
  x: number;
  y: number;
}

export interface SpriteStateEntry {
  file: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export interface SpriteDefinition {
  id: string;
  description: string;
  footprint: SpriteFootprint;
  states: Record<string, SpriteStateEntry>;
}

export interface SpriteManifestData {
  tileWidth: number;
  tileHeight: number;
  metersPerTile: number;
  sprites: SpriteDefinition[];
}

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  spriteId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ---- shape primitives (same small helpers DeviceValidation.ts uses) ---

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// NaN and Infinity both satisfy `typeof x === 'number'` - Number.isFinite
// (and, where the rule calls for it, Number.isInteger, which itself
// already implies finite) is what actually rejects them.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// ---- shape validation ---------------------------------------------------
// One function per item kind, same convention as DeviceValidation.ts's
// validate*Shape functions: on success returns a properly-typed value; on
// failure pushes ONE issue describing everything wrong with that item and
// returns null, so the caller excludes it from business-rule checks
// entirely rather than cascading secondary errors from a value that was
// never valid to begin with.

function validateStateShape(raw: unknown, spriteId: string, stateKey: string, issues: ValidationIssue[]): SpriteStateEntry | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_STATE_INVALID_SHAPE', message: `Sprite '${spriteId}' state '${stateKey}' must be an object`, spriteId });
    return null;
  }

  const problems: string[] = [];
  if (!isString(raw.file) || raw.file.length === 0) problems.push('file must be a non-empty string');
  if (!isNonNegativeInt(raw.width)) problems.push('width must be a non-negative integer');
  if (!isNonNegativeInt(raw.height)) problems.push('height must be a non-negative integer');
  if (!isNonNegativeInt(raw.anchorX)) problems.push('anchorX must be a non-negative integer');
  if (!isNonNegativeInt(raw.anchorY)) problems.push('anchorY must be a non-negative integer');

  if (problems.length > 0) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_STATE_INVALID_SHAPE', message: `Sprite '${spriteId}' state '${stateKey}': ${problems.join('; ')}`, spriteId });
    return null;
  }

  const state: SpriteStateEntry = {
    file: raw.file as string,
    width: raw.width as number,
    height: raw.height as number,
    anchorX: raw.anchorX as number,
    anchorY: raw.anchorY as number,
  };

  // Business rule, not shape: an anchor is a point WITHIN the sprite's own
  // bounding box (it is where the sprite touches the ground), so it can
  // never exceed the sprite's own width/height.
  if (state.anchorX > state.width) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_STATE_ANCHOR_X_OUT_OF_BOUNDS', message: `Sprite '${spriteId}' state '${stateKey}': anchorX (${state.anchorX}) must not exceed width (${state.width})`, spriteId });
  }
  if (state.anchorY > state.height) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_STATE_ANCHOR_Y_OUT_OF_BOUNDS', message: `Sprite '${spriteId}' state '${stateKey}': anchorY (${state.anchorY}) must not exceed height (${state.height})`, spriteId });
  }

  return state;
}

function validateFootprintShape(raw: unknown, spriteId: string, issues: ValidationIssue[]): SpriteFootprint | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_FOOTPRINT_INVALID_SHAPE', message: `Sprite '${spriteId}': footprint must be an object`, spriteId });
    return null;
  }

  const problems: string[] = [];
  if (!isFiniteNumber(raw.x) || !Number.isInteger(raw.x)) problems.push('footprint.x must be an integer');
  if (!isFiniteNumber(raw.y) || !Number.isInteger(raw.y)) problems.push('footprint.y must be an integer');

  if (problems.length > 0) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_FOOTPRINT_INVALID_SHAPE', message: `Sprite '${spriteId}': ${problems.join('; ')}`, spriteId });
    return null;
  }

  const footprint = { x: raw.x as number, y: raw.y as number };

  // Business rule: a footprint of zero or negative tiles cannot be
  // placed on the grid at all.
  if (!(footprint.x > 0)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_FOOTPRINT_INVALID_X', message: `Sprite '${spriteId}': footprint.x must be greater than zero`, spriteId });
  }
  if (!(footprint.y > 0)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_FOOTPRINT_INVALID_Y', message: `Sprite '${spriteId}': footprint.y must be greater than zero`, spriteId });
  }

  return footprint;
}

function validateSpriteShape(raw: unknown, index: number, issues: ValidationIssue[]): SpriteDefinition | null {
  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_INVALID_SHAPE', message: `Sprite at index ${index} must be an object` });
    return null;
  }

  const idForMessages = isString(raw.id) ? raw.id : `#${index}`;

  if (!isString(raw.id) || raw.id.length === 0) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_EMPTY_ID', message: `Sprite at index ${index}: id must be a non-empty string` });
    return null;
  }
  const id = raw.id;

  if (!isString(raw.description)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_INVALID_SHAPE', message: `Sprite '${idForMessages}': description must be a string`, spriteId: id });
    return null;
  }

  const footprint = validateFootprintShape(raw.footprint, id, issues);
  if (!footprint) return null;

  if (!isPlainObject(raw.states)) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_INVALID_SHAPE', message: `Sprite '${id}': states must be an object`, spriteId: id });
    return null;
  }

  const stateKeys = Object.keys(raw.states);
  if (stateKeys.length === 0) {
    issues.push({ severity: 'ERROR', code: 'SPRITE_NO_STATES', message: `Sprite '${id}': must define at least one state`, spriteId: id });
    return null;
  }

  const states: Record<string, SpriteStateEntry> = {};
  let anyStateInvalid = false;
  for (const key of stateKeys) {
    const state = validateStateShape((raw.states as Record<string, unknown>)[key], id, key, issues);
    if (!state) {
      anyStateInvalid = true;
      continue;
    }
    states[key] = state;
  }
  if (anyStateInvalid) return null;

  return { id, description: raw.description, footprint, states };
}

/**
 * Validates a whole sprite manifest loaded from an untrusted source (JSON
 * from disk). Shape is checked first, item by item; anything with the
 * wrong shape is reported once and excluded from the id-uniqueness check
 * below, exactly as DeviceValidation.ts's validateDeviceRegistry excludes
 * malformed devices from its own business-rule checks.
 */
export function validateSpriteManifest(raw: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    issues.push({ severity: 'ERROR', code: 'MANIFEST_INVALID_SHAPE', message: 'Sprite manifest must be an object' });
    return { valid: false, issues };
  }

  if (!(isFiniteNumber(raw.tileWidth) && raw.tileWidth > 0)) {
    issues.push({ severity: 'ERROR', code: 'MANIFEST_INVALID_TILE_WIDTH', message: 'Sprite manifest: tileWidth must be a number greater than zero' });
  }
  if (!(isFiniteNumber(raw.tileHeight) && raw.tileHeight > 0)) {
    issues.push({ severity: 'ERROR', code: 'MANIFEST_INVALID_TILE_HEIGHT', message: 'Sprite manifest: tileHeight must be a number greater than zero' });
  }

  if (!Array.isArray(raw.sprites)) {
    issues.push({ severity: 'ERROR', code: 'MANIFEST_INVALID_SPRITES', message: 'Sprite manifest: sprites must be an array' });
    return { valid: false, issues };
  }

  const sprites = raw.sprites
    .map((entry, i) => validateSpriteShape(entry, i, issues))
    .filter((s): s is SpriteDefinition => s !== null);

  const seenIds = new Set<string>();
  for (const sprite of sprites) {
    if (seenIds.has(sprite.id)) {
      issues.push({ severity: 'ERROR', code: 'SPRITE_DUPLICATE_ID', message: `Duplicate sprite id '${sprite.id}'`, spriteId: sprite.id });
    }
    seenIds.add(sprite.id);
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');
  return { valid: !hasErrors, issues };
}

// ---- loading + lookup ---------------------------------------------------
// Module-level cache of the last successfully validated manifest - same
// "load once, read many" convention as SymbolRegistry.ts's own registry.
// A manifest that fails validation is never installed here: getSprite/
// getSpriteState then simply find nothing, rather than serving a
// half-broken manifest.

let currentManifest: SpriteManifestData | null = null;

/**
 * Fetches and validates public/sprites/iso/manifest.json. Never throws:
 * a network failure, a JSON parse error and a validation failure are all
 * reported back as issues, the same shape validateSpriteManifest itself
 * returns, so callers do not need two different error-handling paths.
 */
export async function loadSpriteManifest(): Promise<ValidationResult> {
  let raw: unknown;
  try {
    const response = await fetch('/sprites/iso/manifest.json');
    if (!response.ok) {
      return { valid: false, issues: [{ severity: 'ERROR', code: 'MANIFEST_FETCH_FAILED', message: `Failed to fetch sprite manifest: HTTP ${response.status}` }] };
    }
    raw = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, issues: [{ severity: 'ERROR', code: 'MANIFEST_FETCH_FAILED', message: `Failed to fetch sprite manifest: ${message}` }] };
  }

  const result = validateSpriteManifest(raw);
  currentManifest = result.valid ? (raw as SpriteManifestData) : null;
  return result;
}

/** Test-only escape hatch: installs an already-validated manifest directly, without a fetch. */
export function setSpriteManifestForTesting(manifest: SpriteManifestData | null): void {
  currentManifest = manifest;
}

/** Every sprite in the currently loaded manifest - what the PLAN library reads to build its list. Empty until loadSpriteManifest resolves. */
export function listSprites(): SpriteDefinition[] {
  return currentManifest?.sprites ?? [];
}

export function getSprite(id: string): SpriteDefinition | undefined {
  return currentManifest?.sprites.find(s => s.id === id);
}

/**
 * The sprite's drawable state entry for `state`, plus which state name it
 * actually is. When `state` is not one of the sprite's own defined
 * states, falls back to the first one defined in the manifest and reports
 * the substitution in the Messages panel - the same "recoverable, but
 * worth telling the operator about" convention `[WARNING]` messages
 * already use elsewhere (see ProjectFileService.ts).
 */
export function getSpriteState(id: string, state: string): { stateName: string; entry: SpriteStateEntry } | undefined {
  const sprite = getSprite(id);
  if (!sprite) return undefined;

  const entry = sprite.states[state];
  if (entry) return { stateName: state, entry };

  const fallbackName = Object.keys(sprite.states)[0];
  const fallbackEntry = sprite.states[fallbackName];
  useStore.getState().addMessage(`[WARNING] Sprite '${id}' has no state '${state}' - showing '${fallbackName}' instead`);
  return { stateName: fallbackName, entry: fallbackEntry };
}
