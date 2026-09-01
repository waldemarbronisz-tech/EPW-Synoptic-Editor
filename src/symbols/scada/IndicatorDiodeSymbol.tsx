// SCADA-style symbol 8/9: indicator diode - a small, pure status dot. No
// conductor, no ports (per the task's own spec for this symbol).

import React from 'react';
import { Circle } from 'react-konva';
import { COLOR_DE_ENERGIZED, COLOR_LAMP_LIT, COLOR_OUTLINE, COLOR_RUN } from '../../theme/ScadaTheme';

export type IndicatorDiodeState = 'ON' | 'OFF' | 'QUALITY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this state list belongs beside its component.
export const INDICATOR_DIODE_STATES: IndicatorDiodeState[] = ['ON', 'OFF', 'QUALITY'];

export type IndicatorDiodeSize = 'small' | 'large';

// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeRadius(size: IndicatorDiodeSize): number {
  return size === 'small' ? 8 : 12;
}

// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeFillColor(state: IndicatorDiodeState): string {
  if (state === 'ON') return COLOR_RUN;
  if (state === 'QUALITY') return COLOR_LAMP_LIT;
  return COLOR_DE_ENERGIZED; // OFF
}

export interface IndicatorDiodeSymbolProps {
  state: IndicatorDiodeState;
  size: IndicatorDiodeSize;
}

const DIODE_OUTLINE_WIDTH = 3.5; // per this symbol's own spec, not OUTLINE_WIDTH

export const IndicatorDiodeSymbol: React.FC<IndicatorDiodeSymbolProps> = ({ state, size }) => {
  const radius = getIndicatorDiodeRadius(size);

  return (
    <Circle x={75} y={75} radius={radius} fill={getIndicatorDiodeFillColor(state)} stroke={COLOR_OUTLINE} strokeWidth={DIODE_OUTLINE_WIDTH} />
  );
};
