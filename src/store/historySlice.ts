import type { StateCreator } from 'zustand';
import type { AppState } from './appState';

// Cap on how many undo/redo snapshots are kept; each entry is a full deep
// copy of objects+connections+meters+signalPanels+frames, so this bounds both memory and undo depth.
const MAX_HISTORY = 100;

// Undo/redo over the five element arrays (elementsSlice.ts) as one
// combined snapshot per saveHistory() call - every action elsewhere that
// mutates the drawing calls get().saveHistory() itself once it's done,
// rather than this slice reacting to changes on its own.
export type HistorySlice = Pick<AppState, 'history' | 'historyIndex' | 'saveHistory' | 'undo' | 'redo'>;

export const createHistorySlice: StateCreator<AppState, [], [], HistorySlice> = (set, get) => ({
  history: [{ objects: [], connections: [], meters: [], signalPanels: [], frames: [], terrainTiles: {}, planObjects: [] }],
  historyIndex: 0,

  saveHistory: () => {
    const { objects, connections, meters, signalPanels, frames, terrainTiles, planObjects, history, historyIndex } = get();
    const objectsJson = JSON.stringify(objects);
    const connectionsJson = JSON.stringify(connections);
    const metersJson = JSON.stringify(meters);
    const signalPanelsJson = JSON.stringify(signalPanels);
    const framesJson = JSON.stringify(frames);
    const terrainTilesJson = JSON.stringify(terrainTiles);
    const planObjectsJson = JSON.stringify(planObjects);

    // Skip if nothing actually changed since the last entry (e.g. a field
    // was clicked into and blurred without editing) - don't clutter undo
    // with no-op entries.
    const lastEntry = history[historyIndex];
    if (
      lastEntry &&
      JSON.stringify(lastEntry.objects) === objectsJson &&
      JSON.stringify(lastEntry.connections) === connectionsJson &&
      JSON.stringify(lastEntry.meters || []) === metersJson &&
      JSON.stringify(lastEntry.signalPanels || []) === signalPanelsJson &&
      JSON.stringify(lastEntry.frames || []) === framesJson &&
      JSON.stringify(lastEntry.terrainTiles || {}) === terrainTilesJson &&
      JSON.stringify(lastEntry.planObjects || []) === planObjectsJson
    ) {
      return;
    }

    let newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      objects: JSON.parse(objectsJson),
      connections: JSON.parse(connectionsJson),
      meters: JSON.parse(metersJson),
      signalPanels: JSON.parse(signalPanelsJson),
      frames: JSON.parse(framesJson),
      terrainTiles: JSON.parse(terrainTilesJson),
      planObjects: JSON.parse(planObjectsJson)
    });

    // Cap history length; drop oldest entries once the cap is exceeded.
    // The freshly pushed entry is always last, so its index after
    // truncation is simply the new array length minus one.
    if (newHistory.length > MAX_HISTORY) {
      newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1, isDirty: true });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        historyIndex: historyIndex - 1,
        objects: JSON.parse(JSON.stringify(prevState.objects || [])),
        connections: JSON.parse(JSON.stringify(prevState.connections || [])),
        meters: JSON.parse(JSON.stringify(prevState.meters || [])),
        signalPanels: JSON.parse(JSON.stringify(prevState.signalPanels || [])),
        frames: JSON.parse(JSON.stringify(prevState.frames || [])),
        terrainTiles: JSON.parse(JSON.stringify(prevState.terrainTiles || {})),
        planObjects: JSON.parse(JSON.stringify(prevState.planObjects || [])),
        selectedIds: [],
        selectedConnectionIds: [],
        selectedMeterIds: [],
        selectedSignalPanelIds: [],
        selectedFrameIds: [],
        selectedPlanObjectIds: [],
        isDirty: true
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        historyIndex: historyIndex + 1,
        objects: JSON.parse(JSON.stringify(nextState.objects || [])),
        connections: JSON.parse(JSON.stringify(nextState.connections || [])),
        meters: JSON.parse(JSON.stringify(nextState.meters || [])),
        signalPanels: JSON.parse(JSON.stringify(nextState.signalPanels || [])),
        frames: JSON.parse(JSON.stringify(nextState.frames || [])),
        terrainTiles: JSON.parse(JSON.stringify(nextState.terrainTiles || {})),
        planObjects: JSON.parse(JSON.stringify(nextState.planObjects || [])),
        selectedIds: [],
        selectedConnectionIds: [],
        selectedMeterIds: [],
        selectedSignalPanelIds: [],
        selectedFrameIds: [],
        selectedPlanObjectIds: [],
        isDirty: true
      });
    }
  },
});
