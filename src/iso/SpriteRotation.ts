// Four-way rotation for PLAN objects - pure, Konva-free (same convention
// as IsoGrid.ts/TerrainTile.ts), so the trickiest part of this feature
// (the anchor correction a horizontal mirror needs) is directly unit
// testable without a Stage, an Image, or even a real manifest entry.
//
// Rotation 0 and 90 both draw the sprite's own FRONT view (0 as-is, 90
// mirrored horizontally) - a mirror flip is enough because a left/right
// swap is all a 90-degree turn changes about a flat, single-view sprite.
// Rotation 180 and 270 need the REAR view instead (180 as-is, 270
// mirrored) - no mirror flip can derive a building's own back from its
// front, since the back has its own window/door/chimney layout, so this
// is only possible when the manifest's own SpriteStateEntry carries a
// fileBack (SpriteManifest.ts, commit 2). getAvailableRotations below is
// what makes that availability data-driven: it reads hasRearView on the
// entry, never a hardcoded per-sprite list.

import { hasRearView } from './SpriteManifest';
import type { SpriteStateEntry } from './SpriteManifest';

export type PlanObjectRotation = 0 | 90 | 180 | 270;

// Ascending, which also happens to be clockwise order - getNextRotation
// below relies on that to make "next" and "previous" a simple array
// step in either direction.
export const ALL_ROTATIONS: readonly PlanObjectRotation[] = [0, 90, 180, 270];

/** 90 and 270 both draw mirrored (and, as a direct consequence, are exactly the two rotations that swap a footprint's own width/height - see getRotatedFootprint). */
export function isRotationMirrored(rotation: PlanObjectRotation): boolean {
  return rotation === 90 || rotation === 270;
}

/** 180 and 270 both need the sprite's REAR view. */
export function isRearRotation(rotation: PlanObjectRotation): boolean {
  return rotation === 180 || rotation === 270;
}

/**
 * Which of the four rotations a given sprite STATE actually supports -
 * [0, 90] always; 180 and 270 join the list only when this exact state
 * entry has a rear view. A sprite can, in principle, have one state with
 * a rear view and another without (nothing in the manifest schema ties
 * them together) - this deliberately reads the one entry actually being
 * displayed, not some sprite-wide flag invented on top of it.
 */
export function getAvailableRotations(entry: SpriteStateEntry): PlanObjectRotation[] {
  return hasRearView(entry) ? [0, 90, 180, 270] : [0, 90];
}

/** The next rotation in `available` (its own array order, cw = forward, ccw = backward), wrapping around - and starting from index 0 if `current` is not itself in `available` (e.g. a state that lost its rear view since an object was last rotated). */
export function getNextRotation(available: PlanObjectRotation[], current: PlanObjectRotation, direction: 'cw' | 'ccw'): PlanObjectRotation {
  const fromIndex = available.indexOf(current);
  const from = fromIndex === -1 ? 0 : fromIndex;
  const delta = direction === 'cw' ? 1 : -1;
  const nextIndex = (from + delta + available.length) % available.length;
  return available[nextIndex];
}

/** A 90 or 270 degree turn exchanges footprint.x and footprint.y (a 2x1 object becomes 1x2); 0 and 180 leave it exactly as the manifest declares it. */
export function getRotatedFootprint(footprint: { x: number; y: number }, rotation: PlanObjectRotation): { x: number; y: number } {
  return isRotationMirrored(rotation) ? { x: footprint.y, y: footprint.x } : footprint;
}

export interface ResolvedSpriteView {
  file: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  mirrored: boolean;
  // True when `rotation` called for the rear view but this entry has
  // none - the caller falls back to the front view and is expected to
  // report that substitution itself (IsoRenderer.tsx does, once per
  // object, in the Messages panel) - resolveSpriteView itself never
  // throws and never silently draws nothing.
  fellBackToFront: boolean;
}

/**
 * Resolves which file/dimensions/anchor to actually draw for one sprite
 * state entry at a given rotation, including the one correction a
 * mirror flip requires: a Konva Image mirrored via scaleX=-1 flips
 * around its own local x=0, which is the sprite's LEFT edge - so the
 * anchor point, measured from the front view's own left edge, has to be
 * re-measured from the RIGHT edge instead (anchorX' = width - anchorX)
 * for it to still land in the same place once mirrored. anchorY is
 * unaffected - a horizontal-only mirror never touches vertical
 * position.
 */
export function resolveSpriteView(entry: SpriteStateEntry, rotation: PlanObjectRotation): ResolvedSpriteView {
  const wantsRear = isRearRotation(rotation);
  const mirrored = isRotationMirrored(rotation);
  const useRear = wantsRear && hasRearView(entry);
  const fellBackToFront = wantsRear && !useRear;

  const file = useRear ? entry.fileBack! : entry.file;
  const width = useRear ? entry.backWidth! : entry.width;
  const height = useRear ? entry.backHeight! : entry.height;
  const anchorX = useRear ? entry.backAnchorX! : entry.anchorX;
  const anchorY = useRear ? entry.backAnchorY! : entry.anchorY;

  return {
    file,
    width,
    height,
    anchorX: mirrored ? width - anchorX : anchorX,
    anchorY,
    mirrored,
    fellBackToFront,
  };
}
