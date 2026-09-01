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
    ]
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
    supportsDynamicPorts: true
  },
  'scada.wire_node': {
    type: 'scada.wire_node',
    label: 'Wire Node',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: [],
    defaultState: ''
  },
  'scada.label_frame': {
    type: 'scada.label_frame',
    label: 'Label Frame',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: [],
    defaultState: '',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }]
  },
  'scada.motor': {
    type: 'scada.motor',
    label: 'Motor (SCADA)',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['RUN', 'STOP', 'FAULT'],
    defaultState: 'STOP',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }]
  },
  'scada.pilot_lamp': {
    type: 'scada.pilot_lamp',
    label: 'Pilot Lamp',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['ON', 'OFF'],
    defaultState: 'OFF'
  },
  'scada.socket': {
    type: 'scada.socket',
    label: 'Socket (SCADA)',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['LIVE', 'DEAD'],
    defaultState: 'DEAD',
    connectionPoints: [{ id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive' }]
  },
  'scada.indicator_diode': {
    type: 'scada.indicator_diode',
    label: 'Indicator Diode',
    category: 'SCADA',
    defaultWidth: 150,
    defaultHeight: 150,
    allowedStates: ['ON', 'OFF', 'QUALITY'],
    defaultState: 'OFF'
  },
  'scada.meter': {
    type: 'scada.meter',
    label: 'Meter (SCADA)',
    category: 'SCADA',
    defaultWidth: 160,
    defaultHeight: 100,
    allowedStates: [],
    defaultState: ''
  }
};
