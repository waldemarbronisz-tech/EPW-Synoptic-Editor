import React from 'react';
import { Group, Rect } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DuctTeeSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';
  const isRound = obj.hvac?.shape === 'ROUND';

  const fillColor = '#bdc3c7';
  const strokeColor = '#7f8c8d';

  // Tee shape connecting left, right, and bottom. Main branch is horizontal.
  // We'll draw horizontal pipe, and vertical intersecting it.
  return (
    <Group>
      {/* Horizontal Main */}
      <Rect
        x={0}
        y={h*0.2}
        width={w}
        height={h*0.6}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
        cornerRadius={isRound ? h*0.3 : 0}
      />
      {/* Vertical Branch */}
      <Rect
        x={w*0.3}
        y={h*0.5}
        width={w*0.4}
        height={h*0.5}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
        cornerRadius={isRound ? [0, 0, w*0.2, w*0.2] : 0}
      />
      {/* Remove the intersection line by drawing a fill-only rect over it */}
      <Rect
        x={w*0.3 + 1}
        y={h*0.5 - 1}
        width={w*0.4 - 2}
        height={h*0.3 + 2}
        fill={fillColor}
      />

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
