// feat/water-management commit 4 - "1. Zbiornik na deszczowke" (tank2)
// from docs/EPW_gospodarka_wodna_referencja.py's own tank2(pct). A
// side-view low cylinder with a lattice dome and an EXTERNAL level
// window (that reference's own docstring: "ZBIORNIK poprawiony:
// okienko poziomu przesuniete, brak nachodzenia" - a corrected v2 of
// an earlier design that apparently overlapped).
//
// DISCREPANCY flagged, not silently resolved (raport.md has the full
// reasoning): this shares its exact task-given label, "Zbiornik na
// deszczowke", with the ALREADY-REGISTERED site.rain_tank
// (RainTankSymbol.tsx, feat/site-objects-2d - a completely different
// top-view circle-with-a-ring design, with no MEASURED-device concept
// at all). GRANICE gives no authority to rename or remove that earlier
// object, and this task's own reference names this one distinctly
// (tank2) without saying to replace anything - so both are registered,
// side by side, under the identical display label.
//
// TWO independent things drive this symbol's own two displays (PRZED
// ZGLOSZENIEM points 6/7 both confirm the split is deliberate):
//   - GEOMETRY (water bar height, level-window fill) comes from the
//     object's OWN state (NISKI/SREDNI/WYSOKI -> 18/52/88%), exactly
//     like every other site object's editor.preview_state.
//   - The VALUE FIELD's own text comes from the assigned MEASURED
//     device instead, through the EXACT SAME path the meter element's
//     own row already uses - MeterResolver.ts's own
//     getMeasuredPreviewValue/formatMeasuredValue, and
//     MeterElementNode.tsx's own colorForRow for the PREVIEW/MISSING
//     shading - never a second, independently-written resolver.

import React from 'react';
import { Group, Rect, Path } from 'react-konva';
import { useStore } from '../../store';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, valueField } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { findDeviceById, getMeasuredPreviewValue, formatMeasuredValue } from '../../meter/MeterResolver';
import { colorForRow } from '../../components/MeterElementNode';
import {
  COLOR_OUTLINE, SITE_GREY, SITE_DGREY, SITE_BLUE, SITE_CONC, SITE_TANK_WINDOW_BG,
  SITE_BAND_WIDTH_NARROW, SITE_OUTLINE_WIDTH, SITE_OUTLINE_WIDTH_MEDIUM
} from '../../theme/ScadaTheme';

export type RainwaterTank2State = 'NISKI' | 'SREDNI' | 'WYSOKI';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const RAINWATER_TANK2_STATES: RainwaterTank2State[] = ['NISKI', 'SREDNI', 'WYSOKI'];

// docs/EPW_gospodarka_wodna_referencja.py's own tank2(pct): the three
// named states this task gives map to these exact percentages.
const LEVEL_PERCENT_BY_STATE: Record<RainwaterTank2State, number> = { NISKI: 18, SREDNI: 52, WYSOKI: 88 };

const BX = 14, BY = 40, BW = 70, BH = 42;

export const RainwaterTank2Symbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const pct = LEVEL_PERCENT_BY_STATE[resolveSiteState(state, RAINWATER_TANK2_STATES, 'NISKI')];

  const devices = useStore(s => s.devices);
  const device = obj.deviceId ? findDeviceById(devices, obj.deviceId) : undefined;
  const isMeasured = device?.behavior === 'MEASURED';
  const valueText = isMeasured ? `${formatMeasuredValue(getMeasuredPreviewValue(device), device.format)}%` : '?';
  const valueColor = colorForRow(isMeasured ? 'PREVIEW' : 'MISSING');

  const cx = BX + BW / 2;
  const hg = Math.floor((BH - 4) * pct / 100);
  const top = BY + BH - 2 - hg;
  const ih = Math.floor((BH - 12) * pct / 100);

  return (
    <Group>
      {bandedRect(8, 82, 82, 8, SITE_CONC, { band: SITE_BAND_WIDTH_NARROW, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}

      {/* Main cylinder body, water fill clipped to its own interior. */}
      <Rect x={BX} y={BY} width={BW} height={BH} fill={SITE_GREY.base} stroke={COLOR_OUTLINE} strokeWidth={SITE_OUTLINE_WIDTH} />
      {hg > 0 && (
        <Group clipFunc={(ctx: any) => { ctx.rect(BX + 2, BY + 2, BW - 4, BH - 4); }}>
          <Rect x={BX + 2} y={top} width={BW - 4} height={hg} fill={SITE_BLUE.base} />
          <Rect x={BX + 2} y={top} width={BW - 4} height={3} fill={SITE_BLUE.light} />
        </Group>
      )}
      <Rect x={BX + 2} y={BY + 2} width={5} height={BH - 4} fill={SITE_GREY.light} opacity={0.45} listening={false} />
      <Rect x={BX} y={BY} width={BW} height={BH} stroke={COLOR_OUTLINE} strokeWidth={SITE_OUTLINE_WIDTH} listening={false} />

      {/* Lattice dome. */}
      <Path data={`M${BX},${BY} A${BW / 2},20 0 0 1 ${BX + BW},${BY} Z`} fill={SITE_GREY.base} stroke={COLOR_OUTLINE} strokeWidth={SITE_OUTLINE_WIDTH} />
      {[-24, -12, 0, 12, 24].map(dx => (
        <Path key={dx} data={`M${cx},${BY - 19} Q${cx + dx * 1.2},${BY - 13} ${cx + dx * 1.4},${BY}`} stroke={SITE_DGREY.dark} strokeWidth={1.3} listening={false} />
      ))}
      {[[0.72, 7], [0.42, 13]].map(([rr, yy]) => (
        <Path key={rr} data={`M${cx - BW / 2 * rr},${BY - yy} A${BW / 2 * rr * 1.4},${16 * rr} 0 0 1 ${cx + BW / 2 * rr},${BY - yy}`} stroke={SITE_DGREY.dark} strokeWidth={1.3} listening={false} />
      ))}
      <Path data={`M${BX + 8},${BY - 4} A${BW / 2.6},15 0 0 1 ${BX + 26},${BY - 15}`} stroke={SITE_GREY.light} strokeWidth={4} lineCap="round" listening={false} />

      {/* Level window, external to the body (the "corrected" part of tank2 - no overlap with the main cylinder). */}
      <Rect x={BX + BW + 3} y={BY + 4} width={12} height={BH - 8} fill={SITE_TANK_WINDOW_BG} stroke={COLOR_OUTLINE} strokeWidth={2} />
      {ih > 0 && <Rect x={BX + BW + 5} y={BY + BH - 6 - ih} width={8} height={ih} fill={SITE_BLUE.base} listening={false} />}

      {bandedRect(BX - 12, BY + BH - 12, 12, 7, SITE_GREY, { band: SITE_BAND_WIDTH_NARROW, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
      {bandedRect(BX + BW + 15, BY + 2, 10, 6, SITE_GREY, { band: SITE_BAND_WIDTH_NARROW, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}

      {valueField(92, 58, 32, valueText, { textColor: valueColor })}
    </Group>
  );
};
