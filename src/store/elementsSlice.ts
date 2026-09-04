import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppState } from './appState';

// The five drawing-surface collections (objects/connections/meters/
// signalPanels/frames) and their CRUD actions - this is the data an
// .epwsyn file actually persists. Selection, clipboard, and undo/redo
// over these same arrays each live in their own slice instead.
export type ElementsSlice = Pick<AppState,
  | 'objects' | 'connections' | 'meters' | 'signalPanels' | 'frames'
  | 'addObject' | 'updateObject' | 'updateObjects'
  | 'addConnection' | 'updateConnection'
  | 'addMeter' | 'updateMeter'
  | 'addSignalPanel' | 'updateSignalPanel'
  | 'addFrame' | 'updateFrame'
  | 'deleteObjects'
>;

export const createElementsSlice: StateCreator<AppState, [], [], ElementsSlice> = (set, get) => ({
  objects: [],
  connections: [],
  meters: [],
  signalPanels: [],
  frames: [],

  addObject: (obj) => {
    set((state) => ({
      objects: [...state.objects, { ...obj, id: uuidv4() }]
    }));
    get().saveHistory();
  },

  updateObject: (id, updates) => {
    set((state) => ({
      objects: state.objects.map(obj =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
      isDirty: true
    }));
  },

  updateObjects: (updates) => {
    set((state) => {
      let newObjects = [...state.objects];
      updates.forEach(u => {
        newObjects = newObjects.map(obj => obj.id === u.id ? { ...obj, ...u.updates } : obj);
      });
      return { objects: newObjects, isDirty: true };
    });
  },

  addConnection: (conn) => {
    set((state) => ({
      connections: [...state.connections, { ...conn, id: uuidv4() }],
      isDirty: true
    }));
    get().saveHistory();
  },

  updateConnection: (id, updates) => {
    set((state) => ({
      connections: state.connections.map(c => c.id === id ? { ...c, ...updates } : c),
      isDirty: true
    }));
  },

  addMeter: (meter) => {
    set((state) => ({
      meters: [...state.meters, { ...meter, id: uuidv4() }]
    }));
    get().saveHistory();
  },

  updateMeter: (id, updates) => {
    set((state) => ({
      meters: state.meters.map(m => m.id === id ? { ...m, ...updates } : m),
      isDirty: true
    }));
  },

  addSignalPanel: (panel) => {
    set((state) => ({
      signalPanels: [...state.signalPanels, { ...panel, id: uuidv4() }]
    }));
    get().saveHistory();
  },

  updateSignalPanel: (id, updates) => {
    set((state) => ({
      signalPanels: state.signalPanels.map(p => p.id === id ? { ...p, ...updates } : p),
      isDirty: true
    }));
  },

  addFrame: (frame) => {
    set((state) => ({
      frames: [...state.frames, { ...frame, id: uuidv4() }]
    }));
    get().saveHistory();
  },

  updateFrame: (id, updates) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, ...updates } : f),
      isDirty: true
    }));
  },

  // Bug fix (node-based wiring rewrite): deleting an object used to
  // cascade-delete every connection whose fromId/toId pointed at it. A
  // connection no longer references any object id at all - it is a free
  // polyline that happens to touch a terminal geometrically - so nothing
  // needs to cascade any more. A wire left dangling by a deleted object
  // simply stops being part of any net; it stays on the canvas exactly
  // like drawing a wire into empty space always could.
  deleteObjects: (ids, connIds = [], meterIds = [], signalPanelIds = [], frameIds = []) => {
    if (ids.length === 0 && connIds.length === 0 && meterIds.length === 0 && signalPanelIds.length === 0 && frameIds.length === 0) return;
    set((state) => ({
      objects: state.objects.filter(obj => !ids.includes(obj.id)),
      selectedIds: state.selectedIds.filter(id => !ids.includes(id)),
      connections: state.connections.filter(c => !connIds.includes(c.id)),
      selectedConnectionIds: state.selectedConnectionIds.filter(id => !connIds.includes(id)),
      meters: state.meters.filter(m => !meterIds.includes(m.id)),
      selectedMeterIds: state.selectedMeterIds.filter(id => !meterIds.includes(id)),
      signalPanels: state.signalPanels.filter(p => !signalPanelIds.includes(p.id)),
      selectedSignalPanelIds: state.selectedSignalPanelIds.filter(id => !signalPanelIds.includes(id)),
      frames: state.frames.filter(f => !frameIds.includes(f.id)),
      selectedFrameIds: state.selectedFrameIds.filter(id => !frameIds.includes(id))
    }));
    get().saveHistory();
  },
});
