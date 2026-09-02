import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { COLOR_CANVAS_BACKGROUND, GRID_SIZE } from './theme/ScadaTheme';
import type { MeterRow } from './symbols/scada/MeterSymbol';
import type { MeterElement } from './meter/MeterElement';
import type { SignalPanelElement } from './elements/SignalPanelElement';
import type { Device } from './project/DeviceSchema';
import { cloneSelectionWithOffset } from './utils/CloneSelection';

// Cap on how many undo/redo snapshots are kept; each entry is a full deep
// copy of objects+connections+meters+signalPanels, so this bounds both memory and undo depth.
const MAX_HISTORY = 100;


export interface HistorySnapshot {
  objects: SynopticObject[];
  connections: SynopticConnection[];
  meters: MeterElement[];
  signalPanels: SignalPanelElement[];
}
export interface SynopticObject {
  zIndex?: number;
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  locked: boolean;
  layer: number;

  // Properties
  designation?: string;
  name?: string;
  tag: string;
  description: string;
  color: string;
  fill: string;
  border: string;
  text: string;
  font: string;
  fontSize: number;


  editor?: {
    preview_state?: string;
    preview_value?: string;
    unit?: string;
    format?: string;
  };

  // Runtime Bindings
  bindings?: {
    state?: { tag: string; data_type?: string };
    value?: { tag: string; data_type?: string };
    command?: { tag: string; data_type?: string; access?: 'WRITE' | 'READ_WRITE' };
    alarm?: { tag: string; data_type?: string };
    quality?: { tag: string; data_type?: string };
  };
  tooltip: string;

  // Layout
  width: number;
  height: number;

  customProperties: Record<string, string>;
  showDesignation?: boolean;
  showName?: boolean;
  labelPosition?: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  labelOffsetX?: number;
  labelOffsetY?: number;

  // SCADA meter (scada.meter): rows are edited by hand for now - wiring
  // this to the device registry is a separate, later task. Optional: only
  // meter objects use it, every other object leaves it undefined.
  meterRows?: MeterRow[];

  // SCADA boundary point (scada.boundary_point): where a schematic
  // begins or ends (a utility feed, a well, a branch to a sub
  // installation). Optional: only boundary point objects use these three
  // - label/sublabel reuse the existing designation/description fields,
  // same convention as the label frame this symbol is built on. Every
  // other object leaves these undefined.
  boundaryDirection?: 'SOURCE' | 'SINK';
  boundaryMedium?: 'ELECTRICAL' | 'WATER' | 'VENTILATION';
  boundaryPortSide?: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface WirePoint {
  x: number;
  y: number;
}

// Node-based connection model (schema v2): a connection is a freehand
// orthogonal polyline, not a pair of ports. Two wires - or a wire and a
// symbol terminal - are joined simply by sharing a grid node; nothing
// else references anything by id. fromId/fromPort/toId/toPort are gone
// entirely - see NetResolver.ts for how wires and terminals are grouped
// into nets from geometry alone.
//
// feat/media-and-proportions part B: VENTILATION joins ELECTRICAL/WATER
// as a third medium value. This is a value added to the existing medium
// field, not a change to the connection's shape - schema version stays
// at 2 (see ProjectSchema.ts's CURRENT_SCHEMA_VERSION comment).
export interface SynopticConnection {
  id: string;
  points: WirePoint[]; // minimum 2, every point on a GRID_SIZE node, every segment horizontal or vertical
  medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION';
  style: 'NORMAL' | 'BUS'; // BUS is a busbar/manifold: thicker, touchable anywhere along its length
  state: 'LIVE' | 'DEAD';
}

export interface Message {
  id: string;
  type: 'info' | 'error' | 'warning';
  text: string;
  time: string;
}

interface AppState {
  projectMetadata: {
    description: string;
    created_at: string;
    modified_at: string;
  };
  canvasConfig: {
    width: number;
    height: number;
    background: string;
    gridSize: number;
  };
  objects: SynopticObject[];
  connections: SynopticConnection[];
  // The meter element (feat/meter-element): its own array, deliberately
  // separate from objects - it is not a symbol, has no terminals, and
  // its height is never user-set (see MeterElement.ts).
  meters: MeterElement[];
  // The signal panel element (feat/editing-and-signal-panel commit 6):
  // the same mechanism as the meter, its own array - see
  // elements/SignalPanelElement.ts.
  signalPanels: SignalPanelElement[];
  selectedIds: string[];
  selectedConnectionIds: string[];
  selectedMeterIds: string[];
  selectedSignalPanelIds: string[];
  canvasState: CanvasState;
  clipboard: SynopticObject[];
  clipboardMeters: MeterElement[];
  clipboardSignalPanels: SignalPanelElement[];
  clipboardConnections: SynopticConnection[];
  history: HistorySnapshot[];
  historyIndex: number;

