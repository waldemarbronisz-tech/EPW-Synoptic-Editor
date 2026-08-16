import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const CircuitBreakerSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isTripped = state === 'TRIPPED';
  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* 3D Base Box */}
      <Rect width={w} height={h} fill="#bdc3c7" stroke="#7f8c8d" strokeWidth={1} />
      <Path data={`M 0 0 L ${w} 0 L ${w-4} 4 L 4 4 Z`} fill="#ecf0f1" />
      <Path data={`M 0 0 L 4 4 L 4 ${h-4} L 0 ${h} Z`} fill="#ecf0f1" />
      <Path data={`M ${w} ${h} L 0 ${h} L 4 ${h-4} L ${w-4} ${h-4} Z`} fill="#95a5a6" />
      <Path data={`M ${w} ${h} L ${w-4} ${h-4} L ${w-4} 4 L ${w} 0 Z`} fill="#95a5a6" />

      {/* Terminals */}
      <Rect x={w/2 - 4} y={-4} width={8} height={8} fill="#7f8c8d" stroke="#2c3e50" strokeWidth={1} />
      <Rect x={w/2 - 4} y={h-4} width={8} height={8} fill="#7f8c8d" stroke="#2c3e50" strokeWidth={1} />

      {/* Central mechanism area */}
      <Rect x={w*0.2} y={h*0.2} width={w*0.6} height={h*0.6} fill="#2c3e50" />

      {/* Switch Handle / State Geometry */}
      {isClosed ? (
        // CLOSED (Red handle UP)
        <Group x={w/2} y={h*0.35}>
          <Rect x={-6} y={-8} width={12} height={16} fill="#c0392b" />
          <Rect x={-4} y={-6} width={8} height={4} fill="#e74c3c" />
        </Group>
      ) : isTripped ? (
        // TRIPPED (Yellow handle MID)
        <Group x={w/2} y={h/2}>
          <Rect x={-6} y={-8} width={12} height={16} fill="#f39c12" />
          <Rect x={-4} y={-2} width={8} height={4} fill="#f1c40f" />
        </Group>
      ) : (
        // OPEN (Green handle DOWN)
        <Group x={w/2} y={h*0.65}>
          <Rect x={-6} y={-8} width={12} height={16} fill="#27ae60" />
          <Rect x={-4} y={2} width={8} height={4} fill="#2ecc71" />
        </Group>
      )}

      {/* Fault Overlay - Warning Border */}
      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={3} />
      )}
    </Group>
  );
};
