import React from 'react';
import { Group, Rect, Path, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { SYMBOL_STROKE } from '../../theme/ScadaTheme';

export const DrainValveSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isOpen = state === 'OPEN';
  const isFault = state === 'FAULT';

  const fillColor = isOpen ? '#e74c3c' : '#7f8c8d';

  // Small bow-tie
  const bowTiePath = `M 0 0 L ${w} ${h*0.8} L ${w} 0 L 0 ${h*0.8} Z`;

  return (
    <Group>
      <Path
        data={bowTiePath}
        fill={fillColor}
        stroke="#2c3e50"
        strokeWidth={SYMBOL_STROKE}
      />

      {/* Downward drain line indicating discharge */}
      <Line points={[w/2, h*0.4, w/2, h]} stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />
      <Line points={[w*0.3, h, w*0.7, h]} stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={SYMBOL_STROKE} />
      )}
    </Group>
  );
};
