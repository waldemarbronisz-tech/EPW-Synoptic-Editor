export interface ConnectionPoint {
  id: string;
  x: number; // percentage (0 to 1) relative to width
  y: number; // percentage (0 to 1) relative to height
  domain?: 'electrical' | 'water' | 'hvac' | 'data' | 'control';
  medium?: string;
  direction?: 'in' | 'out' | 'bidirectional' | 'passive';
  multiplicity?: 'single' | 'multiple';
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
  designationPrefix?: string;
  supportsDynamicPorts?: boolean;
}

import { electricalSymbols } from './registry/electrical';
import { waterSymbols } from './registry/water';
import { hvacSymbols } from './registry/hvac';
import { automationSymbols } from './registry/automation';
import { instrumentationSymbols } from './registry/instrumentation';
import { measurementsSymbols } from './registry/measurements';
import { graphicsSymbols } from './registry/graphics';

export const SYMBOL_REGISTRY: Record<string, SymbolDefinition> = {
  ...electricalSymbols,
  ...waterSymbols,
  ...hvacSymbols,
  ...automationSymbols,
  ...instrumentationSymbols,
  ...measurementsSymbols,
  ...graphicsSymbols
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
