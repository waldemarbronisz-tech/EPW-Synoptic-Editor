import type { StateCreator } from 'zustand';
import { COLOR_CANVAS_BACKGROUND, GRID_SIZE } from '../theme/ScadaTheme';
import type { Device } from '../project/DeviceSchema';
import type { CanvasState, Message } from './types';
import type { AppState } from './appState';

// Project-level state: metadata, the file this project is saved to,
// dirty/messages, and the read-only device list - none of it touches the
// drawing itself (objects/connections/...), which lives in elementsSlice.
export type ProjectSlice = Pick<AppState,
  | 'projectMetadata' | 'canvasConfig' | 'projectName' | 'fileName' | 'fileHandle'
  | 'isDirty' | 'messages' | 'devices'
  | 'setProjectName' | 'setFileName' | 'setFileHandle' | 'setDirty' | 'addMessage' | 'setCanvasState'
>;

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set) => ({
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
  projectName: 'New Project',
  fileName: null,
  fileHandle: null,
  isDirty: false,
  messages: [],
  devices: [] as Device[],

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
    canvasState: { ...prev.canvasState, ...state } as CanvasState
  })),
});
