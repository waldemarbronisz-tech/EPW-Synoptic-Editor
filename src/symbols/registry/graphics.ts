import type { SymbolDefinition } from '../SymbolRegistry';

export const graphicsSymbols: Record<string, SymbolDefinition> = {
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
