import type { SymbolDefinition } from '../SymbolRegistry';

export const hvacSymbols: Record<string, SymbolDefinition> = {
  'hvac.fan': {
    type: 'hvac.fan',
    label: 'Fan',
    category: 'HVAC',
    defaultWidth: 50,
    defaultHeight: 50,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF'
  },
  'hvac.heater': {
    type: 'hvac.heater',
    label: 'Heater',
    category: 'HVAC',
    defaultWidth: 80,
    defaultHeight: 40,
    allowedStates: ['OFF', 'HEATING', 'FAULT'],
    defaultState: 'OFF'
  },

  // Instrumentation (Sensors & Displays)
};
