import type { SymbolDefinition } from '../SymbolRegistry';

// All five of this file's symbols stay visible in the Object Library
// (part E, CZUJNIKI) - none had connectionPoints before (sensors were
// never wireable in the old port model at all); each gets one
// ELECTRICAL terminal (power/signal feed) now.
export const instrumentationSymbols: Record<string, SymbolDefinition> = {
  'instrumentation.temperature_sensor': {
    type: 'instrumentation.temperature_sensor',
    label: 'Temp Sensor',
    category: 'Instrumentation',
    defaultWidth: 30,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },
  'instrumentation.pressure_sensor': {
    type: 'instrumentation.pressure_sensor',
    label: 'Pressure Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },
  'instrumentation.level_sensor': {
    type: 'instrumentation.level_sensor',
    label: 'Level Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },
  'instrumentation.humidity_sensor': {
    type: 'instrumentation.humidity_sensor',
    label: 'Humidity Sensor',
    category: 'Instrumentation',
    defaultWidth: 30,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },
  'instrumentation.leak_sensor': {
    type: 'instrumentation.leak_sensor',
    label: 'Leak Sensor',
    category: 'Instrumentation',
    defaultWidth: 40,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'ACTIVE', 'FAULT'],
    defaultState: 'NORMAL',
    terminals: [{ id: 'IN', x: 16, y: 0, medium: 'ELECTRICAL' }]
  },

  // Automation
};
