import React from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const CircuitBreakerSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isClosed = state === 'CLOSED';
  const isTripped = state === 'TRIPPED';
  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* Background container */}
      <Rect width={w} height={h} fill="#e0e0e0" stroke="#000" strokeWidth={1} />

      {/* Terminals */}
      <Circle x={w/2} y={h*0.1} radius={3} fill="#000" />
      <Circle x={w/2} y={h*0.9} radius={3} fill="#000" />

      {/* Fixed contacts */}
      <Line points={[w/2, h*0.1, w/2, h*0.3]} stroke="#000" strokeWidth={2} />
      <Line points={[w/2, h*0.9, w/2, h*0.7]} stroke="#000" strokeWidth={2} />

      {/* Moving Contact */}
      {isClosed ? (
        <Line points={[w/2, h*0.3, w/2, h*0.7]} stroke="green" strokeWidth={3} />
      ) : isTripped ? (
        <Line points={[w/2, h*0.3, w/2 + w*0.15, h*0.5]} stroke="orange" strokeWidth={2} />
      ) : (
        <Line points={[w/2, h*0.3, w/2 + w*0.25, h*0.6]} stroke="#000" strokeWidth={2} />
      )}

      {/* Cross mark for breaker identification */}
      <Line points={[w*0.3, h*0.4, w*0.7, h*0.6]} stroke="#000" strokeWidth={1} />
      <Line points={[w*0.3, h*0.6, w*0.7, h*0.4]} stroke="#000" strokeWidth={1} />

      {/* Fault Overlay */}
      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} />
      )}
    </Group>
  );
};
