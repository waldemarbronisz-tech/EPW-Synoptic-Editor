import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';

export const MeasurementDisplaySymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const w = obj.width;
  const h = obj.height;

  const value = obj.editor?.preview_value || "---";
  const unit = obj.editor?.unit || "";
  const format = obj.editor?.format || "";

  // Attempt formatting if possible and value is numeric
  let displayString = `${value} ${unit}`;

  if (format && !isNaN(Number(value))) {
    try {
      const num = Number(value);
      if (format.includes(".")) {
         const decimals = format.split(".")[1].length;
         displayString = `${num.toFixed(decimals)} ${unit}`;
      }
    } catch {
      // fallback
    }
  }

  const isFault = state === 'FAULT';

  return (
    <Group>
      {/* 3D bezel for retro instrument feel */}
      <Rect width={w} height={h} fill="#7f8c8d" />
      <Rect x={2} y={2} width={w-4} height={h-4} fill="#2c3e50" />

      {/* Label area (top) */}
      <Rect x={4} y={4} width={w-8} height={14} fill="#bdc3c7" />
      <Text
        x={6} y={6}
        width={w-12} height={10}
        text={obj.tag || obj.text || "SENSOR"}
        fontSize={10}
        fontFamily="monospace"
        fill="#2c3e50"
        align="center"
      />

      {/* LED Display area */}
      <Rect x={4} y={20} width={w-8} height={h-24} fill="#000000" />
      <Text
        x={8} y={24}
        width={w-16} height={h-32}
        text={displayString}
        fontSize={14}
        fontFamily="Courier New, monospace"
        fill="#2ecc71" // Retro green phosphor look
        align="right"
        verticalAlign="middle"
      />

      {isFault && (
        <Rect width={w} height={h} fill="transparent" stroke="#e74c3c" strokeWidth={3} />
      )}
    </Group>
  );
};
