// feat/water-management commit 4 - "5. Filtr wody" (filtr) from docs/
// EPW_gospodarka_wodna_referencja.py's own filtr(on). Pure graphics -
// no tag, no aparat.

import React from 'react';
import { Group, Path, Rect, Line } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, objectPipeSegment } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import { COLOR_OUTLINE, SITE_GREY, SITE_DGREY, SITE_OUTLINE_WIDTH } from '../../theme/ScadaTheme';

export type WaterFilterState = 'ZALACZONY' | 'WYLACZONY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as every other site/ symbol.
export const WATER_FILTER_STATES: WaterFilterState[] = ['ZALACZONY', 'WYLACZONY'];

export const WaterFilterSymbol: React.FC<SymbolProps> = ({ state }) => {
  const on = resolveSiteState(state, WATER_FILTER_STATES, 'WYLACZONY') === 'ZALACZONY';

  return (
    <Group>
      {objectPipeSegment([{ x: 4, y: 40 }, { x: 124, y: 40 }], on)}

      {/* Flask-shaped filter body. */}
      <Path data="M44,48 L84,48 L84,74 Q64,88 44,74 Z" fill={SITE_GREY.base} stroke={COLOR_OUTLINE} strokeWidth={SITE_OUTLINE_WIDTH} />
      <Rect x={48} y={52} width={5} height={24} fill={SITE_GREY.light} listening={false} />
      {[0, 1, 2, 3].map(i => (
        <Line key={i} points={[50, 56 + i * 6, 78, 56 + i * 6]} stroke={SITE_DGREY.dark} strokeWidth={1.6} listening={false} />
      ))}

      {bandedRect(46, 34, 36, 14, SITE_GREY, { band: 3, outlineWidth: 2 })}
    </Group>
  );
};
