import React, { useState, useEffect } from 'react';
import { Group, Rect, Circle, Arc } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { SYMBOL_STROKE } from '../../theme/ScadaTheme';

export const PumpSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;
  const radius = Math.min(w, h) / 2;

  const isRunning = state === 'RUNNING';
  const isFault = state === 'FAULT';

  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setAngle(prev => (prev + 10) % 360);
      animationFrame = requestAnimationFrame(animate);
    };

    if (isRunning) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isRunning]);

  const color = isRunning ? '#2ecc71' : '#95a5a6';

  return (
    <Group>
      {/* Base */}
      <Rect x={w*0.2} y={h*0.8} width={w*0.6} height={h*0.2} fill="#34495e" />

      {/* Main Pump Body */}
      <Circle x={w/2} y={h/2} radius={radius} fill={color} stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />

      {/* Impeller representation */}
      <Group x={w/2} y={h/2} rotation={isRunning ? angle : 0}>
         <Arc x={0} y={0} innerRadius={0} outerRadius={radius*0.8} angle={60} rotation={0} fill="#27ae60" />
         <Arc x={0} y={0} innerRadius={0} outerRadius={radius*0.8} angle={60} rotation={120} fill="#27ae60" />
         <Arc x={0} y={0} innerRadius={0} outerRadius={radius*0.8} angle={60} rotation={240} fill="#27ae60" />
      </Group>

      {/* Outlet */}
      <Rect x={w/2} y={0} width={w*0.2} height={h*0.2} fill={color} stroke="#2c3e50" strokeWidth={SYMBOL_STROKE} />

      {isFault && (
        <Rect width={w} height={h} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={SYMBOL_STROKE} />
      )}
    </Group>
  );
};
