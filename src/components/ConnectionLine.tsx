import React from 'react';

import { Group, Path, Circle } from 'react-konva';
import type { SynopticConnection, SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';
import { COLOR_DE_ENERGIZED, COLOR_ENERGIZED, CONDUCTOR_OUTLINE, CONDUCTOR_WIDTH, COLOR_OUTLINE, COLOR_WHITE } from '../theme/ScadaTheme';

export interface ConnectionProps {
  conn: SynopticConnection;
  fromObj?: SynopticObject;
  toObj?: SynopticObject;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Resolves a dynamic busbar port id to a local {x, y} fraction. Mirrors
 * GeometryUtils.resolveConnectionPoint's own dyn_ handling (kept as a
 * separate, render-local copy rather than importing that function, to
 * avoid touching this component's existing port-lookup shape) - supports
 * both the legacy center-row 'dyn_NN' format and the edge-row
 * 'dyn_top_NN' / 'dyn_bot_NN' format the SCADA busbar produces.
 */
const resolveDynamicPort = (obj: SynopticObject, def: ReturnType<typeof getSymbolDefinition>, portId: string): { id: string; x: number; y: number } | null => {
  if (!def?.supportsDynamicPorts) return null;

  const edgeMatch = portId.match(/^dyn_(top|bot)_(\d+)$/);
  const centerMatch = portId.match(/^dyn_(\d+)$/);

  let posPercent: number;
  let yFraction: number | null = null;

  if (edgeMatch) {
    posPercent = parseInt(edgeMatch[2], 10);
    yFraction = edgeMatch[1] === 'top' ? 0 : 1;
  } else if (centerMatch) {
    posPercent = parseInt(centerMatch[1], 10);
  } else {
    return null;
  }

  if (isNaN(posPercent) || posPercent < 0 || posPercent > 100) return null;
  const pos = posPercent / 100;

  const w = obj.width || def.defaultWidth || 80;
  const h = obj.height || def.defaultHeight || 80;

  if (yFraction !== null) return { id: portId, x: pos, y: yFraction };
  return w >= h ? { id: portId, x: pos, y: 0.5 } : { id: portId, x: 0.5, y: pos };
};

const getAbsolutePortCoords = (obj: SynopticObject, portX: number, portY: number) => {
  const rot = obj.rotation || 0;
  const w = obj.width * (obj.scaleX || 1);
  const h = obj.height * (obj.scaleY || 1);

  const cx = portX * w;
  const cy = portY * h;
  const radians = rot * (Math.PI / 180);

  const rx = cx * Math.cos(radians) - cy * Math.sin(radians);
  const ry = cx * Math.sin(radians) + cy * Math.cos(radians);

  return {
    x: obj.x + rx,
    y: obj.y + ry
  };
};

/**
 * Orthogonal-only router (a wire only ever bends at a right angle): the
 * elbow itself is snapped to the nearest grid node so bends land cleanly
 * even when a port's own pixel position falls off-grid (e.g. a 150x150
 * symbol's center port against GRID_SIZE 16, which does not divide it -
 * a pre-existing tension between the symbol canvas size fixed by the
 * prior task and this one's grid; snapping the bend is what stays
 * achievable without redrawing the symbols).
 */
const calculateOrthogonalPath = (x1: number, y1: number, x2: number, y2: number, fromPort: any, toPort: any, gridSize: number) => {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  // Straight line
  if (dx < 5) return `M ${x1} ${y1} L ${x1} ${y2}`;
  if (dy < 5) return `M ${x1} ${y1} L ${x2} ${y1}`;

  const fromDirY = fromPort.y === 0 ? -1 : (fromPort.y === 1 ? 1 : 0);
  const fromDirX = fromPort.x === 0 ? -1 : (fromPort.x === 1 ? 1 : 0);
  const toDirY = toPort.y === 0 ? -1 : (toPort.y === 1 ? 1 : 0);
  const toDirX = toPort.x === 0 ? -1 : (toPort.x === 1 ? 1 : 0);

  if (fromDirY !== 0 || toDirY !== 0) {
     const midY = snap(y1 + (y2 - y1) / 2);
     return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }

  if (fromDirX !== 0 || toDirX !== 0) {
     const midX = snap(x1 + (x2 - x1) / 2);
     return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  if (dy > dx) {
    const midY = snap(y1 + (y2 - y1) / 2);
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  } else {
    const midX = snap(x1 + (x2 - x1) / 2);
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
};

export const ConnectionLine: React.FC<ConnectionProps> = ({ conn, fromObj, toObj, isSelected, onSelect }) => {
  if (!fromObj || !toObj) return null;

  const fromDef = getSymbolDefinition(fromObj.type);
  const toDef = getSymbolDefinition(toObj.type);

  let fromPort = fromDef?.connectionPoints?.find(p => p.id === conn.fromPort);
  if (!fromPort && conn.fromPort.startsWith('dyn_')) {
    fromPort = resolveDynamicPort(fromObj, fromDef, conn.fromPort) || undefined;
  }
  let toPort = toDef?.connectionPoints?.find(p => p.id === conn.toPort);
  if (!toPort && conn.toPort !== 'cursor' && conn.toPort.startsWith('dyn_')) {
    toPort = resolveDynamicPort(toObj, toDef, conn.toPort) || undefined;
  }

  if (!fromPort || (!toPort && conn.toPort !== 'cursor')) return null;

  const { x: x1, y: y1 } = getAbsolutePortCoords(fromObj, fromPort.x, fromPort.y);
  let x2, y2;
  if (conn.toPort === 'cursor' || !toPort) {
    x2 = toObj.x;
    y2 = toObj.y;
  } else {
    const coords = getAbsolutePortCoords(toObj, toPort.x, toPort.y);
    x2 = coords.x;
    y2 = coords.y;
  }

  const isPreview = conn.type === 'preview';

  let path = '';
  if (conn.waypoints && conn.waypoints.length > 0) {
     path = `M ${x1} ${y1}`;
     conn.waypoints.forEach(wp => {
        path += ` L ${wp.x} ${wp.y}`;
     });
     path += ` L ${x2} ${y2}`;
  } else {
     // toPort is unresolved for the in-progress cursor preview (there is
     // no real port at the mouse yet) - fromPort's own facing direction
     // stands in so the router never receives undefined.
     path = calculateOrthogonalPath(x1, y1, x2, y2, fromPort, toPort || fromPort, 16);
  }

  // Color carries the connection's state and nothing else: energized or
  // de-energized, set in the connection's own Properties (defaulting to
  // energized when unset - "DEENERGIZED" is the only state that reads as
  // de-energized; any other value, including the legacy FLOW/FAULT
  // options still offered in Properties, reads as energized).
  const isDeEnergized = conn.editor?.preview_state === 'DEENERGIZED';
  const coreColor = isDeEnergized ? COLOR_DE_ENERGIZED : COLOR_ENERGIZED;
  const outlineWidth = CONDUCTOR_WIDTH + CONDUCTOR_OUTLINE;

  if (isPreview) {
    // In-progress wire: its real state is not yet known (resolved only on
    // drop), so it is drawn thinner, in a neutral gray, single-pass - not
    // in either state's color.
    return (
      <Group onClick={onSelect} onTap={onSelect}>
        <Path data={path} stroke={COLOR_DE_ENERGIZED} strokeWidth={CONDUCTOR_WIDTH / 2} lineCap="butt" lineJoin="miter" />
      </Group>
    );
  }

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Invisible hit area for easier selection */}
      <Path data={path} stroke="transparent" strokeWidth={outlineWidth + 10} />

      {/* Two-pass conductor: outline pass, then the state color on top.
          Selection reads as a white outline (a halo) instead of the usual
          black one - a geometric/palette-only cue, not an invented color. */}
      <Path data={path} stroke={isSelected ? COLOR_WHITE : COLOR_OUTLINE} strokeWidth={outlineWidth} lineCap="butt" lineJoin="miter" />
      <Path data={path} stroke={coreColor} strokeWidth={CONDUCTOR_WIDTH} lineCap="butt" lineJoin="miter" />

      {/* Port dots */}
      <Circle x={x1} y={y1} radius={CONDUCTOR_WIDTH / 2} fill={COLOR_OUTLINE} />
      <Circle x={x2} y={y2} radius={CONDUCTOR_WIDTH / 2} fill={COLOR_OUTLINE} />
    </Group>
  );
};
