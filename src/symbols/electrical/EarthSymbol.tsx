import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const EarthSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* Invisible hit box */}
      <Rect width={w} height={h} fill="transparent" />

      {/* Main ground line */}
      <Line points={[w/2, 0, w/2, h*0.6]} stroke="#2c3e50" strokeWidth={2} />

      {/* Horizontal ground bars */}
      <Line points={[w*0.2, h*0.6, w*0.8, h*0.6]} stroke="#2c3e50" strokeWidth={2} />
      <Line points={[w*0.3, h*0.75, w*0.7, h*0.75]} stroke="#2c3e50" strokeWidth={2} />
      <Line points={[w*0.4, h*0.9, w*0.6, h*0.9]} stroke="#2c3e50" strokeWidth={2} />

      {isFault && (
        <Circle x={w/2} y={h/2} radius={w/2} stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
