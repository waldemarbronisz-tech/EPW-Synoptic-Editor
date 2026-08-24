import type { SymbolDefinition } from '../SymbolRegistry';

export const measurementsSymbols: Record<string, SymbolDefinition> = {
  'measurements.generic_display': {
    type: 'measurements.generic_display',
    label: 'Value Display',
    category: 'Measurements',
    defaultWidth: 100,
    defaultHeight: 50,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'measurements.voltage_display': {
    type: 'measurements.voltage_display',
    label: 'Voltage',
    category: 'Measurements',
    defaultWidth: 100,
    defaultHeight: 50,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'measurements.current_display': {
    type: 'measurements.current_display',
    label: 'Current',
    category: 'Measurements',
    defaultWidth: 100,
    defaultHeight: 50,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'measurements.temperature_display': {
    type: 'measurements.temperature_display',
    label: 'Temperature',
    category: 'Measurements',
    defaultWidth: 100,
    defaultHeight: 50,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },

  // Generic primitives
};
