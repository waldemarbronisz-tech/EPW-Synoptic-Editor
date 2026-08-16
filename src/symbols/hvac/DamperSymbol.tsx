import React from 'react';
import { Group, Rect, Circle, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DamperSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isOpen = state === 'RUNNING' || state === 'OPEN';
  const isFault = state === 'FAULT';

  const fillColor = '#bdc3c7';
  const strokeColor = '#7f8c8d';

  return (
    <Group>
      {/* Main Duct Body */}
      <Rect
        x={0}
        y={h*0.2}
        width={w}
        height={h*0.6}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
      />

      {/* Damper Blade / Axis */}
      <Group x={w/2} y={h/2}>
        {/* Actuator motor representation */}
        <Circle x={0} y={-h*0.4} radius={h*0.15} fill="#95a5a6" stroke="#2c3e50" strokeWidth={1} />
        {/* Axis line */}
        <Line points={[0, -h*0.4, 0, h*0.3]} stroke="#2c3e50" strokeWidth={1} dash={[2, 2]} />

        {/* Blade (Rotates when OPEN) */}
        <Line
          points={[0, -h*0.25, 0, h*0.25]}
          stroke="#2c3e50"
          strokeWidth={2}
          rotation={isOpen ? 90 : 0}
        />
      </Group>

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
