// Node-based wiring: what replaces port-based connection validation.
// Pure functions only, no store dependency (per the task's own spec) -
// takes plain connections/items arrays, returns plain data.
//
// The core idea: two wires - or a wire and a symbol terminal - belong to
// the same net simply because they touch at a grid point, geometrically.
// A wire ending exactly ON another wire's segment (not just at one of
// its two endpoints) still touches it - that is what makes a busbar
// work: every wire tapping its length, not just its two ends, joins the
// same net.

import type { SynopticConnection, SynopticObject, WirePoint } from '../store';
import { getAllWorldTerminals, type WorldTerminal } from '../utils/Terminals';

export interface Net {
  id: string;
  connectionIds: string[];
  terminals: { objId: string; terminalId: string }[];
  medium: 'ELECTRICAL' | 'WATER' | 'VENTILATION' | null;
  state: 'LIVE' | 'DEAD' | null;
}

export interface NetIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  netId: string;
}

// ---- Geometry -------------------------------------------------------

/** True when (px,py) lies on the axis-aligned segment a-b, endpoints included. */
function pointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): boolean {
  if (ax === bx) {
    if (px !== ax) return false;
    return py >= Math.min(ay, by) && py <= Math.max(ay, by);
  }
  if (ay === by) {
    if (py !== ay) return false;
    return px >= Math.min(ax, bx) && px <= Math.max(ax, bx);
  }
  // Not axis-aligned - should not occur given validation (A3: segments
  // are horizontal or vertical only), but never claim a touch on a
  // segment this module cannot make sense of.
  return false;
}

function segmentsOf(points: WirePoint[]): [WirePoint, WirePoint][] {
  const segs: [WirePoint, WirePoint][] = [];
  for (let i = 0; i < points.length - 1; i++) segs.push([points[i], points[i + 1]]);
  return segs;
}

function pointTouchesConnection(px: number, py: number, conn: SynopticConnection): boolean {
  return segmentsOf(conn.points).some(([a, b]) => pointOnSegment(px, py, a.x, a.y, b.x, b.y));
}

/** Two connections touch if any point (vertex) of one lies on any segment of the other. */
function connectionsTouch(a: SynopticConnection, b: SynopticConnection): boolean {
  return a.points.some(p => pointTouchesConnection(p.x, p.y, b)) ||
         b.points.some(p => pointTouchesConnection(p.x, p.y, a));
}

// ---- Union-Find -------------------------------------------------------

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

// ---- resolveNets --------------------------------------------------------

/**
 * Groups connections and object terminals into nets, purely from
 * geometry - no id references anywhere. An empty connections list
 * always produces an empty nets list, even if items have terminals: a
 * terminal nothing is wired to is not a net.
 */
export function resolveNets(connections: SynopticConnection[], items: SynopticObject[]): Net[] {
  if (connections.length === 0) return [];

  const worldTerminals = getAllWorldTerminals(items);
  const n = connections.length;
  const m = worldTerminals.length;
  const uf = new UnionFind(n + m);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (connectionsTouch(connections[i], connections[j])) uf.union(i, j);
    }
  }

  for (let ti = 0; ti < m; ti++) {
    for (let ci = 0; ci < n; ci++) {
      if (pointTouchesConnection(worldTerminals[ti].x, worldTerminals[ti].y, connections[ci])) {
        uf.union(n + ti, ci);
      }
    }
  }

  // Two terminals sitting on the exact same node (no wire needed between them).
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      if (worldTerminals[a].x === worldTerminals[b].x && worldTerminals[a].y === worldTerminals[b].y) {
        uf.union(n + a, n + b);
      }
    }
  }

  const groups = new Map<number, { connIdx: number[]; termIdx: number[] }>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!groups.has(r)) groups.set(r, { connIdx: [], termIdx: [] });
    groups.get(r)!.connIdx.push(i);
  }
  for (let ti = 0; ti < m; ti++) {
    const r = uf.find(n + ti);
    // A group with no connection in it is a terminal (or several
    // coincident ones) touched by no wire at all - not a net.
    if (!groups.has(r)) continue;
    groups.get(r)!.termIdx.push(ti);
  }

  let counter = 0;
  const nets: Net[] = [];
  groups.forEach(g => {
    if (g.connIdx.length === 0) return;
    const netConnections = g.connIdx.map(i => connections[i]);
    nets.push({
      id: `net-${counter++}`,
      connectionIds: netConnections.map(c => c.id),
      terminals: g.termIdx.map(ti => ({ objId: worldTerminals[ti].objId, terminalId: worldTerminals[ti].terminalId })),
      medium: netConnections[0]?.medium ?? null,
      state: netConnections[0]?.state ?? null
    });
  });
  return nets;
}

