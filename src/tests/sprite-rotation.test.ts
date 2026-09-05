import { describe, it, expect } from 'vitest';
import {
  resolveSpriteView, getAvailableRotations, getRotatedFootprint, getNextRotation,
  isRotationMirrored, isRearRotation
} from '../iso/SpriteRotation';
import type { SpriteStateEntry } from '../iso/SpriteManifest';

// A front-only entry (no rear view) - the shape every sprite in the
// REAL public/sprites/iso/manifest.json has today.
function frontOnlyEntry(): SpriteStateEntry {
  return { file: 'gate_CLOSED.png', width: 96, height: 62, anchorX: 48, anchorY: 62 };
}

// The same entry, with a rear view added - deliberately different
// numbers on the back view (a real building's back is a different
// drawing, not a copy) so a test mixing them up would be caught.
function entryWithRearView(): SpriteStateEntry {
  return {
    ...frontOnlyEntry(),
    fileBack: 'gate_CLOSED_back.png', backWidth: 100, backHeight: 70, backAnchorX: 40, backAnchorY: 70,
  };
}

describe('SpriteRotation - resolveSpriteView', () => {
  it('7. rotation 0 draws the front view, unmirrored', () => {
    const entry = entryWithRearView();
    const view = resolveSpriteView(entry, 0);
    expect(view.file).toBe(entry.file);
    expect(view.width).toBe(entry.width);
    expect(view.height).toBe(entry.height);
    expect(view.anchorX).toBe(entry.anchorX);
    expect(view.anchorY).toBe(entry.anchorY);
    expect(view.mirrored).toBe(false);
    expect(view.fellBackToFront).toBe(false);
  });

  it('8. rotation 90 draws the front view MIRRORED, anchorX = width - anchorX', () => {
    const entry = entryWithRearView();
    const view = resolveSpriteView(entry, 90);
    expect(view.file).toBe(entry.file); // still the FRONT file - 90 never needs a rear view
    expect(view.mirrored).toBe(true);
    expect(view.anchorX).toBe(entry.width - entry.anchorX);
    expect(view.anchorY).toBe(entry.anchorY); // unaffected by a horizontal-only mirror
    expect(view.fellBackToFront).toBe(false);
  });

  it('9. rotation 180 draws the rear view (fileBack), unmirrored', () => {
    const entry = entryWithRearView();
    const view = resolveSpriteView(entry, 180);
    expect(view.file).toBe(entry.fileBack);
    expect(view.width).toBe(entry.backWidth);
    expect(view.height).toBe(entry.backHeight);
    expect(view.anchorX).toBe(entry.backAnchorX); // no mirror at 180 - unchanged
    expect(view.anchorY).toBe(entry.backAnchorY);
    expect(view.mirrored).toBe(false);
    expect(view.fellBackToFront).toBe(false);
  });

  it('10. rotation 270 draws the rear view MIRRORED, anchorX measured from the rear view\'s own width', () => {
    const entry = entryWithRearView();
    const view = resolveSpriteView(entry, 270);
    expect(view.file).toBe(entry.fileBack);
    expect(view.mirrored).toBe(true);
    expect(view.anchorX).toBe(entry.backWidth! - entry.backAnchorX!);
    expect(view.anchorY).toBe(entry.backAnchorY);
    expect(view.fellBackToFront).toBe(false);
  });

  it('15. rotation 180 on a sprite state WITHOUT a rear view falls back to the front view and never throws', () => {
    const entry = frontOnlyEntry();
    expect(() => resolveSpriteView(entry, 180)).not.toThrow();
    const view = resolveSpriteView(entry, 180);
    expect(view.file).toBe(entry.file);
    expect(view.width).toBe(entry.width);
    expect(view.anchorX).toBe(entry.anchorX);
    expect(view.mirrored).toBe(false); // 180 itself is never mirrored, front-view fallback or not
    expect(view.fellBackToFront).toBe(true);
  });

  it('rotation 270 on a sprite state without a rear view falls back to the MIRRORED front view', () => {
    const entry = frontOnlyEntry();
    const view = resolveSpriteView(entry, 270);
    expect(view.file).toBe(entry.file);
    expect(view.mirrored).toBe(true);
    expect(view.anchorX).toBe(entry.width - entry.anchorX);
    expect(view.fellBackToFront).toBe(true);
  });
});

