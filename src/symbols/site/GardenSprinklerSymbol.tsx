// feat/site-objects-2d commit 3 - "16. Slupek podlewania ogrodowego"
// from docs/EPW_rysunki_referencja.py's own slupek_podl(on). A post
// with a nozzle head; when lit, five water arcs fan out from it and
// the status lamp reads green (running) instead of red (stopped).

import React from 'react';
import { Group, Path } from 'react-konva';
import type { SymbolProps } from '../SymbolRenderer';
import { bandedRect, bandedVRect, bandedCircle } from './BandedShading';
import { resolveSiteState } from './SiteSymbolState';
import {
  SITE_CONC, SITE_GREY, SITE_DGREY, SITE_BLUE, SITE_GREEN, SITE_RED, SITE_WATER_SPRAY,
  SITE_BAND_WIDTH_NARROW, SITE_OUTLINE_WIDTH_MEDIUM, SITE_CANVAS_SCALE
} from '../../theme/ScadaTheme';

export type GardenSprinklerState = 'ZALACZONY' | 'WYLACZONY';
// oxlint-disable-next-line react/only-export-components -- one file per symbol, same convention as scada/ symbols.
export const GARDEN_SPRINKLER_STATES: GardenSprinklerState[] = ['ZALACZONY', 'WYLACZONY'];

// Five water arcs fanning from the nozzle - docs/EPW_rysunki_referencja.py's
// own `for dx in (-26,-13,0,13,26)` loop. Opacity (0.75) kept local, same
// reasoning as AlarmHornSymbol.tsx's own sound-wave opacities.
const SPRAY_DX = [-26, -13, 0, 13, 26];
const SPRAY_OPACITY = 0.75;

export const GardenSprinklerSymbol: React.FC<SymbolProps> = ({ state }) => {
  const on = resolveSiteState(state, GARDEN_SPRINKLER_STATES, 'WYLACZONY') === 'ZALACZONY';

  return (
    <Group scaleX={SITE_CANVAS_SCALE} scaleY={SITE_CANVAS_SCALE}>
      {bandedRect(64, 88, 32, 18, SITE_CONC, { band: SITE_BAND_WIDTH_NARROW, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
      {bandedVRect(70, 40, 20, 50, SITE_GREY)}
      {bandedRect(60, 26, 40, 16, SITE_DGREY, { band: SITE_BAND_WIDTH_NARROW, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
      {bandedCircle(80, 20, 8, on ? SITE_BLUE : SITE_DGREY, { outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
      {on && SPRAY_DX.map(dx => (
        <Path
          key={dx}
          data={`M80,14 Q${80 + dx * 1.5},-8 ${80 + dx * 2.4},16`}
          stroke={SITE_WATER_SPRAY}
          strokeWidth={SITE_BAND_WIDTH_NARROW}
          opacity={SPRAY_OPACITY}
          listening={false}
        />
      ))}
      {bandedRect(56, 60, 10, 10, on ? SITE_GREEN : SITE_RED, { band: 0, outlineWidth: SITE_OUTLINE_WIDTH_MEDIUM })}
    </Group>
  );
};
