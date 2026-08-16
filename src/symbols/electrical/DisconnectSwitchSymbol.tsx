import React from 'react';
import { Group, Rect, Path, Line, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DisconnectSwitchSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* 3D Base Box */}
      <Rect width={w} height={h} fill="#ecf0f1" stroke="#95a5a6" strokeWidth={1} />
      <Path data={`M 0 0 L ${w} 0 L ${w-4} 4 L 4 4 Z`} fill="#ffffff" />
      <Path data={`M 0 0 L 4 4 L 4 ${h-4} L 0 ${h} Z`} fill="#ffffff" />
      <Path data={`M ${w} ${h} L 0 ${h} L 4 ${h-4} L ${w-4} ${h-4} Z`} fill="#bdc3c7" />
      <Path data={`M ${w} ${h} L ${w-4} ${h-4} L ${w-4} 4 L ${w} 0 Z`} fill="#bdc3c7" />

      {/* Terminals */}
      <Circle x={w/2} y={h*0.15} radius={4} fill="#7f8c8d" stroke="#2c3e50" strokeWidth={1} />
      <Circle x={w/2} y={h*0.85} radius={4} fill="#7f8c8d" stroke="#2c3e50" strokeWidth={1} />

      {/* Fixed Contacts */}
      <Rect x={w/2 - 2} y={h*0.15} width={4} height={h*0.2} fill="#34495e" />
      <Rect x={w/2 - 2} y={h*0.65} width={4} height={h*0.2} fill="#34495e" />

      {/* Switch Blade */}
      {isClosed ? (
        <Rect x={w/2 - 3} y={h*0.35} width={6} height={h*0.3} fill="#c0392b" stroke="#7f8c8d" strokeWidth={1} />
      ) : (
        <Group x={w/2} y={h*0.65} rotation={-45}>
          <Rect x={-3} y={-h*0.3} width={6} height={h*0.3} fill="#27ae60" stroke="#7f8c8d" strokeWidth={1} />
        </Group>
      )}

      {/* Visual isolation bar */}
      <Line points={[w*0.2, h*0.5, w*0.8, h*0.5]} stroke="#bdc3c7" strokeWidth={2} dash={[4, 2]} />

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={3} />
      )}
    </Group>
  );
};
