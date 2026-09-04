// The PLAN screen's own placed-object model - deliberately NOT a
// SynopticObject: per this task's own brief, a plan object has no
// terminals and no connections (there is no wiring on the PLAN screen at
// all), so it carries none of SynopticObject's port/binding/rotation/
// scale fields. Its only geometry is a grid cell (gx, gy); its only
// visual identity is which manifest sprite (and which of that sprite's
// states) draws it - width/height/footprint are never stored here, they
// are always resolved from the manifest through spriteId, exactly like
// IsoRenderer.tsx resolves a sprite's pixel dimensions through
// getSpriteState rather than storing them a second time.
import { getSprite } from './SpriteManifest';

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
}

/** The object's own footprint in tiles, resolved from its sprite's manifest entry - defaults to 1x1 if the sprite id no longer resolves (a manifest that shrank since the object was placed). */
export function getPlanObjectFootprint(obj: Pick<PlanObject, 'spriteId'>): { x: number; y: number } {
  return getSprite(obj.spriteId)?.footprint ?? { x: 1, y: 1 };
}
