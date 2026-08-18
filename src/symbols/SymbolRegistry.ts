export interface ConnectionPoint {
  id: string;
  x: number; // percentage (0 to 1) relative to width
  y: number; // percentage (0 to 1) relative to height
  domain?: 'electrical' | 'water' | 'hvac' | 'data' | 'control';
  medium?: string;
  direction?: 'in' | 'out' | 'bidirectional';
}

export interface SymbolDefinition {
  type: string;
  label: string;
  category: string;
  defaultWidth: number;
  defaultHeight: number;
  allowedStates: string[];
  defaultState: string;
  connectionPoints?: ConnectionPoint[];
  isLine?: boolean;
}

export const SYMBOL_REGISTRY: Record<string, SymbolDefinition> = {
  // Electrical - Switching
  'electrical.circuit_breaker': {
    type: 'electrical.circuit_breaker',
    label: 'Circuit Breaker',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'TRIPPED', 'FAULT'],
    defaultState: 'OPEN',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.disconnect_switch': {
    type: 'electrical.disconnect_switch',
    label: 'Disconnect Switch',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'FAULT'],
    defaultState: 'OPEN',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.contactor': {
    type: 'electrical.contactor',
    label: 'Contactor',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}, {id: 'COIL', x: 0.8, y: 0.8, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.transformer': {
    type: 'electrical.transformer',
    label: 'Transformer',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'ENERGIZED', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'PRIMARY', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'SECONDARY', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.relay': {
    type: 'electrical.relay',
    label: 'Relay',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}, {id: 'COIL', x: 0.2, y: 0.8, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.fuse': {
    type: 'electrical.fuse',
    label: 'Fuse',
    category: 'Electrical',
    defaultWidth: 20,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'BLOWN'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.busbar': {
    type: 'electrical.busbar',
    label: 'Busbar',
    category: 'Electrical',
    defaultWidth: 200,
    defaultHeight: 10,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED',
    isLine: true
  },
  'electrical.indicator_lamp': {
    type: 'electrical.indicator_lamp',
    label: 'Indicator Lamp',
    category: 'Electrical',
    defaultWidth: 30,
    defaultHeight: 30,
    allowedStates: ['OFF', 'ON', 'BLINK', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.generator': {
    type: 'electrical.generator',
    label: 'Generator',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'OUT', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.grid_source': {
    type: 'electrical.grid_source',
    label: 'Grid Source',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['ENERGIZED', 'DEENERGIZED', 'FAULT'],
    defaultState: 'ENERGIZED',
    connectionPoints: [{id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.motor': {
    type: 'electrical.motor',
    label: 'Motor',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.generic_load': {
    type: 'electrical.generic_load',
    label: 'Generic Load',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.terminal': {
    type: 'electrical.terminal',
    label: 'Terminal',
    category: 'Electrical',
    defaultWidth: 20,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.rcd': {
    type: 'electrical.rcd',
    label: 'RCD / RCCB',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['CLOSED', 'OPEN', 'TRIPPED', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.spd': {
    type: 'electrical.spd',
    label: 'SPD',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'GND', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'electrical.cable': {
    type: 'electrical.cable',
    label: 'Cable',
    category: 'Electrical',
    defaultWidth: 100,
    defaultHeight: 10,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED',
    isLine: true
  },
  'electrical.ac_wire': {
    type: 'electrical.ac_wire',
    label: 'AC Wire',
    category: 'Electrical',
    defaultWidth: 100,
    defaultHeight: 5,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED',
    isLine: true
  },
  'electrical.three_phase_line': {
    type: 'electrical.three_phase_line',
    label: '3-Phase Line',
    category: 'Electrical',
    defaultWidth: 100,
    defaultHeight: 15,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED',
    isLine: true
  },
  'electrical.cable_tray': {
    type: 'electrical.cable_tray',
    label: 'Cable Tray',
    category: 'Electrical',
    defaultWidth: 100,
    defaultHeight: 20,
    allowedStates: ['NORMAL'],
    defaultState: 'NORMAL'
  },
  'electrical.earth': {
    type: 'electrical.earth',
    label: 'Earth',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'GND', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },

  // Water
  'water.pipe': {
    type: 'water.pipe',
    label: 'Pipe',
    category: 'Water',
    defaultWidth: 100,
    defaultHeight: 10,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE',
    isLine: true
  },
  'water.pipe_elbow': {
    type: 'water.pipe_elbow',
    label: 'Pipe Elbow',
    category: 'Water',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE',
    isLine: true
  },
  'water.tee': {
    type: 'water.tee',
    label: 'Tee',
    category: 'Water',
    defaultWidth: 60,
    defaultHeight: 40,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE',
    isLine: true
  },
  'water.valve': {
    type: 'water.valve',
    label: 'Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 1, y: 0.5, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.pump': {
    type: 'water.pump',
    label: 'Pump',
    category: 'Water',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF',
    connectionPoints: [{id: 'SUCTION', x: 0, y: 0.5, domain: 'electrical', direction: 'bidirectional'}, {id: 'DISCHARGE', x: 0.6, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.tank': {
    type: 'water.tank',
    label: 'Tank',
    category: 'Water',
    defaultWidth: 80,
    defaultHeight: 120,
    allowedStates: ['NORMAL', 'LOW', 'HIGH', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'INLET', x: 0, y: 0.2, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUTLET', x: 1, y: 0.8, domain: 'electrical', direction: 'bidirectional'}, {id: 'DRAIN', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.gate_valve': {
    type: 'water.gate_valve',
    label: 'Gate Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 1, y: 0.5, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.ball_valve': {
    type: 'water.ball_valve',
    label: 'Ball Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 1, y: 0.5, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.solenoid_valve': {
    type: 'water.solenoid_valve',
    label: 'Solenoid Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 60,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.7, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 1, y: 0.7, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.drain_valve': {
    type: 'water.drain_valve',
    label: 'Drain Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPEN', 'FAULT'],
    defaultState: 'CLOSED',
    connectionPoints: [{id: 'IN', x: 0, y: 0.5, domain: 'electrical', direction: 'bidirectional'}, {id: 'OUT', x: 1, y: 0.5, domain: 'electrical', direction: 'bidirectional'}]
  },
  'water.drain': {
    type: 'water.drain',
    label: 'Drain',
    category: 'Water',
    defaultWidth: 40,
    defaultHeight: 20,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },

  // HVAC
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
  'automation.plc': {
    type: 'automation.plc',
    label: 'PLC',
    category: 'Automation',
    defaultWidth: 120,
    defaultHeight: 80,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF'
  },
  'automation.remote_io': {
    type: 'automation.remote_io',
    label: 'Remote IO',
    category: 'Automation',
    defaultWidth: 80,
    defaultHeight: 80,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF'
  },
  'automation.ela_inputs': {
    type: 'automation.ela_inputs',
    label: 'ELA Inputs',
    category: 'Automation',
    defaultWidth: 60,
    defaultHeight: 80,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'POWER', x: 0.2, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'RS485', x: 0.8, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'automation.ada_outputs': {
    type: 'automation.ada_outputs',
    label: 'ADA Outputs',
    category: 'Automation',
    defaultWidth: 60,
    defaultHeight: 80,
    allowedStates: ['NORMAL', 'FAULT'],
    defaultState: 'NORMAL',
    connectionPoints: [{id: 'POWER', x: 0.2, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'RS485', x: 0.8, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'automation.epw_core': {
    type: 'automation.epw_core',
    label: 'EPW CORE',
    category: 'Automation',
    defaultWidth: 100,
    defaultHeight: 80,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'RUNNING',
    connectionPoints: [{id: 'POWER', x: 0.2, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'ETH', x: 0.8, y: 0, domain: 'electrical', direction: 'bidirectional'}]
  },
  'automation.epm': {
    type: 'automation.epm',
    label: 'EPM',
    category: 'Automation',
    defaultWidth: 60,
    defaultHeight: 80,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'RUNNING'
  },
  'automation.psu_24v': {
    type: 'automation.psu_24v',
    label: '24V PSU',
    category: 'Automation',
    defaultWidth: 60,
    defaultHeight: 80,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'ON',
    connectionPoints: [{id: 'AC_IN', x: 0.5, y: 0, domain: 'electrical', direction: 'bidirectional'}, {id: 'DC_OUT', x: 0.5, y: 1, domain: 'electrical', direction: 'bidirectional'}]
  },

  // Measurements
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
  'graphics.rectangle': {
    type: 'graphics.rectangle',
    label: 'Rectangle',
    category: 'Graphics',
    defaultWidth: 100,
    defaultHeight: 100,
    allowedStates: [],
    defaultState: ''
  },
  'graphics.circle': {
    type: 'graphics.circle',
    label: 'Circle',
    category: 'Graphics',
    defaultWidth: 100,
    defaultHeight: 100,
    allowedStates: [],
    defaultState: ''
  },
  'graphics.text': {
    type: 'graphics.text',
    label: 'Text',
    category: 'Graphics',
    defaultWidth: 100,
    defaultHeight: 30,
    allowedStates: [],
    defaultState: ''
  }
};

export const getSymbolDefinition = (type: string): SymbolDefinition | undefined => {
  return SYMBOL_REGISTRY[type];
};

export const getSymbolsByCategory = () => {
  const categories: Record<string, SymbolDefinition[]> = {};
  Object.values(SYMBOL_REGISTRY).forEach(def => {
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push(def);
  });
  return categories;
};
