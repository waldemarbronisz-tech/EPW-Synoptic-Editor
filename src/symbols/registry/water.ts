import type { SymbolDefinition } from '../SymbolRegistry';

export const waterSymbols: Record<string, SymbolDefinition> = {
  'water.valve': {
    type: 'water.valve',
    label: 'Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.pump': {
    type: 'water.pump',
    label: 'Pump',
    category: 'Water',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.tank': {
    type: 'water.tank',
    label: 'Tank',
    category: 'Water',
    defaultWidth: 80,
    defaultHeight: 120,
    allowedStates: ['NORMAL', 'LOW', 'HIGH', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.gate_valve': {
    type: 'water.gate_valve',
    label: 'Gate Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.ball_valve': {
    type: 'water.ball_valve',
    label: 'Ball Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.solenoid_valve': {
    type: 'water.solenoid_valve',
    label: 'Solenoid Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 60,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.drain_valve': {
    type: 'water.drain_valve',
    label: 'Drain Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPEN', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },
  'water.drain': {
    type: 'water.drain',
    label: 'Drain',
    category: 'Water',
    defaultWidth: 40,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'water', direction: 'in'}, {id: 'OUT', x: 1, y: 0.5, domain: 'water', direction: 'out'}]
  },

};
