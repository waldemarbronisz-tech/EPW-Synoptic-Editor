import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { SYMBOL_STROKE } from '../../theme/ScadaTheme';

export const TankSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';
  const isLow = state === 'LOW';
  const isHigh = state === 'HIGH';

  let fillLevel = 0.5; // Normal
  if (isLow) fillLevel = 0.15;
  if (isHigh) fillLevel = 0.85;

  const waterColor = isFault ? '#c0392b' : '#3498db';

  // Tank outline (rounded top and bottom simulation with path)
  const tankPath = `
    M 0 ${h*0.1}
    Q ${w/2} ${-h*0.05} ${w} ${h*0.1}
    L ${w} ${h*0.9}
    Q ${w/2} ${h*1.05} 0 ${h*0.9}
    Z
  `;

  return (
    <Group>
      {/* Background/Empty Tank */}
      <Path data={tankPath} fill="#ecf0f1" stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />

      {/* Water Level */}
      <Rect
        x={2}
        y={h * (1 - fillLevel)}
        width={w - 4}
        height={h * fillLevel - h*0.05}
        fill={waterColor}
        opacity={0.8}
      />

      {/* Level indicators */}
      <Rect x={-5} y={h*0.15} width={10} height={2} fill="red" />
      <Rect x={-5} y={h*0.85} width={10} height={2} fill="blue" />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={SYMBOL_STROKE} />
      )}
    </Group>
  );
};
