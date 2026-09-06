// The PLAN screen's own placed-object model - deliberately NOT a
// SynopticObject: per the original PLAN screen task's own brief, a plan
// object has no terminals and no connections (there is no wiring on the
// PLAN screen at all) and no Fill/Border/Font/Scale, so it carries none
// of those SynopticObject fields. Its only geometry is a grid cell (gx,
// gy) plus, as of fix/iso-tiles-and-rotation, a four-way rotation (see
// SpriteRotation.ts) - width/height/footprint are never stored here,
// they are always resolved from the manifest through spriteId, exactly
// like IsoRenderer.tsx resolves a sprite's pixel dimensions through
// getSpriteState rather than storing them a second time.
import { getSprite } from './SpriteManifest';
import { getRotatedFootprint } from './SpriteRotation';
import type { PlanObjectRotation } from './SpriteRotation';

export interface PlanObject {
  id: string;
  spriteId: string;
  state: string;
  gx: number;
  gy: number;
  // Free-text, same convention as SynopticObject's own designation/name -
  // editable in Properties (commit 6), never read by any placement or
  // rendering logic.
  designation?: string;
  name?: string;
  // fix/iso-tiles-and-rotation commit 3: optional, defaults to 0 (no
  // rotation, no schema version bump - the same additive convention
  // every other optional PlanObject/ProjectSchema field already uses).
  rotation?: PlanObjectRotation;
}

/**
 * The object's own footprint in tiles, resolved from its sprite's
 * manifest entry and then adjusted for its own rotation - a 2x1
 * footprint rotated 90 or 270 degrees occupies 1x2 instead. Defaults to
 * 1x1 if the sprite id no longer resolves (a manifest that shrank since
 * the object was placed).
 */
export function getPlanObjectFootprint(obj: Pick<PlanObject, 'spriteId' | 'rotation'>): { x: number; y: number } {
  const footprint = getSprite(obj.spriteId)?.footprint ?? { x: 1, y: 1 };
  return getRotatedFootprint(footprint, obj.rotation ?? 0);
}
