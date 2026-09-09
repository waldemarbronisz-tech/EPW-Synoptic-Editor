// feat/water-management commit 4 - "6. Hydrofor" (hydrofor) from docs/
// EPW_gospodarka_wodna_referencja.py's own hydrofor(on). SWITCHED -
// pressure vessel plus pump; the vessel itself reads blue while the
// pump is running, per this task's own "Naczynie niebieskie przy
// pracy".

import React from 'react';
import { Group, Rect, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, bandedCircleLightOnly, statusLed, objectPipeSegment } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { COLOR_OUTLINE, SITE_GREY, SITE_BLUE, SITE_GREEN, SITE_RED, SITE_DARK, SITE_CONC, SITE_OUTLINE_WIDTH, SITE_OUTLINE_WIDTH_MEDIUM } from '../../theme/ScadaTheme';

export type HydroforState = 'ZALACZONY' | 'WYLACZONY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const HYDROFOR_STATES: HydroforState[] = ['ZALACZONY', 'WYLACZONY'];

export const HydroforSymbol: React.FC<SymbolProps> = ({ state }) => {
  const on = resolveSiteState(state, HYDROFOR_STATES, 'WYLACZONY') === 'ZALACZONY';
  const vessel = on ? SITE_BLUE : SITE_GREY;

  return (
    <Group>
      {bandedRect(10, 80, 108, 8, SITE_CONC, { band: 3, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}

      {/* Pressure vessel - rounded rect, blue when running, grey when not. */}
      <Rect x={14} y={30} width={42} height={50} cornerRadius={8} fill={vessel.base} stroke={COLOR_OUTLINE} strokeWidth={SITE_OUTLINE_WIDTH} />
      <Rect x={18} y={34} width={6} height={42} fill={vessel.light} listening={false} />
      <Rect x={47} y={34} width={5} height={42} fill={vessel.dark} opacity={0.6} listening={false} />

      {bandedCircleLightOnly(86, 56, 20, on ? SITE_GREEN : SITE_RED)}
      <Line points={[78, 46, 78, 66, 98, 56]} closed fill={SITE_DARK.base} listening={false} />

      {objectPipeSegment([{ x: 56, y: 56 }, { x: 66, y: 56 }], on, { width: 10 })}
      {statusLed(110, 26, on)}
    </Group>
  );
};