  // Project State
  projectName: string;
  fileName: string | null;
  fileHandle: any | null;
  isDirty: boolean;
  messages: Message[];

  // feat/meter-element part B: the project's device list (src/project/
  // DeviceSchema.ts's contract) - the first thing in this editor that
  // ever reads it. Read-only from every UI's perspective (the meter's
  // device picker, MeterResolver.ts); nothing here authors or edits a
  // device - see ProjectManager.ts for how this round-trips with a
  // project file, and raport.md for the full path description.
  devices: Device[];

  // Connection Drawing Mode
  isDrawingConnection: boolean;
  setDrawingMode: (active: boolean) => void;

  // feat/media-and-proportions part C: the medium/style a NEW wire is
  // drawn with, chosen up front in the toolbar rather than after the
  // fact in Properties - it still applies to every newly drawn wire
  // until changed again, and can still be edited per-wire afterward.
  drawingMedium: SynopticConnection['medium'];
  drawingStyle: SynopticConnection['style'];
  setDrawingMedium: (medium: SynopticConnection['medium']) => void;
  setDrawingStyle: (style: SynopticConnection['style']) => void;

  // Grid snapping: a persistent toggle (View menu, default on) separate
  // from the momentary Alt-key bypass, which lives outside the store
  // entirely (Canvas.tsx tracks the live key state directly).
  snapToGridEnabled: boolean;
  toggleSnapToGrid: () => void;

  // Actions
  setProjectName: (name: string) => void;
  setFileName: (name: string | null) => void;
  setFileHandle: (handle: any | null) => void;
  setDirty: (dirty: boolean) => void;
  addMessage: (text: string) => void;

  setCanvasState: (state: Partial<CanvasState>) => void;
  addObject: (obj: Omit<SynopticObject, 'id'>) => void;
  updateObject: (id: string, updates: Partial<SynopticObject>) => void;
  updateObjects: (updates: {id: string, updates: Partial<SynopticObject>}[]) => void;
  addConnection: (conn: Omit<SynopticConnection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<SynopticConnection>) => void;
  addMeter: (meter: Omit<MeterElement, 'id'>) => void;
  updateMeter: (id: string, updates: Partial<MeterElement>) => void;
  addSignalPanel: (panel: Omit<SignalPanelElement, 'id'>) => void;
  updateSignalPanel: (id: string, updates: Partial<SignalPanelElement>) => void;
  deleteObjects: (ids: string[], connIds?: string[], meterIds?: string[], signalPanelIds?: string[]) => void;
  selectObjects: (ids: string[], multi?: boolean) => void;
  selectConnections: (ids: string[], multi?: boolean) => void;
  selectMeters: (ids: string[], multi?: boolean) => void;
  selectSignalPanels: (ids: string[], multi?: boolean) => void;
  // commit 3: replaces the whole selection with a mix of all four
  // kinds at once (the rubber-band's own result) - and Ctrl+A's "select
  // everything on screen".
  selectMixed: (selection: { objectIds?: string[]; connectionIds?: string[]; meterIds?: string[]; signalPanelIds?: string[] }) => void;
  selectAll: () => void;
  clearSelection: () => void;
  // Arrow keys (commit 3): every selected object/meter/signalPanel/
  // connection moves by (dx, dy) together, as one history entry per
  // keypress.
  moveSelectionBy: (dx: number, dy: number) => void;

  // Clipboard
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
  // Alt+drag: a silent, unselected, no-history-entry-of-its-own clone
  // left at the dragged item's own current position, the instant the
  // drag starts - the item the user is actually dragging then keeps
  // moving as it normally would, so the drag's own eventual saveHistory
  // covers both the new clone and the move as ONE history entry.
  duplicateObjectInPlace: (id: string) => void;
  duplicateMeterInPlace: (id: string) => void;
  duplicateSignalPanelInPlace: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Z-Index
  bringToFront: () => void;
  sendToBack: () => void;

