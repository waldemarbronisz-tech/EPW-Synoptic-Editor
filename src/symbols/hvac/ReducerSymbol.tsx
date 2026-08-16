import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const ReducerSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';

  const fillColor = '#bdc3c7';
  const strokeColor = '#7f8c8d';

  // Left is wider, right is narrower
  return (
    <Group>
      <Path
        data={`M 0 ${h*0.1} L ${w} ${h*0.3} L ${w} ${h*0.7} L 0 ${h*0.9} Z`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
      />
      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
