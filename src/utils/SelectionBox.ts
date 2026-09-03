// feat/editing-and-signal-panel commit 3: rubber-band selection
// containment checks. Pure, Konva-free (same convention as GridSnap.ts/
// Terminals.ts/WireDrawing.ts) - an element is selected only if it lies
// ENTIRELY within the box, never on a partial overlap: an element
// poking out past the box's edge is left unselected, on purpose.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isObjectFullyInBox(obj: { x: number; y: number; width: number; height: number; scaleX?: number; scaleY?: number }, box: Box): boolean {
  const w = obj.width * (obj.scaleX || 1);
  const h = obj.height * (obj.scaleY || 1);
  return obj.x >= box.x && obj.y >= box.y && obj.x + w <= box.x + box.width && obj.y + h <= box.y + box.height;
}

/** height is the meter's own COMPUTED height (MeterElement.ts's computeMeterHeight) - a meter carries no height field of its own to read here. */
export function isMeterFullyInBox(meter: { x: number; y: number; width: number }, height: number, box: Box): boolean {
  return meter.x >= box.x && meter.y >= box.y && meter.x + meter.width <= box.x + box.width && meter.y + height <= box.y + box.height;
}

export function isConnectionFullyInBox(conn: { points: { x: number; y: number }[] }, box: Box): boolean {
  if (conn.points.length === 0) return false;
  return conn.points.every(p => p.x >= box.x && p.y >= box.y && p.x <= box.x + box.width && p.y <= box.y + box.height);
}
