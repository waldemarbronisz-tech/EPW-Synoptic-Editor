import type { SymbolDefinition } from '../SymbolRegistry';

export const instrumentationSymbols: Record<string, SymbolDefinition> = {
  'instrumentation.temperature_sensor': {
    type: 'instrumentation.temperature_sensor',
    label: 'Temp Sensor',
    category: 'Instrumentation',
    defaultWidth: 30,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'instrumentation.pressure_sensor': {
    type: 'instrumentation.pressure_sensor',
    label: 'Pressure Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'instrumentation.level_sensor': {
    type: 'instrumentation.level_sensor',
    label: 'Level Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'instrumentation.humidity_sensor': {
    type: 'instrumentation.humidity_sensor',
    label: 'Humidity Sensor',
    category: 'Instrumentation',
    defaultWidth: 30,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'instrumentation.leak_sensor': {
    type: 'instrumentation.leak_sensor',
    label: 'Leak Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'ACTIVE', 'FAULT'],
    defaultState: 'NORMAL'
  },

  // Automation
};
