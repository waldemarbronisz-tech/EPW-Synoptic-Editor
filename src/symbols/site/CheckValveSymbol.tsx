// feat/water-management commit 4 - "4. Zawor zwrotny" (zawor_zwrotny2)
// from docs/EPW_gospodarka_wodna_referencja.py's own zawor_zwrotny2(live).
// Pure graphics - no tag, no aparat (GRANICE/task both explicit on
// this). A hinged flapper: angled open when flowing, vertical (shut)
// when not, plus a direction arrow above the body.

import React from 'react';
import { Group, Path, Circle } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, objectPipeSegment } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { COLOR_OUTLINE, SITE_GREY, SITE_GREEN, SITE_RED } from '../../theme/ScadaTheme';

export type CheckValveState = 'ZALACZONY' | 'WYLACZONY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const CHECK_VALVE_STATES: CheckValveState[] = ['ZALACZONY', 'WYLACZONY'];

export const CheckValveSymbol: React.FC<SymbolProps> = ({ state }) => {
  const live = resolveSiteState(state, CHECK_VALVE_STATES, 'WYLACZONY') === 'ZALACZONY';

  return (
    <Group>
      {objectPipeSegment([{ x: 4, y: 54 }, { x: 124, y: 54 }], live)}
      {bandedRect(42, 36, 44, 36, SITE_GREY)}

      {/* Hinged flapper - angled open (live) or vertical shut (not). */}
      {live ? (
        <Group listening={false}>
          <Path data="M52,42 L74,60" stroke={COLOR_OUTLINE} strokeWidth={7} lineCap="round" />
          <Path data="M52,42 L74,60" stroke={SITE_GREEN.base} strokeWidth={4} lineCap="round" />
        </Group>
      ) : (
        <Group listening={false}>
          <Path data="M52,42 L52,68" stroke={COLOR_OUTLINE} strokeWidth={7} lineCap="round" />
          <Path data="M52,42 L52,68" stroke={SITE_RED.base} strokeWidth={4} lineCap="round" />
        </Group>
      )}
      <Circle x={52} y={42} radius={3.5} fill={COLOR_OUTLINE} listening={false} />

      {/* Flow-direction arrow above the body. */}
      <Path data="M92,26 L108,26 M102,20 L108,26 L102,32" stroke={COLOR_OUTLINE} strokeWidth={2.5} lineJoin="round" listening={false} />
    </Group>
  );
};
