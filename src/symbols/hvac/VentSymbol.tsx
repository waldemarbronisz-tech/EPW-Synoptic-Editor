import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const VentSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;
  const isFault = state === 'FAULT';

  return (
    <Group>
      <Rect width={w} height={h} fill="#ecf0f1" stroke="#bdc3c7" strokeWidth={2} />
      <Line points={[0, 0, w, h]} stroke="#bdc3c7" strokeWidth={1} />
      <Line points={[w, 0, 0, h]} stroke="#bdc3c7" strokeWidth={1} />
      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
