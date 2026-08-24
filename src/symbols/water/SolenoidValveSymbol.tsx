import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const SolenoidValveSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isTransition = state === 'OPENING' || state === 'CLOSING';
  const isFault = state === 'FAULT';

  const fillColor = isClosed ? '#7f8c8d' : (isTransition ? '#f1c40f' : '#2ecc71');

  // Bow-tie valve geometry
  const bowTiePath = `M 0 ${h*0.3} L ${w} ${h} L ${w} ${h*0.3} L 0 ${h} Z`;

  return (
    <Group>
      {/* Solenoid Coil Box */}
      <Rect x={w*0.3} y={0} width={w*0.4} height={h*0.4} fill="#2980b9" stroke="#2c3e50" strokeWidth={1} />

      {/* Actuator stem */}
      <Rect x={w/2 - 2} y={h*0.4} width={4} height={h*0.25} fill="#2c3e50" />

      {/* Valve body */}
      <Path
        data={bowTiePath}
        fill={fillColor}
        stroke="#2c3e50"
        strokeWidth={1}
      />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
