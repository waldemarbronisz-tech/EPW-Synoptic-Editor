import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const GateValveSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
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

      {/* T-shaped handle for gate valve */}
      <Rect x={w/2 - 2} y={isClosed ? h/2 - h*0.4 : h/2 - h*0.8} width={4} height={h*0.4} fill="#2c3e50" />
      <Rect x={w/2 - w*0.2} y={isClosed ? h/2 - h*0.4 : h/2 - h*0.8} width={w*0.4} height={4} fill="#2c3e50" />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
