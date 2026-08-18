import React from 'react';
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
const calculateOrthogonalPath = (x1: number, y1: number, x2: number, y2: number) => {
  const midY = y1 + (y2 - y1) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
};

export const ConnectionLine: React.FC<ConnectionProps> = ({ conn, fromObj, toObj, isSelected, onSelect }) => {
  if (!fromObj || !toObj) return null;

  const fromDef = getSymbolDefinition(fromObj.type);
  const toDef = getSymbolDefinition(toObj.type);

  const fromPort = fromDef?.connectionPoints?.find(p => p.id === conn.fromPort);
  const toPort = toDef?.connectionPoints?.find(p => p.id === conn.toPort);

  if (!fromPort || !toPort) return null;

  const { x: x1, y: y1 } = getAbsolutePortCoords(fromObj, fromPort.x, fromPort.y);
  const { x: x2, y: y2 } = getAbsolutePortCoords(toObj, toPort.x, toPort.y);

  const path = calculateOrthogonalPath(x1, y1, x2, y2);

  // Styling based on type and state
  let strokeColor = '#2c3e50';
  let strokeWidth = 2;
  let dash: number[] | undefined = undefined;

  if (conn.type === 'electrical_ac') strokeColor = '#e74c3c';
  if (conn.type === 'water') strokeColor = '#3498db';
  if (conn.type === 'hvac_air') strokeColor = '#bdc3c7';

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