  // Layout Tools
  alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;

  // Lock/Unlock
  lockSelected: () => void;
  unlockSelected: () => void;

  // Rotation
  rotateSelected: (direction: 'cw' | 'ccw') => void;
}

export const useStore = create<AppState>((set, get) => ({
  projectMetadata: {
    description: "",
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  canvasConfig: {
    width: 1920,
    height: 1080,
    background: COLOR_CANVAS_BACKGROUND,
    gridSize: GRID_SIZE
  },
  objects: [],
  connections: [],
  meters: [],
  signalPanels: [],
  selectedIds: [],
  selectedConnectionIds: [],
  selectedMeterIds: [],
  selectedSignalPanelIds: [],
  canvasState: { zoom: 1, panX: 0, panY: 0 },
  clipboard: [],
  clipboardMeters: [],
  clipboardSignalPanels: [],
  clipboardConnections: [],
  history: [{ objects: [], connections: [], meters: [], signalPanels: [] }],
  historyIndex: 0,

  projectName: 'New Project',
  fileName: null,
  fileHandle: null,
  isDirty: false,
  messages: [],
  devices: [],
  isDrawingConnection: false,
  snapToGridEnabled: true,
  drawingMedium: 'ELECTRICAL',
  drawingStyle: 'NORMAL',

  setDrawingMode: (active) => set({
    isDrawingConnection: active
  }),

  setDrawingMedium: (medium) => set({ drawingMedium: medium }),
  setDrawingStyle: (style) => set({ drawingStyle: style }),

  toggleSnapToGrid: () => set((state) => ({ snapToGridEnabled: !state.snapToGridEnabled })),

  setProjectName: (name) => set({ projectName: name, isDirty: true }),
  setFileName: (name) => set({ fileName: name }),
  setFileHandle: (handle) => set({ fileHandle: handle }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  addMessage: (text) => {
    let type: 'info' | 'error' | 'warning' = 'info';
    if (text.startsWith('[ERROR]')) type = 'error';
    if (text.startsWith('[WARNING]')) type = 'warning';

    const msg: Message = {
      id: Date.now().toString() + Math.random().toString(),
      type,
      text: text.replace(/\[.*?\]\s*/, ''),
      time: new Date().toLocaleTimeString()
    };
    set(state => ({ messages: [...state.messages, msg] }));
  },

  setCanvasState: (state) => set((prev) => ({
    canvasState: { ...prev.canvasState, ...state }
  })),

  saveHistory: () => {
    const { objects, connections, meters, signalPanels, history, historyIndex } = get();
    const objectsJson = JSON.stringify(objects);
    const connectionsJson = JSON.stringify(connections);
    const metersJson = JSON.stringify(meters);
    const signalPanelsJson = JSON.stringify(signalPanels);

    // Skip if nothing actually changed since the last entry (e.g. a field
    // was clicked into and blurred without editing) - don't clutter undo
    // with no-op entries.
    const lastEntry = history[historyIndex];
    if (
      lastEntry &&
      JSON.stringify(lastEntry.objects) === objectsJson &&
      JSON.stringify(lastEntry.connections) === connectionsJson &&
      JSON.stringify(lastEntry.meters || []) === metersJson &&
      JSON.stringify(lastEntry.signalPanels || []) === signalPanelsJson
    ) {
      return;
    }

    let newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      objects: JSON.parse(objectsJson),
      connections: JSON.parse(connectionsJson),
      meters: JSON.parse(metersJson),
      signalPanels: JSON.parse(signalPanelsJson)
    });

    // Cap history length; drop oldest entries once the cap is exceeded.
    // The freshly pushed entry is always last, so its index after
    // truncation is simply the new array length minus one.
    if (newHistory.length > MAX_HISTORY) {
      newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1, isDirty: true });
  },

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

  // Bug fix (node-based wiring rewrite): deleting an object used to
  // cascade-delete every connection whose fromId/toId pointed at it. A
  // connection no longer references any object id at all - it is a free
  // polyline that happens to touch a terminal geometrically - so nothing
  // needs to cascade any more. A wire left dangling by a deleted object
  // simply stops being part of any net; it stays on the canvas exactly
  // like drawing a wire into empty space always could.
  deleteObjects: (ids, connIds = [], meterIds = [], signalPanelIds = []) => {
    if (ids.length === 0 && connIds.length === 0 && meterIds.length === 0 && signalPanelIds.length === 0) return;
    set((state) => ({
      objects: state.objects.filter(obj => !ids.includes(obj.id)),
      selectedIds: state.selectedIds.filter(id => !ids.includes(id)),
      connections: state.connections.filter(c => !connIds.includes(c.id)),
      selectedConnectionIds: state.selectedConnectionIds.filter(id => !connIds.includes(id)),
      meters: state.meters.filter(m => !meterIds.includes(m.id)),
      selectedMeterIds: state.selectedMeterIds.filter(id => !meterIds.includes(id)),
      signalPanels: state.signalPanels.filter(p => !signalPanelIds.includes(p.id)),
      selectedSignalPanelIds: state.selectedSignalPanelIds.filter(id => !signalPanelIds.includes(id))
    }));
    get().saveHistory();
  },

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
    return { selectedIds: ids, selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [] };
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
    return { selectedConnectionIds: ids, selectedIds: [], selectedMeterIds: [], selectedSignalPanelIds: [] };
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
    return { selectedMeterIds: ids, selectedIds: [], selectedConnectionIds: [], selectedSignalPanelIds: [] };
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
    return { selectedSignalPanelIds: ids, selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [] };
  }),

