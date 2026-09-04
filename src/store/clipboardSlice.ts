import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GRID_SIZE } from '../theme/ScadaTheme';
import { cloneSelectionWithOffset } from '../utils/CloneSelection';
import type { AppState } from './appState';

// Copy/paste/duplicate over the current selection (selectionSlice.ts) -
// its own clipboard* arrays, deliberately separate from undo/redo history
// (historySlice.ts), so pasting after several undos still pastes the last
// thing actually copied.
export type ClipboardSlice = Pick<AppState,
  | 'clipboard' | 'clipboardMeters' | 'clipboardSignalPanels' | 'clipboardFrames' | 'clipboardConnections'
  | 'copySelected' | 'paste' | 'duplicateSelected'
  | 'duplicateObjectInPlace' | 'duplicateMeterInPlace' | 'duplicateSignalPanelInPlace' | 'duplicateFrameInPlace'
>;

export const createClipboardSlice: StateCreator<AppState, [], [], ClipboardSlice> = (set, get) => ({
  clipboard: [],
  clipboardMeters: [],
  clipboardSignalPanels: [],
  clipboardFrames: [],
  clipboardConnections: [],

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
    const { objects, selectedIds, meters, selectedMeterIds, signalPanels, selectedSignalPanelIds, frames, selectedFrameIds, connections, selectedConnectionIds } = get();
    const toCopy = objects.filter(obj => selectedIds.includes(obj.id));
    const metersToCopy = meters.filter(m => selectedMeterIds.includes(m.id));
    const signalPanelsToCopy = signalPanels.filter(p => selectedSignalPanelIds.includes(p.id));
    const framesToCopy = frames.filter(f => selectedFrameIds.includes(f.id));
    const connectionsToCopy = connections.filter(c => selectedConnectionIds.includes(c.id));
    set({
      clipboard: JSON.parse(JSON.stringify(toCopy)),
      clipboardMeters: JSON.parse(JSON.stringify(metersToCopy)),
      clipboardSignalPanels: JSON.parse(JSON.stringify(signalPanelsToCopy)),
      clipboardFrames: JSON.parse(JSON.stringify(framesToCopy)),
      clipboardConnections: JSON.parse(JSON.stringify(connectionsToCopy))
    });
  },

  // Offset by exactly one grid cell right and down - never atop the
  // original, and always back on the grid (GRID_SIZE is itself the
  // grid's own pitch, so a grid-aligned source stays grid-aligned).
  paste: () => {
    const { clipboard, clipboardMeters, clipboardSignalPanels, clipboardFrames, clipboardConnections } = get();
    if (clipboard.length === 0 && clipboardMeters.length === 0 && clipboardSignalPanels.length === 0 && clipboardFrames.length === 0 && clipboardConnections.length === 0) return;

    const cloned = cloneSelectionWithOffset(clipboard, clipboardMeters, clipboardSignalPanels, clipboardFrames, clipboardConnections, GRID_SIZE, GRID_SIZE, uuidv4);

    set((state) => ({
      objects: [...state.objects, ...cloned.objects],
      meters: [...state.meters, ...cloned.meters],
      signalPanels: [...state.signalPanels, ...cloned.signalPanels],
      frames: [...state.frames, ...cloned.frames],
      connections: [...state.connections, ...cloned.connections],
      selectedIds: cloned.objectIds,
      selectedConnectionIds: cloned.connectionIds,
      selectedMeterIds: cloned.meterIds,
      selectedSignalPanelIds: cloned.signalPanelIds,
      selectedFrameIds: cloned.frameIds
    }));
    get().saveHistory();
  },

  // Ctrl+D: duplicates the CURRENT selection directly, with the same
  // one-grid-cell offset paste uses - one keystroke, the clipboard
  // untouched (a subsequent Ctrl+V still pastes whatever was last
  // explicitly copied, not this duplicate).
  duplicateSelected: () => {
    const { objects, selectedIds, meters, selectedMeterIds, signalPanels, selectedSignalPanelIds, frames, selectedFrameIds, connections, selectedConnectionIds } = get();
    const toDuplicate = objects.filter(obj => selectedIds.includes(obj.id));
    const metersToDuplicate = meters.filter(m => selectedMeterIds.includes(m.id));
    const signalPanelsToDuplicate = signalPanels.filter(p => selectedSignalPanelIds.includes(p.id));
    const framesToDuplicate = frames.filter(f => selectedFrameIds.includes(f.id));
    const connectionsToDuplicate = connections.filter(c => selectedConnectionIds.includes(c.id));
    if (toDuplicate.length === 0 && metersToDuplicate.length === 0 && signalPanelsToDuplicate.length === 0 && framesToDuplicate.length === 0 && connectionsToDuplicate.length === 0) return;

    const cloned = cloneSelectionWithOffset(toDuplicate, metersToDuplicate, signalPanelsToDuplicate, framesToDuplicate, connectionsToDuplicate, GRID_SIZE, GRID_SIZE, uuidv4);

    set((state) => ({
      objects: [...state.objects, ...cloned.objects],
      meters: [...state.meters, ...cloned.meters],
      signalPanels: [...state.signalPanels, ...cloned.signalPanels],
      frames: [...state.frames, ...cloned.frames],
      connections: [...state.connections, ...cloned.connections],
      selectedIds: cloned.objectIds,
      selectedConnectionIds: cloned.connectionIds,
      selectedMeterIds: cloned.meterIds,
      selectedSignalPanelIds: cloned.signalPanelIds,
      selectedFrameIds: cloned.frameIds
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

  duplicateFrameInPlace: (id) => {
    const frame = get().frames.find(f => f.id === id);
    if (!frame) return;
    const clone = { ...JSON.parse(JSON.stringify(frame)), id: uuidv4() };
    set((state) => ({ frames: [...state.frames, clone] }));
  },
});
