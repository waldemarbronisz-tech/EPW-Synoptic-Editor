import React from 'react';
import { Group, Rect, Path, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { SYMBOL_STROKE } from '../../theme/ScadaTheme';

export const BallValveSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isTransition = state === 'OPENING' || state === 'CLOSING';
  const isFault = state === 'FAULT';

  const fillColor = isClosed ? '#7f8c8d' : (isTransition ? '#f1c40f' : '#2ecc71');

  // Bow-tie valve geometry
  const bowTiePath = `M 0 0 L ${w} ${h} L ${w} 0 L 0 ${h} Z`;

  return (
    <Group>
      <Path
        data={bowTiePath}
        fill={fillColor}
        stroke="#2c3e50"
        strokeWidth={SYMBOL_STROKE}
      />

      {/* Circle center with lever handle */}
      <Circle x={w/2} y={h/2} radius={w*0.15} fill="#ecf0f1" stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />

      {/* Lever handle */}
      {isClosed ? (
        // Perpendicular
        <Rect x={w/2 - 2} y={h/2 - h*0.4} width={4} height={h*0.4} fill="#e74c3c" />
      ) : (
        // Parallel
        <Rect x={w/2 - w*0.3} y={h/2 - 2} width={w*0.3} height={4} fill="#27ae60" />
      )}

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={SYMBOL_STROKE} />
      )}
    </Group>
  );
};
