import React from 'react';
import { Group, Rect, Line, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DuctSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFlow = state === 'FLOW';
  const isFault = state === 'FAULT';
  const isRound = obj.hvac?.shape === 'ROUND';

  const fillColor = '#bdc3c7'; // Aluminum duct color
  const strokeColor = '#7f8c8d';

  return (
    <Group>
      {/* Duct body */}
      <Rect width={w} height={h} fill={fillColor} stroke={strokeColor} strokeWidth={isRound ? 1 : 2} cornerRadius={isRound ? h/2 : 0} />

      {/* Creases / Joints */}
      {w > 30 && (
        <Group>
          <Line points={[w*0.3, 0, w*0.3, h]} stroke={strokeColor} strokeWidth={1} />
          <Line points={[w*0.7, 0, w*0.7, h]} stroke={strokeColor} strokeWidth={1} />
        </Group>
      )}

      {/* Flow indicator */}
      {isFlow && h >= 15 && (
         <Path data={`M ${w*0.4} ${h*0.3} L ${w*0.6} ${h*0.5} L ${w*0.4} ${h*0.7}`} stroke="#3498db" strokeWidth={2} />
      )}

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
