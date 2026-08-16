import React from 'react';
import { Group, Rect } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const BusbarSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isEnergized = state === 'ENERGIZED';
  const isFault = state === 'FAULT';

  const color = isEnergized ? 'red' : 'gray';

  return (
    <Group>
      {/* The busbar itself */}
      <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.5)" stroke="yellow" strokeWidth={2} />
      )}
    </Group>
  );
};
