// feat/site-objects-2d: mandatory tests for the TEREN (site object)
// category. Iterates the real registry (getSymbolsByCategory, same
// "visible" filter the Object Library itself uses) rather than a
// hand-picked list, so this file needs no changes across commits 2/3/4
// as more of the 16 objects get registered - each grows this test's
// own coverage automatically. site.concrete_road/site.grass (the two
// SURFACES, commit 4) are the only two named explicitly, since their
// own rules (no states; exactly two states) differ from every other
// site object's.

import { describe, it, expect } from 'vitest';
import { getSymbolsByCategory, getSymbolDefinition } from '../symbols/SymbolRegistry';

const SURFACE_TYPES = ['site.concrete_road'];
const NO_STATE_TYPES = ['site.concrete_road']; // 4. droga betonowa has no states at all
const THREE_STATE_TYPES = ['site.sliding_gate']; // 3. brama has exactly three states

function siteSymbols() {
  const cats = getSymbolsByCategory();
  return cats['TEREN'] || [];
}

describe('TEREN category - registration (1)', () => {
  it('sanity: at least one TEREN symbol is registered and visible in the library (a passing empty loop proves nothing)', () => {
    expect(siteSymbols().length).toBeGreaterThan(0);
  });

  it('every registered TEREN symbol is resolvable back through getSymbolDefinition (the same lookup the canvas itself uses)', () => {
    siteSymbols().forEach(def => {
      expect(getSymbolDefinition(def.type)).toBe(def);
    });
  });
});

describe('TEREN category - state counts (2, 3, 4, 5)', () => {
  it('every TEREN symbol declares its own list of states (allowedStates), non-empty unless it is a surface', () => {
    siteSymbols().forEach(def => {
      expect(Array.isArray(def.allowedStates)).toBe(true);
      if (!NO_STATE_TYPES.includes(def.type)) {
        expect(def.allowedStates.length).toBeGreaterThan(0);
      }
    });
  });

  it('3. the sliding gate has exactly three states: ZAMKNIETA, W_RUCHU, OTWARTA', () => {
    THREE_STATE_TYPES.forEach(type => {
      const def = getSymbolDefinition(type);
      expect(def).toBeTruthy();
      expect(def!.allowedStates).toEqual(['ZAMKNIETA', 'W_RUCHU', 'OTWARTA']);
    });
  });

  it('4. the concrete road has no states at all', () => {
    const def = getSymbolDefinition('site.concrete_road');
    if (def) expect(def.allowedStates).toEqual([]);
  });

  it('5. every other TEREN symbol (not the gate, not a surface) has exactly two states', () => {
    siteSymbols().forEach(def => {
      if (THREE_STATE_TYPES.includes(def.type) || NO_STATE_TYPES.includes(def.type)) return;
      expect(def.allowedStates.length).toBe(2);
    });
  });
});

describe('TEREN category - device binding (14)', () => {
  it('every TEREN symbol is eligible for the Aparat (device) field - not a line, not graphics.*, not measurements.*', () => {
    siteSymbols().forEach(def => {
      expect(def.isLine).toBeFalsy();
      expect(def.type.startsWith('graphics.')).toBe(false);
      expect(def.type.startsWith('measurements.')).toBe(false);
    });
  });
});

describe('TEREN category - surfaces have no terminals, everything else does (part of 6)', () => {
  it('a surface (grass, concrete road) has zero terminals', () => {
    siteSymbols().forEach(def => {
      if (SURFACE_TYPES.includes(def.type) || def.type === 'site.grass') {
        expect(def.terminals || []).toEqual([]);
      }
    });
  });

  it('every non-surface TEREN symbol has at least one terminal (grid-alignment/centering itself is covered by terminal-centering.test.ts, which already iterates this same registry)', () => {
    siteSymbols().forEach(def => {
      if (SURFACE_TYPES.includes(def.type) || def.type === 'site.grass') return;
      expect((def.terminals || []).length).toBeGreaterThan(0);
    });
  });
});
