// SCADA-style symbol 2/9: busbar. The one symbol with a variable width -
// everything else in this set uses the fixed 150x150 canvas.

import React from 'react';
import { Group, Rect } from 'react-konva';
import { BUSBAR_HEIGHT, COLOR_DE_ENERGIZED, COLOR_ENERGIZED, COLOR_OUTLINE, GRID_SIZE } from '../../theme/ScadaTheme';

export type BusbarState = 'LIVE' | 'DEAD';
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this state list belongs beside its component.
export const BUSBAR_STATES: BusbarState[] = ['LIVE', 'DEAD'];

// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getBusbarFillColor(state: BusbarState): string {
  return state === 'LIVE' ? COLOR_ENERGIZED : COLOR_DE_ENERGIZED;
}

/**
 * A connection may land at any point along the busbar's length, not just
 * its ends - implemented as ports spaced every GRID_SIZE along the bar,
 * at its vertical center. Handles width <= 0 by returning no ports rather
 * than throwing.
 */
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getBusbarPorts(width: number): { x: number; y: number }[] {
  if (!(width > 0)) return [];

  const count = Math.floor(width / GRID_SIZE);
  const y = BUSBAR_HEIGHT / 2;
  const ports: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    ports.push({ x: i * GRID_SIZE, y });
  }
  return ports;
}

export interface BusbarSymbolProps {
  width: number;
  state: BusbarState;
}

// This symbol's outline is 3px, per the task's explicit spec for it -
// distinct from the general OUTLINE_WIDTH default of 5 used elsewhere.
const BUSBAR_OUTLINE_WIDTH = 3;

export const BusbarSymbol: React.FC<BusbarSymbolProps> = ({ width, state }) => {
  const safeWidth = Math.max(0, width);

  return (
    <Group>
      <Rect x={0} y={0} width={safeWidth} height={BUSBAR_HEIGHT} fill={getBusbarFillColor(state)} stroke={COLOR_OUTLINE} strokeWidth={BUSBAR_OUTLINE_WIDTH} />
    </Group>
  );
};
