// feat/water-management commit 4 - "2. Zawor trojdrogowy przelaczajacy"
// (zawor3) from docs/EPW_gospodarka_wodna_referencja.py's own
// zawor3(pos). SWITCHED, DUAL feedback: diClosed/diOpen are repurposed
// as "krancowka A"/"krancowka B" for this device (see DeviceFormDialog.tsx's
// own commit 4 change to the field labels for a three-way valve kind -
// the underlying diClosed/diOpen fields themselves are UNCHANGED, per
// GRANICE's "nie modyfikuj DeviceSchema.ts"). Two positions, A and B -
// whichever branch is NOT currently selected reads as inactive
// (unpowered pipe stub), matching this task's own "Nitka bez przeplywu
// rysowana jako nieaktywna".

import React from 'react';
import { Group, Path, Line, Text } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, bandedCircleLightOnly, statusLed, objectPipeSegment } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { COLOR_OUTLINE, SITE_DGREY, SITE_GREEN, SITE_BLUE, SITE_LEVER_WIDTH, SITE_LEVER_ARROW_WIDTH, SITE_OUTLINE_WIDTH_MEDIUM } from '../../theme/ScadaTheme';

export type WaterValveState = 'A' | 'B';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const WATER_VALVE_STATES: WaterValveState[] = ['A', 'B'];

const CX = 58, CY = 54;

export const WaterValveSymbol: React.FC<SymbolProps> = ({ state }) => {
  const isA = resolveSiteState(state, WATER_VALVE_STATES, 'A') === 'A';
  const angle = isA ? 0 : 90;

  return (
    <Group>
      {objectPipeSegment([{ x: 4, y: CY }, { x: CX, y: CY }], true)}
      {objectPipeSegment([{ x: CX, y: CY }, { x: 112, y: CY }], isA)}
      {objectPipeSegment([{ x: CX, y: CY }, { x: CX, y: 92 }], !isA)}
      {bandedCircleLightOnly(CX, CY, 17, SITE_DGREY)}

      {/* Lever handle - rotates about (CX,CY): a Konva Group pivoting
          on its own x/y is the direct equivalent of the reference's own
          transform="rotate(ang cx cy)", with the lever's geometry drawn
          relative to that pivot instead of absolute coordinates. */}
      <Group x={CX} y={CY} rotation={angle} listening={false}>
        <Path data="M-13,0 L13,0" stroke={SITE_BLUE.base} strokeWidth={SITE_LEVER_WIDTH} lineCap="round" />
        <Path data="M6,-6 L13,0 L6,6" stroke={SITE_BLUE.base} strokeWidth={SITE_LEVER_ARROW_WIDTH} lineJoin="round" />
      </Group>

      {bandedRect(CX - 11, CY - 38, 22, 20, SITE_GREEN, { band: 3, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
      <Line points={[CX, CY - 18, CX, CY - 16]} stroke={COLOR_OUTLINE} strokeWidth={7} listening={false} />

      {statusLed(CX - 22, CY - 46, isA)}
      <Text x={CX - 32} y={CY - 60} width={20} align="center" text="A" fontSize={10} fontStyle="bold" fill={COLOR_OUTLINE} listening={false} />
      {statusLed(CX + 22, CY - 46, !isA)}
      <Text x={CX + 12} y={CY - 60} width={20} align="center" text="B" fontSize={10} fontStyle="bold" fill={COLOR_OUTLINE} listening={false} />
    </Group>
  );
};
