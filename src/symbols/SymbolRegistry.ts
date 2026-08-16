export interface SymbolDefinition {
  type: string;
  label: string;
  category: string;
  defaultWidth: number;
  defaultHeight: number;
  allowedStates: string[];
  defaultState: string;
}

export const SYMBOL_REGISTRY: Record<string, SymbolDefinition> = {
  // Electrical - Priority A
  'electrical.circuit_breaker': {
    type: 'electrical.circuit_breaker',
    label: 'Circuit Breaker',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'TRIPPED', 'FAULT'],
    defaultState: 'OPEN'
  },
  'electrical.disconnect_switch': {
    type: 'electrical.disconnect_switch',
    label: 'Disconnect Switch',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OPEN', 'CLOSED', 'FAULT'],
    defaultState: 'OPEN'
  },
  'electrical.contactor': {
    type: 'electrical.contactor',
    label: 'Contactor',
    category: 'Electrical',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['OFF', 'ON', 'FAULT'],
    defaultState: 'OFF'
  },
  'electrical.transformer': {
    type: 'electrical.transformer',
    label: 'Transformer',
    category: 'Electrical',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['NORMAL', 'ENERGIZED', 'FAULT'],
    defaultState: 'NORMAL'
  },
  'electrical.busbar': {
    type: 'electrical.busbar',
    label: 'Busbar',
    category: 'Electrical',
    defaultWidth: 200,
    defaultHeight: 10,
    allowedStates: ['DEENERGIZED', 'ENERGIZED', 'FAULT'],
    defaultState: 'DEENERGIZED'
  },
  'electrical.indicator_lamp': {
    type: 'electrical.indicator_lamp',
    label: 'Indicator Lamp',
    category: 'Electrical',
    defaultWidth: 30,
    defaultHeight: 30,
    allowedStates: ['OFF', 'ON', 'BLINK', 'FAULT'],
    defaultState: 'OFF'
  },

  // Water - Priority A
  'water.pipe': {
    type: 'water.pipe',
    label: 'Pipe',
    category: 'Water',
    defaultWidth: 100,
    defaultHeight: 10,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE'
  },
  'water.pipe_elbow': {
    type: 'water.pipe_elbow',
    label: 'Pipe Elbow',
    category: 'Water',
    defaultWidth: 40,
    defaultHeight: 40,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE'
  },
  'water.tee': {
    type: 'water.tee',
    label: 'Tee',
    category: 'Water',
    defaultWidth: 60,
    defaultHeight: 40,
    allowedStates: ['INACTIVE', 'FLOW', 'FAULT'],
    defaultState: 'INACTIVE'
  },
  'water.valve': {
    type: 'water.valve',
    label: 'Valve',
    category: 'Water',
    defaultWidth: 50,
    defaultHeight: 40,
    allowedStates: ['CLOSED', 'OPENING', 'OPEN', 'CLOSING', 'FAULT'],
    defaultState: 'CLOSED'
  },
  'water.pump': {
    type: 'water.pump',
    label: 'Pump',
    category: 'Water',
    defaultWidth: 60,
    defaultHeight: 60,
    allowedStates: ['OFF', 'RUNNING', 'FAULT'],
    defaultState: 'OFF'
  },
  'water.tank': {
    type: 'water.tank',
    label: 'Tank',
    category: 'Water',
    defaultWidth: 80,
    defaultHeight: 120,
    allowedStates: ['NORMAL', 'LOW', 'HIGH', 'FAULT'],
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