// ---- validateNets -------------------------------------------------------

/**
 * Net-level validation - what replaces the old per-connection domain/
 * medium/direction checks now that a connection is not a port pair.
 */
export function validateNets(nets: Net[], items: SynopticObject[]): NetIssue[] {
  const issues: NetIssue[] = [];
  const worldTerminals = getAllWorldTerminals(items);
  const terminalMedium = new Map<string, 'ELECTRICAL' | 'WATER' | 'VENTILATION'>();
  worldTerminals.forEach(t => terminalMedium.set(`${t.objId}:${t.terminalId}`, t.medium));
  const objById = new Map(items.map(o => [o.id, o]));

  nets.forEach(net => {
    // Three media now (ELECTRICAL, WATER, VENTILATION) - the check
    // itself is unchanged, a Set naturally flags any 2+ of them mixed
    // in one net: power tied to water, power tied to a duct, or water
    // tied to a duct are all the same MIXED_MEDIUM error.
    const media = new Set(net.terminals.map(t => terminalMedium.get(`${t.objId}:${t.terminalId}`)).filter(Boolean));
    if (media.size > 1) {
      issues.push({
        severity: 'ERROR',
        code: 'MIXED_MEDIUM',
        netId: net.id,
        message: `Net touches terminals of different media (${[...media].join(', ')}) - a terminal from one medium plugged into another medium's net`
      });
    }

    if (net.connectionIds.length > 0 && net.terminals.length === 0) {
      issues.push({
        severity: 'WARNING',
        code: 'DANGLING_NET',
        netId: net.id,
        message: 'Wire touches no terminal at all - it goes nowhere'
      });
    }

    const sourceCount = net.terminals.filter(t => {
      const obj = objById.get(t.objId);
      return obj?.type === 'scada.boundary_point' && obj.boundaryDirection === 'SOURCE';
    }).length;
    if (sourceCount >= 2) {
      issues.push({
        severity: 'WARNING',
        code: 'MULTIPLE_SOURCES',
        netId: net.id,
        message: `Net touches ${sourceCount} SOURCE boundary points - two feeds tied together`
      });
    }
  });

  return issues;
}

// ---- Junction dots -------------------------------------------------------

/**
 * How many independent directions a wire could leave this exact point
 * in, along this one segment: 1 if the point is one of the segment's
 * own two endpoints (a dead end, or a shared vertex with a neighboring
 * segment of the same wire), 2 if the point is strictly inside it (the
 * segment is conceptually split in two by the touch - this is what
 * makes a busbar's own single long segment contribute 2 "branches" at
 * every point something taps into its middle, not 0).
 */
function segmentBranches(px: number, py: number, a: WirePoint, b: WirePoint): 0 | 1 | 2 {
  if (!pointOnSegment(px, py, a.x, a.y, b.x, b.y)) return 0;
  const isEndpoint = (px === a.x && py === a.y) || (px === b.x && py === b.y);
  return isEndpoint ? 1 : 2;
}

/**
 * Every grid node where 3 or more branches meet - three or more wire
 * segments, or two segments and a terminal. A plain bend (two segments
 * of the SAME wire sharing an endpoint, 1+1=2) does not qualify - it is
 * just a corner, not a junction.
 */
export function getJunctionPoints(connections: SynopticConnection[], items: SynopticObject[]): WirePoint[] {
  const candidates = new Map<string, WirePoint>();
  connections.forEach(c => c.points.forEach(p => candidates.set(`${p.x},${p.y}`, p)));
  const worldTerminals: WorldTerminal[] = getAllWorldTerminals(items);
  worldTerminals.forEach(t => candidates.set(`${t.x},${t.y}`, { x: t.x, y: t.y }));

  const junctions: WirePoint[] = [];
  candidates.forEach(point => {
    let degree = 0;
    connections.forEach(c => {
      segmentsOf(c.points).forEach(([a, b]) => {
        degree += segmentBranches(point.x, point.y, a, b);
      });
    });
    worldTerminals.forEach(t => {
      if (t.x === point.x && t.y === point.y) degree += 1;
    });
    if (degree >= 3) junctions.push(point);
  });
  return junctions;
}
