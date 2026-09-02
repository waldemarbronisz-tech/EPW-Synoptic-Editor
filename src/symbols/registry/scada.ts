import type { SymbolDefinition } from '../SymbolRegistry';

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
    defaultHeight: 22, // BUSBAR_HEIGHT
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
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: [],
    defaultState: '',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }],
    // EKRAN: "Opis tekstowy". 150x150 -> (75,0) snapped to the grid.
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
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['ON', 'OFF', 'QUALITY'],
    defaultState: 'OFF',
    // EKRAN: "Dioda sygnalizacyjna". 150x150 -> (75,0) snapped to the grid.
    terminals: [{ id: 'IN', x: 80, y: 0, medium: 'ELECTRICAL' }]
  },
  'scada.meter': {
    type: 'scada.meter',
    label: 'Meter (SCADA)',
    category: 'SCADA',
    defaultWidth: 160,
    defaultHeight: 100,
    allowedStates: [],
    defaultState: '',
    // EKRAN: "Miernik". 160x100 -> (80,0), already an exact grid multiple.
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
    defaultWidth: 150,
    defaultHeight: 60,
    allowedStates: [],
    defaultState: ''
  }
};
