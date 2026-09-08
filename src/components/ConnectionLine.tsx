import React from 'react';
import { Group, Path } from 'react-konva';
import type { SynopticConnection } from '../store';
import { COLOR_DE_ENERGIZED, COLOR_ENERGIZED, COLOR_WATER, COLOR_WATER_INACTIVE, CONDUCTOR_OUTLINE, CONDUCTOR_WIDTH, COLOR_OUTLINE, COLOR_WHITE, BUSBAR_HEIGHT, VENTILATION_ACTIVE, VENTILATION_INACTIVE } from '../theme/ScadaTheme';

export interface ConnectionProps {
  conn: SynopticConnection;
  // feat/water-management commit 2: a wire's own state is no longer a
  // manual per-connection setting (Properties dropped that field
  // entirely) - it is now the RESULT of whether its net touches an
  // active source, computed once per Canvas render (resolveNets) and
  // passed down here, same as junctionPoints already is. conn.state
  // itself still exists in the data (optional, for a file saved before
  // this commit), but is never read for drawing any more.
  netState: 'ACTIVE' | 'INACTIVE';
  isSelected: boolean;
  // Receives the raw Konva event so a caller can tell an Alt+click
  // (insert a bend on this segment, per usterka B) apart from a plain
  // click (select).
  onSelect: (e?: any) => void;
}

/**
 * Node-based wiring: a connection is drawn straight through its own
 * points array - no port lookup, no object references at all. This is
 * the entire router now (the freehand drawing tool in Canvas.tsx is
 * what enforces every segment being horizontal or vertical, at the
 * moment a point is added - there is nothing left to compute here).
 */
// oxlint-disable-next-line react/only-export-components -- kept beside the component it belongs to; Canvas.tsx reuses it for the in-progress drawing preview.
export function pathFromPoints(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Color carries medium and net state, and nothing else - every medium
 * now has its own ACTIVE/INACTIVE pair (feat/water-management commit
 * 2 gave water the split it never had before; it used to always read
 * as plain COLOR_WATER regardless of state).
 */
// oxlint-disable-next-line react/only-export-components -- kept beside the component it belongs to; testable in isolation without a Konva/Stage tree.
export function getConductorCoreColor(medium: SynopticConnection['medium'], netState: 'ACTIVE' | 'INACTIVE'): string {
  if (medium === 'WATER') return netState === 'ACTIVE' ? COLOR_WATER : COLOR_WATER_INACTIVE;
  if (medium === 'VENTILATION') return netState === 'ACTIVE' ? VENTILATION_ACTIVE : VENTILATION_INACTIVE;
  return netState === 'ACTIVE' ? COLOR_ENERGIZED : COLOR_DE_ENERGIZED;
}

export const ConnectionLine: React.FC<ConnectionProps> = ({ conn, netState, isSelected, onSelect }) => {
  if (!conn.points || conn.points.length < 2) return null;

  const path = pathFromPoints(conn.points);
  const coreColor = getConductorCoreColor(conn.medium, netState);

  // A busbar/manifold is just a much thicker wire (style BUS) - not a
  // symbol any more. Touchable anywhere along its length because
  // NetResolver treats any point ON its segment, not just its two ends,
  // as touching it.
  const coreWidth = conn.style === 'BUS' ? BUSBAR_HEIGHT : CONDUCTOR_WIDTH;
  const outlineWidth = coreWidth + CONDUCTOR_OUTLINE;

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Invisible hit area for easier selection */}
      <Path data={path} stroke="transparent" strokeWidth={outlineWidth + 10} />

      {/* Two-pass conductor: outline pass, then the medium/state color
          on top. Selection reads as a white outline (a halo) instead of
          the usual black one - a geometric/palette-only cue, not an
          invented color. */}
      <Path data={path} stroke={isSelected ? COLOR_WHITE : COLOR_OUTLINE} strokeWidth={outlineWidth} lineCap="butt" lineJoin="miter" />
      <Path data={path} stroke={coreColor} strokeWidth={coreWidth} lineCap="butt" lineJoin="miter" />
    </Group>
  );
};
