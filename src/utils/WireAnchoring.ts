// feat/water-management commit 1: a wire endpoint that landed exactly
// on a symbol's terminal at creation time follows that symbol through
// a move/rotate, instead of being left behind (the pre-existing
// defect this commit fixes - see this commit's own raport.md section
// for the full before/after). Pure, Konva-free (safe under Vitest),
// same convention every other utils/*.ts file already follows.
//
// Deliberately NOT a change to the node-based wiring model or
// NetResolver.ts (GRANICE): a net is still resolved purely from shared
// coordinates. This file only keeps an anchored point's coordinates
// EQUAL to its terminal's current world position - NetResolver never
// needs to know an anchor exists at all.

import type { SynopticConnection, SynopticObject, WirePoint, WirePointAnchor } from '../store';
import { getObjectTerminals, getTerminalWorldPosition } from './Terminals';
import { reorthogonalizeAfterMove } from './WireDrawing';

/**
 * If (x, y) lands exactly on one of `objects`' own terminals, returns
 * which symbol/terminal - what a newly drawn wire's own endpoint is
 * checked against, once, at the moment it is created (Canvas.tsx's own
 * finishDrawing). Only ever called at creation time; nothing re-checks
 * this later - an anchor, once attached, is only ever cleared (by
 * deletion or a manual point drag), never re-attached automatically.
 */
export function findTerminalAt(objects: SynopticObject[], x: number, y: number): WirePointAnchor | null {
  for (const obj of objects) {
    const terminals = getObjectTerminals(obj);
    for (const terminal of terminals) {
      const pos = getTerminalWorldPosition(obj, terminal);
      if (pos.x === x && pos.y === y) {
        return { symbolId: obj.id, terminalId: terminal.id };
      }
    }
  }
  return null;
}

/**
 * Attaches an anchor (findTerminalAt) to every point of a freshly drawn
 * polyline that lands exactly on a terminal - called once, right
 * before the new connection is added to the store.
 */
export function attachAnchorsToNewPoints(points: WirePoint[], objects: SynopticObject[]): WirePoint[] {
  return points.map(p => {
    const anchor = findTerminalAt(objects, p.x, p.y);
    return anchor ? { ...p, anchor } : p;
  });
}

/**
 * Re-derives every anchored point's position from its own terminal's
 * CURRENT world position (after whatever move/rotate/resize just
 * happened to the symbol it is anchored to), re-orthogonalizing the
 * segment(s) touching it exactly the way dragging a free point by hand
 * already does (WireDrawing.reorthogonalizeAfterMove) - a symbol move
 * is, from the wire's own point of view, indistinguishable from someone
 * having dragged that one endpoint there directly.
 *
 * A dangling anchor (the object it names no longer exists - between
 * the object actually being removed and this connection's own anchor
 * being released, which elementsSlice.ts's deleteObjects does
 * explicitly and unconditionally in the same tick) or one naming a
 * terminal id the object no longer has (a symbol type changed under
 * it, in principle) is left untouched here - releasing it is
 * deleteObjects's own job, not this function's; this function only
 * ever MOVES an anchor that still resolves, never clears one.
 *
 * Called from historySlice.ts's own saveHistory(), the one place every
 * move/rotate/resize/align/distribute action in this codebase already
 * converges on right after mutating `objects` - see that file's own
 * comment for why this is the single robust hook point rather than
 * scattering a call across every individual action.
 */
export function syncAnchoredConnections(connections: SynopticConnection[], objects: SynopticObject[]): SynopticConnection[] {
  let anyConnectionChanged = false;

  const result = connections.map(conn => {
    if (!conn.points.some(p => p.anchor)) return conn;

    let points = conn.points;
    let changed = false;

    // Re-scanning from index 0 after every insertion (rather than a
    // single forEach pass) because reorthogonalizeAfterMove can insert
    // a new elbow point, shifting every later index out from under a
    // stale loop counter - matters when a connection has more than one
    // anchored point (e.g. a short jumper between two adjacent
    // terminals). Bounded by points.length so a pathological case can
    // never loop forever.
    let guard = points.length + 8;
    let i = 0;
    while (i < points.length && guard-- > 0) {
      const anchor = points[i].anchor;
      if (!anchor) { i++; continue; }

      const obj = objects.find(o => o.id === anchor.symbolId);
      if (!obj) { i++; continue; }
      const terminal = getObjectTerminals(obj).find(t => t.id === anchor.terminalId);
      if (!terminal) { i++; continue; }

      const worldPos = getTerminalWorldPosition(obj, terminal);
      if (worldPos.x === points[i].x && worldPos.y === points[i].y) { i++; continue; }

      points = reorthogonalizeAfterMove(points, i, { x: worldPos.x, y: worldPos.y, anchor });
      changed = true;
      // Do not advance i - re-check the same (now-updated) position in
      // case anything still disagrees, and to pick up correctly should
      // an elbow have been inserted before it.
    }

    if (!changed) return conn;
    anyConnectionChanged = true;
    return { ...conn, points };
  });

  return anyConnectionChanged ? result : connections;
}

/**
 * Deleting a symbol releases every anchor pointing at it - the point
 * stays exactly where it was (a free end now), per this commit's own
 * explicit requirement ("punkt zostaje tam, gdzie byl"). Returns the
 * updated connections plus how many anchors were actually released, so
 * the caller (elementsSlice.ts's deleteObjects) can post exactly one
 * Messages notice only when something real was released.
 */
export function releaseAnchorsForDeletedObjects(
  connections: SynopticConnection[],
  deletedObjectIds: string[]
): { connections: SynopticConnection[]; releasedCount: number } {
  if (deletedObjectIds.length === 0) return { connections, releasedCount: 0 };

  let releasedCount = 0;
  const result = connections.map(conn => {
    let changed = false;
    const points = conn.points.map(p => {
      if (p.anchor && deletedObjectIds.includes(p.anchor.symbolId)) {
        changed = true;
        releasedCount++;
        const { anchor: _anchor, ...rest } = p;
        return rest;
      }
      return p;
    });
    return changed ? { ...conn, points } : conn;
  });

  return { connections: result, releasedCount };
}
