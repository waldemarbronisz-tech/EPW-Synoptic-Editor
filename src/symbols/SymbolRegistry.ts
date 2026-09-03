// Legacy port model - kept only so old code (ConnectionService.ts,
// GeometryUtils.ts, the pre-node-based-wiring symbol registries that
// still declare it) keeps compiling. No longer read by the live canvas
// wiring path: Terminal/terminals below replaced it for that purpose.
export interface ConnectionPoint {
  id: string;
  x: number; // percentage (0 to 1) relative to width
  y: number; // percentage (0 to 1) relative to height
  domain?: 'electrical' | 'water' | 'hvac' | 'data' | 'control';
  medium?: string;
  direction?: 'in' | 'out' | 'bidirectional' | 'passive';
  multiplicity?: 'single' | 'multiple';
}

// Node-based wiring model: a symbol has terminals, not ports. Each
// terminal sits at a fixed LOCAL point (from the symbol's own top-left,
// same origin obj.x/obj.y always means), which MUST be a multiple of
// GRID_SIZE - a wire ending exactly on that world point is connected,
// no id-matching involved (see NetResolver.ts). Resolved shape - what
// getObjectTerminals (utils/Terminals.ts) hands back, x/y already
// computed. A symbol's own registry entry never declares one of these
// directly - see TerminalSpec below.
export interface Terminal {
  id: string;
  x: number; // local px from top-left, multiple of GRID_SIZE
  y: number; // local px from top-left, multiple of GRID_SIZE
  medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION';
}

// feat/editing-and-signal-panel commit 1: a terminal lies ALWAYS on the
// middle of a symbol's edge - so a symbol's own registry entry only
// ever needs to say WHICH edge, never a raw x/y. utils/Terminals.ts's
// getObjectTerminals turns a TerminalSpec into a real Terminal (x/y
// resolved from the object's own current width/height) at read time.
export type TerminalSide = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

export interface TerminalSpec {
  id: string;
  side: TerminalSide;
  medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION';
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
  terminals?: TerminalSpec[];
  isLine?: boolean;
  designationPrefix?: string;
  supportsDynamicPorts?: boolean;
  // Object Library trim: symbol stays fully defined and placeable by an
  // already-saved project (old objects of this type still render,
  // still keep their terminals), it just does not appear as a draggable
  // entry in the Toolbox any more. Flip back to expose it again - one
  // line, no file touched.
  hiddenFromLibrary?: boolean;
}

import { electricalSymbols } from './registry/electrical';
import { waterSymbols } from './registry/water';
import { hvacSymbols } from './registry/hvac';
import { automationSymbols } from './registry/automation';
import { instrumentationSymbols } from './registry/instrumentation';
import { measurementsSymbols } from './registry/measurements';
import { graphicsSymbols } from './registry/graphics';
import { scadaSymbols } from './registry/scada';

export const SYMBOL_REGISTRY: Record<string, SymbolDefinition> = {
  ...electricalSymbols,
  ...waterSymbols,
  ...hvacSymbols,
  ...automationSymbols,
  ...instrumentationSymbols,
  ...measurementsSymbols,
  ...graphicsSymbols,
  ...scadaSymbols
};

export const getSymbolDefinition = (type: string): SymbolDefinition | undefined => {
  return SYMBOL_REGISTRY[type];
};

// Only what the Object Library should show - getSymbolDefinition above
// stays unfiltered, since an already-placed object of a hidden type
// still needs its full definition (label, terminals, rendering) to work.
export const getSymbolsByCategory = () => {
  const categories: Record<string, SymbolDefinition[]> = {};
  Object.values(SYMBOL_REGISTRY).forEach(def => {
    if (def.hiddenFromLibrary) return;
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push(def);
  });
  return categories;
};