  // The rubber-band (commit 3) selects across all four kinds at once,
  // in a single atomic replace - calling the per-kind actions above in
  // sequence would not work here, since a plain (non-multi) call to
  // any one of them clears the others.
  selectMixed: (selection) => set({
    selectedIds: selection.objectIds || [],
    selectedConnectionIds: selection.connectionIds || [],
    selectedMeterIds: selection.meterIds || [],
    selectedSignalPanelIds: selection.signalPanelIds || []
  }),

  selectAll: () => {
    const { objects, connections, meters, signalPanels } = get();
    set({
      selectedIds: objects.map(o => o.id),
      selectedConnectionIds: connections.map(c => c.id),
      selectedMeterIds: meters.map(m => m.id),
      selectedSignalPanelIds: signalPanels.map(p => p.id)
    });
  },

  clearSelection: () => set({ selectedIds: [], selectedConnectionIds: [], selectedMeterIds: [], selectedSignalPanelIds: [] }),

  // Locked objects are skipped, same as an ordinary drag already
  // refuses to move them (draggable={!obj.locked} in Canvas.tsx) -
  // arrow-key movement is not a back door around a lock. Meters and
  // connections have no lock flag of their own, so every selected one
  // of those always moves. A single set() call, then one saveHistory()
  // - one history entry per keypress, not per moved item.
  moveSelectionBy: (dx, dy) => {
    const { selectedIds, selectedMeterIds, selectedConnectionIds, selectedSignalPanelIds } = get();
    if (selectedIds.length === 0 && selectedMeterIds.length === 0 && selectedConnectionIds.length === 0 && selectedSignalPanelIds.length === 0) return;
    set((state) => ({
      objects: state.objects.map(o => (selectedIds.includes(o.id) && !o.locked) ? { ...o, x: o.x + dx, y: o.y + dy } : o),
      meters: state.meters.map(m => selectedMeterIds.includes(m.id) ? { ...m, x: m.x + dx, y: m.y + dy } : m),
      signalPanels: state.signalPanels.map(p => selectedSignalPanelIds.includes(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p),
      connections: state.connections.map(c => selectedConnectionIds.includes(c.id)
        ? { ...c, points: c.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
        : c)
    }));
    get().saveHistory();
  },

  // copySelected reads all three selection arrays at once - objects,
  // meters AND connections - so a selection spanning more than one
  // kind (today only reachable by setting more than one of
  // selectedIds/selectedConnectionIds/selectedMeterIds directly; the
  // rubber-band selection landing in commit 3 is what lets a user
  // build one this way through the mouse) copies correctly as one
  // unit. See utils/CloneSelection.ts's own header comment for why a
  // connection needs no relinking at all to stay attached to the
  // objects it was copied along with.
  copySelected: () => {
    const { objects, selectedIds, meters, selectedMeterIds, signalPanels, selectedSignalPanelIds, connections, selectedConnectionIds } = get();
    const toCopy = objects.filter(obj => selectedIds.includes(obj.id));
    const metersToCopy = meters.filter(m => selectedMeterIds.includes(m.id));
    const signalPanelsToCopy = signalPanels.filter(p => selectedSignalPanelIds.includes(p.id));
    const connectionsToCopy = connections.filter(c => selectedConnectionIds.includes(c.id));
    set({
      clipboard: JSON.parse(JSON.stringify(toCopy)),
      clipboardMeters: JSON.parse(JSON.stringify(metersToCopy)),
      clipboardSignalPanels: JSON.parse(JSON.stringify(signalPanelsToCopy)),
      clipboardConnections: JSON.parse(JSON.stringify(connectionsToCopy))
    });
  },

  // Offset by exactly one grid cell right and down - never atop the
  // original, and always back on the grid (GRID_SIZE is itself the
  // grid's own pitch, so a grid-aligned source stays grid-aligned).
  paste: () => {
    const { clipboard, clipboardMeters, clipboardSignalPanels, clipboardConnections } = get();
    if (clipboard.length === 0 && clipboardMeters.length === 0 && clipboardSignalPanels.length === 0 && clipboardConnections.length === 0) return;

    const cloned = cloneSelectionWithOffset(clipboard, clipboardMeters, clipboardSignalPanels, clipboardConnections, GRID_SIZE, GRID_SIZE, uuidv4);

    set((state) => ({
      objects: [...state.objects, ...cloned.objects],
      meters: [...state.meters, ...cloned.meters],
      signalPanels: [...state.signalPanels, ...cloned.signalPanels],
      connections: [...state.connections, ...cloned.connections],
      selectedIds: cloned.objectIds,
      selectedConnectionIds: cloned.connectionIds,
      selectedMeterIds: cloned.meterIds,
      selectedSignalPanelIds: cloned.signalPanelIds
    }));
    get().saveHistory();
  },

  // Ctrl+D: duplicates the CURRENT selection directly, with the same
  // one-grid-cell offset paste uses - one keystroke, the clipboard
  // untouched (a subsequent Ctrl+V still pastes whatever was last
  // explicitly copied, not this duplicate).
  duplicateSelected: () => {
    const { objects, selectedIds, meters, selectedMeterIds, signalPanels, selectedSignalPanelIds, connections, selectedConnectionIds } = get();
    const toDuplicate = objects.filter(obj => selectedIds.includes(obj.id));
    const metersToDuplicate = meters.filter(m => selectedMeterIds.includes(m.id));
    const signalPanelsToDuplicate = signalPanels.filter(p => selectedSignalPanelIds.includes(p.id));
    const connectionsToDuplicate = connections.filter(c => selectedConnectionIds.includes(c.id));
    if (toDuplicate.length === 0 && metersToDuplicate.length === 0 && signalPanelsToDuplicate.length === 0 && connectionsToDuplicate.length === 0) return;

    const cloned = cloneSelectionWithOffset(toDuplicate, metersToDuplicate, signalPanelsToDuplicate, connectionsToDuplicate, GRID_SIZE, GRID_SIZE, uuidv4);

    set((state) => ({
      objects: [...state.objects, ...cloned.objects],
      meters: [...state.meters, ...cloned.meters],
      signalPanels: [...state.signalPanels, ...cloned.signalPanels],
      connections: [...state.connections, ...cloned.connections],
      selectedIds: cloned.objectIds,
      selectedConnectionIds: cloned.connectionIds,
      selectedMeterIds: cloned.meterIds,
      selectedSignalPanelIds: cloned.signalPanelIds
    }));
    get().saveHistory();
  },

  duplicateObjectInPlace: (id) => {
    const obj = get().objects.find(o => o.id === id);
    if (!obj) return;
    const clone = { ...JSON.parse(JSON.stringify(obj)), id: uuidv4() };
    set((state) => ({ objects: [...state.objects, clone] }));
  },

  duplicateMeterInPlace: (id) => {
    const meter = get().meters.find(m => m.id === id);
    if (!meter) return;
    const clone = { ...JSON.parse(JSON.stringify(meter)), id: uuidv4() };
    set((state) => ({ meters: [...state.meters, clone] }));
  },

  duplicateSignalPanelInPlace: (id) => {
    const panel = get().signalPanels.find(p => p.id === id);
    if (!panel) return;
    const clone = { ...JSON.parse(JSON.stringify(panel)), id: uuidv4() };
    set((state) => ({ signalPanels: [...state.signalPanels, clone] }));
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
        selectedIds: [],
        selectedConnectionIds: [],
        selectedMeterIds: [],
        selectedSignalPanelIds: [],
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
        selectedIds: [],
        selectedConnectionIds: [],
        selectedMeterIds: [],
        selectedSignalPanelIds: [],
        isDirty: true
      });
    }
  },

  bringToFront: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const maxZ = Math.max(...objects.map(o => o.zIndex || 0), 0);
    const newObjects = objects.map(o => selectedIds.includes(o.id) ? { ...o, zIndex: maxZ + 1 } : o);

    set({ objects: newObjects, isDirty: true });
    get().saveHistory();
  },

  sendToBack: () => {
    const { objects, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const minZ = Math.min(...objects.map(o => o.zIndex || 0), 0);
    const newObjects = objects.map(o => selectedIds.includes(o.id) ? { ...o, zIndex: minZ - 1 } : o);

    set({ objects: newObjects, isDirty: true });
    get().saveHistory();
  },

  alignSelected: (alignment) => {
    const { objects, selectedIds } = get();
    if (selectedIds.length < 2) return;

    const selected = objects.filter(obj => selectedIds.includes(obj.id));
    let target = 0;

    switch(alignment) {
      case 'left': target = Math.min(...selected.map(o => o.x)); break;
      case 'right': target = Math.max(...selected.map(o => o.x + o.width * o.scaleX)); break;
      case 'top': target = Math.min(...selected.map(o => o.y)); break;
      case 'bottom': target = Math.max(...selected.map(o => o.y + o.height * o.scaleY)); break;
      case 'center':
        target = selected.reduce((sum, o) => sum + o.x + (o.width * o.scaleX)/2, 0) / selected.length;
        break;
      case 'middle':
        target = selected.reduce((sum, o) => sum + o.y + (o.height * o.scaleY)/2, 0) / selected.length;
        break;
    }

    set({
      objects: objects.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        if (['left', 'center', 'right'].includes(alignment)) {
           const newX = alignment === 'center' ? target - (obj.width * obj.scaleX)/2 : alignment === 'right' ? target - obj.width * obj.scaleX : target;
           return { ...obj, x: newX };
        } else {
           const newY = alignment === 'middle' ? target - (obj.height * obj.scaleY)/2 : alignment === 'bottom' ? target - obj.height * obj.scaleY : target;
           return { ...obj, y: newY };
        }
      })
    });
    get().saveHistory();
  },

  distributeSelected: (axis) => {
    const { objects, selectedIds } = get();
    if (selectedIds.length < 3) return;

    const selected = objects.filter(obj => selectedIds.includes(obj.id));

    if (axis === 'horizontal') {
      selected.sort((a, b) => a.x - b.x);
      const min = selected[0].x;
      const max = selected[selected.length-1].x;
      const step = (max - min) / (selected.length - 1);

      set({
        objects: objects.map(obj => {
          const idx = selected.findIndex(s => s.id === obj.id);
          if (idx <= 0 || idx >= selected.length - 1) return obj;
          return { ...obj, x: min + idx * step };
        })
      });
    } else {
      selected.sort((a, b) => a.y - b.y);
      const min = selected[0].y;
      const max = selected[selected.length-1].y;
      const step = (max - min) / (selected.length - 1);

      set({
        objects: objects.map(obj => {
          const idx = selected.findIndex(s => s.id === obj.id);
          if (idx <= 0 || idx >= selected.length - 1) return obj;
          return { ...obj, y: min + idx * step };
        })
      });
    }
    get().saveHistory();
  },

  lockSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    set((state) => ({
      objects: state.objects.map(obj => selectedIds.includes(obj.id) ? { ...obj, locked: true } : obj)
    }));
    get().saveHistory();
  },

  unlockSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    set((state) => ({
      objects: state.objects.map(obj => selectedIds.includes(obj.id) ? { ...obj, locked: false } : obj)
    }));
    get().saveHistory();
  },

  rotateSelected: (direction: 'cw' | 'ccw') => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    set((state) => ({
      objects: state.objects.map(obj => {
        if (!selectedIds.includes(obj.id)) return obj;
        const currentRotation = obj.rotation || 0;
        const newRotation = direction === 'cw' ? currentRotation + 90 : currentRotation - 90;
        return { ...obj, rotation: newRotation };
      })
    }));
    get().saveHistory();
  }
}));
