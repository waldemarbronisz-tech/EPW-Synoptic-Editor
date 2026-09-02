import type { SymbolDefinition } from '../SymbolRegistry';

// Both of this file's symbols stay visible in the Object Library (part
// E) - only ELECTRICAL is a valid terminal medium (the node-based wiring
// model has no separate air/HVAC medium), so each gets one power feed
// terminal.
export const hvacSymbols: Record<string, SymbolDefinition> = {
  'hvac.fan': {
    type: 'hvac.fan',
    label: 'Fan',
    category: 'HVAC',
    defaultWidth: 50,
    defaultHeight: 50,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    terminals: [{ id: 'IN', x: 32, y: 0, medium: 'ELECTRICAL' }]
  },
  'hvac.heater': {
    type: 'hvac.heater',
    label: 'Heater',
    category: 'HVAC',
    defaultWidth: 80,
    defaultHeight: 40,
    allowedStates: ['OFF', 'HEATING', 'FAULT'],
    defaultState: 'OFF',
    terminals: [{ id: 'IN', x: 48, y: 0, medium: 'ELECTRICAL' }]
  },

  // Instrumentation (Sensors & Displays)
};
