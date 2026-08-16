import React from 'react';
import { Group, Rect } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

import { useState, useEffect } from 'react';

export const BusbarSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const isEnergized = state === 'ENERGIZED';
  const isFault = state === 'FAULT';

  const baseColor = isEnergized ? '#e74c3c' : '#7f8c8d';

  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    let animationFrame: number;
    let increasing = true;

    const animate = () => {
      setPulse(p => {
        if (p >= 1) increasing = false;
        if (p <= 0.6) increasing = true;
        return p + (increasing ? 0.02 : -0.02);
      });
      animationFrame = requestAnimationFrame(animate);
    };

    if (isEnergized) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      setPulse(1);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isEnergized]);

  return (
    <Group>
      {/* The busbar base */}
      <Rect width={w} height={h} fill={baseColor} stroke="#2c3e50" strokeWidth={2} />

      {/* Energy Pulse Overlay */}
      {isEnergized && (
         <Rect
           x={2} y={2}
           width={w-4} height={h-4}
           fill="#f1c40f"
           opacity={pulse * 0.8}
         />
      )}

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#c0392b" strokeWidth={3} />
      )}
    </Group>
  );
};
