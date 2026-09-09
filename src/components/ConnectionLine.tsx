import React from 'react';
import { Group, Path } from 'react-konva';
import type { SynopticConnection, WirePoint } from '../store';
import {
  COLOR_DE_ENERGIZED, COLOR_DE_ENERGIZED_LIGHT, COLOR_DE_ENERGIZED_DARK,
  COLOR_ENERGIZED, COLOR_ENERGIZED_LIGHT, COLOR_ENERGIZED_DARK,
  COLOR_WATER, COLOR_WATER_LIGHT, COLOR_WATER_DARK,
  COLOR_WATER_INACTIVE, COLOR_WATER_INACTIVE_LIGHT, COLOR_WATER_INACTIVE_DARK,
  VENTILATION_ACTIVE, VENTILATION_ACTIVE_LIGHT, VENTILATION_ACTIVE_DARK,
  VENTILATION_INACTIVE, VENTILATION_INACTIVE_LIGHT, VENTILATION_INACTIVE_DARK,
  CONDUCTOR_OUTLINE, CONDUCTOR_WIDTH,
  CONDUCTOR_HIGHLIGHT_WIDTH, CONDUCTOR_HIGHLIGHT_OFFSET_X, CONDUCTOR_HIGHLIGHT_OFFSET_Y,
  CONDUCTOR_SHADOW_WIDTH, CONDUCTOR_SHADOW_OFFSET_X, CONDUCTOR_SHADOW_OFFSET_Y, CONDUCTOR_SHADOW_OPACITY,
  PIPE_FLANGE_LENGTH, PIPE_FLANGE_WIDTH_MULTIPLIER,
  COLOR_OUTLINE, COLOR_WHITE, BUSBAR_HEIGHT
} from '../theme/ScadaTheme';

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

/**
 * The light/dark companions of the core color above, for the Houston-
 * style highlight/shadow passes below - see ScadaTheme.ts's own
 * comment on each pair for exactly where it came from.
 */
function getConductorShadeColors(medium: SynopticConnection['medium'], netState: 'ACTIVE' | 'INACTIVE'): { light: string; dark: string } {
  if (medium === 'WATER') {
    return netState === 'ACTIVE'
      ? { light: COLOR_WATER_LIGHT, dark: COLOR_WATER_DARK }
      : { light: COLOR_WATER_INACTIVE_LIGHT, dark: COLOR_WATER_INACTIVE_DARK };
  }
  if (medium === 'VENTILATION') {
    return netState === 'ACTIVE'
      ? { light: VENTILATION_ACTIVE_LIGHT, dark: VENTILATION_ACTIVE_DARK }
      : { light: VENTILATION_INACTIVE_LIGHT, dark: VENTILATION_INACTIVE_DARK };
  }
  return netState === 'ACTIVE'
    ? { light: COLOR_ENERGIZED_LIGHT, dark: COLOR_ENERGIZED_DARK }
    : { light: COLOR_DE_ENERGIZED_LIGHT, dark: COLOR_DE_ENERGIZED_DARK };
}

/** A point one flange length back from `from`, along the (always axis-
 * aligned) direction toward `towards` - the short inset end of a
 * flange stub, drawn from there out to the terminal itself. */
function insetFlangePoint(from: WirePoint, towards: WirePoint): WirePoint {
  if (from.x === towards.x) {
    const dir = towards.y > from.y ? 1 : -1;
    return { x: from.x, y: from.y + dir * PIPE_FLANGE_LENGTH };
  }
  const dir = towards.x > from.x ? 1 : -1;
  return { x: from.x + dir * PIPE_FLANGE_LENGTH, y: from.y };
}

/**
 * fix/wiring-and-library-groups commit 4: the Houston reference's own
 * pipe-to-fitting flange - a short, wider stub right where a WATER
 * pipe's end is anchored to a symbol's own terminal. Not a separate
 * element or an extra polyline point (this task's own explicit
 * "kolnierz NIE jest osobnym elementem ani punktem lamanej") - purely
 * a second, wider two-point segment drawn on top of the pipe's own
 * end, in the SAME place `conn.points` already has coordinates for
 * (the terminal itself, and its immediate neighbor). Only an
 * ANCHORED end gets one (a free end never touched a terminal to begin
 * with); electrical/ventilation never get one at all (medium check by
 * the caller, via this function's own early return) - this is water-
 * armature-specific, not a general wire-end decoration.
 */
