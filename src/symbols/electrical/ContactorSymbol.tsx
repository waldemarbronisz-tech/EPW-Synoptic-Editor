import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const ContactorSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isOn = state === 'ON';
  const isFault = state === 'FAULT';

  return (
    <Group>
      <Rect width={w} height={h} fill="#e0e0e0" stroke="#000" strokeWidth={1} />

      {/* Terminals */}
      <Circle x={w/2} y={h*0.1} radius={2} fill="#000" />
      <Circle x={w/2} y={h*0.9} radius={2} fill="#000" />

      {/* Lines */}
      <Line points={[w/2, h*0.1, w/2, h*0.3]} stroke="#000" strokeWidth={2} />
      <Line points={[w/2, h*0.9, w/2, h*0.7]} stroke="#000" strokeWidth={2} />

      {/* Main Contact */}
      {isOn ? (
        <Line points={[w/2, h*0.3, w/2, h*0.7]} stroke="green" strokeWidth={3} />
      ) : (
        <Line points={[w/2, h*0.3, w/2 + w*0.2, h*0.5]} stroke="#000" strokeWidth={2} />
      )}

      {/* Coil Indicator (Rectangle with diagonal line) */}
      <Rect x={w*0.7} y={h*0.7} width={w*0.2} height={h*0.2} fill={isOn ? "yellow" : "white"} stroke="#000" strokeWidth={1} />
      <Line points={[w*0.7, h*0.7, w*0.9, h*0.9]} stroke="#000" strokeWidth={1} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
