// feat/water-management commit 5 - "8. Wodomierz" (wodomierz2) from
// docs/EPW_gospodarka_wodna_referencja.py's own wodomierz2(on).
// MEASURED - a running total. Reads through the same MeterResolver/
// colorForRow path as the tank and the flow meter (findDeviceById/
// getMeasuredPreviewValue/formatMeasuredValue, colorForRow) - the ONE
// deliberate difference from FlowMeterSymbol.tsx is that the VALUE
// TEXT never changes with flow state: a totalizer counts up regardless
// of whether water happens to be flowing at this exact instant, so it
// keeps showing its own reading even while WYLACZONY - this task's own
// explicit "ta roznica... ma byc widoczna" (this difference must be
// visible), confirmed directly in the reference's own source too
// (its own literal display text is identical whether on or off).

import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { useStore } from '../../store';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, objectPipeSegment } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { findDeviceById, getMeasuredPreviewValue, formatMeasuredValue } from '../../meter/MeterResolver';
import { colorForRow } from '../../components/MeterElementNode';
import { COLOR_OUTLINE, SITE_GREY, SITE_LCD_BACKGROUND } from '../../theme/ScadaTheme';

export type WaterMeterState = 'ZALACZONY' | 'WYLACZONY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const WATER_METER_STATES: WaterMeterState[] = ['ZALACZONY', 'WYLACZONY'];

export const WaterMeterSymbol: React.FC<SymbolProps> = ({ obj, state }) => {
  const on = resolveSiteState(state, WATER_METER_STATES, 'WYLACZONY') === 'ZALACZONY';

  const devices = useStore(s => s.devices);
  const device = obj.deviceId ? findDeviceById(devices, obj.deviceId) : undefined;
  const isMeasured = device?.behavior === 'MEASURED';
  // Deliberately NOT gated on `on` - see this file's own header comment.
  const valueText = isMeasured ? formatMeasuredValue(getMeasuredPreviewValue(device), device.format) : '?';
  const valueColor = colorForRow(isMeasured ? 'PREVIEW' : 'MISSING');

  return (
    <Group>
      {objectPipeSegment([{ x: 4, y: 70 }, { x: 124, y: 70 }], on)}
      {bandedRect(30, 26, 68, 34, SITE_GREY)}
      <Rect x={36} y={32} width={56} height={16} fill={SITE_LCD_BACKGROUND} stroke={COLOR_OUTLINE} strokeWidth={2} listening={false} />
      <Text x={36} y={35} width={52} align="right" text={valueText} fontFamily="Consolas, DejaVu Sans Mono, monospace" fontSize={12} fontStyle="bold" fill={valueColor} listening={false} />
      <Text x={44} y={51} width={40} align="center" text="m3 SUMA" fontSize={9} fontStyle="bold" fill={COLOR_OUTLINE} listening={false} />
      <Line points={[64, 60, 64, 70]} stroke={COLOR_OUTLINE} strokeWidth={4} listening={false} />
    </Group>
  );
};
