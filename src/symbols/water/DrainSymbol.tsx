import React from 'react';
import { Group, Rect, Path, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DrainSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* Funnel/drain shape */}
      <Path data={`M 0 0 L ${w} 0 L ${w*0.7} ${h} L ${w*0.3} ${h} Z`} fill="#95a5a6" stroke="#2c3e50" strokeWidth={1} />

      {/* Grate lines */}
      <Line points={[w*0.2, h*0.2, w*0.8, h*0.2]} stroke="#2c3e50" strokeWidth={1} />
      <Line points={[w*0.3, h*0.5, w*0.7, h*0.5]} stroke="#2c3e50" strokeWidth={1} />
      <Line points={[w*0.4, h*0.8, w*0.6, h*0.8]} stroke="#2c3e50" strokeWidth={1} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