// oxlint-disable-next-line react/only-export-components -- kept beside the component it belongs to, same convention as this file's own pathFromPoints/getConductorCoreColor above.
export function getFlangeSegments(conn: Pick<SynopticConnection, 'medium' | 'points'>): WirePoint[][] {
  if (conn.medium !== 'WATER') return [];
  const points = conn.points;
  if (!points || points.length < 2) return [];

  const segments: WirePoint[][] = [];
  const first = points[0];
  const last = points[points.length - 1];

  // The two ends' own "towards" reference (points[1] / points[length-2])
  // stay well-defined even for a 2-point wire (both then resolve to the
  // OTHER end) - a jumper anchored at both ends legitimately gets two
  // distinct flange stubs, one near each terminal, not a duplicate of
  // the same one.
  if (first.anchor) segments.push([first, insetFlangePoint(first, points[1])]);
  if (last.anchor) segments.push([last, insetFlangePoint(last, points[points.length - 2])]);

  return segments;
}

export const ConnectionLine: React.FC<ConnectionProps> = ({ conn, netState, isSelected, onSelect }) => {
  if (!conn.points || conn.points.length < 2) return null;

  const path = pathFromPoints(conn.points);
  const coreColor = getConductorCoreColor(conn.medium, netState);
  const { light: highlightColor, dark: shadowColor } = getConductorShadeColors(conn.medium, netState);

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

      {/* Houston-style four-pass pipe (feat/water-management commit 3,
          docs/EPW_gospodarka_wodna_referencja.py's own pipe_seg): outline,
          fill, shadow, highlight, all on ONE path per pass - lineCap/
          lineJoin "round" (not the old "butt"/"miter") is what makes a
          bend draw its own rounded elbow with no separate symbol
          needed, for every medium, not only water. Selection still
          reads as a white outline instead of the usual black one - a
          geometric/palette-only cue, not an invented color. */}
      <Path data={path} stroke={isSelected ? COLOR_WHITE : COLOR_OUTLINE} strokeWidth={outlineWidth} lineCap="round" lineJoin="round" />
      <Path data={path} stroke={coreColor} strokeWidth={coreWidth} lineCap="round" lineJoin="round" />
      {/* Shadow: offset down-right, narrow, semi-transparent - drawn
          BEFORE the highlight so the highlight (fully opaque) always
          reads on top at a corner where the two might otherwise overlap. */}
      <Path
        data={path} stroke={shadowColor} strokeWidth={CONDUCTOR_SHADOW_WIDTH}
        lineCap="round" lineJoin="round" opacity={CONDUCTOR_SHADOW_OPACITY}
        x={CONDUCTOR_SHADOW_OFFSET_X} y={CONDUCTOR_SHADOW_OFFSET_Y}
        listening={false}
      />
      {/* Highlight: offset up-left, narrow, fully opaque. */}
      <Path
        data={path} stroke={highlightColor} strokeWidth={CONDUCTOR_HIGHLIGHT_WIDTH}
        lineCap="round" lineJoin="round"
        x={CONDUCTOR_HIGHLIGHT_OFFSET_X} y={CONDUCTOR_HIGHLIGHT_OFFSET_Y}
        listening={false}
      />

      {/* Pipe flange (commit 4): every ANCHORED water end, drawn with
          the exact same four passes as the pipe itself - so it
          inherits the identical net-state color - just at
          PIPE_FLANGE_WIDTH_MULTIPLIER times the width, over the last
          PIPE_FLANGE_LENGTH units of the pipe. Not a separate element:
          purely an extra, wider stroke pass layered on top of the
          pipe's own already-drawn end. */}
      {getFlangeSegments(conn).map((flangePoints, idx) => {
        const flangePath = pathFromPoints(flangePoints);
        const flangeCoreWidth = coreWidth * PIPE_FLANGE_WIDTH_MULTIPLIER;
        const flangeOutlineWidth = flangeCoreWidth + CONDUCTOR_OUTLINE;
        return (
          <Group key={`flange-${idx}`} listening={false}>
            <Path data={flangePath} stroke={isSelected ? COLOR_WHITE : COLOR_OUTLINE} strokeWidth={flangeOutlineWidth} lineCap="round" lineJoin="round" />
            <Path data={flangePath} stroke={coreColor} strokeWidth={flangeCoreWidth} lineCap="round" lineJoin="round" />
            <Path
              data={flangePath} stroke={shadowColor} strokeWidth={CONDUCTOR_SHADOW_WIDTH}
              lineCap="round" lineJoin="round" opacity={CONDUCTOR_SHADOW_OPACITY}
              x={CONDUCTOR_SHADOW_OFFSET_X} y={CONDUCTOR_SHADOW_OFFSET_Y}
            />
            <Path
              data={flangePath} stroke={highlightColor} strokeWidth={CONDUCTOR_HIGHLIGHT_WIDTH}
              lineCap="round" lineJoin="round"
              x={CONDUCTOR_HIGHLIGHT_OFFSET_X} y={CONDUCTOR_HIGHLIGHT_OFFSET_Y}
            />
          </Group>
        );
      })}
    </Group>
  );
};
