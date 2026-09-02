import type { SymbolDefinition } from '../SymbolRegistry';

// Object Library trim (node-based wiring task, part E): only Circuit
// Breaker, Disconnect Switch, Motor, Indicator Lamp and Earth stay
// visible from this file's 15 symbols. The other 10 (plus the busbar,
// which is not a symbol at all any more - a bus is now a wire style)
// get hiddenFromLibrary: true - still fully defined, still render
// correctly for an already-placed instance, just not draggable from the
// Toolbox. Every terminals coordinate below is a GRID_SIZE (16) multiple,
// picked nearest to where connectionPoints' fraction used to land -
// none of these symbols' own defaultWidth/defaultHeight are themselves
// multiples of 16, so the terminal sits a few px from the exact visual
// lead in some cases (the same pre-existing tension noted throughout
// this codebase between the fixed symbol canvases and GRID_SIZE).
export const electricalSymbols: Record<string, SymbolDefinition> = {
  'electrical.circuit_breaker': {
    type: 'electrical.circuit_breaker',
    label: 'Circuit Breaker',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'TRIPPED', 'FAULT'],
    defaultState: 'OPEN',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }, { id: 'OUT', x: 16, y: 48, medium: 'ELECTRICAL' }]
  },
  'electrical.disconnect_switch': {
    type: 'electrical.disconnect_switch',
    label: 'Disconnect Switch',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'FAULT'],
    defaultState: 'OPEN',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }, { id: 'OUT', x: 16, y: 48, medium: 'ELECTRICAL' }]
  },
  'electrical.contactor': {
    type: 'electrical.contactor',
    label: 'Contactor',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}, {id: 'COIL', x: 0.8, y: 0.8, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.transformer': {
    type: 'electrical.transformer',
    label: 'Transformer',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'ENERGIZED', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'PRIMARY', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'SECONDARY', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.relay': {
    type: 'electrical.relay',
    label: 'Relay',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}, {id: 'COIL', x: 0.2, y: 0.8, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.fuse': {
    type: 'electrical.fuse',
    label: 'Fuse',
    category: 'Electrical',
    defaultWidth: 20,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'BLOWN'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.busbar': {
    type: 'electrical.busbar',
    label: 'Busbar',
    category: 'Electrical',
    defaultWidth: 200,
    defaultHeight: 10,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED',
    isLine: true,
    // A busbar is a wire style (SynopticConnection.style === 'BUS') now,
    // not a symbol - hidden regardless of the old supportsDynamicPorts
    // mechanism, which the node-based wiring model no longer uses.
    supportsDynamicPorts: true,
    hiddenFromLibrary: true
  },
  'electrical.indicator_lamp': {
    type: 'electrical.indicator_lamp',
    label: 'Indicator Lamp',
    category: 'Electrical',
    defaultWidth: 30,
    defaultHeight: 30,
    allowedStates: ['OFF', 'ON', 'BLINK', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}],
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },
  'electrical.generator': {
    type: 'electrical.generator',
    label: 'Generator',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'OUT', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.grid_source': {
    type: 'electrical.grid_source',
    label: 'Grid Source',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['ENERGIZED', 'DEENERGIZED', 'FAULT'],
    defaultState: 'ENERGIZED',
    connectionPoints: [{id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.motor': {
    type: 'electrical.motor',
    label: 'Motor',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}],
    terminals: [{ id: 'IN', x: 32, y: 0, medium: 'ELECTRICAL' }]
  },
  'electrical.generic_load': {
    type: 'electrical.generic_load',
    label: 'Generic Load',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.terminal': {
    type: 'electrical.terminal',
    label: 'Terminal',
    category: 'Electrical',
    defaultWidth: 20,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.rcd': {
    type: 'electrical.rcd',
    label: 'RCD / RCCB',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['CLOSED', 'OPEN', 'TRIPPED', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.spd': {
    type: 'electrical.spd',
    label: 'SPD',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}, {id: 'GND', x: 0.5, y: 1, domain: 'electrical', direction: 'passive'}],
    hiddenFromLibrary: true
  },
  'electrical.cable_tray': {
    type: 'electrical.cable_tray',
    label: 'Cable Tray',
    category: 'Electrical',
    defaultWidth: 100,
    defaultHeight: 20,
    allowedStates: ['NORMAL'],
    defaultState: 'NORMAL',
    hiddenFromLibrary: true
  },
  'electrical.earth': {
    type: 'electrical.earth',
    label: 'Earth',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'GND', x: 0.5, y: 0, domain: 'electrical', direction: 'passive'}],
    terminals: [{ id: 'GND', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },

  // Water
};
