import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppState } from './appState';

// PLAN screen state (feat/isometric-engine commit 5): which of the two
// screen kinds this project is (ScreenKind itself lives in ./types,
// alongside every other field type AppState draws from), and - when it
// is PLAN - the placed objects and their own, separate selection.
// Deliberately NOT folded into the schematic selection model
// (selectedIds/selectMixed/moveSelectionBy/etc.): a project is one kind
// or the other, never both at once, so a PLAN project's schematic arrays
// (objects, connections...) are always empty by construction and never
// need to interoperate with planObjects in a single mixed selection the
// way five SCHEMATIC element kinds already need to among themselves.
export type PlanSlice = Pick<AppState,
  | 'screenKind' | 'setScreenKind'
  | 'planObjects' | 'selectedPlanObjectIds'
  | 'addPlanObject' | 'updatePlanObject' | 'deletePlanObjects'
  | 'selectPlanObjects' | 'clearPlanSelection' | 'movePlanObjectTo'
  | 'terrainPaintTool' | 'setTerrainPaintTool'
  | 'manifestVersion' | 'bumpManifestVersion'
>;

export const createPlanSlice: StateCreator<AppState, [], [], PlanSlice> = (set, get) => ({
  screenKind: 'SCHEMATIC',
  setScreenKind: (kind) => set({ screenKind: kind }),

  planObjects: [],
  selectedPlanObjectIds: [],

  addPlanObject: (obj) => {
    set((state) => ({
      planObjects: [...state.planObjects, { ...obj, id: uuidv4() }]
    }));
    get().saveHistory();
  },

  updatePlanObject: (id, updates) => {
    set((state) => ({
      planObjects: state.planObjects.map(o => o.id === id ? { ...o, ...updates } : o),
      isDirty: true
    }));
  },

  deletePlanObjects: (ids) => {
    if (ids.length === 0) return;
    set((state) => ({
      planObjects: state.planObjects.filter(o => !ids.includes(o.id)),
      selectedPlanObjectIds: state.selectedPlanObjectIds.filter(id => !ids.includes(id))
    }));
    get().saveHistory();
  },

  // multi (Shift held) toggles membership, same convention every
  // schematic selectXxx action already uses; a plain click replaces the
  // whole selection with just the clicked object.
  selectPlanObjects: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedPlanObjectIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedPlanObjectIds: newSelection };
    }
    return { selectedPlanObjectIds: ids };
  }),

  clearPlanSelection: () => set({ selectedPlanObjectIds: [] }),

  // A plan object always lands on a WHOLE tile - there is no fractional
  // position for it to have in the first place (unlike a SynopticObject,
  // whose x/y are pixels), so "snap to grid" here is simply "these ARE
  // grid coordinates". One saveHistory call per move, same as the
  // schematic canvas's own onDragEnd convention.
  movePlanObjectTo: (id, gx, gy) => {
    set((state) => ({
      planObjects: state.planObjects.map(o => o.id === id ? { ...o, gx, gy } : o)
    }));
    get().saveHistory();
  },

  // Which terrain type the paint tool is currently armed with - null
  // means the select/move tool is active instead. Toolbar.tsx's own
  // terrain palette (commit 5) is what sets this; PlanCanvas.tsx reads
  // it to decide what a mouse drag on the canvas does.
  terrainPaintTool: null,
  setTerrainPaintTool: (type) => set({ terrainPaintTool: type }),

  // SpriteManifest.ts (commit 2) deliberately keeps its loaded manifest
  // as plain module state, not store state - listSprites()/getSprite()
  // read it directly, with no zustand subscription of their own. Without
  // this, a component reading listSprites() through useStore's selector
  // would never re-render once the async loadSpriteManifest() call in
  // App.tsx actually resolves, since nothing IN the store would have
  // changed. Bumped once, right after that resolves - components that
  // care (Toolbox.tsx) select this field alongside calling listSprites()
  // themselves, purely to be notified a re-read is worthwhile.
  manifestVersion: 0,
  bumpManifestVersion: () => set((state) => ({ manifestVersion: state.manifestVersion + 1 })),
});
