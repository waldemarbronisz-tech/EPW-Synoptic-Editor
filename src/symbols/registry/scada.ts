import type { SymbolDefinition } from '../SymbolRegistry';
import { BUSBAR_HEIGHT } from '../../theme/ScadaTheme';

// The nine retro-industrial SCADA-style symbols (src/symbols/scada/),
// exposed as a new "SCADA" category alongside the existing 47-symbol
// library. Native canvas is 150x150 for every symbol except the busbar
// (see WSPOLNE ZASADY in the originating task) - defaultWidth/Height
// below match that native geometry exactly, so the fraction-based
// connectionPoints (0-1 of width/height) land precisely on the pixel
// coordinates each symbol component draws its ports at.

export const scadaSymbols: Record<string, SymbolDefinition> = {
  'scada.load_switch': {
    type: 'scada.load_switch',
    label: 'Load Switch',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['CLOSED', 'OPEN', 'FAULT'],
    defaultState: 'OPEN',
    connectionPoints: [
      { id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' },
      { id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive' }
    ],
    // Object Library trim (part E): not in the kept 22 (the plain,
    // pre-SCADA-restyle electrical.* equivalents are what stayed
    // visible instead) - hidden, not deleted.
    hiddenFromLibrary: true
  },
  'scada.busbar': {
    type: 'scada.busbar',
    label: 'Busbar (SCADA)',
    category: 'SCADA',
    defaultWidth: 200,
    // feat/media-and-proportions part A1: was a hardcoded 22 that went
    // stale once BUSBAR_HEIGHT dropped to 16 - now imports the constant
    // itself so it can never drift out of sync again.
    defaultHeight: BUSBAR_HEIGHT,
    allowedStates: ['LIVE', 'DEAD'],
    defaultState: 'DEAD',
    isLine: true,
    // A busbar is a wire style now (SynopticConnection.style === 'BUS'),
    // not a symbol - hidden regardless of the old supportsDynamicPorts
    // mechanism, which the node-based wiring model no longer uses.
    supportsDynamicPorts: true,
    hiddenFromLibrary: true
  },
  'scada.wire_node': {
    type: 'scada.wire_node',
    label: 'Wire Node',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: [],
    defaultState: '',
    // Its component (WireNodeSymbol) is still used directly by Canvas.tsx
    // to draw every automatic junction dot - only the drag-it-yourself
    // library entry is hidden, not the symbol or its rendering.
    hiddenFromLibrary: true
  },
  'scada.label_frame': {
    type: 'scada.label_frame',
    label: 'Label Frame',
    category: 'SCADA',
    // feat/media-and-proportions part A2: 150 -> 144 (nearest GRID_SIZE
    // multiple). Purely a registry-hygiene change - LabelFrameSymbol's
    // own rendered width/height are computed straight from the title/
    // description text (getLabelFrameSize), never read obj.width/
    // obj.height at all, so this has no visible effect on the symbol
    // itself, only on its initial placement bounding box.
    defaultWidth: 144,
    defaultHeight: 144,
    allowedStates: [],
    defaultState: '',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }],
    // EKRAN: "Opis tekstowy". 144x144 -> center 72, an exact tie between
    // 64 and 80 - kept at 80 (unchanged from the 150-wide default; same
    // round-up-on-tie convention, so no functional change here either).
    terminals: [{ id: 'IN', x: 80, y: 0, medium: 'ELECTRICAL' }]
  },
  'scada.motor': {
    type: 'scada.motor',
    label: 'Motor (SCADA)',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['RUN', 'STOP', 'FAULT'],
    defaultState: 'STOP',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }],
    // Object Library trim (part E): not in the kept 22 - electrical.motor
    // stayed visible instead.
    hiddenFromLibrary: true
  },
  'scada.pilot_lamp': {
    type: 'scada.pilot_lamp',
    label: 'Pilot Lamp',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['ON', 'OFF'],
    defaultState: 'OFF',
    // Object Library trim (part E): not in the kept 22 -
    // electrical.indicator_lamp stayed visible instead.
    hiddenFromLibrary: true
  },
  'scada.socket': {
    type: 'scada.socket',
    label: 'Socket (SCADA)',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['LIVE', 'DEAD'],
    defaultState: 'DEAD',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }],
    hiddenFromLibrary: true
  },
  'scada.indicator_diode': {
    type: 'scada.indicator_diode',
    label: 'Indicator Diode',
    category: 'SCADA',
    // feat/media-and-proportions part A2: 150 -> 144. Also purely
    // registry hygiene - IndicatorDiodeSymbol draws its dot at a fixed
    // local (75,75) regardless of obj.width/obj.height, so the visible
    // dot does not move; only the bounding box shrinks slightly.
    defaultWidth: 144,
    defaultHeight: 144,
    allowedStates: ['ON', 'OFF', 'QUALITY'],
    defaultState: 'OFF',
    // EKRAN: "Dioda sygnalizacyjna". Same tie-at-72 case as label_frame
    // above - kept at 80, unchanged.
    terminals: [{ id: 'IN', x: 80, y: 0, medium: 'ELECTRICAL' }]
  },
  'scada.meter': {
    type: 'scada.meter',
    label: 'Meter (SCADA)',
    category: 'SCADA',
    // feat/media-and-proportions part A2: width (160) already an exact
    // GRID_SIZE multiple and IS the symbol's real rendered width
    // (MeterSymbol reads obj.width directly) - left unchanged. Height
    // (100 -> 96) is registry hygiene only: MeterSymbol computes its
    // own height from the row count (getMeterHeight), never reads
    // obj.height, so this has no visible effect.
    defaultWidth: 160,
    defaultHeight: 96,
    allowedStates: [],
    defaultState: '',
    // EKRAN: "Miernik". 160x96 -> (80,0), still an exact grid multiple
    // (unaffected by the height change - it sits on the top edge, y=0).
    terminals: [{ id: 'IN', x: 80, y: 0, medium: 'ELECTRICAL' }]
  },
  'scada.boundary_point': {
    type: 'scada.boundary_point',
    label: 'Boundary Point',
    category: 'SCADA',
    // Its real rendered size hugs the label/sublabel text (clamped to
    // 96-220px wide) - same as the label frame it is built on, these are
    // just the initial values a freshly dropped instance starts with.
    // No static terminals here: its single terminal's position depends
    // on the per-instance boundaryPortSide, so it is resolved
    // dynamically (utils/Terminals.ts's getObjectTerminals) rather than
    // listed statically, the same way the old port model special-cased
    // it in GeometryUtils.resolveConnectionPoint.
    // feat/media-and-proportions part A2: 150 -> 144, 60 -> 64. Registry
    // hygiene only, same as label_frame/indicator_diode above - these
    // two fields are never read for boundary_point's actual rendered
    // size or its terminal (both come from getBoundaryPointWidth/
    // getLabelFrameSize, driven by the label text, not obj.width/
    // obj.height), so nothing here changes visually or terminal-wise.
    defaultWidth: 144,
    defaultHeight: 64,
    allowedStates: [],
    defaultState: ''
  }
};
