import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface SynopticObject {
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
  tag: string;
  description: string;
  color: string;
  fill: string;
  border: string;
  text: string;
  font: string;
  fontSize: number;

  // Logic & Bindings
  bindings?: {
    state?: string;
    command?: string;
    alarm?: string;
  };
  editor?: {
    preview_state?: string;
  };

  // Legacy / Other
  animation: string;
  alarm: string;
  runtimeVariable: string;
  logicConnection: string;
  tooltip: string;

  // Layout
  width: number;
  height: number;

  customProperties: Record<string, string>;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Message {
  id: string;
  type: 'info' | 'error' | 'warning';
  text: string;
  time: string;
}

interface AppState {
  objects: SynopticObject[];
  selectedIds: string[];
  canvasState: CanvasState;
  clipboard: SynopticObject[];
  history: SynopticObject[][];
  historyIndex: number;

  // Project State
  projectName: string;
  fileName: string | null;
  fileHandle: any | null;
  isDirty: boolean;
  messages: Message[];

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
  deleteObjects: (ids: string[]) => void;
  selectObjects: (ids: string[], multi?: boolean) => void;
  clearSelection: () => void;

  // Clipboard
  copySelected: () => void;
  paste: () => void;

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
}

export const useStore = create<AppState>((set, get) => ({
  objects: [],
  selectedIds: [],
  canvasState: { zoom: 1, panX: 0, panY: 0 },
  clipboard: [],
  history: [[]],
  historyIndex: 0,

  projectName: 'New Project',
  fileName: null,
  fileHandle: null,
  isDirty: false,
  messages: [],

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
    // Only call this AFTER mutations have been made to state
    const { objects, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(objects)));
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
      )
    }));
    get().saveHistory();
  },

  updateObjects: (updates) => {
    set((state) => {
      let newObjects = [...state.objects];
      updates.forEach(u => {
        newObjects = newObjects.map(obj => obj.id === u.id ? { ...obj, ...u.updates } : obj);
      });
      return { objects: newObjects };
    });
    get().saveHistory();
  },

  deleteObjects: (ids) => {
    if (ids.length === 0) return;
    set((state) => ({
      objects: state.objects.filter(obj => !ids.includes(obj.id)),
      selectedIds: state.selectedIds.filter(id => !ids.includes(id))
    }));
    get().saveHistory();
  },

  selectObjects: (ids, multi = false) => set((state) => {
    if (multi) {
      // Toggle selection if already selected, otherwise add
      const newSelection = [...state.selectedIds];
      ids.forEach(id => {
        const index = newSelection.indexOf(id);
        if (index >= 0) newSelection.splice(index, 1);
        else newSelection.push(id);
      });
      return { selectedIds: newSelection };
    }
    return { selectedIds: ids };
  }),

  clearSelection: () => set({ selectedIds: [] }),

  copySelected: () => {
    const { objects, selectedIds } = get();
    const toCopy = objects.filter(obj => selectedIds.includes(obj.id));
    set({ clipboard: JSON.parse(JSON.stringify(toCopy)) });
  },

  paste: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    const newIds: string[] = [];
    const newObjects = clipboard.map(obj => {
      const newId = uuidv4();
      newIds.push(newId);
      return { ...obj, id: newId, x: obj.x + 20, y: obj.y + 20 };
    });

    set((state) => ({
      objects: [...state.objects, ...newObjects],
      selectedIds: newIds
    }));
    get().saveHistory();
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        objects: JSON.parse(JSON.stringify(history[historyIndex - 1])),
        selectedIds: [],
        isDirty: true
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        objects: JSON.parse(JSON.stringify(history[historyIndex + 1])),
        selectedIds: [],
        isDirty: true
      });
    }
  },

  bringToFront: () => {
    const { objects, selectedIds } = get();
    const unselected = objects.filter(obj => !selectedIds.includes(obj.id));
    const selected = objects.filter(obj => selectedIds.includes(obj.id));
    set({ objects: [...unselected, ...selected] });
    get().saveHistory();
  },

  sendToBack: () => {
    const { objects, selectedIds } = get();
    const unselected = objects.filter(obj => !selectedIds.includes(obj.id));
    const selected = objects.filter(obj => selectedIds.includes(obj.id));
    set({ objects: [...selected, ...unselected] });
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
  }
}));
