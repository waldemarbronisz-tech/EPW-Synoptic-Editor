import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DisconnectSwitchSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isFault = state === 'FAULT';

  return (
    <Group>
      <Rect width={w} height={h} fill="#e0e0e0" stroke="#000" strokeWidth={1} />

      {/* Terminals */}
      <Circle x={w/2} y={h*0.15} radius={3} fill="#000" />
      <Circle x={w/2} y={h*0.85} radius={3} fill="#000" />

      {/* Lines */}
      <Line points={[w/2, h*0.15, w/2, h*0.35]} stroke="#000" strokeWidth={2} />
      <Line points={[w/2, h*0.85, w/2, h*0.65]} stroke="#000" strokeWidth={2} />

      {/* Switch Blade */}
      {isClosed ? (
        <Line points={[w/2, h*0.35, w/2, h*0.65]} stroke="green" strokeWidth={3} />
      ) : (
        <Line points={[w/2, h*0.65, w/2 - w*0.3, h*0.4]} stroke="#000" strokeWidth={2} />
      )}

      {/* Horizontal isolation bar indicator */}
      <Line points={[w*0.3, h*0.5, w*0.7, h*0.5]} stroke="#000" strokeWidth={1} dash={[2, 2]} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
