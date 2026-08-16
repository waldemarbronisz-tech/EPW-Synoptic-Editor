import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const PipeSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFlow = state === 'FLOW';
  const isFault = state === 'FAULT';

  const color = isFlow ? '#3498db' : '#95a5a6';

  return (
    <Group>
      {/* Main pipe body */}
      <Rect width={w} height={h} fill={color} stroke="#34495e" strokeWidth={1} />

      {/* Flow indicator line if horizontal pipe is thick enough */}
      {isFlow && h >= 10 && (
         <Line points={[w*0.1, h/2, w*0.9, h/2]} stroke="#2980b9" strokeWidth={1} dash={[5, 5]} />
      )}

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
