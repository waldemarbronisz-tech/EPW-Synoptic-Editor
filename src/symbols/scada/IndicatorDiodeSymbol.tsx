// SCADA-style symbol 8/9: indicator diode - a small, pure status dot. No
// conductor, no ports (per the task's own spec for this symbol).

import React from 'react';
import { Circle, Group } from 'react-konva';
import {
  COLOR_OUTLINE, DIODE_RADIUS_SMALL, DIODE_RADIUS_LARGE,
  DIODE_ON, DIODE_ON_CORE, DIODE_OFF, DIODE_QUALITY, DIODE_QUALITY_CORE
} from '../../theme/ScadaTheme';

export type IndicatorDiodeState = 'ON' | 'OFF' | 'QUALITY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this state list belongs beside its component.
export const INDICATOR_DIODE_STATES: IndicatorDiodeState[] = ['ON', 'OFF', 'QUALITY'];

export type IndicatorDiodeSize = 'small' | 'large';

// feat/appearance-selection-frames commit 1: the two radii used to be
// literal numbers (8/12) local to this file - now ScadaTheme.ts's own
// DIODE_RADIUS_SMALL/DIODE_RADIUS_LARGE, so a signal panel's diode
// (which reuses this same helper, see SignalPanelElementNode.tsx) and
// this symbol always shrink or grow together, from one source.
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeRadius(size: IndicatorDiodeSize): number {
  return size === 'small' ? DIODE_RADIUS_SMALL : DIODE_RADIUS_LARGE;
}

// fix/handles-insert-mode-diodes commit 3a: the diode's own fill,
// deliberately from ScadaTheme's dedicated DIODE_* set rather than the
// COLOR_RUN/COLOR_LAMP_LIT every other symbol's state color reuses -
// see that constant's own comment for why.
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeFillColor(state: IndicatorDiodeState): string {
  if (state === 'ON') return DIODE_ON;
  if (state === 'QUALITY') return DIODE_QUALITY;
  return DIODE_OFF; // OFF
}

// 3b/3c: a LIT state (ON, QUALITY) gets a brighter, smaller inner
// circle - the highlight that reads as an actual light source, not a
// painted disc. OFF returns null: no inner circle at all is what
// signals "not lit" (3c is explicit that this must be the absence of
// a highlight, not a color choice of its own).
//
// Note on ALARM: ScadaTheme.ts also defines DIODE_ALARM/DIODE_ALARM_CORE
// per this fix's own 3a spec, but no ALARM diode state exists anywhere
// in the current data model - IndicatorDiodeState is ON/OFF/QUALITY
// only, and SignalPanelElement's own row state reuses this exact same
// three-value type verbatim (see that file's own comment). Wiring
// ALARM in would mean widening this type and every place that
// switches on it (SignalPanelElement.ts, SignalPanelResolver.ts,
// PropertyInspector.tsx's state picker) - a change to the diode/panel
// DATA MODEL, not to how an existing state renders, so out of this
// fix's own scope (a visual fix, no new element kind/state). Flagged
// in raport.md rather than silently invented or silently dropped.
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeCoreColor(state: IndicatorDiodeState): string | null {
  if (state === 'ON') return DIODE_ON_CORE;
  if (state === 'QUALITY') return DIODE_QUALITY_CORE;
  return null; // OFF - no highlight, on purpose
}

// Core circle proportions - a dimension, not a palette color, so it
// stays a local literal per ScadaTheme.ts's own header rule (that file
// holds colors/thicknesses the task gives explicitly, not every
// derived geometry ratio). "roughly half the diode's own radius,
// offset slightly up-and-left" per this fix's own 3b spec.
const DIODE_CORE_RADIUS_FRACTION = 0.5;
const DIODE_CORE_OFFSET_FRACTION = 0.3;

// Exported for the exact same reason DIODE_OUTLINE_WIDTH below already
// is: SignalPanelElementNode.tsx draws its own diode circles rather
// than rendering this component directly (a row also needs its own
// label Text beside the diode), but must still match this symbol's
// own look EXACTLY, core highlight included - not a coincidentally
// equal, separately hand-tuned duplicate of it.
// oxlint-disable-next-line react/only-export-components -- one file per symbol is required; this helper belongs beside its component.
export function getIndicatorDiodeCoreGeometry(radius: number): { radius: number; offset: number } {
  return { radius: radius * DIODE_CORE_RADIUS_FRACTION, offset: radius * DIODE_CORE_OFFSET_FRACTION };
}

export interface IndicatorDiodeSymbolProps {
  state: IndicatorDiodeState;
  size: IndicatorDiodeSize;
}

// feat/editing-and-signal-panel commit 6: exported so the signal panel
// element's own diode rows (SignalPanelElementNode.tsx) draw with
// EXACTLY this symbol's own outline weight, not a coincidentally equal
// duplicate of it - "use the existing Indicator Diode symbol where it
// can be reused" extends to this constant, not just the color/radius
// helpers above.
export const DIODE_OUTLINE_WIDTH = 3.5; // per this symbol's own spec, not OUTLINE_WIDTH

export const IndicatorDiodeSymbol: React.FC<IndicatorDiodeSymbolProps> = ({ state, size }) => {
  const radius = getIndicatorDiodeRadius(size);
  const coreColor = getIndicatorDiodeCoreColor(state);
  const core = getIndicatorDiodeCoreGeometry(radius);

  return (
    <Group>
      <Circle x={75} y={75} radius={radius} fill={getIndicatorDiodeFillColor(state)} stroke={COLOR_OUTLINE} strokeWidth={DIODE_OUTLINE_WIDTH} />
      {coreColor && (
        <Circle x={75 - core.offset} y={75 - core.offset} radius={core.radius} fill={coreColor} listening={false} />
      )}
    </Group>
  );
};
