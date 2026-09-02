import type { SymbolDefinition } from '../SymbolRegistry';

// Both of this file's symbols stay visible in the Object Library (part
// E) - only ELECTRICAL is a valid terminal medium (the node-based wiring
// model has no separate air/HVAC medium), so each gets one power feed
// terminal. feat/media-and-proportions part A2 brought their
// defaultWidth/defaultHeight to GRID_SIZE multiples (50, 40 were not).
export const hvacSymbols: Record<string, SymbolDefinition> = {
  'hvac.fan': {
    type: 'hvac.fan',
    label: 'Fan',
    category: 'HVAC',
    defaultWidth: 48,
    defaultHeight: 48,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    terminals: [{ id: 'IN', x: 32, y: 0, medium: 'ELECTRICAL' }]
  },
  'hvac.heater': {
    type: 'hvac.heater',
    label: 'Heater',
    category: 'HVAC',
    defaultWidth: 80,
    defaultHeight: 48,
    allowedStates: ['OFF', 'HEATING', 'FAULT'],
    defaultState: 'OFF',
    terminals: [{ id: 'IN', x: 48, y: 0, medium: 'ELECTRICAL' }]
  },

  // Instrumentation (Sensors & Displays)
};