describe('SpriteRotation - getAvailableRotations', () => {
  it('11. a sprite state without fileBack offers only [0, 90]', () => {
    expect(getAvailableRotations(frontOnlyEntry())).toEqual([0, 90]);
  });

  it('12. a sprite state with fileBack offers [0, 90, 180, 270]', () => {
    expect(getAvailableRotations(entryWithRearView())).toEqual([0, 90, 180, 270]);
  });
});

describe('SpriteRotation - getRotatedFootprint', () => {
  it('13. a 2x1 footprint rotated 90 degrees becomes 1x2', () => {
    expect(getRotatedFootprint({ x: 2, y: 1 }, 90)).toEqual({ x: 1, y: 2 });
  });

  it('13b. a 2x1 footprint rotated 270 degrees also becomes 1x2', () => {
    expect(getRotatedFootprint({ x: 2, y: 1 }, 270)).toEqual({ x: 1, y: 2 });
  });

  it('14. a 2x1 footprint rotated 180 degrees stays 2x1', () => {
    expect(getRotatedFootprint({ x: 2, y: 1 }, 180)).toEqual({ x: 2, y: 1 });
  });

  it('a 2x1 footprint at rotation 0 stays 2x1', () => {
    expect(getRotatedFootprint({ x: 2, y: 1 }, 0)).toEqual({ x: 2, y: 1 });
  });
});

describe('SpriteRotation - isRotationMirrored / isRearRotation', () => {
  it('exactly 90 and 270 are mirrored', () => {
    expect(isRotationMirrored(0)).toBe(false);
    expect(isRotationMirrored(90)).toBe(true);
    expect(isRotationMirrored(180)).toBe(false);
    expect(isRotationMirrored(270)).toBe(true);
  });

  it('exactly 180 and 270 are rear-view rotations', () => {
    expect(isRearRotation(0)).toBe(false);
    expect(isRearRotation(90)).toBe(false);
    expect(isRearRotation(180)).toBe(true);
    expect(isRearRotation(270)).toBe(true);
  });
});

describe('SpriteRotation - getNextRotation (16. R-key cycling)', () => {
  it('cycles through all four rotations, in order, wrapping back to 0 - a sprite WITH a rear view', () => {
    const available = getAvailableRotations(entryWithRearView());
    expect(getNextRotation(available, 0, 'cw')).toBe(90);
    expect(getNextRotation(available, 90, 'cw')).toBe(180);
    expect(getNextRotation(available, 180, 'cw')).toBe(270);
    expect(getNextRotation(available, 270, 'cw')).toBe(0);
  });

  it('skips 180 and 270 entirely for a sprite WITHOUT a rear view - only ever 0 and 90', () => {
    const available = getAvailableRotations(frontOnlyEntry());
    expect(getNextRotation(available, 0, 'cw')).toBe(90);
    expect(getNextRotation(available, 90, 'cw')).toBe(0);
  });

  it('ccw (Shift+R) walks the same list backward', () => {
    const available = getAvailableRotations(entryWithRearView());
    expect(getNextRotation(available, 0, 'ccw')).toBe(270);
    expect(getNextRotation(available, 270, 'ccw')).toBe(180);
    expect(getNextRotation(available, 180, 'ccw')).toBe(90);
    expect(getNextRotation(available, 90, 'ccw')).toBe(0);
  });

  it('a current rotation no longer in the available list (e.g. a rear view removed after the fact) restarts from 0', () => {
    expect(getNextRotation([0, 90], 180 as never, 'cw')).toBe(90);
  });
});
