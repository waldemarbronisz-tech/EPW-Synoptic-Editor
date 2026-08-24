import React from 'react';
import { getMediaDefinition } from '../symbols/registry/MediaRegistry';

import { Group, Path, Circle } from 'react-konva';
import type { SynopticConnection, SynopticObject } from '../store';
import { getSymbolDefinition } from '../symbols/SymbolRegistry';

export interface ConnectionProps {
  conn: SynopticConnection;
  fromObj?: SynopticObject;
  toObj?: SynopticObject;
  isSelected: boolean;
  onSelect: () => void;
}

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

// Simple orthogonal router
const calculateOrthogonalPath = (x1: number, y1: number, x2: number, y2: number, fromPort: any, toPort: any) => {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  // Straight line
  if (dx < 5) return `M ${x1} ${y1} L ${x1} ${y2}`;
  if (dy < 5) return `M ${x1} ${y1} L ${x2} ${y1}`;

  // Calculate normal vector based on port local percentage coordinates
  // Assuming a standard unrotated port at top (x=0.5, y=0) has normal (0, -1)
  // We approximate the normal vector by how close it is to the edges.
  // But wait, it's easier to just use the port's x/y ratio directly if it's strictly on an edge.
  const fromDirY = fromPort.y === 0 ? -1 : (fromPort.y === 1 ? 1 : 0);
  const fromDirX = fromPort.x === 0 ? -1 : (fromPort.x === 1 ? 1 : 0);
  const toDirY = toPort.y === 0 ? -1 : (toPort.y === 1 ? 1 : 0);
  const toDirX = toPort.x === 0 ? -1 : (toPort.x === 1 ? 1 : 0);

  // If both ports are vertically oriented (top/bottom)
  if (fromDirY !== 0 || toDirY !== 0) {
     const midY = y1 + (y2 - y1) / 2;
     return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }

  // If both ports are horizontally oriented (left/right)
  if (fromDirX !== 0 || toDirX !== 0) {
     const midX = x1 + (x2 - x1) / 2;
     return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }

  // Fallback to aspect ratio
  if (dy > dx) {
    const midY = y1 + (y2 - y1) / 2;
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  } else {
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
};

export const ConnectionLine: React.FC<ConnectionProps> = ({ conn, fromObj, toObj, isSelected, onSelect }) => {
  if (!fromObj || !toObj) return null;

  const fromDef = getSymbolDefinition(fromObj.type);
  const toDef = getSymbolDefinition(toObj.type);

  let fromPort = fromDef?.connectionPoints?.find(p => p.id === conn.fromPort);
  if (!fromPort && conn.fromPort.startsWith('dyn_')) {
     const pos = parseInt(conn.fromPort.replace('dyn_', ''), 10) / 100;
     const w = fromDef?.defaultWidth || 80;
     const h = fromDef?.defaultHeight || 80;
     if (w >= h) {
        fromPort = { id: conn.fromPort, x: pos, y: 0.5 };
     } else {
        fromPort = { id: conn.fromPort, x: 0.5, y: pos };
     }
  }
  const toPort = toDef?.connectionPoints?.find(p => p.id === conn.toPort);

  if (!fromPort || !toPort) return null;

  const { x: x1, y: y1 } = getAbsolutePortCoords(fromObj, fromPort.x, fromPort.y);
  let x2, y2;
  if (conn.toPort === 'cursor') {
    x2 = toObj.x;
    y2 = toObj.y;
  } else {
    const coords = getAbsolutePortCoords(toObj, toPort.x, toPort.y);
    x2 = coords.x;
    y2 = coords.y;
  }

  let path = '';
  if (conn.waypoints && conn.waypoints.length > 0) {
     path = `M ${x1} ${y1}`;
     conn.waypoints.forEach(wp => {
        path += ` L ${wp.x} ${wp.y}`;
     });
     path += ` L ${x2} ${y2}`;
  } else {
     path = calculateOrthogonalPath(x1, y1, x2, y2, fromPort, toPort);
  }

  // Styling based on type and state
  const media = getMediaDefinition(conn.type);
  let strokeColor = media?.visualStyle.strokeColor || '#2c3e50';
  let strokeWidth = media?.visualStyle.strokeWidth || 2;
  let dash = media?.visualStyle.dash;


  if (conn.editor?.preview_state === 'ENERGIZED' || conn.editor?.preview_state === 'FLOW') {
    strokeWidth = 4;
  }

  if (conn.editor?.preview_state === 'FAULT') {
    strokeColor = '#f1c40f';
    dash = [5, 5];
  }

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Invisible hit area for easier selection */}
      <Path data={path} stroke="transparent" strokeWidth={15} />

      <Path
        data={path}
        stroke={isSelected ? '#3498db' : strokeColor}
        strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
        dash={dash}
      />

      {/* Port dots */}
      <Circle x={x1} y={y1} radius={3} fill={strokeColor} />
      <Circle x={x2} y={y2} radius={3} fill={strokeColor} />
    </Group>
  );
};
