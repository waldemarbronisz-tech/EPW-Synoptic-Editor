import React from 'react';
import { Group, Rect, Path, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const ValveSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
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
        strokeWidth={1}
      />

      {/* Center circle/actuator */}
      <Circle
        x={w/2}
        y={h/2}
        radius={h*0.3}
        fill={isClosed ? '#95a5a6' : '#27ae60'}
        stroke="#2c3e50"
        strokeWidth={1}
      />

      {/* Stem position indicating closed or open */}
      <Rect
        x={w/2 - 2}
        y={isClosed ? h/2 - h*0.5 : h/2 - h*0.8}
        width={4}
        height={h*0.5}
        fill="#000"
      />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
