// Internal-audit fix (god-file breakup): the combined store shape, moved
// out of store.ts unchanged so every slice creator (objectsSlice.ts,
// selectionSlice.ts, etc.) can type itself as
// `StateCreator<AppState, [], [], ItsOwnSlice>` - Zustand's own
// documented "slices" pattern - without a circular VALUE import back to
// store.ts (this file has no runtime code in it at all, only the type).
import type { MeterElement } from '../meter/MeterElement';
import type { SignalPanelElement } from '../elements/SignalPanelElement';
import type { FrameElement } from '../elements/FrameElement';
import type { Device } from '../project/DeviceSchema';
import type { TerrainTileType } from '../iso/TerrainTile';
import type { CanvasState, HistorySnapshot, Message, SynopticConnection, SynopticObject } from './types';

export interface AppState {
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
  // The frame element (feat/appearance-selection-frames commit 3): a
  // pure graphic (no terminals, no state, no aparat link) drawn by
  // dragging a rectangle - see elements/FrameElement.ts.
  frames: FrameElement[];
  selectedIds: string[];
  selectedConnectionIds: string[];
  selectedMeterIds: string[];
  selectedSignalPanelIds: string[];
  selectedFrameIds: string[];
  canvasState: CanvasState;
  clipboard: SynopticObject[];
  clipboardMeters: MeterElement[];
  clipboardSignalPanels: SignalPanelElement[];
  clipboardFrames: FrameElement[];
  clipboardConnections: SynopticConnection[];
  history: HistorySnapshot[];
  historyIndex: number;

  // Project State
  projectName: string;
  fileName: string | null;
  fileHandle: FileSystemFileHandle | null;
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

  // Frame Drawing Mode (commit 3): active while the "Rysuj ramke"/
  // "Rysuj budynek" toolbar tool is toggled on - a drag on empty
  // canvas then draws a frame rectangle instead of a rubber-band
  // selection box. drawingFrameVariant is which of the two the next
  // drag creates; the tool stays active across multiple drags, same
  // convention as the wire tool above, until toggled off again.
  isDrawingFrame: boolean;
  drawingFrameVariant: FrameElement['variant'];
  // fix/handles-insert-mode-diodes commit 2: whether Shift was held
  // when this tool was last armed - true means the tool stays active
  // after placing one frame/building (continuous mode, for placing
  // several in a row); false (the default) means placing one returns
  // straight to select mode, per this fix's own required behavior.
  frameToolContinuous: boolean;
  setDrawingFrameMode: (active: boolean, variant?: FrameElement['variant'], continuous?: boolean) => void;

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
  setFileHandle: (handle: FileSystemFileHandle | null) => void;
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
  addFrame: (frame: Omit<FrameElement, 'id'>) => void;
  updateFrame: (id: string, updates: Partial<FrameElement>) => void;
  deleteObjects: (ids: string[], connIds?: string[], meterIds?: string[], signalPanelIds?: string[], frameIds?: string[]) => void;
  selectObjects: (ids: string[], multi?: boolean) => void;
  selectConnections: (ids: string[], multi?: boolean) => void;
  selectMeters: (ids: string[], multi?: boolean) => void;
  selectSignalPanels: (ids: string[], multi?: boolean) => void;
  selectFrames: (ids: string[], multi?: boolean) => void;
  // commit 3 (feat/editing-and-signal-panel), extended in commit 2
  // (feat/appearance-selection-frames) with a fifth kind: replaces the
  // whole selection with a mix of all five kinds at once (the rubber-
  // band's own result) - and Ctrl+A's "select everything on screen".
  selectMixed: (selection: { objectIds?: string[]; connectionIds?: string[]; meterIds?: string[]; signalPanelIds?: string[]; frameIds?: string[] }) => void;
  selectAll: () => void;
  clearSelection: () => void;
  // Arrow keys (commit 3): every selected object/meter/signalPanel/
  // frame/connection moves by (dx, dy) together, as one history entry
  // per keypress.
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
  duplicateFrameInPlace: (id: string) => void;

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

  // PLAN screen terrain (feat/isometric-engine commit 3): a sparse map,
  // one entry per PAINTED tile only - an unpainted tile is simply absent,
  // not stored with some "empty" type, so the canvas shows the plot as
  // an island on the background, not a rectangle filling the screen.
  terrainTiles: Record<string, TerrainTileType>;
  // Sets/overwrites one tile - called for every tile the paint tool's
  // drag crosses. Deliberately does NOT call saveHistory itself (a drag
  // can cross many tiles); commitTerrainStroke below does that once, so
  // one whole mousedown-to-mouseup drag is one undo entry, never one per
  // tile painted.
  paintTerrainTile: (gx: number, gy: number, type: TerrainTileType) => void;
  commitTerrainStroke: () => void;
}
