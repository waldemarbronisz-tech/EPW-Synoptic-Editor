import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const DuctElbowSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isFault = state === 'FAULT';
  const isRound = obj.hvac?.shape === 'ROUND';

  const fillColor = '#bdc3c7';
  const strokeColor = '#7f8c8d';

  // Connecting bottom to right
  const pathData = isRound
    ? `M ${w/2} ${h} Q ${w/2} ${h/2} ${w} ${h/2}`
    : `M ${w/2} ${h} L ${w/2} ${h/2} L ${w} ${h/2}`;

  return (
    <Group>
      <Path
        data={pathData}
        stroke={fillColor}
        strokeWidth={Math.min(w,h) * 0.8}
        lineJoin={isRound ? "round" : "miter"}
        lineCap={isRound ? "round" : "square"}
      />
      <Path
        data={pathData}
        stroke={strokeColor}
        strokeWidth={Math.min(w,h) * 0.8 + 2}
        lineJoin={isRound ? "round" : "miter"}
        lineCap={isRound ? "round" : "square"}
        globalCompositeOperation="destination-over"
      />

      {/* Corner crease for rectangular */}
      {!isRound && (
        <Path data={`M ${w*0.2} ${h*0.8} L ${w*0.8} ${h*0.2}`} stroke={strokeColor} strokeWidth={1} />
      )}

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={2} />
      )}
    </Group>
  );
};
