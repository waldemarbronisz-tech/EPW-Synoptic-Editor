// Internal-audit fix (god-file breakup): the shape types that used to live
// at the top of the single 926-line store.ts, unchanged - moved here so
// every slice file (and store.ts itself) can import them without a
// circular value dependency. store.ts re-exports all of these from its own
// path, so none of the ~40 files elsewhere in src/ that already do
// `import type { SynopticObject } from '../store'` need to change.
import type { MeterRow } from '../symbols/scada/MeterSymbol';
import type { MeterElement } from '../meter/MeterElement';
import type { SignalPanelElement } from '../elements/SignalPanelElement';
import type { FrameElement } from '../elements/FrameElement';
import type { TerrainTileType } from '../iso/TerrainTile';

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

export interface HistorySnapshot {
  objects: SynopticObject[];
  connections: SynopticConnection[];
  meters: MeterElement[];
  signalPanels: SignalPanelElement[];
  frames: FrameElement[];
  // feat/isometric-engine commit 3: the PLAN screen's painted terrain,
  // same treatment as every element kind above - optional so every
  // snapshot taken before this field existed (and every schematic-mode
  // snapshot, which never touches it) still satisfies this interface;
  // historySlice.ts's own undo/redo fall back to {} for it exactly the
  // way it already falls back to [] for meters/signalPanels/frames.
  terrainTiles?: Record<string, TerrainTileType>;
}
