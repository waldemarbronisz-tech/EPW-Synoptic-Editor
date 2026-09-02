// Node-based wiring model: where a symbol's terminals actually are.
// Pure, Konva-free (safe to import from a Vitest test run under Node),
// same convention GridSnap.ts/ObjectDisplay.ts already established for
// logic shared between the canvas and tests.

import type { SynopticObject } from '../store';
import type { Terminal } from '../symbols/SymbolRegistry';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { GRID_SIZE } from '../theme/ScadaTheme';
import { getBoundaryPointWidth, getBoundaryPortFraction } from '../symbols/scada/BoundaryPointSymbol';
import { getLabelFrameSize } from '../symbols/scada/LabelFrameSymbol';

export function snapToGridNode(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/**
 * A symbol's terminals, in LOCAL coordinates (from its own top-left).
 * Most symbols just return their registry's static terminals list. The
 * boundary point is the one exception: its single terminal's side is a
 * per-instance property (boundaryPortSide), and its frame's width/height
 * hug the label/sublabel text - so its terminal is computed here instead
 * of being listed in the registry, the same way the old port model
 * special-cased it in GeometryUtils.resolveConnectionPoint. Its raw
 * fraction position is snapped to the grid: the frame's text-driven size
 * is not itself a multiple of GRID_SIZE, so the terminal must be nudged
 * onto the nearest node explicitly, the same tension every other
 * terminal below resolves by picking a grid-aligned position near
 * (not necessarily exactly at) each visual lead.
 */
export function getObjectTerminals(obj: SynopticObject): Terminal[] {
  if (obj.type === 'scada.boundary_point') {
    const label = obj.designation || obj.name || 'LABEL';
    const sublabel = obj.description || obj.text || '';
    const width = getBoundaryPointWidth(label, sublabel);
    const { height } = getLabelFrameSize(label, sublabel);
    const side = obj.boundaryPortSide === 'BOTTOM' || obj.boundaryPortSide === 'LEFT' || obj.boundaryPortSide === 'RIGHT'
      ? obj.boundaryPortSide
      : 'TOP';
    const { x: fx, y: fy } = getBoundaryPortFraction(side);
    const medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION' =
      obj.boundaryMedium === 'WATER' ? 'WATER' :
      obj.boundaryMedium === 'VENTILATION' ? 'VENTILATION' : 'ELECTRICAL';
    return [{ id: 'T1', x: snapToGridNode(fx * width), y: snapToGridNode(fy * height), medium }];
  }

  return getSymbolDefinition(obj.type)?.terminals || [];
}

/**
 * A terminal's world (canvas) position - obj.x/y plus the terminal's
 * local offset, scaled and rotated exactly the way ObjectNode's own
 * Konva Group is (rotation pivots at the Group's local origin, i.e. the
 * object's own top-left - not its center).
 */
export function getTerminalWorldPosition(obj: SynopticObject, terminal: { x: number; y: number }): { x: number; y: number } {
  const rot = obj.rotation || 0;
  const lx = terminal.x * (obj.scaleX || 1);
  const ly = terminal.y * (obj.scaleY || 1);

  if (rot === 0) {
    return { x: obj.x + lx, y: obj.y + ly };
  }

  const radians = rot * (Math.PI / 180);
  const rx = lx * Math.cos(radians) - ly * Math.sin(radians);
  const ry = lx * Math.sin(radians) + ly * Math.cos(radians);
  return { x: obj.x + rx, y: obj.y + ry };
}

export interface WorldTerminal {
  objId: string;
  terminalId: string;
  x: number;
  y: number;
  medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION';
}

/** Every terminal of every object, already in world coordinates. */
export function getAllWorldTerminals(objects: SynopticObject[]): WorldTerminal[] {
  const out: WorldTerminal[] = [];
  objects.forEach(obj => {
    getObjectTerminals(obj).forEach(t => {
      const pos = getTerminalWorldPosition(obj, t);
      out.push({ objId: obj.id, terminalId: t.id, x: pos.x, y: pos.y, medium: t.medium });
    });
  });
  return out;
}
