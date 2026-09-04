import type { StateCreator } from 'zustand';
import type { AppState } from './appState';

// The five parallel "selected ids" arrays (one per element kind - see
// elementsSlice.ts) and every action that reads or replaces them,
// including the rubber-band's cross-kind selectMixed and arrow-key
// moveSelectionBy.
export type SelectionSlice = Pick<AppState,
  | 'selectedIds' | 'selectedConnectionIds' | 'selectedMeterIds' | 'selectedSignalPanelIds' | 'selectedFrameIds'
  | 'selectObjects' | 'selectConnections' | 'selectMeters' | 'selectSignalPanels' | 'selectFrames'
  | 'selectMixed' | 'selectAll' | 'clearSelection' | 'moveSelectionBy'
>;

export const createSelectionSlice: StateCreator<AppState, [], [], SelectionSlice> = (set, get) => ({
  selectedIds: [],
  selectedConnectionIds: [],
  selectedMeterIds: [],
  selectedSignalPanelIds: [],
  selectedFrameIds: [],

  // multi (Shift held, commit 3) toggles WITHIN this one kind's array
  // and leaves the other kinds' current selection untouched - that
  // is what lets a Shift+click build a selection spanning objects,
  // connections, meters and signal panels together, one click at a
  // time. A plain click (multi false) still replaces the whole
  // selection with just this one kind, same as before.
  selectObjects: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedIds: newSelection };
    }
    return { selectedIds: ids, selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [] };
  }),

  selectConnections: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedConnectionIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedConnectionIds: newSelection };
    }
    return { selectedConnectionIds: ids, selectedIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [] };
  }),

  selectMeters: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedMeterIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedMeterIds: newSelection };
    }
    return { selectedMeterIds: ids, selectedIds: [], selectedConnectionIds: [], selectedSignalPanelIds: [], selectedFrameIds: [] };
  }),

  selectSignalPanels: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedSignalPanelIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedSignalPanelIds: newSelection };
    }
    return { selectedSignalPanelIds: ids, selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedFrameIds: [] };
  }),

  selectFrames: (ids, multi = false) => set((state) => {
    if (multi) {
      const newSelection = [...state.selectedFrameIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedFrameIds: newSelection };
    }
    return { selectedFrameIds: ids, selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [] };
  }),

  // The rubber-band (commit 3, feat/editing-and-signal-panel) selects
  // across all five kinds at once (frames joined in commit 2, feat/
  // appearance-selection-frames), in a single atomic replace - calling
  // the per-kind actions above in sequence would not work here, since
  // a plain (non-multi) call to any one of them clears the others.
  selectMixed: (selection) => set({
    selectedIds: selection.objectIds || [],
    selectedConnectionIds: selection.connectionIds || [],
    selectedMeterIds: selection.meterIds || [],
    selectedSignalPanelIds: selection.signalPanelIds || [],
    selectedFrameIds: selection.frameIds || []
  }),

  selectAll: () => {
    const { objects, connections, meters, signalPanels, frames } = get();
    set({
      selectedIds: objects.map(o => o.id),
      selectedConnectionIds: connections.map(c => c.id),
      selectedMeterIds: meters.map(m => m.id),
      selectedSignalPanelIds: signalPanels.map(p => p.id),
      selectedFrameIds: frames.map(f => f.id)
    });
  },

  clearSelection: () => set({ selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [], selectedFrameIds: [] }),

  // Locked objects are skipped, same as an ordinary drag already
  // refuses to move them (draggable={!obj.locked} in Canvas.tsx) -
  // arrow-key movement is not a back door around a lock. Meters and
  // connections have no lock flag of their own, so every selected one
  // of those always moves. A single set() call, then one saveHistory()
  // - one history entry per keypress, not per moved item.
  moveSelectionBy: (dx, dy) => {
    const { selectedIds, selectedMeterIds, selectedConnectionIds, selectedSignalPanelIds, selectedFrameIds } = get();
    if (selectedIds.length === 0 && selectedMeterIds.length === 0 && selectedConnectionIds.length === 0 && selectedSignalPanelIds.length === 0 && selectedFrameIds.length === 0) return;
    set((state) => ({
      objects: state.objects.map(o => (selectedIds.includes(o.id) && !o.locked) ? { ...o, x: o.x + dx, y: o.y + dy } : o),
      meters: state.meters.map(m => selectedMeterIds.includes(m.id) ? { ...m, x: m.x + dx, y: m.y + dy } : m),
      signalPanels: state.signalPanels.map(p => selectedSignalPanelIds.includes(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p),
      frames: state.frames.map(f => selectedFrameIds.includes(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f),
      connections: state.connections.map(c => selectedConnectionIds.includes(c.id)
        ? { ...c, points: c.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
        : c)
    }));
    get().saveHistory();
  },
});
